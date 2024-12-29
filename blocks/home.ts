import type { Block, KnownBlock } from '@slack/types'
import type { MonthSchedule } from '../types/schedule'
import {
  createHeaderBlock,
  createDayBlock,
  createWeekSelectorBlock,
} from './parts'

export const generateBlocks = (
  monthSchedule: MonthSchedule,
  isHomeView: boolean,
  currentWeek: number = 0,
): (KnownBlock | Block)[] => {
  const blocks: (KnownBlock | Block)[] = [
    createHeaderBlock(isHomeView),
    { type: 'divider' },
  ]

  if (isHomeView) {
    blocks.push(createWeekSelectorBlock(currentWeek), { type: 'divider' })
  }

  const weekSchedule = monthSchedule[currentWeek]

  if (!weekSchedule) {
    blocks.push({
      type: 'section',
      text: {
        type: 'mrkdwn',
        text: 'No schedule available for this week',
      },
    })
    return blocks
  }

  Object.entries(weekSchedule).forEach(([day, schedule]) => {
    blocks.push(...createDayBlock(day, schedule, isHomeView, currentWeek))
  })

  if (isHomeView) {
    blocks.push({
      type: 'context',
      elements: [
        {
          type: 'mrkdwn',
          text: 'Use 🏢 Office or 🏠 Home to update your status • View current schedule with `/office`',
        },
      ],
    })
  }

  return blocks
}
