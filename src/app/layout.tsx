import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css'; // Se você estiver usando o arquivo de estilos padrão do Next/Tailwind

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'Paggo Collections - Workspace',
  description: 'Plataforma inteligente de análise e recuperação de faturas B2B',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="pt-BR">
      <body className={`${inter.className} antialiased bg-slate-50/50`}>
        {children}
      </body>
    </html>
  );
}