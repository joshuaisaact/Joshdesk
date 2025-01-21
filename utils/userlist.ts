import { SlackService } from '../services/slackClient'

export async function renderUserList(
  users: Array<{ userId: string }>,
  emptyMessage: string,
  teamId: string, // Add teamId parameter
): Promise<string> {
  const validUsers = []
  const slackService = SlackService.getInstance()

  for (const { userId } of users) {
    try {
      const userInfo = await slackService.getUserInfo(userId, teamId)
      if (userInfo?.ok && !userInfo.user?.deleted) {
        validUsers.push(normalizeUserId(userId))
      }
    } catch (error) {
      console.error(`Failed to fetch info for user ${userId}:`, error)
    }
  }

  return validUsers.length ? validUsers.join(' ') : `_${emptyMessage}_`
}

export function normalizeUserId(userId: string): string {
  if (!userId) return ''
  if (userId.startsWith('<@') && userId.endsWith('>')) return userId
  return `<@${userId}>`
}
