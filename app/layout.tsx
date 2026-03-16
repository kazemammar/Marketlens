import type { Metadata, Viewport } from 'next'
import { Geist, Geist_Mono } from 'next/font/google'
import './globals.css'
import { ThemeProvider } from '@/components/layout/ThemeProvider'
import Navbar from '@/components/layout/Navbar'
import Footer from '@/components/layout/Footer'

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets:  ['latin'],
})

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets:  ['latin'],
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
    { media: '(prefers-color-scheme: dark)',  color: '#0f1117' },
    { media: '(prefers-color-scheme: light)', color: '#f8fafc' },
  ],
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    // Default to dark — ThemeProvider will read localStorage and override if needed
    <html lang="en" className="dark" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
        suppressHydrationWarning
      >
        <ThemeProvider>
          <div className="flex min-h-screen flex-col">
            <Navbar />
            <div className="flex-1">{children}</div>
            <Footer />
          </div>
        </ThemeProvider>
      </body>
    </html>
  )
}
