import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { fetchRemoteAvatar } from '~~/server/utils/remoteAvatar'

const { lookupMock } = vi.hoisted(() => ({ lookupMock: vi.fn() }))

vi.mock('node:dns/promises', () => ({ lookup: lookupMock }))

describe('remote avatar SSRF protection', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    lookupMock.mockResolvedValue([{ address: '31.13.64.1', family: 4 }])
    vi.stubGlobal('fetch', vi.fn())
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('rejects non-HTTPS URLs before making a network request', async () => {
    await expect(fetchRemoteAvatar('http://scontent.xx.fbcdn.net/avatar.jpg'))
      .rejects.toThrow('Avatar URL must use HTTPS')
    expect(fetch).not.toHaveBeenCalled()
    expect(lookupMock).not.toHaveBeenCalled()
  })

  it('rejects hosts outside the provider CDN allowlist before DNS resolution', async () => {
    await expect(fetchRemoteAvatar('https://attacker.example/avatar.jpg'))
      .rejects.toThrow('Avatar host is not allowlisted')
    expect(fetch).not.toHaveBeenCalled()
    expect(lookupMock).not.toHaveBeenCalled()
  })

  it('revalidates every redirect and refuses a redirect to loopback', async () => {
    vi.mocked(fetch).mockResolvedValue(new Response(null, {
      status: 302,
      headers: { location: 'https://127.0.0.1/internal' },
    }))

    await expect(fetchRemoteAvatar('https://scontent.xx.fbcdn.net/avatar.jpg'))
      .rejects.toThrow('Avatar host is not allowlisted')
    expect(fetch).toHaveBeenCalledOnce()
    expect(lookupMock).toHaveBeenCalledOnce()
  })

  it('rejects a provider hostname if DNS returns any blocked address', async () => {
    lookupMock.mockResolvedValue([
      { address: '31.13.64.1', family: 4 },
      { address: '127.0.0.1', family: 4 },
    ])

    await expect(fetchRemoteAvatar('https://scontent.xx.fbcdn.net/avatar.jpg'))
      .rejects.toThrow('Avatar host resolves to a blocked address')
    expect(fetch).not.toHaveBeenCalled()
  })
})
