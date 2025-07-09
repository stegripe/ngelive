# Ngelive

Panel web untuk mengelola live streaming YouTube 24/7.

## Cara Jalankan (untuk pemula/non-coding)

1. **Install Docker & Docker Compose**  
   - [Petunjuk resmi Docker](https://docs.docker.com/get-docker/)

2. **Clone/copy semua file project ini**

3. **Jalankan perintah berikut di folder project:**
   ```bash
   docker compose up --build
   ```

4. **Akses panel web:**
   - Frontend: http://localhost:3000  
   - Backend API: http://localhost:5000

5. **Upload/manage video dari web panel.**

---

## TODO

- Integrasi kontrol ffmpeg streaming
- Halaman login
- Manajemen playlist (urutkan, drag-drop)
- Halaman log
- Pengaturan RTMP key
- UI seperti Pterodactyl Panel