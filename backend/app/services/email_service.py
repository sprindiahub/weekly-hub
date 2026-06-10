"""
EML generator for SPR Weekly Reports.

Produces a standards-compliant MIME email (.eml) that:
  - Opens directly in Outlook (double-click)
  - Embeds every report image inline via CID references
  - Uses an Outlook-safe, fully table-based HTML layout
  - Attaches the PDF report

Structure:
  multipart/mixed
    └── multipart/related
          ├── text/html  (HTML body with <img src="cid:…">)
          ├── image/*    (each report image, Content-ID: <imgXXX@spr>)
          └── …
    └── application/pdf  (PDF attachment)
"""
import logging
import mimetypes
import smtplib
import uuid
from email import encoders
from email.mime.application import MIMEApplication
from email.mime.image import MIMEImage
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from pathlib import Path
from typing import List, Optional

from app.config import settings

logger = logging.getLogger(__name__)

# ── Outlook-safe colour palette ────────────────────────────────────────────────
NAVY    = "#1e3a5f"
BLUE    = "#2563eb"
LBLUE   = "#dbeafe"
GRAY1   = "#f3f4f6"
GRAY2   = "#e5e7eb"
GRAY5   = "#6b7280"
GRAY8   = "#1f2937"
WHITE   = "#ffffff"
GREEN   = "#059669"


# ─────────────────────────────────────────────────────────────────────────────
# HTML builder  (Outlook-compatible — table-based only, no flexbox/grid)
# ─────────────────────────────────────────────────────────────────────────────

def _html_head() -> str:
    return """<!DOCTYPE html>
<html xmlns:v="urn:schemas-microsoft-com:vml"
      xmlns:o="urn:schemas-microsoft-com:office:office"
      xmlns:w="urn:schemas-microsoft-com:office:word"
      xmlns:m="http://schemas.microsoft.com/office/2004/12/omml"
      xmlns="http://www.w3.org/TR/REC-html40">
<head>
<meta http-equiv="Content-Type" content="text/html; charset=utf-8">
<!--[if gte mso 9]>
<xml><o:OfficeDocumentSettings>
  <o:AllowPNG/>
  <o:PixelsPerInch>96</o:PixelsPerInch>
</o:OfficeDocumentSettings></xml>
<![endif]-->
<style>
  body, table, td, p { font-family: Calibri, Arial, sans-serif; }
  p { margin: 0; padding: 0; }
  .ExternalClass { width: 100%; }
</style>
</head>
<body style="margin:0;padding:0;background-color:#f3f4f6;">"""


def _html_foot() -> str:
    return "</body></html>"


def _cell(content: str, bg: str = WHITE, pad: str = "10px 12px",
          align: str = "left", valign: str = "top",
          extra: str = "", colspan: int = 1) -> str:
    cs = f' colspan="{colspan}"' if colspan > 1 else ""
    return (f'<td{cs} bgcolor="{bg}" align="{align}" valign="{valign}"'
            f' style="background-color:{bg};padding:{pad};{extra}">'
            f'{content}</td>')


def _row(cells: str, bg: str = WHITE) -> str:
    return f'<tr bgcolor="{bg}" style="background-color:{bg};">{cells}</tr>'


def _divider_row() -> str:
    return (f'<tr><td colspan="2" style="padding:0;height:1px;line-height:1px;">'
            f'<table width="100%" cellpadding="0" cellspacing="0" border="0">'
            f'<tr><td bgcolor="{GRAY2}" style="background-color:{GRAY2};'
            f'height:1px;font-size:1px;line-height:1px;">&nbsp;</td></tr>'
            f'</table></td></tr>')


