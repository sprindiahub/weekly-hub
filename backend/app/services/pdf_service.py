"""
SPR India — Weekly Activity Report PDF Generator
Brand: Maroon #4d0e38 | Gold #c9a84c | Warm neutrals
"""
from io import BytesIO
from datetime import datetime
from pathlib import Path

from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle
from reportlab.lib.units import cm
from reportlab.lib.enums import TA_CENTER, TA_LEFT, TA_RIGHT
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle,
    Image as RLImage, PageBreak,
)
from reportlab.pdfgen import canvas as pdfcanvas

# ── SPR India Brand palette ────────────────────────────────────────────────────
MAROON       = colors.HexColor("#4d0e38")   # primary brand
MAROON_DARK  = colors.HexColor("#3d0b2d")   # darker header
MAROON_LIGHT = colors.HexColor("#f9f0f5")   # tinted row bg
GOLD         = colors.HexColor("#c9a84c")   # accent
GOLD_LIGHT   = colors.HexColor("#fdf6e3")   # gold tint for meta block
GOLD_BORDER  = colors.HexColor("#e8d090")   # gold border
WARM_50      = colors.HexColor("#faf9f8")   # alt row
WARM_100     = colors.HexColor("#f4f2f0")   # light bg
WARM_200     = colors.HexColor("#ece8e5")   # divider / border
WARM_500     = colors.HexColor("#a89f98")   # muted text
WARM_800     = colors.HexColor("#1a1512")   # primary text
WHITE        = colors.white

PAGE_W, PAGE_H = A4
L_MARGIN = R_MARGIN = 1.8 * cm
T_MARGIN = 2.0 * cm
B_MARGIN = 2.6 * cm
CONTENT_W = PAGE_W - L_MARGIN - R_MARGIN


# ── Paragraph styles ───────────────────────────────────────────────────────────
def _S():
    return {
        # Cover / document header
        "brand_name":  ParagraphStyle("BN", fontName="Helvetica-Bold",  fontSize=20,
                                      textColor=WHITE, alignment=TA_CENTER, spaceAfter=2),
        "brand_tag":   ParagraphStyle("BT", fontName="Helvetica",       fontSize=9,
                                      textColor=colors.HexColor("#e8c880"), alignment=TA_CENTER),
        "doc_title":   ParagraphStyle("DT", fontName="Helvetica-Bold",  fontSize=11,
                                      textColor=GOLD, alignment=TA_CENTER, spaceBefore=4),

        # Meta block (dept / prepared by / week date)
        "meta_lbl":    ParagraphStyle("ML", fontName="Helvetica",       fontSize=7,
                                      textColor=WARM_500,
                                      leading=10, spaceAfter=2),
        "meta_val":    ParagraphStyle("MV", fontName="Helvetica-Bold",  fontSize=10,
                                      textColor=WARM_800, leading=13),

        # Table header
        "tbl_hdr":     ParagraphStyle("TH", fontName="Helvetica-Bold",  fontSize=9,
                                      textColor=WHITE),
        # Row number
        "num":         ParagraphStyle("NUM", fontName="Helvetica-Bold", fontSize=11,
                                      textColor=GOLD, alignment=TA_CENTER),
        # Body text
        "body":        ParagraphStyle("BODY", fontName="Helvetica",     fontSize=10,
                                      textColor=WARM_800, leading=15),
        # Image caption
        "caption":     ParagraphStyle("CAP", fontName="Helvetica-Oblique", fontSize=8,
                                      textColor=WARM_500, alignment=TA_CENTER),
        # TOC row
        "toc_body":    ParagraphStyle("TOC", fontName="Helvetica",      fontSize=9,
                                      textColor=WARM_800, leading=14),
        "toc_code":    ParagraphStyle("TC",  fontName="Helvetica-Bold", fontSize=8,
                                      textColor=MAROON),
        # Footer
        "footer":      ParagraphStyle("FT",  fontName="Helvetica",      fontSize=7.5,
                                      textColor=WARM_500),
    }


