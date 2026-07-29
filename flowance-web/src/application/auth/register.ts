import type {RegistrationInput} from '@/domain/auth'
import type {AuthGateway} from './ports'

export async function registerAccount(gateway: AuthGateway, input: RegistrationInput): Promise<void> {
  await gateway.register(input)
}
