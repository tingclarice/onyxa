"use client";

import { useState } from "react";
import Link from "next/link";
import { zodResolver } from "@hookform/resolvers/zod";
import { Eye, EyeOff } from "lucide-react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type AuthMode = "login" | "signup";

type AuthFormValues = {
  name?: string;
  email: string;
  password: string;
  businessName?: string;
};

function createAuthSchema(mode: AuthMode) {
  return z
    .object({
      name: z.string().optional(),
      email: z
        .string({ error: "Masukkan email kamu." })
        .min(1, { error: "Email harus diisi." })
        .email({ error: "Masukkan alamat email yang benar." }),
      password: z
        .string({ error: "Kata sandi harus diisi." })
        .min(mode === "signup" ? 8 : 1, {
          error:
            mode === "signup"
              ? "Kata sandi minimal 8 karakter."
              : "Kata sandi harus diisi.",
        }),
      businessName: z.string().optional(),
    })
    .superRefine((values, context) => {
      if (mode === "signup" && !values.name?.trim()) {
        context.addIssue({
          code: "custom",
          path: ["name"],
          message: "Nama harus diisi.",
        });
      }
      if (mode === "signup" && !values.businessName?.trim()) {
        context.addIssue({
          code: "custom",
          path: ["businessName"],
          message: "Nama usaha harus diisi.",
        });
      }
    });
}

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
  const isSignup = mode === "signup";
  const [passwordVisible, setPasswordVisible] = useState(false);
  const schema = createAuthSchema(mode);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<AuthFormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: "",
      email: "",
      password: "",
      businessName: "",
    },
  });

  function submitForm(values: AuthFormValues) {
    void values;
    // TODO: Replace this UI-only handler with the backend auth call.
    toast.info("Autentikasi akan tersedia setelah layanan akun terhubung.");
  }

  function startGoogleAuth() {
    // TODO: Connect this button to the Google sign-in provider.
    toast.info("Masuk dengan Google akan tersedia setelah autentikasi terhubung.");
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

      <Button
        type="button"
        variant="outline"
        className="w-full"
        onClick={startGoogleAuth}
      >
        <span
          aria-hidden="true"
          className="text-lg font-bold text-emerald-700"
        >
          G
        </span>
        {isSignup ? "Daftar dengan Google" : "Masuk dengan Google"}
      </Button>

      <div className="relative my-6">
        <div className="absolute inset-0 flex items-center">
          <span className="w-full border-t" />
        </div>
        <div className="relative flex justify-center">
          <span className="bg-background px-3 text-sm text-muted-foreground">
            atau pakai email
          </span>
        </div>
      </div>

      <form className="space-y-4" onSubmit={handleSubmit(submitForm)} noValidate>
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
              aria-describedby={
                errors.password ? "password-error" : undefined
              }
              {...register("password")}
            />
            <button
              id="lupa-password"
              type="button"
              aria-label={passwordVisible ? "Sembunyikan password" : "Lihat password"}
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

        {isSignup && (
          <FormField
            id="businessName"
            label="Nama usaha"
            error={errors.businessName?.message}
          >
            <Input
              id="businessName"
              autoComplete="organization"
              placeholder="Contoh: Warung Makan Bu Sari"
              aria-invalid={Boolean(errors.businessName) || undefined}
              aria-describedby={
                errors.businessName ? "businessName-error" : undefined
              }
              {...register("businessName")}
            />
          </FormField>
        )}

        {!isSignup && (
          <div className="flex justify-end">
            <button
              type="button"
              onClick={() =>
                toast.info(
                  "Fitur lupa password akan tersedia setelah autentikasi terhubung.",
                )
              }
              className="min-h-12 text-base font-medium text-accent underline-offset-4 hover:underline"
            >
              Lupa password?
            </button>
          </div>
        )}

        <Button type="submit" className="w-full" disabled={isSubmitting}>
          {isSignup ? "Daftar" : "Masuk"}
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
