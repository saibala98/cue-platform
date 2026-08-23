import { useState } from 'react';
import { DEMO_MODE, DEMO_STORAGE_KEYS } from '../../demo/demoMode';
import { resetDemoState } from '../../demo/mockStore';
import { clearToken } from '../../api/tokenStorage';

export default function DemoReset() {
  const [confirming, setConfirming] = useState(false);

  if (!DEMO_MODE) return null;

  function handleReset() {
    resetDemoState();
    clearToken();
    try {
      localStorage.removeItem(DEMO_STORAGE_KEYS.tourSeen);
      sessionStorage.setItem(DEMO_STORAGE_KEYS.justReset, 'true');
    } catch {
      // ignore
    }
    window.location.href = `${import.meta.env.BASE_URL}login`;
  }

  return (
    <div className="fixed bottom-4 left-4 z-[100]">
      {confirming ? (
        <div className="flex items-center gap-2 rounded-lg border border-brand-border bg-brand-dark p-2 shadow-lg">
          <span className="pl-1 text-xs text-brand-muted">Reset all demo data?</span>
          <button type="button" onClick={handleReset} className="btn-danger px-2.5 py-1 text-xs">
            Reset
          </button>
          <button type="button" onClick={() => setConfirming(false)} className="btn-secondary px-2.5 py-1 text-xs">
            Cancel
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setConfirming(true)}
          className="inline-flex items-center gap-2 rounded-lg border-2 border-cyan-400 bg-brand-black px-3 py-1.5 text-xs font-medium text-cyan-300 shadow-lg transition duration-150 hover:bg-cyan-400 hover:text-brand-black"
        >
          Reset Demo
        </button>
      )}
    </div>
  );
}
