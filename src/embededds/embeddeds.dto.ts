interface BaseEmbedded {
  id?: number // if present, it means to update the resource
  start: number // seconds
  duration: number
}

export interface NoteEmbedded extends BaseEmbedded {
  type: 'note'
  content: string
}

export interface LinkEmbedded extends BaseEmbedded {
  type: 'link'
  url: string
}

export interface EpisodeEmbedded extends BaseEmbedded {
  type: 'episode'
  episodeId: number
}

export interface ImageEmbedded extends BaseEmbedded {
  type: 'image'
  image: string | File
}

export type Embedded =
  | NoteEmbedded
  | LinkEmbedded
  | EpisodeEmbedded
  | ImageEmbedded
