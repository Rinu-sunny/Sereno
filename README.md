# Sereno

Sereno is a Pomodoro productivity app for focused work, task tracking, and personal productivity insights.
It lets users sign in, run timer sessions, manage tasks, and view analytics and streak progress.
## Team members
  - Rinu Sunny Mathew
  - Swantin Jo Mathew
  - Tanmay Suresh
  - Adarsh K P
## Features

- Pomodoro timer with work, short-break, and long-break modes
- Start, pause, skip, and complete session actions
- Task CRUD operations and task reordering
- Session-based analytics (daily, weekly, monthly)
- Tag-based task completion breakdown
- User settings for durations, notifications, and alarm sound
- Protected routes and authenticated API access

## Tech Stack

### Frontend

- React 18
- TypeScript
- Vite
- Tailwind CSS
- shadcn/ui + Radix UI
- React Router
- Axios

### Backend

- ASP.NET Core Web API (.NET 9)
- Entity Framework Core 9
- PostgreSQL (Supabase-hosted)
- JWT Bearer authentication
- Swagger/OpenAPI

## Complete Setup

### Prerequisites

- Node.js 20+
- npm 10+
- .NET SDK 9.0+
- Database + auth configuration available in backend app settings

### 1) Clone and enter project

```bash
git clone <your-repo-url>
cd Sereno
```

### 2) Install frontend dependencies

```bash
npm install
```

### 3) Confirm backend configuration

Verify these files exist and have valid values:

- Sereno/appsettings.json
- Sereno/appsettings.Development.json

Required backend keys:

- ConnectionStrings:DefaultConnection
- Authentication:SupabaseJwtSecret
- Authentication:SupabaseIssuer

## How to Run the Program

Run backend and frontend in separate terminals from the repository root.

### Terminal 1: Start backend API

```bash
dotnet run --project Sereno/Sereno.csproj
```

Backend URLs:

- http://localhost:5000
- https://localhost:5001
- Swagger: https://localhost:5001/swagger

### Terminal 2: Start frontend app

```bash
npm run dev
```

Frontend URL:

- http://localhost:8080

### Open the app

- Visit http://localhost:8080
- Sign in or create an account
- Start a timer session and use tasks/dashboard/settings

If local HTTPS certificate trust fails in development, use the HTTP backend URL (http://localhost:5000) where applicable.
