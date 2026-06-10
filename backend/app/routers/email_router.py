from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from fastapi.responses import StreamingResponse
from io import BytesIO
from sqlmodel import Session, select
from typing import List, Optional
from pydantic import BaseModel, EmailStr

from app.auth import get_current_user
from app.database import get_session
from app.models import User, WeeklyReport, Department, ReportNote, ReportImage, UserRole
from app.services.pdf_service import generate_pdf
from app.services.email_service import send_weekly_report_email, generate_eml_bytes
from app.utils.audit import log_action

router = APIRouter(prefix="/api/email", tags=["email"])


class EmailRequest(BaseModel):
    report_ids: List[int]
    to_addresses: List[EmailStr]
    cc_addresses: List[EmailStr] = []


@router.post("/send")
async def send_email(
    req: EmailRequest,
    background_tasks: BackgroundTasks,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    if not req.report_ids:
        raise HTTPException(400, "No reports selected")
    if not req.to_addresses:
        raise HTTPException(400, "No recipients specified")

    reports_data = []
    weekend_dates = set()

    for report_id in req.report_ids:
        report = session.get(WeeklyReport, report_id)
        if not report:
            raise HTTPException(404, f"Report {report_id} not found")

        # Check access
        if current_user.role != UserRole.admin and report.user_id != current_user.id:
            raise HTTPException(403, f"Access denied to report {report_id}")

        dept = session.get(Department, report.department_id)
        user = session.get(User, report.user_id)
        notes = session.exec(
            select(ReportNote).where(ReportNote.report_id == report_id)
            .order_by(ReportNote.order_index)
        ).all()
        images = session.exec(
            select(ReportImage).where(ReportImage.report_id == report_id)
            .order_by(ReportImage.order_index)
        ).all()

        weekend_dates.add(str(report.weekend_date))
        reports_data.append({
            "department_name": dept.name if dept else "Unknown",
            "department_code": dept.short_code if dept else "N/A",
            "weekend_date": str(report.weekend_date),
            "user_name": user.username if user else "Unknown",
            "notes": [{"id": n.id, "content": n.content, "created_at": n.created_at,
                       "order_index": n.order_index} for n in notes],
            "images": [{"file_path": img.file_path, "caption": img.caption,
                        "original_name": img.original_name,
                        "order_index": img.order_index,
                        "note_id": img.note_id} for img in images],
        })

    date_label = sorted(weekend_dates)[-1] if weekend_dates else "N/A"

    # Generate PDF
    pdf_bytes = generate_pdf(reports_data)

    def _send():
        send_weekly_report_email(
            to_addresses=[str(a) for a in req.to_addresses],
            reports_data=reports_data,
            weekend_date=date_label,
            pdf_bytes=pdf_bytes,
            cc_addresses=[str(a) for a in req.cc_addresses],
        )

    background_tasks.add_task(_send)
    log_action(session, current_user.id, "SEND_EMAIL", "reports",
               details=f"To: {req.to_addresses}, Reports: {req.report_ids}")

    return {"message": f"Email is being sent to {len(req.to_addresses)} recipient(s)"}


class EmlRequest(BaseModel):
    report_ids: List[int]
    to_addresses: List[str]
    cc_addresses: List[str] = []
    subject: Optional[str] = None


def _build_reports_data(report_ids: List[int], session: Session,
                        current_user: User, require_id: bool = True) -> tuple:
    """Helper: load reports, return (reports_data list, date_label str)."""
    reports_data = []
    weekend_dates: set = set()
    for report_id in report_ids:
        report = session.get(WeeklyReport, report_id)
        if not report:
            raise HTTPException(404, f"Report {report_id} not found")
        if current_user.role != UserRole.admin and report.user_id != current_user.id:
            raise HTTPException(403, f"Access denied to report {report_id}")

        dept   = session.get(Department, report.department_id)
        user   = session.get(User, report.user_id)
        notes  = session.exec(
            select(ReportNote).where(ReportNote.report_id == report_id)
            .order_by(ReportNote.order_index)
        ).all()
        images = session.exec(
            select(ReportImage).where(ReportImage.report_id == report_id)
            .order_by(ReportImage.order_index)
        ).all()

        weekend_dates.add(str(report.weekend_date))
        entry = {
            "department_name": dept.name if dept else "Unknown",
            "department_code": dept.short_code if dept else "N/A",
            "weekend_date":    str(report.weekend_date),
            "user_name":       user.username if user else "Unknown",
            "notes":  [{"id": n.id, "content": n.content,
                        "order_index": n.order_index,
                        "created_at": n.created_at} for n in notes],
            "images": [{"id": img.id, "file_path": img.file_path,
                        "caption": img.caption, "original_name": img.original_name,
                        "order_index": img.order_index, "note_id": img.note_id}
                       for img in images],
        }
        reports_data.append(entry)

    date_label = sorted(weekend_dates)[-1] if weekend_dates else "N/A"
    return reports_data, date_label


@router.post("/generate-eml")
def generate_eml(
    req: EmlRequest,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """
    Generate a .eml file (MIME email) with:
      - Outlook-compatible HTML body (table layout)
      - Inline CID-embedded images directly below each linked report point
      - PDF attached
    Returns the .eml as a file download — user double-clicks to open in Outlook.
    """
    if not req.report_ids:
        raise HTTPException(400, "No reports selected")

    reports_data, date_label = _build_reports_data(req.report_ids, session, current_user)

    # Generate PDF first
    try:
        pdf_bytes = generate_pdf(reports_data)
    except Exception as exc:
        raise HTTPException(500, f"PDF generation failed: {exc}") from exc

    # Generate EML
    try:
        eml_bytes = generate_eml_bytes(
            to_addresses=req.to_addresses,
            cc_addresses=req.cc_addresses,
            reports_data=reports_data,
            weekend_date=date_label,
            pdf_bytes=pdf_bytes,
            subject_override=req.subject,
        )
    except Exception as exc:
        raise HTTPException(500, f"EML generation failed: {exc}") from exc

    safe_date = date_label.replace(" ", "_")
    filename  = f"SPR_Weekly_Report_{safe_date}.eml"

    log_action(session, current_user.id, "GENERATE_EML", "reports",
               details=f"Reports: {req.report_ids}, To: {req.to_addresses}")

    return StreamingResponse(
        BytesIO(eml_bytes),
        media_type="message/rfc822",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )


@router.post("/bulk-pdf")
def bulk_pdf(
    report_ids: List[int],
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    from fastapi.responses import StreamingResponse
    from io import BytesIO

    reports_data = []
    for report_id in report_ids:
        report = session.get(WeeklyReport, report_id)
        if not report:
            raise HTTPException(404, f"Report {report_id} not found")
        if current_user.role != UserRole.admin and report.user_id != current_user.id:
            raise HTTPException(403, f"Access denied to report {report_id}")

        dept = session.get(Department, report.department_id)
        user = session.get(User, report.user_id)
        notes = session.exec(
            select(ReportNote).where(ReportNote.report_id == report_id)
        ).all()
        images = session.exec(
            select(ReportImage).where(ReportImage.report_id == report_id)
        ).all()

        reports_data.append({
            "department_name": dept.name if dept else "Unknown",
            "department_code": dept.short_code if dept else "N/A",
            "weekend_date": str(report.weekend_date),
            "user_name": user.username if user else "Unknown",
            "notes": [{"id": n.id, "content": n.content, "created_at": n.created_at,
                       "order_index": n.order_index} for n in notes],
            "images": [{"id": img.id, "file_path": img.file_path, "caption": img.caption,
                        "original_name": img.original_name, "order_index": img.order_index,
                        "note_id": img.note_id} for img in images],
        })

    pdf_bytes = generate_pdf(reports_data)
    filename = "SPR_Consolidated_Report.pdf"
    return StreamingResponse(
        BytesIO(pdf_bytes),
        media_type="application/pdf",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )
