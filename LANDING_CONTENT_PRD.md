# PRD: Konten landing page Onyxa untuk kantin sekolah

Tanggal: 20 November 2026
Status: Disetujui Felix dan diterapkan pada landing page.

## Revisi konten 21 November 2026

Arahan terbaru Felix menggantikan draf hero dan tiga bagian setelahnya.
Hero kembali memakai “Foto nota. Onyxa yang catat.” dan deskripsi aslinya.
Bagian kendala POS membahas volume penjualan, dokumentasi arus kas, dan
pemantauan transaksi pegawai. Cara kerja mengikuti tiga langkah dari foto
nota, pelacakan pola pergerakan barang, hingga dashboard situasi toko.
Bagian berikutnya memperkenalkan rencana metrik pengeluaran bulanan,
actual gross profit, expected revenue vs actual cash, inventory velocity,
dan informasi tambahan untuk keputusan belanja.

## Arahan visual 22 November 2026

Empat bagian setelah hero memakai latar garis, titik, dan kurva. Motif mengikuti antrean kantin, tiga langkah pencatatan, tren metrik, dan nota kulakan pertama.

## 1. Problem

Landing page `/` saat ini memperkenalkan Onyxa sebagai pencatat nota untuk
usaha umum. Pesan ini belum menjelaskan kebutuhan kantin sekolah: lonjakan
pembeli selama istirahat 15–30 menit, pemasukan tunai dan QRIS statis yang
tidak merinci penjualan, pengeluaran kulakan yang terpisah, serta kurangnya
gambaran perputaran barang dan modal belanja per item.

Pembaca utama adalah pemilik atau pengelola kantin sekolah. Setelah membaca
halaman, mereka perlu memahami pendekatan Onyxa: mencatat barang masuk di luar
jam pelayanan dan mengembangkan rekap setoran harian, tanpa pencatatan setiap
barang keluar saat melayani pembeli.

## 2. Success criteria

- Hero secara langsung menyebut kantin sekolah dan pendekatan barang masuk.
- Keempat masalah dari latar belakang tercakup dalam bagian permasalahan.
- Alur menjelaskan restock, pelayanan tanpa input penjualan per item, setoran
  akhir hari, dan evaluasi berkala.
- Empat kapabilitas yang dijelaskan adalah pencatatan restock, setoran tunai
  dan QRIS, ringkasan keuangan, serta analitik perputaran barang.
- Fitur yang belum ditemukan implementasinya diberi keterangan pengembangan;
  tidak ada janji integrasi QRIS otomatis atau kemampuan baru yang sudah siap.
- Analitik restock disebut indikasi pergerakan, bukan pengukuran penjualan
  atau stok aktual. Selisih pemasukan dan belanja tidak disebut laba bersih
  yang pasti. Perbedaan potensi pendapatan dan setoran bukan bukti kebocoran.
- Teks, metadata halaman, CTA, dan footer menyampaikan posisi produk yang sama.
- Tampilan tetap terbaca pada lebar 390, 768, dan 1440 piksel. Tujuan tautan
  masuk, daftar, dashboard, dan pengaturan akun tetap berfungsi.

## 3. Scope

### Termasuk

Perubahan utama di `src/app/page.tsx`: metadata khusus landing page, hero,
empat permasalahan, alur penggunaan, empat kapabilitas, ajakan penutup, dan
footer. Ikon dan jumlah kolom dapat disesuaikan seperlunya agar sesuai isi.
Pertahankan identitas visual, ilustrasi nota, animasi, komponen tombol, dan
personalisasi CTA yang ada. CSS landing hanya disentuh bila teks baru
memerlukan perbaikan keterbacaan responsif.

### Di luar lingkup

Implementasi settlement, integrasi pembayaran, penyimpanan harga jual,
perhitungan laba atau shrinkage, perubahan dashboard, database, autentikasi,
arsitektur, dependensi, dan perombakan desain.

### Draf isi yang akan diterapkan

**Hero — Kelola kantin dari restock**

Catat belanja stok kantin sekolah dan pantau pola restock tanpa menginput
penjualan satu per satu saat jam istirahat.

CTA pengunjung: **Mulai mencatat** → `/daftar`.
CTA pengguna masuk: **Buka Dashboard** → `/beranda`.

**Permasalahan — Tantangan kantin sekolah**

Jam istirahat hanya 15–30 menit. Pencatatan harus mengikuti ritme pelayanan
kantin.

- **Antrean saat istirahat:** Input barang keluar satu per satu menambah
  pekerjaan saat banyak siswa membeli bersamaan.
- **Pemasukan sulit ditelusuri:** Uang tunai dan QRIS statis terkumpul tanpa
  rincian barang terjual, sehingga selisih sulit dijelaskan.
