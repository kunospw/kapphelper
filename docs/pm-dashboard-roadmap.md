# KAppHelper Dashboard — Roadmap & Plan (sudut pandang PM)

> Disusun 2026-09-24 dari hasil recheck repo (`main`, HEAD `5a46544` + banyak perubahan
> uncommitted). Target dekat: **dashboard bisa dipakai di team meeting 2026-09-25**.
> Dokumen ini melengkapi, bukan menggantikan, `docs/developer-dashboard-project-plan.md`,
> `dashboard/docs/IMPLEMENTATION_PLAN.md` (masih menulis Firebase — sudah usang), dan
> `memory/project_kapphelper-dashboard-requirements.md` (brief asli dari Ken).

## 1. Tujuan

> **Klarifikasi 2026-09-24 (dari Dyah):** dashboard dijalankan **lokal** (bukan di-host dulu),
> dipakai sebagai **tracker + dashboard produktivitas** untuk menunjukkan progres Dyah di
> team meeting dan kepada **Ken (technical director)**. Ken juga ingin dashboard membantu
> **developer tahu apa yang harus dikerjakan berikutnya dan apa tujuannya**, dibantu AI.
> **AI = Ollama (lokal)** — keputusan model sudah final.

Dua audiens, satu dashboard:

- **Ken / PM:** melihat apakah tiap project **on track / at risk / blocked / tanpa owner**,
  dan apa yang dikerjakan tiap developer (termasuk junior), berapa lama, dan di mana
  mereka tersangkut — untuk membantu, bukan mengawasi.
- **Developer (termasuk Dyah):** melihat **progres sendiri dengan bukti** (item selesai,
  commit, capture, milestone) dan mendapat **saran next goal & next step berbasis konteks
  project** dari AI, dengan sumber yang bisa dicek.

"Produktivitas" di sini berarti **hasil yang bisa dibuktikan** (item Plane selesai, milestone
tercapai, hambatan yang dibuka, keputusan yang dicatat) — bukan jumlah commit atau jam.

Batas yang tetap berlaku (dari brief Ken & plan sebelumnya): read-only untuk hal berisiko
(deploy, build, store upload, DB, mutasi Plane); tidak ada secret di dashboard; AI tidak
mengarang fakta; detail tersedia on-demand, tampilan meeting tetap ringkas.

## 2. Kondisi saat ini (2026-09-24)

| Area | Status |
|---|---|
| Stack | React+Vite → Express (`:4175`) → PostgreSQL (Prisma), login JWT untuk email terdaftar |
| Views | Team Meeting, Portfolio, Project Detail, Data Sources (+ `DeveloperProgressView` legacy) |
| Sync | git-log lokal (hanya `KairosTSApp`), Plane (hanya `KAIROSTSAP`), GitHub App (belum bisa dipakai di org); scheduler tiap 60 menit **hanya saat API hidup** |
| Data project | `dashboard/data/portfolio.json`, dikurasi manual, `generatedAt` 2026-09-04 |
| AI | Belum ada (hanya komentar placeholder di `server/src/index.js`) |
| Hosting | Belum ada (`apps.kapphelper.deploy: none`) |
| Runtime (dicek ulang 2026-09-24) | **Postgres native 18 jalan di `:5432`** (tanpa Docker; user `kapphelper_app`, DB `kapphelper_dashboard`), **2 migration sudah ter-apply**, API lolos smoke test (`/api/health` 200, `/api/portfolio` tanpa token 401). Isi DB: 3 akun login, 3 developer, 8 project, 100 activity, 49 action, 54 commit, 100 item Plane. **Sync terakhir 2026-09-22 07:54 UTC** (jadi basi ±2 hari; API sedang tidak dijalankan). `docker` tidak ada, dan memang tidak dibutuhkan. **`ollama` belum terpasang**. C: sisa ±12 GB |
| Mesin | RAM ±16 GB, GPU AMD terintegrasi (tanpa GPU diskrit) → Ollama berjalan di **CPU**: model kecil (3B–8B, kuantisasi Q4), respons beberapa detik–puluhan detik |

**Isi `portfolio.json` — celah yang langsung terlihat di meeting:**

- **Hanya 1 dari 8 project punya `meeting.milestone`** (TCS). Tujuh lainnya kosong → kolom
  "next milestone" (permintaan Ken 11 Sep) praktis kosong.
- **5 dari 8 project "Developer: Needs verification"**: TWPC, KFMS, OMS, KConnect, KPortal.
- `lastConfirmed` paling basi: **KConnect 2026-08-12**; KFMS/OMS/KPortal 2026-09-02;
  TWPC 2026-09-04.
- Hanya 3 developer punya feed (Dyah, Jesynta, Praisilia); aktivitas berasal dari 1 repo
  git + 1 project Plane, jadi kerja di TCS/KDocVerify nyaris tak terlihat.

## 3. Risiko yang harus ditutup lebih dulu

1. **Kerja belum masuk git.** `dashboard/server/`, `apps/kapphelper/`, migration, 12 capture,
   memory baru, `docker-compose.yml`, script sync baru → semua untracked/modified; plus 1
   commit belum di-push. Satu-satunya salinan ada di satu laptop. Sebelum apa pun: review
   `git status`, pastikan tidak ada `.env*` berisi nilai asli yang ikut, lalu commit + push
   sesuai aturan push repo (memory `notify-before-shared-main-push`; workspace draft → repo
   personal dulu, bukan org tanpa persetujuan).
2. ~~Belum terbukti jalan setelah migrasi Firebase → Postgres~~ — **sudah terbukti**: login
   berhasil dan sync berjalan tiap jam pada 2026-09-22 (catatan di `APP.md` yang menyebut
   "belum diverifikasi" sudah usang; perbarui). Yang tersisa: data belum disegarkan sejak itu.
3. **Data basi tampil sebagai "fakta".** Freshness badge sudah ada, tapi kalau isinya 3
   minggu lalu, meeting bisa salah arah. Data harus disegarkan sebelum presentasi.
