from __future__ import annotations

import math
import re
import sqlite3
from datetime import datetime
from pathlib import Path
from typing import Any

from flask import (
    Flask,
    g,
    jsonify,
    make_response,
    render_template,
    request,
    send_from_directory,
)
from openpyxl import load_workbook
from werkzeug.utils import secure_filename

BASE_DIR = Path(__file__).resolve().parent
DATA_DIR = BASE_DIR / "data"
UPLOAD_DIR = BASE_DIR / "uploads"
REPORT_UPLOAD_DIR = UPLOAD_DIR / "reports"
DB_PATH = DATA_DIR / "vessels.db"
SCHEMA_PATH = BASE_DIR / "schema.sql"

ALLOWED_REPORT_EXTENSIONS = {
    "pdf", "jpg", "jpeg", "png", "webp", "doc", "docx", "xls", "xlsx"
}
ALLOWED_POSITION_EXTENSIONS = {"xlsx"}

VALID_REPORT_KEYS = {
    "report1_file",
    "report2_file",
    "report3_file",
    "report4_file",
    "report5_file",
    "report6_file",
    "report7_file",
}

OWNER_SUPERVISORS = {"손유석 감독", "김흥민 감독", "이창주 감독"}
VALID_VESSEL_TYPES = {"Tanker", "Container"}
VALID_SIRE_STATUS = {"예정", "결함조치 중", "수검완료"}
DELETE_PASSWORD = "cmt2"

COC_COUNT = 10
SIRE_COUNT = 3

app = Flask(__name__)
app.config["JSON_AS_ASCII"] = False
app.config["MAX_CONTENT_LENGTH"] = 100 * 1024 * 1024


def ensure_dirs() -> None:
    DATA_DIR.mkdir(parents=True, exist_ok=True)
    UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
    REPORT_UPLOAD_DIR.mkdir(parents=True, exist_ok=True)


def get_db() -> sqlite3.Connection:
    if "db" not in g:
        conn = sqlite3.connect(DB_PATH, timeout=30)
        conn.row_factory = sqlite3.Row
        conn.execute("PRAGMA journal_mode=WAL;")
        conn.execute("PRAGMA synchronous=NORMAL;")
        conn.execute("PRAGMA busy_timeout=30000;")
        g.db = conn
    return g.db


@app.teardown_appcontext
def close_db(_exception):
    db = g.pop("db", None)
    if db is not None:
        db.close()


def column_exists(conn: sqlite3.Connection, table_name: str, column_name: str) -> bool:
    rows = conn.execute(f"PRAGMA table_info({table_name})").fetchall()
    return any(row[1] == column_name for row in rows)

def ensure_vessel_columns(conn: sqlite3.Connection) -> None:
    required_columns = [
        ("vessel_type", "TEXT NOT NULL DEFAULT 'Tanker'"),
        ("management_company", "TEXT NOT NULL DEFAULT ''"),
        ("management_supervisor", "TEXT NOT NULL DEFAULT ''"),
        ("owner_supervisor", "TEXT NOT NULL DEFAULT ''"),
        ("builder", "TEXT NOT NULL DEFAULT ''"),
        ("size", "TEXT NOT NULL DEFAULT ''"),
        ("delivery_date", "TEXT NOT NULL DEFAULT ''"),
        ("next_dry_dock", "TEXT NOT NULL DEFAULT ''"),
        ("voyage_plan", "TEXT NOT NULL DEFAULT ''"),
        ("cargo_status", "TEXT NOT NULL DEFAULT 'Ballast'"),
        ("condition_report_type", "TEXT NOT NULL DEFAULT ''"),
        ("condition_report_date", "TEXT NOT NULL DEFAULT ''"),
        ("condition_report_status", "TEXT NOT NULL DEFAULT ''"),
        ("condition_report_findings", "TEXT NOT NULL DEFAULT ''"),
        ("condition_report_open_findings", "TEXT NOT NULL DEFAULT ''"),
    ]

    for i in range(1, 16):
        required_columns.append((f"issue_{i}", "TEXT NOT NULL DEFAULT ''"))
        required_columns.append((f"issue_{i}_critical", "INTEGER NOT NULL DEFAULT 0"))

    for i in range(1, 11):
        required_columns.append((f"coc_type_{i}", "TEXT NOT NULL DEFAULT ''"))
        required_columns.append((f"coc_summary_{i}", "TEXT NOT NULL DEFAULT ''"))
        required_columns.append((f"coc_due_date_{i}", "TEXT NOT NULL DEFAULT ''"))

    for i in range(1, 6):
        required_columns.append((f"sire_type_{i}", "TEXT NOT NULL DEFAULT ''"))
        required_columns.append((f"sire_date_{i}", "TEXT NOT NULL DEFAULT ''"))
        required_columns.append((f"sire_status_{i}", "TEXT NOT NULL DEFAULT ''"))
        required_columns.append((f"sire_findings_{i}", "TEXT NOT NULL DEFAULT ''"))
        required_columns.append((f"sire_open_findings_{i}", "TEXT NOT NULL DEFAULT ''"))

    for report_key in VALID_REPORT_KEYS:
        required_columns.append((report_key, "TEXT NOT NULL DEFAULT ''"))

    for col_name, col_def in required_columns:
        if not column_exists(conn, "vessels", col_name):
            conn.execute(f"ALTER TABLE vessels ADD COLUMN {col_name} {col_def}")

