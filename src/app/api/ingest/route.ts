import { NextRequest, NextResponse } from 'next/server'
import { PDFParse } from 'pdf-parse'

import { generateEmbedding } from '@/lib/embeddings'
import { chunkText } from '@/lib/chunk'
import { supabase } from '@/lib/supabase'

export const runtime = 'nodejs'

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const file = formData.get('file')

    if (!(file instanceof File)) {
      return NextResponse.json({ error: 'File is required' }, { status: 400 })
    }

    if (file.type !== 'application/pdf') {
      return NextResponse.json({ error: 'Only PDF files are supported' }, { status: 400 })
    }

    const MAX_FILE_SIZE = 10 * 1024 * 1024

    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json({ error: 'File too large' }, { status: 413 })
    }

    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)

    // Basic PDF signature validation
    const pdfHeader = buffer.subarray(0, 5).toString()

    if (pdfHeader !== '%PDF-') {
      return NextResponse.json({ error: 'Invalid PDF file' }, { status: 400 })
    }

    const parser = new PDFParse({
      data: buffer
    })

    const result = await parser.getText()

    await parser.destroy()

    const text = result.text.trim()

    if (!text) {
      return NextResponse.json({ error: 'Could not extract text from PDF' }, { status: 400 })
    }

    const chunks = chunkText(text)

    if (chunks.length === 0) {
      return NextResponse.json({ error: 'No chunks were created' }, { status: 400 })
    }

    const rows = []

    for (let index = 0; index < chunks.length; index++) {
      const chunk = chunks[index]

      const embedding = await generateEmbedding(chunk)

      rows.push({
        document_name: file.name,
        chunk_index: index,
        content: chunk,
        embedding
      })
    }

    const { error } = await supabase.from('document_chunks').insert(rows)

    if (error) {
      console.error('Supabase error:', error)

      return NextResponse.json({ error: 'Failed to store document' }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      document: file.name,
      chunks: chunks.length
    })
  } catch (error) {
    console.error('Ingestion error:', error)

    return NextResponse.json({ error: 'Failed to process PDF' }, { status: 500 })
  }
}
