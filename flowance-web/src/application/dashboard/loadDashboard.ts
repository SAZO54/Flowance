import type {CurrentAuthContext} from '@/domain/auth'
import type {DashboardData, DashboardRange} from '@/domain/dashboard'
import type {ProjectListQuery, ProjectListResult} from '@/domain/project'
import type {CalendarEvent} from '@/domain/schedule'
import type {WorkRecordListQuery, WorkRecordListResult} from '@/domain/workRecord'

export type DashboardDependencies = {
  authGateway: {getCurrentUser(): Promise<CurrentAuthContext>}
  projectGateway: {listProjects(query: ProjectListQuery): Promise<ProjectListResult>}
  scheduleGateway: {listCalendarEvents(query: {from: string; to: string; mode: 'planned'}): Promise<CalendarEvent[]>}
  workRecordGateway: {listWorkRecords(query: WorkRecordListQuery): Promise<WorkRecordListResult>}
}

export async function loadDashboard(
  dependencies: DashboardDependencies,
  range: DashboardRange,
): Promise<DashboardData> {
  const workRecordQuery: WorkRecordListQuery = {
    from: range.monthFrom,
    to: range.monthTo,
    page: 1,
    pageSize: 100,
  }
  const [auth, projectResult, todaySchedules, firstWorkRecordPage] = await Promise.all([
    dependencies.authGateway.getCurrentUser(),
    dependencies.projectGateway.listProjects({
      status: 'ACTIVE',
      page: 1,
      pageSize: 100,
      sort: '-updatedAt',
    }),
    dependencies.scheduleGateway.listCalendarEvents({
      from: range.todayFrom,
      to: range.todayTo,
      mode: 'planned',
    }),
    dependencies.workRecordGateway.listWorkRecords(workRecordQuery),
  ])

  const remainingPages = await Promise.all(
    Array.from(
      {length: Math.max(0, firstWorkRecordPage.pagination.totalPages - 1)},
      (_, index) => dependencies.workRecordGateway.listWorkRecords({
        ...workRecordQuery,
        page: index + 2,
      }),
    ),
  )
  const monthWorkRecords = [
    ...firstWorkRecordPage.items,
    ...remainingPages.flatMap(result => result.items),
  ].filter(record => record.userId === auth.user.id)

  return {
    auth,
    projects: projectResult.items,
    activeProjectTotal: projectResult.pagination.totalItems,
    todaySchedules: todaySchedules.filter(event => event.userId === auth.user.id),
    monthWorkRecords,
    monthWorkRecordTotal: monthWorkRecords.length,
  }
}
