import type { Metadata, Viewport } from "next";
import { Lora, Manrope } from "next/font/google";
import "./globals.css";
import { storageMode } from "@/server/db/mode";

const lora = Lora({ variable: "--font-lora", subsets: ["latin"], weight: ["500", "600", "700"] });
const manrope = Manrope({ variable: "--font-manrope", subsets: ["latin"] });

export const metadata: Metadata = {
  title: { default: "VILLAGE", template: "%s · VILLAGE" },
  description: "Real people. Real needs. Together. Discover bills and help people in your community pay them.",
  applicationName: "VILLAGE",
};

export const viewport: Viewport = {
  themeColor: "#fcfaf7",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en-NG" className={`${lora.variable} ${manrope.variable} h-full antialiased`}>
      <body className="min-h-full">
        <div className="mx-auto min-h-dvh w-full max-w-[520px] bg-cream-50 sm:shadow-[0_0_60px_-20px_rgb(58_15_13/0.18)]">
          {storageMode() === "ephemeral" && (
            <p role="status" className="bg-ink-900 px-4 py-2 text-center text-xs leading-relaxed text-white">
              <strong className="font-semibold text-gold-400">Demo mode.</strong> No database is connected, so data may reset and
              payments are off.
            </p>
          )}
          {children}
        </div>
      </body>
    </html>
  );
}
