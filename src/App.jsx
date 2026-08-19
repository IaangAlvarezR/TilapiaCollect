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
  flushPendingUpdates,
} from './services/albumStore';
import { supabase } from './supabaseClient';

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
  const [pendingCount, setPendingCount] = useState(0);
  const [selectedAutoFillOptions, setSelectedAutoFillOptions] = useState([]);
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

        const hasLocalGeneral = !!localStorage.getItem('album_general_config');
        const hasLocalProgress = !!localStorage.getItem('team_album_progress');

        if (savedUsers.length > 0) {
          setUsers(savedUsers);
        }

        // If the user already has a local album config, prefer it to avoid
        // overwriting recent local edits that may not have been synced to Supabase.
        if (cardRows.length > 0 && !hasLocalGeneral) {
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

        // Respect local progress cache too. If no local cache exists, load from Supabase.
        if (savedProgress && !hasLocalProgress) setAllProgress(savedProgress);
      } catch (error) {
        console.warn('No se pudo cargar Supabase; usando datos locales.', error.message);
      }
    }

    console.debug('Supabase URL (client):', supabase?.supabaseUrl);
    loadAlbumFromSupabase();

    // Try to flush any pending updates (from previous failed writes)
    flushPendingUpdates().catch(() => {});

    const onlineHandler = () => flushPendingUpdates().catch(() => {});
    // Real-time subscriptions: update UI when remote rows change
    const progressChannel = supabase
      .channel('realtime-player-progress')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'player_progress' },
        (payload) => {
          try {
            const row = payload.new || payload.old;
            if (!row) return;
            if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
              setAllProgress((prev) => {
                const next = { ...(prev || {}) };
                next[row.user_id] = { ...(next[row.user_id] || {}) };
                next[row.user_id][row.card_id] = { count: row.count || 0 };
                return next;
              });
            } else if (payload.eventType === 'DELETE') {
              setAllProgress((prev) => {
                const next = { ...(prev || {}) };
                if (next[row.user_id]) {
                  const userState = { ...next[row.user_id] };
                  delete userState[row.card_id];
                  next[row.user_id] = userState;
                }
                return next;
              });
            }
          } catch (err) {
            console.warn('Realtime progress handler error', err);
          }
        }
      )
      .subscribe();
    console.debug('progressChannel subscribed:', progressChannel);

    const cardsChannel = supabase
      .channel('realtime-general-cards')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'general_cards' },
        (payload) => {
          try {
            const row = payload.new || payload.old;
            if (!row) return;
            if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
              setGeneralConfig((prev) =>
                (prev || []).map((page) => ({
                  ...page,
                  cards: (page.cards || []).map((card) => (card.id === row.id ? { ...card, name: row.name, stars: row.stars, defaultFrame: row.default_frame } : card)),
                }))
              );
            } else if (payload.eventType === 'DELETE') {
              // on delete, we won't remove card from UI but log it
              console.debug('Card deleted remotely', row.id);
            }
          } catch (err) {
            console.warn('Realtime cards handler error', err);
          }
        }
      )
      .subscribe();
    console.debug('cardsChannel subscribed:', cardsChannel);
    const updatePending = () => {
      try {
        const raw = localStorage.getItem('tt_pending_updates');
        const list = raw ? JSON.parse(raw) : [];
        setPendingCount(Array.isArray(list) ? list.length : 0);
      } catch {
        setPendingCount(0);
      }
    };

    updatePending();
    window.addEventListener('storage', updatePending);
    window.addEventListener('online', onlineHandler);

    return () => {
      isMounted = false;
      window.removeEventListener('online', onlineHandler);
      window.removeEventListener('storage', updatePending);
      try {
        supabase.removeChannel(progressChannel);
      } catch {}
      try {
        supabase.removeChannel(cardsChannel);
      } catch {}
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
  const getCardCount = (card, progressState = {}) => {
    const rawProgress = progressState[card.id];
    const progressType = card.defaultFrame === 'gold' ? 'goldCount' : 'basicCount';

    return typeof rawProgress === 'number'
      ? rawProgress
      : (rawProgress?.count || rawProgress?.[progressType] || 0);
  };

  const renderHelpSummary = () => {
    const isDark = darkMode;
    const panelClasses = isDark
      ? 'rounded-2xl border border-slate-700 bg-[#0b1f2d] p-3 shadow-sm'
      : 'rounded-2xl border border-green-200 bg-white p-3 shadow-sm';
    const headingClasses = isDark ? 'text-[10px] font-black uppercase tracking-[0.2em] text-emerald-300' : 'text-[10px] font-black uppercase tracking-[0.2em] text-green-700';
    const titleClasses = isDark ? 'mt-1 text-base font-black text-emerald-50' : 'mt-1 text-base font-black text-green-800';
    const countClasses = isDark
      ? 'mt-3 flex items-center justify-between gap-3 rounded-xl bg-[#143246] px-3 py-2 border border-emerald-500/20'
      : 'mt-3 flex items-center justify-between gap-3 rounded-xl bg-green-50 px-3 py-2';
    const countLabelClasses = isDark ? 'text-xs font-bold text-slate-200' : 'text-xs font-bold text-green-700';
    const countBadgeClasses = isDark ? 'rounded-full bg-emerald-400 px-2 py-1 text-xs font-black text-slate-950 shadow-sm shadow-emerald-500/20' : 'rounded-full bg-green-600 px-2 py-1 text-xs font-black text-white';
    const emptyClasses = isDark ? 'mt-3 text-sm text-slate-200' : 'mt-3 text-sm text-green-700';
    const cardClasses = isDark
      ? 'rounded-xl border border-slate-600 bg-[#12283a] p-2.5 text-slate-100 shadow-sm shadow-slate-950/20'
      : 'rounded-xl border border-green-200 bg-green-50/80 p-2.5';
    const personNameClasses = isDark ? 'text-sm font-black text-emerald-200' : 'text-sm font-black text-green-800';
    const personMetaClasses = isDark ? 'text-[11px] font-bold text-emerald-300' : 'text-[11px] font-bold text-green-700';
    const personTextClasses = isDark ? 'mt-2 text-[11px] leading-5 text-slate-200' : 'mt-2 text-[11px] leading-5 text-green-700';

    if (!currentUser) {
      return (
        <div className={panelClasses}>
          <p className={headingClasses}>
            Ayuda a tu equipo
          </p>
          <p className={isDark ? 'mt-2 text-sm text-slate-200' : 'mt-2 text-sm text-green-700'}>
            Inicia sesión para ver a quién puedes ayudar con tus cartas repetidas.
          </p>
        </div>
      );
    }

    const duplicateCards = allCards
      .map((card) => ({
        card,
        count: getCardCount(card, currentUserProgress),
      }))
      .filter((entry) => entry.count > 1)
      .map((entry) => ({
        ...entry,
        spare: entry.count - 1,
        number: getCardNumber(entry.card),
      }));

    const totalAvailable = duplicateCards.reduce((sum, entry) => sum + entry.spare, 0);
    const peopleWhoNeedHelp = users
      .filter((user) => user.uid !== currentUser.uid)
      .map((user) => {
        const userProgress = allProgress[user.uid] || {};
        const missingCards = duplicateCards
          .filter((entry) => {
            const userCount = getCardCount(entry.card, userProgress);
            return userCount === 0;
          })
          .map((entry) => ({
            number: entry.number,
            stars: entry.card.stars || 0,
            rarity: entry.card.defaultFrame === 'gold' ? 'Gold' : 'Azul',
          }))
          .sort((a, b) => a.number - b.number)
          .reduce((groups, card) => {
            const key = `${card.rarity}|${card.stars}`;
            if (!groups[key]) {
              groups[key] = { rarity: card.rarity, stars: card.stars, numbers: [] };
            }
            groups[key].numbers.push(card.number);
            return groups;
          }, {});

        return {
          name: user.name || 'Sin nombre',
          missingCards: Object.values(missingCards).map((group) => ({
            label: `${group.rarity} ${group.stars}★`,
            numbers: group.numbers,
          })),
        };
      })
      .filter((entry) => entry.missingCards.length > 0)
      .sort((a, b) => b.missingCards.reduce((sum, group) => sum + group.numbers.length, 0) - a.missingCards.reduce((sum, group) => sum + group.numbers.length, 0))
      .slice(0, 5);

    return (
      <div className={panelClasses}>
        <p className={headingClasses}>Ayuda al equipo</p>
        <h3 className={titleClasses}>
          Puedes ayudar a las siguientes personas con tus siguientes cartas repetidas
        </h3>

        <div className={countClasses}>
          <span className={countLabelClasses}>Cartas repetidas disponibles</span>
          <span className={countBadgeClasses}>{totalAvailable}</span>
        </div>

        {peopleWhoNeedHelp.length === 0 ? (
          <p className={emptyClasses}>
            Por ahora no hay personas que necesiten tus cartas repetidas, pero puedes seguir completando el álbum con tus extras.
          </p>
        ) : (
          <div className={`mt-3 space-y-2 ${peopleWhoNeedHelp.length > 4 ? 'max-h-[320px] overflow-y-auto pr-1' : ''}`}>
            {peopleWhoNeedHelp.map((person) => (
              <div key={person.name} className={cardClasses}>
                <div className="flex items-center justify-between gap-2">
                  <span className={personNameClasses}>{person.name}</span>
                  <span className={personMetaClasses}>{person.missingCards.reduce((sum, group) => sum + group.numbers.length, 0)} necesarias</span>
                </div>
                <div className={`mt-2 ${personTextClasses}`}>
                  {person.missingCards.map((group) => (
                    <div key={`${group.label}-${group.numbers.join('-')}`} className="mt-1">
                      <span className="font-black">{group.label}:</span>
                      <span> {group.numbers.map((cardNumber) => `#${cardNumber}`).join(', ')}</span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  };

  const handleApplyChanges = async () => {
    if (!currentUser) {
      setShowAuthModal(true);
      return;
    }
    if (selectedAutoFillOptions.length === 0) {
      setBulkImportStatus('Selecciona al menos una opción de llenado.');
      window.setTimeout(() => setBulkImportStatus(''), 2000);
      return;
    }

    const confirmApply = window.confirm('¿Estás seguro de que deseas aplicar la carga rápida con las opciones seleccionadas?');
    if (!confirmApply) return;

    setIsBulkImporting(true);
    setBulkImportStatus('Aplicando cambios...');

    const cardsToUpdate = allCards.filter(card => {
      return selectedAutoFillOptions.some(option => {
        if (option.startsWith('star-')) {
          return card.stars === parseInt(option.replace('star-', ''), 10);
        }
        if (option.startsWith('quality-')) {
          return card.defaultFrame === option.replace('quality-', '');
        }
        return false;
      });
    });

    const nextUserProgress = { ...currentUserProgress };
    let addedCount = 0;
    
    cardsToUpdate.forEach(card => {
      const currentCount = typeof nextUserProgress[card.id] === 'number' ? nextUserProgress[card.id] : (nextUserProgress[card.id]?.count || 0);
      if (currentCount === 0) {
        nextUserProgress[card.id] = { count: 1 };
        addedCount++;
      }
    });

    if (addedCount === 0) {
      setBulkImportStatus('Ya tienes todas las cartas de las opciones seleccionadas.');
      setIsBulkImporting(false);
      window.setTimeout(() => setBulkImportStatus(''), 4200);
      return;
    }

    setAllProgress((prev) => ({
      ...prev,
      [currentUser.uid]: nextUserProgress,
    }));

    try {
      await Promise.all(
        cardsToUpdate.map((card) => {
          const currentCount = typeof currentUserProgress[card.id] === 'number' ? currentUserProgress[card.id] : (currentUserProgress[card.id]?.count || 0);
          if (currentCount === 0) {
            return saveCardProgress(currentUser.uid, card.id, 1);
          }
          return Promise.resolve();
        })
      );
      setBulkImportStatus(`Se llenaron ${addedCount} cartas correctamente.`);
      setSelectedAutoFillOptions([]); // Reset selection
    } catch (error) {
      console.warn('No se pudo guardar en Supabase.', error.message);
      setBulkImportStatus('Se aplicó localmente, pero hubo un error al guardar en Supabase.');
    } finally {
      setIsBulkImporting(false);
      window.setTimeout(() => setBulkImportStatus(''), 4200);
    }
  };

  const handleResetAlbum = async () => {
    if (!currentUser) {
      setShowAuthModal(true);
      return;
    }
    const confirmReset = window.confirm('¿Estás seguro de que deseas resetear tu álbum? Esto pondrá todas tus cartas en 0 y no se puede deshacer.');
    if (!confirmReset) return;

    setIsBulkImporting(true);
    setBulkImportStatus('Reseteando álbum...');

    const cardsToReset = allCards.filter(card => {
      const rawProgress = currentUserProgress[card.id];
      const count = typeof rawProgress === 'number' ? rawProgress : (rawProgress?.count || 0);
      return count > 0;
    });

    const nextUserProgress = {};
    
    setAllProgress((prev) => ({
      ...prev,
      [currentUser.uid]: nextUserProgress,
    }));

    try {
      await Promise.all(
        cardsToReset.map((card) => saveCardProgress(currentUser.uid, card.id, 0))
      );
      setBulkImportStatus('Álbum reseteado correctamente.');
    } catch (error) {
      console.warn('No se pudo guardar en Supabase.', error.message);
      setBulkImportStatus('Se aplicó localmente, pero hubo un error al guardar en Supabase.');
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
      <div className="mt-3 grid grid-cols-5 gap-2">
        {generalConfig.map((set, index) => (
          <button
            key={`quick-load-${index}`}
            type="button"
            onClick={async () => {
              if (!currentUser) { setShowAuthModal(true); return; }
              const cards = set?.cards || [];
              const toApply = cards.filter((card) => {
                const raw = allProgress[currentUser.uid] || {};
                const cur = typeof raw[card.id] === 'number' ? raw[card.id] : (raw[card.id]?.count || 0);
                return cur === 0;
              });
              if (toApply.length === 0) {
                setBulkImportStatus(`Página ${index + 1}: no hay cartas faltantes.`);
                window.setTimeout(() => setBulkImportStatus(''), 2000);
                return;
              }
              const confirmMsg = `Cargar ${toApply.length} cartas faltantes de la página ${index + 1} a tu álbum?`;
              if (!window.confirm(confirmMsg)) return;

              // Update local state
              setAllProgress((prev) => {
                const userState = { ...(prev[currentUser.uid] || {}) };
                toApply.forEach((card) => { userState[card.id] = { count: 1 }; });
                return { ...prev, [currentUser.uid]: userState };
              });

              // Persist
              try {
                await Promise.all(toApply.map((card) => saveCardProgress(currentUser.uid, card.id, 1).catch((e) => { console.warn('saveCardProgress failed', e); })));
                setBulkImportStatus(`Página ${index + 1} aplicada (${toApply.length}).`);
              } catch (err) {
                console.warn('Error applying quick load', err);
                setBulkImportStatus('Error al aplicar la página. Revisa la consola.');
              } finally {
                window.setTimeout(() => setBulkImportStatus(''), 2500);
              }
            }}
            className={`h-8 rounded-lg text-xs font-bold transition ${
              currentUser ? 'bg-blue-600 text-white hover:bg-blue-500' : 'bg-gray-100 text-gray-400 cursor-not-allowed'
            }`}
            disabled={!currentUser}
          >
            Cargar {index + 1}
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
        '🌐 https://tilapia-collect.vercel.app/',
        '',
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
      ? `**Tilapia Tools**\n🌐 https://tilapia-collect.vercel.app/\n\nFT:\n${duplicateEntries.join('\n')}`
      : '**Tilapia Tools**\n🌐 https://tilapia-collect.vercel.app/\n\nNo tienes cartas duplicadas.';

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
            {pendingCount > 0 && (
              <div className="text-xs px-3 py-1.5 rounded-full font-bold bg-yellow-100 text-yellow-800 border border-yellow-200">
                {pendingCount} cambios pendientes
                <button
                  onClick={() => {
                    flushPendingUpdates().then(() => {
                      const raw = localStorage.getItem('tt_pending_updates');
                      const list = raw ? JSON.parse(raw) : [];
                      setPendingCount(Array.isArray(list) ? list.length : 0);
                    }).catch(() => {});
                  }}
                  className="ml-2 underline text-[10px]"
                >
                  Sincronizar
                </button>
              </div>
            )}
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
                  <h2 className="text-sm font-black text-green-800">Llenado Automático de Cartas</h2>
                  <p className="text-[11px] text-green-600">
                    Selecciona las categorías de cartas que ya completaste para marcarlas todas a la vez en tu álbum, en lugar de hacerlo una por una.
                  </p>
                </div>
                <span className="rounded-full bg-green-100 px-2 py-1 text-[10px] font-black text-green-700">
                  {allCards.length} cartas
                </span>
              </div>

              <div className="mb-4">
                <span className="mb-2 block text-[10px] font-black uppercase tracking-wide text-green-700">
                  Opciones de llenado rápido
                </span>
                <div className="flex flex-wrap gap-2">
                  {[1, 2, 3, 4, 5].map(star => {
                    const optionId = `star-${star}`;
                    const isSelected = selectedAutoFillOptions.includes(optionId);
                    return (
                      <button
                        key={optionId}
                        type="button"
                        onClick={() => setSelectedAutoFillOptions(prev => isSelected ? prev.filter(o => o !== optionId) : [...prev, optionId])}
                        disabled={!currentUser || isBulkImporting}
                        className={`rounded-lg px-2 py-1 text-[10px] font-black shadow-sm transition-colors ${
                          isSelected ? 'bg-blue-600 text-white' : 'bg-blue-100 text-blue-800 hover:bg-blue-200'
                        }`}
                      >
                        {star} ⭐
                      </button>
                    );
                  })}
                  {['basic', 'gold'].map(quality => {
                    const optionId = `quality-${quality}`;
                    const isSelected = selectedAutoFillOptions.includes(optionId);
                    const label = quality === 'basic' ? 'Azul' : 'Gold';
                    const colors = quality === 'basic' 
                      ? (isSelected ? 'bg-blue-600 text-white' : 'bg-blue-100 text-blue-800 hover:bg-blue-200')
                      : (isSelected ? 'bg-yellow-600 text-white' : 'bg-yellow-100 text-yellow-800 hover:bg-yellow-200');
                    return (
                      <button
                        key={optionId}
                        type="button"
                        onClick={() => setSelectedAutoFillOptions(prev => isSelected ? prev.filter(o => o !== optionId) : [...prev, optionId])}
                        disabled={!currentUser || isBulkImporting}
                        className={`rounded-lg px-2 py-1 text-[10px] font-black shadow-sm transition-colors ${colors}`}
                      >
                        {label}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="mt-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={handleApplyChanges}
                    disabled={!currentUser || isBulkImporting}
                    className={`rounded-xl px-3 py-2 text-xs font-black shadow-sm transition ${
                      currentUser && !isBulkImporting
                        ? 'bg-green-600 text-white hover:bg-green-500'
                        : 'bg-gray-200 text-gray-500 cursor-not-allowed'
                    }`}
                  >
                    {isBulkImporting ? 'Aplicando...' : 'Aplicar Cambios'}
                  </button>
                  <button
                    type="button"
                    onClick={handleResetAlbum}
                    disabled={!currentUser || isBulkImporting}
                    className={`rounded-xl px-3 py-2 text-xs font-black shadow-sm transition ${
                      currentUser && !isBulkImporting
                        ? 'bg-red-100 text-red-700 hover:bg-red-200'
                        : 'bg-gray-200 text-gray-500 cursor-not-allowed'
                    }`}
                  >
                    Resetear álbum
                  </button>
                </div>
                {bulkImportStatus && (
                  <span className="text-left sm:text-right text-[11px] font-semibold text-green-700">
                    {bulkImportStatus}
                  </span>
                )}
              </div>
            </div>
          </section>

          <AdminBoard currentUser={currentUser} />
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

        {renderHelpSummary(darkMode)}
      </main>

      <ProgressHeader users={users} allProgress={allProgress} cards={allCards} darkMode={darkMode} />

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
