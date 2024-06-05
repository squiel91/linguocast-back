export interface SeparationResult {
  before: string | null
  separator: string
  after: string | null
}

export const separate = (
  text: string,
  separatorRegex: RegExp
): SeparationResult => {
  const match = text.match(separatorRegex)
  if (!match) {
    throw new Error('No match found')
  }

  const separatorIndex = match.index!
  const separator = match[0]

  const before = separatorIndex > 0 ? text.slice(0, separatorIndex) : null
  const after =
    separatorIndex + separator.length < text.length
      ? text.slice(separatorIndex + separator.length)
      : null

  return {
    before,
    separator,
    after
  }
}