import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Milk App",
  description: "Milk app frontend",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="bg-background">
      <body>{children}</body>
    </html>
  );
}
