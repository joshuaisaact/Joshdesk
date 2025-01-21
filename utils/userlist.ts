import { SlackService } from '../services/slackClient'

export function renderUserList(
  users: Array<{ userId: string }>,
  emptyMessage: string,
): string {
  console.log('renderUserList called with:', {
    users,
    emptyMessage,
  })

  const userMentions = users.map(({ userId }) => `${userId}`).join(' ')
  return userMentions || `_${emptyMessage}_`
}

export function normalizeUserId(userId: string): string {
  if (!userId) return ''
  if (userId.startsWith('<@') && userId.endsWith('>')) return userId
  return `${userId}`
}
