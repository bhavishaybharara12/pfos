import type { Metadata } from "next";
import { Geist } from "next/font/google";
import { Suspense } from "react";
import "./globals.css";
import { PrivacyProvider } from "@/components/PrivacyProvider";
import { Sidebar } from "@/components/Sidebar";
import { TopBar } from "@/components/TopBar";

const geist = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });

export const metadata: Metadata = {
  title: "PFOS — Personal Finance OS",
  description:
    "Your entire financial life: one number, one direction, one next action.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${geist.variable} h-full antialiased`}>
      <body className="min-h-full font-sans">
        <PrivacyProvider>
          <div className="flex min-h-screen">
            <Suspense>
              <Sidebar />
            </Suspense>
            <div className="flex-1 flex flex-col min-w-0">
              <Suspense>
                <TopBar />
              </Suspense>
              <main className="flex-1 px-6 py-6 max-w-6xl w-full mx-auto">{children}</main>
              <footer className="px-6 py-4 text-xs text-ink-faint border-t border-line">
                PFOS demo · Educational insights, not investment advice (SEBI Class E/A taxonomy) ·
                Demo data, seeded locally — nothing leaves your machine.
              </footer>
            </div>
          </div>
        </PrivacyProvider>
      </body>
    </html>
  );
}
