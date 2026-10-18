import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({ 
  subsets: ["latin"],
  variable: "--font-inter",
});

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_BASE_URL || 'https://mfimpact.vercel.app'),
  title: "MF Impact – MVO-bewijs werkbank",
  description: "AI-gedreven MVO-bewijs en ESG-analyse voor het Nederlandse MKB. Van website tot volledig dossier met VSME, drempelcheck, claimtoetsing en MVO-register.",
  keywords: ["MVO", "ESG", "VSME", "MKB", "duurzaamheid", "CSRD", "MVO-register", "Nederland"],
  authors: [{ name: "MF Impact" }],
  openGraph: {
    title: "MF Impact – MVO-bewijs werkbank",
    description: "AI-gedreven MVO-bewijs en ESG-analyse voor het Nederlandse MKB",
    type: "website",
    locale: "nl_NL",
    siteName: "MF Impact MVO-bewijs werkbank",
    images: [
      {
        url: "/logo-full.png",
        width: 1954,
        height: 347,
        alt: "MF Impact",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "MF Impact – MVO-bewijs werkbank",
    description: "AI-gedreven MVO-bewijs en ESG-analyse voor het Nederlandse MKB",
    images: ["/logo-full.png"],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="nl" className={inter.variable}>
      <body className="font-sans antialiased">
        {children}
      </body>
    </html>
  );
}
