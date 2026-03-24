import { test, expect } from '@playwright/test'

const CRITICAL_ROUTES = [
  '/api/market?tab=stock',
  '/api/news?page=1&limit=5',
  '/api/economics',
  '/api/signals',
  '/api/trending',
  '/api/fear-greed',
  '/api/market-risk',
  '/api/chokepoints',
  '/api/predictions',
  '/api/commodities-strip',
  '/api/central-banks',
  '/api/energy',
]

test.describe('Extended API smoke tests', () => {
  for (const route of CRITICAL_ROUTES) {
    test(`${route} returns 200`, async ({ request }) => {
      const res = await request.get(route)
      expect(res.status()).toBe(200)
      const body = await res.json()
      expect(body).toBeTruthy()
    })
  }

  test('Portfolio routes require auth', async ({ request }) => {
    const res = await request.get('/api/portfolio')
    expect(res.status()).toBe(401)
  })
})
