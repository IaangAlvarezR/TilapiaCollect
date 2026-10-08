import { useState, useRef } from 'react';

const processImageFile = (file, callback) => {
  if (!file || !file.type.startsWith('image/')) return;
  const reader = new FileReader();
  reader.onload = (e) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      const MAX_WIDTH = 250;
      const MAX_HEIGHT = 330;
      let width = img.width;
      let height = img.height;

      if (width > height) {
        if (width > MAX_WIDTH) {
          height = Math.round((height * MAX_WIDTH) / width);
          width = MAX_WIDTH;
        }
      } else {
        if (height > MAX_HEIGHT) {
          width = Math.round((width * MAX_HEIGHT) / height);
          height = MAX_HEIGHT;
        }
      }

      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0, width, height);

      let dataUrl;
      try {
        dataUrl = canvas.toDataURL('image/webp', 0.80);
      } catch {
        dataUrl = canvas.toDataURL('image/jpeg', 0.80);
      }
      callback(dataUrl);
    };
    img.src = e.target.result;
  };
  reader.readAsDataURL(file);
};

export function Card({
  cardData,
  userProgress,
  onToggleCard,
  isGeneralMode,
  onUpdateCardConfig,
  matchesFilter = true,
}) {
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef(null);

  const rawProgress = userProgress[cardData.id];
  const isGold = cardData.defaultFrame === 'gold';
  const progressType = isGold ? 'goldCount' : 'basicCount';
  const count = typeof rawProgress === 'number'
    ? rawProgress
    : (rawProgress?.count || rawProgress?.[progressType] || 0);

  // 🔢 Cálculo del número global de carta (1 al 135)
  const globalCardNumber = (cardData.page - 1) * 9 + cardData.slot;

  const hasCard = count > 0;
  const fallbackLabel = String(globalCardNumber);
  const displayName = cardData.name && !/^Foto\s+\d+$/.test(cardData.name) ? cardData.name : fallbackLabel;

  // Manejo de Arrastrar y Soltar imagen
  const handleDragOver = (e) => {
    if (!isGeneralMode) return;
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(true);
  };

  const handleDragLeave = (e) => {
    if (!isGeneralMode) return;
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
  };

  const handleDrop = (e) => {
    if (!isGeneralMode) return;
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);

    const file = e.dataTransfer.files?.[0];
    if (file) {
      processImageFile(file, (dataUrl) => {
        onUpdateCardConfig(cardData.id, 'imageUrl', dataUrl);
      });
    }
  };

  // Manejo de Pegar imagen (Ctrl + V)
  const handlePaste = (e) => {
    if (!isGeneralMode) return;
    const items = e.clipboardData?.items;
    if (!items) return;

    for (let i = 0; i < items.length; i++) {
      if (items[i].type.indexOf('image') !== -1) {
        const file = items[i].getAsFile();
        if (file) {
          processImageFile(file, (dataUrl) => {
            onUpdateCardConfig(cardData.id, 'imageUrl', dataUrl);
          });
          e.preventDefault();
          break;
        }
      }
    }
  };

  const handleFileInputChange = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      processImageFile(file, (dataUrl) => {
        onUpdateCardConfig(cardData.id, 'imageUrl', dataUrl);
      });
    }
  };

  return (
    <div
      tabIndex={isGeneralMode ? 0 : undefined}
      onPaste={handlePaste}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      className={`flex flex-col items-center bg-stone-900/90 p-2 rounded-2xl border transition-all relative group outline-none ${
        isDragOver
          ? 'border-amber-400 ring-2 ring-amber-400 bg-amber-950/70 scale-105 z-20'
          : 'border-orange-900/60 hover:border-orange-600/70'
      } shadow-md ${matchesFilter ? '' : 'opacity-25 pointer-events-none'}`}
    >
      {/* Marco de la Carta */}
      <div 
        className={`w-full aspect-[3/4] rounded-xl flex flex-col justify-between p-2 transition-all duration-300 text-center select-none relative overflow-hidden ${
          hasCard
            ? isGold
              ? 'border-4 border-amber-400 bg-gradient-to-b from-amber-950/90 via-stone-900 to-amber-950/90 shadow-[0_0_16px_rgba(245,158,11,0.35)]'
              : 'border-4 border-cyan-400 bg-gradient-to-b from-cyan-950/80 via-stone-900 to-blue-950/80 shadow-[0_0_14px_rgba(34,211,238,0.25)]'
            : 'border-2 border-dashed border-orange-950/80 bg-stone-950/70 opacity-60'
        }`}
      >
        {/* Imagen de fondo de la carta (si existe) */}
        {cardData.imageUrl && (
          <img
            src={cardData.imageUrl}
            alt={displayName}
            className="absolute inset-0 w-full h-full object-cover object-center pointer-events-none transition-transform duration-300 group-hover:scale-105"
          />
        )}

        {/* Degradado oscuro para legibilidad si hay imagen */}
        {cardData.imageUrl && (
          <div className="absolute inset-0 bg-gradient-to-b from-stone-950/75 via-transparent to-stone-950/90 pointer-events-none" />
        )}

        {/* Overlay cuando se está arrastrando una foto */}
        {isDragOver && (
          <div className="absolute inset-0 bg-amber-950/90 z-20 flex flex-col items-center justify-center p-2 text-center">
            <span className="text-2xl animate-bounce">📥</span>
            <span className="text-[10px] font-black text-amber-200 uppercase">Suelta la foto</span>
          </div>
        )}

        {/* Contenido frontal de la carta */}
        <div className="relative z-10 flex flex-col justify-between h-full p-1 rounded-lg">
          {/* Estrellas */}
          <div className="flex justify-center items-center w-full">
            <div className="flex items-center gap-1 bg-stone-950/90 border border-amber-500/70 px-2.5 py-0.5 rounded-full shadow-sm">
              <span className="text-xs font-black text-amber-300 leading-none">
                {cardData.stars}
              </span>
              <div className="flex text-amber-400 text-xs leading-none">
                {Array.from({ length: cardData.stars || 1 }).map((_, i) => (
                  <span key={i} className="text-amber-400 drop-shadow-sm">★</span>
                ))}
              </div>
            </div>
          </div>
          
          {/* Nombre / Número */}
          <div className="flex-1 flex items-center justify-center">
            <h3 className={`text-sm sm:text-base font-black uppercase tracking-wider drop-shadow-md break-words w-full px-1 truncate ${
              hasCard 
                ? (isGold ? 'text-amber-200' : 'text-cyan-200') 
                : 'text-stone-400'
            }`}>
              {displayName}
            </h3>
          </div>
        </div>
      </div>

      {/* Panel de Edición General (Vaiu / Admin) */}
      {isGeneralMode && (
        <div className="mt-3 w-full rounded-2xl border border-orange-900/60 bg-stone-950 p-2.5 shadow-sm">
          <div className="mb-1 text-[10px] font-black uppercase tracking-wide text-orange-400 flex items-center justify-between">
            <span>✏️ Editar carta</span>
            <span className="text-[9px] text-amber-400/80 font-normal">Pega o arrastra 🖼️</span>
          </div>
          <input
            type="text"
            value={cardData.name}
            onChange={(e) => onUpdateCardConfig(cardData.id, 'name', e.target.value)}
            className="w-full rounded border border-orange-900 bg-stone-900 px-2 py-1 text-[10px] font-bold text-center text-orange-100 outline-none focus:border-orange-500"
            placeholder="Nombre"
          />
          <div className="mt-2 flex flex-col gap-1.5">
            <div className="flex justify-center items-center gap-2">
              <button
                type="button"
                onClick={() => onUpdateCardConfig(cardData.id, 'stars', Math.max(1, (cardData.stars || 1) - 1))}
                className="rounded-lg px-2 py-0.5 text-xs bg-stone-900 text-stone-300 border border-stone-800 hover:bg-stone-800"
                title="Disminuir estrellas"
              >
                -
              </button>
              <div className="text-xs font-black text-amber-300">{(cardData.stars || 1)} ★</div>
              <button
                type="button"
                onClick={() => onUpdateCardConfig(cardData.id, 'stars', Math.min(5, (cardData.stars || 1) + 1))}
                className="rounded-lg px-2 py-0.5 text-xs bg-stone-900 text-stone-300 border border-stone-800 hover:bg-stone-800"
                title="Aumentar estrellas"
              >
                +
              </button>
            </div>
            <div className="flex w-full gap-1.5">
              <button
                type="button"
                onClick={() => onUpdateCardConfig(cardData.id, 'defaultFrame', 'basic')}
                className={`flex-1 rounded-lg px-1.5 py-1 text-[10px] font-black uppercase border ${
                  isGold 
                    ? 'text-cyan-400 bg-cyan-950/40 border-cyan-900/60' 
                    : 'text-cyan-200 bg-cyan-900/80 border-cyan-500'
                }`}
              >
                Azul
              </button>
              <button
                type="button"
                onClick={() => onUpdateCardConfig(cardData.id, 'defaultFrame', 'gold')}
                className={`flex-1 rounded-lg px-1.5 py-1 text-[10px] font-black uppercase border ${
                  isGold 
                    ? 'text-amber-200 bg-amber-900/80 border-amber-500' 
                    : 'text-amber-400 bg-amber-950/40 border-amber-900/60'
                }`}
              >
                Oro
              </button>
            </div>

            {/* Opciones de Imagen: Subir archivo o Quitar */}
            <div className="flex gap-1 pt-1 border-t border-orange-950">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileInputChange}
                className="hidden"
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="flex-1 rounded-lg bg-orange-950/80 hover:bg-orange-900 text-orange-200 border border-orange-800/80 py-1 text-[9px] font-black"
                title="Subir archivo de imagen"
              >
                📷 {cardData.imageUrl ? 'Cambiar' : 'Subir'}
              </button>
              {cardData.imageUrl && (
                <button
                  type="button"
                  onClick={() => onUpdateCardConfig(cardData.id, 'imageUrl', null)}
                  className="rounded-lg bg-red-950/60 hover:bg-red-900 text-red-300 border border-red-800/80 px-2 py-1 text-[9px] font-black"
                  title="Quitar imagen actual"
                >
                  🗑️
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Botones de incremento y decremento (+ / -) */}
      <div className="flex items-center justify-between w-full mt-2 bg-stone-950 rounded-xl p-1 border border-orange-900/60">
        <button
          onClick={() => onToggleCard(cardData.id, progressType, 'sub')}
          className="w-7 h-7 flex items-center justify-center bg-stone-900 text-orange-300 border border-orange-900/60 rounded-lg text-sm font-black active:scale-90 transition-all hover:bg-orange-950 hover:text-amber-200"
          title="Restar 1"
        >
          -
        </button>
        
        <span className={`text-xs font-black ${
          hasCard 
            ? (isGold ? 'text-amber-400' : 'text-cyan-400') 
            : 'text-stone-500'
        }`}>
          {count}
        </span>

        <button
          onClick={() => onToggleCard(cardData.id, progressType, 'add')}
          className={`w-7 h-7 flex items-center justify-center rounded-lg text-sm font-black active:scale-90 transition-all shadow-md ${
            isGold 
              ? 'bg-gradient-to-r from-amber-500 to-yellow-500 text-stone-950 hover:from-amber-400 hover:to-yellow-400 shadow-amber-950/60' 
              : 'bg-gradient-to-r from-cyan-600 to-blue-600 text-white hover:from-cyan-500 hover:to-blue-500 shadow-cyan-950/60'
          }`}
          title="Sumar 1"
        >
          +
        </button>
      </div>
    </div>
  );
}

