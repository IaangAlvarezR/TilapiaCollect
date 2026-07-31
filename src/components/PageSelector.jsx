import { useRef } from 'react';

export function PageSelector({ 
  totalPages, 
  currentPage, 
  onSelectPage, 
  pageImages = {}, 
  isGeneralMode, 
  onUpdatePageImage 
}) {
  const fileInputRefs = useRef({});

  const handleImageUpload = (pageNumber, e) => {
    const file = e.target.files[0];
    if (file) {
      onUpdatePageImage(pageNumber, file);
    }
  };

  return (
    <div className="bg-gray-900 border-b border-gray-800 p-2.5">
      {/* Grid fijo de 5 columnas para mostrar las 15 páginas sin scroll */}
      <div className="grid grid-cols-5 gap-1.5 max-w-md mx-auto">
        {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => {
          const isSelected = currentPage === page;
          const pageImage = pageImages[page];

          return (
            <div key={page} className="relative group">
              <button
                onClick={() => onSelectPage(page)}
                className={`w-full aspect-square rounded-xl font-black transition-all flex flex-col items-center justify-center relative overflow-hidden border ${
                  isSelected
                    ? 'bg-gradient-to-br from-indigo-600 to-indigo-800 text-white border-indigo-400 shadow-md shadow-indigo-500/30 scale-105 z-10'
                    : 'bg-gray-800 text-gray-400 hover:bg-gray-750 border-gray-700/60'
                }`}
              >
                {/* Imagen de fondo de la página si existe */}
                {pageImage && (
                  <img
                    src={pageImage}
                    alt={`Página ${page}`}
                    className={`absolute inset-0 w-full h-full object-cover transition-opacity ${
                      isSelected ? 'opacity-40' : 'opacity-25 hover:opacity-40'
                    }`}
                  />
                )}

                <span className="relative z-10 text-[8px] uppercase tracking-tighter opacity-80 leading-none">
                  PÁG
                </span>
                <span className="relative z-10 text-sm font-extrabold leading-none mt-0.5">
                  {page}
                </span>
              </button>

              {/* Botón flotante para subir foto de página solo en Modo General */}
              {isGeneralMode && (
                <>
                  <button
                    onClick={() => fileInputRefs.current[page]?.click()}
                    className="absolute -top-1 -right-1 z-20 bg-indigo-500 text-white rounded-full w-4 h-4 flex items-center justify-center text-[9px] shadow hover:bg-indigo-400"
                    title={`Cambiar imagen de página ${page}`}
                  >
                    📷
                  </button>
                  <input
                    type="file"
                    ref={(el) => (fileInputRefs.current[page] = el)}
                    onChange={(e) => handleImageUpload(page, e)}
                    accept="image/*"
                    className="hidden"
                  />
                </>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
