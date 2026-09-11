# KAppHelper — Checklist Kesiapan &amp; Workflow Developer

> Disusun 2026-09-02 berdasarkan kondisi repo saat ini (`main`, commit `abae76a`). Tujuan:
> menjawab "apakah kapphelper sudah bisa dipakai dev Kairos secara umum sekarang?" — bukan
> soal project klien.

## Ringkasan

Untuk **kamu + Jesynta di project yang sudah terisi** (TaiSin, KDocVerify), kapphelper sudah
jalan nyata — bukan draft. Registry punya deploy target lengkap, 5 skill sudah ditulis penuh
(bukan skeleton), dan `memory/`+`capture/` sudah berisi pelajaran/keputusan asli, bukan contoh
kosong.

Untuk **dev Kairos lain di luar kalian berdua**, atau **project selain TaiSin/KDocVerify**,
belum siap. Gap-nya konkret dan bisa dicek satu-satu — lihat checklist di bawah.

---

## Checklist sebelum bisa dipakai dev lain

### A. Registry (`projects.yaml`) — per project yang mau dipakaikan

- [ ] `active_dev` diisi nama devnya (bukan `null`)
- [ ] `deploy` / `deploys` block lengkap: `ssh_host`/`target`, `path`, `compose_file`,
      `services`, minimal satu `health` endpoint
- [ ] `common_commands` diisi (deploy, tail logs, db shell) — kalau kosong, skill `deploy`
      fallback ke template generik yang belum tervalidasi di project itu
- [ ] `plane.project` diisi kalau mau pakai `plane-sync`
- [ ] Status saat ini: **hanya `taisin` dan `kdocverify` yang lolos semua poin ini.**
      `twl`, `sushitei`, `galvins`, `kconnect_portals` masih skeleton (`active_dev: null`,
      sebagian `deploy.target: null` / placeholder `<verify — ...>`).

### B. Konteks per project

- [ ] `apps/<slug>/APP.md` atau `clients/<slug>/CLIENT.md` ada dan mutakhir
- [ ] Minimal 1 capture awal yang menjelaskan konteks project (bukan kosong)
- [ ] Kalau ada gotcha lintas project yang relevan, sudah ada di `memory/`
- [ ] Status: `twl`, `sushitei`, `galvins` — `context: null`, belum ada APP.md/CLIENT.md sama
      sekali. Dev yang pegang project ini tidak akan dapat briefing apa-apa dari
      `session-start`.

### C. Akses &amp; environment dev baru

- [ ] Dev baru punya akses ke repo GitHub `kapphelper` (org `Kairos-Business-Solutions`)
- [ ] `bootstrap.sh` (Linux) / `bootstrap.ps1` (Windows) sudah dites di mesin selain milik
      Dyah &amp; Jesynta — **belum pernah divalidasi di mesin ketiga**
- [ ] Dev baru sudah tahu aturan Ken: repo ini hidup di `~/klaudecode/kapphelper/`, bukan di
      dalam repo app manapun
- [ ] SSH alias (`~/.ssh/config`) untuk target deploy yang relevan sudah dikonfigurasi
      per-dev (kredensial pribadi, bukan shared)
- [ ] Plane MCP terkoneksi kalau mau pakai `plane-sync` / draft issue dari `capture`

### D. Proses &amp; kesepakatan tim

- [ ] Semua dev sepakat pola "pull dulu sebelum kerja, push sebelum logout" (`session-start`
      pull, `handover` push) — kalau tidak, capture bisa divergen antar mesin
- [ ] Semua dev tahu: **jangan** `git add .` mentah-mentah di kapphelper (risiko commit
      sesuatu yang seharusnya di-scrub)
- [ ] Semua dev tahu kapan sesuatu masuk `capture/` vs `memory/` vs edit langsung
      `projects.yaml` (skill `capture` step 1 sudah punya tabel ini, tinggal dibaca)
- [ ] Ada kesepakatan siapa yang boleh approve draft Plane issue jadi issue asli (skill tidak
      pernah auto-create, tapi seseorang harus jadi yang bilang "y")

### E. Yang masih kosong/belum dibangun (jangan diklaim sudah bisa)

- [ ] `standards/` baru berisi pointer ke handbook lama — belum ada `dotnet.md`, `node.md`,
      `flutter.md` per-stack
- [ ] `deploy.mode: executed` (Claude jalanin deploy langsung tanpa advisory) belum dipakai di
      project manapun — semua masih `advisory`
- [ ] Belum ada skill untuk mobile deploy (App Store/Play Store) — masih manual per
      `iOS-Deployment-Guide.md`
- [ ] Belum ada validasi konflik multi-writer beneran (dua dev capture bersamaan) — baru
      terdokumentasi di `docs/using-kapphelper.md`, belum teruji di lapangan dengan &gt;2 mesin