# ── Canvas with SPR India header & footer on every page ───────────────────────
class _SPRCanvas(pdfcanvas.Canvas):
    def __init__(self, *a, **kw):
        super().__init__(*a, **kw)
        self._pages: list = []

    def showPage(self):
        self._pages.append(dict(self.__dict__))
        self._startPage()

    def save(self):
        total = len(self._pages)
        for i, st in enumerate(self._pages, 1):
            self.__dict__.update(st)
            self._draw_header()
            self._draw_footer(i, total)
            pdfcanvas.Canvas.showPage(self)
        pdfcanvas.Canvas.save(self)

    def _draw_header(self):
        """Thin gold top bar on every page."""
        self.saveState()
        self.setFillColor(MAROON)
        self.rect(0, PAGE_H - 0.55 * cm, PAGE_W, 0.55 * cm, fill=1, stroke=0)
        self.setFillColor(GOLD)
        self.rect(0, PAGE_H - 0.70 * cm, PAGE_W, 0.15 * cm, fill=1, stroke=0)
        # "SPR INDIA" text on top bar
        self.setFont("Helvetica-Bold", 8)
        self.setFillColor(WHITE)
        self.drawString(L_MARGIN, PAGE_H - 0.40 * cm, "SPR INDIA")
        self.setFont("Helvetica", 7)
        self.setFillColor(colors.HexColor("#e8c880"))
        self.drawRightString(PAGE_W - R_MARGIN, PAGE_H - 0.40 * cm,
                             "WEEKLY ACTIVITY REPORT")
        self.restoreState()

    def _draw_footer(self, num: int, total: int):
        """Gold rule + page info at bottom."""
        self.saveState()
        # Gold rule
        self.setStrokeColor(GOLD)
        self.setLineWidth(0.6)
        self.line(L_MARGIN, 1.8 * cm, PAGE_W - R_MARGIN, 1.8 * cm)
        # Thin maroon rule below gold
        self.setStrokeColor(MAROON)
        self.setLineWidth(0.3)
        self.line(L_MARGIN, 1.65 * cm, PAGE_W - R_MARGIN, 1.65 * cm)

        gen = datetime.utcnow().strftime("%d %b %Y, %H:%M UTC")
        self.setFont("Helvetica", 7.5)
        self.setFillColor(WARM_500)
        self.drawString(L_MARGIN, 1.35 * cm,
                        f"SPR India — Weekly Activity Report  |  Generated: {gen}")
        self.setFillColor(MAROON)
        self.setFont("Helvetica-Bold", 7.5)
        self.drawRightString(PAGE_W - R_MARGIN, 1.35 * cm, f"Page {num} / {total}")
        self.restoreState()


# ── Helper: load image ────────────────────────────────────────────────────────
def _load_image(fp: str, max_w: float, max_h: float):
    try:
        p = Path(fp)
        if not p.exists():
            return None
        img = RLImage(str(p))
        iw, ih = img.imageWidth, img.imageHeight
        if iw <= 0 or ih <= 0:
            return None
        ratio = min(max_w / iw, max_h / ih, 1.0)
        img.drawWidth  = iw * ratio
        img.drawHeight = ih * ratio
        img.hAlign = "CENTER"
        return img
    except Exception:
        return None


# ── Document header block (first page only) ───────────────────────────────────
def _doc_header(styles, is_combined: bool, weekend_date: str = ""):
    """Full-width maroon banner with SPR India name + gold accent bar."""

    title_text = "CONSOLIDATED WEEKLY ACTIVITY REPORT" if is_combined else "WEEKLY ACTIVITY REPORT"
    sub_text   = f"Reporting Period: Week ending {weekend_date}" if (weekend_date and not is_combined) else \
                 "Combined report — multiple departments" if is_combined else ""

    rows = [
        [Paragraph("SPR INDIA", styles["brand_name"])],
        [Paragraph(title_text, styles["doc_title"])],
    ]
    if sub_text:
        rows.append([Paragraph(sub_text, styles["brand_tag"])])

    tbl = Table(rows, colWidths=[CONTENT_W])
    tbl.setStyle(TableStyle([
        ("BACKGROUND",    (0, 0), (-1, -1), MAROON_DARK),
        ("ALIGN",         (0, 0), (-1, -1), "CENTER"),
        ("TOPPADDING",    (0, 0), (-1,  0), 16),
        ("TOPPADDING",    (0, 1), (-1, -1), 4),
        ("BOTTOMPADDING", (0,-1), (-1, -1), 16),
        ("BOTTOMPADDING", (0, 0), (-1, -2), 2),
    ]))

    # Gold accent strip below banner
    gold_strip = Table([[""]], colWidths=[CONTENT_W])
    gold_strip.setStyle(TableStyle([
        ("BACKGROUND",    (0, 0), (-1, -1), GOLD),
        ("TOPPADDING",    (0, 0), (-1, -1), 3),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 3),
    ]))

    return [tbl, gold_strip]


