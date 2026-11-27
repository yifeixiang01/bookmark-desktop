FROM postgres:18-alpine
RUN apk add --no-cache age nodejs npm
WORKDIR /backup
COPY package.json package-lock.json ./
RUN npm ci --omit=dev --ignore-scripts --no-audit --no-fund
COPY backup/backup-db.mjs ./backup-db.mjs
CMD ["node", "backup-db.mjs"]
