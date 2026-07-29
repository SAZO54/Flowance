import type {CurrentAuthContext, LoginCredentials, RegistrationInput} from '@/domain/auth'

export interface AuthGateway {
  getCurrentUser(): Promise<CurrentAuthContext>
  login(credentials: LoginCredentials): Promise<void>
  register(input: RegistrationInput): Promise<void>
  logout(): Promise<void>
}
