from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session, select
from typing import List

from app.auth import get_current_user, get_admin_user, hash_password
from app.database import get_session
from app.models import User, UserCreate, UserRead, UserUpdate, Department
from app.utils.audit import log_action

router = APIRouter(prefix="/api/users", tags=["users"])


@router.get("/shareable", response_model=List[UserRead])
def list_shareable_users(
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """Any authenticated user can fetch the list of active users for report-sharing purposes."""
    users = session.exec(select(User).where(User.is_active == True)).all()  # noqa: E712
    for u in users:
        if u.department_id:
            u.department = session.get(Department, u.department_id)
    return users


@router.get("", response_model=List[UserRead])
def list_users(
    session: Session = Depends(get_session),
    current_user: User = Depends(get_admin_user),
):
    users = session.exec(select(User)).all()
    for u in users:
        if u.department_id:
            u.department = session.get(Department, u.department_id)
    return users


@router.post("", response_model=UserRead)
def create_user(
    user_in: UserCreate,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_admin_user),
):
    existing = session.exec(select(User).where(User.email == user_in.email)).first()
    if existing:
        raise HTTPException(400, "Email already registered")

    obj = User(
        email=user_in.email,
        username=user_in.username,
        role=user_in.role,
        department_id=user_in.department_id,
        hashed_password=hash_password(user_in.password),
    )
    session.add(obj)
    session.commit()
    session.refresh(obj)
    if obj.department_id:
        obj.department = session.get(Department, obj.department_id)
    log_action(session, current_user.id, "CREATE", "user", obj.id, obj.email)
    return obj


@router.get("/{user_id}", response_model=UserRead)
def get_user(
    user_id: int,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_admin_user),
):
    user = session.get(User, user_id)
    if not user:
        raise HTTPException(404, "User not found")
    if user.department_id:
        user.department = session.get(Department, user.department_id)
    return user


@router.put("/{user_id}", response_model=UserRead)
def update_user(
    user_id: int,
    user_in: UserUpdate,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_admin_user),
):
    user = session.get(User, user_id)
    if not user:
        raise HTTPException(404, "User not found")

    data = user_in.model_dump(exclude_unset=True)
    if "password" in data:
        data["hashed_password"] = hash_password(data.pop("password"))

    for k, v in data.items():
        setattr(user, k, v)
    session.add(user)
    session.commit()
    session.refresh(user)
    if user.department_id:
        user.department = session.get(Department, user.department_id)
    log_action(session, current_user.id, "UPDATE", "user", user_id, user.email)
    return user


@router.delete("/{user_id}")
def delete_user(
    user_id: int,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_admin_user),
):
    if user_id == current_user.id:
        raise HTTPException(400, "Cannot delete your own account")
    user = session.get(User, user_id)
    if not user:
        raise HTTPException(404, "User not found")
    user.is_active = False
    session.add(user)
    session.commit()
    log_action(session, current_user.id, "DELETE", "user", user_id, user.email)
    return {"message": "User deactivated"}
