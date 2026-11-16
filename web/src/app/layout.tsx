import type { Metadata, Viewport } from "next";
import { Sora, DM_Sans } from "next/font/google";
import "./globals.css";
import { PwaRegister } from "@/components/PwaRegister";

const sora = Sora({ variable: "--font-sora", subsets: ["latin"], weight: ["600", "700", "800"] });
const dmSans = DM_Sans({ variable: "--font-dmsans", subsets: ["latin"] });

export const metadata: Metadata = {
  title: "THRILL",
  description: "Find events in Sierra Leone. Get your pass.",
  icons: { apple: "/icon-192.png" },
  appleWebApp: { capable: true, title: "THRILL", statusBarStyle: "black-translucent" },
};

export const viewport: Viewport = {
  themeColor: "#0b0712",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${sora.variable} ${dmSans.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col">
        {children}
        <PwaRegister />
      </body>
    </html>
  );
}
