import type { Metadata } from 'next'
import type { ReactNode } from 'react'
import '../styles.css'

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
