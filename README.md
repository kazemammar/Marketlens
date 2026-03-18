<p align="center">
  <img src="public/icon.svg" width="80" height="80" alt="MarketLens" />
</p>

<h1 align="center">MarketLens</h1>

<p align="center">
  <strong>Real-time financial intelligence platform — live data, AI analysis, and geopolitical monitoring across global markets.</strong>
</p>

<p align="center">
  <a href="https://marketlens.live"><strong>🌐 marketlens.live</strong></a>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/Next.js-16-black?style=flat-square&logo=next.js" alt="Next.js 16" />
  <img src="https://img.shields.io/badge/TypeScript-5-blue?style=flat-square&logo=typescript" alt="TypeScript" />
  <img src="https://img.shields.io/badge/React-19-61dafb?style=flat-square&logo=react" alt="React 19" />
  <img src="https://img.shields.io/badge/Tailwind-4-38bdf8?style=flat-square&logo=tailwindcss" alt="Tailwind 4" />
  <img src="https://img.shields.io/badge/Supabase-Auth%20%2B%20DB-3fcf8e?style=flat-square&logo=supabase" alt="Supabase" />
  <img src="https://img.shields.io/badge/AI-Groq%20%2F%20Llama%203.1-f97316?style=flat-square" alt="Groq AI" />
  <img src="https://img.shields.io/badge/Deployed-Vercel-000?style=flat-square&logo=vercel" alt="Vercel" />
</p>

---

## Overview

MarketLens is a Bloomberg-inspired financial war room for individual investors. It combines real-time market data from 6 providers, AI-powered analysis via Groq/Llama 3.1, and geopolitical intelligence monitoring into a single, fast, dark-themed dashboard.

<table>
<tr>
<td width="50%">

**174** TypeScript files
<br>**86** React components
<br>**41** API routes
<br>**13** pages

</td>
<td width="50%">

**40+** RSS news sources
<br>**6** market data providers
<br>**23,700+** lines of code
<br>**Sub-100ms** cached responses

</td>
</tr>
</table>

---

## Command Center

The main dashboard serves as a real-time command center — every panel updates live, every data point is sourced and cached for speed.

### AI Market Brief

Groq-powered morning briefing that synthesizes overnight developments, key movers, and risk signals into a concise paragraph. Auto-refreshes every 30 minutes with a risk severity badge (LOW / MOD / HIGH / CRITICAL).

### Geopolitical Intelligence Map

Interactive MapLibre globe showing live conflict zones, maritime chokepoints, oil and gas pipelines, shipping traffic, and military bases. Layer toggles for each data set. Jump-to presets for Mid East, Europe, Asia-Pacific, and Americas.

### Intelligence Feed

Real-time news aggregation from 40+ RSS sources, classified by severity and filterable by region (Mid East, Europe, Asia, Americas, Africa) and category (Geopolitical, Markets, Energy, Tech, Crypto). Every article scored and tagged automatically.

### Market Intelligence Panels

<table>
<tr>
<td width="50%">

**Market Radar** — AI-generated buy/sell/cash signals for S&P 500, Nasdaq, Gold, Oil, VIX, and Bonds with a composite bull/bear score

</td>
<td width="50%">

**Risk Gauge** — Composite threat ring across geopolitical, volatility, energy, and supply chain dimensions with per-dimension triggers and safe havens

</td>
</tr>
<tr>
<td width="50%">

**FX Monitor** — Live major pair exchange rates via ECB reference feed

</td>
<td width="50%">

**S&P 500 Heatmap** — Top 15 constituents by market cap, colored by daily performance

</td>
</tr>
<tr>
<td width="50%">

**Live Signals** — Streaming events fired on large price moves, news catalysts, and technical breakouts

</td>
<td width="50%">

**Prediction Markets** — Live Polymarket odds on geopolitical and economic events

</td>
</tr>
</table>

### News Briefing

Three-column categorized news grid — Geopolitical, Markets & Economy, Energy & Commodities — with severity-ranked articles, source attribution, and time-since-publish.

### Economic Indicators

FRED-powered macro dashboard: CPI, unemployment, GDP, Fed funds rate, PMI, housing starts, consumer sentiment, yield curves, and more. Cached 6 hours with freshness timestamps.

