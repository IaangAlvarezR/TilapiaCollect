import { useEffect, useState, useCallback, useMemo } from 'react';
import {
  deleteAdminBoardEntry,
  deleteAdminBoardEntriesByUid,
  loadAdminBoardEntries,
  loadAllAdminBoardEntries,
  saveAdminBoardEntry,
} from '../services/albumStore';

const emptyForm = {
  uid: '',
  stat0: '0',
  stat1: '0',
  stat2: '0',
  stat3: '0',
  stat4: '0',
  stat5: '0',
};

const STAT_CONFIG = [
  { key: 'stat0', emoji: '🐸', name: 'Rana' },
  { key: 'stat1', emoji: '🐼', name: 'Panda' },
  { key: 'stat2', emoji: '💧', name: 'Gota' },
  { key: 'stat3', emoji: '🦈', name: 'Tiburón' },
  { key: 'stat4', emoji: '🦉', name: 'Búho' },
  { key: 'stat5', emoji: '🦇', name: 'Murciélago' },
];

export function AdminBoard({ currentUser, isGeneralMode, onOpenAuth }) {
  const [rawEntries, setRawEntries] = useState([]);
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState(null);
  const [status, setStatus] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(true);
  const [isGlobalView, setIsGlobalView] = useState(false);
  const [sortConfig, setSortConfig] = useState({ key: 'prom', direction: 'desc' });

  const isAdmin = Boolean(currentUser?.is_admin || isGeneralMode);

  const [copiedUid, setCopiedUid] = useState(null);

  const getStatsArray = (entry) => [
    entry.stat0 ?? 0,
    entry.stat1 ?? 0,
    entry.stat2 ?? 0,
    entry.stat3 ?? 0,
    entry.stat4 ?? 0,
    entry.stat5 ?? 0,
  ];

  const getAverage = (entry) => {
    const stats = getStatsArray(entry);
    return stats.reduce((sum, value) => sum + value, 0) / stats.length;
  };

  const fetchEntries = useCallback(async () => {
    if (!currentUser) {
      setRawEntries([]);
      return;
    }

    setIsLoading(true);
    try {
      if (isGlobalView && isAdmin) {
        const data = await loadAllAdminBoardEntries();
        setRawEntries(data || []);
      } else {
        const data = await loadAdminBoardEntries(currentUser.uid);
        setRawEntries(data || []);
      }
    } catch (error) {
      console.error('Error cargando registros Cozy Farm:', error);
      setStatus('No se pudieron cargar los registros de Cozy Farm.');
    } finally {
      setIsLoading(false);
    }
  }, [currentUser, isGlobalView, isAdmin]);

  useEffect(() => {
    fetchEntries();
  }, [fetchEntries]);

  // Si es vista global, deduplicar por UID quedándonos únicamente con el del promedio más alto
  const processedEntries = useMemo(() => {
    if (!isGlobalView) {
      return rawEntries;
    }

    const uidMap = new Map();
    for (const entry of rawEntries) {
      const uid = String(entry.uid || '').trim();
      if (!uid) continue;

      const avg = getAverage(entry);
      const existing = uidMap.get(uid);

      if (!existing || avg > existing._avg) {
        uidMap.set(uid, { ...entry, _avg: avg });
      }
    }

    return Array.from(uidMap.values());
  }, [rawEntries, isGlobalView]);

  const sortedEntries = useMemo(() => {
    return [...processedEntries].sort((a, b) => {
      if (!sortConfig.key) return 0;
      let aValue = a[sortConfig.key];
      let bValue = b[sortConfig.key];
      if (sortConfig.key === 'prom') {
        aValue = getAverage(a);
        bValue = getAverage(b);
      }
      if (aValue < bValue) return sortConfig.direction === 'asc' ? -1 : 1;
      if (aValue > bValue) return sortConfig.direction === 'asc' ? 1 : -1;
      return 0;
    });
  }, [processedEntries, sortConfig]);

  const resetForm = () => {
    setForm(emptyForm);
    setEditingId(null);
  };

  const sanitizeStat = (val) => {
    const num = Number(val || 0);
    if (isNaN(num)) return 0;
    return Math.max(0, Math.min(999, Math.round(num)));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    const targetUid = form.uid.trim();
    if (!targetUid) {
      setStatus('Por favor ingresa un UID.');
      return;
    }

    // Regla 1: Solo un registro por UID en el listado personal.
    // Si ya existe un registro con este UID y no se estaba editando ese mismo ID, se vincula para sobreescribir.
    const existingEntry = rawEntries.find(
      (item) => String(item.uid).trim() === targetUid && item.id !== editingId
    );

    const targetId = editingId || existingEntry?.id || undefined;

    setIsSaving(true);
    setStatus('');

    try {
      const payload = {
        id: targetId,
        uid: targetUid,
        stat0: sanitizeStat(form.stat0),
        stat1: sanitizeStat(form.stat1),
        stat2: sanitizeStat(form.stat2),
        stat3: sanitizeStat(form.stat3),
        stat4: sanitizeStat(form.stat4),
        stat5: sanitizeStat(form.stat5),
      };

      const userGroup = currentUser.uid;
      const savedEntry = await saveAdminBoardEntry(payload, userGroup);

      // Garantizar que no haya duplicados de UID en el estado
      setRawEntries((prev) => [
        savedEntry,
        ...prev.filter((item) => item.id !== savedEntry.id && String(item.uid).trim() !== targetUid),
      ]);

      setStatus(
        editingId || existingEntry
          ? `Registro del UID ${targetUid} actualizado correctamente.`
          : `Registro del UID ${targetUid} guardado correctamente.`
      );
      resetForm();
    } catch (error) {
      console.error('Error guardando registro:', error);
      setStatus('No se pudo guardar el registro.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleEdit = (entry) => {
    setEditingId(entry.id);
    setForm({
      uid: entry.uid,
      stat0: String(entry.stat0 ?? 0),
      stat1: String(entry.stat1 ?? 0),
      stat2: String(entry.stat2 ?? 0),
      stat3: String(entry.stat3 ?? 0),
      stat4: String(entry.stat4 ?? 0),
      stat5: String(entry.stat5 ?? 0),
    });
    setStatus(`Editando registro del UID ${entry.uid}`);
  };

  const handleDelete = async (entry) => {
    const isGlobal = isGlobalView;
    const confirmDelete = window.confirm(
      isGlobal
        ? `¿Eliminar permanentemente el registro del UID ${entry.uid} de la base de datos?`
        : `¿Seguro que deseas eliminar este registro (UID: ${entry.uid})?`
    );
    if (!confirmDelete) return;

    try {
      if (entry.id) {
        await deleteAdminBoardEntry(entry.id);
      } else if (entry.uid) {
        await deleteAdminBoardEntriesByUid(entry.uid);
      }

      setRawEntries((prev) =>
        prev.filter((item) => (entry.id ? item.id !== entry.id : item.uid !== entry.uid))
      );

      if (editingId === entry.id) resetForm();
      setStatus(`Registro del UID ${entry.uid} eliminado correctamente.`);
    } catch (error) {
      console.error('Error eliminando registro:', error);
      setStatus('No se pudo eliminar el registro.');
    }
  };

  const requestSort = (key) => {
    let direction = 'desc';
    if (sortConfig.key === key && sortConfig.direction === 'desc') {
      direction = 'asc';
    }
    setSortConfig({ key, direction });
  };

  // Escala de colores solicitada:
  // > 220: Azul
  // 200 a 220: Verde
  // 180 a 199: Amarillo
  // 150 a 180: Naranja (150 <= val < 180)
  // < 150 (100 a 150 o menor): Rojo
  const getStatClass = (value) => {
    const num = Number(value || 0);
    if (num > 220) return 'cozy-blue font-black';
    if (num >= 200) return 'cozy-green font-bold';
    if (num >= 180) return 'cozy-yellow font-bold';
    if (num >= 150) return 'cozy-orange font-semibold';
    return 'cozy-red font-semibold';
  };

  const copyUidFast = async (uid) => {
    try {
      await navigator.clipboard.writeText(uid);
      setCopiedUid(uid);
      setTimeout(() => setCopiedUid((prev) => (prev === uid ? null : prev)), 1400);
    } catch (err) {
      console.warn('No se pudo copiar el UID', err);
    }
  };

  const copyAllUids = async () => {
    if (sortedEntries.length === 0) return;
    const uids = sortedEntries.map((e) => e.uid).join('\n');
    try {
      await navigator.clipboard.writeText(uids);
      setStatus(`📋 ¡${sortedEntries.length} UIDs copiados al portapapeles!`);
      setTimeout(() => setStatus(''), 2500);
    } catch (err) {
      console.warn('No se pudieron copiar los UIDs', err);
    }
  };

  if (!currentUser) {
    return (
      <section className="mb-4 rounded-2xl border border-green-200 bg-white p-3 shadow-sm">
        <button
          type="button"
          onClick={() => setIsOpen((prev) => !prev)}
          className="flex w-full items-center justify-between rounded-xl bg-green-100 hover:bg-green-200/80 px-3.5 py-2.5 text-left border border-green-200 transition"
        >
          <div className="flex items-center gap-2.5">
            <span className="rounded-full bg-green-600 px-2 py-0.5 text-[10px] font-black uppercase text-white">
              Cozy Farm
            </span>
            <div>
              <h2 className="text-sm font-black text-green-900">🌾 Cozy Farm</h2>
              <p className="text-[11px] text-green-700">Registro de progreso individual.</p>
            </div>
          </div>
          <span className="text-xl font-black text-green-800">{isOpen ? '−' : '+'}</span>
        </button>

        {isOpen && (
          <div className="mt-3 p-4 bg-green-50/70 rounded-xl border border-green-200 text-center">
            <p className="text-sm font-bold text-green-900 mb-1">
              🔒 Inicia sesión para registrar tu progreso de Cozy Farm
            </p>
            <p className="text-xs text-green-700 mb-3.5">
              Podrás llevar el control de tus estadísticas de animales (🐸, 🐼, 💧, 🦈, 🦉, 🦇) de forma individual.
            </p>
            {onOpenAuth && (
              <button
                type="button"
                onClick={onOpenAuth}
                className="bg-green-600 hover:bg-green-500 text-white font-black py-2 px-4 rounded-xl shadow-sm transition text-xs"
              >
                Iniciar Sesión
              </button>
            )}
          </div>
        )}
      </section>
    );
  }

  return (
    <section className="mb-4 rounded-2xl border border-green-200 bg-white p-3 shadow-sm">
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        className="flex w-full items-center justify-between rounded-xl bg-green-100 hover:bg-green-200/80 px-3.5 py-2.5 text-left border border-green-200 transition"
      >
        <div className="flex items-center gap-2.5">
          <span className="rounded-full bg-green-600 px-2 py-0.5 text-[10px] font-black uppercase text-white">
            Cozy Farm
          </span>
          <div>
            <h2 className="text-sm font-black text-green-900">🌾 Cozy Farm</h2>
            <p className="text-[11px] text-green-700">
              {isGlobalView
                ? 'Vista Global de Jugadores (Promedio más alto por UID)'
                : 'Registro de progreso individual'}
            </p>
          </div>
        </div>
        <span className="text-xl font-black text-green-800">{isOpen ? '−' : '+'}</span>
      </button>

      {isOpen && (
        <div className="mt-3 space-y-3">
          {/* Barra superior de controles y toggle de Admin */}
          <div className="flex flex-wrap items-center justify-between gap-2 bg-green-100/70 p-2 rounded-xl border border-green-200">
            <div className="flex items-center gap-1.5 flex-wrap">
              {isGlobalView && (
                <span className="text-xs font-bold bg-white px-2 py-1 rounded-lg text-green-900 border border-green-200 shadow-sm">
                  🌐 {sortedEntries.length} jugadores
                </span>
              )}
              <button
                type="button"
                onClick={fetchEntries}
                disabled={isLoading}
                className="rounded-lg bg-white hover:bg-green-50 px-2 py-1 text-[11px] font-bold text-green-800 border border-green-200 transition flex items-center gap-1"
                title="Recargar registros"
              >
                <span>{isLoading ? '⏳' : '🔄'}</span>
                <span>Recargar</span>
              </button>

              {sortedEntries.length > 0 && (
                <button
                  type="button"
                  onClick={copyAllUids}
                  className="rounded-lg bg-white hover:bg-green-50 px-2 py-1 text-[11px] font-bold text-green-800 border border-green-200 transition flex items-center gap-1 shadow-sm"
                  title="Copiar todos los UIDs de la tabla"
                >
                  <span>📋</span>
                  <span>Copiar UIDs</span>
                </button>
              )}
            </div>

            {/* Botón exclusivo para Administradores */}
            {isAdmin && (
              <button
                type="button"
                onClick={() => {
                  setIsGlobalView((prev) => !prev);
                  resetForm();
                }}
                className={`text-xs px-3 py-1.5 rounded-lg font-black transition border shadow-sm flex items-center gap-1.5 ${
                  isGlobalView
                    ? 'bg-green-600 text-white border-green-700 hover:bg-green-500'
                    : 'bg-white text-green-800 border-green-300 hover:bg-green-50'
                }`}
                title={isGlobalView ? 'Volver a mi listado personal' : 'Ver listado global de todos los jugadores'}
              >
                <span>{isGlobalView ? '🌱 Mi Lista' : '🌐 Global'}</span>
              </button>
            )}
          </div>

          {status && (
            <div className="rounded-xl border border-green-200 bg-green-50 px-3 py-2 text-xs font-semibold text-green-800 text-center">
              {status}
            </div>
          )}

          {/* Formulario de registro (visible en la lista personal) */}
          {!isGlobalView && (
            <form onSubmit={handleSubmit} className="space-y-3 rounded-xl border border-green-200 bg-green-50/70 p-3 shadow-sm">
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-[10px] font-black uppercase tracking-wide text-green-700">
                    UID del Jugador
                  </label>
                  {currentUser?.uid && form.uid !== currentUser.uid && (
                    <button
                      type="button"
                      onClick={() => setForm((prev) => ({ ...prev, uid: currentUser.uid }))}
                      className="text-[10px] font-bold text-green-700 hover:underline"
                    >
                      Usar mi UID ({currentUser.uid})
                    </button>
                  )}
                </div>
                <input
                  value={form.uid}
                  onChange={(event) => setForm((prev) => ({ ...prev, uid: event.target.value }))}
                  className="w-full rounded-xl border border-green-200 bg-white px-3 py-2 text-xs font-semibold text-green-900 outline-none focus:border-green-500"
                  placeholder="Ej. 10589616"
                  required
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-[10px] font-black uppercase tracking-wide text-green-700">
                    Estadísticas de Animales
                  </label>
                  <span className="text-[10px] text-green-600 font-semibold">Toca para ingresar</span>
                </div>
                <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
                  {STAT_CONFIG.map(({ key, emoji, name }) => (
                    <div key={key} className="bg-white/80 rounded-lg p-2 border border-green-200/80 text-center flex flex-col items-center">
                      <label className="mb-1.5 block text-lg leading-none cursor-default select-none" title={name}>
                        {emoji}
                      </label>
                      <input
                        type="number"
                        min="0"
                        max="999"
                        value={form[key]}
                        onChange={(event) => setForm((prev) => ({ ...prev, [key]: event.target.value }))}
                        className="w-full rounded-lg border border-green-300 bg-green-50/40 px-1 py-1.5 text-center text-xs font-black text-green-900 outline-none focus:border-green-500 focus:bg-white"
                      />
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex gap-2 pt-1">
                <button
                  type="submit"
                  disabled={isSaving}
                  className="flex-1 rounded-xl bg-green-600 hover:bg-green-500 px-4 py-2.5 text-xs font-black text-white shadow-sm transition disabled:opacity-70"
                >
                  {isSaving ? 'Guardando...' : editingId ? 'Actualizar Registro' : 'Guardar Progreso'}
                </button>
                {editingId && (
                  <button
                    type="button"
                    onClick={resetForm}
                    className="rounded-xl border border-gray-300 bg-white px-3 py-2.5 text-xs font-bold text-gray-700 hover:bg-gray-50"
                  >
                    Cancelar
                  </button>
                )}
              </div>
            </form>
          )}

          {/* Tabla de registros con scroll horizontal responsivo y tamaños compactos */}
          <div className="w-full overflow-x-auto rounded-xl border border-green-200 shadow-sm bg-white">
            <table className="w-full min-w-[360px] divide-y divide-green-200 text-left text-[11px] sm:text-xs">
              <thead className="bg-green-50 text-green-800 select-none">
                <tr>
                  <th
                    className="px-1.5 sm:px-2.5 py-2 font-black cursor-pointer hover:bg-green-100 whitespace-nowrap"
                    onClick={() => requestSort('uid')}
                  >
                    UID {sortConfig.key === 'uid' ? (sortConfig.direction === 'asc' ? '↑' : '↓') : ''}
                  </th>
                  {STAT_CONFIG.map(({ key, emoji, name }) => (
                    <th
                      key={key}
                      className="px-0.5 sm:px-1.5 py-2 font-black text-center cursor-pointer hover:bg-green-100"
                      onClick={() => requestSort(key)}
                      title={`Ordenar por ${name}`}
                    >
                      <span className="text-xs sm:text-sm">{emoji}</span>
                      {sortConfig.key === key && (
                        <span className="text-[9px] block leading-none">{sortConfig.direction === 'asc' ? '↑' : '↓'}</span>
                      )}
                    </th>
                  ))}
                  <th
                    className="px-1 sm:px-2 py-2 font-black text-center cursor-pointer hover:bg-green-100 whitespace-nowrap"
                    onClick={() => requestSort('prom')}
                  >
                    Prom. {sortConfig.key === 'prom' ? (sortConfig.direction === 'asc' ? '↑' : '↓') : ''}
                  </th>
                  <th className="px-1.5 sm:px-2 py-2 font-black text-center whitespace-nowrap">Acción</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-green-100">
                {isLoading ? (
                  <tr>
                    <td colSpan="9" className="px-3 py-6 text-center text-xs text-green-700">
                      ⏳ Cargando registros...
                    </td>
                  </tr>
                ) : sortedEntries.length === 0 ? (
                  <tr>
                    <td colSpan="9" className="px-3 py-6 text-center text-xs text-green-700">
                      {isGlobalView
                        ? 'No se encontraron registros de jugadores.'
                        : 'Aún no has registrado tus estadísticas. ¡Ingrésalas arriba!'}
                    </td>
                  </tr>
                ) : (
                  sortedEntries.map((entry) => {
                    const stats = getStatsArray(entry);
                    const averageNum = stats.reduce((sum, value) => sum + value, 0) / stats.length;
                    const average = averageNum.toFixed(1);
                    const avgClass = getStatClass(averageNum);

                    const isOwnUid = entry.uid === currentUser?.uid;
                    const isJustCopied = copiedUid === entry.uid;

                    return (
                      <tr
                        key={entry.id || entry.uid}
                        className={`hover:bg-green-50/70 transition ${
                          isJustCopied
                            ? 'bg-emerald-100/70'
                            : isOwnUid
                            ? 'bg-green-50/60 font-medium'
                            : ''
                        }`}
                      >
                        {/* Celda de UID con toque súper rápido para copiar */}
                        <td className="px-1.5 sm:px-2.5 py-1.5 font-black text-green-900">
                          <button
                            type="button"
                            onClick={() => copyUidFast(entry.uid)}
                            className="flex items-center gap-1 group text-left cursor-pointer rounded px-1 py-0.5 hover:bg-green-200/70 transition active:scale-95"
                            title="Toca para copiar UID al instante"
                          >
                            <span className="truncate max-w-[68px] sm:max-w-[95px] text-[11px] sm:text-xs">
                              {entry.uid}
                            </span>
                            <span className="text-[10px] shrink-0 font-bold">
                              {isJustCopied ? '✅' : '📋'}
                            </span>
                          </button>
                        </td>
                        {stats.map((value, index) => (
                          <td
                            key={`${entry.id || entry.uid}-${index}`}
                            className={`px-0.5 sm:px-1.5 py-1.5 text-center text-[11px] sm:text-xs ${getStatClass(value)}`}
                          >
                            {value}
                          </td>
                        ))}
                        <td className={`px-1 sm:px-2 py-1.5 text-center text-[11px] sm:text-xs ${avgClass}`}>
                          {average}
                        </td>
                        <td className="px-1.5 sm:px-2 py-1.5 text-center whitespace-nowrap">
                          {isGlobalView ? (
                            <div className="flex gap-1 justify-center items-center">
                              <button
                                type="button"
                                onClick={() => handleDelete(entry)}
                                className="rounded bg-red-50 hover:bg-red-100 text-red-600 border border-red-200 px-1.5 py-0.5 text-[10px] font-black"
                                title="Eliminar registro"
                              >
                                🗑️
                              </button>
                            </div>
                          ) : (
                            <div className="flex gap-1 justify-center items-center">
                              <button
                                type="button"
                                onClick={() => handleEdit(entry)}
                                className="rounded bg-yellow-50 hover:bg-yellow-100 text-yellow-800 border border-yellow-200 px-1.5 py-0.5 text-[10px] font-black"
                                title="Editar registro"
                              >
                                ✏️
                              </button>
                              <button
                                type="button"
                                onClick={() => handleDelete(entry)}
                                className="rounded bg-red-50 hover:bg-red-100 text-red-600 border border-red-200 px-1.5 py-0.5 text-[10px] font-black"
                                title="Eliminar registro"
                              >
                                🗑️
                              </button>
                            </div>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </section>
  );
}

