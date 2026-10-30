/**
 * ============================================================
 *  PASAL NOIR — Setup.gs
 *  Jalankan setup() SEKALI untuk membuat semua sheet,
 *  header, dropdown validasi, akun admin, dan 2 kasus contoh.
 *  Aman dijalankan ulang: data yang sudah ada tidak ditimpa.
 * ============================================================
 */
function setup() {
  var ss = ss_();
  Object.keys(SCHEMA).forEach(function (name) {
    var sh = ss.getSheetByName(name) || ss.insertSheet(name);
    var h = SCHEMA[name];
    if (sh.getLastRow() === 0) {
      sh.getRange(1, 1, 1, h.length).setValues([h]);
    }
    sh.getRange(1, 1, 1, h.length).setFontWeight('bold').setBackground('#0b1220').setFontColor('#f5b942');
    sh.setFrozenRows(1);
    sh.setColumnWidths(1, h.length, 130);
  });

  // Users: semua kolom teks agar hash/ID tidak diubah jadi angka
  var us = ss.getSheetByName('Users');
  us.getRange(1, 1, 1000, SCHEMA.Users.length).setNumberFormat('@');
  us.setColumnWidth(5, 220);

  // Lebar kolom teks panjang + wrap
  wide_(ss, 'Kasus', ['Ringkasan', 'Narasi', 'Tokoh', 'Tujuan'], 320);
  wide_(ss, 'Petunjuk', ['Isi'], 380);
  wide_(ss, 'Pertanyaan', ['Pertanyaan', 'OpsiA', 'OpsiB', 'OpsiC', 'OpsiD', 'BunyiPasal', 'Penjelasan'], 260);

  // Dropdown validasi agar guru tidak salah ketik
  dv_(ss, 'Pertanyaan', 'Kunci', ['A', 'B', 'C', 'D']);
  dv_(ss, 'Kasus', 'Level', ['Mudah', 'Sedang', 'Sulit']);
  dv_(ss, 'Kasus', 'Status', ['Aktif', 'Draft']);
  dv_(ss, 'Kasus', 'Warna', ['amber', 'sky', 'emerald', 'rose', 'violet']);
  dv_(ss, 'Petunjuk', 'Jenis', ['Dokumen', 'Saksi', 'Rekaman', 'Bukti']);
  dv_(ss, 'Users', 'Role', ['siswa', 'admin']);
  dv_(ss, 'Users', 'Status', ['Aktif', 'Nonaktif']);

  // Pengaturan default
  if (sheet_('Pengaturan').getLastRow() < 2) {
    append_('Pengaturan', { Kunci: 'KodeDaftar', Nilai: '' });
    append_('Pengaturan', { Kunci: 'Pengumuman', Nilai: 'Selamat datang, Detektif! Dua kasus pertama sudah dibuka. Selidiki dengan teliti!' });
  }

  // Akun admin awal
  var hasAdmin = table_('Users').some(function (u) { return String(u.Role) === 'admin'; });
  if (!hasAdmin) {
    var salt = Utilities.getUuid();
    append_('Users', {
      UserID: 'U_ADMIN', Nama: 'Admin Guru', Kelas: 'GURU', Username: 'admin', PassHash: hash_(salt, 'admin123'),
      Salt: salt, Role: 'admin', Avatar: '🧑‍🏫', Status: 'Aktif', Dibuat: nowStr_(), LoginTerakhir: ''
    });
  }

  // Data contoh (hanya jika sheet masih kosong)
  if (sheet_('Kasus').getLastRow() < 2) seedSample_();

  SpreadsheetApp.flush();
  Logger.log('Setup selesai. Login admin: admin / admin123 (segera ganti!).');
  try { SpreadsheetApp.getActive().toast('Setup selesai! Login admin: admin / admin123', 'Pasal Noir', 8); } catch (e) {}
}

function resetAdminPassword() {
  var u = table_('Users').filter(function (x) { return String(x.Username) === 'admin'; })[0];
  if (!u) throw new Error('Akun admin tidak ditemukan.');
  var salt = Utilities.getUuid();
  setCell_('Users', u._row, 'Salt', salt);
  setCell_('Users', u._row, 'PassHash', hash_(salt, 'admin123'));
  Logger.log('Password admin direset menjadi admin123');
}

function wide_(ss, name, cols, w) {
  var sh = ss.getSheetByName(name), h = headers_(sh);
  cols.forEach(function (c) {
    var i = h.indexOf(c) + 1;
    if (i > 0) { sh.setColumnWidth(i, w); sh.getRange(2, i, 500, 1).setWrap(true).setVerticalAlignment('top'); }
  });
}
function dv_(ss, name, col, list) {
  var sh = ss.getSheetByName(name), i = headers_(sh).indexOf(col) + 1;
  if (i < 1) return;
  var rule = SpreadsheetApp.newDataValidation().requireValueInList(list, true).setAllowInvalid(false).build();
  sh.getRange(2, i, 998, 1).setDataValidation(rule);
}
/* Menambah baris hanya jika ID (kolom pertama) belum ada → aman dijalankan berulang */
function rows_(name, objs) {
  var key = SCHEMA[name][0], have = {};
  table_(name).forEach(function (r) { have[String(r[key])] = 1; });
  objs.forEach(function (o) { if (!have[String(o[key])]) append_(name, o); });
}

/* Untuk yang sudah terlanjur setup: jalankan ini untuk menambah kasus K003–K006 tanpa menyentuh data lama. */
function tambahKasusContoh() {
  seedSample_();
  SpreadsheetApp.flush();
  try { SpreadsheetApp.getActive().toast('Kasus contoh K001–K006 sudah lengkap.', 'Pasal Noir', 6); } catch (e) {}
}

/* ------------------------------------------------------------------
 *  DATA CONTOH — 2 kasus siap main
 * ------------------------------------------------------------------ */