def _dept_block(r: dict, cid_map: dict) -> str:
    """
    Build the HTML table for one department.
    cid_map: { image_id (int) -> cid_string }  e.g. { 5: "img005@spr" }
    """
    dept      = r.get("department_name", "—")
    user      = r.get("user_name", "—")
    week_date = r.get("weekend_date", "—")
    notes     = sorted(r.get("notes", []), key=lambda x: x.get("order_index", 0))
    images    = r.get("images", [])

    # Partition images by note
    by_note: dict = {}
    loose: list = []
    for img in images:
        nid = img.get("note_id")
        if nid:
            by_note.setdefault(nid, []).append(img)
        else:
            loose.append(img)

    # ── Meta strip ────────────────────────────────────────────────────────────
    meta = f"""
<!-- DEPT HEADER -->
<table width="600" cellpadding="0" cellspacing="0" border="0"
       style="border-collapse:collapse;width:600px;border:1px solid #93c5fd;">
  <tr>
    <td width="200" bgcolor="{LBLUE}"
        style="background-color:{LBLUE};padding:10px 14px;
               border-right:1px solid #93c5fd;vertical-align:top;">
      <p style="font-size:10px;color:{GRAY5};font-weight:bold;
                text-transform:uppercase;margin-bottom:3px;">Department</p>
      <p style="font-size:14px;font-weight:bold;color:{NAVY};">{dept}</p>
    </td>
    <td width="200" bgcolor="{LBLUE}"
        style="background-color:{LBLUE};padding:10px 14px;
               border-right:1px solid #93c5fd;vertical-align:top;">
      <p style="font-size:10px;color:{GRAY5};font-weight:bold;
                text-transform:uppercase;margin-bottom:3px;">Prepared By</p>
      <p style="font-size:14px;font-weight:bold;color:{NAVY};">{user}</p>
    </td>
    <td width="200" bgcolor="{LBLUE}"
        style="background-color:{LBLUE};padding:10px 14px;vertical-align:top;">
      <p style="font-size:10px;color:{GRAY5};font-weight:bold;
                text-transform:uppercase;margin-bottom:3px;">Week Date</p>
      <p style="font-size:14px;font-weight:bold;color:{NAVY};">{week_date}</p>
    </td>
  </tr>
</table>
<table width="600" cellpadding="0" cellspacing="0" border="0"
       style="border-collapse:collapse;width:600px;height:6px;">
  <tr><td bgcolor="{NAVY}" style="background-color:{NAVY};height:3px;font-size:1px;line-height:1px;">&nbsp;</td></tr>
</table>"""

    # ── Report details table ──────────────────────────────────────────────────
    details = f"""
<!-- REPORT TABLE -->
<table width="600" cellpadding="0" cellspacing="0" border="0"
       style="border-collapse:collapse;width:600px;
              border-left:1px solid {GRAY2};border-right:1px solid {GRAY2};
              border-bottom:1px solid {GRAY2};">
  <!-- Table header -->
  <tr bgcolor="{NAVY}" style="background-color:{NAVY};">
    <td width="44" bgcolor="{NAVY}"
        style="background-color:{NAVY};padding:9px 10px;text-align:center;
               border-right:1px solid #2d4f7a;">
      <p style="color:{WHITE};font-size:11px;font-weight:bold;margin:0;">#</p>
    </td>
    <td bgcolor="{NAVY}"
        style="background-color:{NAVY};padding:9px 14px;">
      <p style="color:{WHITE};font-size:11px;font-weight:bold;margin:0;">Report Details</p>
    </td>
  </tr>"""

    if not notes:
        details += f"""
  <tr bgcolor="{WHITE}">
    <td colspan="2" bgcolor="{WHITE}"
        style="background-color:{WHITE};padding:16px;text-align:center;">
      <p style="color:{GRAY5};font-style:italic;font-size:12px;margin:0;">
        No activities recorded for this period.</p>
    </td>
  </tr>"""
    else:
        for i, note in enumerate(notes, 1):
            bg      = WHITE if i % 2 == 1 else GRAY1
            content = note["content"].replace("\n", "<br>")
            note_id = note.get("id")

            # ── Activity row ──────────────────────────────────────────────
            details += f"""
  <!-- Row {i} -->
  <tr bgcolor="{bg}" style="background-color:{bg};">
    <td width="44" bgcolor="{bg}"
        style="background-color:{bg};padding:11px 10px;text-align:center;
               vertical-align:top;border-right:1px solid {GRAY2};
               border-top:1px solid {GRAY2};">
      <p style="color:{BLUE};font-size:14px;font-weight:bold;margin:0;">{i}</p>
    </td>
    <td bgcolor="{bg}"
        style="background-color:{bg};padding:11px 14px;vertical-align:top;
               border-top:1px solid {GRAY2};">
      <p style="color:{GRAY8};font-size:13px;line-height:1.55;margin:0;">{content}</p>
    </td>
  </tr>"""

            # ── Linked image rows ─────────────────────────────────────────
            linked = by_note.get(note_id, [])
            for img_data in sorted(linked, key=lambda x: x.get("order_index", 0)):
                img_id  = img_data.get("id")
                cid     = cid_map.get(img_id)
                cap     = img_data.get("caption") or img_data.get("original_name", "")
                fp      = img_data.get("file_path", "")
                iw, ih  = _image_display_size(fp, max_w=520)

                if cid:
                    details += f"""
  <!-- Image for row {i} -->
  <tr bgcolor="{bg}" style="background-color:{bg};">
    <td colspan="2" bgcolor="{bg}"
        style="background-color:{bg};padding:10px 14px 14px 58px;
               border-top:1px solid {GRAY2};">
      <!--[if mso]>
      <table width="{iw}" cellpadding="0" cellspacing="0"><tr><td>
      <![endif]-->
      <img src="cid:{cid}" width="{iw}" height="{ih}"
           alt="{cap}"
           style="display:block;border:1px solid {GRAY2};max-width:100%;height:auto;">
      <!--[if mso]></td></tr></table><![endif]-->
      <p style="font-size:10px;color:{GRAY5};font-style:italic;
                margin:4px 0 0 0;text-align:center;">{cap}</p>
    </td>
  </tr>"""
                else:
                    # Image file missing — show placeholder
                    details += f"""
  <tr bgcolor="{bg}">
    <td colspan="2" bgcolor="{bg}"
        style="background-color:{bg};padding:6px 14px 10px 58px;">
      <p style="font-size:11px;color:{GRAY5};font-style:italic;margin:0;">
        📎 {cap}</p>
    </td>
  </tr>"""

        # ── Loose images at bottom ────────────────────────────────────────
        if loose:
            details += f"""
  <!-- Additional attachments header -->
  <tr bgcolor="{LBLUE}" style="background-color:{LBLUE};">
    <td colspan="2" bgcolor="{LBLUE}"
        style="background-color:{LBLUE};padding:9px 14px;
               border-top:2px solid #93c5fd;">
      <p style="font-size:11px;font-weight:bold;color:{NAVY};margin:0;">
        Additional Attachments</p>
    </td>
  </tr>"""
            for img_data in sorted(loose, key=lambda x: x.get("order_index", 0)):
                img_id = img_data.get("id")
                cid    = cid_map.get(img_id)
                cap    = img_data.get("caption") or img_data.get("original_name", "")
                fp     = img_data.get("file_path", "")
                iw, ih = _image_display_size(fp, max_w=540)

                if cid:
                    details += f"""
  <tr bgcolor="{GRAY1}" style="background-color:{GRAY1};">
    <td colspan="2" bgcolor="{GRAY1}"
        style="background-color:{GRAY1};padding:12px 14px;
               text-align:center;border-top:1px solid {GRAY2};">
      <!--[if mso]>
      <table width="{iw}" cellpadding="0" cellspacing="0"><tr><td>
      <![endif]-->
      <img src="cid:{cid}" width="{iw}" height="{ih}"
           alt="{cap}"
           style="display:block;margin:0 auto;border:1px solid {GRAY2};
                  max-width:100%;height:auto;">
      <!--[if mso]></td></tr></table><![endif]-->
      <p style="font-size:10px;color:{GRAY5};font-style:italic;
                margin:4px 0 0 0;">{cap}</p>
    </td>
  </tr>"""

    details += "\n</table>"
    return meta + "\n" + details


