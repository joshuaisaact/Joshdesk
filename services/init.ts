import { tryCatch } from '../utils/error-handlers'
import { getAllWorkspaceIds, loadSchedule } from './storage'
import { logger } from '../utils/logger'

export const initializeDB = () =>
  tryCatch(async () => {
    const workspaceIds = await getAllWorkspaceIds()
    const schedules = new Map()

    if (!workspaceIds) {
      logger.warn('No workspace IDs found during initialization')
      return schedules
    }

    for (const teamId of workspaceIds) {
      const schedule = await loadSchedule(teamId)
      if (schedule) {
        schedules.set(teamId, schedule)
      }
    }

    logger.info(
      `Initialized database with ${schedules.size} workspace schedules`,
    )
    return schedules
  }, 'Error initializing database')
