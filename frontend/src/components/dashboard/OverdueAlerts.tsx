import { useState } from 'react';
import Spinner from '../Spinner';
import type { OverdueItem, ReminderTargetType } from '../../types';

interface Props {
  items: OverdueItem[];
  onSendReminder: (targetType: ReminderTargetType, targetId: string) => Promise<void>;
}

export default function OverdueAlerts({ items, onSendReminder }: Props) {
  const [sendingKey, setSendingKey] = useState<string | null>(null);
  const [sentKeys, setSentKeys] = useState<Set<string>>(new Set());

  async function handleSend(item: OverdueItem) {
    const key = `${item.targetType}:${item.targetId}`;
    setSendingKey(key);
    try {
      await onSendReminder(item.targetType, item.targetId);
      setSentKeys((prev) => new Set(prev).add(key));
    } finally {
      setSendingKey(null);
    }
  }

  if (items.length === 0) {
    return (
      <div className="rounded-xl border border-brand-green bg-brand-dark p-6 text-sm text-brand-muted">
        Nothing overdue right now — your team is on track.
      </div>
    );
  }

  return (
    <ul className="space-y-2">
      {items.map((item) => {
        const key = `${item.targetType}:${item.targetId}`;
        const sent = item.reminderSent || sentKeys.has(key);
        return (
          <li key={key} className="flex items-center justify-between gap-4 rounded-xl border border-brand-pink bg-brand-pink/5 p-4">
            <div>
              <p className="font-medium text-white">{item.employeeName}</p>
              <p className="mt-0.5 text-sm text-brand-muted">{item.what}</p>
              <p className="mt-1 text-xs font-semibold text-brand-pink">
                {item.daysOverdue} day{item.daysOverdue === 1 ? '' : 's'} overdue
              </p>
            </div>
            <button
              type="button"
              disabled={sent || sendingKey === key}
              onClick={() => void handleSend(item)}
              className="btn-danger shrink-0 px-3 py-1.5 text-xs disabled:opacity-70"
            >
              {sendingKey === key && <Spinner className="h-3.5 w-3.5 text-white" />}
              {sent ? 'Reminder sent' : 'Send Reminder'}
            </button>
          </li>
        );
      })}
    </ul>
  );
}
