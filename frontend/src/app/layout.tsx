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
      <body className="min-h-screen bg-slate-950 text-slate-100 antialiased selection:bg-indigo-500 selection:text-white">
        <header className="sticky top-0 z-50 border-b border-slate-800 bg-slate-900/80 backdrop-blur-md">
          <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
            <div className="flex items-center gap-2">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-600 font-bold text-white shadow-lg shadow-indigo-500/30">
                HQ
              </span>
              <span className="text-lg font-bold tracking-tight text-white">
                Helli<span className="text-indigo-400">Quiz</span>
              </span>
            </div>
            <span className="rounded-full bg-slate-800 px-3 py-1 text-xs font-medium text-slate-400 border border-slate-700/50">
              دبیرستان علامه حلی ۵
            </span>
          </div>
        </header>

        <main className="mx-auto max-w-5xl px-4 py-8">
          {children}
        </main>
      </body>
    </html>
  );
}
