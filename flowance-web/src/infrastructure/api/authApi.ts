import type {CurrentAuthContext} from '../../domain/auth'
import type {AuthGateway} from '../../application/auth'
import {apiClient, type ApiClient} from './apiClient'

export class AuthApi implements AuthGateway {
  constructor(private readonly client: ApiClient = apiClient) {}

  getCurrentUser(): Promise<CurrentAuthContext> {
    return this.client.request<CurrentAuthContext>('/api/v1/auth/me')
  }

  logout(): Promise<void> {
    return this.client.request<void>('/api/v1/auth/logout', {method: 'POST'})
  }
}

export const authApi = new AuthApi()
