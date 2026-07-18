import { Suspense } from 'react'
import { ClientComposition } from './ClientComposition'
import { AppShell } from '@/presentation/layout/AppShell'

export default function ClientPage() {
  return <AppShell>
    <Suspense fallback={null}><ClientComposition/></Suspense>
  </AppShell>
}
