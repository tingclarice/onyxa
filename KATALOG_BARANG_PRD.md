# Katalog barang

## Masalah
Pengelola harus menyimpan nota untuk menambah barang. Daftar kartu menyulitkan perbandingan harga dan pergerakan antarbarang.

## Kriteria berhasil
Halaman /barang menampilkan tabel yang bisa dicari. Setiap baris membuka detail dan menyediakan aksi edit serta hapus dengan konfirmasi. Barang manual langsung tampil walaupun belum ada pembelian.

## Lingkup
Pengelolaan nama dan satuan dasar barang dalam usaha aktif. Harga dan pergerakan tetap berasal dari nota yang disimpan.

## Batasan
Gunakan tabel Item dan ItemAlias yang ada. Pertahankan riwayat nota, aturan akses usaha, dan pengenalan nama lama saat barang diganti nama. Satuan yang telah dipakai dalam nota dipertahankan agar angka historis tetap sebanding.

## Rencana
1. Sambungkan formulir katalog ke Server Functions dan penyimpanan berdasarkan usaha aktif.
2. Ganti kartu dengan tabel dan menu aksi yang dapat dipakai lewat keyboard maupun layar sentuh.
3. Uji pembuatan, perubahan, arsip, nama duplikat, dan isolasi usaha. Perubahan antarmuka dan layanan dapat dikembalikan melalui Git tanpa migrasi.

## Pertanyaan terbuka
Tidak ada. Penambahan kembali nama barang yang diarsipkan akan mengaktifkan barang tersebut beserta riwayatnya.
