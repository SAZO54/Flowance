import type {LoginCredentials} from '@/domain/auth'
import type {AuthGateway} from './ports'

export async function loginCurrentSession(gateway: AuthGateway, credentials: LoginCredentials): Promise<void> {
  await gateway.login(credentials)
}
