import argparse
import hashlib
import sqlite3
import time
from datetime import datetime, timezone
from pathlib import Path

import requests


SUPPORTED_EXTENSIONS = {".csv", ".txt", ".tsv", ".tab", ".dat", ".xml"}


def utc_now() -> str:
    return datetime.now(timezone.utc).isoformat()


def sha256_file(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for chunk in iter(lambda: handle.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def connect_queue(path: Path) -> sqlite3.Connection:
    path.parent.mkdir(parents=True, exist_ok=True)
    conn = sqlite3.connect(path)
    conn.row_factory = sqlite3.Row
    conn.execute(
        """
        CREATE TABLE IF NOT EXISTS upload_queue (
            path TEXT PRIMARY KEY,
            file_name TEXT NOT NULL,
            checksum TEXT NOT NULL,
            company TEXT NOT NULL,
            status TEXT NOT NULL DEFAULT 'pending',
            retry_count INTEGER NOT NULL DEFAULT 0,
            last_error TEXT,
            last_seen_at TEXT NOT NULL,
            uploaded_at TEXT
        )
        """
    )
    conn.commit()
    return conn


def upsert_detected_file(conn: sqlite3.Connection, company: str, path: Path, checksum: str) -> None:
    existing = conn.execute("SELECT checksum, status FROM upload_queue WHERE path = ?", (str(path),)).fetchone()
    if existing and existing["checksum"] == checksum and existing["status"] == "uploaded":
        conn.execute("UPDATE upload_queue SET last_seen_at = ? WHERE path = ?", (utc_now(), str(path)))
    else:
        conn.execute(
            """
            INSERT INTO upload_queue(path, file_name, checksum, company, status, retry_count, last_seen_at)
            VALUES (?, ?, ?, ?, 'pending', 0, ?)
            ON CONFLICT(path) DO UPDATE SET
              file_name = excluded.file_name,
              checksum = excluded.checksum,
              company = excluded.company,
              status = CASE WHEN upload_queue.checksum = excluded.checksum THEN upload_queue.status ELSE 'pending' END,
              last_seen_at = excluded.last_seen_at
            """,
            (str(path), path.name, checksum, company, utc_now()),
        )
    conn.commit()


def mark_uploaded(conn: sqlite3.Connection, path: str) -> None:
    conn.execute(
        "UPDATE upload_queue SET status = 'uploaded', uploaded_at = ?, last_error = NULL WHERE path = ?",
        (utc_now(), path),
    )
    conn.commit()


def mark_failed(conn: sqlite3.Connection, path: str, error: str) -> None:
    conn.execute(
        """
        UPDATE upload_queue
        SET status = 'pending', retry_count = retry_count + 1, last_error = ?
        WHERE path = ?
        """,
        (error[:1000], path),
    )
    conn.commit()


def pending_files(conn: sqlite3.Connection):
    return conn.execute(
        """
        SELECT * FROM upload_queue
        WHERE status != 'uploaded'
        ORDER BY retry_count ASC, last_seen_at ASC
        """
    ).fetchall()


def login(api_url: str, username: str, password: str) -> str:
    response = requests.post(
        f"{api_url}/auth/login",
        json={"username": username, "password": password},
        timeout=30,
    )
    response.raise_for_status()
    return response.json()["accessToken"]


def upload_file(api_url: str, token: str, company: str, path: Path) -> dict:
    with path.open("rb") as handle:
        response = requests.post(
            f"{api_url}/peachtree/imports/upload",
            headers={"Authorization": f"Bearer {token}"},
            data={"company": company, "source": "finance-pc-agent"},
            files={"file": (path.name, handle, "application/octet-stream")},
            timeout=120,
        )
    response.raise_for_status()
    return response.json()


def iter_export_files(folder: Path):
    for path in sorted(folder.rglob("*")):
        if path.is_file() and path.suffix.lower() in SUPPORTED_EXTENSIONS:
            yield path


def scan_folder(conn: sqlite3.Connection, watch_dir: Path, company: str) -> None:
    for path in iter_export_files(watch_dir):
        upsert_detected_file(conn, company, path, sha256_file(path))


def drain_queue(conn: sqlite3.Connection, args, token: str) -> str:
    for row in pending_files(conn):
        path = Path(row["path"])
        if not path.exists():
            mark_failed(conn, row["path"], "File no longer exists on disk.")
            continue

        try:
            result = upload_file(args.api_url, token, row["company"], path)
            mark_uploaded(conn, row["path"])
            status = "duplicate" if result.get("duplicate") else "uploaded"
            print(f"{status}: {path.name}")
        except requests.HTTPError as error:
            if error.response is not None and error.response.status_code == 401:
                token = login(args.api_url, args.username, args.password)
                result = upload_file(args.api_url, token, row["company"], path)
                mark_uploaded(conn, row["path"])
                status = "duplicate" if result.get("duplicate") else "uploaded"
                print(f"{status}: {path.name}")
            else:
                mark_failed(conn, row["path"], str(error))
        except requests.RequestException as error:
            mark_failed(conn, row["path"], str(error))
            break

    return token


def run(args):
    watch_dir = Path(args.watch_dir)
    conn = connect_queue(Path(args.queue_db))
    token = login(args.api_url, args.username, args.password)

    while True:
        scan_folder(conn, watch_dir, args.company)
        token = drain_queue(conn, args, token)
        time.sleep(args.interval_seconds)


def parse_args():
    parser = argparse.ArgumentParser(description="Upload Peachtree 2010 export files to SolarFlow ERP.")
    parser.add_argument("--api-url", default="http://localhost:4000/api/v1")
    parser.add_argument("--watch-dir", required=True)
    parser.add_argument("--company", choices=["FZ", "MM"], required=True)
    parser.add_argument("--username", required=True)
    parser.add_argument("--password", required=True)
    parser.add_argument("--interval-seconds", type=int, default=300)
    parser.add_argument("--queue-db", default=".peachtree-uploader/upload_queue.sqlite3")
    return parser.parse_args()


if __name__ == "__main__":
    run(parse_args())
