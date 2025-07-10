const express = require('express');
const cors = require('cors');
const multer = require('multer');
const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');
const mariadb = require('mariadb');
const cookieParser = require('cookie-parser');

const app = express();
const PORT = process.env.PORT || 5000;
const VIDEO_DIR = path.join(__dirname, 'videos');
const LOG_FILE = path.join(__dirname, 'stream_log.txt');

// MariaDB pool config
const dbPool = mariadb.createPool({
  host: process.env.DB_HOST || 'db',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASS || '',
  database: process.env.DB_NAME || 'stegripe_stream',
  connectionLimit: 5
});

// Export pool if needed by users-auth.js
module.exports.dbPool = dbPool;

// Helper: convert BigInt to Number (for JSON serialization)
function convertBigInt(obj) {
  if (Array.isArray(obj)) return obj.map(convertBigInt);
  if (obj && typeof obj === "object") {
    for (let k in obj) {
      if (typeof obj[k] === "bigint") obj[k] = Number(obj[k]);
    }
  }
  return obj;
}

// DB tables auto-init
async function initDb() {
  const conn = await dbPool.getConnection();
  await conn.query(`
    CREATE TABLE IF NOT EXISTS streams (
      id INT PRIMARY KEY AUTO_INCREMENT,
      name VARCHAR(64) NOT NULL,
      rtmp_url TEXT NOT NULL,
      status VARCHAR(16) NOT NULL DEFAULT 'stopped'
    )`);
  await conn.query(`
    CREATE TABLE IF NOT EXISTS playlists (
      id INT PRIMARY KEY AUTO_INCREMENT,
      stream_id INT NOT NULL,
      filename VARCHAR(255) NOT NULL,
      position INT NOT NULL,
      FOREIGN KEY (stream_id) REFERENCES streams(id) ON DELETE CASCADE
    )`);
  // NEW: Table to assign videos to specific streams
  await conn.query(`
    CREATE TABLE IF NOT EXISTS video_streams (
      id INT PRIMARY KEY AUTO_INCREMENT,
      filename VARCHAR(255) NOT NULL,
      stream_id INT NOT NULL,
      FOREIGN KEY (stream_id) REFERENCES streams(id) ON DELETE CASCADE
    )`);
  // --- USERS TABLE for Auth ---
  await conn.query(`
    CREATE TABLE IF NOT EXISTS users (
      id INT PRIMARY KEY AUTO_INCREMENT,
      username VARCHAR(32) UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      role VARCHAR(16) NOT NULL DEFAULT 'user',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);
  // Create default admin if not exists
  const bcrypt = require('bcryptjs');
  const users = await conn.query('SELECT * FROM users WHERE role="admin"');
  if (users.length === 0) {
    const hash = bcrypt.hashSync("admin123", 10);
    await conn.query(
      'INSERT INTO users (username, password_hash, role) VALUES (?, ?, ?)',
      ["admin", hash, "admin"]
    );
  }
  conn.release();
}
initDb();

// Pastikan folder video ada
if (!fs.existsSync(VIDEO_DIR)) fs.mkdirSync(VIDEO_DIR);

app.use(cors({ origin: true, credentials: true }));
app.use(express.json());
app.use(cookieParser());

// --- USERS/AUTH ROUTES ---
const usersAuth = require('./users-auth');
app.use('/api', usersAuth);

// Daftar video
app.get('/api/videos', (req, res) => {
  fs.readdir(VIDEO_DIR, (err, files) => {
    if (err) return res.status(500).json({ error: 'Gagal membaca folder video' });
    const videos = files.filter(f => f.endsWith('.mp4'));
    res.json(videos);
  });
});

// Upload video
const upload = multer({ dest: VIDEO_DIR });
app.post('/api/upload', upload.single('file'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'Tidak ada file' });
  // Rename ke nama asli
  const newPath = path.join(VIDEO_DIR, req.file.originalname);
  fs.rename(req.file.path, newPath, err => {
    if (err) return res.status(500).json({ error: 'Gagal rename file' });
    res.json({ success: true });
  });
});

// Hapus video
app.delete('/api/video/:filename', async (req, res) => {
  const file = path.join(VIDEO_DIR, req.params.filename);
  // Hapus di video_streams juga
  const conn = await dbPool.getConnection();
  await conn.query('DELETE FROM video_streams WHERE filename=?', [req.params.filename]);
  await conn.query('DELETE FROM playlists WHERE filename=?', [req.params.filename]); // bersihin playlist
  conn.release();
  fs.unlink(file, err => {
    if (err) return res.status(500).json({ error: 'Gagal hapus file' });
    res.json({ success: true });
  });
});

// Ambil log stream (jika ada)
app.get('/api/logs', (req, res) => {
  if (!fs.existsSync(LOG_FILE)) return res.send('');
  res.sendFile(LOG_FILE);
});

// --- DB LOGIC MULTI STREAM ---

// CRUD Streams
app.get('/api/streams', async (req, res) => {
  const conn = await dbPool.getConnection();
  const rows = await conn.query('SELECT * FROM streams');
  conn.release();
  res.json(convertBigInt(rows));
});

app.post('/api/streams', async (req, res) => {
  const { name, rtmp_url } = req.body;
  if (!name || !rtmp_url) return res.status(400).json({ error: 'Name dan RTMP URL harus diisi' });
  const conn = await dbPool.getConnection();
  const result = await conn.query('INSERT INTO streams (name, rtmp_url) VALUES (?, ?)', [name, rtmp_url]);
  conn.release();
  res.json({ id: Number(result.insertId) });
});

// FIX: Only stop the ffmpeg process for the stream being deleted!
const ffmpegProcesses = {}; // key: stream_id, value: process
const shouldLoopStream = {}; // key: stream_id, value: bool

app.delete('/api/streams/:stream_id', async (req, res) => {
  const stream_id = req.params.stream_id;
  // Stop only ffmpeg for this stream
  if (ffmpegProcesses[stream_id]) {
    try {
      ffmpegProcesses[stream_id].kill('SIGTERM');
    } catch (e) {}
    ffmpegProcesses[stream_id] = null;
    shouldLoopStream[stream_id] = false;
  }
  const conn = await dbPool.getConnection();
  await conn.query('DELETE FROM streams WHERE id=?', [stream_id]);
  conn.release();
  res.json({ success: true });
});

app.put('/api/streams/:stream_id', async (req, res) => {
  const { name, rtmp_url } = req.body;
  const conn = await dbPool.getConnection();
  await conn.query('UPDATE streams SET name=?, rtmp_url=? WHERE id=?', [name, rtmp_url, req.params.stream_id]);
  conn.release();
  res.json({ success: true });
});

// Playlist per stream
app.get('/api/playlist/:stream_id', async (req, res) => {
  const conn = await dbPool.getConnection();
  // Only show playlist files that are allowed for this stream
  const allowed = await conn.query('SELECT filename FROM video_streams WHERE stream_id=?', [req.params.stream_id]);
  const allowedSet = new Set(allowed.map(r => r.filename));
  const rows = await conn.query(
    'SELECT filename FROM playlists WHERE stream_id=? ORDER BY position ASC',
    [req.params.stream_id]
  );
  conn.release();
  // Only return files that are allowed
  const filtered = rows.filter(r => allowedSet.has(r.filename));
  res.json(filtered.map(r => r.filename));
});

app.post('/api/playlist/:stream_id', async (req, res) => {
  const { playlist } = req.body;
  if (!Array.isArray(playlist)) return res.status(400).json({ error: "Invalid" });
  const conn = await dbPool.getConnection();
  await conn.query('DELETE FROM playlists WHERE stream_id=?', [req.params.stream_id]);
  if (playlist.length > 0) {
    // Only allow files in video_streams for this stream
    const allowedRows = await conn.query('SELECT filename FROM video_streams WHERE stream_id=?', [req.params.stream_id]);
    const allowedSet = new Set(allowedRows.map(r => r.filename));
    const filteredPlaylist = playlist.filter(f => allowedSet.has(f));
    if (filteredPlaylist.length > 0) {
      const values = filteredPlaylist.map((filename, i) => [req.params.stream_id, filename, i]);
      await conn.batch('INSERT INTO playlists (stream_id, filename, position) VALUES (?, ?, ?)', values);
    }
  }
  conn.release();
  res.json({ success: true });
});

// RTMP URL per stream (update)
app.get('/api/streams/:stream_id/rtmp', async (req, res) => {
  const conn = await dbPool.getConnection();
  const rows = await conn.query('SELECT rtmp_url FROM streams WHERE id=?', [req.params.stream_id]);
  conn.release();
  res.json({ url: rows[0]?.rtmp_url || '' });
});
app.post('/api/streams/:stream_id/rtmp', async (req, res) => {
  const { url } = req.body;
  const conn = await dbPool.getConnection();
  await conn.query('UPDATE streams SET rtmp_url=? WHERE id=?', [url, req.params.stream_id]);
  conn.release();
  res.json({ success: true });
});

// --- VIDEO <-> STREAM CHECKLIST API ---

// Get all video <-> stream assignment
app.get('/api/video_streams', async (req, res) => {
  const conn = await dbPool.getConnection();
  const rows = await conn.query('SELECT filename, stream_id FROM video_streams');
  conn.release();
  res.json(rows.map(r => ({
    filename: r.filename,
    stream_id: typeof r.stream_id === "bigint" ? Number(r.stream_id) : r.stream_id
  })));
});

// Assign video to stream
app.post('/api/video_streams', async (req, res) => {
  const { filename, stream_id } = req.body;
  if (!filename || !stream_id) return res.status(400).json({ error: "Missing filename or stream_id" });
  const conn = await dbPool.getConnection();
  await conn.query('INSERT IGNORE INTO video_streams (filename, stream_id) VALUES (?, ?)', [filename, stream_id]);
  conn.release();
  res.json({ success: true });
});

// Unassign video from stream
app.delete('/api/video_streams', async (req, res) => {
  const { filename, stream_id } = req.body;
  if (!filename || !stream_id) return res.status(400).json({ error: "Missing filename or stream_id" });
  const conn = await dbPool.getConnection();
  await conn.query('DELETE FROM video_streams WHERE filename=? AND stream_id=?', [filename, stream_id]);
  conn.release();
  res.json({ success: true });
});

// Helper: fallback only video assigned to stream if playlist kosong
async function getCurrentPlaylist(stream_id) {
  const conn = await dbPool.getConnection();
  const rows = await conn.query(
    'SELECT filename FROM playlists WHERE stream_id=? ORDER BY position ASC',
    [stream_id]
  );
  // Only allow files in video_streams
  const allowed = await conn.query('SELECT filename FROM video_streams WHERE stream_id=?', [stream_id]);
  conn.release();
  const allowedSet = new Set(allowed.map(r => r.filename));
  const filtered = rows.filter(r => allowedSet.has(r.filename));
  if (filtered.length) return filtered.map(r => r.filename);
  // fallback: semua video yang di-assign ke stream ini
  return Array.from(allowedSet);
}
async function getRtmpUrlByStream(stream_id) {
  const conn = await dbPool.getConnection();
  const rows = await conn.query('SELECT rtmp_url FROM streams WHERE id=?', [stream_id]);
  conn.release();
  return rows[0]?.rtmp_url || '';
}

// Streaming logic MULTI
function escapeForFfmpegConcat(filePath) {
  return filePath.replace(/'/g, "'\\''");
}

async function startFfmpegStream(stream_id) {
  const playlist = await getCurrentPlaylist(stream_id);
  if (!playlist.length) return;
  const RTMP_URL = await getRtmpUrlByStream(stream_id);
  const concatFile = path.join(__dirname, `playlist_${stream_id}.txt`);
  const concatContent = playlist
    .map(file => `file '${escapeForFfmpegConcat(path.join(VIDEO_DIR, file).replace(/\\/g, "/"))}'`)
    .join("\n");
  fs.writeFileSync(concatFile, concatContent);

  const ffmpegArgs = [
    '-re', '-f', 'concat', '-safe', '0',
    '-i', concatFile,
    '-c:v', 'libx264', '-preset', 'veryfast', '-maxrate', '3000k', '-bufsize', '6000k',
    '-pix_fmt', 'yuv420p', '-g', '50', '-c:a', 'aac', '-b:a', '160k',
    '-ar', '44100', '-f', 'flv', RTMP_URL
  ];

  const proc = spawn('ffmpeg', ffmpegArgs);
  ffmpegProcesses[stream_id] = proc;

  const logStream = fs.createWriteStream(LOG_FILE, { flags: 'a' });
  proc.stdout.pipe(logStream);
  proc.stderr.pipe(logStream);

  proc.on('exit', (code, signal) => {
    logStream.write(`\n[ffmpeg ${stream_id} stopped] code: ${code}, signal: ${signal}\n`);
    logStream.end();
    ffmpegProcesses[stream_id] = null;
    if (shouldLoopStream[stream_id]) {
      setTimeout(() => startFfmpegStream(stream_id), 2000);
    }
  });
}

// API: Mulai streaming (loop playlist) per stream
app.post('/api/stream/:stream_id/start', async (req, res) => {
  const stream_id = req.params.stream_id;
  if (ffmpegProcesses[stream_id]) return res.status(400).json({ error: 'Streaming sudah berjalan' });
  const playlist = await getCurrentPlaylist(stream_id);
  if (!playlist.length) return res.status(400).json({ error: 'Playlist kosong' });
  shouldLoopStream[stream_id] = true;
  startFfmpegStream(stream_id);
  // Update status in DB
  const conn = await dbPool.getConnection();
  await conn.query('UPDATE streams SET status=? WHERE id=?', ['running', stream_id]);
  conn.release();
  res.json({ success: true });
});

// API: Stop streaming per stream
app.post('/api/stream/:stream_id/stop', async (req, res) => {
  const stream_id = req.params.stream_id;
  shouldLoopStream[stream_id] = false;
  if (!ffmpegProcesses[stream_id]) return res.status(400).json({ error: 'Tidak ada stream aktif' });
  ffmpegProcesses[stream_id].kill('SIGTERM');
  ffmpegProcesses[stream_id] = null;
  // Update status in DB
  const conn = await dbPool.getConnection();
  await conn.query('UPDATE streams SET status=? WHERE id=?', ['stopped', stream_id]);
  conn.release();
  res.json({ success: true });
});

// API: Status streaming per stream
app.get('/api/stream/:stream_id/status', (req, res) => {
  const stream_id = req.params.stream_id;
  res.json({ running: !!ffmpegProcesses[stream_id] });
});

app.listen(PORT, () => {
  console.log(`Backend running on http://localhost:${PORT}`);
});
