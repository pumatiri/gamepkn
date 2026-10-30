# PASAL NOIR — Detektif Konstitusi
Game edukasi PKN SMP berbasis Google Apps Script. Tagline: **"Pecahkan Kasus, Temukan Pasalnya."**

## 1. Cara Pasang (±5 menit)
1. Buat **Google Sheet** kosong, lalu buka **Extensions → Apps Script**.
2. Isi file **Code.gs** dengan `Code.gs`. Buat file script baru **Setup.gs**. Buat file **HTML** bernama persis `Index` (tanpa .html) dan isi dengan `Index.html`.
3. Pilih fungsi **`setup`** → **Run** → beri izin. Sheet, header, dropdown, akun admin, dan 2 kasus contoh dibuat otomatis.
4. **Deploy → New deployment → Web app** → *Execute as: Me*, *Who has access: Anyone* → Deploy. Salin URL-nya.
5. Login pertama: **admin / admin123**. Segera ganti lewat Panel Admin → Siswa → Reset password.
6. Setiap mengubah kode, buat **New version** pada deployment agar perubahan aktif.

## 2. Struktur Google Sheet

### Sheet `Kasus`
| Kolom | Isi | Contoh |
|---|---|---|
| CaseID | ID unik | K001 |
| Urutan | Urutan tampil | 1 |
| Judul | Judul kasus | Misteri Mading yang Dirobek |
| Kategori | Tema | Hak Warga Negara |
| Level | Mudah / Sedang / Sulit | Mudah |
| Lokasi | Latar tempat | SMP Nusantara Jaya · Koridor |
| Ikon | Kelas Font Awesome | fa-newspaper |
| Warna | amber / sky / emerald / rose / violet | amber |
| Ringkasan | 1–2 kalimat teaser | … |
| Narasi | Cerita kasus lengkap | … |
| Tokoh | Pisahkan dengan `\|`, format `Nama – peran` | Rani (8B) – penulis\|Bimo – pelaku |
| Tujuan | Misi belajar | … |
| Status | Aktif / Draft | Aktif |

### Sheet `Petunjuk` (bukti)
| Kolom | Isi |
|---|---|
| ClueID | ID unik (C001) |
| CaseID | Kasus induknya |
| Urutan | Urutan di papan bukti |
| Judul | Judul bukti |
| Jenis | Dokumen / Saksi / Rekaman / Bukti |
| Isi | Isi bukti |
| Biaya | `0` = gratis. Angka > 0 = terkunci dan memotong poin saat dibuka |

### Sheet `Pertanyaan`
| Kolom | Isi |
|---|---|
| QID, CaseID, Urutan | ID soal, kasus induk, urutan |
| Pertanyaan | Teks soal |
| OpsiA–OpsiD | Pilihan jawaban (boleh hanya 3 opsi) |
| Kunci | A / B / C / D (**tidak pernah dikirim ke browser sebelum dijawab**) |
| Pasal | Pasal rujukan, mis. `UUD 1945 Pasal 28E ayat (3)` |
| BunyiPasal | Kutipan bunyi pasal |
| Penjelasan | Analisis setelah menjawab |
| Poin | Poin per soal (default 20) |

### Sheet otomatis
- **Users**: UserID, Nama, Kelas, Username, PassHash, Salt, Role, Avatar, Status, Dibuat, LoginTerakhir. Password disimpan sebagai hash SHA-256 + salt, jangan diedit manual.
- **Hasil**: setiap kasus yang diselesaikan (skor, benar, petunjuk, durasi, bintang, detail per soal).
- **Pengaturan**: `KodeDaftar` (kode kelas untuk registrasi) dan `Pengumuman`.

> Menambah kasus baru: cukup tambah baris di `Kasus`, `Petunjuk`, dan `Pertanyaan` dengan CaseID yang sama. Tidak perlu mengubah kode.

## 3. Fitur
- Landing page dengan deskripsi, **Login & Register** (avatar, kode kelas opsional)
- Dashboard: pangkat & XP, bintang, peringkat, pengumuman guru
- Mode kasus: laporan kejadian → papan bukti (gratis & berbayar) → soal → analisis pasal → hasil
- Skor dihitung **di server** (anti-curang); kunci jawaban tersembunyi
- 5 jenjang pangkat, 3 bintang, papan peringkat per kelas, riwayat profil, ganti password
- **Panel Admin**: ringkasan, soal paling sering salah, kelola siswa (reset password, nonaktifkan, hapus), aktif/draft kasus, hasil + unduh CSV, kode daftar & pengumuman
- Dialog/konfirmasi/toast kustom (menggantikan kotak hitam bawaan GAS), logout dengan konfirmasi, tombol fullscreen, efek suara (bisa dimatikan), konfetti, animasi, tema noir
- Anti brute-force: 5x salah login → terkunci 5 menit

## 4. Catatan
- Fullscreen dapat diblokir di dalam bingkai Apps Script. Jika tombol tidak bekerja, buka URL Web App di tab sendiri atau tekan F11.
- Ambang pangkat ada di `RANKS` (Code.gs). Sesuaikan jika kasusnya sudah banyak.
- Batas bintang: 3★ ≥ 85%, 2★ ≥ 60%, 1★ ≥ 35% (fungsi `starsOf_`).
- Teks pasal pada data contoh perlu diverifikasi guru PKN sebelum dipakai di kelas.

