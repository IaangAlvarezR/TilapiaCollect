import { useState, useEffect, useRef } from 'react';
import { ALBUM_CONFIG, SET_NAMES, generateAlbumData } from './config/albumConfig';
import { Card } from './components/Card';
import { AuthModal } from './components/AuthModal';
import { MissingCardFinder } from './components/MissingCardFinder';
import { AdminBoard } from './components/AdminBoard';
import { UserManager } from './components/UserManager';
import { ProgressHeader } from './components/ProgressHeader';
import { HalloweenAmbientBackground } from './components/HalloweenAmbientBackground';
import {
  loadGeneralCards,
  loadTeamProgress,
  saveCardProgress,
  saveAllProgress,
  saveGeneralCard,
  loadUsers,
} from './services/albumStore';

const normalizeGeneralConfig = (pages = []) =>
  pages.map((page, index) => ({
    ...page,
    pageNumber: page.pageNumber ?? index + 1,
    setName: SET_NAMES[index] || page.setName || `Set ${index + 1}`,
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
  'bg-orange-950/70 border-orange-700/60',
  'bg-amber-950/70 border-amber-700/60',
  'bg-purple-950/70 border-purple-700/60',
  'bg-stone-900/80 border-orange-800/60',
  'bg-amber-900/60 border-yellow-700/60',
  'bg-fuchsia-950/70 border-fuchsia-700/60',
  'bg-emerald-950/70 border-emerald-700/60',
  'bg-orange-900/60 border-orange-600/60',
  'bg-purple-900/60 border-purple-600/60',
  'bg-rose-950/70 border-rose-700/60',
  'bg-yellow-950/70 border-amber-600/60',
  'bg-violet-950/70 border-violet-700/60',
  'bg-stone-950/80 border-purple-800/60',
  'bg-orange-950/80 border-amber-700/60',
  'bg-purple-950/80 border-orange-700/60',
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
  const [summaryStars, setSummaryStars] = useState([1, 2, 3, 4, 5]); // [1, 2, 3, 4, 5]
  const [includeGoldInSummary, setIncludeGoldInSummary] = useState(true);
  const [summaryMode, setSummaryMode] = useState('both'); // 'both' | 'trade'
  const [adminOptionsEnabled, setAdminOptionsEnabled] = useState(false);
  const [bulkImportStatus, setBulkImportStatus] = useState('');
  const [hasPendingChanges, setHasPendingChanges] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState('');
  const headerRef = useRef(null);
  const [headerOffset, setHeaderOffset] = useState(0);

  // Filtro de estrellas para resumen
  const toggleSummaryStar = (star) => {
    setSummaryStars((prev) => {
      if (prev.includes(star)) {
        if (prev.length === 1) return prev; // Mantener al menos 1
        return prev.filter((s) => s !== star);
      }
      return [...prev, star].sort((a, b) => a - b);
    });
  };

  const setSummaryPreset = (preset) => {
    if (preset === 'all') setSummaryStars([1, 2, 3, 4, 5]);
    else if (preset === '1-3') setSummaryStars([1, 2, 3]);
    else if (preset === '3-4') setSummaryStars([3, 4]);
    else if (preset === '4-5') setSummaryStars([4, 5]);
    else if (preset === '5') setSummaryStars([5]);
  };

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
                      imageUrl: row.image_url !== undefined ? row.image_url : (card.imageUrl || null),
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
    try {
      // Excluir imágenes base64 de localStorage para no exceder la cuota de 5MB del navegador.
      // Las imágenes se sincronizan y descargan directamente desde Supabase.
      const sanitizedConfig = generalConfig.map((page) => ({
        ...page,
        cards: page.cards.map((card) => {
          const isBase64 = typeof card.imageUrl === 'string' && card.imageUrl.startsWith('data:');
          return {
            ...card,
            imageUrl: isBase64 ? null : card.imageUrl,
          };
        }),
      }));
      localStorage.setItem('album_general_config', JSON.stringify(sanitizedConfig));
    } catch (e) {
      console.warn('No se pudo guardar la configuración en localStorage:', e);
    }
  }, [generalConfig]);

  useEffect(() => {
    try {
      localStorage.setItem('team_album_progress', JSON.stringify(allProgress));
    } catch (e) {
      console.warn('No se pudo guardar el progreso en localStorage:', e);
    }
  }, [allProgress]);

  useEffect(() => {
    try {
      if (currentUser) {
        localStorage.setItem('album_current_user', JSON.stringify(currentUser));
      } else {
        localStorage.removeItem('album_current_user');
      }
    } catch (e) {
      console.warn('No se pudo guardar el usuario en localStorage:', e);
    }
  }, [currentUser]);

  const isVaiuOrAdmin = Boolean(
    currentUser && (
      currentUser.is_admin ||
      currentUser.name?.toLowerCase().trim() === 'vaiu' ||
      currentUser.uid?.toString().trim() === '10589616'
    )
  );
  const showAdminOptions = isVaiuOrAdmin && adminOptionsEnabled;

  const handleUpdateCardConfig = (cardId, field, value) => {
    if (!showAdminOptions) return;

    let cardToSave = null;

    setGeneralConfig((prev) =>
      prev.map((page) => ({
        ...page,
        cards: page.cards.map((card) => {
          if (card.id === cardId) {
            const next = { ...card, [field]: value };
            cardToSave = next;
            return next;
          }
          return card;
        }),
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

      return {
        ...prev,
        [currentUser.uid]: {
          ...userState,
          [cardId]: nextCardState,
        },
      };
    });

    setHasPendingChanges(true);
  };

  const handleSaveProgress = async () => {
    if (!currentUser) return;

    setIsSaving(true);
    setSaveStatus('Guardando...');

    try {
      const userProgress = allProgress[currentUser.uid] || {};
      await saveAllProgress(currentUser.uid, userProgress);
      setHasPendingChanges(false);
      setSaveStatus('¡Guardado!');
      window.setTimeout(() => setSaveStatus(''), 2500);
    } catch (error) {
      console.error('No se pudo guardar el progreso en Supabase:', error);
      setSaveStatus(`Error: ${error?.message || 'revisa la consola'}`);
      window.setTimeout(() => setSaveStatus(''), 5000);
    } finally {
      setIsSaving(false);
    }
  };

  const isGeneralMode = isVaiuOrAdmin;
  const currentUserProgress = currentUser ? (allProgress[currentUser.uid] || {}) : {};
  const allCards = generalConfig.flatMap((page) => page.cards);
  const completedCards = allCards.reduce((sum, card) => {
    const entry = currentUserProgress[card.id];
    const count = typeof entry === 'number' ? entry : entry?.count || 0;
    return sum + (count > 0 ? 1 : 0);
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

  // Cálculo en tiempo real para el generador de resumen
  const filteredSummaryCards = allCards.filter((card) => {
    const matchStar = summaryStars.includes(card.stars || 1);
    const matchGold = includeGoldInSummary ? true : card.defaultFrame !== 'gold';
    return matchStar && matchGold;
  });

  const summaryDupCount = currentUser
    ? filteredSummaryCards.filter((card) => {
        const raw = currentUserProgress[card.id];
        const count = typeof raw === 'number' ? raw : (raw?.count || 0);
        return count > 1;
      }).length
    : 0;

  const summaryMissCount = currentUser
    ? filteredSummaryCards.filter((card) => {
        const raw = currentUserProgress[card.id];
        const count = typeof raw === 'number' ? raw : (raw?.count || 0);
        return count === 0;
      }).length
    : 0;



  const handleQuickFill = async ({ stars = null, frame = null, count = 1 } = {}) => {
    if (!currentUser) {
      setShowAuthModal(true);
      return;
    }

    const label = stars ? `${stars}★` : frame === 'gold' ? 'Oro' : 'Azul';
    const confirmApply = window.confirm(
      `¿Marcar todas las cartas de ${label} con ${count === 0 ? '0 (quitar)' : count}?`
    );
    if (!confirmApply) return;

    setAllProgress((prev) => {
      const userState = prev[currentUser.uid] || {};
      const next = { ...userState };

      allCards.forEach((card) => {
        const matchesStars = stars === null || card.stars === stars;
        const matchesFrame = frame === null || card.defaultFrame === frame;
        if (matchesStars && matchesFrame) {
          next[card.id] = { count };
        }
      });

      return { ...prev, [currentUser.uid]: next };
    });

    setHasPendingChanges(true);
    setBulkImportStatus(`Cartas de ${label} marcadas con ${count}.`);
    window.setTimeout(() => setBulkImportStatus(''), 3000);
  };



  const renderSetPagination = () => (
    <div className="rounded-2xl border border-orange-900/60 bg-stone-900/90 p-3 shadow-lg shadow-black/40">
      <div className="mb-3 flex items-center justify-between gap-3">
        <button
          type="button"
          onClick={() => goToSet(safeActiveSetIndex - 1)}
          disabled={safeActiveSetIndex === 0}
          className={`rounded-xl px-3 py-2 text-xs font-black transition-colors ${
            safeActiveSetIndex === 0
              ? 'bg-stone-950 text-stone-600 cursor-not-allowed border border-stone-800/40'
              : 'bg-orange-950/80 text-orange-200 border border-orange-800/60 hover:bg-orange-900'
          }`}
        >
          ← Anterior
        </button>
        <div className="text-center">
          <p className="text-[10px] font-black uppercase tracking-wide text-orange-400">
            🎃 Sección {safeActiveSetIndex + 1} de {totalSetPages}
          </p>
          <p className="text-xs font-bold text-amber-200">
            {activeSet ? `Set de ${activeSet.setName}` : 'Sin secciones'}
          </p>
        </div>
        <button
          type="button"
          onClick={() => goToSet(safeActiveSetIndex + 1)}
          disabled={safeActiveSetIndex >= totalSetPages - 1}
          className={`rounded-xl px-3 py-2 text-xs font-black transition-colors ${
            safeActiveSetIndex >= totalSetPages - 1
              ? 'bg-stone-950 text-stone-600 cursor-not-allowed border border-stone-800/40'
              : 'bg-orange-950/80 text-orange-200 border border-orange-800/60 hover:bg-orange-900'
          }`}
        >
          Siguiente →
        </button>
      </div>

      <div className="grid grid-cols-5 gap-2">
        {generalConfig.map((set, index) => (
          <button
            key={set.pageNumber}
            type="button"
            onClick={() => goToSet(index)}
            className={`h-9 rounded-lg text-xs font-black transition-all ${
              safeActiveSetIndex === index
                ? 'bg-gradient-to-r from-orange-600 to-amber-600 text-white shadow-md shadow-orange-900/60 scale-[1.03]'
                : 'bg-stone-950 text-orange-300 border border-orange-900/50 hover:bg-orange-950/70 hover:text-amber-200'
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
    if (!currentUser) {
      setShowAuthModal(true);
      return;
    }

    const getCardCount = (card) => {
      const rawProgress = currentUserProgress[card.id];
      const progressType = card.defaultFrame === 'gold' ? 'goldCount' : 'basicCount';

      return typeof rawProgress === 'number'
        ? rawProgress
        : (rawProgress?.count || rawProgress?.[progressType] || 0);
    };

    const getCardNumber = (card) => (card.page - 1) * ALBUM_CONFIG.cardsPerPage + card.slot;
    const getRarityLabel = (card) => (card.defaultFrame === 'gold' ? 'Gold' : 'Blue');
    const getCardLabel = (entry) => {
      const number = `${String(getCardNumber(entry.card))}`;
      return entry.quantity > 1 ? `${number} x${entry.quantity}` : number;
    };

    const groupByType = (entries) =>
      entries.reduce((groups, entry) => {
        const key = `${entry.card.stars || 0}-${entry.card.defaultFrame}`;
        const label = `${entry.card.stars || 0}★·${getRarityLabel(entry.card)}`;

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

          return `- ${cards} -  ${group.label}`;
        });
    };

    // Filtrar cartas según estrellas y opción Gold seleccionadas
    const targetCards = allCards.filter((card) => {
      const matchStar = summaryStars.includes(card.stars || 1);
      const matchGold = includeGoldInSummary ? true : card.defaultFrame !== 'gold';
      return matchStar && matchGold;
    });

    const cardEntries = targetCards.map((card) => ({ card, count: getCardCount(card) }));
    const duplicateEntries = cardEntries
      .filter((entry) => entry.count > 1)
      .map((entry) => ({ ...entry, quantity: entry.count - 1 }));
    const missingEntries = cardEntries
      .filter((entry) => entry.count === 0)
      .map((entry) => ({ ...entry, quantity: 1 }));

    const collectedUniqueTotal = allCards.reduce((sum, card) => {
      const c = getCardCount(card);
      return sum + (c > 0 ? 1 : 0);
    }, 0);
    const uniquePercentage = allCards.length > 0 ? Math.round((collectedUniqueTotal / allCards.length) * 100) : 0;

    const tradeLines = [
      '**For Trade**',
      ...renderGroupedEntries(duplicateEntries, 'Ninguna'),
    ];
    const summaryLines = [
      '🎃 **Tilapia Tools - Álbum Otoño & Halloween** 🍂',
      'https://tilapia-collect.vercel.app/',
      `Jugador: ${currentUser.name}`,
      `UID: ${currentUser.uid}`,
      `${collectedUniqueTotal}/${allCards.length} (${uniquePercentage}%)`,
      ...tradeLines,
      ...(summaryMode === 'both' ? [
          '**Looking For**',
          ...renderGroupedEntries(missingEntries, 'Ninguna'),
        ] : []),
    ];

    const summaryText = summaryLines.join('\n');

    try {
      await navigator.clipboard.writeText(summaryText);
      setSummaryStatus(summaryMode === 'trade'
        ? `📋 ¡For Trade copiado! (${duplicateEntries.length} grupos)`
        : `📋 ¡Copiado con éxito! (${duplicateEntries.length} repetidas, ${missingEntries.length} faltantes)`);
      window.setTimeout(() => setSummaryStatus(''), 3000);
    } catch (error) {
      console.warn('No se pudo copiar el resumen.', error);
      setSummaryStatus('❌ No se pudo copiar al portapapeles');
      window.setTimeout(() => setSummaryStatus(''), 2500);
    }
  };

  const handleReloadUsers = async () => {
    try {
      const refreshedUsers = await loadUsers();
      if (refreshedUsers) setUsers(refreshedUsers);
    } catch (err) {
      console.warn('Error recargando usuarios:', err);
    }
  };

  const handleUserUpdated = ({ oldUid, newUid, updatedUser }) => {
    setUsers((prev) =>
      prev.map((u) => (u.uid === oldUid ? updatedUser : u))
    );

    if (oldUid !== newUid) {
      setAllProgress((prev) => {
        const next = { ...prev };
        if (next[oldUid]) {
          next[newUid] = next[oldUid];
          delete next[oldUid];
        }
        return next;
      });

      if (currentUser?.uid === oldUid) {
        setCurrentUser(updatedUser);
      }
    } else if (currentUser?.uid === oldUid) {
      setCurrentUser((prev) => ({ ...prev, ...updatedUser }));
    }
  };

  const handleUserDeleted = (deletedUid) => {
    setUsers((prev) => prev.filter((u) => u.uid !== deletedUid));
    setAllProgress((prev) => {
      const next = { ...prev };
      delete next[deletedUid];
      return next;
    });
  };

  return (
    <div className="min-h-screen bg-[#140b0d] text-orange-100 flex flex-col font-sans max-w-xl mx-auto border-x border-orange-950/80 shadow-2xl relative">
      <HalloweenAmbientBackground />
      
      {/* HEADER OTOÑO & HALLOWEEN */}
      <header ref={headerRef} className="px-4 py-3 bg-gradient-to-r from-[#2a110a] via-[#1f0e13] to-[#250d24] border-b border-orange-800/60 sticky top-0 z-30 shadow-md">
        <div className="flex justify-between items-center gap-2">
          <div className="flex items-center gap-2">
            <span className="text-xl select-none" role="img" aria-label="pumpkin">🎃</span>
            <h1 className="text-lg sm:text-xl font-black bg-gradient-to-r from-orange-400 via-amber-300 to-yellow-200 bg-clip-text text-transparent tracking-tight">
              {ALBUM_CONFIG.title}
            </h1>
            <span className="text-xs font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-orange-950/80 text-orange-300 border border-orange-700/60 hidden sm:inline-block">
              🍂 Otoño & Halloween 🎃
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                if (currentUser) {
                  setCurrentUser(null);
                  setAdminOptionsEnabled(false);
                } else {
                  setShowAuthModal(true);
                }
              }}
              className={`text-xs px-3.5 py-1.5 rounded-full font-black transition-all shadow-md truncate max-w-[160px] ${
                currentUser
                  ? 'bg-gradient-to-r from-orange-600 to-amber-600 text-white shadow-orange-950/60 hover:from-orange-500 hover:to-amber-500 border border-orange-400/40'
                  : 'bg-stone-900 text-orange-300 border border-orange-800/80 hover:bg-orange-950/80 hover:text-amber-200'
              }`}
            >
              {currentUser ? `🔓 ${currentUser.name}` : '🔒 Iniciar Sesión'}
            </button>
          </div>
        </div>
      </header>

      {summaryStatus && (
        <div className="px-4 py-2 bg-amber-950/90 text-amber-200 text-xs font-bold border-b border-amber-700/60 text-center shadow-inner">
          ✨ {summaryStatus}
        </div>
      )}

      {/* RESUMEN DE PROGRESO */}
      <section className="px-4 py-4 bg-stone-900/90 border-b border-orange-900/60 shadow-sm">
        <div className="flex items-start justify-between gap-3 mb-3">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-orange-400">
              🍂 Resumen de tu colección
            </p>
            <h2 className="text-base font-black text-amber-100">
              {currentUser ? `Hola, ${currentUser.name} 🍁` : 'Inicia sesión para registrar tu progreso'}
            </h2>
          </div>
          <div className="rounded-2xl bg-gradient-to-br from-orange-950 to-amber-950 border border-orange-800/70 px-3.5 py-2 text-right min-w-[96px] shadow-sm">
            <p className="text-[10px] font-bold uppercase text-orange-300">Avance</p>
            <p className="text-lg font-black bg-gradient-to-r from-orange-300 to-amber-200 bg-clip-text text-transparent">
              {progressPercentage}%
            </p>
          </div>
        </div>

        <div className="flex items-center justify-between text-sm text-amber-300/90 font-medium mb-3">
          <span>🎃 {completedCards} cartas marcadas</span>
          <span>{allCards.length} cartas totales 🍂</span>
        </div>

        {/* HERO CARD: GENERADOR DE RESUMEN */}
        <div className="mt-3 rounded-2xl border border-orange-700/60 bg-stone-950/80 p-4 shadow-lg relative overflow-hidden">

          {/* Título */}
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <span className="text-base">📜</span>
              <h3 className="text-sm font-black text-amber-100">Generar Resumen para Trade</h3>
              <span className="text-[9px] bg-orange-600/90 text-white px-2 py-0.5 rounded-full font-black uppercase tracking-wide">
                Popular
              </span>
            </div>
          </div>

          {/* Presets rápidos — una sola fila */}
          <div className="flex flex-wrap gap-1.5 mb-3">
            {[
              { label: '🌟 Todas', key: 'all', active: summaryStars.length === 5 },
              { label: '🍂 1–3★', key: '1-3', active: summaryStars.length === 3 && summaryStars.includes(1) && summaryStars.includes(3) },
              { label: '🎃 3–4★', key: '3-4', active: summaryStars.length === 2 && summaryStars.includes(3) && summaryStars.includes(4) },
              { label: '👻 4–5★', key: '4-5', active: summaryStars.length === 2 && summaryStars.includes(4) && summaryStars.includes(5) },
              { label: '👑 5★', key: '5', active: summaryStars.length === 1 && summaryStars.includes(5) },
            ].map(({ label, key, active }) => (
              <button
                key={key}
                type="button"
                onClick={() => setSummaryPreset(key)}
                className={`text-[11px] font-bold px-2.5 py-1 rounded-lg border transition-all ${
                  active
                    ? 'bg-orange-600 text-white border-orange-500 shadow-sm'
                    : 'bg-stone-900 text-orange-300 border-stone-800 hover:border-orange-700 hover:text-amber-200'
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          {/* Estrellas individuales + toggle Gold — todo en una fila */}
          <div className="flex items-center justify-between gap-2 mb-3">
            <div className="flex items-center gap-1">
              {[1, 2, 3, 4, 5].map((s) => {
                const isChecked = summaryStars.includes(s);
                return (
                  <button
                    key={s}
                    type="button"
                    onClick={() => toggleSummaryStar(s)}
                    title={`${s}★`}
                    className={`w-8 h-8 rounded-lg text-xs font-black border transition-all ${
                      isChecked
                        ? 'bg-amber-600/90 text-white border-amber-500'
                        : 'bg-stone-900 text-stone-500 border-stone-800 hover:border-stone-600'
                    }`}
                  >
                    {s}★
                  </button>
                );
              })}
            </div>

            <label className="flex items-center gap-1.5 text-xs font-bold text-amber-200 cursor-pointer select-none bg-stone-900 px-3 py-1.5 rounded-lg border border-stone-800 hover:border-orange-800 transition-all">
              <input
                type="checkbox"
                checked={includeGoldInSummary}
                onChange={(e) => setIncludeGoldInSummary(e.target.checked)}
                className="rounded accent-amber-500 h-3.5 w-3.5 cursor-pointer"
              />
              <span>⭐ Gold</span>
            </label>
          </div>

          <div className="mb-3">
            <p className="text-[10px] font-black uppercase tracking-wider text-orange-300 mb-1.5">
              Contenido a copiar
            </p>
            <div className="grid grid-cols-2 gap-2">
              {[
                { value: 'both', label: 'Trade + Busco' },
                { value: 'trade', label: 'Solo For Trade' },
              ].map(({ value, label }) => (
                <button
                  key={value}
                  type="button"
                  aria-pressed={summaryMode === value}
                  onClick={() => setSummaryMode(value)}
                  className={`rounded-lg border px-2 py-1.5 text-[11px] font-bold transition-all ${
                    summaryMode === value
                      ? 'border-orange-500 bg-orange-600 text-white'
                      : 'border-stone-800 bg-stone-900 text-orange-300 hover:border-orange-700'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* Contadores + Botón */}
          {currentUser && (
            <div className="flex items-center gap-3 text-[11px] text-stone-400 mb-2.5 px-0.5">
              <span>🔄 Trade: <b className="text-amber-300">{summaryDupCount}</b></span>
              <span className="text-stone-700">·</span>
              <span>🔍 Busco: <b className="text-amber-300">{summaryMissCount}</b></span>
            </div>
          )}

          <button
            onClick={handleGenerateSummary}
            className={`w-full py-2.5 px-4 rounded-xl font-black text-sm transition-all duration-200 flex items-center justify-center gap-2 shadow-md active:scale-[0.98] ${
              currentUser
                ? 'bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-400 hover:to-amber-400 text-stone-950 hover:scale-[1.01]'
                : 'bg-gradient-to-r from-orange-700 to-amber-700 text-white/80'
            }`}
          >
            <span>📜</span>
            <span>{currentUser ? 'Copiar resumen al portapapeles' : 'Inicia sesión para generar resumen'}</span>
          </button>
        </div>
      </section>

      {/* HERRAMIENTAS Y ADMIN */}
      <section className="px-4 py-3 bg-[#170e10] border-b border-orange-900/50">
        <div className="space-y-3">
          {isVaiuOrAdmin && (
            <div className="flex items-center justify-between gap-3 rounded-xl border border-purple-800/70 bg-purple-950/40 px-3 py-2.5">
              <div>
                <p className="text-xs font-black text-purple-200">🛠️ Opciones de administrador</p>
                <p className="text-[10px] text-purple-300/80">Desactivadas por defecto para evitar cambios accidentales.</p>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={adminOptionsEnabled}
                onClick={() => setAdminOptionsEnabled((enabled) => !enabled)}
                className={`shrink-0 rounded-lg border px-3 py-1.5 text-[11px] font-black transition ${
                  adminOptionsEnabled
                    ? 'border-emerald-500 bg-emerald-700 text-white'
                    : 'border-stone-700 bg-stone-900 text-stone-300'
                }`}
              >
                {adminOptionsEnabled ? 'Activadas' : 'Desactivadas'}
              </button>
            </div>
          )}

          <MissingCardFinder
            selectedUser={currentUser?.uid}
            cards={allCards}
            allProgress={allProgress}
            users={users}
          />

          {(!isVaiuOrAdmin || showAdminOptions) && (
            <>
          {/* LLENADO RÁPIDO */}
          <section className="p-3 bg-stone-900/90 border border-orange-900/60 rounded-2xl shadow-sm">
            <div className="max-w-md mx-auto">
              <div className="mb-3 flex items-start justify-between gap-3">
                <div>
                  <h2 className="text-sm font-black text-amber-100 flex items-center gap-1.5">
                    <span>⚡</span> Llenado rápido
                  </h2>
                  <p className="text-[11px] text-orange-300/80">
                    Marca todas las cartas de una rareza o estrellas de una vez. Recuerda guardar después.
                  </p>
                </div>
                <span className="rounded-full bg-orange-950 border border-orange-800/60 px-2 py-1 text-[10px] font-black text-orange-300 shrink-0">
                  {allCards.length} cartas
                </span>
              </div>

              {/* Por estrellas */}
              <p className="text-[10px] font-black uppercase tracking-wide text-orange-400 mb-2">Por estrellas</p>
              <div className="grid grid-cols-5 gap-1.5 mb-3">
                {[1, 2, 3, 4, 5].map((s) => (
                  <button
                    key={s}
                    type="button"
                    disabled={!currentUser}
                    onClick={() => handleQuickFill({ stars: s, count: 1 })}
                    className={`rounded-xl py-2 text-[11px] font-black transition ${
                      currentUser
                        ? 'bg-amber-950/80 text-amber-200 border border-amber-800/60 hover:bg-amber-900/90 hover:text-white shadow-sm'
                        : 'bg-stone-950 text-stone-600 cursor-not-allowed border border-stone-800/50'
                    }`}
                  >
                    {s}★
                  </button>
                ))}
              </div>

              {/* Por rareza */}
              <p className="text-[10px] font-black uppercase tracking-wide text-orange-400 mb-2">Por rareza</p>
              <div className="grid grid-cols-2 gap-2 mb-3">
                <button
                  type="button"
                  disabled={!currentUser}
                  onClick={() => handleQuickFill({ frame: 'basic', count: 1 })}
                  className={`rounded-xl py-2 text-[11px] font-black transition ${
                    currentUser
                      ? 'bg-sky-950/80 text-sky-200 border border-sky-800/60 hover:bg-sky-900/90 hover:text-white shadow-sm'
                      : 'bg-stone-950 text-stone-600 cursor-not-allowed border border-stone-800/50'
                  }`}
                >
                  🔵 Todas Azul
                </button>
                <button
                  type="button"
                  disabled={!currentUser}
                  onClick={() => handleQuickFill({ frame: 'gold', count: 1 })}
                  className={`rounded-xl py-2 text-[11px] font-black transition ${
                    currentUser
                      ? 'bg-amber-950/80 text-amber-200 border border-amber-700/60 hover:bg-amber-900/90 hover:text-white shadow-sm'
                      : 'bg-stone-950 text-stone-600 cursor-not-allowed border border-stone-800/50'
                  }`}
                >
                  ⭐ Todas Oro
                </button>
              </div>

              {/* Quitar todo */}
              <button
                type="button"
                disabled={!currentUser}
                onClick={() => handleQuickFill({ count: 0 })}
                className={`w-full rounded-xl py-2 text-[11px] font-black transition ${
                  currentUser
                    ? 'bg-red-950/40 text-red-300 hover:bg-red-900/60 border border-red-900/60 shadow-sm'
                    : 'bg-stone-950 text-stone-600 cursor-not-allowed border border-stone-800/50'
                }`}
              >
                🗑️ Quitar todas las cartas
              </button>

              {bulkImportStatus && (
                <p className="mt-2 text-center text-[11px] font-bold text-amber-300">{bulkImportStatus}</p>
              )}
            </div>
          </section>

          <UserManager
            currentUser={currentUser}
            users={users}
            onReloadUsers={handleReloadUsers}
            onUserUpdated={handleUserUpdated}
            onUserDeleted={handleUserDeleted}
            onResetAllProgress={() => {
              setAllProgress({});
              localStorage.removeItem('team_album_progress');
            }}
          />

          <AdminBoard
            currentUser={currentUser}
            isGeneralMode={isGeneralMode}
            onOpenAuth={() => setShowAuthModal(true)}
          />
            </>
          )}
        </div>
      </section>

      {/* RENDERIZADO DE CARTAS EN BLOQUES DE SETS */}
      <main className="flex-1 p-4 bg-[#140b0d]">
        <div className="mb-4">{renderSetPagination()}</div>

        {activeSet && (
          <div className={`mb-4 rounded-2xl border p-3 shadow-lg ${SET_BACKGROUND_CLASSES[safeActiveSetIndex % SET_BACKGROUND_CLASSES.length]}`}>
            <h2 className="text-xl font-black text-amber-100 mb-2 pb-2 border-b border-white/10 flex items-center justify-between gap-3">
              <span className="flex items-center gap-2">
                <span>🍂</span>
                <span>{`Set de ${activeSet.setName}`}</span>
              </span>
              <span className="text-[11px] font-bold text-amber-300 bg-stone-950/60 px-2.5 py-0.5 rounded-full border border-amber-700/40 shrink-0">
                {activeSetMatchingCards}/{activeSet.cards.length}
              </span>
            </h2>
            <div className="mb-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-[10px] font-bold text-orange-200/90" aria-label="Leyenda de estado de cartas">
              <span className="flex items-center gap-1"><span className="inline-block h-3 w-3 rounded border border-stone-400 bg-stone-500 grayscale" />Sin tener</span>
              <span className="flex items-center gap-1"><span className="inline-block h-3 w-3 rounded border-2 border-blue-400 bg-blue-900" />La tienes</span>
              <span className="flex items-center gap-1"><span aria-hidden="true">🔁</span>Duplicada</span>
            </div>
            <div className="grid grid-cols-3 gap-3">
              {activeSet.cards.map((card) => (
                <Card
                  key={card.id}
                  cardData={card}
                  userProgress={currentUserProgress}
                  matchesFilter={matchesFilter(card)}
                  onToggleCard={handleToggleCard}
                  isGeneralMode={showAdminOptions}
                  showProgressControls={!isVaiuOrAdmin || showAdminOptions}
                  onUpdateCardConfig={handleUpdateCardConfig}
                />
              ))}
            </div>
          </div>
        )}

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

      {/* Botón flotante Guardar */}
      {currentUser && (
        <div className="fixed bottom-5 right-5 z-50 flex flex-col items-end gap-2">
          {saveStatus && (
            <span className="rounded-xl bg-orange-950 border border-orange-600 px-3 py-1.5 text-xs font-black text-amber-200 shadow-xl">
              {saveStatus}
            </span>
          )}
          <button
            type="button"
            onClick={handleSaveProgress}
            disabled={isSaving || !hasPendingChanges}
            title={hasPendingChanges ? 'Tienes cambios sin guardar' : 'Todo guardado'}
            className={`flex items-center gap-2 rounded-2xl px-4 py-3 text-sm font-black shadow-2xl transition-all duration-300 ${
              hasPendingChanges && !isSaving
                ? 'bg-gradient-to-r from-orange-600 to-amber-600 text-white hover:from-orange-500 hover:to-amber-500 shadow-orange-600/50 animate-bounce border border-orange-400'
                : isSaving
                ? 'bg-orange-800 text-amber-200 cursor-wait shadow-orange-800/40'
                : 'bg-stone-900 text-stone-500 border border-stone-800 shadow-black/60 cursor-default'
            }`}
          >
            {isSaving ? '⏳' : hasPendingChanges ? '💾' : '✅'}
            <span>
              {isSaving ? 'Guardando...' : hasPendingChanges ? 'Guardar' : 'Guardado'}
            </span>
          </button>
        </div>
      )}
    </div>
  );
}
