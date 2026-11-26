import type { Metadata, Viewport } from "next";
import { Inter, Space_Grotesk } from "next/font/google";
import { Atmosphere } from "@/components/Atmosphere";
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

const title = "Jeric Contadan · Full Stack Developer & UI Designer";
const description =
  "Jeric Contadan builds modern web apps and business systems, from first client meeting to deployment. BS Information Systems student at TUP Manila.";

// The hero heading no longer contains the name, so it lives here for search and link previews.
// Absolute base for the Open Graph image URL (app/opengraph-image.tsx).
const siteUrl = process.env.VERCEL_PROJECT_PRODUCTION_URL
  ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
  : "http://localhost:3000";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title,
  description,
  authors: [{ name: "Jeric Contadan" }],
  openGraph: { title, description, siteName: "Jeric Contadan", type: "website" },
};

export const viewport: Viewport = {
  themeColor: "#0a1024",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${inter.variable} ${spaceGrotesk.variable} antialiased`}>
      <body className="flex min-h-dvh flex-col">
        <MenuProvider>
          <Atmosphere />
          <Header />
          <main className="flex-1">{children}</main>
          <Footer />
        </MenuProvider>
      </body>
    </html>
  );
}
