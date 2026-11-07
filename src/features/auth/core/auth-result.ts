import type { AuthFailureCode, AuthResult } from "../types/auth";

export function authError(code: string): AuthResult {
  const messages: Record<AuthFailureCode, string> = {
    invalid_credentials: "Email atau password salah.",
    email_not_confirmed: "Konfirmasi email Anda sebelum masuk.",
    weak_password: "Password belum memenuhi ketentuan keamanan.",
    otp_expired: "Tautan konfirmasi tidak valid atau sudah kedaluwarsa.",
    over_email_send_rate_limit:
      "Terlalu banyak permintaan email. Tunggu beberapa saat lalu coba lagi.",
    over_request_rate_limit:
      "Terlalu banyak percobaan. Tunggu beberapa saat lalu coba lagi.",
    signup_disabled: "Pendaftaran akun sedang dinonaktifkan.",
    email_provider_disabled: "Login email belum diaktifkan untuk aplikasi ini.",
    user_banned: "Akun ini tidak dapat digunakan. Hubungi pemilik aplikasi.",
    network_error:
      "Layanan autentikasi belum dapat dihubungi. Silakan coba lagi.",
    auth_failed:
      "Konfigurasi layanan autentikasi bermasalah. Hubungi pemilik aplikasi.",
    missing_session: "Sesi masuk tidak terbentuk. Silakan masuk kembali.",
    email_address_not_authorized:
      "Email konfirmasi belum dapat dikirim ke alamat ini. Pengelola aplikasi perlu mengatur layanan pengiriman email.",
    email_address_invalid:
      "Alamat email ini ditolak. Gunakan email aktif milik Anda; alamat contoh atau uji tidak didukung.",
    email_exists: "Email ini sudah terdaftar. Silakan masuk ke akun Anda.",
    user_already_exists: "Akun ini sudah terdaftar. Silakan masuk.",
    captcha_failed:
      "Verifikasi CAPTCHA diperlukan atau gagal. Hubungi pengelola aplikasi.",
    unexpected_failure:
      "Layanan autentikasi mengalami masalah. Silakan coba lagi atau hubungi pengelola aplikasi.",
    validation_failed:
      "Data ditolak oleh layanan autentikasi. Periksa email dan password Anda.",
    request_timeout:
      "Layanan autentikasi terlalu lama merespons. Silakan coba lagi.",
  };
  function isPublicCode(value: string): value is AuthFailureCode {
    return Object.hasOwn(messages, value);
  }
  return {
    status: "error",
    message: isPublicCode(code)
      ? messages[code]
      : "Autentikasi gagal. Silakan coba lagi.",
    code: isPublicCode(code) ? code : "unknown_auth_error",
  };
}