4. **Filter "sembunyikan item Plane yang di-update hari ini"** adalah hack presentasi
   sementara (APP.md #11). Kalau masih aktif, sebutkan di meeting — jangan biarkan orang
   mengira itu kondisi sebenarnya.

---

## 4. PLAN — siap dipakai untuk meeting 2026-09-25

Prinsip: **jangan bangun fitur baru malam ini.** Tujuannya dashboard yang menyala, datanya
segar, dan jujur soal yang belum diketahui.

### 4.1 Malam ini (urut; ±2–3 jam)

- [ ] **Amankan pekerjaan**: `git status` → cek tidak ada secret → commit terpisah per topik
      (dashboard server/migrasi; captures; memory; skills/`.agents`) → push. Ikuti format
      commit di `memory/feedback_commit_format.md`.
- [ ] **Putuskan cara menjalankan Postgres — ini blocker pertama** karena `docker` tidak
      ada di PATH mesin ini. Pilih satu:
      - **(a) Docker Desktop**: pasang, lalu `docker compose up -d` di `dashboard/`
        (port 5433). Berat di disk/RAM (C: sisa ±12 GB) tapi paling sesuai `docker-compose.yml`.
      - **(b) PostgreSQL native Windows**: pasang installer, buat DB, ubah `DATABASE_URL`
        di `dashboard/.env.server`. Lebih ringan; tidak perlu mengubah kode.
      Setelah itu: `npm run db:generate` → `npm run db:migrate` (migration `init` +
      `action_priority`) → `npm run add-dev-user -- "<email>" "<nama>" "<role>"` untuk akun
      yang akan login (password sekali-pakai disampaikan out-of-band).
- [ ] **Segarkan data sumber**: `npm run sync:tsapp-git` → `npm run sync:plane` →
      `npm run merge:activity` (atau `sync-all`). Lihat halaman *Data Sources*: semua
      timestamp harus hari ini; kalau ada yang gagal, catat di daftar "known gaps".
- [ ] **Segarkan `portfolio.json` untuk minimal 4 project aktif** (TSApp, KDocVerify, TCS,
      TWPC) dari capture terbaru: `lastConfirmed`, `nextStep`, `meeting.milestone`,
      `meeting.blocker`, `meeting.nextDecision`. Untuk yang tidak diketahui **tulis
      "Needs verification"**, jangan ditebak. Khusus TSApp: minta Dyah konfirmasi status
      go-live pasca 14 Sep (belum ada capture setelah 09-08 di repo).
- [ ] `npm run publish:portfolio` → `npm run build` → jalankan `npm run server` + preview;
      login dengan akun non-admin untuk memastikan alur nyata.
- [ ] **Uji coba 5 menit**: buka Team Meeting → filter Blocked / Needs verification →
      buka satu project detail → cek link sumber tidak 404.

### 4.2 Fallback kalau ada yang gagal (putuskan malam ini, bukan pagi hari)

| Kalau gagal | Fallback |
|---|---|
| Postgres/docker tidak mau naik | Screenshot/PDF tiap view dari build yang sempat jalan; atau tampilkan `portfolio.json` + halaman Team Meeting versi statis |
| Sync Plane/git gagal | Tampilkan data terakhir **dengan menyebut tanggal sync terakhir**; jangan menutupi |
| Login bermasalah | Login di layar sendiri (presenter) — tidak perlu semua peserta login |

### 4.3 Alur meeting (15 menit, action-first, sesuai permintaan Ken)

1. **(2 mnt)** Team Meeting view: hitung Blocked / At risk / On track / Paused.
2. **(6 mnt)** Blocked dulu (TCS), lalu At risk. Per project: blocker → siapa yang
   memutuskan → kapan.
3. **(4 mnt)** Kartu per developer: "next step kamu apa? ada yang butuh bantuan?"
   (tanyakan ke junior berdasarkan item yang sudah lama tidak bergerak).
4. **(3 mnt)** **Agenda temuan data** (lihat 4.4) → putuskan owner & milestone.
5. Catat keputusan lewat `/capture` (satu file per event) → `/handover`.

### 4.4 Daftar pertanyaan siap-pakai untuk PM (dari data, bukan asumsi)

1. **KConnect**: developer "Needs verification", terakhir dikonfirmasi 12 Agustus — masih
   Active? Siapa owner-nya?
2. **TWPC, KFMS, OMS, KPortal**: belum ada developer/owner terverifikasi. Mana yang benar-
   benar dikerjakan, mana yang dijeda (KPortal sudah Paused)?
3. **7 dari 8 project tanpa milestone**: minta setiap owner menyebut *satu* milestone +
   target tanggal minggu ini (ini isi kolom "next milestone" permintaan Ken).
4. **TCS (Release blocked)**: siapa yang menyetujui lane rilis dan akun/job uji non-Live?
5. **Praisilia & Jesynta**: aktivitas mereka belum tersambung ke sync (hanya TSApp yang
   ter-sync) — sepakati repo & project Plane mana yang harus ditambahkan berikutnya.
6. **TSApp**: status go-live setelah 14 Sep dan siapa yang memegang support handover
   (lihat capture Ken 2026-09-01).

> Catatan sikap: pertanyaan 5 dan kartu developer dipakai untuk **membuka hambatan**, bukan
> menilai jumlah commit. Commit count bukan ukuran produktivitas.

### 4.5 Menunjukkan progres Dyah ke Ken (tanpa fitur baru)

Ken ingin melihat status "dalam satu tampilan" dan menilai apakah tim on track. Untuk besok,
pakai yang sudah ada dan siapkan **bukti**, bukan cerita:

- [ ] **Kartu developer Dyah**: pastikan aktivitas 2 minggu terakhir terisi (commit TSApp dari
      `sync:tsapp-git`, item KAIROSTSAP dari `sync:plane`, capture 2026-09-01..09-08). Kalau
      ada pekerjaan yang tidak lewat git/Plane (mis. investigasi disk penuh, license Epicor),
      pastikan tercatat sebagai capture agar muncul sebagai aktivitas manual.
- [ ] **Project Detail TSApp**: isi `nextStep`, `nextWhy`, `meeting.milestone` (mis. target
      go-live / support handover) dan `blocker` yang benar-benar terjadi. Tiap klaim harus
      punya link sumber (Plane / commit / capture).
- [ ] **Satu slide narasi 3 poin** untuk Ken: (1) selesai sejak pertemuan terakhir + bukti,
      (2) sedang dikerjakan + milestone + tanggal, (3) hambatan / butuh keputusan darinya.
- [ ] **Jujur soal batas**: sebutkan bahwa sync baru mencakup TSApp, AI belum aktif, dan
      data lokal (bukan hosted). Ini lebih kuat daripada dashboard yang tampak lengkap tapi
      tidak bisa dipertanggungjawabkan.
- [ ] **Jangan janjikan AI besok** kecuali Ollama benar-benar terpasang dan teruji (lihat
      Fase D). Kalau sempat, tunjukkan *mock* satu panel "Rekomendasi" yang jelas berlabel
      contoh.

---

## 5. ROADMAP

Prinsip urutan: data yang benar dulu → tampilan PM → AI di atas data yang rapi. Estimasi
kasar untuk 1 developer (Dyah) paruh waktu; sesuaikan.

### Fase A — Fondasi & keandalan (minggu ini, ±3–5 hari)

**Keluaran**: dashboard berjalan stabil di satu tempat, kode aman di git.

- Commit/push semua (lihat 3.1), rapikan `.gitignore`/CRLF (`.gitattributes` sudah ada).
- Perbarui `dashboard/docs/IMPLEMENTATION_PLAN.md` (buang Firebase; fase = Postgres/JWT).
- **Mode lokal (kondisi sekarang, per Dyah):** dashboard jalan di laptop Dyah. Konsekuensi
  yang harus diterima dan dimitigasi: (1) sync hanya jalan selama `npm run server` hidup →
  jadikan kebiasaan menyalakannya sebelum kerja/meeting atau pasang Task Scheduler;
  (2) data Postgres hanya ada di laptop → jadwalkan `pg_dump` berkala ke lokasi lain;
  (3) hanya Dyah yang bisa membukanya → untuk tim, tampilkan lewat screen share atau
  ekspor snapshot statis.
- **Hosting bersama (nanti, setelah Ken setuju)**: Ken menyarankan server TSApp dengan port
  terpisah — catat host, reverse proxy, port, approver, rollback → isi `projects.yaml`
  `apps.kapphelper.deploy`. *Catatan keamanan*: sync credential jangan ikut di server app
  klien; pakai satu runner terkontrol.
- Alert kalau `SyncRun` gagal; tampilkan "sync terakhir sukses" di UI (berlaku juga lokal).
- Ganti hack "sembunyikan item hari ini" dengan filter tanggal buatan pengguna.
- **Selesai bila**: URL internal stabil, login email Kairos, sync tiap jam terlihat di
  `SyncRun`, tidak ada file penting yang hanya ada di satu laptop.

### Fase B — Cakupan data (1–2 minggu)

**Keluaran**: semua project aktif dan semua developer muncul dengan data nyata.

- **Sync digerakkan registry**: baca `projects.yaml` (`repos`, `plane.project`) alih-alih
  hardcode TSApp; tambahkan repo TCS/TWPC (KairosWeb, KTime-POD), KDocVerify (KConnectApp),
  KFMS satu per satu.
- **Ingest capture** — *selesai 2026-09-24* (`dashboard/scripts/sync-captures.mjs`, origin `capture`,
  ikut `sync-all`): capture yang `from:`-nya developer terdaftar menjadi aktivitas; capture dari
  stakeholder (Ken, Iwan) dilewati. *Belum*: ingest memory, dan daftar "pertanyaan terbuka" dari
  `status: unconfirmed`, dan capture stakeholder sebagai timeline project.
- **Status project dari capture** — *selesai 2026-09-24*: frontmatter opsional (`project`, `health`,
  `milestone`, `milestone_date`, `blocker`, `next_step`, `active_dev`) memperbarui baris project;
  terbaru menang per field, diberi label "reported by <nama>, <tanggal>". Ini menutup celah
  milestone kosong tanpa mengedit `portfolio.json`.
- **Peta identitas developer**: `githubLogin`, `email`, `aliases` per orang (kolom sudah ada
  di `Developer`) supaya commit/work-item tak membuat profil ganda.
- **Model Milestone** baru: `Milestone{projectId, title, targetDate, status, ownerId}` +
  input lewat capture/CLI (bukan edit JSON manual). Menjawab "next milestone" dari Ken.
- **Snapshot harian** `ProjectSnapshot{projectId, date, health, openItems, blocked, ...}`
  supaya ada tren dan proyeksi, bukan hanya nilai terakhir.
- **Selesai bila**: setiap project aktif punya owner, developer, milestone bertanggal, dan
  ≥1 sumber sync; tidak ada "Needs verification" yang bisa diselesaikan dengan data.

### Fase C — Tampilan PM & tracking junior (1–2 minggu)

**Keluaran**: PM melihat beban dan hambatan tiap orang dalam satu halaman.

- **Role**: tambah `role` (`pm | lead | dev`) di `DevUser`; dev hanya lihat kartunya sendiri
  + portfolio, PM/lead lihat semua. Catatan 1:1 (jika ada) privat per PM.
- **Halaman Workload** per developer, semua dihitung dengan kode (deterministik):
  item Plane per state; **umur di state** (hari sejak `updatedAt`); item lewat
  `targetDate`; jumlah WIP; commit terakhir; handover/capture terakhir; flag
  "tanpa update > N hari" dan "blocked tanpa owner".
- **Halaman Project Health**: milestone vs tanggal target, open/blocked item, tren dari
  snapshot, dan proyeksi kasar "cukup waktu / tidak" — dengan label jelas bahwa itu
  estimasi.
- **Handover/EOD terstruktur**: template (selesai / bukti / blocker / next) yang ditulis
  lewat skill `/handover` dan masuk ke `Activity`; sejalan dengan cadence update klien
  per-4-jam (capture Ken 2026-09-01).
- **Selesai bila**: sebelum meeting, PM tidak perlu membuka Plane satu per satu untuk tahu
  siapa yang tersangkut dan project mana yang melenceng dari milestone.

### Fase D — AI Next-Goal Advisor (1–2 minggu, setelah A–C)

**Keluaran**: rekomendasi next goal/step per project dan per developer, dengan bukti.

**Alur (dua lapis)**

1. **Lapisan aturan (kode)** — hitung sinyal: stale > 10 hari, blocked, overdue, tanpa owner,
   milestone mendekat tanpa item terbuka selesai, capture `unconfirmed` yang menggantung.
2. **Lapisan LLM (server-side saja)** — menerima sinyal + potongan konteks yang sudah
   disanitasi (Project Card, milestone, item Plane, commit header, capture ringkas) dan
   menghasilkan JSON terstruktur:
   `{ projectHealth, topGoals[3], perDeveloperNextStep[], risks[], questionsForTeam[] }`
   — **setiap butir wajib `sources[]` (id Plane / SHA / nama capture) + tanggal freshness**.

**Penyimpanan & UI**: tabel `AiBrief{scope, inputHash, model, output, generatedAt}`; dibuat
ulang hanya saat input berubah; ditampilkan sebagai panel "Rekomendasi" (berlabel *saran,
bukan status terkonfirmasi*) di Team Meeting & Project Detail; tombol 👍/👎 + alasan
disimpan untuk menilai kualitas.

**Guardrail** (turunan prinsip plan): tidak pernah mengubah Plane; "draft issue" hanya
preview (alur seperti `/capture`); jika sumber bertentangan/basi → katakan dan minta
refresh; tidak menyimpulkan tanggal/approval/status rilis yang tidak tercatat; tanpa
secret, tanpa isi dokumen klien mentah.

**Model: Ollama (lokal) — sudah diputuskan.** Bagus untuk privasi: capture berisi data
klien dan detail IP (mis. desain approval tree KDocVerify), dan dengan Ollama lokal tidak
ada data yang keluar mesin. Konsekuensi teknis yang perlu dirancang:

- **Belum terpasang** di mesin ini (`ollama` tidak ditemukan; API `:11434` tidak menjawab).
  Langkah: pasang Ollama for Windows → `ollama pull <model>` → uji `curl
  http://127.0.0.1:11434/api/tags`.
- **Pilih model sesuai mesin** (RAM ±16 GB, tanpa GPU diskrit, disk ±12 GB): mulai dari
  model instruct 3B–4B (±2–3 GB) untuk kecepatan; naik ke 7B–8B Q4 (±4–5 GB) hanya bila
  kualitas ringkasan kurang dan disk cukup. Uji satu per satu dengan input nyata.
- **Konteks kecil → input harus diringkas dulu.** Model kecil buruk bila diberi data mentah
  banyak. Karena itu lapisan aturan (kode) yang menghitung sinyal dan memotong konteks per
  project; LLM hanya menyusun kalimat dan prioritas dari paket kecil itu.
- **Keluaran terstruktur:** panggil `POST /api/chat` dengan `format` JSON schema + `stream:
  false`, `temperature` rendah; validasi hasil di server; bila JSON tidak valid → ulangi
  sekali lalu tampilkan "tidak tersedia" (dashboard tetap berguna tanpa AI).
- **Sitasi bisa diverifikasi kode, bukan dipercaya:** setiap `sources[]` dari model dicek
  ada di paket input; butir tanpa sumber valid dibuang.
- **Latensi di CPU:** generate di latar belakang setelah sync (simpan di `AiBrief`), jangan
  saat halaman dibuka. Tampilkan "dibuat pada <waktu>, model <nama>".
- **Konfigurasi:** `OLLAMA_URL` dan `OLLAMA_MODEL` di `.env.server`; server memanggilnya,
  browser tidak pernah.

**Selesai bila**: developer bisa menjelaskan *kenapa* sebuah item direkomendasikan dan
membuka sumber persisnya; PM memakai ringkasan di meeting tanpa menganggapnya fakta.

### Fase E — Ritme operasional (setelahnya)

- Digest mingguan ke PM (email/Teams): blocked, milestone terancam, developer tanpa update.
- Ingest metadata SharePoint (judul, path, modified, owner, tag project — bukan isi).
- Basis pengetahuan troubleshooting (produk, gejala, penyebab, solusi) untuk support.
- Pembeda tampilan "live & menghasilkan" vs "prototype/MVP" bila dashboard dilihat pihak
  non-engineering (catatan Ken soal KFMS/KPortal dan IP KDocVerify).

---

## 6. Ringkasan urutan & dependensi

```
Malam ini : commit/push → stack hidup → data segar → uji     (syarat meeting 25 Sep)
Fase A    : hosting + scheduler stabil + doc dibersihkan
Fase B    : sync per registry + ingest capture + milestone + snapshot
Fase C    : role + workload + project health + handover terstruktur
Fase D    : AI advisor (butuh B & C; butuh keputusan model)
Fase E    : digest, SharePoint, support KB
```

## 7. Keputusan yang dibutuhkan (dan dari siapa)

| Keputusan | Dari | Memblokir |
|---|---|---|
| Host, port/subdomain, approver, rollback dashboard | Ken / pemilik server | Fase A |
| Siapa PM/lead (role) dan apa yang boleh dilihat junior | Ken + PM | Fase C |
| Plane = tracker kanonik untuk semua custom app? project Plane per app | Ken / tim | Fase B |
| ~~Model & penyedia AI~~ → **Ollama lokal (diputuskan 2026-09-24)**; tersisa: model mana yang muat di mesin, dan izin Ken bila nanti dijalankan di server | Dyah / Ken | Fase D |
| Folder SharePoint milik tim (bukan area pribadi) | Ken / IT | Fase E |
| Boleh/tidaknya `.env`/credential sync tinggal di runner terpisah | Ken | Fase A |

## 8. Risiko & mitigasi

| Risiko | Mitigasi |
|---|---|
| Satu orang (Dyah) jadi single point of failure untuk dashboard | Dokumentasi + hosting bersama + Jesynta ikut menjalankan `bootstrap` |
| Dashboard dipakai untuk menilai junior lewat commit count | Tampilkan sinyal hambatan (umur item, senyap), bukan skor; sepakati aturan pakai di tim |
| Data basi terlihat meyakinkan | Freshness badge + "sync terakhir sukses" + AI wajib sitasi |
| Bocor data klien/IP ke LLM eksternal | Model lokal atau sanitasi wajib; log apa yang dikirim |
| Migrasi Postgres belum terbukti | Uji malam ini; simpan `portfolio.json` sebagai cadangan baca |
| Dua sumber kebenaran (Plane vs portfolio.json manual) | Pindahkan fakta status ke Plane/registry/capture; JSON hanya seed → hilangkan bertahap |
