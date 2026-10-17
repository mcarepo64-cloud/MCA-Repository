# Windows Server deployment checklist

This is an operator checklist, not an automated installer. Coordinate public networking and IIS with the college IT administrator.

## Required configuration

- Install supported Node.js LTS and PostgreSQL versions.
- Create database `mca_repository` and a restricted role used by the app. Do not use the PostgreSQL superuser for the app connection.
- Create `C:\MCARepository\app` and `D:\MCARepositoryData\uploads` (adapt drive letters if necessary).
- Grant the dedicated application service identity Modify permission on the uploads directory and read/execute on the app directory. Do not grant it local administrator rights.
- Set `DATABASE_URL`, `AUTH_SECRET`, `STORAGE_DIR`, and `NEXT_PUBLIC_APP_URL` in the service's protected environment. Do not commit or email the production secret.
- Before production, create and test a Prisma migration baseline. This supplied snapshot has no committed `prisma/migrations` directory; do not assume `prisma migrate deploy` will create tables until migrations exist. For a brand-new empty database only, a controlled initial `prisma db push` can create the initial schema; thereafter introduce reviewed migrations and use `prisma migrate deploy`.

## Release commands

Run in an elevated deployment shell only when appropriate, and use the actual project directory:

```powershell
Set-Location C:\MCARepository\app
npm install
npx prisma generate
# For a brand-new empty database before a migration baseline exists:
npx prisma db push
npm run build
```

After a reviewed migration baseline is committed, use `npm ci` from a release with its committed `package-lock.json`, followed by `npx prisma generate`, `npx prisma migrate deploy`, and `npm run build`.

Do not run the demo seed on production: it creates predictable demo credentials.

## IIS and networking

- Install IIS URL Rewrite and Application Request Routing (ARR), enable proxying, and create an HTTPS binding for the college-controlled DNS name.
- Proxy to `http://127.0.0.1:3000`; do not expose port 3000 or PostgreSQL's 5432 to the public internet.
- Ensure the reverse proxy forwards the original `Host` and HTTPS scheme (`X-Forwarded-Host` / `X-Forwarded-Proto`). The app's same-origin check depends on the public host being forwarded correctly.
- Configure Windows Firewall/router only for approved web ingress (normally HTTPS 443; port 80 only if required for redirect or certificate validation).
- Run `npm run start` under a dedicated non-admin Windows service identity using an approved service wrapper; configure automatic restart and logs.
- Verify `/api/health`, sign-in/out, subject permissions, upload/version creation, public downloads, archive behaviour and restore from backup from both inside and outside the college network.

## Backups

Back up PostgreSQL and the entire upload directory to an independent destination. Coordinate a consistent backup schedule and periodically restore both together in a test environment. Never treat a copy on the same disk as the only backup.
