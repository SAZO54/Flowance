import type {CurrentAuthContext} from '../../domain/auth'
import {apiClient, type ApiClient} from './apiClient'

export class AuthApi {
  constructor(private readonly client: ApiClient = apiClient) {}

  getCurrentUser(): Promise<CurrentAuthContext> {
    return this.client.request<CurrentAuthContext>('/api/v1/auth/me')
  }
}

export const authApi = new AuthApi()
