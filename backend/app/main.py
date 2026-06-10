import logging
import os
import sqlite3
from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import settings
from app.database import create_db_and_tables, get_session
from app.routers import auth, departments, users, reports, files, email_router, admin
from app.models import ReportShare  # noqa: F401 — ensure table is registered on startup

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s | %(levelname)s | %(name)s — %(message)s",
)
logger = logging.getLogger(__name__)


def _run_migrations():
    """Safe ALTER TABLE migrations for SQLite — adds columns that may not exist yet."""
    db_path = settings.DATABASE_URL.replace("sqlite:///", "").replace("./", "")
    try:
        conn = sqlite3.connect(db_path)
        cur  = conn.cursor()
        cols = [row[1] for row in cur.execute("PRAGMA table_info(report_images)").fetchall()]
        if "note_id" not in cols:
            cur.execute("ALTER TABLE report_images ADD COLUMN note_id INTEGER REFERENCES report_notes(id)")
            conn.commit()
            logger.info("Migration: added note_id column to report_images")
        conn.close()
    except Exception as e:
        logger.warning("Migration skipped: %s", e)


def seed_initial_data():
    from sqlmodel import Session, select
    from app.models import User, Department, UserRole
    from app.auth import hash_password

    with Session(
        __import__("sqlmodel").create_engine(
            settings.DATABASE_URL, connect_args={"check_same_thread": False}
        )
    ) as session:
        # Default departments
        default_depts = [
            {"name": "Engineering", "short_code": "ENG", "description": "Engineering & Development"},
            {"name": "Operations", "short_code": "OPS", "description": "Operations & Logistics"},
            {"name": "Finance", "short_code": "FIN", "description": "Finance & Accounting"},
            {"name": "Human Resources", "short_code": "HR", "description": "HR & People Ops"},
            {"name": "Sales", "short_code": "SALES", "description": "Sales & Business Dev"},
        ]
        for d in default_depts:
            if not session.exec(
                select(Department).where(Department.short_code == d["short_code"])
            ).first():
                session.add(Department(**d))
        session.commit()

        # Admin user
        admin_exists = session.exec(
            select(User).where(User.email == settings.ADMIN_EMAIL)
        ).first()
        if not admin_exists:
            session.add(User(
                email=settings.ADMIN_EMAIL,
                username=settings.ADMIN_USERNAME,
                hashed_password=hash_password(settings.ADMIN_PASSWORD),
                role=UserRole.admin,
                is_active=True,
            ))
            session.commit()
            logger.info(f"Admin user created: {settings.ADMIN_EMAIL}")

        # Sample department heads
        sample_users = [
            {"email": "eng.head@spr.com", "username": "Alex (Engineering)", "dept": "ENG"},
            {"email": "ops.head@spr.com", "username": "Sarah (Operations)", "dept": "OPS"},
            {"email": "fin.head@spr.com", "username": "Michael (Finance)", "dept": "FIN"},
        ]
        for su in sample_users:
            if not session.exec(select(User).where(User.email == su["email"])).first():
                dept = session.exec(
                    select(Department).where(Department.short_code == su["dept"])
                ).first()
                if dept:
                    session.add(User(
                        email=su["email"],
                        username=su["username"],
                        hashed_password=hash_password("Password123!"),
                        role=UserRole.department_head,
                        department_id=dept.id,
                        is_active=True,
                    ))
        session.commit()
        logger.info("Sample users seeded")


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    Path(settings.UPLOAD_DIR).mkdir(parents=True, exist_ok=True)
    create_db_and_tables()
    _run_migrations()
    seed_initial_data()
    logger.info("SPR Weekly Hub started")
    yield
    logger.info("SPR Weekly Hub shutting down")


app = FastAPI(
    title="SPR Weekly Report Management Hub",
    version="1.0.0",
    description="Centralized weekly reporting for SPR Department Heads",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Routers
app.include_router(auth.router)
app.include_router(departments.router)
app.include_router(users.router)
app.include_router(reports.router)
app.include_router(files.router)
app.include_router(email_router.router)
app.include_router(admin.router)


@app.get("/api/health")
def health():
    return {"status": "ok", "service": "SPR Weekly Report Management Hub"}
