import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import { Inter, Lora } from 'next/font/google';
import './globals.css';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
});

// Lora é reservada ao wordmark N.S.A do Design System — ainda assim pré-carregamos.
const lora = Lora({
  subsets: ['latin'],
  weight: ['400', '600', '700'],
  variable: '--font-lora',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'Pecuária · Fazenda NSA',
  description: 'Dashboard de pecuária da Fazenda Nossa Senhora Aparecida',
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="pt-BR" className={`${inter.variable} ${lora.variable}`}>
      <body className="min-h-screen bg-bg text-fg antialiased">{children}</body>
    </html>
  );
}
