import type { Metadata } from 'next';
import './globals.css';
import { AuthProvider } from '@/contexts/AuthContext';

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
    <html lang="en" className="dark">
      <body className="antialiased">
        <AuthProvider>
          <div className="noise-overlay" />
          <div className="ambient-bg" />
          {children}
        </AuthProvider>
      </body>
    </html>
  );
}
