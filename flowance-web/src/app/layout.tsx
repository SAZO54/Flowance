import type {Metadata} from 'next'
import type {ReactNode} from 'react'
import '../styles.css'
import '../api-list-pages.css'
import '../api-form-pages.css'
import '../client-detail-api.css'
import '../shell-alignment.css'
import '../select-options.css'
import '../date-time-picker.css'
import '../date-picker-extensions.css'
import '../entity-default-icons.css'
import '../picker-control-overrides.css'
import '../list-card-emphasis.css'

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
