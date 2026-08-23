import { useState } from 'react';
import Spinner from '../Spinner';
import { exportAuditLog } from '../../api/complianceApi';
import type { ApiClientError } from '../../api/httpClient';
import type { AuditFilters } from '../../types';

interface Props {
  filters: AuditFilters;
  disabled?: boolean;
}

export default function AuditExport({ filters, disabled }: Props) {
  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleExport() {
    setExporting(true);
    setError(null);
    try {
      await exportAuditLog(filters);
    } catch (err) {
      setError((err as ApiClientError).message);
    } finally {
      setExporting(false);
    }
  }

  return (
    <div>
      <button type="button" onClick={() => void handleExport()} disabled={exporting || disabled} className="btn-secondary">
        {exporting && <Spinner className="h-4 w-4 text-brand-pink" />}
        {exporting ? 'Exporting…' : 'Export Audit Log'}
      </button>
      {error && <p className="mt-1 text-xs text-brand-pink">{error}</p>}
      <p className="mt-2 text-xs text-brand-faint">This is an immutable record. Records cannot be modified.</p>
    </div>
  );
}
