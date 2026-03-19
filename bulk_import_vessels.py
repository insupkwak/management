from __future__ import annotations

import sqlite3
from pathlib import Path
from typing import Any
from datetime import datetime

from openpyxl import load_workbook

BASE_DIR = Path(__file__).resolve().parent
DB_PATH = BASE_DIR / "data" / "vessels.db"
EXCEL_PATH = BASE_DIR / "data" / "vessels_bulk_upload.xlsx"

COC_COUNT = 10
SIRE_COUNT = 3
ISSUE_COUNT = 15


def normalize_text(value: Any) -> str:
    if value is None:
        return ""
    return str(value).strip()


def normalize_date(value: Any) -> str:
    if value is None or str(value).strip() == "":
        return ""

    if isinstance(value, datetime):
        return value.strftime("%Y-%m-%d")

    text = str(value).strip()

    for fmt in (
        "%Y-%m-%d",
        "%Y/%m/%d",
        "%Y.%m.%d",
        "%m/%d/%Y",
        "%d/%m/%Y",
    ):
        try:
            return datetime.strptime(text, fmt).strftime("%Y-%m-%d")
        except Exception:
            continue

    return text


def normalize_float(value: Any):
    if value is None or str(value).strip() == "":
        return None
    try:
        return float(value)
    except Exception:
        return None


def normalize_bool_int(value: Any) -> int:
    text = str(value or "").strip().lower()
    if text in {"1", "y", "yes", "true", "t", "critical", "checked"}:
        return 1
    return 0


def normalize_vessel_type(value: Any) -> str:
    text = normalize_text(value)
    return text if text in {"Tanker", "Container"} else "Tanker"


def normalize_cargo_status(value: Any, vessel_type: str) -> str:
    if vessel_type == "Container":
        return ""
    text = normalize_text(value)
    return text if text in {"Loading", "Ballast"} else "Ballast"


def normalize_sire_status(value: Any) -> str:
    text = normalize_text(value)
    return text if text in {"예정", "결함조치 중", "수검완료"} else ""


def build_header_map(sheet) -> dict[str, int]:
    headers = [str(cell.value).strip() if cell.value is not None else "" for cell in sheet[1]]
    return {header: idx for idx, header in enumerate(headers) if header}


def get_cell(row: list[Any], header_map: dict[str, int], key: str, default: Any = "") -> Any:
    idx = header_map.get(key)
    if idx is None or idx >= len(row):
        return default
    value = row[idx]
    return default if value is None else value


def ensure_required_columns_exist(conn: sqlite3.Connection) -> None:
    rows = conn.execute("PRAGMA table_info(vessels)").fetchall()
    existing = {row[1] for row in rows}

    required = []

    for i in range(11, ISSUE_COUNT + 1):
        required.append((f"issue_{i}", "TEXT NOT NULL DEFAULT ''"))
        required.append((f"issue_{i}_critical", "INTEGER NOT NULL DEFAULT 0"))

    required += [
        ("condition_report_type", "TEXT NOT NULL DEFAULT ''"),
        ("condition_report_date", "TEXT NOT NULL DEFAULT ''"),
        ("condition_report_status", "TEXT NOT NULL DEFAULT ''"),
        ("condition_report_findings", "TEXT NOT NULL DEFAULT ''"),
        ("condition_report_open_findings", "TEXT NOT NULL DEFAULT ''"),
        ("owner_supervisor", "TEXT NOT NULL DEFAULT ''"),
        ("size", "TEXT NOT NULL DEFAULT ''"),
        ("vessel_type", "TEXT NOT NULL DEFAULT 'Tanker'"),
    ]

    for col_name, col_def in required:
        if col_name not in existing:
            conn.execute(f"ALTER TABLE vessels ADD COLUMN {col_name} {col_def}")

    conn.commit()


