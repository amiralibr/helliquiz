import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";
import "katex/dist/katex.min.css";
import { Home, UserRound, GraduationCap } from "lucide-react";

export const metadata: Metadata = {
  title: "حلی‌کوئیز | HelliQuiz",
  description: "سامانه هوشمند برگزاری آزمون‌های کلاسی و مسابقات علمی دبیرستان",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fa" dir="rtl">
      <body className="min-h-screen antialiased">
        <header className="glass sticky top-0 z-50">
          <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-3">
            <Link href="/" className="flex items-center gap-2">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-indigo-600 to-violet-600 font-bold text-white shadow-lg shadow-indigo-500/30">
                HQ
              </span>
              <span className="text-lg font-bold tracking-tight text-white">
                Helli<span className="text-gradient">Quiz</span>
              </span>
            </Link>

            <nav className="flex items-center gap-1 text-xs font-semibold">
              <Link
                href="/"
                className="flex items-center gap-1.5 rounded-lg px-2.5 py-2 text-muted transition hover:bg-white/5 hover:text-foreground"
              >
                <Home className="h-4 w-4" />
                <span className="hidden sm:inline">آزمون‌ها</span>
              </Link>
              <Link
                href="/student"
                className="flex items-center gap-1.5 rounded-lg px-2.5 py-2 text-muted transition hover:bg-white/5 hover:text-foreground"
              >
                <UserRound className="h-4 w-4" />
                <span className="hidden sm:inline">پنل دانش‌آموز</span>
              </Link>
              <Link
                href="/teacher"
                className="flex items-center gap-1.5 rounded-lg px-2.5 py-2 text-muted transition hover:bg-white/5 hover:text-foreground"
              >
                <GraduationCap className="h-4 w-4" />
                <span className="hidden sm:inline">پنل دبیر</span>
              </Link>
              <span className="badge mr-1 hidden md:inline-flex">
                دبیرستان علامه حلی ۵
              </span>
            </nav>
          </div>
        </header>

        <main className="mx-auto max-w-6xl px-4 py-8">{children}</main>

        <footer className="mx-auto max-w-6xl px-4 pb-8 pt-4 text-center text-[11px] text-faint">
          حلی‌کوئیز · سامانه آزمون آنلاین دبیرستان علامه حلی ۵
        </footer>
      </body>
    </html>
  );
}
