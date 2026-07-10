# Peachtree Finance PC Uploader

This script runs on the finance desktop beside Peachtree 2010. It watches a folder where Peachtree exports accounting files and uploads new or changed files to the SolarFlow backend.

## Setup

```powershell
py -m pip install requests
py peachtree_uploader.py `
  --api-url http://localhost:4000/api/v1 `
  --watch-dir "C:\PeachtreeExports" `
  --company FZ `
  --username manager `
  --password 123 `
  --interval-seconds 300
```

Use a dedicated service user before production. The current command is for local development only.

## Flow

1. Peachtree 2010 exports CSV/TXT/TSV/DAT/XML files into the watched folder.
2. The script checks the folder every few minutes.
3. New file checksums are uploaded to `/api/v1/peachtree/imports/upload`.
4. The finance Peachtree Bridge page displays the parsed data and import history.

## Offline behavior

The script keeps a local SQLite database at `.peachtree-uploader/upload_queue.sqlite3`.

- New or changed files are marked `pending`.
- Successful uploads are marked `uploaded`.
- Network/server failures stay `pending` with `retry_count` and `last_error`.
- When the backend is reachable again, pending files are retried automatically.