**Kesimpulan checklist:** siap dipakai **hari ini** untuk kamu+Jesynta di TaiSin/KDocVerify.
Untuk rollout ke dev lain atau project lain, isi dulu poin A+B untuk project itu — ini kerja
1-2 jam per project (isi `projects.yaml` + tulis APP.md/CLIENT.md awal), bukan kerja besar.

---

## Workflow developer dengan kapphelper (day-to-day)

Begini rasanya kalau kapphelper dipakai penuh, dari mulai sesi sampai selesai:

### 1. Mulai sesi → `/session-start` (otomatis di awal sesi)

```
cd ~/klaudecode/kapphelper && git pull --ff-only
```

Claude baca `projects.yaml`, tanya/konfirmasi project mana yang mau dikerjakan, baca
`APP.md`/`CLIENT.md` + 3 capture terakhir + `memory/MEMORY.md`, cek git state repo app-nya
(uncommitted? behind origin?), lalu kasih briefing satu paragraf:

> **TaiSin** — branch `phase-2-build`, 0 uncommitted.
> Last commit: `docs(taisin): ...` (2 hari lalu).
> Recent capture: 2026-08-24 — email test-mode audit.
> Ada 2 issue urgent di Plane.
> Mau mulai dari mana?

Dev tidak perlu buka-buka file manual atau nanya "gimana progress kemarin" — briefing ini
jawabnya.

### 2. Kerja seperti biasa

Edit code di repo app (`KairosTSApp/`, `KConnectApp/`, dll) seperti biasa. Kapphelper tidak
ikut campur di sini — ini bukan tempat nyimpan code.

### 3. Ada keputusan/info penting → `/capture`

Kapan dipicu: Ken bikin keputusan di meeting, ada email/WhatsApp yang perlu diingat, atau nemu
gotcha yang bakal kepake lagi. Claude akan:

- Tanya siapa/apa/tipe kalau belum jelas (jangan nebak)
- **Scrub credential dulu** sebelum nulis (password, token, connection string diganti
  `<REDACTED>`)
- Tulis file baru `apps/<slug>/capture/2026-09-02_<siapa>_<topik>.md` — append-only, tidak
  pernah edit capture lama
- Kalau actionable → draft Plane issue, **tunggu approve** sebelum benar-benar dibuat

### 4. Perlu deploy/restart/lihat log → `/deploy`

```
User: "deploy tsapp pilot"
```

Claude cek `projects.yaml` untuk target itu, jalanin pre-flight non-privileged via SSH (cek
branch, uncommitted, commit terbaru di server), lalu kasih command siap-pakai:

```
▶ tsapp pilot — ready to deploy
Run this in your SSH terminal (sudo will prompt for password):
─────────────────────────────
cd /opt/KairosTSApp && git pull && sudo docker compose up -d --build
─────────────────────────────
Paste hasil output-nya, aku verifikasi dari sini.
```

Dev jalankan sendiri (karena butuh password sudo), paste hasilnya balik, Claude cek health
endpoint dan konfirmasi sukses/gagal. Ini yang disebut mode `advisory` — Claude tidak pernah
pegang password sudo.

### 5. Cek beban kerja → `/plane-sync` (opsional, kapan saja)

Nanya "apa yang harus aku kerjakan?" — Claude query Plane, silangkan dengan capture yang sudah
ada, tunjukkan gap (issue urgent yang belum ada capture-nya), dan tawarkan draft capture untuk
yang belum tercatat. Read-only ke Plane — tidak pernah ubah status/comment di sana.

### 6. Selesai sesi → `/handover`

```
cd ~/klaudecode/kapphelper && git pull --ff-only && git push
```

Sebelum push, Claude scan sesi ini: ada keputusan/gotcha yang belum di-capture? Tanya dulu satu
list singkat, tunggu jawaban, baru commit+push. Kalau ada perubahan uncommitted di repo app
(bukan kapphelper), diingatkan tapi **tidak** ikut di-push — repo app itu urusan terpisah,
reviewer beda.

Setelah ini, mesin lain (server Jesynta / laptop Dyah) akan lihat semuanya di
`session-start` berikutnya.

### Ringkasan siklus

```
session-start (pull + briefing)
      ↓
   kerja code seperti biasa
      ↓
capture (keputusan/gotcha)  ←→  plane-sync (cek beban kerja, opsional)
      ↓
   deploy (kalau perlu ship)
      ↓
handover (push, sebelum ganti mesin/selesai sesi)
```

Yang membedakan ini dari sekadar "nyimpen notes di folder": setiap langkah punya aturan
tegas — jangan nebak project kalau ambigu, jangan auto-create Plane issue, jangan commit
credential, jangan deploy ke target yang tidak ada di registry, jangan pull password sudo
lewat SSH. Itu semua sudah tertulis di masing-masing `SKILL.md`, bukan konvensi lisan.
