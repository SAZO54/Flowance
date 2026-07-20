import type {AuthGateway} from './ports'

export async function logoutCurrentSession(gateway: AuthGateway): Promise<void> {
  await gateway.logout()
}
