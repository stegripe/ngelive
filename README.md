# ngelive

**Production-Ready RTMP Live Stream Manager**

A modern web-based platform for managing RTMP live streams with video playlist management, user authentication, and admin controls. Built with Next.js, TypeScript, Prisma, and SQLite.

## 🚀 Features

- **Live Streaming**: Stream to any RTMP endpoint (YouTube, Twitch, etc.)
- **Video Library**: Upload and manage video playlists
- **User Management**: Role-based access control (Admin/User)
- **Real-time Updates**: Live UI updates via Server-Sent Events (SSE)
- **Responsive Design**: Works on desktop and mobile
- **SQLite Database**: Lightweight, no external database required

## 🛠️ Quick Start

### Using Docker (Recommended)

1. Clone and configure:
   ```bash
   git clone https://github.com/stegripe/ngelive.git
   cd ngelive
   cp .env.example .env
   # Edit .env with your settings
   ```

2. Start the application:
   ```bash
   docker compose up -d --build
   docker compose exec app pnpm db:push
   docker compose exec app pnpm db:seed
   ```

3. Access: http://localhost:3000

### Manual Installation

1. Prerequisites:
   - Node.js 20+
   - pnpm (npm also works)
   - FFmpeg (for streaming)

2. Install and run:
   ```bash
   pnpm install
   pnpm build
   pnpm db:push
   pnpm db:seed
   pnpm start
   ```

## ⚙️ Configuration (.env)

| Variable | Description | Default |
|----------|-------------|---------|
| `JWT_SECRET` | Secret for JWT tokens | (required) |
| `ADMIN_EMAIL` | Initial admin email | `admin@ngelive.stegripe.org` |
| `ADMIN_PASSWORD` | Initial admin password | `admin123` |
| `MAX_FILE_SIZE` | Max upload size (bytes) | `2147483648` (2GB) |

> ⚠️ **Important**: Change `JWT_SECRET` and `ADMIN_PASSWORD` before production!

## 👤 Default Accounts

| Role | Email | Password |
|------|-------|----------|
| Admin | admin@ngelive.stegripe.org | admin123 |
| User | user@ngelive.stegripe.org | user123 |

## 🔧 Troubleshooting

- **Login failed?** Ensure database is initialized (`pnpm db:push && pnpm db:seed`)
- **Reset everything**: `docker compose down -v && docker compose up -d --build`
- **Check logs**: `docker compose logs -f app`

## 📁 Project Structure

```
ngelive/
├── prisma/          # Database schema and migrations
├── src/
│   ├── app/         # Next.js App Router pages
│   ├── components/  # React components
│   ├── hooks/       # Custom React hooks
│   ├── lib/         # Utilities and services
│   └── types/       # TypeScript types
├── cache/           # Data storage (auto-created)
│   ├── data.db      # SQLite database
│   └── video/       # Uploaded video files
└── docker-compose.yaml
```

AGPL-3.0 License | [Stegripe Development](https://stegripe.org)
