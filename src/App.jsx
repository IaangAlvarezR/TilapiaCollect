import { useState, useEffect } from 'react';
import { ALBUM_CONFIG, generateAlbumData } from './config/albumConfig';
import { TEAM_MEMBERS } from './config/teamConfig';
import { PageSelector } from './components/PageSelector';
import { Card } from './components/Card';
import { AuthModal } from './components/AuthModal';
import { MissingCardFinder } from './components/MissingCardFinder';
import { StatsPanel } from './components/StatsPanel';
import {
  loadGeneralCards,
  loadPageImages,
  loadTeamProgress,
  saveCardProgress,
  saveGeneralCard,
  savePageImage,
  uploadAlbumImage,
} from './services/albumStore';


export default function App() {
  // 1. Estado global del Álbum (Estrellas y Marcos)
  const [generalConfig, setGeneralConfig] = useState(() => {
    const saved = localStorage.getItem('album_general_config');
    return saved ? JSON.parse(saved) : generateAlbumData();
  });

  const [pageImages, setPageImages] = useState(() => {
    const saved = localStorage.getItem('album_page_images');
    return saved ? JSON.parse(saved) : {};
  });
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedUser, setSelectedUser] = useState(null);
  const [pendingUser, setPendingUser] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);

  // 2. Estado de conteo/posesión por jugador
  const [allProgress, setAllProgress] = useState(() => {
    const saved = localStorage.getItem('team_album_progress');
    return saved ? JSON.parse(saved) : {};
  });

  useEffect(() => {
    let isMounted = true;

    async function loadAlbumFromSupabase() {
      try {
        const [cardResult, pageImageResult, progressResult] = await Promise.allSettled([
          loadGeneralCards(),
          loadPageImages(),
          loadTeamProgress(),
        ]);

        if (!isMounted) return;

        const cardRows = cardResult.status === 'fulfilled' ? cardResult.value : [];
        const savedPageImages =
          pageImageResult.status === 'fulfilled' ? pageImageResult.value : null;
        const savedProgress =
          progressResult.status === 'fulfilled' ? progressResult.value : null;

        if (cardRows.length > 0) {
          setGeneralConfig((prev) =>
            prev.map((page) => ({
              ...page,
              cards: page.cards.map((card) => {
                const row = cardRows.find((savedCard) => savedCard.id === card.id);
                return row
                  ? {
                      ...card,
                      name: row.name,
                      stars: row.stars,
                      defaultFrame: row.default_frame,
                      imageUrl: row.image_url || undefined,
                    }
                  : card;
              }),
            }))
          );
        }

        if (savedPageImages) setPageImages(savedPageImages);
        if (savedProgress) setAllProgress(savedProgress);
      } catch (error) {
        console.warn('No se pudo cargar Supabase; usando datos locales.', error.message);
      }
    }

    loadAlbumFromSupabase();

    return () => {
      isMounted = false;
    };
  }, []);

  // Persistir cambios
  useEffect(() => {
    localStorage.setItem('album_general_config', JSON.stringify(generalConfig));
  }, [generalConfig]);

  useEffect(() => {
    localStorage.setItem('team_album_progress', JSON.stringify(allProgress));
  }, [allProgress]);

  useEffect(() => {
    localStorage.setItem('album_page_images', JSON.stringify(pageImages));
  }, [pageImages]);

  // Actualizar atributos globales (Estrellas o Marco) desde pestaña General
  const handleUpdateCardConfig = (cardId, field, value) => {
    if (!isAuthenticated) {
      setPendingUser(selectedUser);
      setShowAuthModal(true);
      return;
    }

    const updatedCard = generalConfig
      .flatMap((page) => page.cards)
      .find((card) => card.id === cardId);

    const cardToSave = updatedCard ? { ...updatedCard, [field]: value } : null;

    setGeneralConfig((prev) =>
      prev.map((page) => ({
        ...page,
        cards: page.cards.map((card) =>
          card.id === cardId ? { ...card, [field]: value } : card
        ),
      }))
    );

    if (cardToSave) {
      saveGeneralCard(cardToSave).catch((error) => {
        console.warn('No se pudo guardar la carta en Supabase.', error.message);
      });
    }
  };

  const handleUploadCardImage = async (cardId, file) => {
    if (!isAuthenticated) {
      setPendingUser(selectedUser);
      setShowAuthModal(true);
      return;
    }

    const localPreviewUrl = URL.createObjectURL(file);
    setGeneralConfig((prev) =>
      prev.map((page) => ({
        ...page,
        cards: page.cards.map((card) =>
          card.id === cardId ? { ...card, imageUrl: localPreviewUrl } : card
        ),
      }))
    );

    try {
      const publicUrl = await uploadAlbumImage(file, 'cards');
      handleUpdateCardConfig(cardId, 'imageUrl', publicUrl);
    } catch (error) {
      console.warn('No se pudo subir la imagen a Supabase Storage.', error.message);
    }
  };

  // Añadir/Restar o marcar posesión en el álbum del jugador
  const handleToggleCard = (cardId, type, action = 'toggle') => {
    if (!isAuthenticated) {
      setPendingUser(selectedUser);
      setShowAuthModal(true);
      return;
    }

    setAllProgress((prev) => {
      const userState = prev[selectedUser] || {};
      const cardState = userState[cardId] || { count: 0 };
      const currentCount = cardState.count || cardState[type] || 0;

      let newCount = currentCount;
      if (action === 'add') newCount += 1;
      else if (action === 'sub') newCount = Math.max(0, currentCount - 1);
      else newCount = currentCount > 0 ? 0 : 1; // Modo Toggle por defecto

      const nextCardState = {
        count: newCount,
      };

      saveCardProgress(selectedUser, cardId, newCount).catch((error) => {
        console.warn('No se pudo guardar el progreso en Supabase.', error.message);
      });

      return {
        ...prev,
        [selectedUser]: {
          ...userState,
          [cardId]: nextCardState,
        },
      };
    });
  };

  const handleSelectAlbum = (memberId) => {
    setPendingUser(memberId);
    setShowAuthModal(true);
  };

  const isGeneralMode = selectedUser === 'general';
  const currentUserProgress = allProgress[selectedUser] || {};
  const allCards = generalConfig.flatMap((page) => page.cards);

  // 🔴 AQUÍ ESTÁ EL CAMBIO CLAVE:
  // Se leen las cartas directamente desde generalConfig para que los álbumes individuales
  // hereden las estrellas y el marco base que configuraste.
  const currentCards = selectedUser
    ? generalConfig.find((p) => p.pageNumber === currentPage)?.cards || []
    : [];

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100 flex flex-col font-sans max-w-lg mx-auto border-x border-gray-800 shadow-2xl">
      
      {/* Header */}
      <header className="p-4 pt-6 bg-gray-950 border-b border-gray-800 sticky top-0 z-20">
        <div className="flex justify-between items-center mb-3">
          <h1 className="text-lg font-black text-indigo-400">
            {ALBUM_CONFIG.title}
          </h1>

          <button
            onClick={() => selectedUser && !isAuthenticated && handleSelectAlbum(selectedUser)}
            className={`text-xs px-2.5 py-1 rounded-full font-bold transition-all ${
              isAuthenticated
                ? 'bg-green-500/20 text-green-400 border border-green-500/40'
                : 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/40'
            }`}
          >
            {isAuthenticated ? '🔓 Editando' : '🔒 Solo Lectura'}
          </button>
        </div>

        {/* Selector de Miembros */}
        <div className="flex gap-1.5 overflow-x-auto py-1 no-scrollbar">
          {TEAM_MEMBERS.map((member) => (
            <button
              key={member.id}
              onClick={() => handleSelectAlbum(member.id)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
                selectedUser === member.id
                  ? member.id === 'general'
                    ? 'bg-yellow-500 text-black shadow-lg shadow-yellow-500/20'
                    : 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/20'
                  : 'bg-gray-900 text-gray-400 border border-gray-800 hover:bg-gray-800'
              }`}
            >
              {member.name}
            </button>
          ))}
        </div>
      </header>

      {/* Paginación */}
      {!selectedUser && (
        <>
          <section className="px-4 py-5 text-center bg-gray-950">
            <h2 className="text-base font-black text-white mb-2">Dashboard del album</h2>
            <p className="text-xs text-gray-400">
              Resumen general del avance del equipo.
            </p>
          </section>
          <StatsPanel cards={allCards} allProgress={allProgress} />
          <section className="px-4 py-5 text-center border-b border-gray-800 bg-gray-950">
            <p className="text-xs text-gray-400">
              Selecciona General o un jugador e ingresa su PIN para entrar.
            </p>
          </section>
        </>
      )}

      {selectedUser && !isGeneralMode && (
        <MissingCardFinder
          selectedUser={selectedUser}
          cards={allCards}
          allProgress={allProgress}
        />
      )}

      {selectedUser && (
      <PageSelector
        totalPages={15}
        currentPage={currentPage}
        onSelectPage={setCurrentPage}
        pageImages={pageImages} // Estado con { 1: 'url', 2: 'url', ... }
        isGeneralMode={selectedUser === 'general'}
        onUpdatePageImage={async (page, file) => {
          if (!isAuthenticated) {
            setPendingUser(selectedUser);
            setShowAuthModal(true);
            return;
          }

          const localPreviewUrl = URL.createObjectURL(file);
          setPageImages(prev => ({ ...prev, [page]: localPreviewUrl }));

          try {
            const publicUrl = await uploadAlbumImage(file, 'pages');
            setPageImages(prev => ({ ...prev, [page]: publicUrl }));
            savePageImage(page, publicUrl).catch((error) => {
              console.warn('No se pudo guardar la imagen de pagina en Supabase.', error.message);
            });
          } catch (error) {
            console.warn('No se pudo subir la imagen de pagina.', error.message);
          }
        }}
      />
      )}

      {/* Grid 3x3 */}
      <main className="flex-1 p-4">
        <div className="grid grid-cols-3 gap-3">
          {currentCards.map((card) => (
            <Card
              key={card.id}
              cardData={card}
              userProgress={currentUserProgress}
              onToggleCard={handleToggleCard}
              isGeneralMode={isGeneralMode}
              onUpdateCardConfig={handleUpdateCardConfig}
              onUploadCardImage={handleUploadCardImage}
            />
          ))}
        </div>
      </main>

      {/* Modal de PIN */}
      {showAuthModal && (
        <AuthModal
          activeUser={pendingUser}
          onAuthenticate={(status) => {
            if (status) {
              setSelectedUser(pendingUser);
              setIsAuthenticated(true);
            }
            setShowAuthModal(false);
          }}
          onClose={() => {
            setShowAuthModal(false);
            setPendingUser(null);
          }}
        />
      )}
    </div>
  );
}
