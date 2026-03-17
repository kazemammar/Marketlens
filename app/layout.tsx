import type { Metadata, Viewport } from 'next'
import { Inter, JetBrains_Mono } from 'next/font/google'
import './globals.css'
import { ThemeProvider } from '@/components/layout/ThemeProvider'
import { AuthProvider }  from '@/lib/hooks/useAuth'
import Navbar from '@/components/layout/Navbar'
import Footer from '@/components/layout/Footer'

const inter = Inter({
  variable: '--font-inter',
  subsets:  ['latin'],
  display:  'swap',
  weight:   ['400', '500', '600', '700'],
})

const jetbrainsMono = JetBrains_Mono({
  variable: '--font-jetbrains-mono',
  subsets:  ['latin'],
  display:  'swap',
  weight:   ['400', '500', '600', '700'],
})

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL ?? 'https://marketlens.live'

const SITE_TITLE       = 'MarketLens — Live Market Data & AI Analysis'
const SITE_DESCRIPTION = 'Real-time financial intelligence platform. Track stocks, crypto, forex, commodities & ETFs with AI-powered analysis, geopolitical monitoring, and smart news.'

export const metadata: Metadata = {
  title: {
    default:  SITE_TITLE,
    template: '%s | MarketLens',
  },
  description: SITE_DESCRIPTION,
  keywords: ['stock market', 'cryptocurrency', 'forex', 'commodities', 'ETF', 'financial analysis', 'AI trading', 'market intelligence', 'geopolitical risk', 'real-time data'],
  authors:  [{ name: 'Kazem Ammar' }],
  creator:  'Kazem Ammar',
  metadataBase: new URL(BASE_URL),
  openGraph: {
    type:        'website',
    locale:      'en_US',
    url:         BASE_URL,
    siteName:    'MarketLens',
    title:       SITE_TITLE,
    description: 'Real-time financial intelligence. AI-powered analysis across stocks, crypto, forex, commodities & ETFs.',
    images: [{ url: '/og-image.png', width: 1200, height: 630, alt: 'MarketLens — Financial Intelligence Platform' }],
  },
  twitter: {
    card:        'summary_large_image',
    title:       SITE_TITLE,
    description: 'Real-time financial intelligence. AI-powered analysis across stocks, crypto, forex, commodities & ETFs.',
    images:      ['/og-image.png'],
  },
  icons: {
    icon:  '/favicon-32x32.png',
    apple: '/apple-touch-icon.png',
  },
  robots: {
    index:  true,
    follow: true,
  },
}

export const viewport: Viewport = {
  themeColor: [
    { media: '(prefers-color-scheme: dark)',  color: '#09090b' },
    { media: '(prefers-color-scheme: light)', color: '#09090b' },
  ],
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className="dark" suppressHydrationWarning>
      <body
        className={`${inter.variable} ${jetbrainsMono.variable} antialiased`}
        suppressHydrationWarning
      >
        <ThemeProvider>
          <AuthProvider>
            <div className="flex min-h-screen flex-col">
              <Navbar />
              <div className="flex-1">{children}</div>
              <Footer />
            </div>
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  )
}
