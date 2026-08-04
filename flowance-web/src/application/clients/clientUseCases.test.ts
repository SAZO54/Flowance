import {describe, expect, it, vi} from 'vitest'
import {createClient} from './createClient'
import {listClients} from './listClients'
import {updateClient} from './updateClient'
import type {ClientListItem} from '@/domain/client'
import type {CreateClientCommand} from '@/domain/clientCreate'

const client: ClientListItem = {
  id: 'client-1',
  name: 'Flowance Client',
  contactName: null,
  email: null,
  phone: null,
  postalCode: null,
  address: null,
  status: 'ACTIVE',
  notes: null,
  icon: {
    type: 'DEFAULT',
    status: 'READY',
    url: null,
    defaultText: 'FC',
    backgroundColor: '#E5F2FA',
    textColor: '#75A8C7',
  },
  version: 1,
  createdAt: '2026-07-01T00:00:00+09:00',
  updatedAt: '2026-07-01T00:00:00+09:00',
}

describe('client use cases', () => {
  it('delegates createClient commands to the command gateway unchanged', async () => {
    const command: CreateClientCommand = {
      name: 'Flowance Client',
      contactName: null,
      email: null,
      phone: null,
      postalCode: null,
      address: null,
      status: 'ACTIVE',
      notes: null,
    }
    const clientGateway = {createClient: vi.fn().mockResolvedValue(client)}

    await expect(createClient({clientGateway}, command)).resolves.toBe(client)
    expect(clientGateway.createClient).toHaveBeenCalledWith(command)
  })

  it('passes list filters and pagination to the query gateway', async () => {
    const query = {query: 'flow', page: 2, pageSize: 20, sort: '-updatedAt'} as const
    const result = {
      items: [client],
      pagination: {
        page: 2,
        pageSize: 20,
        totalItems: 1,
        totalPages: 1,
        hasNext: false,
        hasPrevious: true,
      },
    }
    const clientGateway = {listClients: vi.fn().mockResolvedValue(result)}

    await expect(listClients({clientGateway}, query)).resolves.toBe(result)
    expect(clientGateway.listClients).toHaveBeenCalledWith(query)
  })

  it('delegates updateClient commands to the update gateway', async () => {
    const command = {
      clientId: 'client-1',
      name: 'Updated Client',
      contactName: null,
      email: null,
      phone: null,
      postalCode: null,
      address: null,
      status: 'ACTIVE' as const,
      notes: null,
      version: 1,
      iconAction: 'KEEP' as const,
    }
    const clientGateway = {updateClient: vi.fn().mockResolvedValue(client)}

    await expect(updateClient({clientGateway}, command)).resolves.toBe(client)
    expect(clientGateway.updateClient).toHaveBeenCalledWith(command)
  })
})
