# KAppHelper — Panduan Onboarding Tim (Setup bersama AI)

> Untuk: Jesynta, Praisilia, dan developer Kairos lain yang akan memakai KAppHelper.
> Disusun 2026-09-24 dari isi repo saat ini. Melengkapi `README.md` (quickstart),
> `docs/using-kapphelper.md` (referensi harian), dan `docs/pm-dashboard-roadmap.md` (arah dashboard).
> Bahasa: Indonesia, istilah teknis tetap Inggris.

---

## 0. UNTUK DYAH (pemilik repo) — cek ini sebelum menyuruh tim `git pull`

Panduan ini **tidak akan berjalan** bagi orang lain sampai hal-hal berikut beres:

- [ ] **Push dulu pekerjaanmu.** Saat ini `dashboard/server/`, `apps/kapphelper/`, `apps/*/capture/`
      baru, `clients/twl/`, memory baru, dan migration Prisma masih *untracked/modified* di laptopmu
      (42 file, 1 commit belum di-push). Kalau tim pull sekarang, mereka tidak mendapat itu semua.
      Review `git status`, pastikan tidak ada `.env*` berisi nilai asli, commit per topik
      (format `<type>(<scope>): <desc>`), lalu push. Beri tahu tim sebelum push ke `main`
      (memory `notify-before-shared-main-push`).
- [ ] **Beri akses repo.** `origin` = `https://github.com/kunospw/kapphelper.git` (private, akun
      pribadi). Tambahkan tiap orang sebagai collaborator:
      `gh repo edit kunospw/kapphelper --add-collaborator <github-username>`.
      (Pindah ke org `Kairos-Business-Solutions` butuh persetujuan Ken — jangan dilakukan tanpa
      izin.)
- [x] **`bootstrap.ps1` diperbaiki (2026-09-24).** Dua masalah: (1) Docker dulu **wajib**
      (`exit 1` bila tidak ada) — sekarang pengecekan lunak seperti `bootstrap.sh`; (2) file
      berisi karakter em-dash yang membuat **Windows PowerShell 5.1 gagal parse** (6 error),
      jadi skrip tidak bisa jalan sama sekali di PowerShell bawaan Windows — sekarang ASCII murni.
      Diuji di mesin tanpa Docker: exit code 0. **Pastikan perbaikan ini ikut di-push.**
