const CHUNK_SIZE = 1000
const CHUNK_OVERLAP = 200

export function chunkText(text: string): string[] {
  const chunks: string[] = []

  let start = 0

  while (start < text.length) {
    const end = start + CHUNK_SIZE

    const chunk = text.slice(start, end).trim()

    if (chunk) {
      chunks.push(chunk)
    }

    start += CHUNK_SIZE - CHUNK_OVERLAP
  }

  return chunks
}
