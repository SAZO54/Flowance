import '@/list-title-and-detail-overrides.css'
import {Suspense} from 'react'
import {CaseComposition} from './CaseComposition'
import {AppShell} from '@/presentation/layout/AppShell'

export default function CasePage() {
  return <AppShell>
    <Suspense fallback={null}><CaseComposition/></Suspense>
  </AppShell>
}
