import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Médico INC",
  description: "Médico INC - Sites de alta conversão para médicos."
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <body>{children}</body>
    </html>
  );
}