def init_db() -> None:
    ensure_dirs()
    conn = sqlite3.connect(DB_PATH, timeout=30)
    try:
        conn.execute("PRAGMA journal_mode=WAL;")
        conn.execute("PRAGMA synchronous=NORMAL;")
        conn.execute("PRAGMA busy_timeout=30000;")
        if SCHEMA_PATH.exists():
            schema_sql = SCHEMA_PATH.read_text(encoding="utf-8")
            conn.executescript(schema_sql)
        ensure_vessel_columns(conn)
        conn.commit()
    finally:
        conn.close()


def normalize_name(name: Any) -> str:
    return str(name or "").strip().lower()


def safe_float(value: Any) -> float | None:
    try:
        if value is None or str(value).strip() == "":
            return None
        num = float(value)
        if math.isfinite(num):
            return num
    except Exception:
        return None
    return None


def allowed_file(filename: str, allowed_extensions: set[str]) -> bool:
    if "." not in filename:
        return False
    ext = filename.rsplit(".", 1)[1].lower()
    return ext in allowed_extensions


def get_version() -> int:
    targets = [
        BASE_DIR / "templates" / "index.html",
        BASE_DIR / "templates" / "report.html",
        BASE_DIR / "static" / "css" / "style.css",
        BASE_DIR / "static" / "js" / "app.js",
        Path(__file__),
    ]
    mtimes = []
    for path in targets:
        if path.exists():
            mtimes.append(int(path.stat().st_mtime))
    return max(mtimes) if mtimes else int(datetime.now().timestamp())


def no_cache_json(payload: Any, status: int = 200):
    response = make_response(jsonify(payload), status)
    response.headers["Cache-Control"] = "no-store, no-cache, must-revalidate, max-age=0"
    response.headers["Pragma"] = "no-cache"
    response.headers["Expires"] = "0"
    return response


def row_to_vessel_dict(row: sqlite3.Row) -> dict[str, Any]:
    vessel = dict(row)
    if vessel.get("latitude") is None:
        vessel["latitude"] = ""
    if vessel.get("longitude") is None:
        vessel["longitude"] = ""
    return vessel


def normalize_cargo_status(value: Any) -> str:
    v = str(value or "").strip()
    if v in {"Loading", "Ballast"}:
        return v
    return "Ballast"


def normalize_vessel_type(value: Any) -> str:
    v = str(value or "").strip()
    if v in VALID_VESSEL_TYPES:
        return v
    return "Tanker"


def normalize_sire_status(value: Any) -> str:
    v = str(value or "").strip()
    if v in VALID_SIRE_STATUS:
        return v
    return ""


def parse_excel_datetime(value: Any) -> datetime | None:
    if value is None or value == "":
        return None

    if isinstance(value, datetime):
        return value

    text = str(value).strip()
    if not text:
        return None

    patterns = [
        "%Y-%m-%d %H:%M:%S",
        "%Y-%m-%d %H:%M",
        "%Y/%m/%d %H:%M:%S",
        "%Y/%m/%d %H:%M",
        "%Y-%m-%d",
        "%Y/%m/%d",
        "%d/%m/%Y %H:%M",
        "%d/%m/%Y",
        "%m/%d/%Y %H:%M",
        "%m/%d/%Y",
    ]
    for fmt in patterns:
        try:
            return datetime.strptime(text, fmt)
        except Exception:
            continue
    return None


