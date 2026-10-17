# MCA Open Repository

Next.js + Prisma + PostgreSQL repository for MCA subjects and versioned learning resources.

## Local development

1. Install a supported Node.js LTS version and PostgreSQL.
2. Create the `mca_repository` database and a least-privilege application user.
3. Copy `.env.example` to `.env`; set `DATABASE_URL`, a unique `AUTH_SECRET` (32+ random characters), and `STORAGE_DIR`.
4. Install dependencies with `npm install` (this creates `package-lock.json`; commit that lockfile so future clean deployments can use `npm ci`).
5. Run `npx prisma generate` and, for a new development database, `npx prisma db push`.
6. Optionally run `npm run db:seed` for demo records. Seed credentials are development-only; never seed them into production.
7. Run `npm run dev`.

## Production principles

- Deploy the app as a Node.js service behind IIS/reverse proxy; bind Next.js to `127.0.0.1:3000` and do not expose port 3000 publicly.
- Use HTTPS, set `NEXT_PUBLIC_APP_URL` to the canonical HTTPS origin, and set a strong unique `AUTH_SECRET`.
- Use an absolute `STORAGE_DIR` outside `public/` and grant write access only to the service account.
- Keep PostgreSQL private. Use a dedicated application database role and separate backup credentials.
- Use migrations for production schema changes. Review and commit a Prisma migration history in development, then run `npx prisma migrate deploy` during deployment. `db:push` is for local/prototyping, not routine production changes.
- Configure independent backups for PostgreSQL and the entire storage directory, then test restoration before launch.
- Public downloads intentionally work without login for non-archived resources. Staff mutations require an authenticated account and active subject assignment; administrative endpoints require an ADMIN account.
- Uploads are limited to 50 MB and a file extension allowlist. MIME types are untrusted browser metadata; add malware scanning and content-signature checks before public production use.
- `/api/health` returns a minimal application/database health result. Restrict monitoring access at the network layer if the endpoint should not be public.

## Windows Server deployment outline

1. Back up the database and uploaded files before changes.
2. Install a supported Node.js LTS version and PostgreSQL; keep PostgreSQL's port private.
3. Copy the tested release to `C:\MCARepository\app` and use an external data directory such as `D:\MCARepositoryData\uploads`.
4. Set production environment variables for the Windows service account; do not put secrets in Git.
5. Run `npm ci` from a release with a committed `package-lock.json`, then `npx prisma generate`, `npx prisma migrate deploy`, and `npm run build`.
6. Run `npm run start` as a Windows service under a dedicated non-administrator account. Configure automatic restart and logs.
7. Configure IIS with URL Rewrite + ARR to proxy HTTPS requests to `http://127.0.0.1:3000`. Forward the original host and HTTPS protocol correctly. Only expose the approved web ports through the college firewall.
8. Configure the college DNS hostname and TLS certificate, then test from the college network and mobile data.
9. Test public browsing/downloads, login, staff authorization, upload/version creation, archived content, backup and restore.

## Important production follow-up

This repository snapshot is a starting point, not a claim of production certification. Before public launch, review all UI pages and API routes, add persistent rate limiting for login, malware scanning/content-signature validation, audit logging, and a tested Prisma migration baseline. Ensure initial administrator credentials are provisioned securely and all demo accounts/passwords are removed or changed.
