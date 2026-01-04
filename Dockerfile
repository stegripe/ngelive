# Base image
FROM node:20-alpine AS base
WORKDIR /app

# Install FFmpeg
RUN apk add --no-cache ffmpeg

# Enable corepack and install pnpm with specific version
RUN corepack enable && corepack prepare pnpm@10.12.1 --activate

# --- Dependencies layer ---
FROM base AS deps
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile

# --- Builder layer ---
FROM deps AS builder
COPY . .
ENV STANDALONE=true
RUN pnpm db:generate
RUN pnpm build

# --- Runner / Production image ---
FROM base AS runner

ENV NODE_ENV=production

# Create non-root user
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# Copy necessary files
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/node_modules/.pnpm/@prisma+client*/node_modules/.prisma ./node_modules/.prisma

# Copy public folder if exists
COPY --from=builder /app/public ./public

# Create uploads directory
RUN mkdir -p uploads
RUN chown -R nextjs:nodejs /app

USER nextjs

# Expose port
EXPOSE 3000

ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

# Start the application
CMD ["node", "server.js"]
