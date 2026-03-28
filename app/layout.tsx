import type { Metadata, Viewport } from 'next'
import { Inter, JetBrains_Mono, DM_Sans } from 'next/font/google'
import './globals.css'
import { ThemeProvider } from '@/components/layout/ThemeProvider'
import { AuthProvider }  from '@/lib/hooks/useAuth'
import Navbar from '@/components/layout/Navbar'
import Footer from '@/components/layout/Footer'
import ServiceWorkerRegister from '@/components/layout/ServiceWorkerRegister'
import InstallPrompt         from '@/components/layout/InstallPrompt'
import { Analytics }        from '@vercel/analytics/react'

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

// Logo wordmark only — never used for body text
const dmSans = DM_Sans({
  variable: '--font-dm-sans',
  subsets:  ['latin'],
  display:  'swap',
  weight:   ['400', '700', '800'],
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
  authors:  [{ name: 'Kazem Julien Ammar' }],
  creator:  'Kazem Julien Ammar',
  metadataBase: new URL(BASE_URL),
  icons: {
    icon: [
      { url: '/favicon.svg',        type: 'image/svg+xml' },
      { url: '/favicon-32x32.png',  type: 'image/png', sizes: '32x32' },
      { url: '/favicon-16x16.png',  type: 'image/png', sizes: '16x16' },
    ],
    apple: [{ url: '/apple-touch-icon.png', sizes: '180x180' }],
  },
  openGraph: {
    type:        'website',
    locale:      'en_US',
    url:         BASE_URL,
    siteName:    'MarketLens',
    title:       'MarketLens — Live Market Data & AI Analysis',
    description: 'Free real-time financial intelligence. AI-powered market analysis, geopolitical risk mapping, and portfolio analytics.',
    images: [{ url: '/og-image.png', width: 1200, height: 630, alt: 'MarketLens' }],
  },
  twitter: {
    card:        'summary',
    title:       'MarketLens — Live Market Data & AI Analysis',
    description: 'Free real-time financial intelligence. AI-powered market analysis, geopolitical risk mapping, and portfolio analytics.',
    images:      ['/og-image.png'],
  },
  manifest: '/manifest.json',
  appleWebApp: {
    capable:         true,
    statusBarStyle:  'black-translucent',
    title:           'MarketLens',
  },
  other: {
    'mobile-web-app-capable':            'yes',
    'apple-mobile-web-app-capable':      'yes',
    'apple-mobile-web-app-status-bar-style': 'black-translucent',
    'apple-mobile-web-app-title':        'MarketLens',
  },
  robots: {
    index:  true,
    follow: true,
  },
}

export const viewport: Viewport = {
  themeColor:    '#0a0e17',
  width:         'device-width',
  initialScale:  1,
  maximumScale:  5,
  viewportFit:   'cover',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className="dark" suppressHydrationWarning>
      <body
        className={`${inter.variable} ${jetbrainsMono.variable} ${dmSans.variable} antialiased bg-[var(--bg)]`}
      >
        <ThemeProvider>
          <AuthProvider>
            <div className="flex min-h-screen flex-col">
              <Navbar />
              {/* Push content below the fixed navbar (52px) + iOS status bar safe area */}
              <div className="flex-1 navbar-offset">{children}</div>
              <Footer />
            </div>
          </AuthProvider>
        </ThemeProvider>
        <ServiceWorkerRegister />
        <InstallPrompt />
        <Analytics />
      </body>
    </html>
  )
}
