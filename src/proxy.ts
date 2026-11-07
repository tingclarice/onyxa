// Auth.js refreshes cookies; protected use cases still call requireUser().
export { auth as proxy } from "@/features/auth/ui/authjs";
export const config = {
  matcher: [
    "/((?!api/auth|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
