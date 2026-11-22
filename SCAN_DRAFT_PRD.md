# Draf hasil scan nota

## Masalah

Daftar nota di halaman scan berada di memori komponen. Formulir review membaca hasil Gemini dari `sessionStorage` dan langsung menghapus entri tersebut. Memuat ulang daftar menghilangkan tautan review, dan memuat ulang formulir dapat menghilangkan hasil ekstraksi.

## Kriteria keberhasilan

- Setelah pengguna masuk ke bisnis aktif, judul, petunjuk foto, dan tombol Ambil foto, Pilih dari galeri, serta Catat manual langsung tampil. Daftar draf dimuat terpisah dan hanya muncul bila ada nota.
- Setelah ekstraksi kamera atau galeri berhasil divalidasi, server menyimpan hasil lengkap dan referensi foto sebelum mengembalikan status “Siap dicek”.
- Setelah reload, pengguna menemukan kembali draf di `/scan` dan dapat membuka tautan review yang sama. Membuka atau memuat ulang kedua halaman membaca database tanpa permintaan ke Gemini.
- Nota yang tanggal atau jumlahnya belum terbaca tetap dapat menjadi draf. Nama barang, nilai keyakinan, dan potongan per barang serta seluruh nota tersedia ketika review dibuka kembali.
- Persetujuan melalui formulir review menghasilkan tepat satu transaksi dengan nilai yang telah dikoreksi. Draf yang sudah disetujui keluar dari antrean. Draf belum memengaruhi pengeluaran, katalog barang, stok, maupun analitik pembelian.
- Jika penyimpanan gagal, tampilkan kegagalan menyimpan draf. Jika respons sukses terputus setelah penyimpanan, pengguna dapat menemukan draf dengan membuka kembali halaman scan.

## Lingkup

Unggah dari kamera dan galeri, simpan hasil ekstraksi, daftar draf yang menunggu review, buka kembali, setujui, dan buang draf melalui tindakan hapus yang sudah tersedia. Memilih foto pengganti di review memperbarui sumber hasil yang ditampilkan dengan konsisten. Pencatatan manual tetap memakai alur simpan saat ini. Penyimpanan otomatis setiap ketikan dan pemulihan permintaan Gemini yang belum selesai berada di luar lingkup.

## Batasan

Ikat setiap draf ke bisnis aktif dan anggota pembuat dari sesi. Gunakan Server Functions dan query fitur yang sudah ada. Simpan URL Cloudinary dan data ekstraksi terstruktur. Database perlu bisa merepresentasikan nilai OCR yang belum valid untuk transaksi final.

## Rencana

1. Tambahkan penyimpanan draf dengan ID stabil. Simpan seluruh hasil ekstraksi dan URL foto sebagai satu operasi di server. Pakai identitas unggahan yang stabil untuk mengenali pengulangan permintaan yang hasilnya sudah tersimpan.
2. Muat daftar dan isi review melalui query yang memeriksa bisnis serta pembuat. Gabungkan draf tersimpan dengan unggahan yang masih berjalan di layar agar satu nota hanya muncul sekali.
3. Kaitkan persetujuan dengan ID draf. Simpan nota final beserta barisnya dan tandai draf selesai secara atomik, termasuk saat pengguna menekan tombol dua kali atau membuka dua tab. Pastikan operasi ini benar-benar atomik pada jalur PostgreSQL yang digunakan aplikasi.
4. Uji kamera dan galeri, dua kali reload, penghapusan draf, kegagalan simpan, permintaan ulang, persetujuan bersamaan dan isolasi bisnis. Hitung panggilan ke penyedia Gemini dalam pengujian untuk memastikan pemulihan memakai hasil tersimpan. Migrasi bersifat tambahan agar versi aplikasi sebelumnya dapat digunakan kembali tanpa menghapus data.

## Pertanyaan terbuka

Pada 22 November 2026 Felix menyetujui bahwa hanya pengunggah yang dapat membuka draf di bisnis aktif serta menyetujui migrasi tabel draf.
