import '@/project-detail-api.css'
import {ProjectDetailComposition} from './ProjectDetailComposition'
import {AppShell} from '@/presentation/layout/AppShell'

export default async function ProjectDetailPage({params}: {
  params: Promise<{projectId: string}>
}) {
  const {projectId} = await params
  return <AppShell><ProjectDetailComposition projectId={projectId}/></AppShell>
}
