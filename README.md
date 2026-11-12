# Onyxa

Scan-first purchasing and expense tracker for Indonesian small businesses (UMKM).

Staff photograph a supplier receipt. The app uploads the image to Cloudinary,
uses Gemini to extract a draft, and opens it in an editable review flow. Opening
the review screen without an image still loads demo receipt data.

## Features
- **Receipt scanner**: Cloudinary photo upload, Gemini receipt extraction, editable review, and saving reviewed receipts (supplier, items, quantities) to PostgreSQL
- **Price change alerts**: flags when a supplier raises the unit price of an item
- **Slow-moving detector** (`inventory-intelligence`): learns each item's burn rate (EMA of quantity ÷ days until the next purchase) from saved receipts and marks it **Melambat** when restocking is later than expected plus the owner's grace % (Pengaturan, default 20%). Shows the burn-rate drop % and the restock delay on /barang and on the home-screen warning card ("Semua aman" when nothing is slowing). Run `pnpm test:inventory`.
- **Expense categories**: raw materials (COGS), operating costs (OPEX), and assets (CapEx)

## Tech stack
Next.js, TypeScript, Tailwind CSS, shadcn/ui, Prisma, PostgreSQL, NextAuth/Auth.js,
Google Gen AI SDK



###  Progress: 
| Modul / Fitur Utama | Status | 
| :--- | :--- | :---: |
| **1. Authentication & Session (`auth`)** | 100% |
<!-- | **2. Business, Onboarding & Team Invitations (`business-management`)** | 100% | -->
| **3. Receipt Upload & AI OCR Extraction (`invoice-processing`)** | 90% |
| **4. Inventory Burn-Rate & Slow-Moving Detection (`inventory-intelligence`)** | 90% |
| **5. Procurement Pricing / EMA & Price Variance (`procurement-pricing`)** | 90% |
| **6. Riwayat Transaksi & Pengaturan (`/transaksi`, `/pengaturan`)** | 50% |

---

### Summary of Updates 

