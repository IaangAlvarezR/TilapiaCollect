import { useEffect, useState } from 'react';
import { deleteAdminBoardEntry, loadAdminBoardEntries, loadAllAdminBoardEntries, saveAdminBoardEntry } from '../services/albumStore';

const emptyForm = {
  uid: '',
  stat0: '0',
  stat1: '0',
  stat2: '0',
  stat3: '0',
  stat4: '0',
};

export function AdminBoard({ currentUser }) {
  const [entries, setEntries] = useState([]);
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState(null);
  const [status, setStatus] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [isOpen, setIsOpen] = useState(true);
  const [currentGroupCode, setCurrentGroupCode] = useState(() => localStorage.getItem('cozy_group_code') || '');
  const [sortConfig, setSortConfig] = useState({ key: null, direction: 'desc' });

  useEffect(() => {
    if (currentGroupCode) {
      localStorage.setItem('cozy_group_code', currentGroupCode);
    } else {
      localStorage.removeItem('cozy_group_code');
    }
  }, [currentGroupCode]);

  useEffect(() => {
    if (!currentUser || !currentGroupCode) return;

    let isMounted = true;

    const loadEntries = async () => {
      try {
        let data = [];
        if (currentGroupCode === '0001' && currentUser?.is_admin) {
          data = await loadAllAdminBoardEntries();
          // Filter to unique UIDs
          const uniqueData = [];
          const seen = new Set();
          for (const item of data) {
            if (!seen.has(item.uid)) {
              seen.add(item.uid);
              uniqueData.push(item);
            }
          }
          data = uniqueData;
        } else {
          data = await loadAdminBoardEntries(currentGroupCode);
        }
        if (isMounted) setEntries(data);
      } catch (error) {
        if (isMounted) {
          setStatus('No se pudo cargar la tabla compartida.');
        }
      }
    };

    loadEntries();

    return () => {
      isMounted = false;
    };
  }, [currentUser, currentGroupCode]);

  const resetForm = () => {
    setForm(emptyForm);
    setEditingId(null);
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (!form.uid.trim()) return;

    setIsSaving(true);

    try {
      const payload = {
        id: editingId,
        uid: form.uid.trim(),
        stat0: Number(form.stat0 || 0),
        stat1: Number(form.stat1 || 0),
        stat2: Number(form.stat2 || 0),
        stat3: Number(form.stat3 || 0),
        stat4: Number(form.stat4 || 0),
      };

      const savedEntry = await saveAdminBoardEntry(payload, currentGroupCode);

      setEntries((prev) => {
        const exists = prev.some((item) => item.id === savedEntry.id);
        return exists
          ? prev.map((item) => (item.id === savedEntry.id ? savedEntry : item))
          : [savedEntry, ...prev];
      });

      setStatus(editingId ? 'Registro actualizado correctamente.' : 'Registro guardado correctamente.');
      resetForm();
    } catch (error) {
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
    });
  };

  const handleDelete = async (id) => {
    try {
      await deleteAdminBoardEntry(id);
      setEntries((prev) => prev.filter((entry) => entry.id !== id));
      if (editingId === id) resetForm();
      setStatus('Registro eliminado.');
    } catch (error) {
      setStatus('No se pudo eliminar el registro.');
    }
  };

  if (!currentUser) return null;

  const getAverage = (entry) => {
    const stats = [entry.stat0 ?? 0, entry.stat1 ?? 0, entry.stat2 ?? 0, entry.stat3 ?? 0, entry.stat4 ?? 0];
    return stats.reduce((sum, value) => sum + value, 0) / stats.length;
  };

  const sortedEntries = [...entries].sort((a, b) => {
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

  const requestSort = (key) => {
    let direction = 'desc';
    if (sortConfig.key === key && sortConfig.direction === 'desc') {
      direction = 'asc';
    }
    setSortConfig({ key, direction });
  };

  return (
    <section className="mb-4 rounded-3xl border-2 border-emerald-300 bg-gradient-to-br from-emerald-50 via-lime-50 to-white p-3 shadow-lg ring-4 ring-emerald-100">
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        className="flex w-full items-center justify-between rounded-2xl border border-emerald-400 bg-gradient-to-r from-emerald-600 to-lime-500 px-4 py-3 text-left shadow-md transition hover:brightness-105"
      >
        <div className="flex items-center gap-3">
          <span className="rounded-full bg-white/20 px-2 py-1 text-[10px] font-black uppercase tracking-[0.18em] text-emerald-50">
            Destacado
          </span>
          <div>
            <h2 className="text-base font-black text-white">Cozy Farm</h2>
            <p className="text-[11px] text-emerald-50/90">Tabla compartida para editar en conjunto.</p>
          </div>
        </div>
        <span className="text-2xl font-black text-white">{isOpen ? '−' : '+'}</span>
      </button>

      {isOpen && !currentGroupCode && (
        <div className="mt-3 p-4 bg-green-50 rounded-2xl border border-green-200 text-center">
          <p className="text-sm font-semibold text-green-800 mb-4">Crea o únete a una lista colaborativa.</p>
          <div className="flex flex-col gap-3 max-w-xs mx-auto">
            <button 
              onClick={() => {
                const code = Math.random().toString(36).substring(2, 8).toUpperCase();
                setCurrentGroupCode(code);
                setEntries([]);
              }}
              className="bg-green-600 text-white font-black py-2 px-4 rounded-xl shadow-sm hover:bg-green-500"
            >
              Crear nueva lista
            </button>
            <div className="relative flex items-center">
              <div className="flex-grow border-t border-green-300"></div>
              <span className="flex-shrink-0 mx-4 text-green-500 text-xs font-bold uppercase">O</span>
              <div className="flex-grow border-t border-green-300"></div>
            </div>
            <form onSubmit={(e) => {
              e.preventDefault();
              const code = e.target.elements.groupCode.value.trim().toUpperCase();
              if (code) {
                setCurrentGroupCode(code);
                setEntries([]);
              }
            }} className="flex gap-2">
              <input name="groupCode" placeholder="Código (ej. AB12CD)" className="w-full text-center uppercase border border-green-300 px-3 py-2 rounded-xl focus:outline-none focus:border-green-500 font-bold text-green-900" />
              <button type="submit" className="bg-green-100 text-green-800 border border-green-300 font-black py-2 px-3 rounded-xl hover:bg-green-200">
                Unirse
              </button>
            </form>
          </div>
        </div>
      )}

      {isOpen && currentGroupCode && (
        <div className="mt-3">
          <div className="mb-3 flex flex-col sm:flex-row items-center justify-between bg-green-100 p-2 rounded-xl border border-green-200">
            <span className="text-xs font-black text-green-800">Grupo actual: <span className="text-lg bg-white px-2 py-1 rounded text-green-700 select-all">{currentGroupCode}</span></span>
            <button onClick={() => setCurrentGroupCode('')} className="text-xs text-red-600 bg-red-100 hover:bg-red-200 px-2 py-1 rounded-lg mt-2 sm:mt-0 font-bold">Salir de la lista</button>
          </div>
          <p className="mt-2 text-xs text-green-800">Comparte este código para colaborar en la lista con amigos.</p>

          {status && (
            <div className="mb-3 rounded-xl border border-green-200 bg-green-50 px-3 py-2 text-[11px] font-semibold text-green-700">
              {status}
            </div>
          )}

          {!(currentGroupCode === '0001' && currentUser?.is_admin) && (
            <form onSubmit={handleSubmit} className="space-y-3 rounded-2xl border border-green-200 bg-green-50/70 p-3">
              <div>
          <label className="mb-1 block text-[10px] font-bold uppercase tracking-wide text-green-700">UID</label>
          <input
            value={form.uid}
            onChange={(event) => setForm((prev) => ({ ...prev, uid: event.target.value }))}
            className="w-full rounded-xl border border-green-200 bg-white px-3 py-2 text-sm font-semibold text-green-900 outline-none focus:border-green-500"
            placeholder="Número de UID"
          />
        </div>

        <div className="grid grid-cols-5 gap-2">
          {['stat0', 'stat1', 'stat2', 'stat3', 'stat4'].map((field, index) => (
            <div key={field}>
              <label className="mb-1 block text-[10px] font-bold uppercase tracking-wide text-green-700">
                {['🐸', '🐼', '💧', '🦈', '🦉'][index]}
              </label>
              <input
                type="number"
                min="0"
                value={form[field]}
                onChange={(event) => setForm((prev) => ({ ...prev, [field]: event.target.value }))}
                className="w-full rounded-lg border border-green-200 bg-white px-2 py-2 text-center text-sm font-semibold text-green-900 outline-none focus:border-green-500"
              />
            </div>
          ))}
        </div>

            <div className="flex gap-2">
              <button
                type="submit"
                disabled={isSaving}
                className="rounded-xl bg-green-600 px-3 py-2 text-xs font-black text-white shadow-sm transition hover:bg-green-500 disabled:opacity-70"
              >
                {isSaving ? 'Guardando...' : editingId ? 'Actualizar' : 'Agregar'}
              </button>
              <button
                type="button"
                onClick={resetForm}
                className="rounded-xl border border-green-200 bg-white px-3 py-2 text-xs font-bold text-green-700"
              >
                Limpiar
              </button>
            </div>
          </form>
          )}

          <div className="mt-4 overflow-hidden rounded-2xl border border-green-200">
            <table className="min-w-full divide-y divide-green-200 bg-white text-left text-[11px]">
              <thead className="bg-green-50 text-green-700">
                <tr>
                  <th className="px-2 py-2 font-black cursor-pointer hover:bg-green-100" onClick={() => requestSort('uid')}>
                    UID {sortConfig.key === 'uid' ? (sortConfig.direction === 'asc' ? '↑' : '↓') : ''}
                  </th>
                  <th className="px-2 py-2 font-black cursor-pointer hover:bg-green-100" onClick={() => requestSort('stat0')}>
                    🐸 {sortConfig.key === 'stat0' ? (sortConfig.direction === 'asc' ? '↑' : '↓') : ''}
                  </th>
                  <th className="px-2 py-2 font-black cursor-pointer hover:bg-green-100" onClick={() => requestSort('stat1')}>
                    🐼 {sortConfig.key === 'stat1' ? (sortConfig.direction === 'asc' ? '↑' : '↓') : ''}
                  </th>
                  <th className="px-2 py-2 font-black cursor-pointer hover:bg-green-100" onClick={() => requestSort('stat2')}>
                    💧 {sortConfig.key === 'stat2' ? (sortConfig.direction === 'asc' ? '↑' : '↓') : ''}
                  </th>
                  <th className="px-2 py-2 font-black cursor-pointer hover:bg-green-100" onClick={() => requestSort('stat3')}>
                    🦈 {sortConfig.key === 'stat3' ? (sortConfig.direction === 'asc' ? '↑' : '↓') : ''}
                  </th>
                  <th className="px-2 py-2 font-black cursor-pointer hover:bg-green-100" onClick={() => requestSort('stat4')}>
                    🦉 {sortConfig.key === 'stat4' ? (sortConfig.direction === 'asc' ? '↑' : '↓') : ''}
                  </th>
                  <th className="px-2 py-2 font-black cursor-pointer hover:bg-green-100" onClick={() => requestSort('prom')}>
                    Prom. {sortConfig.key === 'prom' ? (sortConfig.direction === 'asc' ? '↑' : '↓') : ''}
                  </th>
                  {!(currentGroupCode === '0001' && currentUser?.is_admin) && (
                    <th className="px-2 py-2 font-black">Acción</th>
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-green-100">
                {sortedEntries.length === 0 ? (
                  <tr>
                    <td colSpan="8" className="px-3 py-4 text-center text-green-700">
                      Aún no hay registros compartidos.
                    </td>
                  </tr>
                ) : (
                  sortedEntries.map((entry) => {
                    const stats = [entry.stat0 ?? 0, entry.stat1 ?? 0, entry.stat2 ?? 0, entry.stat3 ?? 0, entry.stat4 ?? 0];
                    const averageNum = stats.reduce((sum, value) => sum + value, 0) / stats.length;
                    const average = averageNum.toFixed(1);
                    let avgClass = '';
                    if (averageNum >= 100) avgClass = 'cozy-100';
                    else if (averageNum >= 90) avgClass = 'cozy-90';
                    else if (averageNum >= 80) avgClass = 'cozy-80';
                    else if (averageNum >= 70) avgClass = 'cozy-70';
                    else avgClass = 'cozy-below';

                    return (
                      <tr key={entry.id} className="hover:bg-green-50/70">
                        <td className="px-2 py-2 font-black text-green-900">
                          <div className="flex items-center gap-2">
                            <span>{entry.uid}</span>
                            <button
                              type="button"
                              onClick={async () => {
                                try {
                                  await navigator.clipboard.writeText(entry.uid);
                                  const el = document.createElement('div');
                                  el.textContent = 'UID copiado';
                                  Object.assign(el.style, {
                                    position: 'fixed',
                                    bottom: '16px',
                                    left: '50%',
                                    transform: 'translateX(-50%)',
                                    background: 'rgba(0,0,0,0.8)',
                                    color: 'white',
                                    padding: '8px 12px',
                                    borderRadius: '8px',
                                    zIndex: 9999,
                                    fontSize: '12px'
                                  });
                                  document.body.appendChild(el);
                                  setTimeout(() => el.remove(), 1800);
                                } catch (err) {
                                  console.warn('No se pudo copiar UID', err);
                                }
                              }}
                              className="rounded-lg bg-green-100 px-2 py-1 text-[10px] font-black text-green-800"
                              title="Copiar UID"
                              aria-label="Copiar UID"
                            >
                              📋
                            </button>
                          </div>
                        </td>
                        {stats.map((value, index) => {
                          let statClass = '';
                          if (value >= 100) statClass = 'cozy-100';
                          else if (value >= 90) statClass = 'cozy-90';
                          else if (value >= 80) statClass = 'cozy-80';
                          else if (value >= 70) statClass = 'cozy-70';
                          else statClass = 'cozy-below';

                          return (
                            <td key={`${entry.id}-${index}`} className={`px-2 py-2 ${statClass}`}>
                              {value}
                            </td>
                          );
                        })}
                        <td className={`px-2 py-2 font-black ${avgClass}`}>{average}</td>
                        {!(currentGroupCode === '0001' && currentUser?.is_admin) && (
                          <td className="px-2 py-2">
                            <div className="flex gap-1">
                              <button
                                type="button"
                                onClick={() => handleEdit(entry)}
                                className="rounded-lg bg-amber-100 px-2 py-1 text-[10px] font-black text-amber-700"
                                title="Editar registro"
                                aria-label="Editar registro"
                              >
                                ✏️
                              </button>
                              <button
                                type="button"
                                onClick={() => handleDelete(entry.id)}
                                className="rounded-lg bg-red-100 px-2 py-1 text-[10px] font-black text-red-700"
                                title="Eliminar registro"
                                aria-label="Eliminar registro"
                              >
                                🗑️
                              </button>
                            </div>
                          </td>
                        )}
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
