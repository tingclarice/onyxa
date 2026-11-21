/** Translate known Cloudinary reasons without displaying its raw response. */
export function describeCloudinaryUploadError(failure: unknown, status?: number): string {
  let detail = failure;
  if (detail && typeof detail === "object" && "error" in detail) detail = detail.error;
  if (detail && typeof detail === "object") {
    if (typeof status !== "number" && "status" in detail && typeof detail.status === "number") status = detail.status;
    detail = "message" in detail ? detail.message : undefined;
  }
  const message = typeof detail === "string" ? detail : "";
  const stage = status ? `Unggah ke Cloudinary (HTTP ${status})` : "Unggah ke Cloudinary";
  if (/preset.*not found|unknown upload preset/i.test(message)) {
    return `${stage} gagal. Upload preset tidak ditemukan. Cocokkan nama preset dan cloud di konfigurasi aplikasi.`;
  }
  if (/unsigned|must be signed/i.test(message)) {
    return `${stage} ditolak. Periksa apakah upload preset mengizinkan unggahan unsigned.`;
  }
  if (status === 413 || /file size|too large/i.test(message)) {
    return `${stage} ditolak karena ukuran berkas. Pilih foto maksimal 8 MB dan periksa batas ukuran pada preset.`;
  }
  if (/format|invalid image/i.test(message)) {
    return `${stage} ditolak karena format gambar. Pilih JPG atau PNG yang dapat dibuka di perangkat.`;
  }
  if (status === 401 || status === 403) return `${stage} ditolak. Periksa izin unggah dan konfigurasi preset.`;
  if (status === 429) return `${stage} dibatasi oleh layanan. Tunggu sebentar sebelum mencoba lagi.`;
  return `${stage} gagal. Periksa respons upload di tab Network browser atau log Cloudinary.`;
}
