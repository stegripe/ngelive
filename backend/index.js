const express = require('express');
const cors = require('cors');
const multer = require('multer');
const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');
const mariadb = require('mariadb');

const app = express();
const PORT = process.env.PORT || 5000;
const VIDEO_DIR = path.join(__dirname, 'videos');
const LOG_FILE = path.join(__dirname, 'stream_log.txt');
const CONCAT_FILE = path.join(__dirname, 'playlist.txt');

// MariaDB pool config
const dbPool = mariadb.createPool({
  host: process.env.DB_HOST || 'db',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASS || '',
  database: process.env.DB_NAME || 'stegripe_stream',
  connectionLimit: 5
});

// DB tables auto-init
async function initDb() {
  const conn = await dbPool.getConnection();
  await conn.query(`CREATE TABLE IF NOT EXISTS settings (
    id INT PRIMARY KEY AUTO_INCREMENT,
    name VARCHAR(64) UNIQUE NOT NULL,
    value TEXT NOT NULL
  )`);
  await conn.query(`CREATE TABLE IF NOT EXISTS playlist (
    id INT PRIMARY KEY AUTO_INCREMENT,
    filename VARCHAR(255) NOT NULL,
    position INT NOT NULL
  )`);
  conn.release();
}
initDb();

// Pastikan folder video ada
if (!fs.existsSync(VIDEO_DIR)) fs.mkdirSync(VIDEO_DIR);

app.use(cors());
app.use(express.json());

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
app.delete('/api/video/:filename', (req, res) => {
  const file = path.join(VIDEO_DIR, req.params.filename);
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

// --- DB LOGIC ---

// RTMP URL
async function getRtmpUrl() {
  const conn = await dbPool.getConnection();
  const rows = await conn.query("SELECT value FROM settings WHERE name='rtmp_url'");
  conn.release();
  return rows[0]?.value || "";
}
async function setRtmpUrl(url) {
  const conn = await dbPool.getConnection();
  await conn.query(
    "INSERT INTO settings (name, value) VALUES ('rtmp_url', ?) ON DUPLICATE KEY UPDATE value=VALUES(value)",
    [url.trim()]
  );
  conn.release();
}

// Playlist
async function getPlaylist() {
  const conn = await dbPool.getConnection();
  const rows = await conn.query("SELECT filename FROM playlist ORDER BY position ASC");
  conn.release();
  return rows.map(row => row.filename);
}
async function setPlaylist(arr) {
  const conn = await dbPool.getConnection();
  await conn.query("DELETE FROM playlist");
  if (arr.length > 0) {
    const values = arr.map((filename, i) => [filename, i]);
    await conn.batch("INSERT INTO playlist (filename, position) VALUES (?, ?)", values);
  }
  conn.release();
}

// Helper: fallback semua video jika playlist kosong
async function getCurrentPlaylist() {
  const pl = await getPlaylist();
  if (pl.length) return pl;
  // fallback: semua file video
  return fs.readdirSync(VIDEO_DIR).filter(f => f.endsWith('.mp4'));
}

// API: Get RTMP URL
app.get('/api/rtmp', async (req, res) => {
  res.json({ url: await getRtmpUrl() });
});

// API: Set RTMP URL
app.post('/api/rtmp', async (req, res) => {
  const { url } = req.body;
  if (!url || typeof url !== "string") return res.status(400).json({ error: "URL tidak valid" });
  await setRtmpUrl(url);
  res.json({ success: true });
});

// API get playlist
app.get('/api/playlist', async (req, res) => {
  res.json(await getPlaylist());
});

// API set playlist (urutan)
app.post('/api/playlist', async (req, res) => {
  const { playlist } = req.body;
  if (!Array.isArray(playlist)) return res.status(400).json({ error: "Invalid" });
  await setPlaylist(playlist);
  res.json({ success: true });
});

// Streaming logic
let ffmpegProcess = null;
let shouldLoopStream = false;

// Escape for ffmpeg concat (Aman untuk semua simbol, hanya petik satu yang WAJIB di-escape, lainnya aman)
function escapeForFfmpegConcat(filePath) {
  // Escape single quotes for ffmpeg concat only
  // Path must be inside single quotes, single quote in path must be: '\'' (ffmpeg rule)
  // Example: file 'dir/that'\''s file.mp4'
  return filePath.replace(/'/g, "'\\''");
}

async function startFfmpegStream() {
  const playlist = await getCurrentPlaylist();
  if (!playlist.length) return;

  const RTMP_URL = await getRtmpUrl();
  const concatContent = playlist
    .map(file => `file '${escapeForFfmpegConcat(path.join(VIDEO_DIR, file).replace(/\\/g, "/"))}'`)
    .join("\n");
  fs.writeFileSync(CONCAT_FILE, concatContent);

  const ffmpegArgs = [
    '-re', '-f', 'concat', '-safe', '0',
    '-i', CONCAT_FILE,
    '-c:v', 'libx264', '-preset', 'veryfast', '-maxrate', '3000k', '-bufsize', '6000k',
    '-pix_fmt', 'yuv420p', '-g', '50', '-c:a', 'aac', '-b:a', '160k',
    '-ar', '44100', '-f', 'flv', RTMP_URL
  ];

  ffmpegProcess = spawn('ffmpeg', ffmpegArgs);

  // Log output ke file
  const logStream = fs.createWriteStream(LOG_FILE, { flags: 'a' });
  ffmpegProcess.stdout.pipe(logStream);
  ffmpegProcess.stderr.pipe(logStream);

  ffmpegProcess.on('exit', (code, signal) => {
    logStream.write(`\n[ffmpeg stopped] code: ${code}, signal: ${signal}\n`);
    logStream.end();
    ffmpegProcess = null;
    if (shouldLoopStream) {
      setTimeout(() => startFfmpegStream(), 2000); // restart setelah 2 detik
    }
  });
}

// API: Mulai streaming (loop playlist)
app.post('/api/stream/start', async (req, res) => {
  if (ffmpegProcess) return res.status(400).json({ error: 'Streaming sudah berjalan' });

  const playlist = await getCurrentPlaylist();
  if (!playlist.length) return res.status(400).json({ error: 'Playlist kosong' });

  shouldLoopStream = true;
  startFfmpegStream();

  res.json({ success: true });
});

// API: Stop streaming
app.post('/api/stream/stop', (req, res) => {
  shouldLoopStream = false;
  if (!ffmpegProcess) return res.status(400).json({ error: 'Tidak ada stream aktif' });
  ffmpegProcess.kill('SIGTERM');
  ffmpegProcess = null;
  res.json({ success: true });
});

// API: Status streaming
app.get('/api/stream/status', (req, res) => {
  res.json({ running: !!ffmpegProcess });
});

app.listen(PORT, () => {
  console.log(`Backend running on http://localhost:${PORT}`);
});
