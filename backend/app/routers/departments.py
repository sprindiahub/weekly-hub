from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session, select
from typing import List

from app.auth import get_current_user, get_admin_user
from app.database import get_session
from app.models import Department, DepartmentCreate, DepartmentRead, DepartmentUpdate, User
from app.utils.audit import log_action

router = APIRouter(prefix="/api/departments", tags=["departments"])


@router.get("", response_model=List[DepartmentRead])
def list_departments(
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    return session.exec(select(Department).where(Department.is_active == True)).all()


@router.post("", response_model=DepartmentRead)
def create_department(
    dept: DepartmentCreate,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_admin_user),
):
    existing = session.exec(
        select(Department).where(Department.short_code == dept.short_code.upper())
    ).first()
    if existing:
        raise HTTPException(400, f"Department with code '{dept.short_code}' already exists")

    data = dept.model_dump()
    data["short_code"] = data["short_code"].upper()
    obj = Department(**data)
    session.add(obj)
    session.commit()
    session.refresh(obj)
    log_action(session, current_user.id, "CREATE", "department", obj.id, obj.name)
    return obj


@router.put("/{dept_id}", response_model=DepartmentRead)
def update_department(
    dept_id: int,
    dept: DepartmentUpdate,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_admin_user),
):
    obj = session.get(Department, dept_id)
    if not obj:
        raise HTTPException(404, "Department not found")
    data = dept.model_dump(exclude_unset=True)
    if "short_code" in data:
        data["short_code"] = data["short_code"].upper()
    for k, v in data.items():
        setattr(obj, k, v)
    session.add(obj)
    session.commit()
    session.refresh(obj)
    log_action(session, current_user.id, "UPDATE", "department", obj.id, obj.name)
    return obj


@router.delete("/{dept_id}")
def delete_department(
    dept_id: int,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_admin_user),
):
    obj = session.get(Department, dept_id)
    if not obj:
        raise HTTPException(404, "Department not found")
    obj.is_active = False
    session.add(obj)
    session.commit()
    log_action(session, current_user.id, "DELETE", "department", dept_id, obj.name)
    return {"message": "Department deactivated"}
