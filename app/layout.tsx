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

const SITE_DESCRIPTION =
  'Real-time prices, charts, news, and AI-powered sentiment analysis for stocks, crypto, forex, commodities, and ETFs.'

export const metadata: Metadata = {
  title: {
    default:  'MarketLens — Live Market Data & AI Analysis',
    template: '%s | MarketLens',
  },
  description: SITE_DESCRIPTION,
  keywords: ['stocks', 'crypto', 'forex', 'commodities', 'ETF', 'market data', 'finance', 'AI analysis', 'live prices'],
  metadataBase: new URL(process.env.NEXT_PUBLIC_BASE_URL ?? 'https://marketlens.vercel.app'),
  openGraph: {
    type:        'website',
    siteName:    'MarketLens',
    title:       'MarketLens — Live Market Data & AI Analysis',
    description: SITE_DESCRIPTION,
  },
  twitter: {
    card:        'summary',
    title:       'MarketLens — Live Market Data & AI Analysis',
    description: SITE_DESCRIPTION,
  },
  icons: {
    icon: '/favicon.svg',
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