### Maritime Traffic

Live vessel counts at Strait of Hormuz, Suez Canal, Malacca Strait, and Bab el-Mandeb with historical comparison bars and chokepoint risk assessment.

---

## Portfolio War Room

A personalized intelligence hub that adapts entirely to your holdings. Sign in, add positions, and the entire page reshapes around your portfolio.

### Summary Bar

Hero bar showing total portfolio value, today's P&L, all-time P&L (dollars and percentage), best and worst performers, and mini spark bars per position. The background gradient shifts green or red based on the day's direction.

### AI Portfolio Brief

Personalized Groq analysis of your specific holdings. Accounts for long/short direction in risk framing — a short position on oil gets different risk commentary than a long. Auto-refreshes every 30 minutes. Manual refresh busts caches and regenerates.

### Intelligence Panels

<table>
<tr>
<td width="50%">

**Day's Movers** — Winners and losers with P&L bars, gradient glow, and hover elevation. Short positions correctly inverted — price down is a win for shorts

</td>
<td width="50%">

**Allocation** — SVG donut ring showing allocation by asset type with animated segments, glow filter, center value, and a long/short direction bar

</td>
</tr>
<tr>
<td width="50%">

**Risk Alerts** — Concentration risk, diversification warnings, directional exposure, and correlation alerts. Pulsing indicators on HIGH severity

</td>
<td width="50%">

**Exposure** — Net direction gauge with gradient fill and tick marks. Position mini-cards grouped by asset class with live prices

</td>
</tr>
</table>

### Earnings Calendar

Upcoming estimated earnings dates for portfolio stocks with urgency coloring and countdown timers. Recent quarters show beat/miss results with actual vs estimated EPS comparison. Upcoming dates estimated from historical reporting patterns via Finnhub data.

### Positions Table

Sortable by any column. Desktop table with mobile card fallback. Shows symbol, type, direction (LONG/SHORT), day change %, quantity, average cost, market value, P&L dollar and P&L percentage. Inline "+ Add" buttons for missing cost data.

### Add / Edit Positions

Full-featured position management with debounced symbol search across all asset types. When a symbol is selected, a live data snapshot appears showing current price, day range bar with position indicator, 52-week range bar, market cap, P/E ratio, and dividend yield. Available from the portfolio dashboard and directly from any asset page via the "Portfolio" button.

### Portfolio News Feed

RSS articles filtered to your specific holdings, tagged with matched position pills (▲ AAPL, ▼ CL=F), severity-ranked, and scrollable.

---

## Market Pages

### Stocks

75+ stocks organized by sector — Technology, Finance, Healthcare, Consumer, Energy, Industrial, Communication Services. Live prices, day changes, sparkline charts, and click-through to deep-dive asset pages.

### Crypto

Major cryptocurrencies with Binance real-time prices, 24h volume, market cap, DeFi TVL tracker, and Fear & Greed Index integration.

### Forex

Major, minor, and exotic pairs with ECB reference rates, a central bank rate dashboard showing current policy rates worldwide, and a cross-rate matrix.

### Commodities

Energy, metals, and agriculture futures via Yahoo Finance with a live commodity strip bar across the top of the dashboard.

### ETFs

Major ETFs with holdings breakdown, sector weights, country exposure, and performance tracking.

### News Hub

Full-page news feed with category filtering, severity sorting, source diversity, and article thumbnails.

### Economics

FRED-powered macro dashboard with 9 key US indicators, historical trends, percentage changes, and data freshness timestamps.

---

## Asset Deep Dives

Every stock, crypto, forex pair, commodity, and ETF has a dedicated page with:

- Live price header with market status indicator
- Multi-timeframe interactive chart (1D through 5Y)
- Company financials — income statement, balance sheet, cash flow (quarterly and annual)
- Key metrics — P/E, P/B, P/S, ROE, ROA, debt-to-equity, 52-week range, dividend yield, market cap
- Insider transactions — recent executive purchases and sales
- Technical indicators — RSI, MACD, Bollinger Bands, moving averages
- Peer comparison with quick-nav
- Analyst consensus recommendations
- One-click add to Portfolio or Watchlist

---

## Platform