def dms_to_decimal(deg: float, minutes: float = 0.0, seconds: float = 0.0, direction: str | None = None) -> float:
    value = abs(deg) + (minutes / 60.0) + (seconds / 3600.0)
    if direction in {"S", "W"}:
        value = -value
    elif deg < 0:
        value = -value
    return value


def parse_single_coordinate_text(text: str, coord_type: str) -> float | None:
    if not text:
        return None

    raw = str(text).strip().upper()
    if not raw:
        return None

    raw = raw.replace("º", "°").replace("’", "'").replace("`", "'").replace("“", '"').replace("”", '"')

    try:
        num = float(raw)
        if coord_type == "lat" and -90 <= num <= 90:
            return num
        if coord_type == "lon" and -180 <= num <= 180:
            return num
    except Exception:
        pass

    direction_match = re.search(r"\b([NSEW])\b|^([NSEW])|([NSEW])$", raw)
    direction = None
    if direction_match:
        for g in direction_match.groups():
            if g:
                direction = g
                break

    nums = re.findall(r"[-+]?\d+(?:\.\d+)?", raw)
    if not nums:
        return None

    try:
        deg = float(nums[0])
        minutes = float(nums[1]) if len(nums) >= 2 else 0.0
        seconds = float(nums[2]) if len(nums) >= 3 else 0.0
        value = dms_to_decimal(deg, minutes, seconds, direction)
        if coord_type == "lat" and -90 <= value <= 90:
            return value
        if coord_type == "lon" and -180 <= value <= 180:
            return value
    except Exception:
        return None

    return None


def extract_lat_lon_from_combined_text(text: str) -> tuple[float | None, float | None]:
    if not text:
        return None, None

    raw = str(text).strip().upper()
    if not raw:
        return None, None

    raw = raw.replace("º", "°").replace("’", "'").replace("`", "'").replace("“", '"').replace("”", '"')

    directional_parts = re.findall(r'([NSEW][^NSEW/]+)', raw)
    if len(directional_parts) >= 2:
        lat = None
        lon = None
        for part in directional_parts:
            part = part.strip()
            if part.startswith(("N", "S")):
                lat = parse_single_coordinate_text(part, "lat")
            elif part.startswith(("E", "W")):
                lon = parse_single_coordinate_text(part, "lon")
        if lat is not None or lon is not None:
            return lat, lon

    if "/" in raw:
        parts = [p.strip() for p in raw.split("/") if p.strip()]
        if len(parts) >= 2:
            a, b = parts[0], parts[1]
            a_lat = parse_single_coordinate_text(a, "lat")
            a_lon = parse_single_coordinate_text(a, "lon")
            b_lat = parse_single_coordinate_text(b, "lat")
            b_lon = parse_single_coordinate_text(b, "lon")

            if a_lon is not None and b_lat is not None:
                return b_lat, a_lon
            if a_lat is not None and b_lon is not None:
                return a_lat, b_lon
            if a_lat is not None and a_lon is None and b_lon is not None:
                return a_lat, b_lon
            if a_lon is not None and b_lat is not None and b_lon is None:
                return b_lat, a_lon

    return None, None


def parse_coordinate(value: Any, coord_type: str) -> float | None:
    if value is None or value == "":
        return None

    if isinstance(value, (int, float)):
        num = float(value)
        if coord_type == "lat" and -90 <= num <= 90:
            return num
        if coord_type == "lon" and -180 <= num <= 180:
            return num
        return None

    text = str(value).strip()
    if not text:
        return None

    return parse_single_coordinate_text(text, coord_type)


def normalize_header(text: Any) -> str:
    return re.sub(r"[^a-z0-9가-힣]", "", str(text or "").strip().lower())


def find_header_index(headers: list[Any], candidates: list[str]) -> int | None:
    normalized = [normalize_header(h) for h in headers]
    candidate_set = {normalize_header(c) for c in candidates}
    for idx, header in enumerate(normalized):
        if header in candidate_set:
            return idx
    return None


