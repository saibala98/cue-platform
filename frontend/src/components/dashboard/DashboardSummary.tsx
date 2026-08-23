import type { DashboardSummaryData } from '../../types';

interface Props {
  data: DashboardSummaryData;
}

export default function DashboardSummary({ data }: Props) {
  const cards: { label: string; value: number; alert?: boolean }[] = [
    { label: 'New joinees', value: data.totalNewJoinees },
    { label: 'Modules completed this week', value: data.modulesCompletedThisWeek },
    { label: 'Overdue modules', value: data.overdueModules, alert: data.overdueModules > 0 },
    { label: 'Active mentor assignments', value: data.mentorAssignmentsActive },
    { label: 'Sessions completed this week', value: data.sessionsCompletedThisWeek },
  ];

  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
      {cards.map((card) => (
        <div key={card.label} className={`rounded-xl border bg-brand-dark p-4 ${card.alert ? 'border-brand-pink' : 'border-brand-green'}`}>
          <p className={`text-3xl font-bold ${card.alert ? 'text-brand-pink' : 'text-brand-green'}`}>{card.value}</p>
          <p className="mt-1 text-xs text-brand-muted">{card.label}</p>
        </div>
      ))}
    </div>
  );
}