# ── Meta block: Dept / Prepared by / Week Date ────────────────────────────────
def _meta_block(dept: str, name: str, week_date: str, styles, dept_code: str = ""):
    display_dept = f"[{dept_code}]  {dept}" if dept_code else dept

    cell_w = CONTENT_W / 3
    cols = [
        [[Paragraph("DEPARTMENT",  styles["meta_lbl"])],
         [Paragraph(display_dept, styles["meta_val"])]],
        [[Paragraph("PREPARED BY", styles["meta_lbl"])],
         [Paragraph(name,          styles["meta_val"])]],
        [[Paragraph("WEEK ENDING", styles["meta_lbl"])],
         [Paragraph(week_date,     styles["meta_val"])]],
    ]
    data = [[
        Table(c, colWidths=[cell_w - 0.4 * cm]) for c in cols
    ]]
    tbl = Table(data, colWidths=[cell_w] * 3)
    tbl.setStyle(TableStyle([
        ("BACKGROUND",    (0, 0), (-1, -1), GOLD_LIGHT),
        ("BOX",           (0, 0), (-1, -1), 0.8, GOLD),
        ("INNERGRID",     (0, 0), (-1, -1), 0.3, GOLD_BORDER),
        ("TOPPADDING",    (0, 0), (-1, -1), 10),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 10),
        ("LEFTPADDING",   (0, 0), (-1, -1), 10),
        ("RIGHTPADDING",  (0, 0), (-1, -1), 8),
        ("VALIGN",        (0, 0), (-1, -1), "TOP"),
    ]))
    return tbl


# ── Report details table ──────────────────────────────────────────────────────
def _report_table(notes: list, images_by_note: dict, loose_images: list, styles):
    NUM_W     = 1.0 * cm
    BODY_W    = CONTENT_W - NUM_W
    IMG_MAX_W = BODY_W - 0.8 * cm
    IMG_MAX_H = 9 * cm

    table_data = [[
        Paragraph("#",              styles["tbl_hdr"]),
        Paragraph("Activity Details", styles["tbl_hdr"]),
    ]]
    style_cmds = [
        ("BACKGROUND",    (0, 0), (-1, 0), MAROON),
        ("TEXTCOLOR",     (0, 0), (-1, 0), WHITE),
        ("ALIGN",         (0, 0), (0, -1), "CENTER"),
        ("VALIGN",        (0, 0), (-1, -1), "TOP"),
        ("FONTSIZE",      (0, 0), (-1, -1), 9),
        ("TOPPADDING",    (0, 0), (-1, -1), 9),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 9),
        ("LEFTPADDING",   (0, 0), (-1, -1), 8),
        ("RIGHTPADDING",  (0, 0), (-1, -1), 8),
        ("LINEBELOW",     (0, 0), (-1, -1), 0.3, WARM_200),
        ("BOX",           (0, 0), (-1, -1), 0.6, WARM_200),
    ]

    for row_i, note in enumerate(notes, 1):
        row_idx = len(table_data)
        bg = WHITE if row_i % 2 == 1 else WARM_50
        style_cmds.append(("BACKGROUND", (0, row_idx), (-1, row_idx), bg))

        table_data.append([
            Paragraph(str(row_i), styles["num"]),
            Paragraph(note["content"].replace("\n", "<br/>"), styles["body"]),
        ])

        # Images linked to this note
        linked = images_by_note.get(note.get("id"), [])
        for img_data in sorted(linked, key=lambda x: x.get("order_index", 0)):
            img = _load_image(img_data.get("file_path", ""), IMG_MAX_W, IMG_MAX_H)
            if img:
                cap = img_data.get("caption") or img_data.get("original_name", "")
                img_row_idx = len(table_data)
                style_cmds.append(("BACKGROUND", (0, img_row_idx), (-1, img_row_idx), bg))
                style_cmds.append(("SPAN",       (0, img_row_idx), (-1, img_row_idx)))
                content = [img]
                if cap:
                    content.append(Paragraph(cap, styles["caption"]))
                inner = Table([[c] for c in content], colWidths=[CONTENT_W - 0.5 * cm])
                inner.setStyle(TableStyle([
                    ("ALIGN",  (0, 0), (-1, -1), "CENTER"),
                    ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
                ]))
                table_data.append([inner, ""])

    # Loose images — full-width section at bottom
    if loose_images:
        sep_idx = len(table_data)
        style_cmds.append(("SPAN",       (0, sep_idx), (-1, sep_idx)))
        style_cmds.append(("BACKGROUND", (0, sep_idx), (-1, sep_idx), MAROON_LIGHT))
        table_data.append([Paragraph("Supporting Attachments", styles["tbl_hdr"]), ""])
        style_cmds[-2] = ("BACKGROUND", (0, sep_idx), (-1, sep_idx), MAROON)

        for img_data in sorted(loose_images, key=lambda x: x.get("order_index", 0)):
            img = _load_image(img_data.get("file_path", ""), IMG_MAX_W, IMG_MAX_H)
            if img:
                cap = img_data.get("caption") or img_data.get("original_name", "")
                r_idx = len(table_data)
                style_cmds.append(("SPAN",       (0, r_idx), (-1, r_idx)))
                style_cmds.append(("BACKGROUND", (0, r_idx), (-1, r_idx), WARM_50))
                inner = Table(
                    [[img]] + ([[Paragraph(cap, styles["caption"])]] if cap else []),
                    colWidths=[CONTENT_W - 0.5 * cm],
                )
                inner.setStyle(TableStyle([("ALIGN", (0, 0), (-1, -1), "CENTER")]))
                table_data.append([inner, ""])

    tbl = Table(table_data, colWidths=[NUM_W, BODY_W], repeatRows=1)
    tbl.setStyle(TableStyle(style_cmds))
    return tbl


