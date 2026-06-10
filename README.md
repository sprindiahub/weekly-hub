# SPR Weekly Report Management Hub

A complete, production-ready web application for managing weekly department reports.

## Features

- **Dashboard** — live stats, quick-access to current weekend report
- **Weekly Reports** — structured notes + image attachments per Saturday
- **Professional PDF Export** — styled with ReportLab; headers, notes, inline images, page numbers
- **Email Reports** — send HTML email + PDF attachment via SMTP
- **Admin Panel** — manage users, departments, view audit log
- **Role-Based Access** — Admin vs Department Head
- **JWT Auth** — HTTP-only cookie based sessions
- **Secure File Storage** — path traversal protected, type/size validated

## Tech Stack

| Layer | Tech |
|-------|------|
| Backend | FastAPI + SQLModel + SQLite |
| Frontend | React 18 + Vite + TypeScript + Tailwind CSS |
| PDF | ReportLab |
| Auth | JWT (HTTP-only cookies) |
| Email | SMTP (smtplib) |
| ORM | SQLModel (SQLAlchemy) |

## Quick Start (Development)

### Backend

```bash
cd backend
python -m venv venv
./venv/Scripts/activate     # Windows
# source venv/bin/activate  # macOS/Linux
pip install -r requirements.txt
cp .env.example .env
uvicorn app.main:app --reload --port 8001
```

Backend starts at `http://localhost:8001`  
Swagger docs: `http://localhost:8001/docs`

### Frontend

```bash
cd frontend
npm install
npm run dev -- --port 5174
```

Frontend starts at `http://localhost:5174`

## Docker (Production)

```bash
cp backend/.env.example backend/.env
# Edit backend/.env with your settings
docker-compose up -d
```

- Frontend: `http://localhost:3000`
- Backend API: `http://localhost:8000`

## Default Credentials

| Role | Email | Password |
|------|-------|----------|
| Admin | admin@spr.com | Admin@SPR2024! |
| Eng Head | eng.head@spr.com | Password123! |
| Ops Head | ops.head@spr.com | Password123! |
| Fin Head | fin.head@spr.com | Password123! |

## Environment Variables

```env
SECRET_KEY=             # JWT secret (min 32 chars)
DATABASE_URL=           # sqlite:///./spr_hub.db
SMTP_HOST=              # smtp.gmail.com
SMTP_PORT=587
SMTP_USERNAME=          # Gmail address
SMTP_PASSWORD=          # App password (not main password)
SMTP_FROM_EMAIL=        # Sender email
UPLOAD_DIR=uploads      # Folder for file storage
MAX_FILE_SIZE_MB=10
```

## File Storage Structure

```
uploads/
  departments/
    ENG/
      2024/
        2024-06-08/
          abc123.jpg
          def456.png
```

## Project Structure

```
spr-weekly-hub/
├── backend/
│   ├── app/
│   │   ├── main.py          # FastAPI app + lifespan seeding
│   │   ├── models.py        # SQLModel ORM models
│   │   ├── auth.py          # JWT auth utilities
│   │   ├── config.py        # Pydantic settings
│   │   ├── database.py      # Engine + session
│   │   ├── routers/         # API route handlers
│   │   ├── services/        # PDF + Email generation
│   │   └── utils/           # Helpers + audit logging
│   ├── uploads/             # File storage root
│   ├── requirements.txt
│   └── Dockerfile
├── frontend/
│   ├── src/
│   │   ├── pages/           # Route-level components
│   │   ├── components/      # Shared UI components
│   │   ├── hooks/           # useAuth (Zustand)
│   │   ├── lib/             # API client + utilities
│   │   └── types/           # TypeScript interfaces
│   ├── package.json
│   └── Dockerfile
└── docker-compose.yml
```

## API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| POST | /api/auth/login | Login (form data) |
| POST | /api/auth/logout | Clear session |
| GET | /api/auth/me | Current user |
| GET/POST | /api/departments | List/Create departments |
| GET/POST | /api/users | List/Create users (admin) |
| GET/POST | /api/reports | List/Create reports |
| GET/PUT/DELETE | /api/reports/{id} | Report CRUD |
| POST | /api/reports/{id}/notes | Add note |
| PUT/DELETE | /api/reports/{id}/notes/{nid} | Note CRUD |
| POST | /api/reports/{id}/images | Upload images |
| DELETE | /api/reports/{id}/images/{iid} | Remove image |
| GET | /api/reports/{id}/pdf | Download PDF |
| POST | /api/email/send | Send email + PDF |
| POST | /api/email/bulk-pdf | Multi-report PDF |
| GET | /api/admin/stats | Dashboard stats |
| GET | /api/admin/audit-logs | Audit trail |

## Gmail SMTP Setup

1. Enable 2FA on your Google account
2. Go to Google Account → Security → App Passwords
3. Generate app password for "Mail"
4. Use that password as `SMTP_PASSWORD` in `.env`
