from fastapi import APIRouter, Depends, HTTPException, Query, Request
from fastapi.responses import StreamingResponse
from sqlmodel import Session, select, and_
from typing import List, Optional
from datetime import date, datetime
from io import BytesIO

from app.auth import get_current_user
from app.database import get_session
from app.models import (
    User, WeeklyReport, WeeklyReportCreate, WeeklyReportUpdate, WeeklyReportRead,
    ReportNote, ReportNoteCreate, ReportNoteUpdate, ReportNoteRead,
    Department, UserRole, ReportStatus, ReportShare, ReportEditLog
)
from app.services.pdf_service import generate_pdf
from app.utils.audit import log_action
from app.config import settings

router = APIRouter(prefix="/api/reports", tags=["reports"])
from app.models import ReportImage  # noqa: E402 — avoid circular at top


def _img_url(file_path: str) -> str:
    """Convert stored absolute/relative file_path to a safe /api/files/ URL.
    Strips the leading upload dir so the serving endpoint doesn't double-prefix it."""
    fp = file_path.replace("\\", "/")
    upload_prefix = settings.UPLOAD_DIR.rstrip("/") + "/"
    if fp.startswith(upload_prefix):
        fp = fp[len(upload_prefix):]
    return f"/api/files/{fp}"


def _enrich_report(report: WeeklyReport, session: Session) -> WeeklyReportRead:
    dept = session.get(Department, report.department_id)
    user = session.get(User, report.user_id)
    if user and user.department_id:
        user.department = session.get(Department, user.department_id)
    notes = session.exec(
        select(ReportNote).where(ReportNote.report_id == report.id)
        .order_by(ReportNote.order_index, ReportNote.created_at)
    ).all()
    from app.models import ReportImage, ReportImageRead
    images = session.exec(
        select(ReportImage).where(ReportImage.report_id == report.id)
        .order_by(ReportImage.order_index, ReportImage.created_at)
    ).all()

    from app.models import ReportImageRead
    img_reads = []
    for img in images:
        r = ReportImageRead(
            id=img.id,
            report_id=img.report_id,
            note_id=img.note_id,
            filename=img.filename,
            original_name=img.original_name,
            caption=img.caption,
            file_size=img.file_size,
            order_index=img.order_index,
            created_at=img.created_at,
            url=_img_url(img.file_path),
        )
        img_reads.append(r)

    shares = session.exec(
        select(ReportShare).where(ReportShare.report_id == report.id)
    ).all()
    shared_user_ids = [s.user_id for s in shares]

    return WeeklyReportRead(
        id=report.id,
        department_id=report.department_id,
        user_id=report.user_id,
        weekend_date=report.weekend_date,
        status=report.status,
        created_at=report.created_at,
        updated_at=report.updated_at,
        department=dept,
        user=user,
        notes=[ReportNoteRead.model_validate(n) for n in notes],
        images=img_reads,
        shared_user_ids=shared_user_ids,
    )


def _check_report_access(report: WeeklyReport, current_user: User, session: Session = None):
    """Admins can always access. Owner can always access.
    If the report has share entries, only those specific users can access it.
    If no share entries, normal department-based visibility applies."""
    if current_user.role == UserRole.admin:
        return
    if report.user_id == current_user.id:
        return
    # Check share list
    if session:
        shares = session.exec(
            select(ReportShare).where(ReportShare.report_id == report.id)
        ).all()
        shared_ids = [s.user_id for s in shares]
        if shared_ids and current_user.id not in shared_ids:
            raise HTTPException(403, "You do not have access to this report")
        if not shared_ids:
            # No shares set → department-level access
            if report.department_id != current_user.department_id:
                raise HTTPException(403, "Access denied")
    else:
        if report.user_id != current_user.id:
            raise HTTPException(403, "Access denied")


