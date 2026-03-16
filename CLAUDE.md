# CLAUDE.md — Finance Platform

## Project Overview
A Next.js 14 finance dashboard covering Stocks, Commodities, Forex, Crypto, and ETFs. Features live prices, TradingView charts, news aggregation, AI sentiment analysis, company financials, and analyst recommendations.

## Tech Stack
- **Framework:** Next.js 14 (App Router) + TypeScript
- **Styling:** Tailwind CSS (dark-first theme)
- **Charts:** TradingView Advanced Chart Widget (embedded)
- **Market Data:** Finnhub API, Financial Modeling Prep, CoinGecko
- **AI:** Groq (Llama 3.1 8B) for sentiment analysis
- **Cache:** Upstash Redis
- **Database:** Supabase (Phase 2)
- **Hosting:** Vercel

## Key Architecture Decisions
- All external API calls go through Next.js API routes (`app/api/`) — never expose API keys to the client
- Every API response is cached in Upstash Redis with appropriate TTLs
- TradingView chart is a client component using the free widget embed
- AI sentiment is generated per asset, cached for 30 minutes
- Search is universal across all 5 asset classes
- Asset pages use dynamic routes: `/asset/[type]/[symbol]`

## Coding Conventions
- Use TypeScript strictly — no `any` types
- Use Tailwind CSS for all styling — no CSS modules or styled-components
- Components go in `components/` organized by feature
- API clients go in `lib/api/`
- Use server components by default, client components only when needed (interactivity, hooks)
- Format numbers consistently: prices with 2 decimals, percentages with 2 decimals, large numbers abbreviated (1.2B, 450M)
- Green (#22c55e) for positive changes, Red (#ef4444) for negative
- All prices should show currency symbol

## Environment Variables
All API keys are in `.env.local` — never hardcode keys:
- FINNHUB_API_KEY
- FMP_API_KEY
- GROQ_API_KEY
- UPSTASH_REDIS_REST_URL
- UPSTASH_REDIS_REST_TOKEN

## File Structure
```
app/           → Pages and API routes (Next.js App Router)
components/    → React components organized by feature
lib/api/       → API client functions for external services
lib/cache/     → Redis caching utilities
lib/utils/     → Formatters, constants, TypeScript types
lib/hooks/     → Custom React hooks
public/        → Static assets
```

## Important Notes
- Finnhub free tier: 60 calls/minute — always cache responses
- Financial Modeling Prep free tier: 250 calls/day — cache aggressively
- CoinGecko: no API key needed for basic endpoints
- TradingView widget: free, no API key, client-side only
- RSS feeds: free, parse with a library like rss-parser
- Always handle API errors gracefully — show fallback UI, never crash
- Mobile-responsive: all layouts must work on 375px+ screens