function seedSample_() {
  rows_('Kasus', [
    {
      CaseID: 'K001', Urutan: 1, Judul: 'Misteri Mading yang Dirobek', Kategori: 'Hak Warga Negara', Level: 'Mudah',
      Lokasi: 'SMP Nusantara Jaya · Koridor Kelas 8', Ikon: 'fa-newspaper', Warna: 'amber',
      Ringkasan: 'Artikel kritik sopan di mading dirobek oleh pengurus OSIS. Hak siapa yang dilanggar?',
      Narasi: 'Senin pagi, mading sekolah ditemukan robek dan berserakan di lantai koridor. Yang dirobek adalah artikel milik Rani (kelas 8B) berjudul “Kantin Kita Perlu Lebih Bersih”. Artikel itu ditulis dengan bahasa sopan, dilengkapi foto, dan ditutup dengan saran perbaikan. Bimo, salah satu pengurus OSIS, mengaku merobeknya karena “bikin malu sekolah” dan melarang Rani menulis kritik lagi. Sejak hari itu Rani takut menyampaikan pendapat di kelas. Sebagai Detektif Konstitusi, kumpulkan bukti, tentukan hak yang dilanggar, lalu cocokkan dengan pasal yang tepat.',
      Tokoh: 'Rani (8B) – penulis artikel|Bimo – pengurus OSIS, terduga pelaku|Sinta – saksi, teman sekelas|Pak Hendra – pembina OSIS',
      Tujuan: 'Memahami hak mengeluarkan pendapat (Pasal 28E ayat 3), kewajiban menghormati hak orang lain (Pasal 28J ayat 1), dan penyelesaian masalah secara musyawarah (Sila ke-4).',
      Status: 'Aktif'
    },
    {
      CaseID: 'K002', Urutan: 2, Judul: 'Kasus Kelompok Belajar yang Menghilang', Kategori: 'Anti-Diskriminasi', Level: 'Sedang',
      Lokasi: 'SMP Nusantara Jaya · Ruang Kelas 8A', Ikon: 'fa-user-group', Warna: 'sky',
      Ringkasan: 'Siswa pindahan tidak diajak belajar kelompok dan lomba karena logatnya. Pasal apa yang dilanggar?',
      Narasi: 'Dimas, siswa pindahan dari Flores, baru dua minggu di kelas 8A. Sejak hari pertama, ia merasa dijauhi. Grup belajar IPA dibentuk lewat grup chat tanpa mengundangnya. Ketika sekolah membuka seleksi lomba cerdas cermat, Tiara (ketua kelas) memilih sendiri anggotanya dan tidak memasukkan Dimas, padahal nilai IPA Dimas termasuk yang tertinggi. Dimas mulai malas berangkat sekolah dan nilainya menurun. Pak Arif, guru IPA, belum mengetahui hal ini. Telusuri bukti-buktinya dan temukan pasal yang dilanggar.',
      Tokoh: 'Dimas – siswa pindahan|Tiara – ketua kelas, terduga pelaku|Pak Arif – guru IPA|Kevin – teman sekelas, saksi',
      Tujuan: 'Memahami larangan diskriminasi (Pasal 28I ayat 2), hak mendapat pendidikan (Pasal 31 ayat 1), kewajiban menghormati HAM orang lain (Pasal 28J ayat 1), dan Sila ke-3 Persatuan Indonesia.',
      Status: 'Aktif'
    }
  ]);

  rows_('Petunjuk', [
    { ClueID: 'C001', CaseID: 'K001', Urutan: 1, Judul: 'Artikel Rani yang tersisa', Jenis: 'Dokumen', Biaya: 0,
      Isi: 'Potongan artikel berjudul “Kantin Kita Perlu Lebih Bersih”. Isinya menyebut meja kantin sering lengket dan tempat sampah penuh. Tidak ada kata kasar, tidak menyebut nama orang, dan ditutup dengan kalimat: “Mari bersama menjaga kebersihan kantin kita.”' },
    { ClueID: 'C002', CaseID: 'K001', Urutan: 2, Judul: 'Kesaksian Sinta', Jenis: 'Saksi', Biaya: 0,
      Isi: '“Aku lihat Bimo merobek artikel itu sambil bilang, ‘Jangan bikin malu sekolah! Lain kali jangan nulis beginian lagi.’ Rani cuma diam dan matanya berkaca-kaca.”' },
    { ClueID: 'C003', CaseID: 'K001', Urutan: 3, Judul: 'Rekaman CCTV Koridor', Jenis: 'Rekaman', Biaya: 5,
      Isi: 'Pukul 06.52: Bimo datang sendirian, membaca mading, lalu merobek satu artikel. Tidak ada guru atau pembina mading di lokasi. Tidak ada surat izin penurunan artikel yang terlihat.' },
    { ClueID: 'C004', CaseID: 'K001', Urutan: 4, Judul: 'Buku Tata Tertib Sekolah', Jenis: 'Dokumen', Biaya: 5,
      Isi: 'Tata tertib menyebut mading adalah sarana siswa menyampaikan gagasan secara sopan dan bertanggung jawab. Yang dilarang hanyalah penghinaan, kabar bohong, dan SARA. Kritik yang membangun tidak dilarang.' },
    { ClueID: 'C005', CaseID: 'K001', Urutan: 5, Judul: 'Keterangan Pak Hendra', Jenis: 'Saksi', Biaya: 5,
      Isi: '“Pengurus OSIS bertugas mengelola mading, bukan menyensor isinya. Kalau ada keberatan, silakan bicara baik-baik dan beri hak jawab, bukan merobek.”' },

    { ClueID: 'C006', CaseID: 'K002', Urutan: 1, Judul: 'Tangkapan layar grup “Tim IPA Hebat”', Jenis: 'Dokumen', Biaya: 0,
      Isi: 'Grup berisi 9 dari 10 siswa kelas 8A. Satu-satunya yang tidak ada: Dimas. Tiara menulis: “Cukup yang udah akrab aja ya. Yang logatnya aneh nanti repot.”' },
    { ClueID: 'C007', CaseID: 'K002', Urutan: 2, Judul: 'Cerita Dimas', Jenis: 'Saksi', Biaya: 0,
      Isi: '“Aku sudah tanya boleh ikut kerja kelompok, katanya sudah penuh. Aku juga mau ikut cerdas cermat karena nilai IPA-ku bagus. Tapi katanya mereka cari yang ‘satu geng’ saja.”' },
    { ClueID: 'C008', CaseID: 'K002', Urutan: 3, Judul: 'Daftar tim lomba cerdas cermat', Jenis: 'Dokumen', Biaya: 5,
      Isi: 'Tim dipilih langsung oleh Tiara tanpa tes. Nilai rata-rata IPA Dimas: 88, tertinggi kedua di kelas. Tiga anggota tim terpilih bernilai di bawah 80.' },
    { ClueID: 'C009', CaseID: 'K002', Urutan: 4, Judul: 'Aturan lomba dari Pak Arif', Jenis: 'Dokumen', Biaya: 5,
      Isi: 'Lomba terbuka untuk seluruh siswa. Seleksi berdasarkan kemampuan dan kesediaan. Tidak ada syarat asal daerah, logat, atau kedekatan pertemanan.' },
    { ClueID: 'C010', CaseID: 'K002', Urutan: 5, Judul: 'Percakapan di kantin', Jenis: 'Rekaman', Biaya: 5,
      Isi: 'Kevin mendengar Tiara berkata, “Biarin aja dia, nanti juga pindah lagi,” dan teman-temannya tertawa. Dimas duduk sendirian di meja pojok.' }
  ]);

  rows_('Pertanyaan', [
    { QID: 'Q001', CaseID: 'K001', Urutan: 1, Poin: 20,
      Pertanyaan: 'Berdasarkan artikel dan kesaksian, apakah tulisan Rani melanggar aturan sekolah?',
      OpsiA: 'Ya, karena mencemarkan nama baik sekolah.',
      OpsiB: 'Tidak, karena disampaikan dengan sopan, berdasarkan fakta, dan disertai saran.',
      OpsiC: 'Ya, karena hanya pengurus OSIS yang boleh menulis di mading.',
      OpsiD: 'Belum bisa dinilai sebelum seluruh siswa memberikan suara.',
      Kunci: 'B', Pasal: 'UUD 1945 Pasal 28E ayat (3)',
      BunyiPasal: 'Setiap orang berhak atas kebebasan berserikat, berkumpul, dan mengeluarkan pendapat.',
      Penjelasan: 'Kritik Rani sopan, faktual, dan membangun, sehingga tidak melanggar aturan. Menyampaikan pendapat seperti ini adalah bagian dari hak warga negara.' },
    { QID: 'Q002', CaseID: 'K001', Urutan: 2, Poin: 20,
      Pertanyaan: 'Hak warga negara apa yang paling jelas dilanggar oleh tindakan Bimo?',
      OpsiA: 'Hak memperoleh pendidikan.',
      OpsiB: 'Hak mengeluarkan pendapat.',
      OpsiC: 'Hak memeluk agama.',
      OpsiD: 'Hak atas pekerjaan yang layak.',
      Kunci: 'B', Pasal: 'UUD 1945 Pasal 28E ayat (3)',
      BunyiPasal: 'Setiap orang berhak atas kebebasan berserikat, berkumpul, dan mengeluarkan pendapat.',
      Penjelasan: 'Dengan merobek artikel dan melarang Rani menulis lagi, Bimo menghalangi Rani menyampaikan pendapatnya.' },
    { QID: 'Q003', CaseID: 'K001', Urutan: 3, Poin: 20,
      Pertanyaan: 'Cocokkan! Pasal UUD 1945 mana yang paling tepat dengan kasus ini?',
      OpsiA: 'Pasal 28E ayat (3) — kebebasan mengeluarkan pendapat.',
      OpsiB: 'Pasal 30 ayat (1) — hak dan kewajiban membela negara.',
      OpsiC: 'Pasal 31 ayat (1) — hak mendapat pendidikan.',
      OpsiD: 'Pasal 29 ayat (2) — kebebasan memeluk agama.',
      Kunci: 'A', Pasal: 'UUD 1945 Pasal 28E ayat (3)',
      BunyiPasal: 'Setiap orang berhak atas kebebasan berserikat, berkumpul, dan mengeluarkan pendapat.',
      Penjelasan: 'Kasus ini tentang kebebasan menyampaikan pendapat lewat tulisan, sehingga pasal yang cocok adalah Pasal 28E ayat (3).' },
    { QID: 'Q004', CaseID: 'K001', Urutan: 4, Poin: 20,
      Pertanyaan: 'Kewajiban Bimo sebagai warga negara yang diabaikan dalam kasus ini adalah...',
      OpsiA: 'Membayar pajak tepat waktu.',
      OpsiB: 'Ikut serta dalam pembelaan negara.',
      OpsiC: 'Menghormati hak asasi manusia orang lain.',
      OpsiD: 'Menjunjung hukum dan pemerintahan.',
      Kunci: 'C', Pasal: 'UUD 1945 Pasal 28J ayat (1)',
      BunyiPasal: 'Setiap orang wajib menghormati hak asasi manusia orang lain dalam tertib kehidupan bermasyarakat, berbangsa, dan bernegara.',
      Penjelasan: 'Hak dan kewajiban berjalan seimbang. Bimo wajib menghormati hak Rani untuk berpendapat, bukan membungkamnya.' },
    { QID: 'Q005', CaseID: 'K001', Urutan: 5, Poin: 20,
      Pertanyaan: 'Menurut Sila ke-4 Pancasila, penyelesaian terbaik untuk kasus ini adalah...',
      OpsiA: 'Bimo dihukum berat tanpa diberi kesempatan menjelaskan.',
      OpsiB: 'Rani dilarang menulis lagi agar suasana tenang.',
      OpsiC: 'Rani dan Bimo dipertemukan untuk bermusyawarah, Bimo meminta maaf, dan mading dipulihkan.',
      OpsiD: 'Masalah dibiarkan karena kejadiannya sudah lewat.',
      Kunci: 'C', Pasal: 'Pancasila Sila ke-4',
      BunyiPasal: 'Kerakyatan yang dipimpin oleh hikmat kebijaksanaan dalam permusyawaratan/perwakilan.',
      Penjelasan: 'Sila ke-4 mengajarkan penyelesaian masalah lewat musyawarah untuk mufakat, dengan saling mendengar dan menghargai.' },

    { QID: 'Q006', CaseID: 'K002', Urutan: 1, Poin: 20,
      Pertanyaan: 'Bukti mana yang paling kuat menunjukkan bahwa Dimas didiskriminasi, bukan sekadar kebetulan?',
      OpsiA: 'Dimas jarang berbicara di kelas.',
      OpsiB: 'Dimas dikecualikan karena logat dan asal daerahnya, bukan karena kemampuannya.',
      OpsiC: 'Grup belajar kebetulan sudah penuh.',
      OpsiD: 'Nilai Dimas menurun akhir-akhir ini.',
      Kunci: 'B', Pasal: 'UUD 1945 Pasal 28I ayat (2)',
      BunyiPasal: 'Setiap orang berhak bebas dari perlakuan yang bersifat diskriminatif atas dasar apa pun dan berhak mendapatkan perlindungan terhadap perlakuan yang bersifat diskriminatif itu.',
      Penjelasan: 'Pesan Tiara di grup menunjukkan alasan pengecualian adalah logat Dimas. Itu perlakuan pembedaan atas dasar asal daerah, yaitu diskriminasi.' },
    { QID: 'Q007', CaseID: 'K002', Urutan: 2, Poin: 20,
      Pertanyaan: 'Cocokkan! Pasal UUD 1945 yang melarang perlakuan diskriminatif adalah...',
      OpsiA: 'Pasal 28I ayat (2)',
      OpsiB: 'Pasal 27 ayat (3)',
      OpsiC: 'Pasal 29 ayat (1)',
      OpsiD: 'Pasal 33 ayat (1)',
      Kunci: 'A', Pasal: 'UUD 1945 Pasal 28I ayat (2)',
      BunyiPasal: 'Setiap orang berhak bebas dari perlakuan yang bersifat diskriminatif atas dasar apa pun dan berhak mendapatkan perlindungan terhadap perlakuan yang bersifat diskriminatif itu.',
      Penjelasan: 'Pasal 28I ayat (2) menjamin setiap orang bebas dari perlakuan diskriminatif atas dasar apa pun, termasuk asal daerah dan logat.' },
    { QID: 'Q008', CaseID: 'K002', Urutan: 3, Poin: 20,
      Pertanyaan: 'Selain bebas dari diskriminasi, hak Dimas yang terhambat karena tidak boleh ikut belajar kelompok dan lomba adalah...',
      OpsiA: 'Hak atas pekerjaan — Pasal 27 ayat (2).',
      OpsiB: 'Hak mendapat pendidikan — Pasal 31 ayat (1).',
      OpsiC: 'Hak memeluk agama — Pasal 29 ayat (2).',
      OpsiD: 'Hak menerima bantuan sosial.',
      Kunci: 'B', Pasal: 'UUD 1945 Pasal 31 ayat (1)',
      BunyiPasal: 'Setiap warga negara berhak mendapat pendidikan.',
      Penjelasan: 'Belajar kelompok dan lomba adalah bagian dari proses pendidikan. Dimas berhak mendapat kesempatan yang sama.' },
    { QID: 'Q009', CaseID: 'K002', Urutan: 4, Poin: 20,
      Pertanyaan: 'Kewajiban Tiara dan teman-temannya terhadap Dimas menurut UUD 1945 adalah...',
      OpsiA: 'Mengutamakan teman yang sudah akrab.',
      OpsiB: 'Menghormati hak asasi manusia orang lain.',
      OpsiC: 'Membela negara dengan ikut upacara.',
      OpsiD: 'Membayar iuran kelas tepat waktu.',
      Kunci: 'B', Pasal: 'UUD 1945 Pasal 28J ayat (1)',
      BunyiPasal: 'Setiap orang wajib menghormati hak asasi manusia orang lain dalam tertib kehidupan bermasyarakat, berbangsa, dan bernegara.',
      Penjelasan: 'Setiap hak selalu berpasangan dengan kewajiban untuk menghormati hak orang lain, termasuk hak teman baru di kelas.' },
    { QID: 'Q010', CaseID: 'K002', Urutan: 5, Poin: 20,
      Pertanyaan: 'Menjaga persatuan di tengah perbedaan asal daerah dan logat adalah pengamalan Pancasila sila ke-...',
      OpsiA: 'Sila ke-1 — Ketuhanan Yang Maha Esa.',
      OpsiB: 'Sila ke-3 — Persatuan Indonesia.',
      OpsiC: 'Sila ke-4 — Kerakyatan.',
      OpsiD: 'Sila ke-5 — Keadilan sosial.',
      Kunci: 'B', Pasal: 'Pancasila Sila ke-3',
      BunyiPasal: 'Persatuan Indonesia.',
      Penjelasan: 'Sila ke-3 menekankan persatuan dalam keberagaman (Bhinneka Tunggal Ika). Bangsa kuat bila semua daerah dirangkul, bukan dijauhi.' }
  ]);
  seedMore_();
}

