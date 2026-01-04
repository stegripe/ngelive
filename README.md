# ngelive

**Production-Ready RTMP Live Stream Manager**

---

## 🚀 Deploy (Docker Compose)

1. Copy & edit `.env` dari `.env.example` sesuai kebutuhan.
2. Jalankan:
   ```bash
   docker compose up -d --build
   docker compose exec app pnpm db:push
   docker compose exec app pnpm db:seed
   ```
3. Akses: http://localhost:3000 (atau IP server)

---

## ⚙️ Konfigurasi Penting (.env)
- Semua variabel sudah ada di `.env.example` (DB, JWT, admin, upload, dsb)
- **Ganti JWT_SECRET & password admin sebelum production!**

---

## 🛠️ Troubleshooting
- Login gagal? Pastikan DB sudah up, migrasi & seed otomatis saat build.
- Ulang setup: `docker compose down -v && docker compose up -d --build`
- Cek log: `docker compose logs -f`

---

MIT License | Stegripe Development
