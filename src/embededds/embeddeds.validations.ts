import {
  ValidateNested,
  IsNumber,
  IsString,
  IsOptional,
  IsEnum,
  IsUrl,
} from 'class-validator'
import { Type } from 'class-transformer'
import { Embedded } from './embeddeds.dto'

export enum EmbeddedType {
  Note = 'note',
  Link = 'link',
  Episode = 'episode',
  Word = 'word',
  Image = 'image'
}

export class BaseEmbedded {
  @IsOptional()
  @IsNumber()
  id?: number

  @IsNumber()
  start: number

  @IsNumber()
  duration: number
}

export class NoteEmbedded extends BaseEmbedded {
  @IsEnum(EmbeddedType)
  type: EmbeddedType.Note

  @IsString()
  content: string
}

export class LinkEmbedded extends BaseEmbedded {
  @IsEnum(EmbeddedType)
  type: EmbeddedType.Link

  @IsUrl()
  url: string
}

export class EpisodeEmbedded extends BaseEmbedded {
  @IsEnum(EmbeddedType)
  type: EmbeddedType.Episode

  @IsNumber()
  episodeId: number
}

export class WordEmbedded extends BaseEmbedded {
  @IsEnum(EmbeddedType)
  type: EmbeddedType.Word

  @IsNumber()
  wprdId: number
}

export class ImageEmbedded extends BaseEmbedded {
  @IsEnum(EmbeddedType)
  type: EmbeddedType.Image

  @IsString()
  image: string
}

export class EmbeddedsDto {
  @IsNumber()
  episodeId: number

  @ValidateNested({ each: true })
  @Type(() => BaseEmbedded, {
    discriminator: {
      property: 'type',
      subTypes: [
        { value: NoteEmbedded, name: EmbeddedType.Note },
        { value: LinkEmbedded, name: EmbeddedType.Link },
        { value: EpisodeEmbedded, name: EmbeddedType.Episode },
        { value: ImageEmbedded, name: EmbeddedType.Image }
      ]
    },
    keepDiscriminatorProperty: true
  })
  embeddeds: Embedded[]
}
