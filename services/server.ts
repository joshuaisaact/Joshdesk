import { serve } from 'bun'
import { App } from '@slack/bolt'

export const startServer = async (slackApp: App) => {
  // Start Slack app
  await slackApp.start(process.env.PORT || 3000)

  // Read the HTML template once at startup
  const template = await Bun.file('./public/index.html').text()

  // Start landing page server
  serve({
    port: process.env.WEB_PORT || 3001,
    fetch(req) {
      const url = new URL(req.url)

      // Only serve the landing page on '/'
      if (url.pathname !== '/') {
        return new Response('Not Found', { status: 404 })
      }

      // Replace template variables
      const html = template.replace(
        '{{SLACK_INSTALL_URL}}',
        process.env.SLACK_INSTALL_URL || '#',
      )

      return new Response(html, {
        headers: {
          'Content-Type': 'text/html',
          'Cache-Control': 'public, max-age=3600',
        },
      })
    },
  })
}
