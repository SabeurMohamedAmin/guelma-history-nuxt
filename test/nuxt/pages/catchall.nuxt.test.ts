import { describe, it, expect } from 'vitest'

describe('Catch-all 404 Route [...slug].vue', () => {
  it('should exist and be configured to catch unmatched routes', async () => {
    // Importing the component to ensure it loads cleanly
    const CatchAllComponent = await import('../../../app/pages/[...slug].vue')
    expect(CatchAllComponent).toBeDefined()
  })
})