def pick_latest_rows_by_vessel(ws) -> tuple[dict[str, dict[str, Any]], int, int]:
    rows = list(ws.iter_rows(values_only=True))
    if not rows:
        return {}, 0, 0

    headers = list(rows[0])

    name_idx = find_header_index(headers, [
        "선명", "선박명", "ship name", "shipname", "vesselname", "vessel", "name"
    ])
    date_idx = find_header_index(headers, [
        "date", "일자", "날짜", "시간", "datetime", "updatedate", "updatetime"
    ])
    lat_idx = find_header_index(headers, [
        "latitude", "lat", "위도"
    ])
    lon_idx = find_header_index(headers, [
        "longitude", "lon", "lng", "경도"
    ])
    position_idx = find_header_index(headers, [
        "위치", "position", "pos", "location"
    ])

    if name_idx is None:
        raise ValueError("엑셀 헤더에서 선명 또는 선박명을 찾을 수 없습니다.")

    if lat_idx is None and lon_idx is None and position_idx is None:
        raise ValueError("엑셀 헤더에서 위도/경도 또는 위치 컬럼을 찾을 수 없습니다.")

    latest_by_name: dict[str, dict[str, Any]] = {}
    total_rows = 0
    invalid_count = 0

    for row in rows[1:]:
        if not row:
            continue

        total_rows += 1

        raw_name = row[name_idx] if name_idx < len(row) else None
        name = str(raw_name or "").strip()
        if not name:
            invalid_count += 1
            continue

        dt_value = None
        if date_idx is not None and date_idx < len(row):
            dt_value = parse_excel_datetime(row[date_idx])

        lat = None
        lon = None

        if position_idx is not None and position_idx < len(row):
            position_raw = row[position_idx]
            if position_raw not in (None, ""):
                lat, lon = extract_lat_lon_from_combined_text(str(position_raw))

        if lat is None and lat_idx is not None and lat_idx < len(row):
            lat = parse_coordinate(row[lat_idx], "lat")

        if lon is None and lon_idx is not None and lon_idx < len(row):
            lon = parse_coordinate(row[lon_idx], "lon")

        if (lat is None or lon is None) and lat_idx is not None and lat_idx < len(row):
            extra_lat, extra_lon = extract_lat_lon_from_combined_text(str(row[lat_idx] or ""))
            if lat is None and extra_lat is not None:
                lat = extra_lat
            if lon is None and extra_lon is not None:
                lon = extra_lon

        if (lat is None or lon is None) and lon_idx is not None and lon_idx < len(row):
            extra_lat, extra_lon = extract_lat_lon_from_combined_text(str(row[lon_idx] or ""))
            if lat is None and extra_lat is not None:
                lat = extra_lat
            if lon is None and extra_lon is not None:
                lon = extra_lon

        if lat is None or lon is None:
            invalid_count += 1
            continue

        key = normalize_name(name)
        current = latest_by_name.get(key)

        item = {
            "name": name,
            "latitude": lat,
            "longitude": lon,
            "dt": dt_value,
        }

        if current is None:
            latest_by_name[key] = item
            continue

        current_dt = current.get("dt")
        if dt_value and current_dt:
            if dt_value >= current_dt:
                latest_by_name[key] = item
        elif dt_value and not current_dt:
            latest_by_name[key] = item
        elif not dt_value and not current_dt:
            latest_by_name[key] = item

    return latest_by_name, total_rows, invalid_count


def get_all_vessels() -> list[dict[str, Any]]:
    db = get_db()
    rows = db.execute("SELECT * FROM vessels ORDER BY name COLLATE NOCASE ASC").fetchall()
    return [row_to_vessel_dict(row) for row in rows]


def get_vessel_by_name(name: str) -> dict[str, Any] | None:
    db = get_db()
    row = db.execute("""
        SELECT *
        FROM vessels
        WHERE LOWER(TRIM(name)) = LOWER(TRIM(?))
        LIMIT 1
    """, (name,)).fetchone()
    return row_to_vessel_dict(row) if row else None


def remove_old_report_file_if_needed(vessel: dict[str, Any], report_key: str) -> None:
    old_name = str(vessel.get(report_key, "")).strip()
    if not old_name:
        return
    old_path = REPORT_UPLOAD_DIR / old_name
    if old_path.exists() and old_path.is_file():
        try:
            old_path.unlink()
        except Exception:
            pass



