import { logger } from './utils/logger'
import { App, type BlockAction } from '@slack/bolt'
import { createMonthSchedule } from './services/schedule'
import { loadSchedule, saveSchedule } from './services/storage'
import { appHomeOpenedHandler } from './events/app-home'
import { officeCommandHandler } from './commands/office'
import { homeButtonHandler, officeButtonHandler } from './interactions/buttons'
import { generateBlocks } from './blocks/home'
import type { HomeView, SelectWeekAction } from './types/slack'
import { setupWeeklyReset } from './utils/schedule-reset'

// State
let officeSchedule = createMonthSchedule()

let currentWeek = 0

const initializeSchedule = async () => {
  const stored = await loadSchedule()
  if (stored) {
    // Check if we need to migrate the data
    const needsMigration = Object.values(stored[0]).some(
      (daySchedule) => !('month' in daySchedule),
    )

    if (needsMigration) {
      logger.info('Starting schedule migration to add month/year')
      const migratedSchedule = createMonthSchedule()

      // Copy over the attendees from the old schedule
      Object.keys(stored).forEach((weekKey) => {
        const weekIndex = parseInt(weekKey)
        Object.keys(stored[weekIndex]).forEach((day) => {
          if (migratedSchedule[weekIndex] && migratedSchedule[weekIndex][day]) {
            migratedSchedule[weekIndex][day].attendees =
              stored[weekIndex][day].attendees
          }
        })
      })

      officeSchedule = migratedSchedule
      await saveSchedule(migratedSchedule)
      logger.info({
        msg: 'Migration complete',
        firstWeekDates: Object.entries(migratedSchedule[0]).map(
          ([day, schedule]) =>
            `${day}: ${schedule.date}/${schedule.month}/${schedule.year}`,
        ),
      })
    } else {
      logger.info({
        msg: 'Loading existing schedule',
        firstWeekDates: Object.entries(stored[0]).map(
          ([day, schedule]) =>
            `${day}: ${schedule.date}/${schedule.month}/${schedule.year}`,
        ),
      })
      officeSchedule = stored
    }
  } else {
    logger.info('No stored schedule found, creating new schedule')
    officeSchedule = createMonthSchedule()
  }
}

// App initialization
const app = new App({
  token: Bun.env.SLACK_BOT_TOKEN,
  signingSecret: Bun.env.SLACK_SIGNING_SECRET,
  socketMode: true,
  appToken: Bun.env.SLACK_APP_TOKEN,
})

// Event handlers
app.event('app_home_opened', async (args) => {
  await appHomeOpenedHandler(args, officeSchedule, currentWeek)
})

// Command handlers
app.command('/office', async (args) => {
  await officeCommandHandler(args, officeSchedule)
})

// Interactive component handlers
app.action<BlockAction>(/office_.*/, async (args) => {
  const updatedSchedule = await officeButtonHandler(args, officeSchedule)
  if (updatedSchedule) {
    officeSchedule = updatedSchedule
    await saveSchedule(officeSchedule)
  }
})

app.action<BlockAction>(/home_.*/, async (args) => {
  const updatedSchedule = await homeButtonHandler(args, officeSchedule)
  if (updatedSchedule) {
    officeSchedule = updatedSchedule
    await saveSchedule(officeSchedule)
  }
})

app.action<SelectWeekAction>('select_week', async ({ ack, body, client }) => {
  await ack()
  const selectedWeek = parseInt(body.actions[0].selected_option.value)
  currentWeek = selectedWeek

  await client.views.publish({
    user_id: body.user.id,
    view: {
      type: 'home',
      blocks: generateBlocks(officeSchedule, true, selectedWeek),
    } as HomeView,
  })
})

// Startup
const start = async () => {
  try {
    logger.info('Starting app initialization...')
    await initializeSchedule()
    logger.info('Schedule initialized successfully')

    setupWeeklyReset((newSchedule) => {
      logger.info({
        msg: 'Weekly reset triggered',
        firstWeekDates: Object.entries(newSchedule[0]).map(
          ([day, schedule]) =>
            `${day}: ${schedule.date}/${schedule.month}/${schedule.year}`,
        ),
      })
      officeSchedule = newSchedule
      currentWeek = 0
    }, Bun.env.SCHEDULE_TEST_MODE === 'true')

    await app.start(process.env.PORT || 3000)
    logger.info('⚡️ Joshicely app is running!')
  } catch (error) {
    logger.error({ err: error, msg: 'Failed to start app' })
    process.exit(1)
  }
}

start().catch((error) => {
  logger.error({ err: error, msg: 'Unhandled error during startup' })
  process.exit(1)
})