def _image_display_size(file_path: str, max_w: int = 520) -> tuple:
    """Return (display_w, display_h) respecting max_w. Falls back to (max_w, 300)."""
    try:
        from PIL import Image as PILImage
        with PILImage.open(file_path) as im:
            iw, ih = im.size
            if iw <= 0:
                return max_w, 300
            ratio = min(max_w / iw, 1.0)
            return int(iw * ratio), int(ih * ratio)
    except Exception:
        return max_w, 300


def build_html_body(reports_data: list, weekend_date: str, cid_map: dict) -> str:
    """Build the full HTML email body."""
    from datetime import datetime
    gen_time = datetime.utcnow().strftime("%d %b %Y, %H:%M UTC")
    total_act  = sum(len(r.get("notes", [])) for r in reports_data)
    total_img  = sum(len(r.get("images", [])) for r in reports_data)

    html = _html_head()
    html += f"""
<!-- OUTER WRAPPER -->
<table width="100%" cellpadding="0" cellspacing="0" border="0"
       style="background-color:#f3f4f6;border-collapse:collapse;">
  <tr>
    <td align="center" style="padding:24px 8px;">

      <!-- INNER CONTAINER 600px -->
      <table width="600" cellpadding="0" cellspacing="0" border="0"
             style="border-collapse:collapse;width:600px;">

        <!-- ═══ MASTHEAD ═══ -->
        <tr>
          <td bgcolor="{NAVY}" align="center"
              style="background-color:{NAVY};padding:24px 28px 20px;">
            <p style="font-size:22px;font-weight:bold;color:{WHITE};
                      letter-spacing:0.5px;margin:0;">WEEKLY REPORT</p>
            <p style="font-size:11px;color:#bfdbfe;margin:6px 0 0;">
              Generated by SPR Weekly Report Management Hub</p>
            <table cellpadding="0" cellspacing="0" border="0"
                   style="margin:12px auto 0;">
              <tr>
                <td bgcolor="#2d4f7a" align="center"
                    style="background-color:#2d4f7a;padding:5px 18px;">
                  <p style="color:{WHITE};font-size:12px;margin:0;">
                    Week Ending: <b>{weekend_date}</b></p>
                </td>
              </tr>
            </table>
          </td>
        </tr>

        <!-- ═══ SUMMARY STRIP ═══ -->
        <tr>
          <td style="padding:0;">
            <table width="600" cellpadding="0" cellspacing="0" border="0"
                   style="border-collapse:collapse;width:600px;">
              <tr>
                <td width="200" bgcolor="{WHITE}" align="center"
                    style="background-color:{WHITE};padding:14px 8px;
                           border:1px solid {GRAY2};border-right:none;">
                  <p style="font-size:26px;font-weight:bold;color:{NAVY};margin:0;">
                    {len(reports_data)}</p>
                  <p style="font-size:11px;color:{GRAY5};margin:2px 0 0;">Department(s)</p>
                </td>
                <td width="200" bgcolor="{WHITE}" align="center"
                    style="background-color:{WHITE};padding:14px 8px;
                           border:1px solid {GRAY2};border-right:none;">
                  <p style="font-size:26px;font-weight:bold;color:{BLUE};margin:0;">
                    {total_act}</p>
                  <p style="font-size:11px;color:{GRAY5};margin:2px 0 0;">Total Activities</p>
                </td>
                <td width="200" bgcolor="{WHITE}" align="center"
                    style="background-color:{WHITE};padding:14px 8px;
                           border:1px solid {GRAY2};">
                  <p style="font-size:26px;font-weight:bold;color:{GREEN};margin:0;">
                    {total_img}</p>
                  <p style="font-size:11px;color:{GRAY5};margin:2px 0 0;">Attachments</p>
                </td>
              </tr>
            </table>
          </td>
        </tr>

        <!-- ═══ SPACER ═══ -->
        <tr><td style="height:16px;font-size:1px;line-height:1px;">&nbsp;</td></tr>

        <!-- ═══ DEPARTMENT SECTIONS ═══ -->"""

    for i, r in enumerate(reports_data):
        if i > 0:
            html += f"""
        <!-- DEPT DIVIDER -->
        <tr>
          <td align="center" style="padding:12px 0;">
            <table width="560" cellpadding="0" cellspacing="0" border="0">
              <tr>
                <td bgcolor="{GRAY2}"
                    style="background-color:{GRAY2};height:1px;
                           font-size:1px;line-height:1px;">&nbsp;</td>
              </tr>
            </table>
          </td>
        </tr>"""

        html += f"""
        <tr>
          <td style="padding:0;">
            {_dept_block(r, cid_map)}
          </td>
        </tr>
        <tr><td style="height:10px;font-size:1px;line-height:1px;">&nbsp;</td></tr>"""

    html += f"""
        <!-- ═══ FOOTER ═══ -->
        <tr>
          <td align="center"
              style="padding:16px 20px;border-top:1px solid {GRAY2};">
            <p style="font-size:11px;color:{GRAY5};margin:0;">
              This report was generated from SPR Weekly Report Management Hub
              on {gen_time}.<br>
              Full report with images is also attached as a PDF file.
            </p>
          </td>
        </tr>

      </table><!-- /inner container -->
    </td>
  </tr>
</table><!-- /outer wrapper -->"""

    html += _html_foot()
    return html


