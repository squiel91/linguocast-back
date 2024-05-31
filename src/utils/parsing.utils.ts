import {
  BadRequestException,
  UnprocessableEntityException
} from '@nestjs/common'
import axios from 'axios'
import { parseFeed } from 'podcast-partytime'

export const parsePodcastRss = async (rssUrl: string) => {
  try {
    const { data: rssFeedXml } = await axios.get(rssUrl, {
      headers: { 'user-agent': 'linguocast-rss-parser' }
    })
    // TODO: delegate to another thread
    const podcastInfo = parseFeed(rssFeedXml)
    if (!podcastInfo) throw new UnprocessableEntityException()
    return podcastInfo
  } catch (error) {
    throw new BadRequestException('Cannot get/parse the RSS Feed.')
  }
}
