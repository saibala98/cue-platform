import { useEffect, useState } from 'react';
import { DEMO_MODE, DEMO_STORAGE_KEYS } from '../../demo/demoMode';
import type { UserRole } from '../../types';

interface TourStep {
  selector: string;
  title: string;
  body: string;
}

const TOUR_STEPS: Record<UserRole, TourStep[]> = {
  new_joinee: [
    { selector: '[data-tour="dashboard-heading"]', title: 'This is your training dashboard', body: 'Track your onboarding modules and mentor checklist from here.' },
    { selector: '[data-tour="nav-knowledge-buddy"]', title: 'Click here to ask the Knowledge Buddy', body: 'Ask about GIC processes, policies, or who to contact — anytime, day or night.' },
    { selector: '[data-tour="nav-my-mentor"]', title: "Your mentor's checklist is here", body: 'See your collaboration sessions with your assigned mentor and what’s next.' },
  ],
  mentor: [
    { selector: '[data-tour="dashboard-heading"]', title: 'This is your mentee dashboard', body: 'Keep an eye on how your mentees are progressing through onboarding.' },
    { selector: '[data-tour="nav-my-mentees"]', title: 'Your mentees live here', body: 'Review each mentee’s collaboration checklist and log completed sessions.' },
  ],
  people_leader: [
    { selector: '[data-tour="dashboard-heading"]', title: "This is your team's dashboard", body: 'A snapshot of onboarding health across your whole team.' },
    { selector: '[data-tour="nav-leader-dashboard"]', title: 'Full team progress lives here', body: 'Completion rates, mentor assignments, and overdue items in one place.' },
  ],
  compliance_admin: [
    { selector: '[data-tour="dashboard-heading"]', title: 'This is your compliance dashboard', body: 'Org-wide completion stats and integrity checks start here.' },
    { selector: '[data-tour="nav-audit-log"]', title: 'The immutable audit log lives here', body: 'Every completion record, permanently and verifiably logged.' },
  ],
};

interface Rect {
  top: number;
  left: number;
  width: number;
  height: number;
}

export default function DemoTour({ role }: { role: UserRole }) {
  const [visible, setVisible] = useState(false);
  const [stepIndex, setStepIndex] = useState(0);
  const [rect, setRect] = useState<Rect | null>(null);

  const steps = TOUR_STEPS[role];

  useEffect(() => {
    if (!DEMO_MODE) return;
    try {
      if (localStorage.getItem(DEMO_STORAGE_KEYS.tourSeen)) return;
    } catch {
      return;
    }
    const timer = setTimeout(() => setVisible(true), 400);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (!visible) return;
    function measure() {
      const el = document.querySelector(steps[stepIndex]?.selector ?? '');
      if (!el) {
        setRect(null);
        return;
      }
      el.scrollIntoView({ block: 'center', behavior: 'smooth' });
      const r = el.getBoundingClientRect();
      setRect({ top: r.top, left: r.left, width: r.width, height: r.height });
    }
    const timer = setTimeout(measure, 150);
    window.addEventListener('resize', measure);
    return () => {
      clearTimeout(timer);
      window.removeEventListener('resize', measure);
    };
  }, [visible, stepIndex, steps]);

  function finish() {
    setVisible(false);
    try {
      localStorage.setItem(DEMO_STORAGE_KEYS.tourSeen, 'true');
    } catch {
      // ignore
    }
  }

  if (!DEMO_MODE || !visible || steps.length === 0) return null;

  const step = steps[stepIndex];
  const isLast = stepIndex === steps.length - 1;

  const tooltipTop = rect ? rect.top + rect.height + 12 : 96;
  const tooltipLeft = rect ? Math.min(Math.max(rect.left, 16), window.innerWidth - 336) : 16;

  return (
    <>
      <div className="fixed inset-0 z-[90] bg-brand-black/70" />
      {rect && (
        <div
          className="fixed z-[91] rounded-lg border-2 border-cyan-400 shadow-[0_0_0_9999px_rgba(0,0,0,0.7)] transition-all duration-300"
          style={{ top: rect.top - 6, left: rect.left - 6, width: rect.width + 12, height: rect.height + 12 }}
        />
      )}
      <div
        className="fixed z-[92] w-80 max-w-[calc(100vw-2rem)] rounded-xl border border-cyan-400/50 bg-brand-dark p-5 shadow-[0_0_20px_rgba(34,211,238,0.25)] transition-all duration-300"
        style={{ top: tooltipTop, left: tooltipLeft }}
      >
        <p className="text-[10px] font-semibold uppercase tracking-widest text-cyan-400">
          Guided tour &middot; {stepIndex + 1} of {steps.length}
        </p>
        <h3 className="mt-2 text-base font-semibold text-white">{step.title}</h3>
        <p className="mt-1.5 text-sm text-brand-muted">{step.body}</p>
        <div className="mt-4 flex items-center justify-between">
          <button type="button" onClick={finish} className="text-xs font-medium text-brand-faint hover:text-white">
            Skip tour
          </button>
          <button
            type="button"
            onClick={() => (isLast ? finish() : setStepIndex((i) => i + 1))}
            className="inline-flex items-center gap-2 rounded-lg bg-cyan-400 px-3 py-1.5 text-xs font-semibold text-brand-black transition hover:brightness-110"
          >
            {isLast ? 'Got it' : 'Next'}
          </button>
        </div>
      </div>
    </>
  );
}
