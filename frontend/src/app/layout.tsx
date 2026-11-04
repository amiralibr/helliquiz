import type { Metadata } from "next";
import "./globals.css";
import "katex/dist/katex.min.css";

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
          <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
            <div className="flex items-center gap-2">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-indigo-600 to-violet-600 font-bold text-white shadow-lg shadow-indigo-500/30">
                HQ
              </span>
              <span className="text-lg font-bold tracking-tight text-white">
                Helli<span className="text-gradient">Quiz</span>
              </span>
            </div>
            <span className="badge">
              دبیرستان علامه حلی ۵
            </span>
          </div>
        </header>

        <main className="mx-auto max-w-6xl px-4 py-8">
          {children}
        </main>
      </body>
    </html>
  );
}
