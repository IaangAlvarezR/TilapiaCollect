export function ProgressHeader({ users = [], allProgress = {}, cards = [] }) {
  const totalCards = cards.length;

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
    <section className="px-4 py-4 bg-white border-t border-green-200">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-sm font-black text-green-800 uppercase tracking-wide">
          Progreso de personas
        </h2>
        <span className="text-[11px] text-green-700">
          {progressEntries.length} personas
        </span>
      </div>

      <div className="space-y-2">
        {progressEntries.length === 0 ? (
          <p className="text-sm text-green-700">Todavia no hay usuarios con progreso registrado.</p>
        ) : (
          progressEntries.map((entry) => (
            <div key={entry.uid} className="rounded-xl border border-green-200 bg-green-50/70 p-3">
              <div className="flex items-center justify-between mb-1">
                <span className="text-sm font-semibold text-green-800">{entry.name}</span>
                <span className="text-xs font-bold text-green-700">
                  {entry.collected}/{totalCards} - {entry.percentage}%
                </span>
              </div>

              <div className="h-2 rounded-full bg-green-100 overflow-hidden">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-green-600 transition-all"
                  style={{ width: `${Math.min(entry.percentage, 100)}%` }}
                />
              </div>
            </div>
          ))
        )}
      </div>

      {progressEntries.length > 0 && (
        <div className="mt-4 rounded-xl border border-green-200 bg-green-50/70 p-3">
          <h3 className="mb-2 text-[11px] font-black uppercase tracking-wide text-green-800">
            Cartas duplicadas por persona
          </h3>

          <div className="space-y-2">
            {progressEntries.map((entry) => (
              <div key={`${entry.uid}-duplicates`} className="rounded-lg bg-white/80 p-2 border border-green-100">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-bold text-green-900 truncate">{entry.name}</span>
                  <span className="text-[11px] font-black text-green-700 shrink-0">
                    {entry.duplicateTotal} duplicadas
                  </span>
                </div>
                <p className="mt-1 text-[11px] leading-5 text-green-700">
                  {entry.duplicateCards.length > 0
                    ? entry.duplicateCards.map((card) => `${card.label} x${card.count}`).join(', ')
                    : 'Sin cartas duplicadas.'}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}
