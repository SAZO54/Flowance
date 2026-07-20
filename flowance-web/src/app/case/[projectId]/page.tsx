import '@/project-detail-api.css'
import '@/contract-management.css'
import '@/detail-field-hierarchy.css'
import '@/list-title-and-detail-overrides.css'
import '@/detail-hero-actions.css'
import '@/detail-hero-metrics.css'
import '@/project-detail-system-info.css'
import '@/detail-navigation-actions.css'
import {ProjectDetailComposition} from './ProjectDetailComposition'
import {AppShell} from '@/presentation/layout/AppShell'

export default async function ProjectDetailPage({params}: {
  params: Promise<{projectId: string}>
}) {
  const {projectId} = await params
  return <AppShell><ProjectDetailComposition projectId={projectId}/></AppShell>
}