# ─────────────────────────────────────────────────────────────────────────────
# EML file generator
# ─────────────────────────────────────────────────────────────────────────────

def generate_eml_bytes(
    to_addresses: List[str],
    cc_addresses: List[str],
    reports_data: list,
    weekend_date: str,
    pdf_bytes: Optional[bytes] = None,
    subject_override: Optional[str] = None,
) -> bytes:
    """
    Build a .eml file (RFC 2822 MIME message) that:
      - Has pre-filled To / CC / Subject
      - Embeds every report image as a CID inline attachment
      - Attaches the PDF
    Returns the raw bytes of the .eml file.
    """
    subject = subject_override or f"Weekly Report — Week Ending {weekend_date}"

    # ── Collect all images that exist on disk ──────────────────────────────
    # cid_map: { image_id (int) -> "imgXXX@spr.hub" }
    cid_map: dict = {}
    image_parts: list = []  # list of (cid, file_path, mime_type)

    for r in reports_data:
        for img in r.get("images", []):
            img_id = img.get("id")
            fp     = img.get("file_path", "")
            if img_id and fp and Path(fp).exists():
                cid = f"img{img_id:04d}@spr.hub"
                cid_map[img_id] = cid
                mime_type, _ = mimetypes.guess_type(fp)
                mime_type = mime_type or "image/jpeg"
                image_parts.append((cid, fp, mime_type))

    # ── Build HTML body ────────────────────────────────────────────────────
    html_body = build_html_body(reports_data, weekend_date, cid_map)

    # ── Assemble MIME structure ────────────────────────────────────────────
    # multipart/mixed  (outer — holds related + pdf)
    outer = MIMEMultipart("mixed")
    outer["Subject"] = subject
    outer["From"]    = f"{settings.SMTP_FROM_NAME} <{settings.SMTP_FROM_EMAIL or 'noreply@spr.hub'}>"
    outer["To"]      = "; ".join(to_addresses)
    if cc_addresses:
        outer["Cc"] = "; ".join(cc_addresses)

    # multipart/related  (HTML + inline images)
    related = MIMEMultipart("related", type="text/html")
    related.attach(MIMEText(html_body, "html", "utf-8"))

    for cid, fp, mime_type in image_parts:
        main_type, sub_type = mime_type.split("/", 1)
        with open(fp, "rb") as f:
            img_bytes = f.read()
        img_part = MIMEImage(img_bytes, _subtype=sub_type)
        img_part.add_header("Content-ID", f"<{cid}>")
        img_part.add_header("Content-Disposition", "inline",
                            filename=Path(fp).name)
        related.attach(img_part)

    outer.attach(related)

    # PDF attachment
    if pdf_bytes:
        safe_date = weekend_date.replace(" ", "_")
        pdf_part  = MIMEApplication(pdf_bytes, _subtype="pdf")
        pdf_part.add_header("Content-Disposition", "attachment",
                            filename=f"SPR_Weekly_Report_{safe_date}.pdf")
        outer.attach(pdf_part)

    return outer.as_bytes()


