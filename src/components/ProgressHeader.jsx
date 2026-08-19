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

      const percentage = totalCards > 0 ? Math.round((collected / totalCards) * 100) : 0;

      return {
        uid: user.uid,
        name: user.name || 'Sin nombre',
        collected,
        percentage,
      };
    })
    .sort((a, b) => b.percentage - a.percentage || b.collected - a.collected);

  return (
    <section className="px-4 py-3 bg-white border-t border-green-200 shadow-inner">
      <div className="flex items-center justify-between mb-2">
        <h2 className="text-xs font-black text-green-800 uppercase tracking-wide flex items-center gap-1.5">
          <span>👥</span> Progreso de miembros
        </h2>
        <span className="text-[10px] font-bold text-green-700 bg-green-100 px-2 py-0.5 rounded-full">
          {progressEntries.length} personas
        </span>
      </div>

      {progressEntries.length === 0 ? (
        <p className="text-xs text-green-700 py-1">Todavía no hay usuarios con progreso registrado.</p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
          {progressEntries.map((entry, index) => (
            <div
              key={entry.uid}
              className="rounded-xl border border-green-200 bg-green-50/70 px-3 py-2 flex flex-col justify-between transition-all hover:shadow-sm"
            >
              <div className="flex items-center justify-between gap-1 mb-1.5">
                <span className="text-xs font-bold text-green-900 truncate">
                  <span className="text-green-600 font-mono text-[10px] mr-1">#{index + 1}</span>
                  {entry.name}
                </span>
                <span className="text-[11px] font-black text-green-800 shrink-0">
                  {entry.percentage}% <span className="text-[9px] font-normal text-green-600">({entry.collected}/{totalCards})</span>
                </span>
              </div>

              <div className="h-1.5 rounded-full bg-green-200/60 overflow-hidden">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-green-600 transition-all duration-300"
                  style={{ width: `${Math.min(entry.percentage, 100)}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
