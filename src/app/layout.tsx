import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { cn } from "@/lib/utils";
import { Toaster } from "@/components/ui/toaster";
import { CareroProvider } from "@/lib/store";
import { AppShell } from "@/components/AppShell";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "CARERO - Autism Care Rota",
  description: "Simple, calm rota management for autism care centres",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={cn(inter.className, "min-h-screen bg-background text-foreground")}>
        <CareroProvider>
          <AppShell>{children}</AppShell>
          <Toaster />
        </CareroProvider>
      </body>
    </html>
  );
}
