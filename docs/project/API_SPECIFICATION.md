# API Specification

- **`/auth/`**: JWT Login, sign-up, refresh token exchanges.
- **`/sync/`**: Push offline mutations (`/sync/push`), pull updates, conflict list (`/sync/conflicts`).
- **`/sizing/`**: Hydraulic recommendations, NASA insolation fetching, Groq recommendation.
- **`/fieldwork/`**: Create sizing requests, assign field work jobs, post daily reports, log returned equipment.
- **`/assets/`**: Manage company warehouse assets, checkouts, and repairs.
- **`/chat/`**: Socket.io channels, direct messaging, message histories.
- **`/peachtree/`**: CSV parsing and ledger matching templates.
