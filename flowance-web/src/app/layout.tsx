import type {Metadata} from 'next'
import type {ReactNode} from 'react'
import '../styles/globals.css'
import '../styles/shared/api-list-pages.css'
import '../styles/shared/api-form-pages.css'
import '../styles/shared/shell-alignment.css'
import '../styles/shared/select-options.css'
import '../styles/shared/date-time-picker.css'
import '../styles/shared/date-picker-extensions.css'
import '../styles/shared/entity-default-icons.css'
import '../styles/shared/picker-control-overrides.css'
import '../styles/shared/list-card-emphasis.css'
import '../styles/shared/content-typography.css'

export const metadata: Metadata = {
  title: 'Flowance',
  description: 'フリーランスの仕事とお金を一元管理',
}

export default function RootLayout({children}: Readonly<{children: ReactNode}>) {
  return (
    <html lang="ja">
      <body>{children}</body>
    </html>
  )
}
