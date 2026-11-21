# Riwayat transaksi dan potongan harga nota

## 1. Masalah

Pengelola perlu membandingkan beberapa transaksi kulakan lalu membuka satu transaksi untuk mencocokkan barang dengan foto nota. Tampilan kartu mengulang label “Tersimpan”. Formulir review saat ini menjumlahkan nilai baris, sehingga diskon pada barang dan diskon tambahan pada seluruh pembelian sulit dicocokkan dengan nota pemasok.

## 2. Kriteria keberhasilan

- Halaman `/transaksi` menyajikan tanggal, pemasok dan total akhir dalam tabel. Filter pemasok dan tanggal tetap tersedia. Transaksi yang memerlukan pemeriksaan dapat dikenali tanpa menampilkan label “Tersimpan”.
- Klik pada baris atau buka tautannya dengan keyboard untuk menuju `/transaksi/[id]`. Halaman detail menampilkan barang, jumlah, harga satuan, potongan, nilai bersih, dan foto jika nota memilikinya.
- Di review nota manual maupun hasil scan, tersedia input rupiah **Potongan barang** pada setiap baris dan satu input **Potongan seluruh nota** di ringkasan total. Potongan barang berlaku untuk seluruh jumlah barang pada baris itu. Keduanya dapat diedit.
- Subtotal adalah jumlah nilai barang setelah potongan masing-masing. Total bayar adalah subtotal dikurangi potongan seluruh nota satu kali. Contoh: 2 barang × Rp10.000 dengan potongan baris Rp2.000, ditambah barang lain Rp12.000, menghasilkan subtotal Rp30.000. Potongan seluruh nota Rp3.000 menghasilkan total bayar Rp27.000, baik saat review maupun setelah dibuka kembali.
- Nilai nol diterima, termasuk total bayar nol untuk nota dengan potongan penuh. Nilai potongan negatif, potongan barang melebihi nilai kotor baris, dan potongan nota melebihi subtotal ditolak dengan pesan pada input yang perlu dikoreksi.

## 3. Lingkup

Perubahan meliputi tabel, halaman detail, ekstraksi dan review scan, perhitungan, serta penyimpanan kedua nominal potongan. Input berbentuk nominal rupiah. Pengaturan promo persentase dan perubahan dashboard berada di luar lingkup.

## 4. Batasan

Gunakan alur query dan Server Function yang sudah ada. Pembacaan detail harus dibatasi ke bisnis aktif. Gunakan aturan hitung yang sama di formulir dan saat menyimpan. Nota lama mempertahankan total historisnya, dan draft lama yang dibuka kembali dapat menggunakan nilai awal potongan nol.

## 5. Rencana

1. Tambahkan kolom potongan pada nota dan barisnya dengan nilai awal nol, lalu teruskan kedua nilai melalui tipe data, aturan hitung dan proses simpan.
2. Gunakan formulir review bersama untuk kedua cara input. Isi potongan dari hasil scan jika tercetak jelas. Bedakan nominal kotor, bersih, dan total tercetak agar potongan yang sudah tercermin pada harga tidak dikurangi dua kali.
3. Ganti daftar kartu dengan tabel dan hubungkan setiap baris ke detail. Ambil daftar barang serta foto saat detail dibuka. Akses ke ID yang tidak ditemukan atau milik bisnis lain menghasilkan halaman 404.
4. Uji kedua alur input, kombinasi dua potongan, batas nominal, data lama, dan konsistensi nilai setelah disimpan. Periksa navigasi keyboard dan tampilan ponsel. Jika perlu mengembalikan versi aplikasi, pertahankan kolom tambahan agar data potongan yang sudah diinput tetap tersedia.

## 6. Pertanyaan terbuka

Keempat permintaan sudah tercakup. Asumsi perhitungan yang diajukan adalah potongan barang diinput per baris dan potongan seluruh nota diterapkan pada subtotal setelah seluruh potongan barang.
