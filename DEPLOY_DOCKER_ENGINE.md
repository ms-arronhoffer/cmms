# Deploy CMMS on Any Docker Engine

This guide explains how to run this CMMS app on any machine with a compatible Docker Engine and Docker Compose plugin.

## 1. Prerequisites

- Docker Engine 24+ (or recent stable)
- Docker Compose plugin (`docker compose` command)
- Git (optional, if cloning)
- Open host ports:
  - `3000` (frontend)
  - `5000` (backend API)
  - Nginx proxy (on your host) configured to forward traffic to these ports
- MongoDB stays internal to Docker network (no host port needed)

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

## Architecture Overview

The app uses Docker internal networking with external reverse proxy integration:

```
┌──────────────────────────────────────────────┐
│  Your Host / External Nginx Reverse Proxy    │
│  (Port 80/443 - handles SSL/TLS)             │
└──────────────┬───────────────────────────────┘
               │ Routes to localhost:3000/5000
               ▼
┌──────────────────────────────────────────────┐
│  DOCKER BRIDGE NETWORK (cmms-network)        │
├──────────────────────────────────────────────┤
│                                              │
│  ┌──────────────────┐                        │
│  │  Frontend        │                        │
│  │  (Node serve)    │                        │
│  │  :3000 ◄─────────┼──── Proxied from Nginx
│  └────────┬─────────┘                        │
│           │ (via cmms-network DNS)            │
│  ┌────────▼──────────┐    ┌──────────────┐  │
│  │  Backend         │    │  MongoDB     │  │
│  │  (Node/Express)  │───▶│  (internal)  │  │
│  │  :5000 ◄─────────┼──────────────────┘  │
│  └──────────────────┘  (from container)    │
│                                              │
└──────────────────────────────────────────────┘
```

**Key points:**
- Frontend (3000) and Backend (5000) exposed to host for Nginx to reverse proxy
- MongoDB is internal Docker network only - NOT exposed to host
- Frontend requests API via internal DNS: `http://backend:5000/api`
- Your external Nginx proxies both services and handles TLS/compression

## 4. Build and Start

From the repository root (where `docker-compose.yml` exists):

```bash
docker compose up --build -d
```

What this does:
- Builds `backend` and `frontend` images from local Dockerfiles
- Starts `mongo`, `backend`, and `frontend` services in the Docker network
- Runs them in detached mode (`-d`)
- Exposes frontend on `localhost:3000` (for your Nginx to proxy)
- Exposes backend on `localhost:5000` (for frontend + optional direct Nginx proxy)
- MongoDB stays internal to the `cmms-network` - not accessible from host

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

Health checks (from within Docker network via your Nginx or direct access):

- **Frontend app**: `http://localhost:3000` (via Nginx reverse proxy)
- **Backend health**: `http://localhost:5000/health` (via Nginx or direct)
- **MongoDB**: internal to Docker network only

## 6. Configure Your External Nginx Proxy

Update your existing Nginx configuration to forward traffic to the Docker containers:

