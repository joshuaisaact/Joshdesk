import type { Block, KnownBlock } from '@slack/types'
import type { DaySchedule } from '../types/schedule'
import { format } from 'date-fns'
import { WEEK_LABELS } from '../constants'

export const createHeaderBlock = (isHomeView: boolean): KnownBlock => ({
  type: 'header',
  text: {
    type: 'plain_text',
    text: isHomeView
      ? `📅 Office Schedule - ${format(new Date(), 'MMMM yyyy')}`
      : "Here's who's in the office",
    emoji: true,
  },
})

export const createWeekLabelBlock = (weekLabel: string): KnownBlock => ({
  type: 'section',
  text: {
    type: 'mrkdwn',
    text: `*${weekLabel}*`,
  },
})

export const createWeekSelectorBlock = (currentWeek: number): KnownBlock => ({
  type: 'actions',
  elements: [
    {
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
  ],
})

export const createDayBlock = (
  day: string,
  schedule: DaySchedule,
  isHomeView: boolean,
  currentWeek: number,
): (KnownBlock | Block)[] => {
  const dayMap = {
    Monday: 0,
    Tuesday: 1,
    Wednesday: 2,
    Thursday: 3,
    Friday: 4,
  } as const

  const targetDate = new Date()

  targetDate.setDate(schedule.date)

  if (schedule.month) {
    targetDate.setMonth(schedule.month - 1)
  }

  if (schedule.year) {
    targetDate.setFullYear(schedule.year)
  }

  const formattedDate = format(
    targetDate,
    `${isHomeView ? 'E' : 'EEEE'} do MMMM`,
  )

  const dayText = `*${formattedDate}*\n\n${
    schedule.attendees.length ? schedule.attendees.join(' ') : 'No one yet!'
  }\n`

  if (!isHomeView) {
    return [
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: dayText,
        },
      },
      {
        type: 'divider',
      },
    ]
  }

  return [
    {
      type: 'section',
      text: {
        type: 'mrkdwn',
        text: ' ',
      },
    },
    {
      type: 'section',
      text: {
        type: 'mrkdwn',
        text: dayText,
      },
      accessory: {
        type: 'button',
        text: {
          type: 'plain_text',
          text: '🏢 Office',
          emoji: true,
        },
        style: 'primary',
        action_id: `office_${day.toLowerCase()}_${currentWeek}`,
        value: `${day.toLowerCase()}_${currentWeek}`,
      },
    },
    {
      type: 'section',
      text: {
        type: 'mrkdwn',
        text: ' ',
      },
      accessory: {
        type: 'button',
        text: {
          type: 'plain_text',
          text: '🏠 Home',
          emoji: true,
        },
        action_id: `home_${day.toLowerCase()}_${currentWeek}`,
        value: `${day.toLowerCase()}_${currentWeek}`,
      },
    },
    {
      type: 'section',
      text: {
        type: 'mrkdwn',
        text: ' ',
      },
    },
    {
      type: 'divider',
    },
  ]
}
