import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Providers } from "./providers";
import { ThemeSync } from "@/components/layout/theme-sync";
import { ClientLayout } from "@/components/layout/client-layout";
import { cn } from "@/lib/utils";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Linkmate — Professional Calm Consistency",
  description: "The LinkedIn scheduler for people who value focus over noise. Batch your thoughts once, show up every day.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={cn(inter.className, "bg-site-bg text-site-fg")}>
        <Providers>
          <ThemeSync />
          <ClientLayout>{children}</ClientLayout>
        </Providers>
      </body>
    </html>
  );
}

