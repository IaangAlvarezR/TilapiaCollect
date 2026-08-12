import { useState, useEffect, useRef } from 'react';
import { ALBUM_CONFIG, SET_NAMES, generateAlbumData } from './config/albumConfig';
import { Card } from './components/Card';
import { AuthModal } from './components/AuthModal';
import { MissingCardFinder } from './components/MissingCardFinder';
import { AdminBoard } from './components/AdminBoard';
import { ProgressHeader } from './components/ProgressHeader';
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
  const [bulkTradeText, setBulkTradeText] = useState('');
  const [bulkLookingForText, setBulkLookingForText] = useState('');
  const [bulkImportStatus, setBulkImportStatus] = useState('');
  const [isBulkImporting, setIsBulkImporting] = useState(false);
  const [darkMode, setDarkMode] = useState(() => {
    const saved = localStorage.getItem('album_dark_mode');
    return saved === '1';
  });
  const headerRef = useRef(null);
  const [headerOffset, setHeaderOffset] = useState(0);

  // Filters
  const [frameFilter, setFrameFilter] = useState('all'); // 'all', 'basic', 'gold'
  const [starFilter, setStarFilter] = useState('all'); // 'all', 1, 2, 3, 4, 5
  const [activeSetIndex, setActiveSetIndex] = useState(0);

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
    try {
      if (darkMode) document.documentElement.classList.add('tt-dark');
      else document.documentElement.classList.remove('tt-dark');
      localStorage.setItem('album_dark_mode', darkMode ? '1' : '0');
    } catch (err) {
      console.warn('No se pudo aplicar modo oscuro', err);
    }
  }, [darkMode]);

  useEffect(() => {
    const updateHeader = () => {
      try {
        const h = headerRef.current ? headerRef.current.offsetHeight : 72;
        setHeaderOffset(h);
      } catch {
        setHeaderOffset(72);
      }
    };

    updateHeader();
    window.addEventListener('resize', updateHeader);
    return () => window.removeEventListener('resize', updateHeader);
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
  const completedCards = Object.values(currentUserProgress).reduce((sum, entry) => {
    const count = typeof entry === 'number' ? entry : entry?.count || 0;
    return sum + count;
  }, 0);
  const progressPercentage = allCards.length > 0 ? Math.round((completedCards / allCards.length) * 100) : 0;
  const totalSetPages = generalConfig.length;
  const safeActiveSetIndex = Math.min(activeSetIndex, Math.max(totalSetPages - 1, 0));
  const activeSet = generalConfig[safeActiveSetIndex];
  const goToSet = (index) => {
    setActiveSetIndex(Math.min(Math.max(index, 0), Math.max(totalSetPages - 1, 0)));
  };
  const matchesFilter = (card) => {
    if (frameFilter !== 'all' && card.defaultFrame !== frameFilter) return false;
    if (starFilter !== 'all' && card.stars !== starFilter) return false;
    return true;
  };
  const activeSetMatchingCards = activeSet?.cards.filter(matchesFilter).length || 0;
  const getCardNumber = (card) => (card.page - 1) * ALBUM_CONFIG.cardsPerPage + card.slot;

  const parseBulkCardNumbers = (text, { allowQuantity = false } = {}) => {
    const entries = new Map();
    const invalidNumbers = [];
    const pattern = /#?(\d{1,3})(?:\s*[xX]\s*(\d+))?/g;
    let match;

    while ((match = pattern.exec(text || '')) !== null) {
      const number = Number(match[1]);
      const quantity = allowQuantity ? Math.max(1, Number(match[2] || 1)) : 1;

      if (!Number.isInteger(number) || number < 1 || number > allCards.length) {
        invalidNumbers.push(match[1]);
        continue;
      }

      entries.set(number, (entries.get(number) || 0) + quantity);
    }

    return { entries, invalidNumbers };
  };
  
  const handleBulkImport = async () => {
  if (!currentUser) {
    setShowAuthModal(true);
    return;
  }
  const confirmApply = window.confirm(
    '¿Estás seguro de que deseas aplicar la carga rápida? Esto sobrescribirá el estado actual de tus cartas.'
  );
  if (!confirmApply) return;

    const tradeResult = parseBulkCardNumbers(bulkTradeText, { allowQuantity: true });
    const lookingForResult = parseBulkCardNumbers(bulkLookingForText);
    const tradeNumbers = tradeResult.entries;
    const lookingForNumbers = lookingForResult.entries;
    const overlappingNumbers = [...tradeNumbers.keys()].filter((number) => lookingForNumbers.has(number));
    const invalidNumbers = [...tradeResult.invalidNumbers, ...lookingForResult.invalidNumbers];

    if (overlappingNumbers.length > 0) {
      setBulkImportStatus(`Revisa estos numeros: ${overlappingNumbers.join(', ')} estan en FT y LF.`);
      return;
    }

    if (invalidNumbers.length > 0) {
      setBulkImportStatus(`Hay numeros fuera del album: ${invalidNumbers.join(', ')}.`);
      return;
    }

    setIsBulkImporting(true);
    setBulkImportStatus('Aplicando carga rapida...');

    const nextUserProgress = allCards.reduce((progress, card) => {
      const number = getCardNumber(card);
      const extraTradeCopies = tradeNumbers.get(number) || 0;
      const count = lookingForNumbers.has(number) ? 0 : extraTradeCopies + 1;

      return {
        ...progress,
        [card.id]: { count },
      };
    }, {});

    setAllProgress((prev) => ({
      ...prev,
      [currentUser.uid]: nextUserProgress,
    }));

    try {
      await Promise.all(
        allCards.map((card) => saveCardProgress(currentUser.uid, card.id, nextUserProgress[card.id].count))
      );
      setBulkImportStatus(`Carga lista: ${tradeNumbers.size} FT y ${lookingForNumbers.size} LF aplicados.`);
    } catch (error) {
      console.warn('No se pudo guardar la carga rapida en Supabase.', error.message);
      setBulkImportStatus('Se aplico localmente, pero no se pudo guardar todo en Supabase.');
    } finally {
      setIsBulkImporting(false);
      window.setTimeout(() => setBulkImportStatus(''), 4200);
    }
  };

  const renderSetPagination = () => (
    <div className="rounded-2xl border border-green-200 bg-white p-3 shadow-sm">
      <div className="mb-3 flex items-center justify-between gap-3">
        <button
          type="button"
          onClick={() => goToSet(safeActiveSetIndex - 1)}
          disabled={safeActiveSetIndex === 0}
          className={`rounded-xl px-3 py-2 text-xs font-black transition-colors ${
            safeActiveSetIndex === 0
              ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
              : 'bg-green-100 text-green-800 hover:bg-green-200'
          }`}
        >
          Anterior
        </button>
        <div className="text-center">
          <p className="text-[10px] font-black uppercase tracking-wide text-green-700">
            Seccion {safeActiveSetIndex + 1} de {totalSetPages}
          </p>
          <p className="text-xs font-bold text-green-900">
            {activeSet ? `Set de ${activeSet.setName}` : 'Sin secciones'}
          </p>
        </div>
        <button
          type="button"
          onClick={() => goToSet(safeActiveSetIndex + 1)}
          disabled={safeActiveSetIndex >= totalSetPages - 1}
          className={`rounded-xl px-3 py-2 text-xs font-black transition-colors ${
            safeActiveSetIndex >= totalSetPages - 1
              ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
              : 'bg-green-100 text-green-800 hover:bg-green-200'
          }`}
        >
          Siguiente
        </button>
      </div>

      <div className="grid grid-cols-5 gap-2">
        {generalConfig.map((set, index) => (
          <button
            key={set.pageNumber}
            type="button"
            onClick={() => goToSet(index)}
            className={`h-9 rounded-lg text-xs font-black transition-colors ${
              safeActiveSetIndex === index
                ? 'bg-green-600 text-white shadow-sm'
                : 'bg-green-50 text-green-800 border border-green-200 hover:bg-green-100'
            }`}
            title={`Set de ${set.setName}`}
          >
            {index + 1}
          </button>
        ))}
      </div>
    </div>
  );

  const handleGenerateSummary = async () => {
    if (currentUser) {
      const getCardCount = (card) => {
        const rawProgress = currentUserProgress[card.id];
        const progressType = card.defaultFrame === 'gold' ? 'goldCount' : 'basicCount';

        return typeof rawProgress === 'number'
          ? rawProgress
          : (rawProgress?.count || rawProgress?.[progressType] || 0);
      };
      const getCardNumber = (card) => (card.page - 1) * ALBUM_CONFIG.cardsPerPage + card.slot;
      const getRarityLabel = (card) => card.defaultFrame === 'gold' ? 'Gold' : 'Blue';
      const getCardLabel = (entry) => {
        const number = `${String(getCardNumber(entry.card))}`;
        return entry.quantity > 1 ? `${number} x${entry.quantity}` : number;
      };
      const groupByType = (entries) =>
        entries.reduce((groups, entry) => {
          const key = `${entry.card.stars || 0}-${entry.card.defaultFrame}`;
          const label = ` ${entry.card.stars || 0}★·${getRarityLabel(entry.card)}`;

          return {
            ...groups,
            [key]: {
              label,
              stars: entry.card.stars || 0,
              rarityOrder: entry.card.defaultFrame === 'gold' ? 1 : 0,
              entries: [...(groups[key]?.entries || []), entry],
            },
          };
        }, {});
      const renderGroupedEntries = (entries, emptyText) => {
        if (entries.length === 0) return [`- ${emptyText}`];

        return Object.values(groupByType(entries))
          .sort((a, b) => a.stars - b.stars || a.rarityOrder - b.rarityOrder)
          .map((group) => {
            const cards = group.entries
              .sort((a, b) => getCardNumber(a.card) - getCardNumber(b.card))
              .map(getCardLabel)
              .join(', ');

            return `- ${cards} - ${group.label}`;
          });
      };

      const cardEntries = allCards.map((card) => ({ card, count: getCardCount(card) }));
      const duplicateEntries = cardEntries
        .filter((entry) => entry.count > 1)
        .map((entry) => ({ ...entry, quantity: entry.count - 1 }));
      const missingEntries = cardEntries
        .filter((entry) => entry.count === 0)
        .map((entry) => ({ ...entry, quantity: 1 }));
      const collectedUniqueTotal = allCards.length - missingEntries.length;
      const uniquePercentage = allCards.length > 0 ? Math.round((collectedUniqueTotal / allCards.length) * 100) : 0;

      const summaryText = [
        '**Tilapia Tools**',
        `Jugador: ${currentUser.name}`,
        `UID: ${currentUser.uid}`,
        '',
        `Avance: ${collectedUniqueTotal}/${allCards.length} cartas (${uniquePercentage}%)`,
        '**For Trade**',
        ...renderGroupedEntries(duplicateEntries, 'Sin duplicadas por ahora.'),
        '',
        '**Looking For**',
        ...renderGroupedEntries(missingEntries, 'Album completo.'),
      ].join('\n');

      try {
        await navigator.clipboard.writeText(summaryText);
        setSummaryStatus('Resumen detallado copiado al portapapeles');
        window.setTimeout(() => setSummaryStatus(''), 2200);
      } catch (error) {
        console.warn('No se pudo copiar el resumen.', error);
        setSummaryStatus('No se pudo copiar');
        window.setTimeout(() => setSummaryStatus(''), 2200);
      }

      return;
    }

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
      
      <header ref={headerRef} className="p-4 pt-6 bg-green-100 border-b border-green-200 sticky top-0 z-30">
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
              onClick={() => setDarkMode((v) => !v)}
              className="text-xs px-3 py-1.5 rounded-full font-bold transition-all shadow-md bg-white text-green-700 border border-green-300 hover:bg-green-50"
              title="Toggle dark mode"
            >
              {darkMode ? '🌙 Dark' : '🌞 Light'}
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

      <section className="px-4 py-4 bg-white border-b border-green-200 shadow-sm">
        <div className="flex items-start justify-between gap-3 mb-3">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-green-700">
              Resumen de tu colección
            </p>
            <h2 className="text-base font-black text-green-800">
              {currentUser ? `Hola, ${currentUser.name}` : 'Inicia sesión para seguir tu progreso'}
            </h2>
          </div>
          <div className="rounded-2xl bg-green-100 px-3 py-2 text-right min-w-[92px]">
            <p className="text-[10px] font-bold uppercase text-green-700">Avance</p>
            <p className="text-lg font-black text-green-800">{progressPercentage}%</p>
          </div>
        </div>

        <div className="flex items-center justify-between text-sm text-green-700">
          <span>{completedCards} cartas marcadas</span>
          <span>{allCards.length} cartas totales</span>
        </div>
      </section>

      <section className="px-4 py-3 bg-green-50/60 border-b border-green-200">
        <div className="space-y-3">
          <MissingCardFinder
            selectedUser={currentUser?.uid}
            cards={allCards}
            allProgress={allProgress}
            users={users}
          />

          <section className="px-4 py-4 bg-green-50/50">
            <div className="max-w-md mx-auto bg-white border border-green-200 rounded-lg p-3 shadow-sm">
              <div className="mb-3 flex items-start justify-between gap-3">
                <div>
                  <h2 className="text-sm font-black text-green-800">Carga rapida de album</h2>
                  <p className="text-[11px] text-green-600">
                    Pega tus duplicadas (FT) y/o las que te faltan (LF). El album se llenara en automatico para que no ingreses uno a uno.
                  </p>
                </div>
                <span className="rounded-full bg-green-100 px-2 py-1 text-[10px] font-black text-green-700">
                  {allCards.length} cartas
                </span>
              </div>

              <div className="grid gap-3">
                <label className="block">
                  <span className="mb-1 block text-[10px] font-black uppercase tracking-wide text-green-700">
                    For Trade
                  </span>
                  <textarea
                    value={bulkTradeText}
                    onChange={(event) => setBulkTradeText(event.target.value)}
                    rows="3"
                    placeholder="Pega tus duplicadas aquí (Ej: #004, #018 x2)"
                    className="w-full resize-y rounded-xl border border-green-200 bg-green-50 px-3 py-2 text-xs font-semibold text-green-900 outline-none focus:border-green-500 focus:ring-1 focus:ring-green-500"
                  />
                </label>

                <label className="block">
                  <span className="mb-1 block text-[10px] font-black uppercase tracking-wide text-green-700">
                    Looking For
                  </span>
                  <textarea
                    value={bulkLookingForText}
                    onChange={(event) => setBulkLookingForText(event.target.value)}
                    rows="3"
                    placeholder="Pega las que te faltan aquí (Ej: #001, #002)"
                    className="w-full resize-y rounded-xl border border-green-200 bg-green-50 px-3 py-2 text-xs font-semibold text-green-900 outline-none focus:border-green-500 focus:ring-1 focus:ring-green-500"
                  />
                </label>
              </div>

              <div className="mt-3 flex items-center justify-between gap-3">
                <button
                  type="button"
                  onClick={handleBulkImport}
                  disabled={!currentUser || isBulkImporting}
                  className={`rounded-xl px-3 py-2 text-xs font-black shadow-sm transition ${
                    currentUser && !isBulkImporting
                      ? 'bg-green-600 text-white hover:bg-green-500'
                      : 'bg-gray-200 text-gray-500 cursor-not-allowed'
                  }`}
                >
                  {isBulkImporting ? 'Aplicando...' : 'Aplicar carga rapida'}
                </button>
                {bulkImportStatus && (
                  <span className="text-right text-[11px] font-semibold text-green-700">
                    {bulkImportStatus}
                  </span>
                )}
              </div>
            </div>
          </section>

          <AdminBoard isAdmin={isGeneralMode} />
        </div>
      </section>

      {/* RENDERIZADO DE CARTAS EN BLOQUES DE SETS */}
      <main className="flex-1 p-4 bg-green-50/50">
        <div className="mb-4">{renderSetPagination()}</div>

        {activeSet && (
          <div className={`mb-4 rounded-2xl border border-white/70 p-3 shadow-sm ${SET_BACKGROUND_CLASSES[safeActiveSetIndex % SET_BACKGROUND_CLASSES.length]}`}>
            <h2 className="text-xl font-black text-green-800 mb-2 pb-2 border-b border-white/70 flex items-center justify-between gap-3">
              <span>{`Set de ${activeSet.setName}`}</span>
              <span className="text-[11px] font-bold text-green-700 shrink-0">
                {activeSetMatchingCards}/{activeSet.cards.length}
              </span>
            </h2>
            <div className="grid grid-cols-3 gap-3">
              {activeSet.cards.map((card) => (
                <Card
                  key={card.id}
                  cardData={card}
                  userProgress={currentUserProgress}
                  allProgress={allProgress}
                  users={users}
                  matchesFilter={matchesFilter(card)}
                  onToggleCard={handleToggleCard}
                  isGeneralMode={isGeneralMode}
                  onUpdateCardConfig={handleUpdateCardConfig}
                />
              ))}
            </div>
          </div>
        )}

        {renderSetPagination()}
      </main>

      <ProgressHeader users={users} allProgress={allProgress} cards={allCards} />

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
