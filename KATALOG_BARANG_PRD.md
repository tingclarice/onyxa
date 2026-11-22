# Katalog barang

## Masalah
Pengelola harus menyimpan nota untuk menambah barang. Daftar kartu menyulitkan perbandingan harga dan pergerakan antarbarang.

## Kriteria berhasil
Halaman /barang menampilkan tabel yang bisa dicari. Setiap baris membuka detail dan menyediakan aksi edit serta hapus dengan konfirmasi. Barang manual langsung tampil walaupun belum ada pembelian.

Nota scan dan nota manual memakai pencarian katalog usaha aktif. Utamakan barang bermerek yang tepat, kemudian barang generik sejenis. Tampilkan peringatan untuk nama baru dan buat barang saat nota disetujui. Usulan nama baru AI menggabungkan jenis produk dan merek yang dapat dikenali.

## Lingkup
Pengelolaan nama dan satuan dasar barang dalam usaha aktif. Harga dan pergerakan tetap berasal dari nota yang disimpan.

## Batasan
Satuan dasar bisa diedit kapan saja. Setiap nota mempertahankan jumlah dan satuan saat disimpan. Analitik membandingkan pembelian dengan satuan yang sesuai.

## Rencana
1. Sambungkan formulir katalog ke Server Functions dan penyimpanan berdasarkan usaha aktif.
2. Ganti kartu dengan tabel dan menu aksi yang dapat dipakai lewat keyboard maupun layar sentuh.
3. Uji pembuatan, perubahan, arsip, nama duplikat, dan isolasi usaha. Perubahan antarmuka dan layanan dapat dikembalikan melalui Git tanpa migrasi.

## Pertanyaan terbuka
Tidak ada. Penambahan kembali nama barang yang diarsipkan akan mengaktifkan barang tersebut beserta riwayatnya.