# ── TOC for combined reports ──────────────────────────────────────────────────
def _toc_table(reports_data: list, styles):
    hdr = [
        Paragraph("DEPT CODE",   styles["tbl_hdr"]),
        Paragraph("DEPARTMENT",  styles["tbl_hdr"]),
        Paragraph("PREPARED BY", styles["tbl_hdr"]),
        Paragraph("WEEK ENDING", styles["tbl_hdr"]),
        Paragraph("ACTIVITIES",  styles["tbl_hdr"]),
    ]
    rows = [hdr]
    for r in reports_data:
        rows.append([
            Paragraph(r.get("department_code", "—"), styles["toc_code"]),
            Paragraph(r.get("department_name", "—"), styles["toc_body"]),
            Paragraph(r.get("user_name",       "—"), styles["toc_body"]),
            Paragraph(r.get("weekend_date",    "—"), styles["toc_body"]),
            Paragraph(str(len(r.get("notes", []))), styles["toc_body"]),
        ])

    cw = CONTENT_W
    col_w = [cw * 0.12, cw * 0.32, cw * 0.25, cw * 0.20, cw * 0.11]
    tbl = Table(rows, colWidths=col_w)
    tbl.setStyle(TableStyle([
        ("BACKGROUND",    (0, 0), (-1, 0), MAROON),
        ("ROWBACKGROUNDS",(0, 1), (-1, -1), [WHITE, WARM_50]),
        ("GRID",          (0, 0), (-1, -1), 0.3, WARM_200),
        ("LINEBELOW",     (0, 0), (-1, 0), 1.5, GOLD),
        ("TOPPADDING",    (0, 0), (-1, -1), 8),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 8),
        ("LEFTPADDING",   (0, 0), (-1, -1), 8),
        ("FONTSIZE",      (0, 0), (-1, -1), 9),
        ("VALIGN",        (0, 0), (-1, -1), "MIDDLE"),
    ]))
    return tbl


