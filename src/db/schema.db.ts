import { Generated, ColumnType, Selectable, Insertable } from 'kysely'

interface LanguagesTable {
  id: Generated<number>
  name: string
  createdAt: ColumnType<string, string | undefined, never>
}

interface UsersTable {
  id: Generated<number>
  avatar: string
  email: string
  name: string
  isProfilePrivate: number
  canOthersContact: number
  learningLanguageId: number
  languageVariant?: string
  level?: string
  isPremium: number
  isAdmin: number
  password: string
  createdAt: ColumnType<string, string | undefined, never>
  updatedAt: ColumnType<string, string | undefined, never>
}

interface PodcastsTable {
  id: Generated<number>
  name: string
  description: string
  coverImage?: string
  rss?: string
  links?: string
  levels: string
  targetLanguageId: number
  mediumLanguageId?: number
  episodeCount?: number
  isActive?: number
  since?: string
  hasVideo?: number
  avarageEpisodeMinutesDuration?: number
  hasTranscript?: number
  isTranscriptFree?: number
  uploadedByUserId: number
  lastModified?: string // for rss refresh catching
  eTag?: string // for rss refresh catching
  createdAt: ColumnType<string, string | undefined, never>
  updatedAt: ColumnType<string, string | undefined, never>
}

interface SavedPodcastsTable {
  userId: number
  podcastId: number
  createdAt: ColumnType<string, string | undefined, never>
}

interface CommentsTable {
  id: Generated<number>
  userId: number
  resourceType: string
  resourceId: number
  content: string
  responseTo?: number
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
  transcript?: string
  contentUrl: string
  publishedAt: string
  createdAt: ColumnType<string, string | undefined, never>
  updatedAt: ColumnType<string, string | undefined, never>
}

interface ExercisesTable {
  id: Generated<number>
  episodeId: number
  content: string
  start?: number
  duration?: number
  createdAt: ColumnType<Date, string | undefined, never>
  updatedAt: ColumnType<Date, string | undefined, never>
}

interface EmbeddedsTable {
  id: Generated<number>
  episodeId: number
  type: 'image' | 'note' | 'link' | 'episode'
  content: string // JSON
  start: number
  duration: number
  createdAt: ColumnType<Date, string | undefined, never>
}

interface DictionaryTable {
  id: Generated<number>
  languageId: number
  image?: string
  word: string
  pronunciation?: string
  definitions: string
}

interface UserWordsTable {
  userId: number
  wordId: number
  reviewScheduledFor: number
  lastReviewInterval: number
  createdAt: string
}

interface DailyActivityTable {
  userId: number
  wordsAddedCount: number
  wordsReviewedCount: number
  day: number
}

interface MeasureWordsTable {
  wordId: number
  measureWordId: number
  createdAt: ColumnType<string, string | undefined, never>
}

interface ReproductionsTable {
  episodeId: number
  userId: number
  leftOn: number
  completedAt: string
  updatedAt: ColumnType<string, string | undefined, never>
}

interface EpisodePipelineTable { // deprecated
  id: Generated<number>
  episodeId: number
  stage: string
  result: string
  createdAt: ColumnType<string, string | undefined, never>
}

interface TranscripCacheTable {
  audioUrl: string
  result: string
  createdAt: ColumnType<string, string | undefined, never>
}

export interface Database {
  languages: LanguagesTable
  users: UsersTable
  podcasts: PodcastsTable
  savedPodcasts: SavedPodcastsTable
  episodes: EpisodesTable
  exercises: ExercisesTable
  embeddeds: EmbeddedsTable
  dictionary: DictionaryTable
  userWords: UserWordsTable
  dailyActivity: DailyActivityTable
  measureWords: MeasureWordsTable
  comments: CommentsTable
  reproductions: ReproductionsTable
  transcriptCache: TranscripCacheTable
  episodePipeline: EpisodePipelineTable
}

export type Language = Selectable<LanguagesTable>
export type NewLanguage = Insertable<LanguagesTable>

export type User = Selectable<UsersTable>
export type NewUser = Insertable<UsersTable>

export type Podcast = Selectable<PodcastsTable>
export type NewPodcast = Insertable<PodcastsTable>

export type SavedPodcast = Selectable<SavedPodcastsTable>
export type NewSavedPodcast = Insertable<SavedPodcastsTable>

export type Comment = Selectable<CommentsTable>
export type NewComment = Insertable<CommentsTable>

export type Episode = Selectable<EpisodesTable>
export type NewEpisode = Insertable<EpisodesTable>

export type Exercises = Selectable<ExercisesTable>
export type NewExercise = Insertable<ExercisesTable>

export type Reproduction = Selectable<ReproductionsTable>
export type NewReproduction = Insertable<ReproductionsTable>
