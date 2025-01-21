import type { AllMiddlewareArgs, SlackCommandMiddlewareArgs } from '@slack/bolt'
import { generateOfficeBlocks } from '../blocks/office'
import type { MonthSchedule } from '../types/schedule'

export const officeCommandHandler = async (
  { ack, say }: AllMiddlewareArgs & SlackCommandMiddlewareArgs,
  state: Map<string, MonthSchedule>,
  teamId: string,
) => {
  await ack()
  const schedule = state.get(teamId)

  if (!schedule) {
    await say("Sorry, I couldn't find the schedule for this workspace.")
    return
  }

  await say({
    blocks: await generateOfficeBlocks(schedule, 0, teamId),
    text: "Here's who's in the office this week",
  })
}
