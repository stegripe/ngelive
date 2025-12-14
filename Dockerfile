# Base image
FROM node:22-alpine AS base
WORKDIR /app

# Install FFmpeg and pnpm
RUN apk add --no-cache ffmpeg
RUN npm install -g pnpm

# --- Dependencies layer (only install, no build) ---
FROM base AS deps

COPY package.json pnpm-lock.yaml ./
COPY frontend/package.json frontend/pnpm-lock.yaml ./frontend/
RUN pnpm install --frozen-lockfile
RUN pnpm --filter ./frontend... install --frozen-lockfile

# --- Builder layer ---
FROM deps AS builder

COPY . .
RUN pnpm db:generate
RUN pnpm build

# --- Runner / Production image ---
FROM base AS runner

# Copy node_modules and built artifacts from builder
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/frontend/node_modules ./frontend/node_modules
COPY --from=builder /app/backend/dist ./backend/dist
COPY --from=builder /app/frontend/.next ./frontend/.next
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/package.json ./
COPY --from=builder /app/frontend/package.json ./frontend

# Create non-root user
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# Create directories
RUN mkdir -p uploads
RUN chown -R nextjs:nodejs /app

USER nextjs

# Expose port
EXPOSE 3000

# Start the application
CMD ["node", "backend/dist/index.js"]
