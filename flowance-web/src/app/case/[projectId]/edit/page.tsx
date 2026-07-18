import '@/project-detail-api.css'
import {ProjectEditComposition} from './ProjectEditComposition'
import {AppShell} from '@/presentation/layout/AppShell'

export default async function ProjectEditPage({params}: {
  params: Promise<{projectId: string}>
}) {
  const {projectId} = await params
  return <AppShell><ProjectEditComposition projectId={projectId}/></AppShell>
}
