import { Link } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import Nav from '../components/Nav';
import DemoTour from '../components/demo/DemoTour';
import type { UserRole } from '../types';

const ROLE_CARDS: Record<UserRole, { title: string; description: string; to: string; cta: string }> = {
  new_joinee: {
    title: 'Your training',
    description: 'Work through your onboarding modules and track your mentor checklist.',
    to: '/training',
    cta: 'Go to training',
  },
  mentor: {
    title: 'My mentees',
    description: 'Review each mentee’s collaboration checklist and log completed sessions.',
    to: '/mentor-view',
    cta: 'View mentees',
  },
  people_leader: {
    title: 'Team completion dashboard',
    description: 'See onboarding progress across your team.',
    to: '/leader-dashboard',
    cta: 'View dashboard',
  },
  compliance_admin: {
    title: 'Compliance dashboard',
    description: 'Org-wide completion stats, integrity checks, and the immutable audit log.',
    to: '/compliance-dashboard',
    cta: 'View dashboard',
  },
};

export default function Dashboard() {
  const { user } = useAuth();
  if (!user) return null;
  const card = ROLE_CARDS[user.role];

  return (
    <div className="page-bg min-h-screen">
      <Nav />
      <DemoTour role={user.role} />
      <main className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
        <h1 className="h1" data-tour="dashboard-heading">
          Welcome back, {user.firstName}
        </h1>
        <p className="mt-1 text-sm text-brand-muted">
          You&rsquo;re signed in as <span className="font-mono text-brand-pink">{user.role.replace('_', ' ')}</span>.
        </p>

        <div className="mt-8 max-w-lg rounded-xl border-l-4 border-brand-green bg-brand-dark p-6">
          <h2 className="h3">{card.title}</h2>
          <p className="mt-1 text-sm text-brand-muted">{card.description}</p>
          <Link to={card.to} className="btn-primary mt-4 inline-flex">
            {card.cta}
          </Link>
        </div>
      </main>
    </div>
  );
}
