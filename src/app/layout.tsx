import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "ZetaChain Holdings",
  description: "Manage your crypto portfolio across ZetaChain and Ethereum networks",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="font-roobert antialiased">
        {children}
      </body>
    </html>
  );
}
