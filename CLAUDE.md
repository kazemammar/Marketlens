# CLAUDE.md — Finance Platform

## Project Overview
A Next.js 16 finance dashboard covering Stocks, Commodities, Forex, Crypto, and ETFs. Features live prices, TradingView charts, news aggregation, AI sentiment analysis, company financials, analyst recommendations, and a full warroom with geopolitical intelligence.

## Tech Stack
- **Framework:** Next.js 16 (App Router) + TypeScript
- **Styling:** Tailwind CSS v4 (dark-first theme, CSS variables)
- **Charts:** TradingView Advanced Chart Widget (embedded), Recharts
- **Market Data:** Finnhub API, Financial Modeling Prep, CoinGecko, Yahoo Finance, Twelve Data, Frankfurter (FX)
- **AI:** Groq (Llama 3.3 70B Versatile) for market briefs, sentiment, sector narratives, what-if analysis
- **Cache:** Upstash Redis
- **Database:** Supabase (auth + portfolio)
- **Hosting:** Vercel

## Key Architecture Decisions
- All external API calls go through Next.js API routes (`app/api/`) — never expose API keys to the client
- Every API response is cached in Upstash Redis with appropriate TTLs (see table below)
- TradingView chart is a client component using the free widget embed
- AI briefs are session-aware (pre-market / morning / afternoon / after-hours)
- Search is universal across all 5 asset classes
- Asset pages use dynamic routes: `/asset/[type]/[symbol]`
- Homepage data is pre-fetched server-side via `getHomepageData()` and cached for 10 min

## Cache TTL Reference

| Key Pattern | TTL | Description |
|---|---|---|
| `homepage:init:v2` | 600s (10 min) | Full homepage data (stocks, commodities, ticker, radar) |
| `quote:*` | 900s (15 min) | Live price quotes (Finnhub) |
| `search:*` | 300s (5 min) | Search results |
| `news:*` / `rss:*` | 300s (5 min) | News articles and RSS feeds |
| `sentiment:*` | 1800s (30 min) | AI sentiment analysis |
| `financials:*` / `profile:*` / `ratios:*` | 86400s (24 h) | Company data (slow-changing) |
| `recommendations:*` | 3600s (1 h) | Analyst recommendations |
| `crypto-markets:*` / `crypto-detail:*` | 300s (5 min) | CoinGecko data |
| `forex:*` | 3600s (1 h) | Forex rates (Frankfurter) |
| `commodities:*` | 300s (5 min) | Commodity futures (Yahoo) |
| `market-brief:daily` | 3600s (1 h) | AI market brief |
| `market-risk:v6` | 3600s (1 h) | Risk gauge |
| `sector-narratives:v1` | 1800s (30 min) | AI sector narratives |
| `twelvedata:technicals:*` | 600s (10 min) | Technical indicators |
| `movers:v2` | 1800s (30 min) | Top movers (stale-while-revalidate) |
| `polymarket:markets:v2` | 900s (15 min) | Prediction markets |

## Coding Conventions
- Use TypeScript strictly — no `any` types
- Use Tailwind CSS for all styling — no CSS modules or styled-components
- CSS variables: `--text`, `--text-2`, `--text-muted`, `--surface`, `--surface-2`, `--border`, `--accent`, `--bg`
- Components go in `components/` organized by feature
- API clients go in `lib/api/`
- Use server components by default, client components only when needed (interactivity, hooks)
- Format numbers consistently: prices with 2 decimals, percentages with 2 decimals, large numbers abbreviated (1.2B, 450M)
- Green (#22c55e / `var(--price-up)`) for positive changes, Red (#ef4444 / `var(--price-down)`) for negative
- All prices should show currency symbol
- Timestamps: use `suppressHydrationWarning` on client-rendered time elements
- Card headers: SVG icon + font-mono title + live dot + gradient divider

## Environment Variables
All API keys are in `.env.local` — never hardcode keys:
- FINNHUB_API_KEY
- FMP_API_KEY
- GROQ_API_KEY
- TWELVEDATA_API_KEY
- UPSTASH_REDIS_REST_URL
- UPSTASH_REDIS_REST_TOKEN
- NEXT_PUBLIC_SUPABASE_URL
- NEXT_PUBLIC_SUPABASE_ANON_KEY

## File Structure
```
app/           → Pages and API routes (Next.js App Router)
components/    → React components organized by feature
lib/api/       → API client functions for external services
lib/cache/     → Redis caching utilities
lib/utils/     → Formatters, constants, TypeScript types
lib/hooks/     → Custom React hooks
public/        → Static assets
tests/         → Playwright smoke tests
```

## Important Notes
- Finnhub free tier: 60 calls/minute — always cache responses
- Financial Modeling Prep free tier: 250 calls/day — cache aggressively
- CoinGecko: no API key needed for basic endpoints
- Yahoo Finance: no API key, used for commodity futures and historical data
- Twelve Data: free tier, used for RSI, MACD, Bollinger Bands, ATR, Stochastic
- Frankfurter API: free, no key, used for forex rates (ECB reference rates)
- TradingView widget: free, no API key, client-side only
- RSS feeds: free, parse with rss-parser
- Always handle API errors gracefully — show fallback UI, never crash
- Mobile-responsive: all layouts must work on 375px+ screens
