import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Médico INC — Sites para Médicos e Clínicas",
  description:
    "Site médico de alta conversão publicado em até 2 dias por R$497. Mais pacientes, mais faturamento.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <head>
        <meta
          httpEquiv="Content-Security-Policy"
          content={[
            "default-src 'self'",
            "script-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net https://www.googletagmanager.com https://www.google-analytics.com",
            "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
            "font-src 'self' https://fonts.gstatic.com",
            "img-src 'self' data: https:",
            "connect-src 'self' https://*.supabase.co https://www.google-analytics.com",
            "frame-src 'self' https://dragabrielaportilho.com.br",
            "frame-ancestors 'none'",
            "form-action 'self'",
          ].join("; ")}
        />
        <meta name="referrer" content="strict-origin-when-cross-origin" />
        <meta httpEquiv="X-Content-Type-Options" content="nosniff" />
      </head>
      <body>{children}</body>
    </html>
  );
}
