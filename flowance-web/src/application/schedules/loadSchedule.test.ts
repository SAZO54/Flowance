import {describe, expect, it, vi} from 'vitest'
import {loadSchedule} from './loadSchedule'

describe('loadSchedule', () => {
  it('loads projects and calendar events with the calculated range', async () => {
    const projects = [
      {
        id: 'project-1',
        name: 'Schedule Project',
        labelColor: '#75A8C7',
        status: 'ACTIVE',
        client: {id: 'client-1', name: 'Client'},
      },
    ]
    const events = [
      {
        id: 'event-1',
        type: 'SCHEDULE' as const,
        projectId: 'project-1',
        userId: 'user-1',
        title: '設計作業',
        startAt: '2026-07-22T00:00:00+09:00',
        endAt: '2026-07-22T01:00:00+09:00',
        status: 'PLANNED',
        version: 1,
      },
    ]
    const projectGateway = {listScheduleProjects: vi.fn().mockResolvedValue(projects)}
    const scheduleGateway = {listCalendarEvents: vi.fn().mockResolvedValue(events)}

    await expect(
      loadSchedule(
        {projectGateway, scheduleGateway},
        {
          anchorDate: '2026-07-22',
          period: 'week',
          filterProjectId: 'project-1',
          utcOffset: '+09:00',
        },
      ),
    ).resolves.toEqual({events, projects})
    expect(scheduleGateway.listCalendarEvents).toHaveBeenCalledWith({
      from: '2026-07-19T15:00:00.000Z',
      to: '2026-07-26T15:00:00.000Z',
      mode: 'both',
      projectIds: ['project-1'],
    })
  })

  it('omits projectIds when the all filter is selected', async () => {
    const projectGateway = {listScheduleProjects: vi.fn().mockResolvedValue([])}
    const scheduleGateway = {listCalendarEvents: vi.fn().mockResolvedValue([])}

    await loadSchedule(
      {projectGateway, scheduleGateway},
      {
        anchorDate: '2026-07-22',
        period: 'week',
        filterProjectId: 'all',
      },
    )

    expect(scheduleGateway.listCalendarEvents).toHaveBeenCalledWith(
      expect.not.objectContaining({projectIds: expect.anything()}),
    )
  })
})