# ── Section heading (per-dept divider in combined report) ────────────────────
def _dept_section_header(dept_name: str, dept_code: str, styles):
    label = f"[{dept_code}]  {dept_name}" if dept_code else dept_name
    tbl = Table(
        [[Paragraph(label, ParagraphStyle(
            "DSH", fontName="Helvetica-Bold", fontSize=10,
            textColor=WHITE, leftIndent=4,
        ))]],
        colWidths=[CONTENT_W],
    )
    tbl.setStyle(TableStyle([
        ("BACKGROUND",    (0, 0), (-1, -1), MAROON),
        ("LINEBELOW",     (0, 0), (-1, -1), 2, GOLD),
        ("TOPPADDING",    (0, 0), (-1, -1), 7),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 7),
        ("LEFTPADDING",   (0, 0), (-1, -1), 10),
    ]))
    return tbl


# ── Main entry point ───────────────────────────────────────────────────────────
def generate_pdf(reports_data: list) -> bytes:
    """
    reports_data: list of dicts:
        department_name  (str)
        department_code  (str)
        weekend_date     (str, e.g. "2026-06-07")
        user_name        (str)
        notes            list of {id, content, order_index}
        images           list of {file_path, caption, original_name, order_index, note_id}
    """
    buf    = BytesIO()
    is_combined = len(reports_data) > 1

    # Use the first report's weekend_date for single-report header
    first_date = reports_data[0].get("weekend_date", "") if reports_data else ""

    doc = SimpleDocTemplate(
        buf, pagesize=A4,
        leftMargin=L_MARGIN, rightMargin=R_MARGIN,
        topMargin=T_MARGIN + 0.7 * cm,   # leave room for our canvas header bar
        bottomMargin=B_MARGIN,
        title="SPR India — Weekly Activity Report",
        author="SPR India",
        subject="Weekly Activity Report",
    )
    styles = _S()
    elems  = []

    # ── Document banner ───────────────────────────────────────────────────
    for elem in _doc_header(styles, is_combined, first_date):
        elems.append(elem)
    elems.append(Spacer(1, 0.45 * cm))

    # ── TOC for combined reports ──────────────────────────────────────────
    if is_combined:
        toc_title = Table(
            [[Paragraph("CONTENTS", ParagraphStyle(
                "TOCH", fontName="Helvetica-Bold", fontSize=9,
                textColor=MAROON, spaceAfter=3,
            ))]],
            colWidths=[CONTENT_W],
        )
        toc_title.setStyle(TableStyle([
            ("LINEBELOW", (0, 0), (-1, -1), 1.5, GOLD),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
        ]))
        elems.append(toc_title)
        elems.append(Spacer(1, 0.15 * cm))
        elems.append(_toc_table(reports_data, styles))
        elems.append(Spacer(1, 0.5 * cm))

    # ── One section per department ────────────────────────────────────────
    for idx, r in enumerate(reports_data):
        if idx > 0:
            elems.append(PageBreak())

        dept_name  = r.get("department_name", "—")
        dept_code  = r.get("department_code", "")
        user_name  = r.get("user_name",  "—")
        week_date  = r.get("weekend_date", "—")
        notes      = sorted(r.get("notes",  []), key=lambda x: x.get("order_index", 0))
        images     = r.get("images", [])

        # For combined PDFs add a per-dept section heading
        if is_combined:
            elems.append(_dept_section_header(dept_name, dept_code, styles))
            elems.append(Spacer(1, 0.2 * cm))

        # Meta block
        elems.append(_meta_block(dept_name, user_name, week_date, styles, dept_code))
        elems.append(Spacer(1, 0.35 * cm))

        # Partition images: note-linked vs loose
        images_by_note: dict = {}
        loose: list = []
        for img in images:
            nid = img.get("note_id")
            if nid:
                images_by_note.setdefault(nid, []).append(img)
            else:
                loose.append(img)

        # Activity table
        if notes:
            elems.append(_report_table(notes, images_by_note, loose, styles))
        else:
            ph = Table(
                [[Paragraph("No activities recorded for this reporting period.", styles["body"])]],
                colWidths=[CONTENT_W],
            )
            ph.setStyle(TableStyle([
                ("BOX",           (0, 0), (-1, -1), 0.5, WARM_200),
                ("BACKGROUND",    (0, 0), (-1, -1), WARM_50),
                ("TOPPADDING",    (0, 0), (-1, -1), 18),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 18),
                ("ALIGN",         (0, 0), (-1, -1), "CENTER"),
            ]))
            elems.append(ph)

    doc.build(elems, canvasmaker=_SPRCanvas)
    return buf.getvalue()
