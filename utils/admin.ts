import { SlackService } from '../services/slackClient'
import { tryCatch } from './error-handlers'

export const checkIfAdmin = async (userId: string, teamId: string) =>
  (await tryCatch(async () => {
    const slackService = SlackService.getInstance()
    return await slackService.checkIfAdmin(userId, teamId)
  }, 'Failed to check admin status')) ?? false
