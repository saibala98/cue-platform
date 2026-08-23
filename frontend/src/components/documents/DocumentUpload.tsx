import { useRef, useState } from 'react';
import type { DragEvent } from 'react';
import { uploadDocument } from '../../api/documentApi';
import type { ApiClientError } from '../../api/httpClient';
import type { LobDocumentSummary } from '../../types';

const ALLOWED_EXTENSIONS = ['pdf', 'docx', 'txt'];
const MAX_BYTES = 10 * 1024 * 1024;

interface Props {
  onUploaded: (doc: LobDocumentSummary) => void;
}

interface InFlightUpload {
  id: string;
  fileName: string;
  progress: number;
  error: string | null;
}

function extOf(fileName: string): string {
  return fileName.split('.').pop()?.toLowerCase() ?? '';
}

export default function DocumentUpload({ onUploaded }: Props) {
  const [dragOver, setDragOver] = useState(false);
  const [uploads, setUploads] = useState<InFlightUpload[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);

  function validate(file: File): string | null {
    if (!ALLOWED_EXTENSIONS.includes(extOf(file.name))) return 'Unsupported file type. Allowed: PDF, DOCX, TXT.';
    if (file.size > MAX_BYTES) return 'File exceeds the 10MB limit.';
    return null;
  }

  async function handleFiles(files: FileList | null) {
    if (!files || files.length === 0) return;

    for (const file of Array.from(files)) {
      const uploadId = `${file.name}-${Date.now()}-${Math.random()}`;
      const clientError = validate(file);
      if (clientError) {
        setUploads((prev) => [...prev, { id: uploadId, fileName: file.name, progress: 0, error: clientError }]);
        continue;
      }

      setUploads((prev) => [...prev, { id: uploadId, fileName: file.name, progress: 0, error: null }]);
      try {
        const doc = await uploadDocument(file, (percent) => {
          setUploads((prev) => prev.map((u) => (u.id === uploadId ? { ...u, progress: percent } : u)));
        });
        setUploads((prev) => prev.filter((u) => u.id !== uploadId));
        onUploaded(doc);
      } catch (err) {
        setUploads((prev) => prev.map((u) => (u.id === uploadId ? { ...u, error: (err as ApiClientError).message } : u)));
      }
    }
  }

  function handleDrop(e: DragEvent<HTMLDivElement>) {
    e.preventDefault();
    setDragOver(false);
    void handleFiles(e.dataTransfer.files);
  }

  return (
    <div>
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
        onClick={() => inputRef.current?.click()}
        className={`cursor-pointer rounded-xl border-2 border-dashed p-8 text-center transition-colors ${
          dragOver ? 'border-brand-green bg-brand-green/5' : 'border-brand-border hover:border-brand-pink'
        }`}
      >
        <input
          ref={inputRef}
          type="file"
          multiple
          accept=".pdf,.docx,.txt"
          className="hidden"
          onChange={(e) => {
            void handleFiles(e.target.files);
            e.target.value = '';
          }}
        />
        <p className="text-sm text-white">Drag and drop PDF, DOCX, or TXT files here</p>
        <p className="mt-1 text-xs text-brand-faint">or click to browse · max 10MB per file</p>
      </div>

      {uploads.length > 0 && (
        <ul className="mt-3 space-y-2">
          {uploads.map((u) => (
            <li key={u.id} className="rounded-lg border border-brand-border bg-brand-dark p-3">
              <div className="flex items-center justify-between text-sm">
                <span className="text-white">{u.fileName}</span>
                {!u.error && <span className="font-mono text-xs text-brand-green">{u.progress < 100 ? `Uploading… ${u.progress}%` : 'Processing…'}</span>}
              </div>
              {u.error ? (
                <p className="mt-1 text-xs text-brand-pink">{u.error}</p>
              ) : (
                <div className="progress-track mt-2">
                  <div className="progress-fill" style={{ width: `${u.progress}%` }} />
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
