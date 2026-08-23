import fs from 'fs/promises';
import { PDFParse } from 'pdf-parse';
import mammoth from 'mammoth';
import type { DocumentChunkMetadata } from '../models/DocumentChunk';

const TARGET_CHUNK_TOKENS = 500;
const OVERLAP_TOKENS = 50;

/** No real tokenizer is wired up for this MVP — this is the standard rough
 * heuristic (~0.75 words per token for English) used to approximate a token
 * budget from word count. Good enough to size chunks; not exact. */
function estimateTokens(text: string): number {
  const words = text.trim().split(/\s+/).filter(Boolean).length;
  return Math.ceil(words * 1.3);
}

function wordsOf(text: string): string[] {
  return text.trim().split(/\s+/).filter(Boolean);
}

function lastWords(text: string, approxTokens: number): string {
  const words = wordsOf(text);
  const wordBudget = Math.ceil(approxTokens / 1.3);
  return words.slice(-wordBudget).join(' ');
}

/** A short, punctuation-free-ish line standing alone is a reasonable proxy
 * for a section heading in plain extracted text (no font/style info survives
 * PDF/DOCX text extraction, so this is a heuristic, not a real structural parse). */
function looksLikeHeading(paragraph: string): boolean {
  const trimmed = paragraph.trim();
  if (trimmed.length === 0 || trimmed.length > 80) return false;
  if (trimmed.includes('\n')) return false;
  if (/[.,;:]$/.test(trimmed)) return false;
  return true;
}

function splitIntoSentences(text: string): string[] {
  return text.match(/[^.!?]+[.!?]+(\s+|$)/g)?.map((s) => s.trim()) ?? [text];
}

export interface ExtractedText {
  text: string;
  pageCount: number | null;
}

export class DocumentProcessingError extends Error {}

export async function extractText(filePath: string, fileType: string): Promise<ExtractedText> {
  try {
    if (fileType === 'pdf') {
      const buffer = await fs.readFile(filePath);
      const parser = new PDFParse({ data: buffer });
      try {
        const result = await parser.getText();
        // result.text concatenates pages with "-- N of M --" separators meant
        // for human display; join the clean per-page text ourselves instead
        // so that boilerplate doesn't end up inside a searchable chunk.
        const text = result.pages.map((p) => p.text).join('\n\n');
        return { text, pageCount: result.total };
      } finally {
        await parser.destroy();
      }
    }
    if (fileType === 'docx') {
      const buffer = await fs.readFile(filePath);
      const result = await mammoth.extractRawText({ buffer });
      return { text: result.value, pageCount: null };
    }
    if (fileType === 'txt') {
      const text = await fs.readFile(filePath, 'utf8');
      return { text, pageCount: null };
    }
    throw new DocumentProcessingError(`Unsupported file type for extraction: ${fileType}`);
  } catch (err) {
    if (err instanceof DocumentProcessingError) throw err;
    throw new DocumentProcessingError(`Failed to extract text: ${err instanceof Error ? err.message : String(err)}`);
  }
}

export interface Chunk {
  chunkText: string;
  chunkIndex: number;
  metadata: DocumentChunkMetadata;
}

/**
 * Paragraph-first chunking with sentence-level fallback for oversized
 * paragraphs, and a sliding ~50-token overlap carried from the tail of one
 * chunk into the start of the next so retrieval doesn't lose context at
 * chunk boundaries.
 */
export function chunkText(rawText: string, fileName: string): Chunk[] {
  const paragraphs = rawText
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter(Boolean);

  const chunks: Chunk[] = [];
  let buffer = '';
  let currentSection: string | null = null;
  let sectionAtChunkStart: string | null = null;

  function flush() {
    const trimmed = buffer.trim();
    if (trimmed) {
      chunks.push({
        chunkText: trimmed,
        chunkIndex: chunks.length,
        metadata: { fileName, totalChunks: 0, sectionHeader: sectionAtChunkStart, pageNumber: null },
      });
    }
    buffer = lastWords(buffer, OVERLAP_TOKENS);
    sectionAtChunkStart = currentSection;
  }

  function addPiece(piece: string) {
    const candidate = buffer ? `${buffer} ${piece}` : piece;
    if (estimateTokens(candidate) > TARGET_CHUNK_TOKENS && buffer.trim()) {
      flush();
      buffer = buffer ? `${buffer} ${piece}` : piece;
    } else {
      buffer = candidate;
    }
  }

  for (const paragraph of paragraphs) {
    if (looksLikeHeading(paragraph)) {
      currentSection = paragraph;
      if (!buffer.trim()) sectionAtChunkStart = currentSection;
      continue;
    }

    if (estimateTokens(paragraph) > TARGET_CHUNK_TOKENS) {
      for (const sentence of splitIntoSentences(paragraph)) {
        addPiece(sentence);
      }
    } else {
      addPiece(paragraph);
    }
  }
  flush();

  const totalChunks = chunks.length;
  return chunks.map((c) => ({ ...c, metadata: { ...c.metadata, totalChunks } }));
}
