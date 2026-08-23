import { useEffect, useRef, useState } from 'react';
import Nav from '../components/Nav';
import Spinner from '../components/Spinner';
import ErrorBanner from '../components/ErrorBanner';
import DocumentUpload from '../components/documents/DocumentUpload';
import DocumentChunkPreview from '../components/documents/DocumentChunkPreview';
import { deleteDocument, downloadDocumentFile, fetchDocuments, retryDocument } from '../api/documentApi';
import type { ApiClientError } from '../api/httpClient';
import type { DocumentStatus, LobDocumentSummary } from '../types';

const STATUS_LABEL: Record<DocumentStatus, string> = {
  uploaded: 'Uploading…',
  processing: 'Extracting text…',
  ready: 'Ready for AI queries',
  failed: 'Processing failed',
};
const STATUS_BADGE: Record<DocumentStatus, string> = {
  uploaded: 'badge-in-progress',
  processing: 'badge-in-progress',
  ready: 'badge-completed',
  failed: 'badge-overdue',
};

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function DocumentManager() {
  const [documents, setDocuments] = useState<LobDocumentSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [retryingId, setRetryingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [previewId, setPreviewId] = useState<string | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  function load() {
    return fetchDocuments()
      .then(setDocuments)
      .catch((err) => setError((err as ApiClientError).message));
  }

  useEffect(() => {
    load().finally(() => setLoading(false));
  }, []);

  // Poll while anything is still uploading/processing, so status badges
  // reflect real backend state rather than a client-side guess.
  useEffect(() => {
    const hasPending = documents.some((d) => d.status === 'uploaded' || d.status === 'processing');
    if (hasPending && !pollRef.current) {
      pollRef.current = setInterval(() => void load(), 1500);
    } else if (!hasPending && pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }
    return () => {
      if (pollRef.current) {
        clearInterval(pollRef.current);
        pollRef.current = null;
      }
    };
  }, [documents]);

  function handleUploaded(doc: LobDocumentSummary) {
    setDocuments((prev) => [doc, ...prev]);
  }

  async function handleRetry(id: string) {
    setRetryingId(id);
    setError(null);
    try {
      await retryDocument(id);
      await load();
    } catch (err) {
      setError((err as ApiClientError).message);
    } finally {
      setRetryingId(null);
    }
  }

  async function handleDelete(doc: LobDocumentSummary) {
    setDeletingId(doc.id);
    setError(null);
    try {
      await deleteDocument(doc.id);
      setDocuments((prev) => prev.filter((d) => d.id !== doc.id));
    } catch (err) {
      setError((err as ApiClientError).message);
    } finally {
      setDeletingId(null);
    }
  }

  async function handleDownload(doc: LobDocumentSummary) {
    try {
      await downloadDocumentFile(doc.id, doc.fileName);
    } catch (err) {
      setError((err as ApiClientError).message);
    }
  }

  return (
    <div className="page-bg min-h-screen">
      <Nav />
      <main className="mx-auto max-w-4xl px-4 py-10 sm:px-6">
        <h1 className="h1">Document Manager</h1>
        <p className="mt-1 text-sm text-brand-muted">
          Upload LOB documents so the Knowledge Buddy can ground its answers in your organization&rsquo;s actual policies.
        </p>

        {error && (
          <div className="mt-4">
            <ErrorBanner message={error} />
          </div>
        )}

        <div className="mt-6">
          <DocumentUpload onUploaded={handleUploaded} />
        </div>

        <section className="mt-8">
          <h2 className="h3">Documents</h2>
          {loading ? (
            <div className="mt-6 flex justify-center">
              <Spinner className="h-6 w-6" />
            </div>
          ) : documents.length === 0 ? (
            <p className="mt-3 text-sm text-brand-muted">No documents uploaded yet.</p>
          ) : (
            <ul className="mt-3 space-y-2">
              {documents.map((doc) => (
                <li key={doc.id} className="card">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="font-medium text-white">{doc.fileName}</h3>
                        <span className={STATUS_BADGE[doc.status]}>{STATUS_LABEL[doc.status]}</span>
                      </div>
                      <p className="mt-1 text-xs text-brand-faint">
                        {doc.fileType.toUpperCase()} · {formatBytes(doc.fileSize)} · uploaded {new Date(doc.uploadedAt).toLocaleDateString()}
                        {doc.status === 'ready' && ` · ${doc.chunkCount} chunks`}
                      </p>
                      {doc.status === 'failed' && doc.errorMessage && <p className="mt-1 text-xs text-brand-pink">{doc.errorMessage}</p>}
                    </div>
                    <div className="flex shrink-0 flex-wrap justify-end gap-2">
                      {doc.status === 'ready' && (
                        <button type="button" onClick={() => setPreviewId(doc.id)} className="btn-secondary px-3 py-1.5 text-xs">
                          Preview
                        </button>
                      )}
                      {doc.status === 'failed' && (
                        <button
                          type="button"
                          disabled={retryingId === doc.id}
                          onClick={() => void handleRetry(doc.id)}
                          className="btn-secondary px-3 py-1.5 text-xs"
                        >
                          {retryingId === doc.id && <Spinner className="h-3.5 w-3.5 text-brand-pink" />}
                          Retry
                        </button>
                      )}
                      <button type="button" onClick={() => void handleDownload(doc)} className="btn-secondary px-3 py-1.5 text-xs">
                        Download
                      </button>
                      <button
                        type="button"
                        disabled={deletingId === doc.id}
                        onClick={() => void handleDelete(doc)}
                        className="btn-danger px-3 py-1.5 text-xs"
                      >
                        {deletingId === doc.id && <Spinner className="h-3.5 w-3.5 text-white" />}
                        Delete
                      </button>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>

        {previewId && <DocumentChunkPreview documentId={previewId} onClose={() => setPreviewId(null)} />}
      </main>
    </div>
  );
}
