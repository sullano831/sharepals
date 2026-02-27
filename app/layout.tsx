import type { Metadata } from "next";
import { Plus_Jakarta_Sans } from "next/font/google";
import "./globals.css";
import ThemeProvider from "./components/ThemeProvider";
import InactivityLogout from "./components/InactivityLogout";

const jakarta = Plus_Jakarta_Sans({
  subsets: ["latin"],
  variable: "--font-jakarta",
  display: "swap",
});

export const metadata: Metadata = {
  title: "SharePals",
  description: "Share files with your pals. Fun and buddy-friendly.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={jakarta.variable} suppressHydrationWarning>
      <body className="antialiased min-h-screen bg-surface font-sans dark:bg-stone-950 dark:text-stone-100">
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){var t=localStorage.getItem('sharepals-theme');var d=t==='dark'||(t==='system'&&window.matchMedia('(prefers-color-scheme: dark)').matches);document.documentElement.classList.toggle('dark',d);})();`,
          }}
        />
        <ThemeProvider>
          <InactivityLogout />
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}
