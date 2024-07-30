import { Injectable } from '@nestjs/common'
import { SitemapStream, streamToPromise } from 'sitemap'
import { Response } from 'express'
import { db } from './db/connection.db'
import { urlSafe } from './utils/url.utils'

@Injectable()
export class AppService {
  async getSitemap(res: Response) {
    res.set('Content-Type', 'text/xml')
    const smStream = new SitemapStream({
      hostname: 'https://linguocast.com'
    })

    const podcasts = await db
      .selectFrom('podcasts')
      .select(['id', 'name', 'updatedAt'])
      .execute()

    podcasts.forEach(({ id, name, updatedAt }) => {
      smStream.write({
        url: `/podcasts/${id}/${urlSafe(name)}`,
        changefreq: 'monthly',
        priority: 0.7,
        lastmod: updatedAt
      })
    })

    const episodes = await db
      .selectFrom('episodes')
      .select(['id', 'title', 'updatedAt'])
      .execute()

    episodes.forEach(({ id, title, updatedAt }) => {
      smStream.write({
        url: `/episodes/${id}/${urlSafe(title)}`,
        changefreq: 'monthly',
        priority: 0.7, // TODO: base it on the relative show popularity
        lastmod: updatedAt
      })
    })

    const statics = [
      { handle: 'creators', lastmod: '2024-08-01', priority: 1 },
      { handle: 'premium', lastmod: '2024-08-01', priority: 0.3 },
      { handle: 'terms', lastmod: '2024-08-01', priority: 0.3 },
      { handle: 'explore', lastmod: '2024-08-01', priority: 0.3 }
    ]

    statics.forEach(({ handle, lastmod, priority }) => {
      smStream.write({
        url: '/' + handle,
        changefreq: 'monthly',
        lastmod,
        priority
      })
    })

    smStream.end()
    streamToPromise(smStream)
      .then(xml => {
        res.send(xml)
      })
      .catch(error => {
        console.error(error)
        res.status(500).end()
      })
  }
}
