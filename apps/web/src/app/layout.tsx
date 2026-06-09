import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { Providers } from '@/components/providers';
import { Toaster } from 'sonner';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: {
    default: 'WinkX AI — WhatsApp, Instagram & Facebook Automation Platform',
    template: '%s | WinkX AI',
  },
  description: 'The most powerful AI-driven automation platform for WhatsApp, Instagram, and Facebook. Build chatbots, automate DMs, generate leads, and grow your business.',
  keywords: ['WhatsApp automation', 'Instagram automation', 'Facebook chatbot', 'AI chatbot', 'lead generation', 'marketing automation'],
  authors: [{ name: 'WinkX AI' }],
  creator: 'WinkX AI',
  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: 'https://winkx.ai',
    title: 'WinkX AI — Social Media Automation Platform',
    description: 'Automate your WhatsApp, Instagram & Facebook with AI-powered chatbots and workflows.',
    siteName: 'WinkX AI',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'WinkX AI',
    description: 'AI-powered WhatsApp, Instagram & Facebook automation.',
    creator: '@winkxai',
  },
  robots: { index: true, follow: true },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={inter.className}>
        <Providers>
          {children}
          <Toaster
            richColors
            position="top-right"
            toastOptions={{
              style: {
                background: 'hsl(var(--card))',
                border: '1px solid hsl(var(--border))',
                color: 'hsl(var(--foreground))',
              },
            }}
          />
        </Providers>
      </body>
    </html>
  );
}
