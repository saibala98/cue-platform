import { AppDataSource } from '../database/data-source';
import { DocumentChunk } from '../models/DocumentChunk';
import type { DocumentChunkMetadata } from '../models/DocumentChunk';

const chunkRepo = () => AppDataSource.getRepository(DocumentChunk);

export interface RetrievedChunk {
  chunkId: string;
  documentId: string;
  documentName: string;
  chunkText: string;
  chunkIndex: number;
  relevanceScore: number;
  chunkMetadata: DocumentChunkMetadata;
}

/**
 * Stand-in for a real vector-similarity search (Pinecone, in a later pass):
 * scores each chunk in the LOB by keyword occurrence count and returns the
 * top matches. Same interface a real semantic search would expose, so the
 * AI assistant that eventually consumes this doesn't need to change when
 * this gets swapped for real embeddings.
 */
export async function searchChunks(lobId: string, query: string, limit = 5): Promise<RetrievedChunk[]> {
  const terms = query.match(/[\p{L}\p{N}']+/gu) ?? [];
  if (terms.length === 0) return [];

  const chunks = await chunkRepo().find({ where: { lobId }, relations: { document: true } });

  const scored = chunks
    .map((chunk) => {
      const lowerText = chunk.chunkText.toLowerCase();
      const score = terms.reduce((count, term) => {
        const lowerTerm = term.toLowerCase();
        let occurrences = 0;
        let index = lowerText.indexOf(lowerTerm);
        while (index !== -1) {
          occurrences += 1;
          index = lowerText.indexOf(lowerTerm, index + lowerTerm.length);
        }
        return count + occurrences;
      }, 0);
      return { chunk, score };
    })
    .filter((entry) => entry.score > 0 && entry.chunk.document);

  scored.sort((a, b) => b.score - a.score);

  return scored.slice(0, limit).map(({ chunk, score }) => ({
    chunkId: chunk.id,
    documentId: chunk.documentId,
    documentName: chunk.document!.fileName,
    chunkText: chunk.chunkText,
    chunkIndex: chunk.chunkIndex,
    relevanceScore: score,
    chunkMetadata: chunk.metadata,
  }));
}
