import type { Metadata, Viewport } from "next";
import { Inter, Space_Grotesk } from "next/font/google";
import { Footer } from "@/components/Footer";
import { Header } from "@/components/Header";
import { MenuProvider } from "@/components/MenuContext";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

const spaceGrotesk = Space_Grotesk({
  variable: "--font-space-grotesk",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Jeric Contadan · Full Stack Developer & UI Designer",
  description:
    "Jeric Contadan builds modern web apps and business systems, from first client meeting to deployment. BS Information Systems student at TUP Manila.",
};

export const viewport: Viewport = {
  themeColor: "#0a1024",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${inter.variable} ${spaceGrotesk.variable} antialiased`}>
      <body className="flex min-h-dvh flex-col">
        <MenuProvider>
          <Header />
          <main className="flex-1">{children}</main>
          <Footer />
        </MenuProvider>
      </body>
    </html>
  );
}
