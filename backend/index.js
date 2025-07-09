const express = require('express');
const cors = require('cors');
const multer = require('multer');
const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');

const app = express();
const PORT = process.env.PORT || 5000;
const VIDEO_DIR = path.join(__dirname, 'videos');
const LOG_FILE = path.join(__dirname, 'stream_log.txt');
const PLAYLIST_FILE = path.join(__dirname, 'playlist.json');
const RTMP_FILE = path.join(__dirname, 'rtmp_url.txt');
const CONCAT_FILE = path.join(__dirname, 'playlist.txt');

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

// Helper untuk baca/tulis playlist
function getPlaylist() {
  if (!fs.existsSync(PLAYLIST_FILE)) return [];
  return JSON.parse(fs.readFileSync(PLAYLIST_FILE, "utf8"));
}
function setPlaylist(arr) {
  fs.writeFileSync(PLAYLIST_FILE, JSON.stringify(arr, null, 2));
}

// API get playlist
app.get('/api/playlist', (req, res) => {
  res.json(getPlaylist());
});

// API set playlist (urutan)
app.post('/api/playlist', (req, res) => {
  const { playlist } = req.body;
  if (!Array.isArray(playlist)) return res.status(400).json({ error: "Invalid" });
  setPlaylist(playlist);
  res.json({ success: true });
});

// Helper untuk dapatkan playlist terbaru (fallback: semua video)
function getCurrentPlaylist() {
  if (fs.existsSync(PLAYLIST_FILE)) {
    return JSON.parse(fs.readFileSync(PLAYLIST_FILE, "utf8"));
  } else {
    return fs.readdirSync(VIDEO_DIR).filter(f => f.endsWith('.mp4'));
  }
}

// Helper get/set RTMP URL
function getRtmpUrl() {
  if (!fs.existsSync(RTMP_FILE)) return "";
  return fs.readFileSync(RTMP_FILE, "utf8").trim();
}
function setRtmpUrl(url) {
  fs.writeFileSync(RTMP_FILE, url.trim());
}

// API: Get RTMP URL
app.get('/api/rtmp', (req, res) => {
  res.json({ url: getRtmpUrl() });
});

// API: Set RTMP URL
app.post('/api/rtmp', (req, res) => {
  const { url } = req.body;
  if (!url || typeof url !== "string") return res.status(400).json({ error: "URL tidak valid" });
  setRtmpUrl(url);
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

function startFfmpegStream() {
  const playlist = getCurrentPlaylist();
  if (!playlist.length) return;

  const RTMP_URL = getRtmpUrl();
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
app.post('/api/stream/start', (req, res) => {
  if (ffmpegProcess) return res.status(400).json({ error: 'Streaming sudah berjalan' });

  const playlist = getCurrentPlaylist();
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