1. **Integrasi Database Cloud Supabase via HTTPS ([`src/lib/prisma.ts`](file:///c:/Users/Asus/CODE/UC/Sem%205/Cloud%20Computing/onyxa/src/lib/prisma.ts))**
   - Menghubungkan aplikasi langsung ke Supabase (`SUPABASE_URL` + `SUPABASE_SECRET_KEY`) lewat REST API PostgREST tanpa butuh koneksi TCP/password DB manual.
   - Mengaktifkan `AUTH_SECRET` di [`.env`](file:///c:/Users/Asus/CODE/UC/Sem%205/Cloud%20Computing/onyxa/.env) sehingga registrasi (`/daftar`), login (`/masuk`), buat usaha, dan simpan nota langsung masuk ke tabel Supabase.
   - Menambahkan opsi `DEV_AUTH_BYPASS=true` di [`session.ts`](file:///c:/Users/Asus/CODE/UC/Sem%205/Cloud%20Computing/onyxa/src/features/auth/ui/session.ts) dan [`queries.ts`](file:///c:/Users/Asus/CODE/UC/Sem%205/Cloud%20Computing/onyxa/src/features/business-management/ui/queries.ts) untuk mempercepat testing saat development.

2. **Integrasi Cloudinary, Live Camera & Gemini AI OCR (`/scan` & `/scan/review`)**
   - Menggunakan **`gemini-3.5-flash`** sebagai model utama (dengan auto-fallback ke `gemini-3.8-flash` & timeout 25 detik) di [`gemini.ts`](file:///c:/Users/Asus/CODE/UC/Sem%205/Cloud%20Computing/onyxa/src/features/invoice-processing/repository/gemini.ts) untuk ekstraksi JSON terstruktur yang cepat dan akurat.
   - Menambahkan **Live Camera Viewfinder (`LiveCameraModal`)** di [`receipt-scanner.tsx`](file:///c:/Users/Asus/CODE/UC/Sem%205/Cloud%20Computing/onyxa/src/features/invoice-processing/ui/receipt-scanner.tsx) pada tombol *"Ambil foto"* (mendukung webcam desktop & kamera HP, ganti kamera depan/belakang).
   - Mempercepat proses scan lewat **parallel upload Cloudinary + Gemini OCR** (`uploadAndScanReceiptAction` di [`actions.ts`](file:///c:/Users/Asus/CODE/UC/Sem%205/Cloud%20Computing/onyxa/src/features/invoice-processing/ui/actions.ts)) dan batas resolusi native `2048px` @ `92%` di [`use-scan-receipt.ts`](file:///c:/Users/Asus/CODE/UC/Sem%205/Cloud%20Computing/onyxa/src/features/invoice-processing/ui/use-scan-receipt.ts) tanpa menurunkan kualitas OCR.
   - Menambahkan perhitungan otomatis **`Harga satuan = Jumlah harga / Jumlah`** di [`receipt-review-rules.ts`](file:///c:/Users/Asus/CODE/UC/Sem%205/Cloud%20Computing/onyxa/src/features/invoice-processing/core/receipt-review-rules.ts), [`receipt-scan-service.ts`](file:///c:/Users/Asus/CODE/UC/Sem%205/Cloud%20Computing/onyxa/src/features/invoice-processing/services/receipt-scan-service.ts), dan sinkronisasi real-time di [`receipt-review-form.tsx`](file:///c:/Users/Asus/CODE/UC/Sem%205/Cloud%20Computing/onyxa/src/features/invoice-processing/ui/receipt-review-form.tsx).
   - Menambahkan mode **Catat manual (tanpa nota)** (`/scan/review?mode=manual`) beserta tombol pintas di `/beranda` dan `/scan`.

3. **Membangun Modul Procurement Pricing / Supplier Price Fluctuation (`src/features/procurement-pricing/`)**
   - **Core Math Engine ([`ppv-rules.ts`](file:///c:/Users/Asus/CODE/UC/Sem%205/Cloud%20Computing/onyxa/src/features/procurement-pricing/core/ppv-rules.ts) & [`ppv-rules.test.ts`](file:///c:/Users/Asus/CODE/UC/Sem%205/Cloud%20Computing/onyxa/src/features/procurement-pricing/core/ppv-rules.test.ts))**:
     - Normalisasi harga satuan ke `baseUnit` (`KG`, `LITER`, `PCS`).
     - Perhitungan *Exponential Moving Average* ($\text{EMA}, \alpha = 0.25$).
     - Deteksi *Purchase Price Variance* (PPV %) terhadap baseline EMA sebelumnya (`CRITICAL` $\ge 10\%$, `WARNING` $\ge 5\%$, `PRICE_DROP` $\le -5\%$, `NORMAL`).
     - Perbandingan harga antar-supplier & rekomendasi substitusi supplier termurah.
   - **Data & Service Layer ([`price-history-repository.ts`](file:///c:/Users/Asus/CODE/UC/Sem%205/Cloud%20Computing/onyxa/src/features/procurement-pricing/repository/price-history-repository.ts), [`pricing-service.ts`](file:///c:/Users/Asus/CODE/UC/Sem%205/Cloud%20Computing/onyxa/src/features/procurement-pricing/services/pricing-service.ts), [`server.ts`](file:///c:/Users/Asus/CODE/UC/Sem%205/Cloud%20Computing/onyxa/src/features/procurement-pricing/server.ts))**:
     - Membaca riwayat `ReceiptLine` dari nota berstatus `SAVED` dan menghitung metrik PPV per barang & per usaha.
   - **UI Integration**:
     - **Dashboard ([`/beranda`](file:///c:/Users/Asus/CODE/UC/Sem%205/Cloud%20Computing/onyxa/src/app/(authenticated)/beranda/page.tsx))**: Menampilkan kartu peringatan kenaikan harga supplier ([`PriceFluctuationAlertCard`](file:///c:/Users/Asus/CODE/UC/Sem%205/Cloud%20Computing/onyxa/src/features/procurement-pricing/ui/price-fluctuation-alert-card.tsx)).
     - **Daftar Barang ([`/barang`](file:///c:/Users/Asus/CODE/UC/Sem%205/Cloud%20Computing/onyxa/src/app/(authenticated)/barang/page.tsx))**: Menampilkan badge fluktuasi harga ([`PriceVarianceBadge`](file:///c:/Users/Asus/CODE/UC/Sem%205/Cloud%20Computing/onyxa/src/features/procurement-pricing/ui/price-variance-badge.tsx)), baseline EMA, dan info supplier alternatif yang lebih hemat.
     - **Detail Barang ([`/barang/[id]`](file:///c:/Users/Asus/CODE/UC/Sem%205/Cloud%20Computing/onyxa/src/app/(authenticated)/barang/%5Bid%5D/page.tsx))**: Menampilkan grafik tren **Harga Aktual vs. Baseline EMA** lengkap dengan label sumbu harga (Y), sumbu tanggal (X), tooltip detail per titik, tabel riwayat varians PPV, dan kartu **Perbandingan Harga Supplier** ([`ItemPriceAnalysis`](file:///c:/Users/Asus/CODE/UC/Sem%205/Cloud%20Computing/onyxa/src/features/procurement-pricing/ui/item-price-analysis.tsx)).

---

###  Done vs.  To-Do 

####  Done 
- [x] Autentikasi akun (Daftar, Masuk, Keluar) & proteksi halaman.
- [x] Pembuatan usaha (Onboarding), pemilihan usaha aktif, dan undangan anggota tim (Inbox).
- [x] Upload foto nota ke Cloudinary, live camera viewfinder (*Ambil foto*), dan ekstraksi cepat dengan Gemini AI (`gemini-3.5-flash`).
- [x] Input pengeluaran manual tanpa nota (`Catat manual`) & perhitungan otomatis `Harga satuan = Jumlah harga / Jumlah`.
- [x] Review & simpan nota belanja ke database Supabase (otomatis membuat Supplier, Katalog Barang, dan konversi satuan dasar).
- [x] Deteksi barang melambat (*Slow-Moving / Burn-Rate EMA*) di `/beranda` dan `/barang`.
- [x] Deteksi kenaikan harga supplier (*Purchase Price Variance / Price EMA*) + grafik tren harga berlabel timeline & tooltip + rekomendasi supplier termurah di `/beranda`, `/barang`, dan `/barang/[id]`.

#### To-Do 
- [ ] **Halaman `/transaksi`**: Saat ini masih membaca mock data dari [`src/lib/api/transactions.ts`](file:///c:/Users/Asus/CODE/UC/Sem%205/Cloud%20Computing/onyxa/src/lib/api/transactions.ts) — tinggal dihubungkan ke tabel `Receipt` yang sudah disimpan di Supabase.
- [ ] **Pencocokan Katalog Otomatis saat OCR**: Mengirim daftar nama item yang sudah ada di katalog ke prompt Gemini saat scan agar `matched_item` otomatis terisi.
- [ ] **Deployment & Final Polish**: Deploy ke Cloud Hosting (Vercel / Cloud Run) dan pengujian end-to-end dengan beberapa nota asli.