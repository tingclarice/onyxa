# Pemilih gambar Cloudinary

## Masalah

Di halaman scan, paragraf awal mengulang petunjuk memilih nota. Saat pengguna memilih gambar, aplikasi membuka dialog berkas perangkat. Server sudah memakai Cloudinary untuk menyimpan gambar.

## Kriteria keberhasilan

- Header scan menampilkan judul dan penjelasan pembacaan otomatis. Paragraf yang dimulai dengan “Foto nota atau pilih gambar dari HP” dihapus.
- Tombol galeri di scan, pengganti foto di review nota, foto profil akun, dan foto usaha membuka Cloudinary Upload Widget terlebih dahulu.
- Scan mendukung beberapa nota. Tiap hasil unggahan masuk ke antrean OCR sekali. Review dan foto profil menerima satu foto per pemilihan.
- Di halaman scan, daftar foto muncul sejak foto pertama masuk antrean dan hilang setelah foto terakhir dihapus. Header “Daftar nota”, tombol duplikat “Tambah nota”, dan pesan antrean kosong dihilangkan.
- Membatalkan pemilihan mempertahankan foto atau draf sebelumnya. Pengguna dapat mencoba kembali sesudah gagal.
- Saat scan gagal, pengguna melihat tahap, alasan yang diketahui, dan langkah berikutnya. Kegagalan pemrosesan di server menyertakan referensi yang sama dengan log server. Periksa jalur kamera dan galeri dengan simulasi kegagalan provider serta respons nota yang tidak valid. Log hanya memuat informasi diagnostik yang aman.
- Log server mengaitkan waktu transfer Cloudinary dan tiap percobaan model Gemini dengan referensi scan. Saat model gagal, catat status HTTP jika tersedia, durasi, alasan, dan keputusan untuk mencoba model berikutnya.

## Lingkup

Gunakan satu integrasi widget untuk empat alur. Pertahankan kamera langsung di scan dan arahkan pilihan gambar cadangannya ke widget. Pertahankan perbedaan antara foto akun yang langsung disimpan dan foto usaha yang diterapkan saat formulir disimpan.

## Batasan

Gunakan Server Functions dan izin pengguna atau usaha yang berlaku. Validasi hasil widget di server sebelum OCR atau penyimpanan profil, termasuk asal URL Cloudinary dan batas tipe serta ukuran gambar. Gunakan konfigurasi yang memang diperuntukkan bagi browser. Rahasia provider tetap di server.

## Langkah

1. Hapus paragraf yang ditunjuk pada route scan.
2. Hubungkan komponen pemilihan gambar ke widget resmi. Tangani status memuat, unggahan selesai, gagal, dan batal.
3. Proses URL gambar hasil widget melalui alur scan dan profil masing-masing agar berkas yang sama hanya diunggah sekali.
4. Periksa empat tombol, unggah beberapa nota, pembatalan, serta penolakan hasil yang tidak valid. Jalankan tes fitur terkait, lint, dan TypeScript.

Perubahan dapat dibalik melalui commit aplikasi. Gambar yang sudah tersimpan menggunakan URL yang sama.

## Pertanyaan terbuka

Felix menyetujui implementasi pada 21 November 2026.
