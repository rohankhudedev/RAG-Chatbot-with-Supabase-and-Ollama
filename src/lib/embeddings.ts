import 'server-only'
import { Ollama } from 'ollama'

const MODEL = process.env.OLLAMA_EMBED_MODEL || 'nomic-embed-text'

const OLLAMA_HOST = process.env.OLLAMA_BASE_URL || 'http://127.0.0.1:11434'

console.log('Ollama host:', OLLAMA_HOST)

const ollama = new Ollama({
  host: OLLAMA_HOST
})

export async function generateEmbedding(text: string) {
  const response = await ollama.embeddings({
    model: MODEL,
    prompt: text
  })

  return response.embedding
}
