import ollama from 'ollama'

const embeddingModel = process.env.OLLAMA_EMBED_MODEL || 'nomic-embed-text'

export async function generateEmbedding(text: string) {
  const response = await ollama.embeddings({
    model: embeddingModel,
    prompt: text
  })

  return response.embedding
}