def build_report_flags(vessels: list[dict[str, Any]]) -> dict[str, bool]:
    def has_any_value(key: str) -> bool:
        return any(str(v.get(key, "")).strip() for v in vessels)

    flags: dict[str, bool] = {
        "show_management_company": has_any_value("management_company"),
        "show_owner_supervisor": has_any_value("owner_supervisor"),
        "show_vessel_type": has_any_value("vessel_type"),
        "show_delivery_date": has_any_value("delivery_date"),
        "show_next_dry_dock": has_any_value("next_dry_dock"),
        "show_voyage_plan": has_any_value("voyage_plan"),
        "show_builder": has_any_value("builder"),
        "show_size": has_any_value("size"),
        "show_cargo_status": has_any_value("cargo_status"),
        "show_condition_report": (
            has_any_value("condition_report_type")
            or has_any_value("condition_report_date")
            or has_any_value("condition_report_status")
            or has_any_value("condition_report_findings")
            or has_any_value("condition_report_open_findings")
        ),
    }

    for i in range(1, 16):
        flags[f"show_issue_{i}"] = has_any_value(f"issue_{i}")

    for i in range(1, 11):
        flags[f"show_coc_{i}"] = (
            has_any_value(f"coc_type_{i}")
            or has_any_value(f"coc_summary_{i}")
            or has_any_value(f"coc_due_date_{i}")
        )

    for i in range(1, 4):
        flags[f"show_sire_{i}"] = (
            has_any_value(f"sire_type_{i}")
            or has_any_value(f"sire_date_{i}")
            or has_any_value(f"sire_status_{i}")
            or has_any_value(f"sire_findings_{i}")
            or has_any_value(f"sire_open_findings_{i}")
        )

    return flags



@app.after_request
def add_no_cache_headers(response):
    if request.path.startswith("/api/"):
        response.headers["Cache-Control"] = "no-store, no-cache, must-revalidate, max-age=0"
        response.headers["Pragma"] = "no-cache"
        response.headers["Expires"] = "0"
    return response


@app.route("/")
def index():
    return render_template("index.html", version=get_version())

@app.route("/report")
def report_page():
    vessels = get_all_vessels()

    # 1. 현안업무가 하나라도 있는 선박만 표시
    vessels_with_issue = [
        v for v in vessels
        if any(
            str(v.get(f"issue_{i}", "")).strip()
            for i in range(1, 16)
        )
    ]

    # 2. 실제 데이터가 있는 현안업무 열만 표시
    visible_issue_indexes = []
    for i in range(1, 16):
        has_data = any(
            str(v.get(f"issue_{i}", "")).strip()
            for v in vessels_with_issue
        )
        if has_data:
            visible_issue_indexes.append(i)

    # 3. CRITICAL 선박 수
    critical_vessel_count = sum(
        1 for v in vessels_with_issue
        if any(
            str(v.get(f"issue_{i}", "")).strip() and int(v.get(f"issue_{i}_critical", 0)) == 1
            for i in range(1, 16)
        )
    )

    return render_template(
        "report.html",
        version=get_version(),
        vessels=vessels_with_issue,
        total_count=len(vessels),  # 전체 등록 선박 수
        critical_vessel_count=critical_vessel_count,
        visible_issue_indexes=visible_issue_indexes,
    )

@app.route("/api/vessels", methods=["GET"])
def api_get_vessels():
    return no_cache_json(get_all_vessels())



