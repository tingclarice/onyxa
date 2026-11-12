import { Suspense } from "react";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/features/auth/server";
import { AuthForm } from "@/features/auth/ui/auth-form";

/** /daftar — create an account (redirects to /beranda when already signed in). */
export default function SignupPage() {
  return (
    <Suspense fallback={<AuthForm key="signup" mode="signup" />}>
      <SignupContent />
    </Suspense>
  );
}

async function SignupContent() {
  const user = await getCurrentUser();
  if (user) redirect("/beranda");
  return <AuthForm key="signup" mode="signup" />;
}
