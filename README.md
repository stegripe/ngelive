# ngelive

A web-based platform for managing RTMP live streams with video playlist management, user authentication, and admin controls.

## Features

- 🎥 **RTMP Stream Management** - Create and manage multiple RTMP streams
- 📹 **Video Upload & Management** - Upload videos and assign them to streams
- 👥 **User Management** - Admin can manage users and their RTMP quotas
- 🔐 **JWT Authentication** - Secure login system
- 📱 **Responsive Design** - Works on desktop and mobile
- 🐳 **Dockerized** - Easy deployment with Docker
- 🔄 **Auto-looping Streams** - Automatic playlist looping with FFmpeg

## Tech Stack

- **Backend**: Node.js, TypeScript, Express, Prisma, MariaDB
- **Frontend**: React, Next.js, Tailwind CSS
- **Database**: MariaDB
- **Streaming**: FFmpeg
- **Code Quality**: Biome
- **Package Manager**: pnpm

## Quick Start

#### FFmpeg Requirements

FFmpeg must be installed on the system for video processing and streaming functionality.

### Development

1. **Clone the repository**
   ```bash
   git clone https://github.com/stegripe/ngelive
   cd ngelive
   ```

2. **Install dependencies**
   ```bash
   pnpm install
   cd frontend
   pnpm install
   cd ..
   ```

3. **Configure environment**
   ```bash
   cp .env.example .env
   # Edit .env with your configuration
   ```

4. **Start database (using Docker)**
   ```bash
   docker-compose up -d mariadb
   ```

5. **Setup database**
   ```bash
   pnpm db:generate
   pnpm db:push
   pnpm db:seed
   ```

6. **Start development server**
   ```bash
   pnpm dev
   ```

### Production (Docker)

1. **Build and run**
   ```bash
   docker-compose up -d
   ```

2. **Access the application**
   - Frontend: http://localhost:3000
   - API: http://localhost:3000/api

## Default Credentials

- **Admin**: admin@stegripe.org / admin123
- **User**: user@stegripe.org / user123

## API Endpoints

### Authentication
- `POST /api/auth/login` - Login
- `POST /api/auth/register` - Register
- `GET /api/auth/profile` - Get profile
- `PUT /api/auth/profile` - Update profile

### Users (Admin only)
- `GET /api/users` - Get all users
- `GET /api/users/:id` - Get user by ID
- `POST /api/users` - Create user
- `PUT /api/users/:id` - Update user
- `DELETE /api/users/:id` - Delete user

### RTMP Streams
- `GET /api/rtmp` - Get streams
- `GET /api/rtmp/:id` - Get stream by ID
- `POST /api/rtmp` - Create stream
- `PUT /api/rtmp/:id` - Update stream
- `DELETE /api/rtmp/:id` - Delete stream
- `POST /api/rtmp/:id/start` - Start stream
- `POST /api/rtmp/:id/stop` - Stop stream
- `POST /api/rtmp/:id/assign-videos` - Assign videos to stream

### Videos
- `GET /api/videos` - Get videos
- `GET /api/videos/:id` - Get video by ID
- `POST /api/videos/upload` - Upload video
- `DELETE /api/videos/:id` - Delete video
- `GET /api/videos/:id/download` - Download video

## Configuration

### Environment Variables

- `DATABASE_URL` `MYSQL_*` - MariaDB connection string
- `JWT_SECRET` - Secret key for JWT tokens
- `UPLOAD_PATH` - Directory for uploaded videos
- `MAX_FILE_SIZE` - Maximum file size for uploads (bytes)
- `PORT` - Server port (default: 3000)
- `NODE_ENV` - Environment (development/production)

## Development

### Code Quality

This project uses Biome for code formatting and linting:

```bash
# Lint code
pnpm run lint

# Format code
pnpm run lint:fix
```

### Database Migration

```bash
# Generate Prisma client
pnpm db:generate

# Push schema changes
pnpm db:push

# Reset database
pnpm db:reset

# Seed database
pnpm db:seed
```

## License

This project is developed by **Stegripe Development**.

## Support

For issues and questions, please contact us.
