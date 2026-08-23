import { useEffect, useState } from 'react';
import Spinner from '../Spinner';
import ErrorBanner from '../ErrorBanner';
import { fetchDocument } from '../../api/documentApi';
import type { ApiClientError } from '../../api/httpClient';
import type { DocumentDetail } from '../../types';

interface Props {
  documentId: string;
  onClose: () => void;
}

export default function DocumentChunkPreview({ documentId, onClose }: Props) {
  const [detail, setDetail] = useState<DocumentDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchDocument(documentId)
      .then(setDetail)
      .catch((err) => setError((err as ApiClientError).message))
      .finally(() => setLoading(false));
  }, [documentId]);

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-brand-black/80 backdrop-blur-sm" />
      <div
        onClick={(e) => e.stopPropagation()}
        className="relative z-10 max-h-[85vh] w-full max-w-2xl overflow-y-auto rounded-xl border border-brand-border bg-brand-dark p-6"
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="h3">{detail?.document.fileName ?? 'Document preview'}</h2>
            {detail && <p className="mt-1 text-xs text-brand-faint">{detail.chunks.length} chunks extracted</p>}
          </div>
          <button type="button" onClick={onClose} className="btn-secondary shrink-0 px-3 py-1.5 text-xs">
            Close
          </button>
        </div>

        {error && (
          <div className="mt-4">
            <ErrorBanner message={error} />
          </div>
        )}

        {loading ? (
          <div className="mt-8 flex justify-center">
            <Spinner className="h-6 w-6" />
          </div>
        ) : detail && detail.chunks.length === 0 ? (
          <p className="mt-6 text-sm text-brand-muted">No chunks were extracted from this document.</p>
        ) : (
          <ul className="mt-4 space-y-3">
            {detail?.chunks.map((c) => (
              <li key={c.id} className="session-card">
                <div className="flex flex-wrap items-center gap-2 text-xs">
                  <span className="mono">
                    Chunk {c.chunkIndex + 1} of {c.metadata.totalChunks}
                  </span>
                  {c.metadata.sectionHeader && <span className="badge-not-started">{c.metadata.sectionHeader}</span>}
                  {c.metadata.pageNumber !== null && <span className="badge-not-started">Page {c.metadata.pageNumber}</span>}
                </div>
                <p className="mt-2 whitespace-pre-wrap text-sm text-brand-muted">{c.chunkText}</p>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
