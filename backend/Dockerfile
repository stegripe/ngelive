FROM node:20-alpine

WORKDIR /app

# Install ffmpeg
RUN apk add --no-cache ffmpeg

COPY package.json ./
RUN npm install

COPY . .

EXPOSE 5000

CMD ["npm", "start"]