def build_record(row: list[Any], header_map: dict[str, int]) -> dict[str, Any]:
    vessel_type = normalize_vessel_type(get_cell(row, header_map, "vessel_type", "Tanker"))

    record: dict[str, Any] = {
        "name": normalize_text(get_cell(row, header_map, "name")),
        "vessel_type": vessel_type,
        "management_company": normalize_text(get_cell(row, header_map, "management_company")),
        "management_supervisor": normalize_text(get_cell(row, header_map, "management_supervisor")),
        "owner_supervisor": normalize_text(get_cell(row, header_map, "owner_supervisor")),
        "builder": normalize_text(get_cell(row, header_map, "builder")),
        "size": normalize_text(get_cell(row, header_map, "size")),
        "delivery_date": normalize_date(get_cell(row, header_map, "delivery_date")),
        "next_dry_dock": normalize_date(get_cell(row, header_map, "next_dry_dock")),
        "voyage_plan": normalize_text(get_cell(row, header_map, "voyage_plan")),
        "cargo_status": normalize_cargo_status(get_cell(row, header_map, "cargo_status"), vessel_type),
        "latitude": normalize_float(get_cell(row, header_map, "latitude", None)),
        "longitude": normalize_float(get_cell(row, header_map, "longitude", None)),
        "condition_report_type": normalize_text(get_cell(row, header_map, "condition_report_type")),
        "condition_report_date": normalize_date(get_cell(row, header_map, "condition_report_date")),
        "condition_report_status": normalize_sire_status(get_cell(row, header_map, "condition_report_status")),
        "condition_report_findings": normalize_text(get_cell(row, header_map, "condition_report_findings")),
        "condition_report_open_findings": normalize_text(get_cell(row, header_map, "condition_report_open_findings")),
    }

    for i in range(1, ISSUE_COUNT + 1):
        record[f"issue_{i}"] = normalize_text(get_cell(row, header_map, f"issue_{i}"))
        record[f"issue_{i}_critical"] = normalize_bool_int(get_cell(row, header_map, f"issue_{i}_critical", 0))

    for i in range(1, COC_COUNT + 1):
        record[f"coc_type_{i}"] = normalize_text(get_cell(row, header_map, f"coc_type_{i}"))
        record[f"coc_summary_{i}"] = normalize_text(get_cell(row, header_map, f"coc_summary_{i}"))
        record[f"coc_due_date_{i}"] = normalize_date(get_cell(row, header_map, f"coc_due_date_{i}"))

    for i in range(1, SIRE_COUNT + 1):
        if vessel_type == "Container":
            record[f"sire_type_{i}"] = ""
            record[f"sire_date_{i}"] = ""
            record[f"sire_status_{i}"] = ""
            record[f"sire_findings_{i}"] = ""
            record[f"sire_open_findings_{i}"] = ""
        else:
            record[f"sire_type_{i}"] = normalize_text(get_cell(row, header_map, f"sire_type_{i}"))
            record[f"sire_date_{i}"] = normalize_date(get_cell(row, header_map, f"sire_date_{i}"))
            record[f"sire_status_{i}"] = normalize_sire_status(get_cell(row, header_map, f"sire_status_{i}"))
            record[f"sire_findings_{i}"] = normalize_text(get_cell(row, header_map, f"sire_findings_{i}"))
            record[f"sire_open_findings_{i}"] = normalize_text(get_cell(row, header_map, f"sire_open_findings_{i}"))

    if vessel_type == "Container":
        record["condition_report_type"] = ""
        record["condition_report_date"] = ""
        record["condition_report_status"] = ""
        record["condition_report_findings"] = ""
        record["condition_report_open_findings"] = ""

    return record


def upsert_vessel(conn: sqlite3.Connection, record: dict[str, Any]) -> str:
    name = record["name"]
    existing = conn.execute(
        """
        SELECT id, latitude, longitude
        FROM vessels
        WHERE LOWER(TRIM(name)) = LOWER(TRIM(?))
        LIMIT 1
        """,
        (name,),
    ).fetchone()

    if not name:
        return "skipped"

    if existing:
        if record["latitude"] is None:
            record["latitude"] = existing[1]
        if record["longitude"] is None:
            record["longitude"] = existing[2]

        columns = [k for k in record.keys()]
        set_clause = ", ".join([f"{col} = ?" for col in columns])
        values = [record[col] for col in columns]
        values.append(existing[0])

        conn.execute(
            f"""
            UPDATE vessels
            SET {set_clause}, updated_at = CURRENT_TIMESTAMP
            WHERE id = ?
            """,
            values,
        )
        return "updated"

    columns = list(record.keys())
    placeholders = ", ".join(["?"] * len(columns))
    column_sql = ", ".join(columns)
    values = [record[col] for col in columns]

    conn.execute(
        f"""
        INSERT INTO vessels ({column_sql})
        VALUES ({placeholders})
        """,
        values,
    )
    return "inserted"


def main():
    if not DB_PATH.exists():
        raise FileNotFoundError(f"DB 파일이 없습니다: {DB_PATH}")

    if not EXCEL_PATH.exists():
        raise FileNotFoundError(f"엑셀 파일이 없습니다: {EXCEL_PATH}")

    workbook = load_workbook(EXCEL_PATH, data_only=True)
    sheet = workbook.active
    header_map = build_header_map(sheet)

    conn = sqlite3.connect(DB_PATH)
    try:
        ensure_required_columns_exist(conn)

        inserted = 0
        updated = 0
        skipped = 0

        for row in sheet.iter_rows(min_row=2, values_only=True):
            row_values = list(row)
            record = build_record(row_values, header_map)

            status = upsert_vessel(conn, record)
            if status == "inserted":
                inserted += 1
            elif status == "updated":
                updated += 1
            else:
                skipped += 1

        conn.commit()

        print("대량 초기 세팅 완료")
        print(f"- 신규 입력: {inserted}")
        print(f"- 기존 업데이트: {updated}")
        print(f"- 건너뜀: {skipped}")

    finally:
        conn.close()


if __name__ == "__main__":
    main()

