import {
  BadRequestException,
  HttpStatus,
  UnprocessableEntityException
} from '@nestjs/common'
import axios, { isAxiosError } from 'axios'
import { parseFeed } from 'podcast-partytime'

interface Options {
  lastModified?: string | null
  eTag?: string | null
}

export const parsePodcastRss = async (
  rssUrl: string,
  options: Options = {}
) => {
  try {
    const lastModified = options.lastModified || null
    const eTag = options.eTag || null

    const { headers, data: rssFeedXml } = await axios.get(rssUrl, {
      headers: {
        'user-agent': 'linguocast-rss-parser',
        ...(lastModified ? { 'If-Modified-Since': lastModified } : {}),
        ...(eTag ? { 'If-None-Match': eTag } : {})
      }
    })

    console.log(`Synking RSS Feed: ${rssUrl}`)
    const rawETag: string | null = headers['etag'] ?? null

    // TODO: delegate to another thread
    const podcastInfo = parseFeed(rssFeedXml)
    if (!podcastInfo) throw new UnprocessableEntityException()
    return {
      podcast: podcastInfo,
      lastModified: headers['last-modified'] as string | null,
      eTag: rawETag?.startsWith('W/') ? rawETag.slice(2) : rawETag,
      isUpToDate: false
    } as const
  } catch (error) {
    if (
      isAxiosError(error) &&
      error.response.status === HttpStatus.NOT_MODIFIED
    ) {
      console.log(
        `No need to sync RSS Feed because already up to date ${rssUrl}`
      )
      return { isUpToDate: true } as const
    }
    throw new BadRequestException(
      `Failed to get/parse RSS Feed for podcast ${rssUrl}`
    )
  }
}
