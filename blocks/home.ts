import type { Block, KnownBlock } from '@slack/types'
import type { MonthSchedule } from '../types/schedule'
import {
  createHeaderBlock,
  createWeekLabelBlock,
  createDayBlock,
  createWeekSelectorBlock,
} from './parts'
import { WEEK_LABELS } from '../constants'

export const generateBlocks = (
  monthSchedule: MonthSchedule,
  isHomeView: boolean,
  currentWeek: number = 0,
): (KnownBlock | Block)[] => {
  const blocks: (KnownBlock | Block)[] = [
    // Header
    createHeaderBlock(isHomeView),
    { type: 'divider' },
  ]

  // Week selector (only in home view)
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

  // Schedule content
  Object.entries(weekSchedule).forEach(([day, schedule]) => {
    blocks.push(...createDayBlock(day, schedule, isHomeView, currentWeek))
  })

  // Help text at bottom (only in home view)
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
