import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "MVO-bewijs werkbank",
  description: "Interne werkbank voor MVO-bewijs dienstverlening",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="nl">
      <body>
        {children}
      </body>
    </html>
  );
}