## 5. Contoh 2 Skenario Kasus (sudah ada di `Setup.gs`)

### Kasus 1 — Misteri Mading yang Dirobek (Mudah)
**Narasi:** Mading ditemukan robek. Artikel Rani (8B) “Kantin Kita Perlu Lebih Bersih”, ditulis sopan dengan saran perbaikan, dirobek Bimo (OSIS) yang menyebutnya “bikin malu sekolah” dan melarang Rani menulis lagi.
**Bukti:** Artikel Rani (gratis), kesaksian Sinta (gratis), CCTV (−5), tata tertib (−5), keterangan Pak Hendra (−5).

| # | Pertanyaan | Kunci | Pasal |
|---|---|---|---|
| 1 | Apakah tulisan Rani melanggar aturan? | B: Tidak, sopan, faktual, ada saran | 28E ayat (3) |
| 2 | Hak yang dilanggar? | B: Hak mengeluarkan pendapat | 28E ayat (3) |
| 3 | Cocokkan pasalnya | A: Pasal 28E ayat (3) | 28E ayat (3) |
| 4 | Kewajiban Bimo yang diabaikan? | C: Menghormati HAM orang lain | 28J ayat (1) |
| 5 | Penyelesaian sesuai Sila ke-4? | C: Musyawarah, minta maaf, mading dipulihkan | Pancasila Sila ke-4 |

### Kasus 2 — Kasus Kelompok Belajar yang Menghilang (Sedang)
**Narasi:** Dimas, siswa pindahan dari Flores, tidak dimasukkan ke grup belajar IPA dan tim cerdas cermat oleh Tiara (ketua kelas) karena “logatnya aneh”, padahal nilai IPA-nya tertinggi kedua.
**Bukti:** Screenshot grup (gratis), cerita Dimas (gratis), daftar tim lomba (−5), aturan lomba Pak Arif (−5), percakapan kantin (−5).

| # | Pertanyaan | Kunci | Pasal |
|---|---|---|---|
| 1 | Bukti terkuat diskriminasi? | B: Dikecualikan karena logat/asal daerah | 28I ayat (2) |
| 2 | Cocokkan: pasal larangan diskriminasi | A: Pasal 28I ayat (2) | 28I ayat (2) |
| 3 | Hak lain yang terhambat? | B: Hak pendidikan | 31 ayat (1) |
| 4 | Kewajiban Tiara & teman-teman? | B: Menghormati HAM orang lain | 28J ayat (1) |
| 5 | Persatuan di tengah perbedaan daerah? | B: Sila ke-3 | Pancasila Sila ke-3 |

## 5b. Kasus Tambahan (K003–K006) → total 6 kasus: 2 Mudah, 2 Sedang, 2 Sulit

> Sudah pernah menjalankan `setup()` sebelumnya? Jalankan fungsi **`tambahKasusContoh`** (atau menu *Pasal Noir → Tambah kasus contoh*). Hanya kasus yang belum ada yang ditambahkan, data lama tidak disentuh.

| Kasus | Level | Tema | Pasal utama |
|---|---|---|---|
| K001 Misteri Mading yang Dirobek | Mudah | Kebebasan berpendapat | 28E(3), 28J(1), Sila 4 |
| K003 Jejak Sampah di Taman Sekolah | Mudah | Lingkungan sehat & kewajiban | 28H(1), 28J(1), Sila 5 |
| K002 Kelompok Belajar yang Menghilang | Sedang | Anti-diskriminasi | 28I(2), 31(1), 28J(1), Sila 3 |
| K004 Foto yang Menyebar di Grup Angkatan | Sedang | Martabat & dunia digital | 28G(1), 28J(1)(2), Sila 2 |
| K005 Dilema Aksi Duduk Soal Dana Kegiatan | Sulit | Berkumpul, informasi, batas hak | 28E(3), 28F, 28G(1), 28J(2), Sila 4 |
| K006 Kegiatan Rohani yang Memaksa | Sulit | Kebebasan beragama | 28E(1), 29(2), 28I(1)(2), Sila 1 |

Kasus Mudah/Sedang berisi 5 soal (maks 100 poin). Kasus Sulit berisi 6 soal dan 6 bukti (maks 120 poin) serta menguji beberapa pasal sekaligus, termasuk pembatasan hak (Pasal 28J ayat 2). Di dashboard kasus otomatis dikelompokkan per level.

Ambang pangkat disesuaikan: Magang 0 · Muda 80 · Madya 200 · Inspektur 350 · Komisaris Agung 500 XP.

## 5c. Mode Terang / Gelap
Slider di navbar (ikon matahari/bulan) mengganti tema. Pilihan tersimpan di browser dan dipakai lagi saat game dibuka berikutnya.

## 6. Ide Pengembangan
Kasus bertingkat (kunci kasus berikutnya), soal isian pasal, lencana khusus (mis. “Pakar Pasal 28”), mode kelompok/tim, foto ilustrasi per kasus (kolom `Gambar` dengan URL), ekspor sertifikat PDF untuk siswa yang menyelesaikan semua kasus.
