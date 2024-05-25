import { RawMinifiedPodcast } from './podcasts.type';

export const rawMinifiedPodcastToMinifiedPodcastDto = (
  rawMinifiedPodcast: RawMinifiedPodcast,
) => {
  const { rawLevels, ...podcastDtoWithoutLevels } = rawMinifiedPodcast
  return {
    ...podcastDtoWithoutLevels,
    levels: JSON.parse(rawLevels)
  }
}

export const rawMinifiedPodcastsToMinifiedPodcastDtos = (
  rawMinifiedPodcasts: RawMinifiedPodcast[]
) =>
  rawMinifiedPodcasts.map((rawMinifiedPodcast) =>
    rawMinifiedPodcastToMinifiedPodcastDto(rawMinifiedPodcast),
  );
