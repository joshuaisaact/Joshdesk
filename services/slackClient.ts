import { App } from '@slack/bolt'
import { fetchInstallation } from './installation'
import { WebClient } from '@slack/web-api'

export class SlackService {
  private static instance: SlackService
  private app: App

  private constructor(app: App) {
    this.app = app
  }

  public static initialize(app: App): void {
    if (!SlackService.instance) {
      console.log('Creating new SlackService instance')
      SlackService.instance = new SlackService(app)
    }
  }

  public static getInstance(): SlackService {
    if (!SlackService.instance) {
      throw new Error(
        'SlackService must be initialized with an App instance first',
      )
    }
    return SlackService.instance
  }

  async getUserInfo(userId: string, teamId: string) {
    try {
      const installation = await fetchInstallation({
        teamId,
        isEnterpriseInstall: false,
        enterpriseId: undefined,
      })

      if (!installation?.bot?.token) {
        throw new Error(`No token found for team ${teamId}`)
      }

      return await this.app.client.users.info({
        token: installation.bot.token,
        user: userId.replace(/[<@>]/g, ''), // Clean the user ID
      })
    } catch (error) {
      console.error(
        `Failed to fetch info for user ${userId} in team ${teamId}:`,
        error,
      )
      return null
    }
  }
}
