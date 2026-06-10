import os
import shutil
from pathlib import Path
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from fastapi.responses import FileResponse
from sqlmodel import Session, select
from typing import List, Optional
from datetime import datetime

from app.auth import get_current_user
from app.database import get_session
from app.models import User, WeeklyReport, ReportImage, ReportImageRead, Department, UserRole, ReportShare, ReportEditLog
from app.utils.helpers import get_upload_path, generate_filename, validate_image_file
from app.utils.audit import log_action
from app.config import settings


def _img_url(file_path: str) -> str:
    fp = file_path.replace("\\", "/")
    prefix = settings.UPLOAD_DIR.rstrip("/") + "/"
    if fp.startswith(prefix):
        fp = fp[len(prefix):]
    return f"/api/files/{fp}"

router = APIRouter(prefix="/api", tags=["files"])


def _check_report_access(report: WeeklyReport, current_user: User, session: Session = None):
    if current_user.role == UserRole.admin:
        return
    if report.user_id == current_user.id:
        return
    if session:
        shares = session.exec(select(ReportShare).where(ReportShare.report_id == report.id)).all()
        shared_ids = [s.user_id for s in shares]
        if shared_ids and current_user.id not in shared_ids:
            raise HTTPException(403, "You do not have access to this report")
        if not shared_ids and report.department_id != current_user.department_id:
            raise HTTPException(403, "Access denied")
    else:
        raise HTTPException(403, "Access denied")


def _log_edit(session: Session, report_id: int, user_id: int, action: str, detail: str = None):
    session.add(ReportEditLog(report_id=report_id, user_id=user_id, action=action, detail=detail))


@router.post("/reports/{report_id}/images", response_model=List[ReportImageRead])
async def upload_images(
    report_id: int,
    files: List[UploadFile] = File(...),
    captions: Optional[str] = Form(default=""),
    note_id: Optional[int] = Form(default=None),
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    report = session.get(WeeklyReport, report_id)
    if not report:
        raise HTTPException(404, "Report not found")
    _check_report_access(report, current_user, session)

    dept = session.get(Department, report.department_id)
    if not dept:
        raise HTTPException(404, "Department not found")

    caption_list = [c.strip() for c in captions.split("||")] if captions else []
    upload_path = get_upload_path(dept.short_code, report.weekend_date)

    # Get current max order_index
    existing = session.exec(
        select(ReportImage).where(ReportImage.report_id == report_id)
    ).all()
    start_order = len(existing)

    created = []
    for i, file in enumerate(files):
        content = await file.read()
        size = len(content)

        try:
            validate_image_file(file.content_type or "image/jpeg", file.filename or "file.jpg", size)
        except ValueError as e:
            raise HTTPException(400, str(e))

        new_filename = generate_filename(file.filename or "image.jpg")
        file_path = upload_path / new_filename

        with open(file_path, "wb") as f:
            f.write(content)

        caption = caption_list[i] if i < len(caption_list) else None
        img = ReportImage(
            report_id=report_id,
            note_id=note_id,          # link to specific note if provided
            filename=new_filename,
            original_name=file.filename or new_filename,
            file_path=str(file_path),
            caption=caption,
            file_size=size,
            order_index=start_order + i,
        )
        session.add(img)
        session.commit()
        session.refresh(img)

        img_read = ReportImageRead(
            id=img.id,
            report_id=img.report_id,
            note_id=img.note_id,
            filename=img.filename,
            original_name=img.original_name,
            caption=img.caption,
            file_size=img.file_size,
            order_index=img.order_index,
            created_at=img.created_at,
            url=_img_url(str(file_path)),
        )
        created.append(img_read)

    report.updated_at = datetime.utcnow()
    session.add(report)
    _log_edit(session, report_id, current_user.id, "image_added",
              f"{current_user.username} attached {len(files)} image(s)")
    session.commit()
    log_action(session, current_user.id, "UPLOAD_IMAGES", "report", report_id, f"{len(files)} file(s)")
    return created


@router.put("/reports/{report_id}/images/{image_id}", response_model=ReportImageRead)
def update_image(
    report_id: int,
    image_id: int,
    caption: Optional[str] = Form(default=None),
    order_index: Optional[int] = Form(default=None),
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    report = session.get(WeeklyReport, report_id)
    if not report:
        raise HTTPException(404, "Report not found")
    _check_report_access(report, current_user)

    img = session.get(ReportImage, image_id)
    if not img or img.report_id != report_id:
        raise HTTPException(404, "Image not found")

    if caption is not None:
        img.caption = caption
    if order_index is not None:
        img.order_index = order_index
    session.add(img)
    session.commit()
    session.refresh(img)
    return ReportImageRead(
        id=img.id,
        report_id=img.report_id,
        filename=img.filename,
        original_name=img.original_name,
        caption=img.caption,
        file_size=img.file_size,
        order_index=img.order_index,
        created_at=img.created_at,
        url=_img_url(img.file_path),
    )


@router.delete("/reports/{report_id}/images/{image_id}")
def delete_image(
    report_id: int,
    image_id: int,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    report = session.get(WeeklyReport, report_id)
    if not report:
        raise HTTPException(404, "Report not found")
    _check_report_access(report, current_user, session)

    img = session.get(ReportImage, image_id)
    if not img or img.report_id != report_id:
        raise HTTPException(404, "Image not found")

    _log_edit(session, report_id, current_user.id, "image_deleted",
              f"{current_user.username} removed image \"{img.original_name}\"")
    try:
        os.remove(img.file_path)
    except Exception:
        pass
    session.delete(img)
    session.commit()
    return {"message": "Image deleted"}


@router.get("/files/{file_path:path}")
def serve_file(
    file_path: str,
    current_user: User = Depends(get_current_user),
):
    # file_path arrives WITHOUT the uploads/ prefix, e.g.:
    # "departments/ENG/2026/2026-06-07/abc.jpg"
    # Reconstruct full path and enforce path-traversal safety.
    clean = file_path.lstrip("/").replace("..", "")
    safe_path = (Path(settings.UPLOAD_DIR) / clean).resolve()
    base = Path(settings.UPLOAD_DIR).resolve()

    if not str(safe_path).startswith(str(base)):
        raise HTTPException(403, "Access denied")

    if not safe_path.exists():
        raise HTTPException(404, "File not found")

    return FileResponse(str(safe_path))
