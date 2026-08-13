# System Architecture

## Technical Stack
- **Frontend SPA:** React 18, Vite, HashRouter, TailwindCSS, shadcn/ui, TanStack Query, Recharts, Leaflet.
- **Backend Gateway:** NestJS, Prisma ORM, Socket.io.
- **AI Calculator:** FastAPI (Python), Groq SDK (Llama 3.3 70b), NASA Climatology API.
- **Database:** MySQL.

```
                  ┌──────────────────────────────┐
                  │      React SPA Frontend      │
                  │   Vite + TS + TailwindCSS    │
                  └──────────────┬───────────────┘
                                 │ HTTP / WebSockets
                                 ▼
                  ┌──────────────────────────────┐
                  │    NestJS Gateway Backend    │
                  │     REST APIs + Socket.IO    │
                  └──────────────┬───────────────┘
                                 │ Prisma ORM
                                 ▼
                  ┌──────────────┴──────────────┐      ┌──────────────────────────────┐
                  │      MySQL Database         │ ◄─── │       Python AI Engine       │
                  │   35 Normalized Tables      │      │     FastAPI + Groq + NASA    │
                  └─────────────────────────────┘      └──────────────────────────────┘
```
