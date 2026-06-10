from fastapi import APIRouter, Depends, Query
from sqlmodel import Session, select
from typing import List, Optional

from app.auth import get_admin_user
from app.database import get_session
from app.models import AuditLog, AuditLogRead, User, Department, UserRole

router = APIRouter(prefix="/api/admin", tags=["admin"])


@router.get("/audit-logs", response_model=List[AuditLogRead])
def get_audit_logs(
    session: Session = Depends(get_session),
    current_user: User = Depends(get_admin_user),
    skip: int = 0,
    limit: int = 100,
    action: Optional[str] = None,
    entity_type: Optional[str] = None,
):
    query = select(AuditLog).order_by(AuditLog.created_at.desc())
    if action:
        query = query.where(AuditLog.action == action)
    if entity_type:
        query = query.where(AuditLog.entity_type == entity_type)
    query = query.offset(skip).limit(limit)
    logs = session.exec(query).all()
    result = []
    for log in logs:
        u = session.get(User, log.user_id) if log.user_id else None
        if u and u.department_id:
            u.department = session.get(Department, u.department_id)
        result.append(AuditLogRead(
            id=log.id,
            user_id=log.user_id,
            action=log.action,
            entity_type=log.entity_type,
            entity_id=log.entity_id,
            details=log.details,
            ip_address=log.ip_address,
            created_at=log.created_at,
            user=u,
        ))
    return result


@router.get("/stats")
def get_stats(
    session: Session = Depends(get_session),
    current_user: User = Depends(get_admin_user),
):
    from app.models import WeeklyReport, ReportNote, ReportImage
    total_users = len(session.exec(select(User).where(User.is_active == True)).all())
    total_depts = len(session.exec(select(Department).where(Department.is_active == True)).all())
    total_reports = len(session.exec(select(WeeklyReport)).all())
    total_notes = len(session.exec(select(ReportNote)).all())
    total_images = len(session.exec(select(ReportImage)).all())
    return {
        "total_users": total_users,
        "total_departments": total_depts,
        "total_reports": total_reports,
        "total_notes": total_notes,
        "total_images": total_images,
    }
