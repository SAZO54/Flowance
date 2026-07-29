import type {CurrentAuthContext} from '@/domain/auth'
import type {AuthGateway} from './ports'

export function loadCurrentSession(gateway: AuthGateway): Promise<CurrentAuthContext> {
  return gateway.getCurrentUser()
}
