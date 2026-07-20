export interface AuthGateway {
  logout(): Promise<void>
}
