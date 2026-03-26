# Deploy CMMS on Any Docker Engine

This guide explains how to run this CMMS app on any machine with a compatible Docker Engine and Docker Compose plugin.

## 1. Prerequisites

- Docker Engine 24+ (or recent stable)
- Docker Compose plugin (`docker compose` command)
- Git (optional, if cloning)
- Open host ports:
  - `3000` (frontend)
  - `5000` (backend API)
  - `27017` (MongoDB, optional external access)

Check your install:

```bash
docker --version
docker compose version
```

## 2. Get the Application

Option A: Clone repository

```bash
git clone <your-repo-url>
cd cmms
```

Option B: Copy project folder to target machine and `cd` into the folder containing `docker-compose.yml`.

## 3. Environment Configuration

This project includes service defaults in `docker-compose.yml`. If your environment uses custom values, set/update env files before startup.

At minimum, confirm backend settings are valid for your target environment (JWT secret, mail settings, etc.) if you changed defaults in your repo.

## 4. Build and Start

From the repository root (where `docker-compose.yml` exists):

```bash
docker compose up --build -d
```

What this does:
- Builds `backend` and `frontend` images from local Dockerfiles
- Starts `mongo`, `backend`, and `frontend` services
- Runs them in detached mode (`-d`)

## 5. Verify Deployment

Check service status:

```bash
docker compose ps
```

You should see all services `Up` and eventually `healthy`.

View logs:

```bash
docker compose logs -f backend
docker compose logs -f frontend
docker compose logs -f mongo
```

Health checks:

- Backend health endpoint: `http://localhost:5000/health`
- Frontend app: `http://localhost:3000`

## 6. First Login / Data

If your database is empty, run seed data using the safer initialization script:

```bash
docker compose exec backend node src/db/seed-init.js
```

This script:
- Validates MongoDB connection before seeding
- Explicitly sets all required user fields
- Provides detailed logging for troubleshooting
- Properly handles connection timeouts

Default seeded users:
- `admin / Admin123!`
- `manager / Manager123!`

## 7. Routine Operations

Stop services (keep volumes):

```bash
docker compose down
```

Stop and remove volumes (deletes Mongo data):

```bash
docker compose down -v
```

Restart after code changes:

```bash
docker compose up --build -d
```

Pull latest changes + redeploy:

```bash
git pull
docker compose up --build -d
```

## 8. Backup and Restore Mongo Data

Identify volume name:

```bash
docker volume ls
```

Backup (example):

```bash
docker run --rm -v cmms_mongo_data:/data -v "$PWD":/backup alpine sh -c "tar czf /backup/cmms_mongo_backup.tgz -C /data ."
```

Restore (example, destructive to current volume contents):

```bash
docker run --rm -v cmms_mongo_data:/data -v "$PWD":/backup alpine sh -c "rm -rf /data/* && tar xzf /backup/cmms_mongo_backup.tgz -C /data"
```

## 9. Production Hardening Checklist

- Replace all development secrets (JWT, mail credentials)
- Put frontend/backend behind a reverse proxy (Nginx, Traefik, Caddy)
- Terminate TLS/HTTPS at proxy layer
- Restrict direct exposure of MongoDB (`27017`) unless required
- Configure log retention and monitoring
- Pin image versions and base images
- Enable regular backups for Mongo data volume
- Use firewall/security groups to limit inbound access

## 10. Troubleshooting

### Login fails after running seed data

**Symptom**: Seed script completes successfully, but login returns "Invalid username or password" or "Unauthorized".

**Causes and fixes**:

1. **Seeding ran but data wasn't persisted** (fresh Docker instance):
   - Verify Mongo volume is healthy:
   ```bash
   docker compose logs mongo --tail 50
   docker volume ls | grep cmms
   ```
   - Confirm seeded data exists:
   ```bash
   docker compose exec mongo mongosh cmms --eval "db.users.countDocuments()"
   ```

2. **Backend environment variables not set**:
   - Verify backend sees the correct MONGODB_URI:
   ```bash
   docker compose exec backend env | grep MONGODB_URI
   ```
   - Should output: `MONGODB_URI=mongodb://mongo:27017/cmms`
   - If missing, restart: `docker compose down && docker compose up --build -d`

3. **Frontend still connected to old backend or wrong URL**:
   - Hard refresh browser (`Ctrl+F5` or open in private window)
   - Check browser DevTools → Network → POST `/api/auth/login`
   - Verify request reaches `http://backend:5000/api` (from container perspective)
   - From host, verify `http://localhost:5000/health` returns 200

4. **Seed script failed silently**:
   - Re-run seed with verbose logs:
   ```bash
   docker compose exec backend node src/db/seed-init.js 2>&1 | tail -100
   ```
   - Look for connection errors or validation failures

5. **Password hash mismatch**:
   - Ensure Node.js bcrypt module is properly installed in backend:
   ```bash
   docker compose exec backend npm ls bcryptjs
   ```
   - If missing, rebuild:
   ```bash
   docker compose down
   docker compose up --build -d
   docker compose exec backend node src/db/seed-init.js
   ```

### Containers start but frontend is blank or stale

- Hard refresh browser (`Ctrl+F5`)
- Rebuild images:

```bash
docker compose up --build -d
```

### Report preview/download appears blank

- Ensure user is logged in
- Check backend logs for `/api/reports` requests:

```bash
docker compose logs backend --tail 200
```

### Port conflict errors

If ports are already used, update host mappings in `docker-compose.yml` and redeploy.

### Backend unhealthy

Check backend logs and Mongo connectivity:

```bash
docker compose logs backend --tail 200
docker compose logs mongo --tail 200
```

### Reset to clean local state

```bash
docker compose down -v
docker compose up --build -d
docker compose exec backend node src/db/seed.js
```

## 11. Compatibility Notes

This deployment method works on:
- Docker Desktop (Windows/macOS)
- Native Docker Engine on Linux
- Remote Docker Engine hosts (with CLI context configured)

If using a remote engine, ensure all required ports are reachable from clients and your firewall allows access.
