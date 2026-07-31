import { useRef } from 'react';

export function Card({
  cardData,
  userProgress,
  onToggleCard,
  isGeneralMode,
  onUpdateCardConfig,
  onUploadCardImage,
}) {
  const fileInputRef = useRef(null);

  const rawProgress = userProgress[cardData.id];
  const isGold = cardData.defaultFrame === 'gold';
  const progressType = isGold ? 'goldCount' : 'basicCount';
  const count = typeof rawProgress === 'number'
    ? rawProgress
    : (rawProgress?.count || rawProgress?.[progressType] || 0);
  const renderStars = (num) => "★".repeat(num) + "☆".repeat(5 - num);

  // 🔢 Cálculo del número global de carta (1 al 135)
  const globalCardNumber = (cardData.page - 1) * 9 + cardData.slot;

  const handleImageUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      onUploadCardImage(cardData.id, file);
    }
  };

  // 1. MODO CONFIGURACIÓN GENERAL
  if (isGeneralMode) {
    return (
      <div className="flex flex-col items-center bg-gray-900 p-2 rounded-2xl border-2 border-indigo-500/40 shadow-md">
        <span className="text-[10px] font-mono font-bold text-indigo-400 mb-1">
          EDITAR #{String(globalCardNumber).padStart(3, '0')}
        </span>

        <div className="w-full aspect-[3/4] rounded-xl border border-gray-700 bg-gray-800 flex flex-col justify-between p-2 text-center relative overflow-hidden">
          {cardData.imageUrl ? (
            <img 
              src={cardData.imageUrl} 
              alt={cardData.name} 
              className="absolute inset-0 w-full h-full object-cover rounded-xl opacity-80"
            />
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-gray-500 gap-1">
              <span className="text-xl">📷</span>
              <span className="text-[9px]">Sin foto</span>
            </div>
          )}

          <div className="relative z-10 flex flex-col justify-between h-full bg-gray-950/75 p-1.5 rounded-lg backdrop-blur-[2px]">
            <input 
              type="text" 
              value={cardData.name} 
              onChange={(e) => onUpdateCardConfig(cardData.id, 'name', e.target.value)}
              className="bg-gray-900/90 text-white text-[10px] font-bold text-center rounded border border-gray-700 px-1 py-0.5"
            />

            <div className="flex justify-center gap-0.5">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  onClick={() => onUpdateCardConfig(cardData.id, 'stars', star)}
                  className={`text-xs ${star <= cardData.stars ? 'text-yellow-400' : 'text-gray-600'}`}
                >
                  ★
                </button>
              ))}
            </div>

            <button
              onClick={() => fileInputRef.current.click()}
              className="bg-indigo-600/90 text-white text-[9px] py-1 rounded font-bold hover:bg-indigo-500 transition-all"
            >
              📷 Subir Foto
            </button>
            <input 
              type="file" 
              ref={fileInputRef} 
              onChange={handleImageUpload} 
              accept="image/*" 
              className="hidden" 
            />

            <button
              onClick={() => onUpdateCardConfig(cardData.id, 'defaultFrame', isGold ? 'basic' : 'gold')}
              className={`py-0.5 text-[8px] font-black rounded uppercase ${
                isGold ? 'bg-yellow-500 text-black' : 'bg-blue-600 text-white'
              }`}
            >
              {isGold ? 'Dorado' : 'Azul'}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // 2. MODO JUGADOR INDIVIDUAL
  const hasCard = count > 0;

  return (
    <div className="flex flex-col items-center bg-gray-900 p-2 rounded-2xl border border-gray-800 shadow-inner">
      <div 
        className={`w-full aspect-[3/4] rounded-xl flex flex-col justify-between p-2 transition-all duration-300 text-center select-none relative overflow-hidden ${
          hasCard
            ? isGold
              ? 'border-4 border-yellow-400 bg-yellow-950/40 shadow-[0_0_15px_rgba(250,204,21,0.3)]'
              : 'border-4 border-blue-500 bg-blue-950/40 shadow-md'
            : 'border-2 border-dashed border-gray-700 bg-gray-800/30 opacity-40'
        }`}
      >
        {cardData.imageUrl && (
          <img 
            src={cardData.imageUrl} 
            alt={cardData.name} 
            className={`absolute inset-0 w-full h-full object-cover ${hasCard ? 'opacity-100' : 'opacity-20 grayscale'}`}
          />
        )}

        <div className="relative z-10 flex flex-col justify-between h-full bg-gradient-to-b from-gray-950/80 via-transparent to-gray-950/90 p-1 rounded-lg">
          {/* Número global de 1 a 135 */}
          <span className="text-[10px] font-mono font-extrabold text-gray-200 self-start bg-gray-950/70 px-1.5 py-0.5 rounded border border-gray-700/50">
            #{String(globalCardNumber).padStart(3, '0')}
          </span>
          
          <div className="text-yellow-400 text-[10px] tracking-wider drop-shadow bg-gray-950/70 rounded-md px-1 py-0.5">
            {renderStars(cardData.stars)}
          </div>
        </div>
      </div>

      {/* Botones de incremento y decremento (+ / -) */}
      <div className="flex items-center justify-between w-full mt-2 bg-gray-800 rounded-xl p-1 border border-gray-700">
        <button
          onClick={() => onToggleCard(cardData.id, progressType, 'sub')}
          className="w-7 h-7 flex items-center justify-center bg-gray-700 text-gray-300 rounded-lg text-sm font-black active:scale-90 transition-all hover:bg-gray-600"
        >
          -
        </button>
        
        <span className={`text-xs font-black ${isGold ? 'text-yellow-400' : 'text-blue-400'}`}>
          {count}
        </span>

        <button
          onClick={() => onToggleCard(cardData.id, progressType, 'add')}
          className={`w-7 h-7 flex items-center justify-center rounded-lg text-sm font-black active:scale-90 transition-all ${
            isGold 
              ? 'bg-yellow-500 text-black hover:bg-yellow-400' 
              : 'bg-blue-600 text-white hover:bg-blue-500'
          }`}
        >
          +
        </button>
      </div>
    </div>
  );
}
