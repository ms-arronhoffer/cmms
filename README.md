# CMMS - Containerized Maintenance Management System

A production-ready Web-based maintenance management portal for property management companies. Manage equipment, schedule maintenance, generate reports, and configure automated email notifications.

## Features

- ✅ **Equipment Management** - Create, track, and manage equipment with full maintenance history
- ✅ **Maintenance Scheduling** - Schedule preventative, corrective, and predictive maintenance tasks
- ✅ **Weekly Reports** - Automated weekly reports (PDF, CSV, Dashboard) sent to configured recipients
- ✅ **On-Demand Reports** - Generate custom reports anytime from the portal
- ✅ **Overdue Alerts** - Real-time notifications for overdue maintenance on dashboard
- ✅ **Role-Based Access** - Admin, Manager, and Technician roles with enforced permissions
- ✅ **Responsive Design** - Mobile-friendly web interface with Material-UI components
- ✅ **Docker Ready** - Complete Docker Compose setup for easy deployment

## Tech Stack

- **Frontend:** React 18 + Vite + Material-UI (Material Design System)
- **Backend:** Node.js + Express REST API
- **Database:** MongoDB (containerized with persistence)
- **Deployment:** Docker Compose (3 containers: frontend, backend, MongoDB)
- **Authentication:** Session-based with JWT fallback
- **Email:** Nodemailer SMTP (flexible configuration)
- **Scheduling:** node-cron for background jobs

## Quick Start

### Prerequisites

- Docker & Docker Compose
- Node.js 18+ (for local development without Docker)
- Git

### 1. Clone & Setup

```bash
git clone <repo>
cd cmms

# Copy environment template
cp backend/.env.example backend/.env.docker
```

### 2. Configure Environment

Edit `backend/.env.docker` with your settings:

```env
# Database
MONGODB_URI=mongodb://mongo:27017/cmms
MONGODB_USER=cmmsadmin
MONGODB_PASSWORD=changeme123!

# Server
PORT=5000
NODE_ENV=development
FRONTEND_URL=http://localhost:3000

# Email (SMTP)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your_email@gmail.com
SMTP_PASSWORD=your_app_password

# Secrets (change in production!)
SESSION_SECRET=your_session_secret_change_in_production
JWT_SECRET=your_jwt_secret_change_in_production
```

### 3. Start Containers

```bash
docker-compose up -d
```

This will:
- Start MongoDB on `localhost:27017`
- Start backend API on `http://localhost:5000`
- Start frontend on `http://localhost:3000`

### 4. Verify Health

```bash
# Check all containers are running
docker-compose ps

# View logs
docker-compose logs -f

# Test API health
curl http://localhost:5000/health
```

### 5. Seed Initial Data

```bash
docker-compose exec backend npm run seed
```

Default credentials:
- Admin: `admin` / `Admin123!`
- Manager: `manager` / `Manager123!`

### 6. Access the Portal

Open your browser: **http://localhost:3000**

## Development Setup (Local, No Docker)

### Backend

```bash
cd backend

# Install dependencies
npm install

# Set up local MongoDB connection in .env
MONGODB_URI=mongodb://localhost:27017/cmms
NODE_ENV=development

# Start development server
npm run dev
```

Backend API: http://localhost:5000

### Frontend

```bash
cd frontend

# Install dependencies
npm install

# Start development server
npm run dev
```

Frontend: http://localhost:3000 (automatically proxies `/api` to backend)

## Project Structure

```
cmms/
├── backend/
│   ├── src/
│   │   ├── index.js                 # Express server entry point
│   │   ├── config/
│   │   │   └── database.js          # MongoDB connection
│   │   ├── models/                  # Mongoose schemas
│   │   ├── routes/                  # API endpoints
│   │   ├── middleware/              # Auth, RBAC, error handling
│   │   ├── services/                # Business logic (reports, email)
│   │   ├── jobs/                    # Cron jobs (weekly reports, alerts)
│   │   └── utils/                   # Helpers & logger
│   ├── package.json
│   ├── Dockerfile
│   └── .env.example
├── frontend/
│   ├── src/
│   │   ├── main.jsx                 # React entry point
│   │   ├── App.jsx                  # App routing
│   │   ├── pages/                   # Page components
│   │   ├── components/              # Reusable UI components
│   │   ├── hooks/                   # Custom React hooks (useAuth)
│   │   ├── services/                # API client
│   │   └── utils/                   # Helpers
│   ├── package.json
│   ├── Dockerfile
│   ├── vite.config.js
│   └── index.html
├── docker-compose.yml               # Orchestrate all 3 containers
├── README.md
└── .gitignore
```

## Next Steps (Implementation Phases)

- **Phase 1:** Database schema & models
- **Phase 2:** Backend API (Equipment CRUD, maintenance scheduling)
- **Phase 3:** Authentication & user management
- **Phase 4:** Frontend pages & components
- **Phase 5:** Report generation & email system
- **Phase 6:** Overdue alerts

See `IMPLEMENTATION_PLAN.md` for detailed breakdown.

## Environment Variables

**Default:** See `backend/.env.example`

**Docker Compose:** Variables can be set in `docker-compose.yml` or a `.env` file in the project root.

*Note: In production, use secure secret management (AWS Secrets Manager, Azure Key Vault, etc.)*

## Troubleshooting

### MongoDB connection fails
```bash
# Verify MongoDB is healthy
docker-compose ps
docker-compose logs mongo

# Check connection string in backend/.env
MONGODB_URI=mongodb://cmmsadmin:changeme123!@mongo:27017/cmms
```

### Frontend can't reach backend
```bash
# Verify backend is running
curl http://localhost:5000/health

# Check VITE_API_URL in docker-compose.yml
VITE_API_URL=http://backend:5000/api  # (inside Docker)
# or
VITE_API_URL=http://localhost:5000/api  # (local dev)
```

### Port already in use
Change ports in `docker-compose.yml`:
```yaml
ports:
  - "3001:3000"  # Frontend on 3001
  - "5001:5000"  # Backend on 5001
```

## Deployment Checklist

- [ ] Change all secrets (`SESSION_SECRET`, `JWT_SECRET`)
- [ ] Set `NODE_ENV=production`
- [ ] Configure SMTP for email delivery
- [ ] Set up MongoDB backups or use Atlas
- [ ] Use HTTPS/TLS in production
- [ ] Configure CORS for your domain
- [ ] Set up monitoring & logging
- [ ] Run security audit: `npm audit`

## Security Notes

1. **Secrets Management:** Never commit `.env` files to Git. Use environment variable injection at deployment.
2. **CORS:** Whitelist allowed origins in backend `cors()` config.
3. **Database:** Use strong credentials. In production, rotate passwords regularly.
4. **HTTPS:** Deploy behind reverse proxy (nginx) with TLS.
5. **Rate Limiting:** Add express-rate-limit for API endpoints.

## Support & Contributing

Refer to implementation plan for feature requests and architecture decisions.

## License

[Your License Here]