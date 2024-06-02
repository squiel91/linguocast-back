import { Generated, ColumnType, Selectable, Insertable } from 'kysely'

interface LanguagesTable {
  id: Generated<number>
  name: string
  createdAt: ColumnType<string, string | undefined, never>
}

interface UsersTable {
  id: Generated<number>
  email: string
  name: string
  password: string
  createdAt: ColumnType<string, string | undefined, never>
  updatedAt: ColumnType<string, string | undefined, never>
}

interface PodcastsTable {
  id: Generated<number>
  name: string
  description: string
  coverImage: string | null
  rss: string | null 
  links: string | null
  levels: string
  targetLanguageId: number
  mediumLanguageId: number | null
  episodeCount: number | null
  isActive: number | null
  since: string | null
  hasVideo: number | null
  avarageEpisodeMinutesDuration: number | null
  hasTranscript: number | null
  isTranscriptFree: number | null
  uploadedByUserId: number
  lastModified?: string // for rss refresh catching
  eTag?: string // for rss refresh catching
  createdAt: ColumnType<string, string | undefined, never>
  updatedAt: ColumnType<string, string | undefined, never>
}

interface SavedPodcasts {
  userId: number
  podcastId: number
  createdAt: ColumnType<string, string | undefined, never>
}

interface CommentsTable {
  id: Generated<number>
  podcastId: number
  userId: number
  comment: string
  createdAt: ColumnType<string, string | undefined, never>
  updatedAt: ColumnType<string, string | undefined, never>
}

interface EpisodesTable {
  id: Generated<number>
  sourceId: string
  podcastId: number
  title: string
  image?: string
  duration: number
  description?: string
  contentUrl: string
  publishedAt: string
  createdAt: ColumnType<string, string | undefined, never>
  updatedAt: ColumnType<string, string | undefined, never>
}

interface ReproductionsTable {
  episodeId: number
  userId: number
  leftOn: number
  completedAt: string
  updatedAt: ColumnType<string, string | undefined, never>
}

export interface Database {
  languages: LanguagesTable
  users: UsersTable
  podcasts: PodcastsTable
  savedPodcasts: SavedPodcast
  episodes: EpisodesTable
  comments: CommentsTable
  reproductions: ReproductionsTable
}

export type Language = Selectable<LanguagesTable>
export type NewLanguage = Insertable<LanguagesTable>

export type User = Selectable<UsersTable>
export type NewUser = Insertable<UsersTable>

export type Podcast = Selectable<PodcastsTable>
export type NewPodcast = Insertable<PodcastsTable>

export type SavedPodcast = Selectable<SavedPodcasts>
export type NewSavedPodcast = Insertable<SavedPodcasts>

export type Comment = Selectable<CommentsTable>
export type NewComment = Insertable<CommentsTable>

export type Episode = Selectable<EpisodesTable>
export type NewEpisode = Insertable<EpisodesTable>

export type Reproduction = Selectable<ReproductionsTable>
export type NewReproduction = Insertable<ReproductionsTable>