- [x] **Path pribadi di `projects.yaml` diganti pointer netral.** `meta.credentials_ref` dan
      `meta.mobile_deploy_guide` tidak lagi menunjuk ke `D:/...` (menyebut nama file + "minta Ken
      atau Dyah"). Salinan dokumennya sendiri tetap di luar git.
- [ ] **Beritahu jujur soal cakupan dashboard** (lihat Bagian 9): sync sekarang hanya TSApp.

---

## 1. Apa yang akan kamu punya setelah selesai (±30–45 menit)

1. Repo `kapphelper` ter-clone di `~/klaudecode/kapphelper` dan tersinkron dengan GitHub.
2. Claude Code yang otomatis memberi **briefing project** (`/session-start`).
3. Kemampuan mencatat keputusan/gotcha (`/capture`) dan menutup sesi dengan aman (`/handover`).
4. Satu **capture pertama yang nyata** berisi apa yang sedang kamu kerjakan — inilah bahan yang
   membuat progresmu terlihat di dashboard dan di meeting.
5. (Opsional) Dashboard berjalan di mesinmu sendiri — **Jalur B**, Bagian 8.

**Dua jalur:**

| Jalur | Untuk siapa | Butuh |
|---|---|---|
| **A — Workspace + AI** | **Semua developer (wajib)** | git, Claude Code, akses repo |
| **B — Dashboard lokal** | Opsional; saat ini terutama Dyah | Node 20.6+, PostgreSQL, token Plane, repo yang di-sync |

Mulai dari Jalur A. Jalur B baru dikerjakan bila memang perlu.

---

## 2. Prasyarat (cek dulu)

- [ ] **Git** terpasang (`git --version`).
- [ ] **Claude Code CLI** terpasang dan sudah login (`claude --version`). Gunakan akun yang
      diberikan tim. **Default model: Sonnet 5, effort medium** — pool usage dibagi bersama;
      naik model/effort hanya bila tugasnya memang butuh (memory `model-usage-discipline`).
      Cek pemakaian dengan `/usage` atau `/status` di dalam sesi.
- [ ] **Akses repo** `kunospw/kapphelper` (minta Dyah menambahkanmu sebagai collaborator).
- [ ] **Autentikasi git untuk push**, pilih salah satu:
      - `gh auth login` (paling mudah, browser device-code), lalu `gh auth setup-git`; atau
      - SSH key yang sudah didaftarkan di akun GitHub-mu.
      Ingat: *private key tidak pernah dibagikan*; yang diberikan ke server/GitHub hanya *public
      key* (penjelasan Ken, memory `credential-hygiene-in-ai-sessions`).
- [ ] **Identitas git** yang benar: `git config --global user.name "<Nama>"` dan `user.email`.
- [ ] Punya **file catatan pribadi** untuk kredensial (mis. OneNote per topik). Nilai asli
      password/token **tidak pernah** ditempel ke chat AI, ke repo, atau ke dokumen bersama.

---

## 3. Langkah 1 — Clone dan bootstrap

Aturan Ken: repo ini hidup di **`~/klaudecode/kapphelper`**, bukan di dalam repo aplikasi.

**Windows (PowerShell):**
```powershell
mkdir $HOME\klaudecode -Force
cd $HOME\klaudecode
git clone https://github.com/kunospw/kapphelper.git kapphelper
cd kapphelper
.\bootstrap.ps1
```

**Linux (mis. `kconnect01`):**
```bash
mkdir -p ~/klaudecode && cd ~/klaudecode
git clone https://github.com/kunospw/kapphelper.git kapphelper
cd kapphelper
./bootstrap.sh
```

Docker **tidak dibutuhkan** untuk Jalur A: bila tidak ada, bootstrap hanya menampilkan peringatan
"Docker not found" dan tetap selesai (exit 0). Peringatan "Parent folder ... expected
`~\klaudecode`" muncul bila repo tidak berada di `~/klaudecode` — pindahkan sesuai petunjuk yang
dicetak (aturan Ken).

> **Bila di repo lama (sebelum perbaikan 2026-09-24) bootstrap error di Windows** — mis. "Missing
> tools: docker" atau error parser `The '<' operator is reserved` — `git pull` dulu agar mendapat
> versi yang sudah diperbaiki. Darurat: lewati bootstrap dan jalankan manual
> `git pull --ff-only; New-Item -ItemType Directory -Force artifacts, logs | Out-Null`
> (folder itu gitignored).

Bootstrap aman dijalankan ulang (idempoten).

---

## 4. Langkah 2 — Sesi pertama dengan AI

```powershell
cd $HOME\klaudecode\kapphelper
claude
```

Di dalam sesi, jalankan:

```
/session-start
```

Skill ini akan: `git pull --ff-only` → membaca `projects.yaml` → menanyakan project mana yang kamu
kerjakan → membaca `APP.md`/`CLIENT.md` + 3 capture terakhir + `memory/MEMORY.md` → mengecek git
state repo aplikasinya → mencetak briefing satu paragraf.

Bila `git pull` gagal, **berhenti dan laporkan** — jangan lanjut di data basi.

### 4.1 Prompt setup untuk ditempel ke Claude (bantuan AI langkah demi langkah)

Tempel ini di sesi pertama agar AI memandu dan memverifikasi tiap langkah:

```text
Aku developer baru yang baru clone kapphelper. Bantu aku onboarding sesuai
docs/team-onboarding-guide.md, Jalur A saja dulu.

Aturan main:
1. Kerjakan SATU langkah per giliran, jelaskan singkat apa dan kenapa, lalu verifikasi
   hasilnya (jalankan perintah cek) sebelum lanjut.
2. Jangan pernah menampilkan, menulis, atau meminta nilai password/token/private key.
   Kalau butuh kredensial, suruh aku memasukkannya sendiri di file lokal yang gitignored,
   lalu hanya cek bahwa filenya ada.
3. Jangan `git push`, commit, atau ubah file di luar yang kita sepakati. Sebelum push
   apa pun, tunjukkan `git status` dan tanya aku dulu.
4. Berhenti dan tanya kalau ada yang ambigu (project mana, repo mana, akun mana).
5. Gunakan model dan effort default; jangan menyarankan naik model kecuali perlu.

Urutan: (a) cek prasyarat (git, claude, akses repo, identitas git), (b) jalankan
/session-start dan jelaskan briefingnya, (c) tunjukkan project mana di projects.yaml yang
relevan denganku dan siapa active_dev-nya, (d) bantu tulis capture pertamaku lewat
/capture (apa yang sedang kukerjakan, blocker, next step), (e) tutup dengan /handover
dan tunjukkan apa yang akan di-push sebelum aku setuju.
```

---

## 5. Langkah 3 — Capture pertama yang nyata

Tujuan: membuat pekerjaanmu **terbukti dan terlihat**, bukan sekadar latihan.

```
/capture
```

Jawab pertanyaannya dengan fakta, mis.:
- `source: session`, `from: <namamu>` (nama asli, bukan inisial), `type: issue` atau `design`
- `about:` project yang kamu pegang (mis. TCS / TWPC / KDocVerify)
- **What:** apa yang sedang dikerjakan · **Why:** konteks/keputusan siapa · **Impact:**
  blocker dan next step

Skill akan **membersihkan kredensial dulu**, menulis file
`apps/<slug>/capture/<YYYY-MM-DD>_<nama>_<topik>.md` (append-only, tidak pernah mengedit capture
lama), dan hanya *mengusulkan* Plane issue — tidak pernah membuatnya otomatis.

Lalu tutup sesi:

```
/handover
```

Skill akan menanyakan apakah ada info durable yang belum tercatat, `git pull` dulu, commit dengan
format `capture(<slug>): <deskripsi>`, lalu `git push origin main`. **Jangan force push.**
Bila push ditolak (non-fast-forward): `git pull --rebase origin main`, lalu push ulang.

---

## 6. Alur harian

```
/session-start   → pull + briefing
   kerja code seperti biasa (di repo aplikasi, bukan di kapphelper)
/capture         → tiap ada keputusan, meeting, gotcha
/plane-sync      → (opsional) apa yang ada di piringmu, gap capture vs Plane
/deploy          → hanya bila perlu ship (mode advisory: AI menyiapkan perintah, kamu yang jalankan)
/handover        → sebelum selesai/ganti mesin — sering, jangan seminggu sekali
```

**Apa masuk ke mana:**

| Info | Tempat |
|---|---|
| Meeting, keputusan, email, screenshot untuk satu project | `apps|clients/<slug>/capture/` via `/capture` |
| Pelajaran lintas project ("jangan lakukan X karena Y") | `memory/feedback_*.md` + baris di `memory/MEMORY.md` |
| Perubahan deploy target, port, health check | `projects.yaml` |
| Konvensi engineering | `standards/` |
| Kode, docker-compose, migration | **repo aplikasi**, bukan di sini |

Aturan emas: bila informasi hanya mengulang apa yang sudah diketahui git atau Plane, jangan ditulis.

---

## 7. Aturan wajib (ringkas — teks penuh di `CLAUDE.md`)

1. **Secrets tidak pernah di git.** `.env*` gitignored; hanya `*.example` yang boleh di-commit.
   Setelah setup yang melibatkan token, **cabut/rotasi token** dan jangan biarkan nilainya di
   riwayat chat.
2. **Jangan tulis memory di dalam repo aplikasi.** Selalu di kapphelper (aturan Ken).
3. **Pull sebelum tulis, push setelah selesai.** Jangan edit dari data basi.
4. **Jangan `git push --force` ke `main`.**
5. **Kabari dulu sebelum push ke `main` bersama** bila orang lain punya WIP di repo yang sama
   (insiden KConnect 2026-08-20).
6. **Commit format Conventional Commits:** `<type>(<scope>): <desc>`
   (`feat|fix|docs|chore|refactor|test|build|ci`). Jangan `git add .` mentah-mentah — stage file
   yang memang kamu ubah (gotcha CRLF di Windows).
7. **Deploy hanya ke target yang terdaftar di `projects.yaml`.** Di server, AI tidak punya sudo;
   Live tidak sama dengan pilot (untuk TSApp, Live wajib trio `-p/-f/--env-file`).
8. **Plane: draft, jangan auto-create.** Usulkan lalu tunggu persetujuan.
9. **Cek dulu, jangan menebak** environment/klien/branch — mis. TCS vs TWPC.
10. **`git fetch` sebelum mulai di checkout mana pun** (`memory/reference_project-checkouts.md`).

---

## 8. Jalur B (opsional) — Menjalankan dashboard di mesinmu

> **Jujur soal kondisi sekarang:** sync dashboard baru mencakup **Plane project "Kairos Invoice
> Portal" (TSApp)** dan **satu repo git (KairosTSApp)**. Bila kamu mengerjakan TCS/TWPC/KDocVerify,
> menjalankan dashboard sendiri **belum menampilkan pekerjaanmu**. Sampai sync per-registry dibuat
> (roadmap Fase B), progresmu terlihat lewat **capture + `/handover`**: setelah kamu push, Dyah
> `git pull` lalu `sync-all`, dan capture berpenulis `from: <namamu>` otomatis muncul di kartumu.
> Jadi Jalur B saat ini lebih untuk belajar/ikut mengembangkan dashboard.

**Prasyarat:** Node.js **20.6+** (skrip memakai `node --env-file`), PostgreSQL 16+ **atau**
Docker.

1. **Database** (pilih satu):
   - *Native PostgreSQL* — buat user dan database, mis. di `psql` sebagai superuser:
     ```sql
     CREATE USER kapphelper_app WITH PASSWORD '<password-pilihanmu>';
     CREATE DATABASE kapphelper_dashboard OWNER kapphelper_app;
     ALTER USER kapphelper_app CREATEDB;   -- dibutuhkan prisma migrate dev
     ```
   - *Docker* — `docker compose up -d` di `dashboard/` (Postgres di port 5433; sesuaikan URL).
2. **Env server:** `Copy-Item dashboard\.env.server.example dashboard\.env.server`, lalu isi
   `DATABASE_URL` (sesuai port/user/password) dan `JWT_SECRET` (string acak panjang ≥ 32).
   File ini gitignored — **jangan** ditempel di chat.
3. Di `dashboard/`:
   ```powershell
   npm install
   npm run db:generate
   npm run db:migrate
   npm run add-dev-user -- "emailmu@kairossolutions.co" "Nama Lengkap" "Role · Fokus"
   npm run publish:portfolio
   ```
   Password sekali-pakai dicetak sekali — simpan di catatan pribadi.
4. **Sumber data (opsional; minta Dyah, jangan salin kredensialnya lewat chat):**
   - Plane: `.env.plane` (dari `.env.plane.example`) + file token read-only lokal.
   - Git: `.env.gitlog` (dari `.env.gitlog.example`), isi path repo lokal, branch, nama repo.
   - Tanpa keduanya, `sync-all` melewati tahap itu tanpa error.
5. **Jalankan:** terminal 1 `npm run server` (API `:4175`, sync otomatis tiap jam), terminal 2
   `npm run dev` (Vite). Buka URL yang dicetak Vite dan login.

Verifikasi cepat: `curl http://127.0.0.1:4175/api/health` → `{"ok":true}`.

---

## 9. Batasan saat ini (jangan diklaim sudah ada)

- Sync dashboard hanya **TSApp** (satu repo, satu project Plane); repo lain belum tersambung.
- **Capture sudah masuk feed dashboard** (`npm run sync:captures`, ikut `sync-all`) — tapi hanya bila `from:` di capture cocok dengan developer terdaftar (mis. `from: Praisilia`); capture dari Ken/Iwan dicatat sebagai keputusan, bukan aktivitas developer. Memory belum di-ingest.
- Belum ada role PM/dev, halaman workload, atau milestone bertanggal.
- **AI (Ollama) belum terpasang/terhubung**; belum ada rekomendasi next-step.
- Dashboard **lokal** (di laptop Dyah), belum di-host; hanya jalan selama server hidup.
- `standards/` baru pointer ke handbook; `deploy.mode: executed` belum dipakai (semua advisory).

Semua ini ada di `docs/pm-dashboard-roadmap.md` beserta urutan pengerjaannya.

---

## 10. Troubleshooting

| Gejala | Penyebab umum | Solusi |
|---|---|---|
| `bootstrap.ps1`: "Missing tools: docker" atau `The '<' operator is reserved` | Versi lama skrip (Docker wajib + em-dash yang merusak parsing di PowerShell 5.1) | `git pull` untuk versi yang sudah diperbaiki; Docker tidak perlu untuk Jalur A |
| `git clone`: repository not found / 403 | Belum jadi collaborator | Minta Dyah menjalankan `gh repo edit ... --add-collaborator` |
| `git pull --ff-only` gagal | Ada perubahan lokal/divergen | Jangan paksa. `git status`; commit/stash dulu; bila divergen `git pull --rebase` |
| Push ditolak (non-fast-forward) | Orang lain push duluan | `git pull --rebase origin main`, selesaikan konflik, push |
| Konflik di `memory/MEMORY.md` | Dua orang menambah indeks bersamaan | Simpan **kedua** set entri |
| Konflik di `projects.yaml` | Dua edit bagian yang sama | Merge manual; biasanya beda project → ambil keduanya |
| ±200 file tampak "changed" di Windows | Noise CRLF | Jangan `git add .`; stage per-file (`.gitattributes` sudah ada untuk `*.sh`) |
| `/session-start` tidak muncul | Bukan dijalankan dari folder repo | `cd` ke `kapphelper` lalu `claude`; skill ada di `.claude/skills/` |
| Terkunci usage limit | Model/effort terlalu mahal | Kembali ke Sonnet 5 medium; koordinasi akun cadangan dengan Ken |
| `prisma migrate` error "permission denied to create database" | User DB tanpa `CREATEDB` | `ALTER USER <user> CREATEDB;` |
| Login dashboard 401 | Email belum didaftarkan / password salah | Jalankan `npm run add-dev-user` (hanya admin) |
| `npm run server` tidak menyinkronkan | `SYNC_DISABLED=true` di env | Hapus/ubah nilainya |

---

## 11. Bila ada yang tidak jelas

Tanya Claude di sesi (sebutkan file yang relevan), tanya Dyah untuk urusan akses/repo, dan tanya
Ken untuk keputusan (hosting, pindah repo ke org, izin server). Jangan menebak konfigurasi
klien/environment — baca `projects.yaml`.
