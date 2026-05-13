import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { cn } from "@/lib/utils";
import Sidebar from "@/components/Sidebar";
import MobileNav from "@/components/MobileNav";
import { Toaster } from "@/components/ui/toaster";

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
        <div className="flex min-h-screen overflow-hidden">
          <Sidebar />
          <MobileNav />
          <main className="flex-1 w-full max-w-7xl mx-auto h-screen overflow-y-auto px-4 sm:px-6 lg:px-8 py-8 pt-20 lg:pt-8">
            {children}
          </main>
          <Toaster />
        </div>
      </body>
    </html>
  );
}