@app.route("/api/vessel", methods=["POST"])
def api_save_single_vessel():
    payload = request.get_json(silent=True) or {}

    name = str(payload.get("name", "")).strip()
    original_name = str(payload.get("_originalName", "")).strip()

    if not name:
        return no_cache_json({"success": False, "message": "선박명이 필요합니다."}, 400)

    vessel_type = normalize_vessel_type(payload.get("vesselType"))
    management_company = str(payload.get("managementCompany", "")).strip()
    management_supervisor = str(payload.get("managementSupervisor", "")).strip()

    owner_supervisor = str(payload.get("ownerSupervisor", "")).strip()
    if owner_supervisor and owner_supervisor not in OWNER_SUPERVISORS:
        owner_supervisor = ""

    builder = str(payload.get("builder", "")).strip()
    size = str(payload.get("size", "")).strip()
    delivery_date = str(payload.get("deliveryDate", "")).strip()
    next_dry_dock = str(payload.get("nextDryDock", "")).strip()
    voyage_plan = str(payload.get("voyagePlan", "")).strip()

    cargo_status = normalize_cargo_status(payload.get("cargoStatus"))
    if vessel_type == "Container":
        cargo_status = ""

    latitude = safe_float(payload.get("latitude"))
    longitude = safe_float(payload.get("longitude"))

    fields: dict[str, Any] = {
        "name": name,
        "vessel_type": vessel_type,
        "management_company": management_company,
        "management_supervisor": management_supervisor,
        "owner_supervisor": owner_supervisor,
        "builder": builder,
        "size": size,
        "delivery_date": delivery_date,
        "next_dry_dock": next_dry_dock,
        "voyage_plan": voyage_plan,
        "cargo_status": cargo_status,
    }

    for i in range(1, 16):
        fields[f"issue_{i}"] = str(payload.get(f"issue{i}", "")).strip()
        fields[f"issue_{i}_critical"] = 1 if payload.get(f"issue{i}Critical") else 0

    for i in range(1, 11):
        fields[f"coc_type_{i}"] = str(payload.get(f"cocType{i}", "")).strip()
        fields[f"coc_summary_{i}"] = str(payload.get(f"cocSummary{i}", "")).strip()
        fields[f"coc_due_date_{i}"] = str(payload.get(f"cocDueDate{i}", "")).strip()

    for i in range(1, 6):
        if i > SIRE_COUNT or vessel_type == "Container":
            fields[f"sire_type_{i}"] = ""
            fields[f"sire_date_{i}"] = ""
            fields[f"sire_status_{i}"] = ""
            fields[f"sire_findings_{i}"] = ""
            fields[f"sire_open_findings_{i}"] = ""
        else:
            fields[f"sire_type_{i}"] = str(payload.get(f"sireType{i}", "")).strip()
            fields[f"sire_date_{i}"] = str(payload.get(f"sireDate{i}", "")).strip()
            fields[f"sire_status_{i}"] = normalize_sire_status(payload.get(f"sireStatus{i}"))
            fields[f"sire_findings_{i}"] = str(payload.get(f"sireFindings{i}", "")).strip()
            fields[f"sire_open_findings_{i}"] = str(payload.get(f"sireOpenFindings{i}", "")).strip()

    fields["condition_report_type"] = str(payload.get("conditionReportType", "")).strip()
    fields["condition_report_date"] = str(payload.get("conditionReportDate", "")).strip()
    fields["condition_report_status"] = normalize_sire_status(payload.get("conditionReportStatus"))
    fields["condition_report_findings"] = str(payload.get("conditionReportFindings", "")).strip()
    fields["condition_report_open_findings"] = str(payload.get("conditionReportOpenFindings", "")).strip()

    db = get_db()
    search_name = original_name if original_name else name
    existing = db.execute("""
        SELECT *
        FROM vessels
        WHERE LOWER(TRIM(name)) = LOWER(TRIM(?))
        LIMIT 1
    """, (search_name,)).fetchone()

    if existing:
        existing_dict = dict(existing)
        if latitude is None:
            latitude = existing_dict["latitude"]
        if longitude is None:
            longitude = existing_dict["longitude"]

        fields["latitude"] = latitude
        fields["longitude"] = longitude
        fields["updated_at"] = datetime.now().strftime("%Y-%m-%d %H:%M:%S")

        set_clause = ", ".join([f"{key} = ?" for key in fields.keys()])
        values = list(fields.values()) + [existing_dict["id"]]

        db.execute(
            f"UPDATE vessels SET {set_clause} WHERE id = ?",
            values,
        )
    else:
        fields["latitude"] = latitude
        fields["longitude"] = longitude

        columns = list(fields.keys())
        placeholders = ", ".join(["?"] * len(columns))
        column_sql = ", ".join(columns)

        db.execute(
            f"INSERT INTO vessels ({column_sql}) VALUES ({placeholders})",
            [fields[col] for col in columns],
        )

    db.commit()
    return no_cache_json({"success": True, "message": "저장되었습니다."})





@app.route("/api/vessel/delete", methods=["POST"])
def api_delete_single_vessel():
    payload = request.get_json(silent=True) or {}
    name = str(payload.get("name", "")).strip()
    password = str(payload.get("password", "")).strip()

    if not name:
        return no_cache_json({"success": False, "message": "선박명이 필요합니다."}, 400)

    if password != DELETE_PASSWORD:
        return no_cache_json({"success": False, "message": "비밀번호가 올바르지 않습니다."}, 403)

    db = get_db()
    existing = db.execute("""
        SELECT id
        FROM vessels
        WHERE LOWER(TRIM(name)) = LOWER(TRIM(?))
        LIMIT 1
    """, (name,)).fetchone()

    if not existing:
        return no_cache_json({"success": False, "message": "선박을 찾을 수 없습니다."}, 404)

    db.execute("DELETE FROM vessels WHERE id = ?", (existing["id"],))
    db.commit()
    return no_cache_json({"success": True, "message": "삭제되었습니다."})


