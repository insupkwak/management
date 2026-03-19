CREATE TABLE IF NOT EXISTS vessels (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL UNIQUE,
    management_company TEXT NOT NULL DEFAULT '',
    management_supervisor TEXT NOT NULL DEFAULT '',
    
    
    builder TEXT NOT NULL DEFAULT '',
    delivery_date TEXT NOT NULL DEFAULT '',
    next_dry_dock TEXT NOT NULL DEFAULT '',
    voyage_plan TEXT NOT NULL DEFAULT '',
    cargo_status TEXT NOT NULL DEFAULT 'Ballast',

    issue_1 TEXT NOT NULL DEFAULT '',
    issue_1_critical INTEGER NOT NULL DEFAULT 0,
    issue_2 TEXT NOT NULL DEFAULT '',
    issue_2_critical INTEGER NOT NULL DEFAULT 0,
    issue_3 TEXT NOT NULL DEFAULT '',
    issue_3_critical INTEGER NOT NULL DEFAULT 0,
    issue_4 TEXT NOT NULL DEFAULT '',
    issue_4_critical INTEGER NOT NULL DEFAULT 0,
    issue_5 TEXT NOT NULL DEFAULT '',
    issue_5_critical INTEGER NOT NULL DEFAULT 0,
    issue_6 TEXT NOT NULL DEFAULT '',
    issue_6_critical INTEGER NOT NULL DEFAULT 0,
    issue_7 TEXT NOT NULL DEFAULT '',
    issue_7_critical INTEGER NOT NULL DEFAULT 0,
    issue_8 TEXT NOT NULL DEFAULT '',
    issue_8_critical INTEGER NOT NULL DEFAULT 0,
    issue_9 TEXT NOT NULL DEFAULT '',
    issue_9_critical INTEGER NOT NULL DEFAULT 0,
    issue_10 TEXT NOT NULL DEFAULT '',
    issue_10_critical INTEGER NOT NULL DEFAULT 0,

    issue_11 TEXT NOT NULL DEFAULT '',
    issue_11_critical INTEGER NOT NULL DEFAULT 0,
    issue_12 TEXT NOT NULL DEFAULT '',
    issue_12_critical INTEGER NOT NULL DEFAULT 0,
    issue_13 TEXT NOT NULL DEFAULT '',
    issue_13_critical INTEGER NOT NULL DEFAULT 0,
    issue_14 TEXT NOT NULL DEFAULT '',
    issue_14_critical INTEGER NOT NULL DEFAULT 0,
    issue_15 TEXT NOT NULL DEFAULT '',
    issue_15_critical INTEGER NOT NULL DEFAULT 0,

    latitude REAL,
    longitude REAL,

    report1_file TEXT NOT NULL DEFAULT '',
    report2_file TEXT NOT NULL DEFAULT '',
    report3_file TEXT NOT NULL DEFAULT '',
    report4_file TEXT NOT NULL DEFAULT '',
    report5_file TEXT NOT NULL DEFAULT '',

    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_vessels_name ON vessels(name);
CREATE INDEX IF NOT EXISTS idx_vessels_cargo_status ON vessels(cargo_status);
