"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { zodResolver } from "@hookform/resolvers/zod";
import { Eye, EyeOff } from "lucide-react";
import { useForm } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { loginAction, signupAction } from "./actions";
import {
  createAuthSchema,
  type AuthFormValues,
  type AuthMode,
  type AuthResult,
} from "@/features/auth/types/auth";

function FormField({
  id,
  label,
  error,
  children,
}: {
  id: string;
  label: string;
  error?: string;
  children: React.ReactNode;
}) {
  const errorId = `${id}-error`;

  return (
    <div className="space-y-2">
      <label htmlFor={id} className="block text-base font-medium">
        {label}
      </label>
      {children}
      {error && (
        <p id={errorId} role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}
    </div>
  );
}

export function AuthForm({ mode }: { mode: AuthMode }) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const isSignup = mode === "signup";
  const [passwordVisible, setPasswordVisible] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [result, setResult] = useState<AuthResult | null>(null);
  const schema = createAuthSchema(mode);
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<AuthFormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: "",
      email: "",
      password: "",
    },
  });

  function submitForm(values: AuthFormValues) {
    setResult(null);
    startTransition(async () => {
      try {
        const nextResult = await (isSignup
          ? signupAction(values)
          : loginAction(values));
        if (nextResult.status === "authenticated") {
          reset();
          setPasswordVisible(false);
          queryClient.clear();
          router.replace("/beranda");
          router.refresh();
          return;
        }
        setResult(nextResult);
      } catch {
        setResult({
          status: "error",
          message: "Koneksi terputus. Silakan coba lagi.",
        });
      }
    });
  }

  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-md flex-col justify-center px-4 py-8 sm:px-6">
      <div className="mb-8 text-center">
        <Link
          href="/"
          className="mb-6 inline-flex items-center gap-2 text-xl font-bold tracking-tight"
        >
          <span className="flex size-10 items-center justify-center rounded-xl bg-primary text-primary-foreground">
            O
          </span>
          Onyxa
        </Link>
        <h1 className="mt-4 text-2xl font-bold tracking-tight">
          {isSignup ? "Buat akun Onyxa" : "Masuk ke Onyxa"}
        </h1>
        <p className="mt-2 text-base text-muted-foreground">
          {isSignup
            ? "Mulai catat belanja usaha dengan lebih mudah."
            : "Lanjutkan mengelola belanja usahamu."}
        </p>
      </div>

      <form
        className="space-y-4"
        onSubmit={handleSubmit(submitForm)}
        noValidate
      >
        {result && (
          <p
            role={result.status === "error" ? "alert" : "status"}
            className={
              result.status === "error"
                ? "text-sm text-destructive"
                : "text-sm text-accent"
            }
          >
            {result.message}
            {result.status === "error" && result.code && (
              <span className="mt-2 block text-xs text-muted-foreground">
                Kode bantuan: {result.code}
              </span>
            )}
          </p>
        )}
        {isSignup && (
          <FormField id="name" label="Nama" error={errors.name?.message}>
            <Input
              id="name"
              autoComplete="name"
              placeholder="Nama lengkap"
              aria-invalid={Boolean(errors.name) || undefined}
              aria-describedby={errors.name ? "name-error" : undefined}
              {...register("name")}
            />
          </FormField>
        )}

        <FormField id="email" label="Email" error={errors.email?.message}>
          <Input
            id="email"
            type="email"
            inputMode="email"
            autoComplete="email"
            placeholder="nama@email.com"
            aria-invalid={Boolean(errors.email) || undefined}
            aria-describedby={errors.email ? "email-error" : undefined}
            {...register("email")}
          />
        </FormField>

        <FormField
          id="password"
          label="Password"
          error={errors.password?.message}
        >
          <div className="relative">
            <Input
              id="password"
              type={passwordVisible ? "text" : "password"}
              autoComplete={isSignup ? "new-password" : "current-password"}
              placeholder="Masukkan password"
              className="pr-12"
              aria-invalid={Boolean(errors.password) || undefined}
              aria-describedby={errors.password ? "password-error" : undefined}
              {...register("password")}
            />
            <button
              id="toggle-password"
              type="button"
              aria-label={
                passwordVisible ? "Sembunyikan password" : "Lihat password"
              }
              aria-pressed={passwordVisible}
              onClick={() => setPasswordVisible((visible) => !visible)}
              className="absolute inset-y-0 right-0 flex w-12 items-center justify-center rounded-r-md text-muted-foreground focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
            >
              {passwordVisible ? (
                <EyeOff aria-hidden="true" className="size-5" />
              ) : (
                <Eye aria-hidden="true" className="size-5" />
              )}
            </button>
          </div>
        </FormField>

        <Button
          type="submit"
          className="w-full"
          disabled={isSubmitting || isPending}
        >
          {isPending ? "Memproses..." : isSignup ? "Daftar" : "Masuk"}
        </Button>
      </form>

      <p className="mt-6 text-center text-base text-muted-foreground">
        {isSignup ? "Sudah punya akun?" : "Belum punya akun?"}{" "}
        <Link
          href={isSignup ? "/masuk" : "/daftar"}
          className="font-semibold text-accent underline-offset-4 hover:underline"
        >
          {isSignup ? "Masuk" : "Daftar"}
        </Link>
      </p>
    </div>
  );
}
