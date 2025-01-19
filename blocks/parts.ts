import type { Block, KnownBlock } from '@slack/types'
import type { DaySchedule } from '../types/schedule'
import { format, isBefore, isToday, startOfDay } from 'date-fns'
import { STATUS_OPTIONS, WEEK_LABELS } from '../constants'
import {
  getFormattedWeather,
  getWeatherEmoji,
  WEATHER_CODES,
  type WeatherData,
} from '../utils/weather'
import { getDailyQuote } from '../utils/quotes'
import { type WorkspaceSettings } from '../services/storage'

const DIVIDER_BLOCK: KnownBlock = { type: 'divider' }
const TINY_SPACER: KnownBlock = {
  type: 'context',
  elements: [{ type: 'mrkdwn', text: ' ' }],
}

interface CategoryGroup {
  emoji: string
  displayName: string
  users: Array<{ userId: string }>
  emptyMessage: string
}

function normalizeUserId(userId: string): string {
  if (!userId) return ''
  if (userId.startsWith('<@') && userId.endsWith('>')) return userId
  return `<@${userId}>`
}

function renderUserList(
  users: Array<{ userId: string }>,
  emptyMessage: string,
): string {
  return users.length
    ? users.map((a) => normalizeUserId(a.userId)).join(' ')
    : `_${emptyMessage}_`
}

function createStatusSelector(
  day: string,
  currentWeek: number,
  userStatus: string | undefined,
  categoryMap: Map<string, { emoji: string; displayName: string }>,
  enabledCategories: Array<{ id: string; emoji: string; displayName: string }>,
): KnownBlock {
  const statusOptions = enabledCategories.map((category) => ({
    text: {
      type: 'plain_text',
      text: `${category.emoji} ${category.displayName}`,
      emoji: true,
    },
    value: `status:${category.id}:${day}:${currentWeek}`,
  }))

  return {
    type: 'section',
    text: {
      type: 'mrkdwn',
      text: ' ',
    },
    accessory: {
      type: 'static_select',
      placeholder: {
        type: 'plain_text',
        text:
          userStatus && categoryMap.has(userStatus)
            ? `${categoryMap.get(userStatus)?.emoji} ${categoryMap.get(userStatus)?.displayName}`
            : '🔘 Set your status...',
        emoji: true,
      },
      options: statusOptions,
      initial_option:
        userStatus && categoryMap.has(userStatus)
          ? {
              text: {
                type: 'plain_text',
                text: `${categoryMap.get(userStatus)?.emoji} ${categoryMap.get(userStatus)?.displayName}`,
                emoji: true,
              },
              value: `status:${userStatus}:${day}:${currentWeek}`,
            }
          : undefined,
      action_id: `set_status_${day.toLowerCase()}_${currentWeek}`,
    },
  }
}

function createCategorySection({
  emoji,
  displayName,
  users,
  emptyMessage,
}: CategoryGroup): KnownBlock {
  return {
    type: 'section',
    text: {
      type: 'mrkdwn',
      text: `${emoji} ${displayName}\n\n${renderUserList(users, emptyMessage)}`,
    },
  }
}

export const createHeaderBlock = async (
  isHomeView: boolean,
  currentWeek: number,
  settings: WorkspaceSettings,
): Promise<(KnownBlock | Block)[]> => {
  const quoteBlocks = await getDailyQuote()

  return [
    {
      type: 'divider',
    },
    ...quoteBlocks,
    {
      type: 'divider',
    },

    // Header with office name and settings
    {
      type: 'header',
      text: {
        type: 'plain_text',
        text: settings.officeName,
        emoji: true,
      },
    },

    // Office address in context block for subtle appearance
    {
      type: 'section',
      text: {
        type: 'mrkdwn',
        text: `📍 _${settings.officeAddress}_`, // Making it italic to keep it subtle like before
      },
      accessory: {
        type: 'static_select',
        placeholder: {
          type: 'plain_text',
          text: 'Choose a week',
          emoji: true,
        },
        options: WEEK_LABELS.map((label, index) => ({
          text: {
            type: 'plain_text',
            text: label,
            emoji: true,
          },
          value: index.toString(),
        })),
        initial_option: {
          text: {
            type: 'plain_text',
            text: WEEK_LABELS[currentWeek],
            emoji: true,
          },
          value: currentWeek.toString(),
        },
        action_id: 'select_week',
      },
    },
  ]
}

export const createWeekSelectorBlock = (currentWeek: number): KnownBlock => ({
  type: 'section',
  text: {
    type: 'mrkdwn',
    text: ' ',
  },
  accessory: {
    type: 'static_select' as const,
    placeholder: {
      type: 'plain_text' as const,
      text: 'Select week',
      emoji: true,
    },
    options: WEEK_LABELS.map((label, index) => ({
      text: {
        type: 'plain_text' as const,
        text: label,
        emoji: true,
      },
      value: index.toString(),
    })),
    initial_option: {
      text: {
        type: 'plain_text' as const,
        text: WEEK_LABELS[currentWeek],
        emoji: true,
      },
      value: currentWeek.toString(),
    },
    action_id: 'select_week',
  },
})

