import { useState, useEffect } from 'react';
import { ALBUM_CONFIG, SET_NAMES, generateAlbumData } from './config/albumConfig';
import { Card } from './components/Card';
import { AuthModal } from './components/AuthModal';
import { MissingCardFinder } from './components/MissingCardFinder';
import { AdminBoard } from './components/AdminBoard';
import {
  loadGeneralCards,
  loadTeamProgress,
  saveCardProgress,
  saveGeneralCard,
  loadUsers,
} from './services/albumStore';

const normalizeGeneralConfig = (pages = []) =>
  pages.map((page, index) => ({
    ...page,
    pageNumber: page.pageNumber ?? index + 1,
    setName: page.setName || SET_NAMES[index] || `Set ${index + 1}`,
    cards: Array.isArray(page.cards)
      ? page.cards.map((card, cardIndex) => ({
          ...card,
          page: card.page ?? index + 1,
          slot: card.slot ?? cardIndex + 1,
          name: card.name ?? `Foto ${cardIndex + 1}`,
        }))
      : [],
  }));

const SET_BACKGROUND_CLASSES = [
  'bg-sky-100/80',
  'bg-amber-100/80',
  'bg-violet-100/80',
  'bg-amber-100/80',
  'bg-sky-100/80',
  'bg-violet-100/80',
  'bg-emerald-100/80',
  'bg-sky-100/80',
  'bg-rose-100/80',
  'bg-orange-100/80',
  'bg-rose-100/80',
  'bg-violet-100/80',
  'bg-emerald-100/80',
  'bg-sky-100/80',
  'bg-violet-100/80',
];

