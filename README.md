# ngelive

<div align="center">

**RTMP Live Stream Manager with Video Playlist**

*by [Stegripe Development](https://stegripe.org)*

</div>

---

## Features

- 🎥 RTMP Stream Management
- 📹 Video Upload & Playlist
- 👥 User & Quota Management
- 🔐 JWT Authentication
- 🐳 Docker Ready

## Tech Stack

Next.js 14 • Prisma + MariaDB • Tailwind CSS • FFmpeg

---

## Quick Start

### Using Docker (Recommended)

```bash
# 1. Clone & configure
git clone https://github.com/stegripe/ngelive
cd ngelive
cp .env.example .env

# 2. Start
docker compose up -d
```

Open http://localhost:3000

### Development

```bash
pnpm install
pnpm docker:dev    # Start database
pnpm db:push       # Setup schema
pnpm db:seed       # Create admin user
pnpm dev           # Start dev server
```

---

## Default Login

| Role | Email | Password |
|------|-------|----------|
| Admin | admin@stegripe.org | admin123 |
| User | user@stegripe.org | user123 |

---

## Environment Variables

```env
DATABASE_URL=mysql://user:pass@host:3306/ngelive
JWT_SECRET=your_secret_key
UPLOAD_PATH=./uploads
MAX_FILE_SIZE=2147483648
```

---

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/login` | Login |
| POST | `/api/auth/register` | Register |
| GET | `/api/rtmp` | List streams |
| POST | `/api/rtmp` | Create stream |
| POST | `/api/rtmp/:id/start` | Start stream |
| POST | `/api/rtmp/:id/stop` | Stop stream |
| POST | `/api/videos/upload` | Upload video |
| GET | `/api/users` | List users (admin) |

---

## License

MIT - [Stegripe Development](https://stegripe.org)
