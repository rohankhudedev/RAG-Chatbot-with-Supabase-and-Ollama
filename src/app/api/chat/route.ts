import { NextRequest, NextResponse } from 'next/server'
import ollama from 'ollama'

import { generateEmbedding } from '@/lib/embeddings'
import { supabase } from '@/lib/supabase'

export async function POST(request: NextRequest) {
  const body = await request.json()

  const question = body.question

  if (typeof question !== 'string' || question.trim().length === 0) {
    return NextResponse.json({ error: 'Question is required' }, { status: 400 })
  }

  const questionEmbedding = await generateEmbedding(question)

  const { data: chunks, error } = await supabase.rpc('match_document_chunks', {
    query_embedding: questionEmbedding,
    match_count: 5
  })

  if (error) {
    console.error(error)

    return NextResponse.json({ error: 'Failed to retrieve context' }, { status: 500 })
  }

  const context = chunks.map((chunk: { document_name: string; content: string }) => `Source: ${chunk.document_name}\n${chunk.content}`).join('\n\n')

  const prompt = `
You are a document question-answering assistant.

Answer the user's question using ONLY the provided context.

If the answer cannot be found in the context,
say that you don't have enough information.

Context:
${context}

Question:
${question}
`

  const response = await ollama.chat({
    model: process.env.OLLAMA_CHAT_MODEL || 'llama3.1',
    messages: [
      {
        role: 'user',
        content: prompt
      }
    ]
  })

  return NextResponse.json({
    answer: response.message.content,
    sources: chunks
  })
}
