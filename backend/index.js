const express = require('express');
const cors = require('cors');
const multer = require('multer');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 5000;
const VIDEO_DIR = path.join(__dirname, 'videos');
const LOG_FILE = path.join(__dirname, 'stream_log.txt');

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

const PLAYLIST_FILE = path.join(__dirname, 'playlist.json');

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

app.listen(PORT, () => {
  console.log(`Backend running on http://localhost:${PORT}`);
});