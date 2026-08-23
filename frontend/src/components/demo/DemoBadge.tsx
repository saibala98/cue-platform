import { DEMO_MODE } from '../../demo/demoMode';

export default function DemoBadge() {
  if (!DEMO_MODE) return null;

  return (
    <div className="pointer-events-none fixed right-4 top-4 z-[100]">
      <span className="inline-flex items-center gap-1.5 rounded-full border border-cyan-400/60 bg-cyan-400/10 px-3 py-1.5 text-xs font-semibold tracking-wide text-cyan-300 shadow-[0_0_12px_rgba(34,211,238,0.35)] backdrop-blur-sm">
        <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-cyan-400" />
        DEMO MODE
      </span>
    </div>
  );
}
