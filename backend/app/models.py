from sqlmodel import SQLModel, Field, Relationship
from typing import Optional, List
from datetime import datetime, date
from enum import Enum


class UserRole(str, Enum):
    admin = "admin"
    department_head = "department_head"


class ReportStatus(str, Enum):
    draft = "draft"
    published = "published"


# ── Department ────────────────────────────────────────────────────────────────

class DepartmentBase(SQLModel):
    name: str = Field(min_length=2, max_length=100)
    short_code: str = Field(min_length=1, max_length=20)
    description: Optional[str] = None


class Department(DepartmentBase, table=True):
    __tablename__ = "departments"
    id: Optional[int] = Field(default=None, primary_key=True)
    created_at: datetime = Field(default_factory=datetime.utcnow)
    is_active: bool = Field(default=True)

    users: List["User"] = Relationship(back_populates="department")
    reports: List["WeeklyReport"] = Relationship(back_populates="department")


class DepartmentCreate(DepartmentBase):
    pass


class DepartmentUpdate(SQLModel):
    name: Optional[str] = None
    short_code: Optional[str] = None
    description: Optional[str] = None
    is_active: Optional[bool] = None


class DepartmentRead(DepartmentBase):
    id: int
    created_at: datetime
    is_active: bool


# ── User ──────────────────────────────────────────────────────────────────────

class UserBase(SQLModel):
    email: str = Field(unique=True, index=True)
    username: str = Field(min_length=2, max_length=100)
    role: UserRole = Field(default=UserRole.department_head)
    department_id: Optional[int] = Field(default=None, foreign_key="departments.id")


class User(UserBase, table=True):
    __tablename__ = "users"
    id: Optional[int] = Field(default=None, primary_key=True)
    hashed_password: str
    is_active: bool = Field(default=True)
    created_at: datetime = Field(default_factory=datetime.utcnow)
    last_login: Optional[datetime] = None

    department: Optional[Department] = Relationship(back_populates="users")
    reports: List["WeeklyReport"] = Relationship(back_populates="user")
    audit_logs: List["AuditLog"] = Relationship(back_populates="user")


class UserCreate(UserBase):
    password: str = Field(min_length=6)


class UserUpdate(SQLModel):
    username: Optional[str] = None
    email: Optional[str] = None
    password: Optional[str] = None
    role: Optional[UserRole] = None
    department_id: Optional[int] = None
    is_active: Optional[bool] = None


class UserRead(UserBase):
    id: int
    is_active: bool
    created_at: datetime
    last_login: Optional[datetime]
    department: Optional[DepartmentRead] = None


# ── WeeklyReport ──────────────────────────────────────────────────────────────

class WeeklyReport(SQLModel, table=True):
    __tablename__ = "weekly_reports"
    id: Optional[int] = Field(default=None, primary_key=True)
    department_id: int = Field(foreign_key="departments.id")
    user_id: int = Field(foreign_key="users.id")
    weekend_date: date = Field(index=True)
    status: ReportStatus = Field(default=ReportStatus.draft)
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

    department: Optional[Department] = Relationship(back_populates="reports")
    user: Optional[User] = Relationship(back_populates="reports")
    notes: List["ReportNote"] = Relationship(back_populates="report")
    images: List["ReportImage"] = Relationship(back_populates="report")


class WeeklyReportCreate(SQLModel):
    weekend_date: date
    status: ReportStatus = ReportStatus.draft


class WeeklyReportUpdate(SQLModel):
    status: Optional[ReportStatus] = None


class WeeklyReportRead(SQLModel):
    id: int
    department_id: int
    user_id: int
    weekend_date: date
    status: ReportStatus
    created_at: datetime
    updated_at: datetime
    department: Optional[DepartmentRead] = None
    user: Optional[UserRead] = None
    notes: List["ReportNoteRead"] = []
    images: List["ReportImageRead"] = []
    shared_user_ids: List[int] = []   # empty = no restriction; non-empty = only these users


# ── ReportNote ────────────────────────────────────────────────────────────────

class ReportNote(SQLModel, table=True):
    __tablename__ = "report_notes"
    id: Optional[int] = Field(default=None, primary_key=True)
    report_id: int = Field(foreign_key="weekly_reports.id")
    content: str = Field(min_length=1)
    order_index: int = Field(default=0)
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

    report: Optional[WeeklyReport] = Relationship(back_populates="notes")


class ReportNoteCreate(SQLModel):
    content: str
    order_index: int = 0


class ReportNoteUpdate(SQLModel):
    content: Optional[str] = None
    order_index: Optional[int] = None


class ReportNoteRead(SQLModel):
    id: int
    report_id: int
    content: str
    order_index: int
    created_at: datetime
    updated_at: datetime


# ── ReportImage ───────────────────────────────────────────────────────────────

class ReportImage(SQLModel, table=True):
    __tablename__ = "report_images"
    id: Optional[int] = Field(default=None, primary_key=True)
    report_id: int = Field(foreign_key="weekly_reports.id")
    # Optional link to a specific note — image will appear below that note in the report
    note_id: Optional[int] = Field(default=None, foreign_key="report_notes.id")
    filename: str
    original_name: str
    file_path: str
    caption: Optional[str] = None
    file_size: int = Field(default=0)
    order_index: int = Field(default=0)
    created_at: datetime = Field(default_factory=datetime.utcnow)

    report: Optional[WeeklyReport] = Relationship(back_populates="images")


class ReportImageRead(SQLModel):
    id: int
    report_id: int
    note_id: Optional[int] = None
    filename: str
    original_name: str
    caption: Optional[str]
    file_size: int
    order_index: int
    created_at: datetime
    url: str = ""


# ── ReportShare ───────────────────────────────────────────────────────────────
# Tracks which specific users have been granted access to a published report.
# If NO shares exist for a report → all users with normal access can see it.
# If ANY shares exist → only those users (+ owner + admins) can see it.

class ReportShare(SQLModel, table=True):
    __tablename__ = "report_shares"
    id: Optional[int] = Field(default=None, primary_key=True)
    report_id: int = Field(foreign_key="weekly_reports.id", index=True)
    user_id: int = Field(foreign_key="users.id", index=True)
    granted_at: datetime = Field(default_factory=datetime.utcnow)


class ReportShareRead(SQLModel):
    user_id: int
    granted_at: datetime
    user: Optional["UserRead"] = None


# ── AuditLog ──────────────────────────────────────────────────────────────────

class AuditLog(SQLModel, table=True):
    __tablename__ = "audit_logs"
    id: Optional[int] = Field(default=None, primary_key=True)
    user_id: Optional[int] = Field(default=None, foreign_key="users.id")
    action: str
    entity_type: str
    entity_id: Optional[int] = None
    details: Optional[str] = None
    ip_address: Optional[str] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)

    user: Optional[User] = Relationship(back_populates="audit_logs")


class AuditLogRead(SQLModel):
    id: int
    user_id: Optional[int]
    action: str
    entity_type: str
    entity_id: Optional[int]
    details: Optional[str]
    ip_address: Optional[str]
    created_at: datetime
    user: Optional[UserRead] = None


# Update forward refs
WeeklyReportRead.model_rebuild()