export function createDayBlock(
  day: string,
  schedule: DaySchedule,
  isHomeView: boolean,
  currentWeek: number,
  userId: string,
  weather: WeatherData | null,
  settings: WorkspaceSettings,
): (KnownBlock | Block)[] | null {
  // Setup and validation
  const scheduleDate = new Date(
    schedule.year,
    schedule.month - 1,
    schedule.date,
  )
  if (!shouldShowDay(scheduleDate)) return null

  const isCurrentDay = isToday(scheduleDate)
  const formattedDate = format(scheduleDate, 'EEEE, do MMMM')
  const dayWeather = getFormattedWeather(weather, scheduleDate, isCurrentDay)

  const userStatus = schedule.attendees.find(
    (a) => normalizeUserId(a.userId) === normalizeUserId(userId),
  )?.status

  const enabledCategories = settings.categories.filter(
    (c) => c.isEnabled || c.id === 'office',
  )
  const categoryMap = new Map(enabledCategories.map((c) => [c.id, c]))

  // Group users by category
  const usersByCategory = enabledCategories.reduce(
    (acc, category) => ({
      ...acc,
      [category.id]: schedule.attendees.filter((a) => a.status === category.id),
    }),
    {} as Record<string, typeof schedule.attendees>,
  )

  // Build blocks
  const blocks: (KnownBlock | Block)[] = [
    // Header section
    {
      type: 'header',
      text: {
        type: 'plain_text',
        text: formattedDate,
        emoji: true,
      },
    },

    // Weather section (if available)
    ...(dayWeather
      ? [
          {
            type: 'context',
            elements: [
              {
                type: 'mrkdwn',
                text: `${dayWeather.emoji} ${dayWeather.temp} • ${dayWeather.description}${
                  dayWeather.feelsLike
                    ? ` • _Feels like ${dayWeather.feelsLike}°C_`
                    : ''
                }${
                  isCurrentDay
                    ? ` • ${dayWeather.humidity}% humidity • UV ${dayWeather.uvIndex} • <https://www.metoffice.gov.uk/weather/forecast/gcpvj0v07|Met Office Forecast>`
                    : ''
                }`,
              },
            ],
          },
        ]
      : []),

    DIVIDER_BLOCK,
  ]

  // Add categories with proper spacing
  enabledCategories.forEach((category, index) => {
    const categoryGroup: CategoryGroup = {
      emoji: category.emoji,
      displayName: category.displayName,
      users: usersByCategory[category.id] || [],
      emptyMessage: getEmptyMessage(category.id),
    }

    if (index === enabledCategories.length - 1 && isHomeView) {
      // For the last category, create a section with both category and status selector
      blocks.push({
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: `${category.emoji} ${category.displayName}\n\n${renderUserList(
            usersByCategory[category.id] || [],
            getEmptyMessage(category.id),
          )}`,
        },
        accessory: {
          type: 'static_select',
          placeholder: {
            type: 'plain_text',
            text:
              userStatus && categoryMap.has(userStatus)
                ? `${categoryMap.get(userStatus)?.emoji} ${categoryMap.get(userStatus)?.displayName}`
                : `🔘 Set ${format(scheduleDate, 'do MMM')} status...`,
            emoji: true,
          },
          options: enabledCategories.map((c) => ({
            text: {
              type: 'plain_text',
              text: `${c.emoji} ${c.displayName}`,
              emoji: true,
            },
            value: `status:${c.id}:${day}:${currentWeek}`,
          })),
          initial_option:
            userStatus && categoryMap.has(userStatus)
              ? {
                  text: {
                    type: 'plain_text',
                    text: `${categoryMap.get(userStatus)?.emoji} ${categoryMap.get(userStatus)?.displayName}`,
                    emoji: true,
                  },
                  value: `status:${userStatus}:${day}:${currentWeek}`,
                }
              : undefined,
          action_id: `set_status_${day.toLowerCase()}_${currentWeek}`,
        },
      })
    } else {
      // For all other categories, render normally
      blocks.push(createCategorySection(categoryGroup))
      if (index < enabledCategories.length - 1) {
        blocks.push(TINY_SPACER)
      }
    }
  })

  blocks.push(TINY_SPACER, DIVIDER_BLOCK, TINY_SPACER)

  return blocks
}

export const createFooterBlock = (
  isHomeView: boolean,
  isAdmin: boolean,
): (KnownBlock | Block)[] => {
  if (!isHomeView || !isAdmin) return []

  return [
    {
      type: 'divider',
    },
    {
      type: 'context',
      elements: [
        {
          type: 'mrkdwn',
          text: 'Admin Settings',
        },
      ],
    },
    {
      type: 'section',
      text: {
        type: 'mrkdwn',
        text: 'Configure workspace settings including office location, categories, and timezone.',
      },
      accessory: {
        type: 'button',
        text: {
          type: 'plain_text',
          text: '⚙️ Workspace Settings',
          emoji: true,
        },
        action_id: 'open_settings',
      },
    },
  ]
}

function getEmptyMessage(categoryId: string): string {
  const messages: Record<string, string> = {
    office: 'No one in the office',
    remote: 'No one working remotely',
    traveling: 'No one traveling',
    holiday: 'No one on holiday',
  }
  return messages[categoryId] || 'No one in this category'
}

function shouldShowDay(scheduleDate: Date): boolean {
  const today = startOfDay(new Date())
  const dayDate = startOfDay(scheduleDate)
  return !isBefore(dayDate, today)
}
