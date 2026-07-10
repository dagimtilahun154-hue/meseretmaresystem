# SolarFlow Backend

Enterprise NestJS backend for SolarFlow Manager.

## Setup

1. Copy `.env.example` to `.env`.
2. Set `DATABASE_URL` for MySQL.
3. Install dependencies: `npm install`.
4. Generate Prisma client: `npm run prisma:generate`.
5. Run migrations: `npm run prisma:migrate`.
6. Seed defaults: `npm run seed`.
7. Start API: `npm run start:dev`.

Default API base URL: `http://localhost:4000/api/v1`.
