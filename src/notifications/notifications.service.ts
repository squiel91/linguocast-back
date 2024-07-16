import { Injectable, OnModuleInit } from '@nestjs/common'
import { Client, GatewayIntentBits, TextChannel } from 'discord.js'

export enum NotificationChannels {
  SUGGESTED_PODCAST,
  CREATED_PODCAST,
  NEW_COMMENT
}

@Injectable()
export class NotificationsService implements OnModuleInit {
  private client: Client
  private readonly token = process.env.NOTIFICATIONS_DISCORD_BOT_TOKEN

  constructor() {
    // this.client = new Client({
    //   intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages]
    // })
  }

  async onModuleInit() {
    // await this.client.login(this.token)
  }

  async sendNotification(
    notificationChannel: NotificationChannels,
    message: string
  ) {
    let channelId = null
    switch (notificationChannel) {
      case NotificationChannels.NEW_COMMENT:
        channelId = process.env.NEW_COMMENT_NOTIFICATIONS_DISCORD_CHANNEL_ID
        break
      case NotificationChannels.CREATED_PODCAST:
        channelId = process.env.CREATED_PODCAST_NOTIFICATIONS_DISCORD_CHANNEL_ID
        break
      case NotificationChannels.SUGGESTED_PODCAST:
        channelId =
          process.env.SUGGESTED_PODCAST_NOTIFICATIONS_DISCORD_CHANNEL_ID
    }
    const channel = (await this.client.channels.fetch(channelId)) as TextChannel
    await channel.send(message)
  }
}
