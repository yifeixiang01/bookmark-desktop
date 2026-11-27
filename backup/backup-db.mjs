import { createHash } from 'node:crypto'
import { createReadStream } from 'node:fs'
import { mkdtemp, rm, stat } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { spawn } from 'node:child_process'
import { pipeline } from 'node:stream/promises'
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
  maxAttempts: 2,
  region,
  endpoint,
  forcePathStyle: false,
  requestChecksumCalculation: 'WHEN_REQUIRED',
  credentials: { accessKeyId: secretId, secretAccessKey: secretKey },
})

async function createEncryptedDump(path) {
  const dump = spawn('pg_dump', [
    '--no-password',
    '--format=custom',
    '--no-owner',
    '--no-privileges',
    '--dbname', databaseUrl,
  ], {
    stdio: ['ignore', 'pipe', 'pipe'],
    env: { ...process.env, PGCONNECT_TIMEOUT: '10' },
  })
  const encrypt = spawn('age', ['--encrypt', '--recipient', ageRecipient, '--output', path], {
    stdio: ['pipe', 'ignore', 'pipe'],
  })
  let dumpError = ''
  let encryptError = ''
  dump.stderr.on('data', (chunk) => { dumpError += chunk.toString() })
  encrypt.stderr.on('data', (chunk) => { encryptError += chunk.toString() })

  const wait = (child) => new Promise((resolve, reject) => {
    child.once('error', reject)
    child.once('close', (code) => code === 0 ? resolve() : reject(new Error('Process exited ' + code)))
  })
  const tasks = [wait(dump), wait(encrypt), pipeline(dump.stdout, encrypt.stdin)]
  const timeout = setTimeout(() => {
    dump.kill('SIGKILL')
    encrypt.kill('SIGKILL')
  }, 300_000)
  try {
    await Promise.all(tasks)
  } catch (failure) {
    dump.kill('SIGKILL')
    encrypt.kill('SIGKILL')
    dump.stdout.destroy()
    encrypt.stdin.destroy()
    await Promise.allSettled(tasks)
    const details = [dumpError, encryptError].filter(Boolean).join('\n').trim()
    throw new Error('Database backup/encryption failed: ' + (details || failure.message))
  } finally {
    clearTimeout(timeout)
  }
}

const workDir = await mkdtemp(join(tmpdir(), 'bookmark-db-backup-'))
try {
  console.log('[backup] Starting PostgreSQL export and age encryption (database connection timeout: 10s; export timeout: 5min)')
  const date = new Date().toISOString()
  const stamp = date.replaceAll(':', '-').replaceAll('.', '-')
  const filename = 'bookmark-db-' + stamp + '.dump.age'
  const path = join(workDir, filename)
  await createEncryptedDump(path)
  const file = await stat(path)
  if (!file.size) throw new Error('Encrypted backup is empty')
  console.log('[backup] Export and encryption completed; encrypted bytes: ' + file.size)

  const digest = createHash('sha256')
  for await (const chunk of createReadStream(path)) digest.update(chunk)
  const key = prefix + '/daily/' + date.slice(0, 10) + '/' + filename
  console.log('[backup] Uploading encrypted backup to COS (timeout: 120s)')
  await s3.send(new PutObjectCommand({
    Bucket: bucket,
    Key: key,
    Body: createReadStream(path),
    ContentLength: file.size,
    ContentType: 'application/octet-stream',
    Metadata: { sha256: digest.digest('hex') },
  }), { abortSignal: AbortSignal.timeout(120_000) })
  console.log(JSON.stringify({ ok: true, key, bytes: file.size }))
} catch (error) {
  // Do not print connection URLs or credentials from tool/SDK errors.
  let message = error.message || String(error)
  for (const secret of [databaseUrl, secretId, secretKey]) message = message.replaceAll(secret, '[REDACTED]')
  console.error('[backup] FAILED: ' + message)
  process.exitCode = 1
} finally {
  await rm(workDir, { recursive: true, force: true })
  s3.destroy()
}
