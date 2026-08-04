import {describe, expect, it, vi} from 'vitest'
import {loginCurrentSession} from './login'
import {registerAccount} from './register'
import type {AuthGateway} from './ports'

function gateway(): AuthGateway {
  return {
    getCurrentUser: vi.fn(),
    login: vi.fn(),
    register: vi.fn(),
    logout: vi.fn(),
  }
}

describe('loginCurrentSession', () => {
  it('normalizes the email before calling the auth gateway', async () => {
    const authGateway = gateway()

    await loginCurrentSession(authGateway, {
      email: ' Owner@Example.COM ',
      password: 'safe-password',
    })

    expect(authGateway.login).toHaveBeenCalledWith({
      email: 'owner@example.com',
      password: 'safe-password',
    })
  })
})

describe('registerAccount', () => {
  it('normalizes email and trims display values before calling the gateway', async () => {
    const authGateway = gateway()

    await registerAccount(authGateway, {
      email: ' Member@Example.COM ',
      password: 'safe-password',
      displayName: '  Member User  ',
      organizationName: '  Flowance  ',
      timezone: 'Asia/Tokyo',
    })

    expect(authGateway.register).toHaveBeenCalledWith({
      email: 'member@example.com',
      password: 'safe-password',
      displayName: 'Member User',
      organizationName: 'Flowance',
      timezone: 'Asia/Tokyo',
    })
  })
})
