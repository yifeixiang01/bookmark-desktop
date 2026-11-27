import { createHash } from 'node:crypto'
import { createReadStream } from 'node:fs'
import { mkdtemp, rm, stat } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { spawn } from 'node:child_process'
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3'

const required = (name) => {
  const value = process.env[name]?.trim()
  if (!value) throw new Error('Missing required environment variable: ' + name)
  return value
}

const databaseUrl = required('DATABASE_URL')
const bucket = required('COS_BUCKET')
const region = required('COS_REGION')
const secretId = required('COS_SECRET_ID')
const secretKey = required('COS_SECRET_KEY')
const ageRecipient = required('BACKUP_AGE_RECIPIENT')
const prefix = (process.env.COS_PREFIX || 'bookmark-db').replace(/^\/+|\/+$/g, '')
const endpoint = process.env.COS_ENDPOINT || 'https://cos.' + region + '.myqcloud.com'

const s3 = new S3Client({
  region,
  endpoint,
  forcePathStyle: true,
  credentials: { accessKeyId: secretId, secretAccessKey: secretKey },
})

async function createEncryptedDump(path) {
  const dump = spawn('pg_dump', [
    '--format=custom',
    '--no-owner',
    '--no-privileges',
    '--dbname', databaseUrl,
  ], { stdio: ['ignore', 'pipe', 'pipe'] })
  const encrypt = spawn('age', ['--encrypt', '--recipient', ageRecipient, '--output', path], {
    stdio: ['pipe', 'ignore', 'pipe'],
  })
  let dumpError = ''
  let encryptError = ''
  dump.stderr.on('data', (chunk) => { dumpError += chunk.toString() })
  encrypt.stderr.on('data', (chunk) => { encryptError += chunk.toString() })
  dump.stdout.pipe(encrypt.stdin)

  const wait = (child) => new Promise((resolve, reject) => {
    child.once('error', reject)
    child.once('close', (code) => code === 0 ? resolve() : reject(new Error('Process exited ' + code)))
  })
  const results = await Promise.allSettled([wait(dump), wait(encrypt)])
  const failure = results.find((result) => result.status === 'rejected')
  if (failure) {
    dump.kill()
    encrypt.kill()
    const details = [dumpError, encryptError].filter(Boolean).join('\n').trim()
    throw new Error('Database backup/encryption failed: ' + (details || failure.reason))
  }
}

const workDir = await mkdtemp(join(tmpdir(), 'bookmark-db-backup-'))
try {
  const date = new Date().toISOString()
  const stamp = date.replaceAll(':', '-').replaceAll('.', '-')
  const filename = 'bookmark-db-' + stamp + '.dump.age'
  const path = join(workDir, filename)
  await createEncryptedDump(path)
  const file = await stat(path)
  if (!file.size) throw new Error('Encrypted backup is empty')

  const digest = createHash('sha256')
  for await (const chunk of createReadStream(path)) digest.update(chunk)
  const key = prefix + '/daily/' + date.slice(0, 10) + '/' + filename
  await s3.send(new PutObjectCommand({
    Bucket: bucket,
    Key: key,
    Body: createReadStream(path),
    ContentLength: file.size,
    ContentType: 'application/octet-stream',
    Metadata: { sha256: digest.digest('hex') },
  }))
  console.log(JSON.stringify({ ok: true, key, bytes: file.size }))
} finally {
  await rm(workDir, { recursive: true, force: true })
  s3.destroy()
}
