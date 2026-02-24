# NILDSVU API — NILD Comprehensive Digital Patient Management System

> A high-performance REST API built with **Fastify**, **Prisma ORM**, and **PostgreSQL (AWS RDS)**, deployed on **Vercel Serverless**.

---

## 🚀 Live Deployment

| Environment | URL |
|-------------|-----|
| Production  | [https://nildsvu-api.vercel.app](https://nildsvu-api.vercel.app) |
| Health Check | [https://nildsvu-api.vercel.app/health](https://nildsvu-api.vercel.app/health) |

---

## 🛠️ Tech Stack

| Layer | Technology |
|-------|-----------|
| Runtime | Node.js (ESM) |
| Framework | Fastify v5 |
| ORM | Prisma v7 with `@prisma/adapter-pg` |
| Database | PostgreSQL on AWS RDS |
| Auth | JWT (`@fastify/jwt`) |
| Deployment | Vercel Serverless |

---

## 📁 Project Structure

```
NILD-API-main/
├── api/
│   └── index.js          # Vercel serverless entry point
├── prisma/
│   └── schema.prisma     # Database schema (48+ models)
├── src/
│   ├── generated/
│   │   └── prisma/       # Auto-generated Prisma Client (via postinstall)
│   ├── plugins/
│   │   ├── auth.js       # JWT authentication plugin
│   │   ├── database.js   # PostgreSQL pool plugin
│   │   └── prisma.js     # Prisma ORM plugin
│   ├── modules/          # Feature modules (OPD, IPD, Rehab, etc.)
│   ├── utils/
│   │   └── errorHandler.js
│   └── globalroutes.js   # Central route registration
├── scripts/              # DB migration & seed scripts
├── vercel.json           # Vercel deployment configuration
├── prisma.config.js      # Prisma v7 config
└── package.json
```

---

## ⚙️ Local Development Setup

### 1. Clone the repository
```bash
git clone https://github.com/RahulSamanta0/NILDSVU-API.git
cd NILDSVU-API
```

### 2. Install dependencies
```bash
npm install
# This automatically runs: prisma generate
```

### 3. Configure environment variables
Create a `.env` file in the root:
```env
DB_TYPE=postgresql
DB_PORT=5432
DB_HOST=your-rds-host.amazonaws.com
DB_USER=your_db_user
DB_PASSWORD=your_db_password
DB_NAME=your_db_name
DB_SSL=true

DATABASE_URL="postgresql://user:password@host:5432/dbname?sslmode=require&uselibpqcompat=true"

PORT=5000

JWT_SECRET=your_jwt_secret_key
JWT_EXPIRATION=180d
```

### 4. Run the development server
```bash
npm run dev
```
The server starts at `http://localhost:5000`

### 5. Health check
```bash
curl http://localhost:5000/health
```

---

## 🌐 Vercel Deployment

### Prerequisites
- Vercel account connected to this GitHub repository
- All environment variables set in **Vercel Dashboard → Project → Settings → Environment Variables**

### Required Environment Variables on Vercel

| Key | Description |
|-----|-------------|
| `DB_HOST` | AWS RDS PostgreSQL host |
| `DB_PORT` | Database port (5432) |
| `DB_USER` | Database username |
| `DB_PASSWORD` | Database password |
| `DB_NAME` | Database name |
| `DB_SSL` | `true` for RDS |
| `DATABASE_URL` | Full PostgreSQL connection string |
| `JWT_SECRET` | JWT signing secret |
| `JWT_EXPIRATION` | Token expiry (e.g. `180d`) |

### Deploy

Vercel automatically deploys on every push to the `master` branch.

```bash
git add .
git commit -m "your message"
git push origin master
```

### Manual Redeploy (Vercel Dashboard)
Go to **Vercel → Project → Deployments → ⋯ → Redeploy**

---

## 📦 Key Scripts

```bash
npm run dev              # Start development server (nodemon)
npm run start            # Start production server
npm run build            # Generate Prisma Client
npm run migrate          # Run DB migrations
npm run db:seed          # Seed the database
npm run db:reset         # Reset the database
npm run db:verify-sequences  # Verify DB sequences
```

---

## 🔌 API Routes

All routes are prefixed with `/api`

| Module | Prefix | Description |
|--------|--------|-------------|
| Auth | `/api/auth` | Login, Register |
| Patients | `/api/patients` | Patient management |
| OPD | `/api/opd` | Outpatient department |
| IPD | `/api/ipd` | Inpatient admissions |
| Rehabilitation | `/api/rehabilitation` | Rehab entries |
| Lab | `/api/lab` | Lab test orders |
| Pharmacy | `/api/pharmacy` | Drug & stock management |
| Billing | `/api/billing` | Bills & payments |

---

## 🔒 Security

- JWT-based authentication on all protected routes
- Helmet security headers via `@fastify/helmet`
- CORS restricted to allowed origins
- SSL enforced on database connections

---

## 📋 How Vercel Build Works

```
Push to master
  └─→ Vercel triggers build
        └─→ npm install
              └─→ postinstall: prisma generate
                    └─→ Prisma Client generated to src/generated/prisma/
                          └─→ @vercel/node bundles api/index.js ✅
```

---

## 📄 License

ISC © NILD — National Institute for Locomotor Disabilities