def _log_edit(session: Session, report_id: int, user_id: int, action: str, detail: str = None):
    """Write a ReportEditLog row so collaborators can see who changed what."""
    session.add(ReportEditLog(
        report_id=report_id, user_id=user_id, action=action, detail=detail
    ))


# ── CRUD ───────────────────────────────────────────────────────────────────────

@router.get("", response_model=List[WeeklyReportRead])
def list_reports(
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
    department_id: Optional[int] = None,
    from_date: Optional[date] = None,
    to_date: Optional[date] = None,
    status: Optional[str] = None,
    search: Optional[str] = None,
    skip: int = 0,
    limit: int = 50,
):
    query = select(WeeklyReport)

    if current_user.role != UserRole.admin:
        query = query.where(WeeklyReport.department_id == current_user.department_id)
    elif department_id:
        query = query.where(WeeklyReport.department_id == department_id)

    if from_date:
        query = query.where(WeeklyReport.weekend_date >= from_date)
    if to_date:
        query = query.where(WeeklyReport.weekend_date <= to_date)
    if status:
        query = query.where(WeeklyReport.status == status)

    query = query.order_by(WeeklyReport.weekend_date.desc()).offset(skip).limit(limit)
    reports = session.exec(query).all()

    if search:
        search_lower = search.lower()
        filtered = []
        for report in reports:
            notes = session.exec(
                select(ReportNote).where(ReportNote.report_id == report.id)
            ).all()
            if any(search_lower in n.content.lower() for n in notes):
                filtered.append(report)
        reports = filtered

    return [_enrich_report(r, session) for r in reports]


