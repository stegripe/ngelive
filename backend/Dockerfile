FROM node:20-alpine

WORKDIR /app

# Install ffmpeg
RUN apk add --no-cache ffmpeg

COPY package.json ./
RUN pnpm install

COPY . .

EXPOSE 5000

CMD ["pnpm", "start"]
