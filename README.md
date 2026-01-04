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
- 👥 **User Management** - Admin dashboard with user quota management
- 🔐 **JWT Authentication** - Secure API with JWT tokens
- 🐳 **Docker Ready** - Easy deployment with Docker

## Tech Stack

- **Framework**: Next.js 14 (App Router)
- **Database**: Prisma ORM + MariaDB/MySQL
- **Styling**: Tailwind CSS
- **Streaming**: FFmpeg
- **Auth**: JWT (jsonwebtoken)

---

## Prerequisites

- Node.js 20+ (or use Docker)
- pnpm 10+
- MariaDB/MySQL database
- FFmpeg installed on system

---

## Installation

### 1. Clone Repository

```bash
git clone https://github.com/stegripe/ngelive.git
cd ngelive
```

### 2. Install Dependencies

```bash
pnpm install
```

### 3. Configure Environment

```bash
cp .env.example .env
```

Edit `.env` with your configuration:

```env
# Database
DATABASE_URL="mysql://username:password@localhost:3306/ngelive"

# JWT Secret (generate a random string)
JWT_SECRET="your-super-secret-key-here"

# Upload settings
UPLOAD_PATH="./uploads"
MAX_FILE_SIZE=2147483648  # 2GB in bytes
```

### 4. Setup Database

```bash
# Generate Prisma client
pnpm db:generate

# Push schema to database
pnpm db:push

# Seed default users (optional)
pnpm db:seed
```

### 5. Run Application

**Development:**
```bash
pnpm dev
```

**Production:**
```bash
pnpm build
pnpm start
```

Open http://localhost:3000

---

## Development with Docker Database

If you want to use Docker only for the database during development:

```bash
# Start MariaDB container
pnpm docker:dev

# Run migrations
pnpm db:push

# Seed data
pnpm db:seed

# Start dev server
pnpm dev

# Stop database when done
pnpm docker:dev:down
```

---

## Production Deployment

### Option 1: Manual Deployment (Recommended for VPS)

1. **Install FFmpeg** on your server:
   ```bash
   # Ubuntu/Debian
   sudo apt update && sudo apt install ffmpeg

   # Alpine
   apk add ffmpeg

   # macOS
   brew install ffmpeg
   ```

2. **Setup Node.js environment**:
   ```bash
   # Install dependencies
   pnpm install --frozen-lockfile

   # Generate Prisma client
   pnpm db:generate

   # Build application
   pnpm build

   # Run database migrations
   pnpm db:push
   ```

3. **Start with process manager** (recommended: PM2):
   ```bash
   # Install PM2
   npm install -g pm2

   # Start application
   pm2 start npm --name "ngelive" -- start

   # Auto-restart on reboot
   pm2 startup
   pm2 save
   ```

### Option 2: Docker Compose (Full Stack)

```bash
# Clone and configure
git clone https://github.com/stegripe/ngelive.git
cd ngelive
cp .env.example .env

# Edit .env with production values

# Build and start all services
docker compose up -d

# Check logs
docker compose logs -f
```

### Option 3: Docker Image Only (External Database)

If you have an external database:

```bash
# Build image
docker build -t ngelive .

# Run container
docker run -d \
  --name ngelive \
  -p 3000:3000 \
  -e DATABASE_URL="mysql://user:pass@host:3306/ngelive" \
  -e JWT_SECRET="your-secret" \
  -v ./uploads:/app/uploads \
  ngelive
```

---

## Default Credentials

After running `pnpm db:seed`:

| Role | Email | Password |
|------|-------|----------|
| Admin | admin@stegripe.org | admin123 |
| User | user@stegripe.org | user123 |

> ⚠️ **Important**: Change these credentials in production!

---

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `DATABASE_URL` | MySQL/MariaDB connection string | Required |
| `JWT_SECRET` | Secret key for JWT tokens | Required |
| `UPLOAD_PATH` | Directory for uploaded videos | `./uploads` |
| `MAX_FILE_SIZE` | Maximum upload size in bytes | `2147483648` (2GB) |
| `PORT` | Application port | `3000` |

---

## API Reference

### Authentication

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/auth/login` | Login with email/password |
| `POST` | `/api/auth/register` | Register new user |
| `GET` | `/api/auth/profile` | Get current user profile |

### RTMP Streams

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/rtmp` | List user's streams |
| `POST` | `/api/rtmp` | Create new stream |
| `GET` | `/api/rtmp/:id` | Get stream details |
| `PUT` | `/api/rtmp/:id` | Update stream |
| `DELETE` | `/api/rtmp/:id` | Delete stream |
| `POST` | `/api/rtmp/:id/start` | Start streaming |
| `POST` | `/api/rtmp/:id/stop` | Stop streaming |
| `POST` | `/api/rtmp/:id/videos` | Add video to stream |
| `DELETE` | `/api/rtmp/:id/videos/:videoId` | Remove video from stream |
| `PUT` | `/api/rtmp/:id/reorder` | Reorder playlist |

### Videos

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/videos` | List user's videos |
| `POST` | `/api/videos` | Upload new video |
| `GET` | `/api/videos/:id` | Get video details |
| `DELETE` | `/api/videos/:id` | Delete video |
| `GET` | `/api/videos/:id/stream` | Stream video file |

### Users (Admin only)

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/users` | List all users |
| `POST` | `/api/users` | Create user |
| `PUT` | `/api/users/:id` | Update user |
| `DELETE` | `/api/users/:id` | Delete user |

---

## Project Structure

```
ngelive/
├── src/
│   ├── app/              # Next.js App Router pages
│   │   ├── api/          # API routes
│   │   ├── admin/        # Admin pages
│   │   ├── dashboard/    # Dashboard page
│   │   ├── login/        # Login page
│   │   ├── rtmp/         # RTMP management page
│   │   └── videos/       # Video management page
│   ├── components/       # React components
│   ├── hooks/            # Custom React hooks
│   ├── lib/              # Utility libraries
│   ├── providers/        # React context providers
│   └── types/            # TypeScript types
├── prisma/
│   ├── schema.prisma     # Database schema
│   └── seed.ts           # Database seeder
├── public/               # Static files
├── uploads/              # Uploaded videos (gitignored)
└── docker-compose.yaml   # Docker Compose config
```

---

## Troubleshooting

### FFmpeg not found
Make sure FFmpeg is installed and available in PATH:
```bash
ffmpeg -version
```

### Database connection failed
1. Check `DATABASE_URL` in `.env`
2. Ensure database server is running
3. Verify credentials and database exists

### Upload fails
1. Check `UPLOAD_PATH` directory exists and is writable
2. Verify file size is within `MAX_FILE_SIZE` limit
3. Check disk space

### Stream not starting
1. Verify RTMP URL is correct
2. Check FFmpeg logs in console
3. Ensure video files exist in uploads folder

---

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

---

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

<div align="center">

Made with ❤️ by [Stegripe Development](https://stegripe.org)

</div>
