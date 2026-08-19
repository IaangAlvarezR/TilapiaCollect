export function Card({
  cardData,
  userProgress,
  onToggleCard,
  isGeneralMode,
  onUpdateCardConfig,
  matchesFilter = true,
}) {
  const rawProgress = userProgress[cardData.id];
  const isGold = cardData.defaultFrame === 'gold';
  const progressType = isGold ? 'goldCount' : 'basicCount';
  const count = typeof rawProgress === 'number'
    ? rawProgress
    : (rawProgress?.count || rawProgress?.[progressType] || 0);
  const renderStars = (num) => "★".repeat(num) + "☆".repeat(5 - num);

  // 🔢 Cálculo del número global de carta (1 al 135)
  const globalCardNumber = (cardData.page - 1) * 9 + cardData.slot;

  const hasCard = count > 0;
  const fallbackLabel = String(globalCardNumber);
  const displayName = cardData.name && !/^Foto\s+\d+$/.test(cardData.name) ? cardData.name : fallbackLabel;

  return (
    <div className={`flex flex-col items-center bg-white p-2 rounded-2xl border border-green-200 shadow-sm ${matchesFilter ? '' : 'opacity-30 pointer-events-none'}`}>
      <div 
        className={`w-full aspect-[3/4] rounded-xl flex flex-col justify-between p-2 transition-all duration-300 text-center select-none relative overflow-hidden ${
          hasCard
            ? isGold
              ? 'border-4 border-yellow-400 bg-yellow-100 shadow-[0_0_15px_rgba(250,204,21,0.3)]'
              : 'border-4 border-blue-400 bg-blue-50 shadow-md'
            : 'border-2 border-dashed border-green-300 bg-green-50/50 opacity-60'
        }`}
      >
        <div className="relative z-10 flex flex-col justify-between h-full p-1 rounded-lg">
          {/* Estrellas */}
          <div className="flex justify-center items-center w-full">
            <div className="flex items-center gap-1 bg-amber-50/95 border border-amber-300/90 px-2.5 py-0.5 rounded-full shadow-sm">
              <span className="text-xs font-black text-amber-900 leading-none">
                {cardData.stars}
              </span>
              <div className="flex text-amber-500 text-xs leading-none">
                {Array.from({ length: cardData.stars || 1 }).map((_, i) => (
                  <span key={i} className="text-amber-500 drop-shadow-sm">★</span>
                ))}
              </div>
            </div>
          </div>
          
          <div className="flex-1 flex items-center justify-center">
            <h3 className={`text-sm sm:text-base font-black uppercase tracking-wider drop-shadow-sm break-words w-full px-1 truncate ${
              hasCard ? (isGold ? 'text-yellow-800' : 'text-blue-800') : 'text-green-600'
            }`}>
              {displayName}
            </h3>
          </div>
        </div>
      </div>

      {isGeneralMode && (
        <div className="mt-3 w-full rounded-2xl border border-green-200 bg-white/95 p-3 shadow-sm">
          <div className="mb-2 text-[10px] font-black uppercase tracking-wide text-green-700">
            Editar carta
          </div>
          <input
            type="text"
            value={cardData.name}
            onChange={(e) => onUpdateCardConfig(cardData.id, 'name', e.target.value)}
            className="w-full rounded border border-green-200 bg-green-50 px-2 py-2 text-[10px] font-bold text-center text-green-900 outline-none focus:border-green-400"
            placeholder="Nombre"
          />
            <div className="mt-3 flex flex-col gap-2">
            <div className="flex justify-center items-center gap-2">
              <button
                type="button"
                onClick={() => onUpdateCardConfig(cardData.id, 'stars', Math.max(1, (cardData.stars || 1) - 1))}
                className="rounded-lg px-2 py-1 text-sm bg-slate-100 text-slate-600"
                title="Disminuir estrellas"
              >
                -
              </button>
              <div className="text-sm font-black text-yellow-700">{(cardData.stars || 1)} ★</div>
              <button
                type="button"
                onClick={() => onUpdateCardConfig(cardData.id, 'stars', Math.min(5, (cardData.stars || 1) + 1))}
                className="rounded-lg px-2 py-1 text-sm bg-slate-100 text-slate-600"
                title="Aumentar estrellas"
              >
                +
              </button>
            </div>
            <div className="flex w-full gap-2">
              <button
                type="button"
                onClick={() => onUpdateCardConfig(cardData.id, 'defaultFrame', 'basic')}
                className={`flex-1 rounded-xl px-2 py-2 text-[10px] font-black uppercase ${
                  isGold ? 'text-blue-700 bg-blue-100' : 'text-blue-700 bg-blue-200/70'
                }`}
              >
                Azul
              </button>
              <button
                type="button"
                onClick={() => onUpdateCardConfig(cardData.id, 'defaultFrame', 'gold')}
                className={`flex-1 rounded-xl px-2 py-2 text-[10px] font-black uppercase ${
                  isGold ? 'text-yellow-900 bg-yellow-300' : 'text-yellow-700 bg-yellow-100'
                }`}
              >
                Oro
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Botones de incremento y decremento (+ / -) */}
      <div className="flex items-center justify-between w-full mt-2 bg-green-50 rounded-xl p-1 border border-green-200">
        <button
          onClick={() => onToggleCard(cardData.id, progressType, 'sub')}
          className="w-7 h-7 flex items-center justify-center bg-white text-green-600 border border-green-200 rounded-lg text-sm font-black active:scale-90 transition-all hover:bg-green-100 hover:text-green-800"
        >
          -
        </button>
        
        <span className={`text-xs font-black ${hasCard ? (isGold ? 'text-yellow-600' : 'text-blue-600') : 'text-green-800'}`}>
          {count}
        </span>

        <button
          onClick={() => onToggleCard(cardData.id, progressType, 'add')}
          className={`w-7 h-7 flex items-center justify-center rounded-lg text-sm font-black active:scale-90 transition-all shadow-sm ${
            isGold 
              ? 'bg-yellow-400 text-yellow-900 hover:bg-yellow-300' 
              : 'bg-blue-500 text-white hover:bg-blue-400'
          }`}
        >
          +
        </button>
      </div>
    </div>
  );
}
