# PostgreSQL to Tencent Cloud COS scheduled backups

The one-shot backup container creates a consistent PostgreSQL logical dump with pg_dump, encrypts it locally with age, then uploads it through the S3-compatible COS API. Schedule it daily in Dokploy (or with host cron). A successful run prints the object key and size; failures exit non-zero so the scheduler can alert.

## 1. Create an encryption key

On a secure administrator computer with age installed:

    age-keygen -o bookmark-backup-identity.txt
    age-keygen -y bookmark-backup-identity.txt

Use the public key printed by the second command as BACKUP_AGE_RECIPIENT. Keep the identity file offline or in a password manager separate from the server. Restoring backups requires this private key.

## 2. Create COS credentials

Create a dedicated CAM sub-user/key with write access to only this bucket (PutObject). Add list/read permissions only if your chosen monitoring or restore process needs them. Do not use the root account key, and do not grant the backup job permission to delete buckets or objects.

## 3. Schedule the container in Dokploy

Create a scheduled/one-shot job from this repository. Set its Dockerfile path to backup/Dockerfile and build context to the repository root. Run it daily at 03:00 Asia/Shanghai. If your Dokploy version does not provide scheduled jobs, schedule this image from host cron instead.

Set these runtime environment variables. The database address must be reachable from the backup container; on a shared Dokploy Docker network, use the database service name and its internal port 5432.

| Variable | Value |
| --- | --- |
| DATABASE_URL | PostgreSQL URL, preferably using a dedicated read-only backup role. URL-encode special characters in the password |
| COS_BUCKET | Bucket identifier in the form required by the Tencent COS S3-compatible API; confirm the exact bucket/AppID form in the COS console |
| COS_REGION | Bucket region, for example ap-guangzhou |
| COS_ENDPOINT | Optional; defaults to https://cos.<region>.myqcloud.com |
| COS_SECRET_ID | Dedicated CAM SecretId |
| COS_SECRET_KEY | Dedicated CAM SecretKey |
| COS_PREFIX | Optional object prefix; defaults to bookmark-db |
| BACKUP_AGE_RECIPIENT | age public key beginning with age1 |

Do not commit these values to Git or put them in the Docker image. Add them as the scheduled job's runtime secrets.

## 4. Retention, alerts, and verification

Add a COS lifecycle rule for the bookmark-db/daily/ prefix (for example, retain 35 days). Consider COS versioning or a retention lock to protect against accidental deletion and ransomware. Configure Dokploy to notify on failed jobs, and alert if the last successful backup is more than 24 hours old.

The uploaded object includes a SHA-256 checksum in metadata. After the first successful run, download a backup, verify the checksum, and run a restore drill in an isolated PostgreSQL database:

    age --decrypt --identity bookmark-backup-identity.txt --output backup.dump bookmark-db-YYYY-MM-DDTHH-MM-SS-sssZ.dump.age
    createdb bookmark_restore
    pg_restore --no-owner --no-privileges --dbname bookmark_restore backup.dump

Check users, user_states, articles and representative records before considering the drill successful. Repeat monthly. An upload-success log alone does not prove that a backup can be restored.