- **Belanja bulanan tercecer:** Catatan kulakan yang terpisah menyulitkan
  penghitungan pengeluaran dan perbandingannya dengan uang masuk.
- **Perputaran barang belum jelas:** Tanpa riwayat restock yang rapi,
  pengelola sulit mengenali pola belanja dan modal yang terserap per barang.

**Alur — Pencatatan di luar jam ramai**

- **Catat saat restock:** Foto nota atau masukkan belanja secara manual,
  lalu periksa barang, jumlah, dan harga belinya.
- **Fokus melayani siswa:** Layani pembeli tanpa kewajiban input setiap
  penjualan ke Onyxa.
- **Rekap saat tutup:** Arah pengembangan: catat setoran tunai bersih dan
  total penerimaan QRIS di akhir hari.
- **Evaluasi belanja:** Tinjau frekuensi dan volume restock untuk membantu
  menentukan kulakan berikutnya.

**Kapabilitas — Dari belanja ke keputusan**

- **Pencatatan barang masuk:** Rapikan nota kulakan, kuantitas, harga beli,
  dan pemasok dalam satu riwayat. Pencatatan harga jual direncanakan untuk
  melengkapi estimasi potensi pendapatan.
- **Setoran tunai dan QRIS:** Dalam pengembangan: rekap pemasukan akhir hari
  untuk membantu menelusuri selisih. QRIS statis dicatat sebagai total
  penerimaan, tanpa menjanjikan integrasi pesanan otomatis.
- **Ringkasan keuangan:** Riwayat belanja menjadi dasar penelusuran
  pengeluaran. Perbandingan dengan setoran harian direncanakan untuk
  menampilkan selisih kas periode.
- **Analitik perputaran barang:** Gunakan frekuensi, volume, dan interval
  restock sebagai indikasi barang yang bergerak lebih cepat atau melambat.
  Rekap nominal belanja per item menjadi arah pengembangan analitik.

Keterangan pada bagian analitik: Pola restock memberi indikasi pergerakan
barang. Perbedaan dengan setoran perlu ditinjau bersama sisa stok dan
penyesuaian lain; selisih tersebut belum membuktikan kebocoran atau laba bersih.

**Penutup — Mulai dari belanja kantin**

Bangun catatan barang masuk yang rapi untuk membantu keputusan kulakan
berikutnya.

CTA mengikuti keadaan akun seperti pada hero.

**Footer:** Pencatatan barang masuk dan analitik untuk kantin sekolah.

**Metadata:**

- Judul: Onyxa | Manajemen Kantin Sekolah
- Deskripsi: Catat belanja stok kantin sekolah dan pantau pola restock tanpa
  input penjualan satu per satu. Kenali arah pengembangan setoran harian Onyxa.

## 4. Constraints

- Gunakan Bahasa Indonesia yang mudah dipahami pengelola kantin.
- Ikuti `AGENTS.md`, panduan Next.js lokal, dan komponen yang sudah dipakai.
- Halaman tetap di `app/page.tsx`; tidak menambah API atau akses data baru.
- Pertahankan session reads di dalam komponen async dengan Suspense.
- Tidak menambah aturan bisnis, data pelanggan, statistik, atau testimoni fiktif.
- Pemeriksaan awal tidak menemukan settlement, QRIS, atau harga jual di
  `src/` dan schema Prisma. Konten membedakan kemampuan saat ini dan rencana.
- Ini pembaruan informasi pada desain yang ada, bukan permintaan desain ulang.

## 5. Plan

1. Minta persetujuan atas draf dan batas lingkup ini sesuai skill
   `felix-engineer` sebelum mengubah implementasi.
2. Baca panduan halaman dan metadata Next.js dari paket lokal, lalu ubah
   konten halaman dan metadata tanpa mengubah alur akun.
3. Sesuaikan ikon dan susunan empat masalah/alur; perbaiki pembungkusan teks
   hanya jika diperlukan.
4. Jalankan `pnpm lint` dan `pnpm exec tsc --noEmit`. Periksa hasil render
   responsif, tautan CTA, dan status fitur yang direncanakan.
5. Tinjau diff untuk memastikan tidak ada perubahan fitur lain, lalu buat
   commit Conventional Commits untuk perubahan yang selesai.

Risiko utama adalah teks terlalu padat atau janji produk melebihi kemampuan
yang tersedia. Atasi dengan paragraf pendek dan status pengembangan yang jelas.
Rollback cukup membalik commit konten ini; tidak ada migrasi data.

## 6. Open questions

Tidak ada informasi tambahan yang diperlukan untuk lingkup ini. Asumsi yang
dipakai: pengguna meminta pembaruan informasi landing page berdasarkan arah
produk yang diajukan. Felix menyetujui lingkup ini sebelum implementasi.
