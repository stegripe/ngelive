# ngelive

<div align="center">

**RTMP Live Stream Manager with Video Playlist**

*by [Stegripe Development](https://stegripe.org)*

</div>

---

## Features

- 🎥 **RTMP Stream Management** - Create and manage multiple RTMP streams
- 📹 **Video Playlist** - Upload videos and create playlists for each stream
- 🔄 **Loop & Shuffle** - Automatically loop and shuffle video playlists

# ngelive

**Production Deployment Guide**

---

## 1. Manual VPS (Recommended)

1. Install dependencies:
   - Node.js 20+, pnpm 10+, FFmpeg, MariaDB/MySQL
2. Clone & setup:
   ```bash
   git clone https://github.com/stegripe/ngelive.git
   cd ngelive
   pnpm install --frozen-lockfile
   cp .env.example .env # Edit .env for your DB & secrets
   pnpm db:generate && pnpm db:push && pnpm db:seed
   pnpm build
   pnpm start
   # Or use PM2 for process management
   ```

---

## 2. Docker (All-in-One)

1. Edit `.env` for production values.
2. Start with Docker Compose:
   ```bash
   docker compose up -d
   # or build image only:
   # docker build -t ngelive .
   # docker run -d --name ngelive -p 3000:3000 --env-file .env ngelive
   ```

---

- Access: http://your-server:3000
- Default admin: admin@stegripe.org / admin123 (change after deploy!)
- For troubleshooting: ensure DB & FFmpeg are running, check .env values.

---

MIT License | Stegripe Development