@app.route("/api/upload-report", methods=["POST"])
def api_upload_report():
    vessel_name = str(request.form.get("vesselName", "")).strip()
    report_key = str(request.form.get("reportKey", "")).strip()
    file = request.files.get("file")

    if not vessel_name:
        return no_cache_json({"success": False, "message": "선박명이 필요합니다."}, 400)

    if report_key not in VALID_REPORT_KEYS:
        return no_cache_json({"success": False, "message": "유효하지 않은 Report 항목입니다."}, 400)

    if not file or not file.filename:
        return no_cache_json({"success": False, "message": "업로드할 파일이 없습니다."}, 400)

    if not allowed_file(file.filename, ALLOWED_REPORT_EXTENSIONS):
        return no_cache_json({"success": False, "message": "허용되지 않는 파일 형식입니다."}, 400)

    db = get_db()
    row = db.execute("""
        SELECT *
        FROM vessels
        WHERE LOWER(TRIM(name)) = LOWER(TRIM(?))
        LIMIT 1
    """, (vessel_name,)).fetchone()

    if not row:
        return no_cache_json({"success": False, "message": "선박을 찾을 수 없습니다."}, 404)

    vessel = dict(row)
    ext = file.filename.rsplit(".", 1)[1].lower()
    safe_name = secure_filename(vessel_name.replace(" ", "_"))
    stored_name = f"{safe_name}_{report_key}.{ext}"

    remove_old_report_file_if_needed(vessel, report_key)

    save_path = REPORT_UPLOAD_DIR / stored_name
    file.save(save_path)

    db.execute(
        f"UPDATE vessels SET {report_key} = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?",
        (stored_name, vessel["id"]),
    )
    db.commit()

    return no_cache_json({
        "success": True,
        "message": "Report 업로드 완료",
        "filename": stored_name,
        "reportKey": report_key,
    })



@app.route("/coc-report")
def coc_report_page():
    vessels = get_all_vessels()

    # 1️⃣ COC 데이터 있는 선박만 필터링
    vessels_with_coc = [
        v for v in vessels
        if any(
            str(v.get(f"coc_type_{i}", "")).strip()
            or str(v.get(f"coc_summary_{i}", "")).strip()
            or str(v.get(f"coc_due_date_{i}", "")).strip()
            for i in range(1, 11)
        )
    ]

    # 2️⃣ 실제 표시할 COC 열만 계산
    visible_coc_indexes = []
    for i in range(1, 11):
        has_data = any(
            str(v.get(f"coc_type_{i}", "")).strip()
            or str(v.get(f"coc_summary_{i}", "")).strip()
            or str(v.get(f"coc_due_date_{i}", "")).strip()
            for v in vessels_with_coc
        )
        if has_data:
            visible_coc_indexes.append(i)

    return render_template(
        "coc_report.html",
        version=get_version(),
        vessels=vessels_with_coc,  # 🔥 여기 변경됨
        total_count=len(vessels),  # 🔥 여기 변경됨
        loading_count=sum(
            1 for v in vessels_with_coc
            if v.get("vessel_type") == "Tanker" and v.get("cargo_status") == "Loading"
        ),
        ballast_count=sum(
            1 for v in vessels_with_coc
            if v.get("vessel_type") == "Tanker" and v.get("cargo_status") == "Ballast"
        ),
        container_count=sum(
            1 for v in vessels_with_coc
            if v.get("vessel_type") == "Container"
        ),
        visible_coc_indexes=visible_coc_indexes,
    )

