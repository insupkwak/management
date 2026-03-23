from __future__ import annotations

from collections import defaultdict
from pathlib import Path
from typing import Any

from openpyxl import load_workbook


VALID_UNCLAIMED_STATUSES = {
    "Draft",
    "Submitted",
    "Rejected",
    "HQ Rejected",
    "HQ Submitted",
}

VALID_CLAIMED_STATUSES = {
    "HQ Transferred to Financial",
    "Remitted",
}


def safe_str(value: Any) -> str:
    if value is None:
        return ""
    return str(value).strip()


def safe_number(value: Any) -> float:
    if value is None or value == "":
        return 0.0
    try:
        text = str(value).replace(",", "").replace("$", "").strip()
        if not text:
            return 0.0
        return float(text)
    except Exception:
        return 0.0


def normalize_year(value: Any) -> str:
    if value is None or value == "":
        return ""

    if hasattr(value, "year"):
        return str(value.year)

    text = str(value).strip()

    if len(text) >= 4 and text[:4].isdigit():
        return text[:4]

    try:
        num = int(float(text))
        if 1900 <= num <= 2100:
            return str(num)
    except Exception:
        pass

    return ""


def normalize_type(value: Any) -> str:
    text = safe_str(value).lower()
    if text == "crew":
        return "crew"
    if text == "technical":
        return "tech"
    if text == "tech":
        return "tech"
    return ""


def normalize_range(value: Any) -> str:
    text = safe_str(value).lower()
    if text == "opex":
        return "opex"
    if text == "aor":
        return "aor"
    return ""


def normalize_status(value: Any) -> str:
    return safe_str(value)


def aggregate_management_cost_excel(file_path: str | Path) -> dict[str, dict[str, dict[str, Any]]]:
    """
    return:
    {
        "VESSEL NAME": {
            "2026": {
                "opex_actual_crew_count": 2,
                "opex_actual_crew_amount": 3000,
                "opex_actual_tech_count": 1,
                "opex_actual_tech_amount": 1500,
                "aor_actual_crew_count": 1,
                "aor_actual_crew_amount": 900,
                "aor_actual_tech_count": 0,
                "aor_actual_tech_amount": 0,
                "aor_unclaimed_crew_count": 1,
                "aor_unclaimed_crew_amount": 500,
                "aor_unclaimed_tech_count": 0,
                "aor_unclaimed_tech_amount": 0,
            }
        }
    }
    """
    wb = load_workbook(file_path, data_only=True)
    ws = wb.active

    result = defaultdict(lambda: defaultdict(lambda: {
        "opex_actual_crew_count": 0,
        "opex_actual_crew_amount": 0.0,
        "opex_actual_tech_count": 0,
        "opex_actual_tech_amount": 0.0,
        "aor_actual_crew_count": 0,
        "aor_actual_crew_amount": 0.0,
        "aor_actual_tech_count": 0,
        "aor_actual_tech_amount": 0.0,
        "aor_unclaimed_crew_count": 0,
        "aor_unclaimed_crew_amount": 0.0,
        "aor_unclaimed_tech_count": 0,
        "aor_unclaimed_tech_amount": 0.0,
    }))

    # 2행부터 시작
    for row in range(2, ws.max_row + 1):
        year_value = ws[f"F{row}"].value
        vessel_name = safe_str(ws[f"H{row}"].value)
        crew_or_tech = normalize_type(ws[f"K{row}"].value)
        opex_or_aor = normalize_range(ws[f"L{row}"].value)
        cost_value = safe_number(ws[f"N{row}"].value)
        status = normalize_status(ws[f"O{row}"].value)

        year = normalize_year(year_value)

        if not vessel_name or not year or not crew_or_tech or not opex_or_aor:
            continue

        vessel_key = vessel_name.upper()
        bucket = result[vessel_key][year]

        if opex_or_aor == "opex":
            if crew_or_tech == "crew":
                bucket["opex_actual_crew_count"] += 1
                bucket["opex_actual_crew_amount"] += cost_value
            elif crew_or_tech == "tech":
                bucket["opex_actual_tech_count"] += 1
                bucket["opex_actual_tech_amount"] += cost_value

        elif opex_or_aor == "aor":
            if status in VALID_UNCLAIMED_STATUSES:
                if crew_or_tech == "crew":
                    bucket["aor_unclaimed_crew_count"] += 1
                    bucket["aor_unclaimed_crew_amount"] += cost_value
                elif crew_or_tech == "tech":
                    bucket["aor_unclaimed_tech_count"] += 1
                    bucket["aor_unclaimed_tech_amount"] += cost_value

            elif status in VALID_CLAIMED_STATUSES:
                if crew_or_tech == "crew":
                    bucket["aor_actual_crew_count"] += 1
                    bucket["aor_actual_crew_amount"] += cost_value
                elif crew_or_tech == "tech":
                    bucket["aor_actual_tech_count"] += 1
                    bucket["aor_actual_tech_amount"] += cost_value

            else:
                # 상태값이 비정상이면 미반영
                continue

    return result