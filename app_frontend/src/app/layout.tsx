import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { AuthProvider } from '@/contexts/AuthContext';

const inter = Inter({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-inter',
  weight: ['400', '500', '600', '700'],
});

export const metadata: Metadata = {
  title: 'Lumina AI | YouTube Video Intelligence',
  description: 'Transform any YouTube video into intelligent insights with AI-powered analysis',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${inter.variable}`}>
      <body className="font-sans antialiased">
        <AuthProvider>
          <div className="grain-overlay" />
          {children}
        </AuthProvider>
      </body>
    </html>
  );
}
