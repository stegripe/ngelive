FROM node:20-alpine

WORKDIR /app

# Install ffmpeg
RUN apk add --no-cache ffmpeg

# Prepare pnpm
RUN npm install -g pnpm

COPY package.json ./
RUN pnpm install

COPY . .

EXPOSE 5000

CMD ["pnpm", "start"]
