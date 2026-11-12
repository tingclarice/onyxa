import { Suspense } from "react";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/features/auth/server";
import { AuthForm } from "@/features/auth/ui/auth-form";

/** /masuk — log in (redirects to /beranda when already signed in). */
export default function LoginPage() {
  return (
    <Suspense fallback={<AuthForm key="login" mode="login" />}>
      <LoginContent />
    </Suspense>
  );
}

async function LoginContent() {
  const user = await getCurrentUser();
  if (user) redirect("/beranda");
  return <AuthForm key="login" mode="login" />;
}