@router.get("/shared-with-me", response_model=List[WeeklyReportRead])
def get_shared_with_me(
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """Returns all reports explicitly shared with the current user (they are not the owner)."""
    shares = session.exec(
        select(ReportShare).where(ReportShare.user_id == current_user.id)
    ).all()
    report_ids = [s.report_id for s in shares]
    if not report_ids:
        return []
    reports = session.exec(
        select(WeeklyReport).where(WeeklyReport.id.in_(report_ids))
        .order_by(WeeklyReport.updated_at.desc())
    ).all()
    # exclude reports the user owns (they see those in their own list)
    reports = [r for r in reports if r.user_id != current_user.id]
    return [_enrich_report(r, session) for r in reports]


@router.get("/{report_id}/edit-history")
def get_edit_history(
    report_id: int,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """Returns the full edit log for a report — visible to owner and all shared users."""
    report = session.get(WeeklyReport, report_id)
    if not report:
        raise HTTPException(404, "Report not found")
    _check_report_access(report, current_user, session)

    logs = session.exec(
        select(ReportEditLog).where(ReportEditLog.report_id == report_id)
        .order_by(ReportEditLog.edited_at.desc())
    ).all()

    result = []
    for log in logs:
        u = session.get(User, log.user_id)
        dept = session.get(Department, u.department_id) if u and u.department_id else None
        result.append({
            "id": log.id,
            "action": log.action,
            "detail": log.detail,
            "edited_at": log.edited_at,
            "user": {
                "id": u.id,
                "username": u.username,
                "email": u.email,
                "department": dept.name if dept else None,
            } if u else None,
        })
    return result


@router.get("/week/{weekend_date}/published", response_model=List[WeeklyReportRead])
def get_published_reports_for_week(
    weekend_date: date,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """Returns all PUBLISHED reports for a given weekend date,
    excluding the current user's own department — used for combining reports."""
    query = select(WeeklyReport).where(
        and_(
            WeeklyReport.weekend_date == weekend_date,
            WeeklyReport.status == ReportStatus.published,
        )
    )
    # Non-admins can see other departments' published reports (for combining)
    # but NOT their own (they already have it)
    if current_user.department_id:
        query = query.where(WeeklyReport.department_id != current_user.department_id)

    reports = session.exec(query).all()
    return [_enrich_report(r, session) for r in reports]


@router.post("", response_model=WeeklyReportRead)
def create_report(
    report_in: WeeklyReportCreate,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    if not current_user.department_id:
        raise HTTPException(400, "User has no department assigned")

    # Check Saturday
    if report_in.weekend_date.weekday() != 5:
        raise HTTPException(400, "Weekend date must be a Saturday")

    # Check duplicate
    existing = session.exec(
        select(WeeklyReport).where(
            and_(
                WeeklyReport.department_id == current_user.department_id,
                WeeklyReport.weekend_date == report_in.weekend_date,
            )
        )
    ).first()
    if existing:
        raise HTTPException(400, f"Report for {report_in.weekend_date} already exists for your department")

    report = WeeklyReport(
        department_id=current_user.department_id,
        user_id=current_user.id,
        weekend_date=report_in.weekend_date,
        status=report_in.status,
    )
    session.add(report)
    session.commit()
    session.refresh(report)
    log_action(session, current_user.id, "CREATE", "report", report.id, str(report_in.weekend_date))
    return _enrich_report(report, session)


@router.get("/{report_id}", response_model=WeeklyReportRead)
def get_report(
    report_id: int,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    report = session.get(WeeklyReport, report_id)
    if not report:
        raise HTTPException(404, "Report not found")
    _check_report_access(report, current_user, session)
    return _enrich_report(report, session)


@router.put("/{report_id}", response_model=WeeklyReportRead)
def update_report(
    report_id: int,
    report_in: WeeklyReportUpdate,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    report = session.get(WeeklyReport, report_id)
    if not report:
        raise HTTPException(404, "Report not found")
    _check_report_access(report, current_user, session)
    data = report_in.model_dump(exclude_unset=True)
    for k, v in data.items():
        setattr(report, k, v)
    report.updated_at = datetime.utcnow()
    session.add(report)
    session.commit()
    session.refresh(report)
    log_action(session, current_user.id, "UPDATE", "report", report_id)
    return _enrich_report(report, session)


@router.delete("/{report_id}")
def delete_report(
    report_id: int,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    report = session.get(WeeklyReport, report_id)
    if not report:
        raise HTTPException(404, "Report not found")
    _check_report_access(report, current_user, session)

    # Delete notes and images
    notes = session.exec(select(ReportNote).where(ReportNote.report_id == report_id)).all()
    for n in notes:
        session.delete(n)

    from app.models import ReportImage
    import os
    images = session.exec(
        select(ReportImage).where(ReportImage.report_id == report_id)
    ).all()
    for img in images:
        try:
            os.remove(img.file_path)
        except Exception:
            pass
        session.delete(img)

    session.delete(report)
    session.commit()
    log_action(session, current_user.id, "DELETE", "report", report_id)
    return {"message": "Report deleted"}


# ── Notes ──────────────────────────────────────────────────────────────────────

@router.post("/{report_id}/notes", response_model=ReportNoteRead)
def add_note(
    report_id: int,
    note_in: ReportNoteCreate,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    report = session.get(WeeklyReport, report_id)
    if not report:
        raise HTTPException(404, "Report not found")
    _check_report_access(report, current_user, session)

    # Auto-set order_index if not provided
    existing = session.exec(
        select(ReportNote).where(ReportNote.report_id == report_id)
    ).all()
    order = note_in.order_index if note_in.order_index else len(existing)

    note = ReportNote(
        report_id=report_id,
        content=note_in.content,
        order_index=order,
    )
    session.add(note)
    report.updated_at = datetime.utcnow()
    session.add(report)
    _log_edit(session, report_id, current_user.id, "note_added",
              f"{current_user.username} added a point: \"{note_in.content[:80]}\"")
    session.commit()
    session.refresh(note)
    return note


@router.put("/{report_id}/notes/{note_id}", response_model=ReportNoteRead)
def update_note(
    report_id: int,
    note_id: int,
    note_in: ReportNoteUpdate,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    report = session.get(WeeklyReport, report_id)
    if not report:
        raise HTTPException(404, "Report not found")
    _check_report_access(report, current_user, session)

    note = session.get(ReportNote, note_id)
    if not note or note.report_id != report_id:
        raise HTTPException(404, "Note not found")

    data = note_in.model_dump(exclude_unset=True)
    for k, v in data.items():
        setattr(note, k, v)
    note.updated_at = datetime.utcnow()
    report.updated_at = datetime.utcnow()
    session.add(note)
    session.add(report)
    _log_edit(session, report_id, current_user.id, "note_edited",
              f"{current_user.username} edited a point: \"{note_in.content[:80] if note_in.content else '…'}\"")
    session.commit()
    session.refresh(note)
    return note


@router.delete("/{report_id}/notes/{note_id}")
def delete_note(
    report_id: int,
    note_id: int,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    report = session.get(WeeklyReport, report_id)
    if not report:
        raise HTTPException(404, "Report not found")
    _check_report_access(report, current_user, session)

    note = session.get(ReportNote, note_id)
    if not note or note.report_id != report_id:
        raise HTTPException(404, "Note not found")
    _log_edit(session, report_id, current_user.id, "note_deleted",
              f"{current_user.username} removed a point")
    session.delete(note)
    report.updated_at = datetime.utcnow()
    session.add(report)
    session.commit()
    return {"message": "Note deleted"}


# ── PDF export ─────────────────────────────────────────────────────────────────

@router.get("/{report_id}/pdf")
def download_pdf(
    report_id: int,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    report = session.get(WeeklyReport, report_id)
    if not report:
        raise HTTPException(404, "Report not found")
    _check_report_access(report, current_user, session)

    enriched = _enrich_report(report, session)
    dept = session.get(Department, report.department_id)
    user = session.get(User, report.user_id)

    from app.models import ReportImage
    images = session.exec(
        select(ReportImage).where(ReportImage.report_id == report_id)
    ).all()

    reports_data = [{
        "department_name": dept.name if dept else "Unknown",
        "department_code": dept.short_code if dept else "N/A",
        "weekend_date": str(report.weekend_date),
        "user_name": user.username if user else "Unknown",
        "notes": [{"id": n.id, "content": n.content, "created_at": n.created_at,
                   "order_index": n.order_index} for n in enriched.notes],
        "images": [{"file_path": img.file_path, "caption": img.caption,
                    "original_name": img.original_name, "order_index": img.order_index,
                    "note_id": img.note_id}
                   for img in images],
    }]

    import logging
    logger = logging.getLogger(__name__)
    try:
        pdf_bytes = generate_pdf(reports_data)
    except Exception as exc:
        logger.exception("PDF generation failed for report %s", report_id)
        raise HTTPException(500, f"PDF generation failed: {exc}") from exc

    filename = f"SPR_Report_{dept.short_code if dept else 'DEPT'}_{report.weekend_date}.pdf"
    try:
        log_action(session, current_user.id, "EXPORT_PDF", "report", report_id)
    except Exception:
        pass  # Don't let audit log failure break the download

    return StreamingResponse(
        BytesIO(pdf_bytes),
        media_type="application/pdf",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )


# ── Combined PDF export ────────────────────────────────────────────────────────

from pydantic import BaseModel as _BaseModel


class CombinedPDFRequest(_BaseModel):
    report_ids: List[int]


@router.post("/combined-pdf")
def download_combined_pdf(
    body: CombinedPDFRequest,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """Generate a single PDF combining multiple reports.
    Only reports the current user has access to will be included."""
    import logging
    logger = logging.getLogger(__name__)

    if not body.report_ids:
        raise HTTPException(400, "At least one report ID is required")
    if len(body.report_ids) > 20:
        raise HTTPException(400, "Maximum 20 reports can be combined at once")

    reports_data = []
    allowed_ids = []
    for rid in body.report_ids:
        report = session.get(WeeklyReport, rid)
        if not report:
            continue
        try:
            _check_report_access(report, current_user, session)
        except HTTPException:
            continue  # silently skip reports the user can't access

        enriched = _enrich_report(report, session)
        dept = session.get(Department, report.department_id)
        user = session.get(User, report.user_id)
        from app.models import ReportImage as _RI
        images = session.exec(
            select(_RI).where(_RI.report_id == rid)
        ).all()

        reports_data.append({
            "department_name": dept.name if dept else "Unknown",
            "department_code": dept.short_code if dept else "N/A",
            "weekend_date": str(report.weekend_date),
            "user_name": user.username if user else "Unknown",
            "notes": [{"id": n.id, "content": n.content, "created_at": n.created_at,
                       "order_index": n.order_index} for n in enriched.notes],
            "images": [{"file_path": img.file_path, "caption": img.caption,
                        "original_name": img.original_name, "order_index": img.order_index,
                        "note_id": img.note_id}
                       for img in images],
        })
        allowed_ids.append(rid)

    if not reports_data:
        raise HTTPException(404, "No accessible reports found for the given IDs")

    try:
        pdf_bytes = generate_pdf(reports_data)
    except Exception as exc:
        logger.exception("Combined PDF generation failed")
        raise HTTPException(500, f"PDF generation failed: {exc}") from exc

    filename = f"SPR_Combined_Report_{len(reports_data)}_depts.pdf"
    try:
        for rid in allowed_ids:
            log_action(session, current_user.id, "EXPORT_PDF", "report", rid, "combined")
    except Exception:
        pass

    return StreamingResponse(
        BytesIO(pdf_bytes),
        media_type="application/pdf",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )


# ── Report Sharing / Publish Access ────────────────────────────────────────────

class ShareRequest(_BaseModel):
    user_ids: List[int]
    publish: bool = True   # also flip status → published


@router.get("/{report_id}/shares")
def get_report_shares(
    report_id: int,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """Return the list of user_ids that have explicit access to this report."""
    report = session.get(WeeklyReport, report_id)
    if not report:
        raise HTTPException(404, "Report not found")
    _check_report_access(report, current_user, session)

    shares = session.exec(
        select(ReportShare).where(ReportShare.report_id == report_id)
    ).all()
    users = []
    for s in shares:
        u = session.get(User, s.user_id)
        if u:
            dept = session.get(Department, u.department_id) if u.department_id else None
            users.append({
                "user_id": u.id,
                "username": u.username,
                "email": u.email,
                "department": dept.name if dept else None,
                "granted_at": s.granted_at,
            })
    return users


@router.put("/{report_id}/shares")
def set_report_shares(
    report_id: int,
    body: ShareRequest,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """Replace the access list for a report.
    If user_ids is empty, access returns to default (department-level).
    Optionally publish the report at the same time."""
    report = session.get(WeeklyReport, report_id)
    if not report:
        raise HTTPException(404, "Report not found")
    # Only owner or admin can change sharing
    if current_user.role != UserRole.admin and report.user_id != current_user.id:
        raise HTTPException(403, "Only the report owner or an admin can change access")

    # Delete existing shares
    old_shares = session.exec(
        select(ReportShare).where(ReportShare.report_id == report_id)
    ).all()
    for s in old_shares:
        session.delete(s)

    # Insert new shares
    for uid in body.user_ids:
        # Validate user exists
        if not session.get(User, uid):
            raise HTTPException(400, f"User {uid} not found")
        session.add(ReportShare(report_id=report_id, user_id=uid))

    # Optionally publish
    if body.publish:
        report.status = ReportStatus.published
        from datetime import datetime as _dt
        report.updated_at = _dt.utcnow()

    session.commit()
    log_action(session, current_user.id, "SHARE", "report", report_id,
               f"shared_with={body.user_ids}, published={body.publish}")
    return _enrich_report(report, session)