@app.route("/sire-report")
def sire_report_page():
    vessels = get_all_vessels()

    # 1. SIRE 데이터가 하나라도 있는 선박만
    vessels_with_sire = [
        v for v in vessels
        if any(
            str(v.get(f"sire_type_{i}", "")).strip()
            or str(v.get(f"sire_date_{i}", "")).strip()
            or str(v.get(f"sire_status_{i}", "")).strip()
            or str(v.get(f"sire_findings_{i}", "")).strip()
            or str(v.get(f"sire_open_findings_{i}", "")).strip()
            for i in range(1, 4)
        )
    ]

    # 2. 실제 데이터가 있는 SIRE 열만 표시
    visible_sire_indexes = []
    for i in range(1, 4):
        has_data = any(
            str(v.get(f"sire_type_{i}", "")).strip()
            or str(v.get(f"sire_date_{i}", "")).strip()
            or str(v.get(f"sire_status_{i}", "")).strip()
            or str(v.get(f"sire_findings_{i}", "")).strip()
            or str(v.get(f"sire_open_findings_{i}", "")).strip()
            for v in vessels_with_sire
        )
        if has_data:
            visible_sire_indexes.append(i)

    # 3. SIRE 진행중 선박 수
    sire_progress_count = sum(
        1 for v in vessels_with_sire
        if any(
            str(v.get(f"sire_status_{i}", "")).strip() == "결함조치 중"
            for i in range(1, 4)
        )
    )

    return render_template(
        "sire_report.html",
        version=get_version(),
        vessels=vessels_with_sire,
        total_count=len(vessels),  # 전체 등록 선박
        sire_vessel_count=len(vessels_with_sire),  # SIRE 데이터 보유 선박
        sire_progress_count=sire_progress_count,
        visible_sire_indexes=visible_sire_indexes,
    )



@app.route("/condition-report")
def condition_report_page():
    vessels = get_all_vessels()

    vessels_with_condition = [
        v for v in vessels
        if str(v.get("condition_report_type", "")).strip()
        or str(v.get("condition_report_date", "")).strip()
        or str(v.get("condition_report_status", "")).strip()
        or str(v.get("condition_report_findings", "")).strip()
        or str(v.get("condition_report_open_findings", "")).strip()
    ]

    condition_report_count = len(vessels_with_condition)
    condition_progress_count = sum(
        1 for v in vessels_with_condition
        if str(v.get("condition_report_status", "")).strip() == "결함조치 중"
    )

    return render_template(
        "condition_report.html",
        version=get_version(),
        vessels=vessels_with_condition,
        total_count=len(vessels),
        condition_report_count=condition_report_count,
        condition_progress_count=condition_progress_count,
    )



@app.route("/api/upload-positions", methods=["POST"])
def api_upload_positions():
    file = request.files.get("file")

    if not file or not file.filename:
        return no_cache_json({"success": False, "message": "엑셀 파일이 없습니다."}, 400)

    if not allowed_file(file.filename, ALLOWED_POSITION_EXTENSIONS):
        return no_cache_json({"success": False, "message": "xlsx 파일만 업로드 가능합니다."}, 400)

    try:
        workbook = load_workbook(file, data_only=True)
        worksheet = workbook.active

        latest_by_name, total_rows, invalid_count = pick_latest_rows_by_vessel(worksheet)

        db = get_db()
        updated_count = 0
        not_found_count = 0

        for _, row in latest_by_name.items():
            existing = db.execute("""
                SELECT id
                FROM vessels
                WHERE LOWER(TRIM(name)) = LOWER(TRIM(?))
                LIMIT 1
            """, (row["name"],)).fetchone()

            if not existing:
                not_found_count += 1
                continue

            db.execute("""
                UPDATE vessels
                SET latitude = ?, longitude = ?, updated_at = CURRENT_TIMESTAMP
                WHERE id = ?
            """, (
                row["latitude"],
                row["longitude"],
                existing["id"],
            ))
            updated_count += 1

        db.commit()

        return no_cache_json({
            "success": True,
            "message": "위치 업데이트 완료",
            "totalRows": total_rows,
            "updatedCount": updated_count,
            "notFoundCount": not_found_count,
            "invalidCount": invalid_count,
        })
    except ValueError as e:
        return no_cache_json({"success": False, "message": str(e)}, 400)
    except Exception as e:
        return no_cache_json({"success": False, "message": f"엑셀 처리 실패: {e}"}, 500)


@app.route("/uploads/reports/<path:filename>")
def serve_report_file(filename: str):
    response = send_from_directory(REPORT_UPLOAD_DIR, filename, as_attachment=False)
    response.headers["Cache-Control"] = "no-store, no-cache, must-revalidate, max-age=0"
    response.headers["Pragma"] = "no-cache"
    response.headers["Expires"] = "0"
    return response


@app.errorhandler(413)
def file_too_large(_error):
    return no_cache_json({"success": False, "message": "파일 용량이 너무 큽니다."}, 413)


init_db()

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=8000, debug=True)