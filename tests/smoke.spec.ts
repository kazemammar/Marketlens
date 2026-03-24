import { test, expect } from '@playwright/test'

test.describe('API smoke tests', () => {
  test('GET /api/market-pulse returns 200 with pulse field', async ({ request }) => {
    const res = await request.get('/api/market-pulse')
    expect(res.status()).toBe(200)
    const body = await res.json()
    expect(body).toHaveProperty('pulse')
  })

  test('GET /api/market-brief returns 200 with brief field', async ({ request }) => {
    const res = await request.get('/api/market-brief')
    expect(res.status()).toBe(200)
    const body = await res.json()
    expect(body).toHaveProperty('brief')
  })

  test('GET /api/market-risk returns 200 with level field', async ({ request }) => {
    const res = await request.get('/api/market-risk')
    expect(res.status()).toBe(200)
    const body = await res.json()
    expect(body).toHaveProperty('level')
  })

  test('GET /api/market?tab=stock returns 200 with array', async ({ request }) => {
    const res = await request.get('/api/market?tab=stock')
    expect(res.status()).toBe(200)
    const body = await res.json()
    expect(Array.isArray(body)).toBe(true)
  })

  test('GET /api/commodities-strip returns 200 with items field', async ({ request }) => {
    const res = await request.get('/api/commodities-strip')
    expect(res.status()).toBe(200)
    const body = await res.json()
    expect(body).toHaveProperty('items')
  })

  test('GET /api/movers returns 200 with all field', async ({ request }) => {
    const res = await request.get('/api/movers')
    expect(res.status()).toBe(200)
    const body = await res.json()
    expect(body).toHaveProperty('all')
  })

  test('GET /api/market?tab=forex returns 200 with array', async ({ request }) => {
    const res = await request.get('/api/market?tab=forex')
    expect(res.status()).toBe(200)
    const body = await res.json()
    expect(Array.isArray(body)).toBe(true)
  })

  test('GET /api/news returns 200 with articles field', async ({ request }) => {
    const res = await request.get('/api/news')
    expect(res.status()).toBe(200)
    const body = await res.json()
    expect(body).toHaveProperty('articles')
  })
})
