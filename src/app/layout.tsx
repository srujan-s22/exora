import type { Metadata } from 'next';
import { Inter, JetBrains_Mono } from 'next/font/google';
import { SpeedInsights } from '@vercel/speed-insights/next';
import { ThemeProvider } from '@/components/providers/theme-provider';
import { ToastProvider } from '@/components/providers/toast-provider';
import { AuthProvider } from '@/components/providers/auth-provider';
import './globals.css';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-sans',
  display: 'swap',
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  variable: '--font-mono',
  display: 'swap',
});

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL || 'https://exora.app'),
  title: {
    default: 'Exora — Exhibition Management Platform',
    template: '%s | Exora',
  },
  description:
    'Premium exhibition management platform for ticket sales, gate validation, staff management, and fraud prevention.',
  applicationName: 'Exora',
  authors: [{ name: 'Exora', url: 'mailto:platform.exora@gmail.com' }],
  generator: 'Exora',
  keywords: ['exhibition', 'ticket management', 'QR tickets', 'gate scanning', 'event management'],
  creator: 'Exora',
  publisher: 'Exora',
  icons: {
    icon: [
      { url: '/favicon.ico', sizes: 'any' },
      { url: '/icon-16x16.png', sizes: '16x16', type: 'image/png' },
      { url: '/icon-32x32.png', sizes: '32x32', type: 'image/png' },
      { url: '/android-chrome-192x192.png', sizes: '192x192', type: 'image/png' },
      { url: '/android-chrome-512x512.png', sizes: '512x512', type: 'image/png' },
    ],
    shortcut: ['/favicon.ico'],
    apple: [
      { url: '/apple-touch-icon.png', sizes: '180x180', type: 'image/png' },
    ],
  },
  manifest: '/manifest.webmanifest',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'Exora',
  },
  openGraph: {
    title: 'Exora — Exhibition Management Platform',
    description:
      'Premium exhibition management platform for ticket sales, gate validation, staff management, and fraud prevention.',
    siteName: 'Exora',
    images: [
      {
        url: '/og-image.png',
        width: 1200,
        height: 630,
        alt: 'Exora — Exhibition Management Platform',
      },
    ],
    locale: 'en_US',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Exora — Exhibition Management Platform',
    description:
      'Premium exhibition management platform for ticket sales, gate validation, staff management, and fraud prevention.',
    site: '@Exora',
    creator: '@Exora',
    images: ['/og-image.png'],
  },
  other: {
    'contact:email': 'platform.exora@gmail.com',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${inter.variable} ${jetbrainsMono.variable}`}>
      <body className="font-sans antialiased">
        <ThemeProvider>
          <AuthProvider>
            <ToastProvider>
              {children}
              <SpeedInsights />
            </ToastProvider>
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}