export default function App() {
  const [generalConfig, setGeneralConfig] = useState(() => {
    const saved = localStorage.getItem('album_general_config');
    return saved ? normalizeGeneralConfig(JSON.parse(saved)) : generateAlbumData();
  });

  const [currentUser, setCurrentUser] = useState(() => {
    const saved = localStorage.getItem('album_current_user');
    return saved ? JSON.parse(saved) : null;
  });
  const [users, setUsers] = useState([]);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [summaryStatus, setSummaryStatus] = useState('');

  // Filters
  const [frameFilter, setFrameFilter] = useState('all'); // 'all', 'basic', 'gold'
  const [starFilter, setStarFilter] = useState('all'); // 'all', 1, 2, 3, 4, 5

  const [allProgress, setAllProgress] = useState(() => {
    const saved = localStorage.getItem('team_album_progress');
    return saved ? JSON.parse(saved) : {};
  });

  useEffect(() => {
    let isMounted = true;

    async function loadAlbumFromSupabase() {
      try {
        const [cardResult, progressResult, usersResult] = await Promise.allSettled([
          loadGeneralCards(),
          loadTeamProgress(),
          loadUsers(),
        ]);

        if (!isMounted) return;

        const cardRows = cardResult.status === 'fulfilled' ? cardResult.value : [];
        const savedProgress = progressResult.status === 'fulfilled' ? progressResult.value : null;
        const savedUsers = usersResult.status === 'fulfilled' ? usersResult.value : [];

        if (savedUsers.length > 0) {
          setUsers(savedUsers);
        }

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
                    }
                  : card;
              }),
            }))
          );
        }

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

  useEffect(() => {
    localStorage.setItem('album_general_config', JSON.stringify(generalConfig));
  }, [generalConfig]);

  useEffect(() => {
    localStorage.setItem('team_album_progress', JSON.stringify(allProgress));
  }, [allProgress]);

  useEffect(() => {
    if (currentUser) {
      localStorage.setItem('album_current_user', JSON.stringify(currentUser));
    } else {
      localStorage.removeItem('album_current_user');
    }
  }, [currentUser]);

  const handleUpdateCardConfig = (cardId, field, value) => {
    if (!currentUser?.is_admin) return;

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

  const handleToggleCard = (cardId, type, action = 'toggle') => {
    if (!currentUser) {
      setShowAuthModal(true);
      return;
    }

    setAllProgress((prev) => {
      const userState = prev[currentUser.uid] || {};
      const cardState = userState[cardId] || { count: 0 };
      const currentCount = cardState.count || cardState[type] || 0;

      let newCount = currentCount;
      if (action === 'add') newCount += 1;
      else if (action === 'sub') newCount = Math.max(0, currentCount - 1);
      else newCount = currentCount > 0 ? 0 : 1;

      const nextCardState = { count: newCount };

      saveCardProgress(currentUser.uid, cardId, newCount).catch((error) => {
        console.warn('No se pudo guardar el progreso en Supabase.', error.message);
      });

      return {
        ...prev,
        [currentUser.uid]: {
          ...userState,
          [cardId]: nextCardState,
        },
      };
    });
  };

  const isGeneralMode = currentUser?.is_admin || false;
  const currentUserProgress = currentUser ? (allProgress[currentUser.uid] || {}) : {};
  const allCards = generalConfig.flatMap((page) => page.cards);

  const handleGenerateSummary = async () => {
    const duplicateEntries = allCards
      .filter((card) => {
        const rawProgress = currentUserProgress[card.id];
        const progressType = card.defaultFrame === 'gold' ? 'goldCount' : 'basicCount';
        const count = typeof rawProgress === 'number'
          ? rawProgress
          : (rawProgress?.count || rawProgress?.[progressType] || 0);
        return count > 1;
      })
      .map((card) => {
        const rarity = card.defaultFrame === 'gold' ? 'GOLD' : '';
        const starIcon = '⭐';
        const cardNumber = (card.page - 1) * 9 + card.slot;
        const raritySuffix = rarity ? ` ${rarity}` : '';
        return `${cardNumber} (${card.stars} ${starIcon})${raritySuffix}`;
      });

    const summaryText = duplicateEntries.length > 0
      ? `FT:\n${duplicateEntries.join('\n')}`
      : 'No tienes cartas duplicadas.';

    try {
      await navigator.clipboard.writeText(summaryText);
      setSummaryStatus('Resumen copiado al portapapeles');
      window.setTimeout(() => setSummaryStatus(''), 2200);
    } catch (error) {
      console.warn('No se pudo copiar el resumen.', error);
      setSummaryStatus('No se pudo copiar');
      window.setTimeout(() => setSummaryStatus(''), 2200);
    }
  };

  return (
    <div className="min-h-screen bg-green-50 text-green-900 flex flex-col font-sans max-w-xl mx-auto border-x border-green-200 shadow-2xl">
      
      <header className="p-4 pt-6 bg-green-100 border-b border-green-200 sticky top-0 z-30">
        <div className="flex justify-between items-center mb-2">
          <h1 className="text-xl font-black text-green-800">
            {ALBUM_CONFIG.title}
          </h1>

          <div className="flex items-center gap-2">
            <button
              onClick={handleGenerateSummary}
              disabled={!currentUser}
              className={`text-xs px-3 py-1.5 rounded-full font-bold transition-all shadow-md ${
                currentUser
                  ? 'bg-emerald-600 text-white shadow-emerald-600/30 hover:bg-emerald-500'
                  : 'bg-gray-200 text-gray-500 cursor-not-allowed'
              }`}
            >
              Generar Texto Resumen
            </button>

            <button
              onClick={() => {
                if (currentUser) {
                  setCurrentUser(null);
                } else {
                  setShowAuthModal(true);
                }
              }}
              className={`text-xs px-3 py-1.5 rounded-full font-bold transition-all shadow-md ${
                currentUser
                  ? 'bg-green-600 text-white shadow-green-600/30'
                  : 'bg-white text-green-700 border border-green-300 hover:bg-green-50'
              }`}
            >
              {currentUser ? `🔓 ${currentUser.name}` : '🔒 Iniciar Sesión'}
            </button>
          </div>
        </div>
      </header>

      {summaryStatus && (
        <div className="px-4 py-2 bg-emerald-100 text-emerald-700 text-xs font-semibold border-b border-emerald-200">
          {summaryStatus}
        </div>
      )}

      <MissingCardFinder
        selectedUser={currentUser?.uid}
        cards={allCards}
        allProgress={allProgress}
        users={users}
      />

      <AdminBoard isAdmin={isGeneralMode} />

      {/* FILTROS */}
      <section className="px-4 py-3 bg-white border-b border-green-200 sticky top-[72px] z-20 shadow-sm">
        <div className="flex flex-col gap-3">
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-bold text-green-700 uppercase w-14">Rareza:</span>
            <div className="flex gap-2">
              {['all', 'basic', 'gold'].map((f) => (
                <button
                  key={f}
                  onClick={() => {
                    setFrameFilter(f);
                    if (f === 'gold') setStarFilter('all');
                  }}
                  className={`text-xs font-bold px-3 py-1 rounded-full transition-colors shadow-sm ${
                    frameFilter === f 
                      ? f === 'gold' ? 'bg-yellow-400 text-yellow-900' : 'bg-green-500 text-white'
                      : 'bg-green-50 text-green-700 border border-green-200 hover:bg-green-100'
                  }`}
                >
                  {f === 'all' ? 'Todas' : f === 'basic' ? 'Azules' : 'Doradas'}
                </button>
              ))}
            </div>
          </div>

          {frameFilter !== 'gold' && (
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-bold text-green-700 uppercase w-14">Estrellas:</span>
              <div className="flex gap-1 overflow-x-auto no-scrollbar">
                {['all', 1, 2, 3, 4, 5].map((s) => (
                  <button
                    key={s}
                    onClick={() => setStarFilter(s)}
                    className={`text-xs font-bold px-3 py-1 rounded-full transition-colors shadow-sm ${
                      starFilter === s 
                        ? 'bg-green-500 text-white'
                        : 'bg-green-50 text-green-700 border border-green-200 hover:bg-green-100'
                    }`}
                  >
                    {s === 'all' ? 'Cualquiera' : `${s} ★`}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </section>

      {/* RENDERIZADO DE CARTAS EN BLOQUES DE SETS */}
      <main className="flex-1 p-4 bg-green-50/50">
        {generalConfig.map((set, index) => {
          const filteredCards = set.cards.filter((card) => {
            if (frameFilter !== 'all' && card.defaultFrame !== frameFilter) return false;
            if (starFilter !== 'all' && card.stars !== starFilter) return false;
            return true;
          });

          if (filteredCards.length === 0) return null;

          const setBackgroundClass = SET_BACKGROUND_CLASSES[index % SET_BACKGROUND_CLASSES.length];

          return (
            <div key={set.pageNumber} className={`mb-8 rounded-2xl border border-white/70 p-3 shadow-sm ${setBackgroundClass}`}>
              <h2 className="text-xl font-black text-green-800 mb-4 pb-2 border-b border-white/70 flex items-center justify-between">
                <span>{`Set de ${set.setName}`}</span>
              </h2>
              <div className="grid grid-cols-3 gap-3">
                {filteredCards.map((card) => (
                  <Card
                    key={card.id}
                    cardData={card}
                    userProgress={currentUserProgress}
                    allProgress={allProgress}
                    users={users}
                    onToggleCard={handleToggleCard}
                    isGeneralMode={isGeneralMode}
                    onUpdateCardConfig={handleUpdateCardConfig}
                  />
                ))}
              </div>
            </div>
          );
        })}
      </main>

      {showAuthModal && (
        <AuthModal
          onAuthenticate={(user) => {
            if (user) {
              setCurrentUser(user);
              if (!users.find(u => u.uid === user.uid)) {
                setUsers(prev => [...prev, user]);
              }
            }
            setShowAuthModal(false);
          }}
          onClose={() => setShowAuthModal(false)}
        />
      )}
    </div>
  );
}
