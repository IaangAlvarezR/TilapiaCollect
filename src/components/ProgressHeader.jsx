import { useState } from 'react';

export function ProgressHeader({ users = [], allProgress = {}, cards = [], darkMode = false }) {
  const totalCards = cards.length;
  const [isProgressOpen, setIsProgressOpen] = useState(true);

  const panelClasses = darkMode
    ? 'border-slate-700 bg-slate-900 text-slate-100'
    : 'border-green-200 bg-white text-green-900';
  const softPanelClasses = darkMode
    ? 'border-slate-700 bg-slate-800/90'
    : 'border-green-200 bg-green-50/70';
  const headingTextClasses = darkMode ? 'text-slate-100' : 'text-green-800';
  const mutedTextClasses = darkMode ? 'text-slate-300' : 'text-green-700';
  const subtleTextClasses = darkMode ? 'text-slate-200' : 'text-green-900';
  const barTrackClasses = darkMode ? 'bg-slate-700' : 'bg-green-100';
  const badgeClasses = darkMode ? 'bg-emerald-700 text-emerald-50' : 'bg-green-100 text-green-700';

  const progressEntries = users
    .map((user) => {
      const userProgress = allProgress[user.uid] || {};
      const collected = cards.reduce((sum, card) => {
        const entry = userProgress[card.id];
        const count = typeof entry === 'number' ? entry : entry?.count || 0;

        return sum + (count > 0 ? 1 : 0);
      }, 0);

      const duplicateCards = cards
        .map((card) => {
          const entry = userProgress[card.id];
          const count = typeof entry === 'number' ? entry : entry?.count || 0;
          const cardNumber = (card.page - 1) * 9 + card.slot;

          return count > 1
            ? {
                id: card.id,
                label: `#${String(cardNumber).padStart(3, '0')}`,
                count,
              }
            : null;
        })
        .filter(Boolean);
      const duplicateTotal = duplicateCards.reduce((sum, card) => sum + card.count - 1, 0);
      const percentage = totalCards > 0 ? Math.round((collected / totalCards) * 100) : 0;

      return {
        uid: user.uid,
        name: user.name || 'Sin nombre',
        collected,
        percentage,
        duplicateCards,
        duplicateTotal,
      };
    })
    .sort((a, b) => b.percentage - a.percentage || b.collected - a.collected);

  return (
    <section className={`px-4 py-4 border-t ${panelClasses}`}>
      <div className="space-y-3">
        <button
          type="button"
          onClick={() => setIsProgressOpen((prev) => !prev)}
          className="flex w-full items-center justify-between gap-3 text-left"
          aria-expanded={isProgressOpen}
        >
          <h2 className={`text-sm font-black uppercase tracking-wide ${headingTextClasses}`}>
            Progreso de personas
          </h2>
          <div className="flex items-center gap-2">
            <span className={`text-[11px] ${mutedTextClasses}`}>
              {progressEntries.length} personas
            </span>
            <span className={`text-sm font-bold ${mutedTextClasses}`}>
              {isProgressOpen ? '▾' : '▸'}
            </span>
          </div>
        </button>

        {isProgressOpen && (
          <div className="space-y-2">
            {progressEntries.length === 0 ? (
              <p className={`text-sm ${mutedTextClasses}`}>
                Todavia no hay usuarios con progreso registrado.
              </p>
            ) : (
              progressEntries.map((entry) => (
                <div key={entry.uid} className={`rounded-xl border p-3 ${softPanelClasses}`}>
                  <div className="mb-1 flex items-center justify-between gap-2">
                    <span className={`text-sm font-semibold ${subtleTextClasses}`}>{entry.name}</span>
                    <span className={`text-xs font-bold ${mutedTextClasses}`}>
                      {entry.collected}/{totalCards} - {entry.percentage}%
                    </span>
                  </div>

                  <div className={`h-2 overflow-hidden rounded-full ${barTrackClasses}`}>
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-green-600 transition-all"
                      style={{ width: `${Math.min(entry.percentage, 100)}%` }}
                    />
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>

    </section>
  );
}
