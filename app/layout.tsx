import type { Metadata, Viewport } from "next";
import { Caveat, Nunito } from "next/font/google";
import ErrorReporter from "@/components/ErrorReporter";
import "./globals.css";

const nunito = Nunito({ subsets: ["latin", "cyrillic", "cyrillic-ext"], variable: "--font-nunito" });
const caveat = Caveat({ subsets: ["latin", "cyrillic", "cyrillic-ext"], weight: ["700"], variable: "--font-caveat" });

export const metadata: Metadata = {
  title: "Шинэ жилийн гацуур",
  description: "Гацуураа үүсгээд найзууддаа хуваалц. Найзууд чинь бэлэг чимэглэл өлгөнө.",
};

export const viewport: Viewport = { themeColor: "#7a0a10", width: "device-width", initialScale: 1 };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="mn" className={`${nunito.variable} ${caveat.variable}`}>
      <body>
        <ErrorReporter />
        {children}
      </body>
    </html>
  );
}