```nginx
upstream cmms_frontend {
    server localhost:3000;
}

upstream cmms_backend {
    server localhost:5000;
}

server {
    listen 80;
    server_name yourdomain.com;

    # Frontend
    location / {
        proxy_pass http://cmms_frontend;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # API backend (if routing through Nginx)
    location /api/ {
        proxy_pass http://cmms_backend;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

Or, if your frontend handles routing directly to the backend (recommended), just proxy the root:

```nginx
server {
    listen 80;
    server_name yourdomain.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

Reload your external Nginx after updating:

```bash
sudo nginx -s reload
# or
sudo systemctl reload nginx
```

## 7. First Login / Data

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

### Essential
- Replace all development secrets (JWT, mail credentials) via environment variables
- Update `SESSION_SECRET` and `JWT_SECRET` in `.env` (do not commit to repo)
- Enable HTTPS/TLS at your external Nginx layer
- Configure log retention and monitoring for Docker containers
- Enable regular backups for Mongo data volume
- Set MongoDB connection access restrictions at Docker network level

### Database and Backend
- Restrict Mongo to Docker network only (no host port exposure) ✓ Already done
- Backend is only accessible at `localhost:5000` for your Nginx to proxy to
- Pin base image versions (e.g., `node:20-alpine@sha256:...`)
- Use environment variables for all secrets (never hardcode in Dockerfile)

### Docker Network Security
- All inter-container communication happens via Docker DNS (`mongo:27017`, `backend:5000`)
- External access only through your Nginx reverse proxy (port 80/443)
- MongoDB is NOT exposed to the host machine

### Nginx Proxy (External)
- Implement rate limiting for API endpoints
- Add security headers (X-Frame-Options, X-Content-Type-Options, CSP)
- Configure SSL/TLS certificates for HTTPS
- Implement request body size limits
- Add request validation/filtering

### Network & Firewall
- Use firewall/security groups to limit inbound access to port 80/443 only
- Restrict SSH/telnet on the Docker host if exposing to internet  
- Only expose ports 3000 and 5000 to your Nginx (not to the general internet)

### TLS/HTTPS at Nginx Layer

Configure your external Nginx for HTTPS (example):

```nginx
server {
    listen 80;
    server_name yourdomain.com;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name yourdomain.com;

    ssl_certificate /etc/nginx/certs/cert.pem;
    ssl_certificate_key /etc/nginx/certs/key.pem;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;
    ssl_prefer_server_ciphers on;

    # ... rest of config with proxy_pass to localhost:3000
}
```

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
   - Verify backend is reachable from within Docker container:
   ```bash
   docker compose exec frontend curl http://backend:5000/health
   ```
   - Should return 200 OK

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

### Frontend loads but API calls fail from browser

**Symptom**: Frontend appears but API requests fail with 502/503 or timeout.

**Causes and fixes:**

1. **Nginx not properly proxying to localhost:5000**:
   - Verify your external Nginx config has correct upstream:
   ```nginx
   upstream cmms_backend {
       server localhost:5000;
   }
   ```
   - Test backend is reachable:
   ```bash
   curl http://localhost:5000/health
   ```

2. **Frontend/backend network DNS issue**:
   - Frontend should use internal Docker DNS for backend calls:
   ```bash
   docker compose exec frontend curl http://backend:5000/health
   ```
   - Check frontend environment variable:
   ```bash
   docker compose exec frontend env | grep VITE_API_URL
   ```
   - Should be: `VITE_API_URL=http://backend:5000/api`

3. **Backend not listening or unhealthy**:
   ```bash
   docker compose logs backend --tail 200
   docker compose exec backend netstat -an | grep 5000
   ```

### Frontend appears blank or stale

- Hard refresh browser (`Ctrl+F5`)
- Rebuild frontend:
```bash
docker compose up --build -d
```

### Report preview/download appears blank

- Ensure user is logged in
- Verify frontend can reach backend:
```bash
curl http://localhost:5000/health
```
- Check backend logs for `/api/reports` requests:
```bash
docker compose logs backend --tail 200
```

### Port conflict errors

If ports 3000 or 5000 are already in use:

1. Find what's using them:
```bash
# Linux/macOS
lsof -i :3000
lsof -i :5000
# Windows
netstat -ano | findstr :3000
netstat -ano | findstr :5000
```

2. Either stop the conflicting service or change ports in `docker-compose.yml`:
```yaml
frontend:
  ports:
    - "3001:3000"  # Access via http://localhost:3001
backend:
  ports:
    - "5001:5000"  # Access via http://localhost:5001
```

Then update your external Nginx config to proxy to the new ports.

### Backend unhealthy

Check backend logs and Mongo connectivity:

```bash
docker compose logs backend --tail 200
docker compose logs mongo --tail 200
```

### Docker containers won't start

Check compose errors:

```bash
docker compose up  # without -d to see output
```

Common issues:
- Invalid docker-compose.yml syntax
- Dockerfile syntax errors
- Missing volumes or networks
- Port conflicts

### Reset to clean local state

```bash
docker compose down -v
docker compose up --build -d
docker compose exec backend node src/db/seed-init.js
```

Then access the app via your external Nginx and login with the seeded credentials.

## 11. Compatibility Notes

This deployment method works on:
- Docker Desktop (Windows/macOS)
- Native Docker Engine on Linux
- Remote Docker Engine hosts (with CLI context configured)

If using a remote engine, ensure all required ports are reachable from clients and your firewall allows access.
