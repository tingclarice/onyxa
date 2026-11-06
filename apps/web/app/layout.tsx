import type { Metadata } from "next";
import { Geist_Mono, Plus_Jakarta_Sans } from "next/font/google";
import "./globals.css";
import { AppShell } from "@/components/app-shell";
import { QueryProvider } from "@/components/query-provider";
import { Toaster } from "sonner";

const plusJakartaSans = Plus_Jakarta_Sans({
  subsets: ["latin"],
  variable: "--font-plus-jakarta-sans",
});

const geistMono = Geist_Mono({
  subsets: ["latin"],
  variable: "--font-geist-mono",
});

export const metadata: Metadata = {
  title: "Onyxa",
  description: "Catat belanja dan pengeluaran usaha dengan mudah.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="id" className={`${plusJakartaSans.variable} ${geistMono.variable}`}>
      <body className="min-h-dvh bg-background font-sans text-foreground antialiased">
        <QueryProvider>
          <AppShell>{children}</AppShell>
          <Toaster position="top-center" />
        </QueryProvider>
      </body>
    </html>
  );
}
