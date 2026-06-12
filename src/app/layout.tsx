import type { Metadata } from "next";
import { Geist } from "next/font/google";
import "./globals.css";
import { PrivacyProvider } from "@/components/PrivacyProvider";
import { Sidebar } from "@/components/Sidebar";
import { TopBar } from "@/components/TopBar";
import { personSlug } from "@/lib/data/scope";
import { db } from "@/lib/db";

const geist = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });

export const metadata: Metadata = {
  title: "PFOS — Personal Finance OS",
  description:
    "Your entire financial life: one number, one direction, one next action.",
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const persons = (await db.person.findMany({ orderBy: { role: "asc" } })).map((p) => ({
    slug: personSlug(p.fullName),
    name: p.fullName.split(" ")[0],
  }));

  return (
    <html lang="en" className={`${geist.variable} h-full antialiased`}>
      <body className="min-h-full font-sans">
        <PrivacyProvider>
          <div className="flex min-h-screen">
            <Sidebar />
            <div className="flex-1 flex flex-col min-w-0">
              <TopBar persons={persons} />
              <main className="flex-1 px-6 py-6 max-w-6xl w-full mx-auto">{children}</main>
              <footer className="px-6 py-4 text-xs text-ink-faint border-t border-line">
                PFOS demo · Educational insights, not investment advice (SEBI Class E/A taxonomy) ·
                Seeded demo data — in the hosted demo, a snapshot baked at build time.
              </footer>
            </div>
          </div>
        </PrivacyProvider>
      </body>
    </html>
  );
}