<table>
<tr>
<td>🔐 <strong>Authentication</strong></td>
<td>Supabase Auth with email/password, secure sessions, auth-gated portfolio and watchlist</td>
</tr>
<tr>
<td>⭐ <strong>Watchlist</strong></td>
<td>Star any asset to track it, synced across devices</td>
</tr>
<tr>
<td>🔍 <strong>Global Search</strong></td>
<td><code>⌘K</code> activated, searches all asset types with keyboard navigation</td>
</tr>
<tr>
<td>🌗 <strong>Dark / Light Theme</strong></td>
<td>Full theme support with CSS custom properties, persisted via cookie</td>
</tr>
<tr>
<td>📱 <strong>Mobile Responsive</strong></td>
<td>Every component adapts from mobile to desktop with tailored breakpoints</td>
</tr>
<tr>
<td>📲 <strong>PWA Ready</strong></td>
<td>Service worker, manifest, installable on mobile with splash screen</td>
</tr>
<tr>
<td>🛡️ <strong>Security</strong></td>
<td>Rate limiting, security headers, input validation, Row Level Security on all user data</td>
</tr>
</table>

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| **Framework** | Next.js 16 (App Router, React 19, Turbopack) |
| **Language** | TypeScript 5 (strict mode) |
| **Styling** | Tailwind CSS 4 with CSS custom properties |
| **Auth & Database** | Supabase (PostgreSQL + Auth + RLS) |
| **Cache** | Upstash Redis (multi-TTL, per-user + global) |
| **AI** | Groq Cloud (Llama 3.1 70B) |
| **Market Data** | Finnhub · Yahoo Finance · Binance · FMP · ECB/Frankfurter · FRED |
| **News** | 40+ RSS feeds via rss-parser |
| **Maps** | MapLibre GL JS |
| **Deployment** | Vercel |

---

## Architecture┌─────────────────────────────────────────────────────────────────┐
│                        NEXT.JS 16 APP ROUTER                    │
├─────────────┬──────────────┬────────────────┬───────────────────┤
│   13 Pages  │ 86 Components│  41 API Routes  │  Service Worker  │
├─────────────┴──────────────┴────────────────┴───────────────────┤
│                        MIDDLEWARE                                │
│              Security Headers · Theme Detection                  │
├─────────────────────────────────────────────────────────────────┤
│                        API LAYER                                 │
│    Rate Limiting · Auth Gates · Input Validation · Caching       │
├──────────┬──────────┬───────────┬──────────┬────────────────────┤
│ Finnhub  │  Yahoo   │    FMP    │   Groq   │  RSS (40+ feeds)   │
│ Stocks   │  Crypto  │ Financials│ AI Brief │  News + Intel      │
│ Metrics  │  Cmdty   │  Company  │ Signals  │  Severity Class.   │
│ Earnings │  Forex   │           │  Radar   │                    │
├──────────┴──────────┴───────────┴──────────┴────────────────────┤
│              UPSTASH REDIS          │        SUPABASE            │
│    Multi-TTL caching (5s → 6h)      │  Auth · Positions · RLS   │
│    Per-user + global keys           │  Watchlists · Sessions    │
│    Rate limit counters              │  Portfolio data           │
└─────────────────────────────────────┴───────────────────────────┘
### Caching Strategy

| Data Type | TTL | Notes |
|-----------|-----|-------|
| Live quotes | 15–30s | Per-symbol |
| News feeds | 5 min | Per-source RSS |
| AI briefs | 15–30 min | Per-user, Groq generation |
| Financial metrics | 1–6h | Per-symbol |
| Earnings calendar | 6h | Per-user |
| Economic indicators | 6h | FRED series data |
| Portfolio news | 5 min | Per-user, filtered RSS |

---

## Roadmap

- [ ] Portfolio benchmark comparison (vs S&P 500)
- [ ] Performance tracking over time (daily snapshots + chart)
- [ ] Top Gainers / Losers page
- [ ] Price alerts & notifications
- [ ] Multiple named portfolios
- [ ] CSV position import
- [ ] Currency strength meter
- [ ] Expanded stock sectors

---

<p align="center">
  Built by <strong>Kazem Julien Ammar</strong>
</p>

<p align="center">
  <sub>Every pixel. Every millisecond. Every data point.</sub>
</p>
