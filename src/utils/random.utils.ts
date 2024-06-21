const seededRandom = (seed: number): (() => number) => {
  return () => {
    const x = Math.sin(seed++) * 10000
    return x - Math.floor(x)
  }
}

// Function to shuffle an array from 0 to N-1 using a given seed
export const shufflePositions = (seed: number, N: number): number[] => {
  const array = Array.from({ length: N }, (_, i) => i)
  const random = seededRandom(seed)

  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1))
    ;[array[i], array[j]] = [array[j], array[i]]
  }

  return array
}
