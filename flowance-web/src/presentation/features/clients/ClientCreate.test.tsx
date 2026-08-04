// @vitest-environment jsdom

import {render, screen} from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import {describe, expect, it, vi} from 'vitest'
import {ClientCreate} from './ClientCreate'

describe('ClientCreate', () => {
  it('submits a trimmed create command', async () => {
    const user = userEvent.setup()
    const onCreate = vi.fn()

    render(
      <ClientCreate
        isSubmitting={false}
        error={null}
        onCancel={vi.fn()}
        onCreate={onCreate}
      />,
    )

    await user.type(screen.getByLabelText(/会社名/), '  Flowance Client  ')
    await user.type(screen.getByLabelText(/担当者名/), '  Owner  ')
    await user.type(screen.getByLabelText(/メールアドレス/), 'owner@example.com')
    await user.click(screen.getByRole('button', {name: 'クライアントを追加'}))

    expect(onCreate).toHaveBeenCalledWith({
      name: 'Flowance Client',
      contactName: 'Owner',
      email: 'owner@example.com',
      phone: null,
      postalCode: null,
      address: null,
      status: 'ACTIVE',
      notes: null,
      iconFile: undefined,
    })
  })

  it('disables submission while the create request is in progress', () => {
    render(
      <ClientCreate
        isSubmitting
        error={null}
        onCancel={vi.fn()}
        onCreate={vi.fn()}
      />,
    )

    expect(screen.getByRole('button', {name: '登録中…'})).toBeDisabled()
  })
})
