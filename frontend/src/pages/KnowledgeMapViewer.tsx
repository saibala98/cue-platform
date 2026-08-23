import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Nav from '../components/Nav';
import Spinner from '../components/Spinner';
import ErrorBanner from '../components/ErrorBanner';
import { fetchKnowledgeMapEntries } from '../api/knowledgeMapApi';
import type { ApiClientError } from '../api/httpClient';
import type { KnowledgeMapEntry } from '../types';

export default function KnowledgeMapViewer() {
  const [entries, setEntries] = useState<KnowledgeMapEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    fetchKnowledgeMapEntries()
      .then(setEntries)
      .catch((err) => setError((err as ApiClientError).message))
      .finally(() => setLoading(false));
  }, []);

  const term = search.trim().toLowerCase();
  const filtered = term ? entries.filter((e) => `${e.topic} ${e.ownerName} ${e.goToContactName}`.toLowerCase().includes(term)) : entries;

  function askAboutTopic(entry: KnowledgeMapEntry) {
    navigate('/knowledge-buddy', { state: { initialQuestion: `Who do I ask about ${entry.topic}?` } });
  }

  return (
    <div className="page-bg min-h-screen">
      <Nav />
      <main className="mx-auto max-w-4xl px-4 py-10 sm:px-6">
        <h1 className="h1">Knowledge Map</h1>
        <p className="mt-1 text-sm text-brand-muted">Who owns what, who to contact, and who approves it — for your LOB.</p>

        {error && (
          <div className="mt-4">
            <ErrorBanner message={error} />
          </div>
        )}

        <div className="mt-6">
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by topic..."
            className="input-field w-72"
          />
        </div>

        {loading ? (
          <div className="mt-10 flex justify-center">
            <Spinner className="h-6 w-6" />
          </div>
        ) : filtered.length === 0 ? (
          <p className="mt-8 text-sm text-brand-muted">No entries match your search.</p>
        ) : (
          <ul className="mt-6 grid gap-3 sm:grid-cols-2">
            {filtered.map((entry) => (
              <li key={entry.id} className="card">
                <h2 className="font-medium text-white">{entry.topic}</h2>
                {entry.description && <p className="mt-1 text-xs text-brand-muted">{entry.description}</p>}

                <dl className="mt-3 space-y-1 text-xs text-brand-muted">
                  <div>
                    <dt className="inline font-medium text-brand-faint">Owner: </dt>
                    <dd className="inline">{entry.ownerName}</dd>
                  </div>
                  <div>
                    <dt className="inline font-medium text-brand-faint">Go-To Contact: </dt>
                    <dd className="inline">
                      {entry.goToContactName}
                      {entry.goToContactRole && `, ${entry.goToContactRole}`}
                      {entry.goToContactEmail && ` (${entry.goToContactEmail})`}
                    </dd>
                  </div>
                  {entry.approverName && (
                    <div>
                      <dt className="inline font-medium text-brand-faint">Approver: </dt>
                      <dd className="inline">
                        {entry.approverName}
                        {entry.approverRole && `, ${entry.approverRole}`}
                      </dd>
                    </div>
                  )}
                </dl>

                <button type="button" onClick={() => askAboutTopic(entry)} className="btn-secondary mt-3 px-3 py-1.5 text-xs">
                  Ask Knowledge Buddy about this
                </button>
              </li>
            ))}
          </ul>
        )}
      </main>
    </div>
  );
}