/* ------------------------------------------------------------------
 *  KASUS TAMBAHAN: K003 (Mudah), K004 (Sedang), K005 & K006 (Sulit)
 * ------------------------------------------------------------------ */
function seedMore_() {
  rows_('Kasus', [
    {
      CaseID: 'K003', Urutan: 3, Judul: 'Jejak Sampah di Taman Sekolah', Kategori: 'Kewajiban Warga Negara', Level: 'Mudah',
      Lokasi: 'SMP Nusantara Jaya · Taman Belakang Kelas 7C', Ikon: 'fa-leaf', Warna: 'emerald',
      Ringkasan: 'Sampah menumpuk lalu dibakar, asapnya membuat siswa asma sesak napas. Siapa yang lalai?',
      Narasi: 'Setiap istirahat, taman belakang kelas 7C dipenuhi bungkus jajanan dan botol plastik. Tiga hari berturut-turut kelompok piket Gilang tidak bertugas. Bak sampah penuh, sehingga Pak Joko, petugas kebersihan, terpaksa membakar tumpukan sampah di belakang kelas. Asapnya masuk ke ruang 7C. Nadia, siswa yang memiliki asma, batuk dan sesak napas hingga dibawa ke UKS. Gilang berkilah, “Nanti juga ada yang bersihin.” Sebagai Detektif Konstitusi, tentukan hak yang terganggu, kewajiban yang diabaikan, dan nilai Pancasila yang relevan.',
      Tokoh: 'Nadia (7C) – siswa penderita asma|Gilang (7C) – anggota piket yang lalai|Pak Joko – petugas kebersihan|Citra (7C) – saksi',
      Tujuan: 'Memahami hak atas lingkungan hidup yang baik dan sehat (Pasal 28H ayat 1), kewajiban menghormati hak orang lain (Pasal 28J ayat 1), dan keseimbangan hak–kewajiban (Sila ke-5).',
      Status: 'Aktif'
    },
    {
      CaseID: 'K004', Urutan: 4, Judul: 'Kasus Foto yang Menyebar di Grup Angkatan', Kategori: 'Martabat & Dunia Digital', Level: 'Sedang',
      Lokasi: 'SMP Nusantara Jaya · Grup Chat Angkatan 8', Ikon: 'fa-mobile-screen-button', Warna: 'violet',
      Ringkasan: 'Foto Salsa yang tersandung dijadikan stiker ejekan dan menyebar ke banyak grup. Siapa yang bersalah?',
      Narasi: 'Salsa (kelas 8C) tersandung di lorong. Dika memotretnya diam-diam, memberi caption ejekan, lalu mengirimnya ke grup “Angkatan 8 Squad” yang beranggota 143 siswa. Dalam dua hari foto itu dijadikan stiker dan diteruskan ke enam grup lain. Salsa malu, sulit tidur, dan berpura-pura sakit agar tidak masuk sekolah. Ketika ditegur, Dika berkata, “Aku cuma bercanda. Bebas dong, ini hak aku berpendapat.” Telusuri bukti dan tentukan siapa melanggar apa.',
      Tokoh: 'Salsa (8C) – korban|Dika (8C) – pengirim pertama|Bu Wulan – guru BK|Rizky (8B) – teman yang meneruskan pesan',
      Tujuan: 'Memahami hak atas perlindungan martabat dan rasa aman (Pasal 28G ayat 1), batas kebebasan berpendapat (Pasal 28J), dan nilai kemanusiaan (Sila ke-2).',
      Status: 'Aktif'
    },
    {
      CaseID: 'K005', Urutan: 5, Judul: 'Dilema Aksi Duduk Soal Dana Kegiatan', Kategori: 'Berpendapat & Ketertiban', Level: 'Sulit',
      Lokasi: 'SMP Nusantara Jaya · Lapangan Upacara', Ikon: 'fa-bullhorn', Warna: 'rose',
      Ringkasan: 'Aksi damai menuntut transparansi dana bercampur penutupan gerbang, spanduk tuduhan, dan ancaman skorsing.',
      Narasi: 'OSIS dan 60 siswa kelas 9 meminta laporan penggunaan dana ekstrakurikuler dibuka. Setelah mengirim surat sehari sebelumnya, mereka melakukan aksi duduk tertib di lapangan pukul 12.30–13.00. Namun sekitar sepuluh siswa kelas 8 ikut-ikutan menutup gerbang samping dan menahan guru yang akan lewat. Seorang siswa memasang spanduk “Bendahara = Maling Dana!” tanpa bukti apa pun. Kepala sekolah lalu melarang semua bentuk kumpul-kumpul siswa dan mengancam skorsing tiga hari kepada seluruh peserta, tanpa membedakan peran. Pisahkan mana yang dilindungi konstitusi, mana yang melampaui batas, dan mana respons yang berlebihan.',
      Tokoh: 'Ketua OSIS – penyampai tuntutan|Bendahara kegiatan – sasaran tuduhan|Kepala Sekolah – pengambil keputusan|Pak Reza – guru piket, saksi|Ketua Komite Sekolah – perwakilan orang tua',
      Tujuan: 'Membedakan hak berkumpul dan berpendapat (Pasal 28E ayat 3), hak atas informasi (Pasal 28F), perlindungan kehormatan (Pasal 28G ayat 1), dan pembatasan hak yang proporsional (Pasal 28J ayat 2).',
      Status: 'Aktif'
    },
    {
      CaseID: 'K006', Urutan: 6, Judul: 'Kegiatan Rohani yang Memaksa', Kategori: 'Kebebasan Beragama', Level: 'Sulit',
      Lokasi: 'SMP Nusantara Jaya · Aula Sekolah', Ikon: 'fa-hands-praying', Warna: 'sky',
      Ringkasan: 'Siswa diwajibkan mengikuti ibadah agama lain, nilai dipotong bila tidak hadir. Pasal apa saja yang dilanggar?',
      Narasi: 'Sekolah mengadakan Kegiatan Rohani Akhir Semester yang diwajibkan untuk semua siswa. Isinya ibadah dan ceramah dari satu agama saja. Siswa yang tidak hadir dikurangi 20 poin nilai Pendidikan Agama. Dina (kelas 9) meminta izin beribadah dan belajar agama sesuai agama yang ia anut. Wali kelas menjawab, “Ikut saja, cuma sekali, daripada nilaimu dipotong.” Dina akhirnya ikut karena takut. Setelah itu ia dijauhi sebagian temannya karena dianggap “sok beda”. Analisis kasus ini dengan cermat, karena ada lebih dari satu pasal yang bekerja bersamaan.',
      Tokoh: 'Dina (9B) – siswa terdampak|Bu Ratna – wali kelas 9B|Kepala Sekolah – penanggung jawab kegiatan|Michael (9B) – saksi, teman sekelas',
      Tujuan: 'Memahami kebebasan beragama (Pasal 28E ayat 1, Pasal 29 ayat 2), hak yang tidak dapat dikurangi (Pasal 28I ayat 1), larangan diskriminasi (Pasal 28I ayat 2), dan Sila ke-1.',
      Status: 'Aktif'
    }
  ]);

  rows_('Petunjuk', [
    { ClueID: 'C011', CaseID: 'K003', Urutan: 1, Judul: 'Foto taman sekolah', Jenis: 'Dokumen', Biaya: 0,
      Isi: 'Foto pukul 10.20: sekitar 40 bungkus jajanan, botol plastik, dan tisu berserakan di rumput. Tiga tempat sampah di taman terlihat kosong dan bersih.' },
    { ClueID: 'C012', CaseID: 'K003', Urutan: 2, Judul: 'Cerita Nadia', Jenis: 'Saksi', Biaya: 0,
      Isi: '“Aku punya asma. Kemarin asap dari sampah yang dibakar di belakang kelas masuk ke ruangan. Aku batuk dan sesak sampai dibawa ke UKS.”' },
    { ClueID: 'C013', CaseID: 'K003', Urutan: 3, Judul: 'Jadwal piket kelas 7C', Jenis: 'Dokumen', Biaya: 5,
      Isi: 'Giliran piket taman minggu ini: Gilang, Rafi, Bayu, Citra. Selama tiga hari berturut-turut kelompok ini tidak melaksanakan piket dan tidak ada yang menegur.' },
    { ClueID: 'C014', CaseID: 'K003', Urutan: 4, Judul: 'Keterangan Pak Joko', Jenis: 'Saksi', Biaya: 5,
      Isi: '“Sampah menumpuk karena tidak dipilah dan bak penuh. Saya terpaksa membakarnya di belakang kelas. Saya tidak tahu ada murid yang punya asma.”' },
    { ClueID: 'C015', CaseID: 'K003', Urutan: 5, Judul: 'Rekaman HP Citra', Jenis: 'Rekaman', Biaya: 5,
      Isi: 'Gilang berkata, “Buang di situ aja, nanti juga ada yang bersihin,” lalu melempar bungkus jajanan ke rerumputan, padahal tempat sampah hanya lima langkah darinya.' },

    { ClueID: 'C016', CaseID: 'K004', Urutan: 1, Judul: 'Tangkapan layar grup “Angkatan 8 Squad”', Jenis: 'Dokumen', Biaya: 0,
      Isi: 'Foto Salsa yang sedang tersandung di lorong, dilengkapi stiker dan caption ejekan “Salsa si tukang jatuh”. Pengirim: Dika. Anggota grup: 143 siswa. Salsa tidak pernah memberi izin.' },
    { ClueID: 'C017', CaseID: 'K004', Urutan: 2, Judul: 'Cerita Salsa', Jenis: 'Saksi', Biaya: 0,
      Isi: '“Aku malu sekali. Fotoku dijadikan stiker dan dikirim ke grup kelas lain. Sekarang aku takut lewat lorong dan pura-pura sakit supaya tidak sekolah.”' },
    { ClueID: 'C018', CaseID: 'K004', Urutan: 3, Judul: 'Catatan penerusan pesan', Jenis: 'Rekaman', Biaya: 5,
      Isi: 'Dalam dua hari, foto itu diteruskan ke enam grup lain oleh 17 siswa. Sebagian hanya menambahkan emoji tertawa tanpa komentar apa pun, termasuk Rizky.' },
    { ClueID: 'C019', CaseID: 'K004', Urutan: 4, Judul: 'Pengakuan Dika', Jenis: 'Saksi', Biaya: 5,
      Isi: '“Aku cuma bercanda. Bebas dong mau kirim apa saja, ini hak aku berpendapat. Aku nggak niat jahat.”' },
    { ClueID: 'C020', CaseID: 'K004', Urutan: 5, Judul: 'Catatan Bu Wulan (guru BK)', Jenis: 'Dokumen', Biaya: 5,
      Isi: 'Salsa menunjukkan tanda cemas: sulit tidur, menolak masuk kelas, dan menangis saat istirahat. Foto diambil dan disebar tanpa izinnya.' },

    { ClueID: 'C021', CaseID: 'K005', Urutan: 1, Judul: 'Surat tuntutan OSIS', Jenis: 'Dokumen', Biaya: 0,
      Isi: 'OSIS dan 60 siswa kelas 9 meminta laporan penggunaan dana ekstrakurikuler dibuka. Aksi duduk tenang pukul 12.30–13.00, tidak mengganggu pelajaran. Suratnya sudah diserahkan ke kepala sekolah sehari sebelumnya.' },
    { ClueID: 'C022', CaseID: 'K005', Urutan: 2, Judul: 'Kesaksian Pak Reza (guru piket)', Jenis: 'Saksi', Biaya: 0,
      Isi: '“Aksi duduknya tertib. Tetapi sekitar sepuluh siswa kelas 8 menutup gerbang samping dan menahan guru yang mau lewat, sampai saya tegur.”' },
    { ClueID: 'C023', CaseID: 'K005', Urutan: 3, Judul: 'Foto spanduk', Jenis: 'Dokumen', Biaya: 5,
      Isi: 'Spanduk bertuliskan “Bendahara = Maling Dana!” Tidak ada lampiran bukti, catatan, atau hasil pemeriksaan apa pun.' },
    { ClueID: 'C024', CaseID: 'K005', Urutan: 4, Judul: 'Surat kepala sekolah', Jenis: 'Dokumen', Biaya: 5,
      Isi: 'Kepala sekolah menyatakan semua bentuk kumpul-kumpul siswa dilarang dan seluruh peserta akan diskors tiga hari, tanpa memisahkan siapa yang hanya duduk tertib dan siapa yang menutup gerbang.' },
    { ClueID: 'C025', CaseID: 'K005', Urutan: 5, Judul: 'Aturan keterbukaan dana sekolah', Jenis: 'Dokumen', Biaya: 5,
      Isi: 'Peraturan sekolah menyebut perwakilan OSIS dapat melihat laporan dana kegiatan siswa setiap akhir semester. Semester ini laporan belum pernah dibuka.' },
    { ClueID: 'C026', CaseID: 'K005', Urutan: 6, Judul: 'Pernyataan Ketua Komite', Jenis: 'Saksi', Biaya: 5,
      Isi: '“Kami terbuka untuk berdialog. Sayangnya sebelum aksi ini belum ada yang mengajak kami duduk bersama.”' },

    { ClueID: 'C027', CaseID: 'K006', Urutan: 1, Judul: 'Surat edaran sekolah', Jenis: 'Dokumen', Biaya: 0,
      Isi: 'Kegiatan Rohani Akhir Semester wajib diikuti seluruh siswa. Isi kegiatan: ibadah dan ceramah satu agama. Siswa yang tidak hadir dikurangi 20 poin nilai Pendidikan Agama.' },
    { ClueID: 'C028', CaseID: 'K006', Urutan: 2, Judul: 'Cerita Dina', Jenis: 'Saksi', Biaya: 0,
      Isi: '“Aku minta izin beribadah dan belajar agama sesuai agamaku. Kata wali kelas, ikut saja, cuma sekali, daripada nilaiku dipotong. Aku ikut karena takut.”' },
    { ClueID: 'C029', CaseID: 'K006', Urutan: 3, Judul: 'Komentar teman sekelas', Jenis: 'Saksi', Biaya: 5,
      Isi: 'Michael: “Beberapa anak bilang Dina sok beda. Sekarang dia makan sendirian dan ada yang melarang temannya bergaul dengannya.”' },
    { ClueID: 'C030', CaseID: 'K006', Urutan: 4, Judul: 'Daftar guru agama sekolah', Jenis: 'Dokumen', Biaya: 5,
      Isi: 'Sekolah hanya memiliki guru untuk dua agama. Siswa dengan agama lain belum pernah memperoleh pembelajaran agama yang sesuai dengan agamanya.' },
    { ClueID: 'C031', CaseID: 'K006', Urutan: 5, Judul: 'Ketentuan nilai Pendidikan Agama', Jenis: 'Dokumen', Biaya: 5,
      Isi: 'Nilai Pendidikan Agama seharusnya berasal dari pembelajaran agama yang dianut siswa, bukan dari kehadiran di kegiatan ibadah agama lain.' },
    { ClueID: 'C032', CaseID: 'K006', Urutan: 6, Judul: 'Tanggapan wali kelas', Jenis: 'Saksi', Biaya: 5,
      Isi: '“Kegiatan ini sudah tradisi dan membuat siswa disiplin. Kalau cuma sekali, tidak apa-apa, kan?”' }
  ]);

  rows_('Pertanyaan', [
    /* ---------- K003 · Mudah ---------- */
    { QID: 'Q011', CaseID: 'K003', Urutan: 1, Poin: 20,
      Pertanyaan: 'Hak Nadia yang terganggu oleh asap pembakaran sampah adalah hak atas...',
      OpsiA: 'Pendidikan yang layak.', OpsiB: 'Lingkungan hidup yang baik dan sehat.', OpsiC: 'Berserikat dan berkumpul.', OpsiD: 'Kebebasan memilih pekerjaan.',
      Kunci: 'B', Pasal: 'UUD 1945 Pasal 28H ayat (1)',
      BunyiPasal: 'Setiap orang berhak hidup sejahtera lahir dan batin, bertempat tinggal, dan mendapatkan lingkungan hidup yang baik dan sehat serta berhak memperoleh pelayanan kesehatan.',
      Penjelasan: 'Asap pembakaran sampah mengganggu kesehatan Nadia. Hak atas lingkungan yang baik dan sehat dijamin oleh Pasal 28H ayat (1).' },
    { QID: 'Q012', CaseID: 'K003', Urutan: 2, Poin: 20,
      Pertanyaan: 'Kebiasaan Gilang membuang sampah sembarangan mengabaikan kewajiban untuk...',
      OpsiA: 'Membayar pajak tepat waktu.', OpsiB: 'Ikut serta dalam pembelaan negara.', OpsiC: 'Mengikuti upacara bendera setiap Senin.', OpsiD: 'Menghormati hak asasi orang lain dalam kehidupan bersama.',
      Kunci: 'D', Pasal: 'UUD 1945 Pasal 28J ayat (1)',
      BunyiPasal: 'Setiap orang wajib menghormati hak asasi manusia orang lain dalam tertib kehidupan bermasyarakat, berbangsa, dan bernegara.',
      Penjelasan: 'Lingkungan bersih adalah hak semua orang. Dengan membuang sampah sembarangan, Gilang tidak menghormati hak teman-temannya, termasuk Nadia.' },
    { QID: 'Q013', CaseID: 'K003', Urutan: 3, Poin: 20,
      Pertanyaan: 'Cocokkan! Pasal mana yang menjamin hak atas lingkungan hidup yang baik dan sehat?',
      OpsiA: 'Pasal 28H ayat (1)', OpsiB: 'Pasal 28I ayat (2)', OpsiC: 'Pasal 30 ayat (1)', OpsiD: 'Pasal 31 ayat (1)',
      Kunci: 'A', Pasal: 'UUD 1945 Pasal 28H ayat (1)',
      BunyiPasal: 'Setiap orang berhak hidup sejahtera lahir dan batin, bertempat tinggal, dan mendapatkan lingkungan hidup yang baik dan sehat serta berhak memperoleh pelayanan kesehatan.',
      Penjelasan: 'Pasal 28I ayat (2) tentang diskriminasi, Pasal 30 ayat (1) tentang pertahanan negara, dan Pasal 31 ayat (1) tentang pendidikan. Yang mengatur lingkungan sehat adalah Pasal 28H ayat (1).' },
    { QID: 'Q014', CaseID: 'K003', Urutan: 4, Poin: 20,
      Pertanyaan: 'Berdasarkan seluruh bukti, akar masalah yang membuat Pak Joko terpaksa membakar sampah adalah...',
      OpsiA: 'Nadia terlalu sensitif terhadap asap.', OpsiB: 'Pak Joko memang ingin mengganggu siswa.', OpsiC: 'Piket dan pemilahan sampah tidak dijalankan sehingga sampah menumpuk.', OpsiD: 'Taman sekolah terlalu luas.',
      Kunci: 'C', Pasal: 'UUD 1945 Pasal 28J ayat (1)',
      BunyiPasal: 'Setiap orang wajib menghormati hak asasi manusia orang lain dalam tertib kehidupan bermasyarakat, berbangsa, dan bernegara.',
      Penjelasan: 'Jadwal piket dan kesaksian Pak Joko menunjukkan masalah bermula dari kelalaian bersama menjaga kebersihan, bukan dari Nadia atau Pak Joko.' },
    { QID: 'Q015', CaseID: 'K003', Urutan: 5, Poin: 20,
      Pertanyaan: 'Menjaga keseimbangan antara hak dan kewajiban serta menghormati hak orang lain adalah nilai dari sila ke-...',
      OpsiA: 'Sila ke-1 — Ketuhanan Yang Maha Esa.', OpsiB: 'Sila ke-3 — Persatuan Indonesia.', OpsiC: 'Sila ke-4 — Kerakyatan.', OpsiD: 'Sila ke-5 — Keadilan sosial.',
      Kunci: 'D', Pasal: 'Pancasila Sila ke-5',
      BunyiPasal: 'Keadilan sosial bagi seluruh rakyat Indonesia.',
      Penjelasan: 'Sila ke-5 menuntut sikap adil, menyeimbangkan hak dan kewajiban, serta menghormati hak orang lain, termasuk dalam menjaga lingkungan bersama.' },

    /* ---------- K004 · Sedang ---------- */
    { QID: 'Q016', CaseID: 'K004', Urutan: 1, Poin: 20,
      Pertanyaan: 'Hak Salsa yang paling jelas dilanggar oleh penyebaran fotonya adalah hak atas...',
      OpsiA: 'Kebebasan memilih tempat tinggal.', OpsiB: 'Kepastian hukum yang adil.', OpsiC: 'Perlindungan diri pribadi, kehormatan, martabat, dan rasa aman.', OpsiD: 'Kebebasan berkumpul.',
      Kunci: 'C', Pasal: 'UUD 1945 Pasal 28G ayat (1)',
      BunyiPasal: 'Setiap orang berhak atas perlindungan diri pribadi, keluarga, kehormatan, martabat, dan harta benda yang di bawah kekuasaannya, serta berhak atas rasa aman dan perlindungan dari ancaman ketakutan untuk berbuat atau tidak berbuat sesuatu yang merupakan hak asasi.',
      Penjelasan: 'Foto Salsa diambil dan disebar tanpa izin untuk mengejeknya. Itu merendahkan martabat dan merampas rasa aman Salsa, sesuai Pasal 28G ayat (1).' },
    { QID: 'Q017', CaseID: 'K004', Urutan: 2, Poin: 20,
      Pertanyaan: 'Dika berkata, “Ini hak aku berpendapat.” Mengapa alasan itu tidak dapat dibenarkan?',
      OpsiA: 'Karena UUD 1945 tidak mengatur kebebasan berpendapat.', OpsiB: 'Karena menjalankan hak tetap harus menghormati hak dan martabat orang lain.', OpsiC: 'Karena hanya guru yang boleh membagikan foto.', OpsiD: 'Karena foto itu sudah ada sebelum Dika mengirimnya.',
      Kunci: 'B', Pasal: 'UUD 1945 Pasal 28J ayat (2)',
      BunyiPasal: 'Dalam menjalankan hak dan kebebasannya, setiap orang wajib tunduk kepada pembatasan yang ditetapkan dengan undang-undang dengan maksud semata-mata untuk menjamin pengakuan serta penghormatan atas hak dan kebebasan orang lain dan untuk memenuhi tuntutan yang adil sesuai dengan pertimbangan moral, nilai-nilai agama, keamanan, dan ketertiban umum dalam suatu masyarakat demokratis.',
      Penjelasan: 'Kebebasan berpendapat memang dijamin, tetapi bukan kebebasan tanpa batas. Hak seseorang berakhir ketika mulai merugikan hak dan martabat orang lain.' },
    { QID: 'Q018', CaseID: 'K004', Urutan: 3, Poin: 20,
      Pertanyaan: 'Teman-teman yang hanya meneruskan foto itu dan menambah emoji tertawa tanpa komentar...',
      OpsiA: 'Tidak bersalah karena bukan pembuat pesan pertama.', OpsiB: 'Bersalah sama persis dengan Dika dan harus dikeluarkan.', OpsiC: 'Tidak bermasalah karena foto sudah ramai.', OpsiD: 'Ikut memperluas pelanggaran, sehingga juga wajib menghormati martabat Salsa.',
      Kunci: 'D', Pasal: 'UUD 1945 Pasal 28J ayat (1)',
      BunyiPasal: 'Setiap orang wajib menghormati hak asasi manusia orang lain dalam tertib kehidupan bermasyarakat, berbangsa, dan bernegara.',
      Penjelasan: 'Setiap penerus pesan membuat Salsa dipermalukan di lebih banyak tempat. Kewajiban menghormati hak orang lain berlaku bagi semua yang terlibat, meski bentuk perannya berbeda.' },
    { QID: 'Q019', CaseID: 'K004', Urutan: 4, Poin: 20,
      Pertanyaan: 'Langkah yang paling melindungi Salsa saat ini adalah...',
      OpsiA: 'Meminta foto dihapus dari semua grup, melapor ke guru BK, dan mendampingi Salsa.', OpsiB: 'Meminta Salsa membalas dengan menyebarkan foto Dika.', OpsiC: 'Menyuruh Salsa mengabaikan dan tidak perlu cerita ke siapa pun.', OpsiD: 'Menunggu sampai fotonya hilang dengan sendirinya.',
      Kunci: 'A', Pasal: 'UUD 1945 Pasal 28G ayat (1)',
      BunyiPasal: 'Setiap orang berhak atas perlindungan diri pribadi, keluarga, kehormatan, martabat, dan harta benda yang di bawah kekuasaannya, serta berhak atas rasa aman dan perlindungan dari ancaman ketakutan untuk berbuat atau tidak berbuat sesuatu yang merupakan hak asasi.',
      Penjelasan: 'Perlindungan nyata berarti menghentikan penyebaran, melibatkan pihak yang berwenang, dan memberi dukungan. Membalas dengan pelanggaran lain hanya memperbesar masalah.' },
    { QID: 'Q020', CaseID: 'K004', Urutan: 5, Poin: 20,
      Pertanyaan: 'Menghargai martabat sesama dan tidak memperlakukan orang lain dengan semena-mena adalah nilai sila ke-...',
      OpsiA: 'Sila ke-1 — Ketuhanan Yang Maha Esa.', OpsiB: 'Sila ke-2 — Kemanusiaan yang adil dan beradab.', OpsiC: 'Sila ke-4 — Kerakyatan.', OpsiD: 'Sila ke-5 — Keadilan sosial.',
      Kunci: 'B', Pasal: 'Pancasila Sila ke-2',
      BunyiPasal: 'Kemanusiaan yang adil dan beradab.',
      Penjelasan: 'Sila ke-2 mengajarkan saling menghormati martabat manusia, tenggang rasa, dan tidak semena-mena, termasuk saat bermedia sosial.' },

    /* ---------- K005 · Sulit ---------- */
    { QID: 'Q021', CaseID: 'K005', Urutan: 1, Poin: 20,
      Pertanyaan: 'Bagian mana dari rangkaian kejadian ini yang dilindungi konstitusi sebagai hak berkumpul dan berpendapat?',
      OpsiA: 'Aksi duduk tertib menuntut keterbukaan dana, yang sudah diberitahukan lewat surat.', OpsiB: 'Menutup gerbang samping sekolah.', OpsiC: 'Menahan guru yang akan lewat.', OpsiD: 'Memasang spanduk tuduhan tanpa bukti.',
      Kunci: 'A', Pasal: 'UUD 1945 Pasal 28E ayat (3)',
      BunyiPasal: 'Setiap orang berhak atas kebebasan berserikat, berkumpul, dan mengeluarkan pendapat.',
      Penjelasan: 'Aksi duduk yang tertib, tidak mengganggu pelajaran, dan diberitahukan sebelumnya adalah bentuk sah dari berkumpul dan mengeluarkan pendapat.' },
    { QID: 'Q022', CaseID: 'K005', Urutan: 2, Poin: 20,
      Pertanyaan: 'Menutup gerbang dan menahan guru tidak dilindungi konstitusi karena...',
      OpsiA: 'Aksi apa pun dilarang di lingkungan sekolah.', OpsiB: 'Jumlah pesertanya terlalu sedikit.', OpsiC: 'Kebebasan berkumpul tidak boleh dipakai untuk melanggar hak dan ketertiban orang lain.', OpsiD: 'Dilakukan pada siang hari.',
      Kunci: 'C', Pasal: 'UUD 1945 Pasal 28J ayat (2)',
      BunyiPasal: 'Dalam menjalankan hak dan kebebasannya, setiap orang wajib tunduk kepada pembatasan yang ditetapkan dengan undang-undang dengan maksud semata-mata untuk menjamin pengakuan serta penghormatan atas hak dan kebebasan orang lain dan untuk memenuhi tuntutan yang adil sesuai dengan pertimbangan moral, nilai-nilai agama, keamanan, dan ketertiban umum dalam suatu masyarakat demokratis.',
      Penjelasan: 'Hak berkumpul dibatasi oleh hak orang lain dan ketertiban umum. Menahan guru menghilangkan kebebasan bergerak orang lain, sehingga melampaui batas.' },
    { QID: 'Q023', CaseID: 'K005', Urutan: 3, Poin: 20,
      Pertanyaan: 'Spanduk “Bendahara = Maling Dana!” bermasalah terutama karena...',
      OpsiA: 'Kritik terhadap pengelola dana tidak boleh dilakukan siswa.', OpsiB: 'Spanduk hanya boleh dibuat oleh OSIS.', OpsiC: 'Media spanduk dilarang di sekolah.', OpsiD: 'Menyerang kehormatan seseorang tanpa bukti, padahal setiap orang berhak atas perlindungan kehormatan dan martabat.',
      Kunci: 'D', Pasal: 'UUD 1945 Pasal 28G ayat (1)',
      BunyiPasal: 'Setiap orang berhak atas perlindungan diri pribadi, keluarga, kehormatan, martabat, dan harta benda yang di bawah kekuasaannya, serta berhak atas rasa aman dan perlindungan dari ancaman ketakutan untuk berbuat atau tidak berbuat sesuatu yang merupakan hak asasi.',
      Penjelasan: 'Siswa boleh mengkritik pengelolaan dana, tetapi tuduhan pidana tanpa bukti melanggar kehormatan bendahara. Kritik yang sah menyertakan data dan disampaikan lewat jalur yang tepat.' },
    { QID: 'Q024', CaseID: 'K005', Urutan: 4, Poin: 20,
      Pertanyaan: 'Cocokkan! Tuntutan siswa agar laporan dana dibuka sejalan dengan pasal yang menjamin hak untuk...',
      OpsiA: 'Memilih pendidikan dan pengajaran — Pasal 28E ayat (1).', OpsiB: 'Mencari dan memperoleh informasi — Pasal 28F.', OpsiC: 'Mendapat lingkungan hidup yang sehat — Pasal 28H ayat (1).', OpsiD: 'Ikut serta dalam pertahanan negara — Pasal 30 ayat (1).',
      Kunci: 'B', Pasal: 'UUD 1945 Pasal 28F',
      BunyiPasal: 'Setiap orang berhak untuk berkomunikasi dan memperoleh informasi untuk mengembangkan pribadi dan lingkungan sosialnya, serta berhak untuk mencari, memperoleh, memiliki, menyimpan, mengolah, dan menyampaikan informasi dengan menggunakan segala jenis saluran yang tersedia.',
      Penjelasan: 'Meminta keterbukaan laporan dana adalah bagian dari hak memperoleh informasi. Aturan sekolah sendiri juga mengakui hak OSIS melihat laporan tersebut.' },
    { QID: 'Q025', CaseID: 'K005', Urutan: 5, Poin: 20,
      Pertanyaan: 'Larangan total dan skorsing seluruh peserta tanpa melihat peran masing-masing sebaiknya dinilai sebagai...',
      OpsiA: 'Tepat, karena kepala sekolah berwenang penuh menentukan semuanya.', OpsiB: 'Tepat, karena seluruh peserta pasti melanggar hukum.', OpsiC: 'Berlebihan, karena pembatasan harus proporsional dan membedakan aksi damai dari tindakan yang melanggar hak orang lain.', OpsiD: 'Tidak perlu dinilai, karena urusan internal sekolah.',
      Kunci: 'C', Pasal: 'UUD 1945 Pasal 28J ayat (2)',
      BunyiPasal: 'Dalam menjalankan hak dan kebebasannya, setiap orang wajib tunduk kepada pembatasan yang ditetapkan dengan undang-undang dengan maksud semata-mata untuk menjamin pengakuan serta penghormatan atas hak dan kebebasan orang lain dan untuk memenuhi tuntutan yang adil sesuai dengan pertimbangan moral, nilai-nilai agama, keamanan, dan ketertiban umum dalam suatu masyarakat demokratis.',
      Penjelasan: 'Pembatasan hak boleh ada, tetapi hanya untuk melindungi hak orang lain dan ketertiban, serta harus adil dan sebanding. Menghukum aksi damai sama beratnya dengan pelanggaran adalah tidak proporsional.' },
    { QID: 'Q026', CaseID: 'K005', Urutan: 6, Poin: 20,
      Pertanyaan: 'Menurut Sila ke-4, penyelesaian yang paling tepat untuk kasus ini adalah...',
      OpsiA: 'Forum dialog OSIS, komite, dan kepala sekolah: laporan dana dibuka, siswa yang menutup gerbang dibina secara proporsional.', OpsiB: 'Kepala sekolah menunjuk pihak yang dianggap menang.', OpsiC: 'Aksi diperbesar sampai tuntutan dipenuhi sepenuhnya.', OpsiD: 'Semua pihak diam dan membiarkan masalah.',
      Kunci: 'A', Pasal: 'Pancasila Sila ke-4',
      BunyiPasal: 'Kerakyatan yang dipimpin oleh hikmat kebijaksanaan dalam permusyawaratan/perwakilan.',
      Penjelasan: 'Sila ke-4 mengutamakan musyawarah untuk mufakat. Dialog yang terbuka menyelesaikan akar masalah (transparansi) sekaligus meluruskan tindakan yang berlebihan.' },

    /* ---------- K006 · Sulit ---------- */
    { QID: 'Q027', CaseID: 'K006', Urutan: 1, Poin: 20,
      Pertanyaan: 'Hak paling mendasar yang dilanggar terhadap Dina adalah hak untuk...',
      OpsiA: 'Memilih pekerjaan.', OpsiB: 'Mendapat pendidikan, semata-mata.', OpsiC: 'Memeluk agama dan beribadat menurut agamanya.', OpsiD: 'Berserikat dan berkumpul.',
      Kunci: 'C', Pasal: 'UUD 1945 Pasal 28E ayat (1)',
      BunyiPasal: 'Setiap orang bebas memeluk agama dan beribadat menurut agamanya, memilih pendidikan dan pengajaran, memilih pekerjaan, memilih kewarganegaraan, memilih tempat tinggal di wilayah negara dan meninggalkannya, serta berhak kembali.',
      Penjelasan: 'Dina dipaksa mengikuti ibadah agama lain di bawah ancaman nilai. Itu menyentuh langsung kebebasannya memeluk dan menjalankan ibadah sesuai agamanya.' },
    { QID: 'Q028', CaseID: 'K006', Urutan: 2, Poin: 20,
      Pertanyaan: 'Cocokkan! Pasal yang menegaskan kewajiban NEGARA menjamin kemerdekaan tiap penduduk beribadat menurut agamanya adalah...',
      OpsiA: 'Pasal 29 ayat (2)', OpsiB: 'Pasal 29 ayat (1)', OpsiC: 'Pasal 28E ayat (3)', OpsiD: 'Pasal 28D ayat (1)',
      Kunci: 'A', Pasal: 'UUD 1945 Pasal 29 ayat (2)',
      BunyiPasal: 'Negara menjamin kemerdekaan tiap-tiap penduduk untuk memeluk agamanya masing-masing dan untuk beribadat menurut agamanya dan kepercayaannya itu.',
      Penjelasan: 'Pasal 29 ayat (1) menyatakan dasar negara adalah Ketuhanan Yang Maha Esa. Pasal 29 ayat (2) memuat jaminan negara atas kemerdekaan memeluk agama dan beribadat, termasuk di sekolah negeri maupun swasta.' },
    { QID: 'Q029', CaseID: 'K006', Urutan: 3, Poin: 20,
      Pertanyaan: 'Ancaman pemotongan 20 poin nilai bagi siswa yang tidak ikut ibadah agama lain merupakan...',
      OpsiA: 'Kebijakan disiplin yang wajar.', OpsiB: 'Perlakuan diskriminatif dan tekanan atas dasar agama.', OpsiC: 'Cara pendidikan karakter yang dibenarkan.', OpsiD: 'Hak mutlak sekolah dalam menilai siswa.',
      Kunci: 'B', Pasal: 'UUD 1945 Pasal 28I ayat (2)',
      BunyiPasal: 'Setiap orang berhak bebas dari perlakuan yang bersifat diskriminatif atas dasar apa pun dan berhak mendapatkan perlindungan terhadap perlakuan yang bersifat diskriminatif itu.',
      Penjelasan: 'Siswa dihukum dengan nilai hanya karena agamanya berbeda. Itu perlakuan yang membedakan dan menekan atas dasar agama, sehingga melanggar Pasal 28I ayat (2).' },
    { QID: 'Q030', CaseID: 'K006', Urutan: 4, Poin: 20,
      Pertanyaan: 'Wali kelas berkata, “Cuma sekali, tidak apa-apa.” Mengapa alasan itu tidak membenarkan paksaan?',
      OpsiA: 'Karena sekali memang boleh jika demi disiplin.', OpsiB: 'Karena hak beragama boleh dikurangi demi kepentingan sekolah.', OpsiC: 'Karena keputusan guru lebih tinggi daripada UUD 1945.', OpsiD: 'Karena hak beragama termasuk hak yang tidak dapat dikurangi dalam keadaan apa pun.',
      Kunci: 'D', Pasal: 'UUD 1945 Pasal 28I ayat (1)',
      BunyiPasal: 'Hak untuk hidup, hak untuk tidak disiksa, hak kemerdekaan pikiran dan hati nurani, hak beragama, hak untuk tidak diperbudak, hak untuk diakui sebagai pribadi di hadapan hukum, dan hak untuk tidak dituntut atas dasar hukum yang berlaku surut adalah hak asasi manusia yang tidak dapat dikurangi dalam keadaan apa pun.',
      Penjelasan: 'Hak beragama termasuk hak yang tidak dapat dikurangi dalam keadaan apa pun. Jumlah kali pemaksaan tidak mengubah pelanggarannya.' },
    { QID: 'Q031', CaseID: 'K006', Urutan: 5, Poin: 20,
      Pertanyaan: 'Solusi yang paling adil bagi sekolah adalah...',
      OpsiA: 'Dina tetap dipaksa ikut, tetapi diberi keringanan nilai.', OpsiB: 'Kegiatan rohani dijalankan sesuai agama masing-masing atau bersifat sukarela, pemotongan nilai dihapus, dan pembelajaran agama disediakan sesuai agama siswa.', OpsiC: 'Semua kegiatan keagamaan dihentikan selamanya.', OpsiD: 'Dina dipindahkan ke kelas lain.',
      Kunci: 'B', Pasal: 'UUD 1945 Pasal 29 ayat (2)',
      BunyiPasal: 'Negara menjamin kemerdekaan tiap-tiap penduduk untuk memeluk agamanya masing-masing dan untuk beribadat menurut agamanya dan kepercayaannya itu.',
      Penjelasan: 'Sekolah boleh membina kehidupan rohani siswa, tetapi tanpa paksaan. Setiap siswa berhak mendapat pembelajaran agama sesuai agama yang dianutnya. Menghentikan semua kegiatan atau memindahkan korban bukan solusi yang adil.' },
    { QID: 'Q032', CaseID: 'K006', Urutan: 6, Poin: 20,
      Pertanyaan: 'Saling menghormati antarpemeluk agama dan tidak memaksakan agama kepada orang lain adalah pengamalan sila ke-...',
      OpsiA: 'Sila ke-1 — Ketuhanan Yang Maha Esa.', OpsiB: 'Sila ke-2 — Kemanusiaan yang adil dan beradab.', OpsiC: 'Sila ke-3 — Persatuan Indonesia.', OpsiD: 'Sila ke-4 — Kerakyatan.',
      Kunci: 'A', Pasal: 'Pancasila Sila ke-1',
      BunyiPasal: 'Ketuhanan Yang Maha Esa.',
      Penjelasan: 'Sila ke-1 mengajarkan saling menghormati kebebasan menjalankan ibadah sesuai agama masing-masing dan tidak memaksakan agama atau kepercayaan kepada orang lain.' }
  ]);
}
