import fs from 'fs';
import path from 'path';
import type { Request, Response } from 'express';
import { AppDataSource } from '../database/data-source';
import { LobDocument } from '../models/LobDocument';
import { DocumentChunk } from '../models/DocumentChunk';
import { User } from '../models/User';
import { chunkText, extractText } from '../services/documentProcessor';
import { searchChunks } from '../services/retrievalService';
import { HttpError } from '../middleware/errorHandler';

const docRepo = () => AppDataSource.getRepository(LobDocument);
const chunkRepo = () => AppDataSource.getRepository(DocumentChunk);
const userRepo = () => AppDataSource.getRepository(User);

function extOf(fileName: string): string {
  return path.extname(fileName).replace('.', '').toLowerCase() || 'unknown';
}

/**
 * Runs after the upload response has already been sent. Always resolves to
 * a terminal status ('ready' or 'failed') — a document must never be left
 * stuck in 'processing' because of an uncaught error here.
 */
async function processDocument(documentId: string): Promise<void> {
  const doc = await docRepo().findOneBy({ id: documentId });
  if (!doc) return;

  doc.status = 'processing';
  await docRepo().save(doc);

  try {
    const { text } = await extractText(doc.filePath, doc.fileType);

    if (!text.trim()) {
      doc.status = 'failed';
      doc.errorMessage = 'Document appears to be empty — no text could be extracted.';
      await docRepo().save(doc);
      return;
    }

    const chunks = chunkText(text, doc.fileName);
    if (chunks.length === 0) {
      doc.status = 'failed';
      doc.errorMessage = 'Document appears to be empty — no text could be extracted.';
      await docRepo().save(doc);
      return;
    }

    // Idempotent: a retry re-extracts and re-chunks from scratch.
    await chunkRepo().delete({ documentId: doc.id });
    await chunkRepo().save(
      chunks.map((c) =>
        chunkRepo().create({
          documentId: doc.id,
          lobId: doc.lobId,
          chunkText: c.chunkText,
          chunkIndex: c.chunkIndex,
          metadata: c.metadata,
        }),
      ),
    );

    doc.status = 'ready';
    doc.chunkCount = chunks.length;
    doc.errorMessage = null;
    await docRepo().save(doc);
  } catch (err) {
    doc.status = 'failed';
    doc.errorMessage = err instanceof Error ? err.message : 'Processing failed for an unknown reason.';
    await docRepo().save(doc);
  }
}

export async function uploadDocument(req: Request, res: Response): Promise<void> {
  const file = req.file;
  if (!file) throw new HttpError(400, 'No file was uploaded');

  const user = await userRepo().findOneBy({ id: req.userId });
  const lobId = (req.body?.lobId as string | undefined) ?? user?.lobId ?? undefined;
  if (!lobId) {
    fs.unlink(file.path, () => undefined);
    throw new HttpError(400, 'lobId is required (no LOB is set on your account)');
  }

  try {
    const doc = docRepo().create({
      lobId,
      fileName: file.originalname,
      filePath: file.path,
      fileType: extOf(file.originalname),
      fileSize: file.size,
      uploadedBy: req.userId as string,
      status: 'uploaded',
    });
    await docRepo().save(doc);

    res.status(201).json({
      document: {
        id: doc.id,
        fileName: doc.fileName,
        fileType: doc.fileType,
        fileSize: doc.fileSize,
        status: doc.status,
        chunkCount: doc.chunkCount,
        errorMessage: doc.errorMessage,
        uploadedAt: doc.uploadedAt,
      },
    });

    void processDocument(doc.id).catch((err) => console.error('[documentProcessor] unexpected failure', err));
  } catch (err) {
    fs.unlink(file.path, () => undefined);
    throw err;
  }
}

export async function retryProcessing(req: Request, res: Response): Promise<void> {
  const doc = await docRepo().findOneBy({ id: req.params.id });
  if (!doc) throw new HttpError(404, 'Document not found');
  if (doc.status !== 'failed') throw new HttpError(400, 'Only a failed document can be retried');

  doc.status = 'uploaded';
  doc.errorMessage = null;
  await docRepo().save(doc);

  res.status(202).json({ document: { id: doc.id, status: doc.status } });
  void processDocument(doc.id).catch((err) => console.error('[documentProcessor] unexpected failure', err));
}

export async function listDocuments(req: Request, res: Response): Promise<void> {
  const user = await userRepo().findOneBy({ id: req.userId });
  const lobId = (req.query.lobId as string | undefined) ?? user?.lobId ?? undefined;
  if (!lobId) {
    res.json({ documents: [] });
    return;
  }

  const documents = await docRepo().find({ where: { lobId }, order: { uploadedAt: 'DESC' } });
  res.json({
    documents: documents.map((d) => ({
      id: d.id,
      fileName: d.fileName,
      fileType: d.fileType,
      fileSize: d.fileSize,
      status: d.status,
      chunkCount: d.chunkCount,
      errorMessage: d.errorMessage,
      uploadedAt: d.uploadedAt,
    })),
  });
}

export async function getDocument(req: Request, res: Response): Promise<void> {
  const doc = await docRepo().findOneBy({ id: req.params.id });
  if (!doc) throw new HttpError(404, 'Document not found');

  const chunks = await chunkRepo().find({ where: { documentId: doc.id }, order: { chunkIndex: 'ASC' } });

  res.json({
    document: {
      id: doc.id,
      fileName: doc.fileName,
      fileType: doc.fileType,
      fileSize: doc.fileSize,
      status: doc.status,
      chunkCount: doc.chunkCount,
      errorMessage: doc.errorMessage,
      uploadedAt: doc.uploadedAt,
    },
    chunks: chunks.map((c) => ({ id: c.id, chunkIndex: c.chunkIndex, chunkText: c.chunkText, metadata: c.metadata })),
  });
}

export async function getDocumentChunks(req: Request, res: Response): Promise<void> {
  const doc = await docRepo().findOneBy({ id: req.params.id });
  if (!doc) throw new HttpError(404, 'Document not found');

  const chunks = await chunkRepo().find({ where: { documentId: doc.id }, order: { chunkIndex: 'ASC' } });
  res.json({ chunks: chunks.map((c) => ({ id: c.id, chunkIndex: c.chunkIndex, chunkText: c.chunkText, metadata: c.metadata })) });
}

export async function deleteDocument(req: Request, res: Response): Promise<void> {
  const doc = await docRepo().findOneBy({ id: req.params.id });
  if (!doc) throw new HttpError(404, 'Document not found');

  // DocumentChunk rows cascade at the DB level (FK ON DELETE CASCADE), so
  // deleting the document row is enough to remove them from the "vector store".
  await docRepo().remove(doc);
  fs.unlink(doc.filePath, () => undefined);

  res.status(204).send();
}

export async function downloadDocument(req: Request, res: Response): Promise<void> {
  const doc = await docRepo().findOneBy({ id: req.params.id });
  if (!doc) throw new HttpError(404, 'Document not found');
  if (!fs.existsSync(doc.filePath)) throw new HttpError(404, 'File is missing on disk');
  res.download(doc.filePath, doc.fileName);
}

export async function searchDocuments(req: Request, res: Response): Promise<void> {
  const { query } = req.body ?? {};
  if (typeof query !== 'string' || !query.trim()) throw new HttpError(400, 'query is required');

  const user = await userRepo().findOneBy({ id: req.userId });
  const lobId = (req.body?.lobId as string | undefined) ?? user?.lobId ?? undefined;
  if (!lobId) {
    res.json({ results: [] });
    return;
  }

  const results = await searchChunks(lobId, query.trim(), 5);
  res.json({ results });
}
