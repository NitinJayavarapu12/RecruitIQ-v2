import os
import datetime
import tempfile
from typing import List, Dict

from openpyxl import Workbook
from openpyxl.styles import Font, PatternFill, Alignment, Border, Side
from openpyxl.utils import get_column_letter


TIER_COLORS = {
    "Strong Match": ("1A7A4A", "D4EDDA"),
    "Good Match":   ("856404", "FFF3CD"),
    "Partial Match":("721C24", "F8D7DA"),
}
DEFAULT_COLORS = ("2D3A5A", "F0F4FF")


def _thin_border():
    thin = Side(style="thin", color="D0D7E8")
    return Border(left=thin, right=thin, top=thin, bottom=thin)


def export_to_excel(results: List[Dict], jd_filename: str) -> str:
    wb = Workbook()
    ws = wb.active
    ws.title = "Top Candidates"

    # Title row
    jd_base = os.path.splitext(jd_filename)[0]
    date_str = datetime.datetime.now().strftime("%B %d, %Y · %H:%M")
    ws.merge_cells("A1:G1")
    title_cell = ws["A1"]
    title_cell.value = f"Resume Screening Report  ·  {jd_base}  ·  {date_str}"
    title_cell.font = Font(name="Calibri", bold=True, size=14, color="FFFFFF")
    title_cell.fill = PatternFill(start_color="0D1B3E", end_color="0D1B3E", fill_type="solid")
    title_cell.alignment = Alignment(horizontal="center", vertical="center")
    ws.row_dimensions[1].height = 36

    # Column headers
    headers = [
        "Name",
        "Phone & Email",
        "LinkedIn",
        "Matching Score",
        "Primary Skills",
        "Secondary Skills",
        "Latest Company",
    ]
    header_fill = PatternFill(start_color="1A2952", end_color="1A2952", fill_type="solid")
    header_font = Font(name="Calibri", bold=True, color="FFFFFF", size=11)

    for col, header in enumerate(headers, 1):
        cell = ws.cell(row=2, column=col, value=header)
        cell.font = header_font
        cell.fill = header_fill
        cell.alignment = Alignment(horizontal="center", vertical="center", wrap_text=True)
        cell.border = _thin_border()
    ws.row_dimensions[2].height = 28

    # Data rows
    for row_idx, result in enumerate(results, 3):
        tier = result.get("tier", "Partial Match")
        _, bg_hex = TIER_COLORS.get(tier, DEFAULT_COLORS)
        row_fill = PatternFill(start_color=bg_hex, end_color=bg_hex, fill_type="solid")
        data_font = Font(name="Calibri", size=10)
        bold_font = Font(name="Calibri", size=10, bold=True)

        # Col 1: Name
        c1 = ws.cell(row=row_idx, column=1, value=result.get("name", "N/A"))
        c1.font = bold_font

        # Col 2: Phone & Email
        phone = result.get("phone", "N/A")
        email = result.get("email", "N/A")
        c2 = ws.cell(row=row_idx, column=2, value=f"{phone}\n{email}")
        c2.font = data_font

        # Col 3: LinkedIn (as hyperlink if available)
        linkedin = result.get("linkedin", "N/A")
        c3 = ws.cell(row=row_idx, column=3, value=linkedin)
        if linkedin and linkedin != "N/A":
            c3.hyperlink = linkedin
            c3.font = Font(name="Calibri", size=10, color="0563C1", underline="single")
        else:
            c3.font = data_font

        # Col 4: Matching Score
        score_val = result.get("score", 0)
        c4 = ws.cell(row=row_idx, column=4, value=f"{score_val}%")
        c4.font = Font(name="Calibri", bold=True, size=11)
        c4.alignment = Alignment(horizontal="center", vertical="top")

        # Col 5: Primary Skills
        primary = result.get("primary_skills", [])
        c5 = ws.cell(row=row_idx, column=5, value=", ".join(primary) if primary else "N/A")
        c5.font = data_font

        # Col 6: Secondary Skills
        secondary = result.get("secondary_skills", [])
        c6 = ws.cell(row=row_idx, column=6, value=", ".join(secondary) if secondary else "N/A")
        c6.font = data_font

        # Col 7: Latest Company
        c7 = ws.cell(row=row_idx, column=7, value=result.get("latest_employment", "N/A"))
        c7.font = data_font

        # Apply row styling
        for col in range(1, 8):
            cell = ws.cell(row=row_idx, column=col)
            cell.fill = row_fill
            cell.alignment = Alignment(wrap_text=True, vertical="top")
            cell.border = _thin_border()

        ws.row_dimensions[row_idx].height = 50

    # Column widths
    col_widths = [25, 30, 38, 16, 38, 38, 32]
    for col, width in enumerate(col_widths, 1):
        ws.column_dimensions[get_column_letter(col)].width = width

    ws.freeze_panes = "A3"

    # Save
    date_tag = datetime.datetime.now().strftime("%Y-%m-%d_%H%M")
    safe_jd = "".join(c if c.isalnum() or c in "-_" else "_" for c in jd_base)
    filename = f"top_candidates_{safe_jd}_{date_tag}.xlsx"
    output_path = os.path.join(tempfile.gettempdir(), filename)
    wb.save(output_path)
    print(f"[EXCEL] Saved: {output_path}")
    return output_path