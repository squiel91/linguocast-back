export const daySinceEpoche = (): number => {
  const now = new Date().getTime()
  return Math.floor(now / 8.64e7)
}
