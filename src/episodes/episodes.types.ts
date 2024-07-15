export interface IUpdateEpisode {
  title?: string
  audio?: string
  image?: string | null
  description?: string
  transcript?: string | null
  isListed?: boolean
  isPremium?: boolean
  isDeleted?: boolean
}
