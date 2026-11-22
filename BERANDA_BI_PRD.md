# Beranda BI dan setoran kantin

## Masalah
Pengelola perlu melihat belanja dan penerimaan selama bulan berjalan tanpa checkout per barang.

## Kriteria berhasil
Owner melihat empat KPI, perbandingan harian, tabel pergerakan, komposisi Cash/QRIS dan kategori belanja. Owner serta Staff dapat mencatat setoran dan membuka riwayatnya. Staff dapat melihat detail transaksi, sedangkan akses langsung ke Beranda dan detail barang diarahkan ke halaman yang diizinkan.

Setelah model Prisma diperbarui pada server pengembangan yang sedang berjalan, Beranda dan riwayat pemasukan harus menggunakan klien yang mendukung model setoran. Panggilan berikutnya memakai kembali klien yang sesuai.

## Lingkup
Bulan berjalan sampai hari ini dalam WIB. Belanja berasal dari total nota tersimpan. Selisih kas adalah penerimaan dikurangi belanja. Rata-rata setoran per hari membagi total tunai dan QRIS dengan jumlah tanggal berbeda yang memiliki setoran. Tanpa setoran, rata-rata ditampilkan sebagai tanda pisah. Kategori mengikuti katalog saat ini.

## Batasan
Kategori barang opsional. Pisahkan kuantitas dengan satuan berbeda. Potongan nota dibagi proporsional ke nilai baris untuk komposisi belanja.

## Rencana
Tambahkan penyimpanan setoran dan atribut katalog. Batasi akses di server, bangun tab setoran dan dashboard. Uji aturan angka, isolasi usaha, akses role, dan migrasi di PostgreSQL sementara sebelum migrasi eksternal.

## Pertanyaan terbuka
Otorisasi penerapan migrasi eksternal diberikan terpisah. Peringkat memakai rata-rata jeda antartanggal restock dalam periode, dengan batas tujuh hari untuk status cepat. Satu tanggal pembelian belum cukup untuk menghitung interval.
