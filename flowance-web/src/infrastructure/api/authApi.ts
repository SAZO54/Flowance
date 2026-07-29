import type {CurrentAuthContext, LoginCredentials, RegistrationInput} from '../../domain/auth'
import type {AuthGateway} from '../../application/auth'
import {apiClient, type ApiClient} from './apiClient'

export class AuthApi implements AuthGateway {
  constructor(private readonly client: ApiClient = apiClient) {}

  getCurrentUser(): Promise<CurrentAuthContext> {
    return this.client.request<CurrentAuthContext>('/api/v1/auth/me')
  }

  async login(credentials: LoginCredentials): Promise<void> {
    await this.client.request('/api/v1/auth/login', {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify(credentials),
      retryAuthentication: false,
    })
  }

  async register(input: RegistrationInput): Promise<void> {
    await this.client.request('/api/v1/auth/register', {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify(input),
      retryAuthentication: false,
    })
  }

  logout(): Promise<void> {
    return this.client.request<void>('/api/v1/auth/logout', {method: 'POST'})
  }
}

export const authApi = new AuthApi()
