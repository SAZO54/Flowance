import '@/presentation/features/projects/styles/project-detail-api.css'
import '@/presentation/features/contracts/styles/contract-management.css'
import '@/styles/shared/detail-field-hierarchy.css'
import '@/styles/shared/list-title-and-detail-overrides.css'
import '@/styles/shared/detail-hero-actions.css'
import '@/styles/shared/detail-hero-metrics.css'
import '@/presentation/features/projects/styles/project-detail-system-info.css'
import '@/styles/shared/detail-navigation-actions.css'
import {ProjectDetailComposition} from './ProjectDetailComposition'
import {AppShell} from '@/presentation/layout/AppShell'

export default async function ProjectDetailPage({params}: {
  params: Promise<{projectId: string}>
}) {
  const {projectId} = await params
  return <AppShell><ProjectDetailComposition projectId={projectId}/></AppShell>
}