# ─────────────────────────────────────────────────────────────────────────────
# Legacy SMTP sender (kept for optional direct-send if SMTP is configured)
# ─────────────────────────────────────────────────────────────────────────────

def send_weekly_report_email(
    to_addresses: List[str],
    reports_data: list,
    weekend_date: str,
    pdf_bytes: Optional[bytes] = None,
    cc_addresses: Optional[List[str]] = None,
    subject_override: Optional[str] = None,
) -> bool:
    if not settings.SMTP_USERNAME:
        logger.warning("SMTP not configured — use EML download instead")
        return False
    try:
        eml = generate_eml_bytes(
            to_addresses=to_addresses,
            cc_addresses=cc_addresses or [],
            reports_data=reports_data,
            weekend_date=weekend_date,
            pdf_bytes=pdf_bytes,
            subject_override=subject_override,
        )
        from email import message_from_bytes
        msg = message_from_bytes(eml)
        all_rcpt = to_addresses + (cc_addresses or [])
        with smtplib.SMTP(settings.SMTP_HOST, settings.SMTP_PORT) as srv:
            srv.starttls()
            srv.login(settings.SMTP_USERNAME, settings.SMTP_PASSWORD)
            srv.sendmail(settings.SMTP_FROM_EMAIL, all_rcpt, eml)
        logger.info("Email sent to %s", to_addresses)
        return True
    except Exception as e:
        logger.error("Email send failed: %s", e)
        raise RuntimeError(str(e))
