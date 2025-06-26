import type { Metadata } from "next";
import "./globals.css";
import Providers from "@/components/Providers";

export const metadata: Metadata = {
  title: "ZetaChain Holdings",
  description: "The ultimate Web3 portfolio tracker for ZetaChain and multi-chain assets",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="font-roobert antialiased bg-gradient-to-br from-zeta-50 via-white to-neutral-50 min-h-screen">
        <Providers>
          {children}
        </Providers>
      </body>
    </html>
  );
}
