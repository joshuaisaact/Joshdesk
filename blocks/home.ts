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
  const blocks: (KnownBlock | Block)[] = [createHeaderBlock(isHomeView)]

  if (isHomeView) {
    blocks.push(createWeekLabelBlock(WEEK_LABELS[currentWeek]))
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

  // Add schedule content
  Object.entries(weekSchedule).forEach(([day, schedule]) => {
    blocks.push(...createDayBlock(day, schedule, isHomeView, currentWeek))
  })

  // Add week selector at the bottom
  if (isHomeView) {
    blocks.push(
      {
        type: 'divider',
      },
      createWeekSelectorBlock(currentWeek),
    )
  }

  return blocks
}
