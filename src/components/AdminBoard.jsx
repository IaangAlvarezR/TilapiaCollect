import { useEffect, useState } from 'react';
import { deleteAdminBoardEntry, loadAdminBoardEntries, saveAdminBoardEntry } from '../services/albumStore';

const emptyForm = {
  uid: '',
  stat0: '0',
  stat1: '0',
  stat2: '0',
  stat3: '0',
  stat4: '0',
};

export function AdminBoard({ isAdmin }) {
  const [entries, setEntries] = useState([]);
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState(null);
  const [status, setStatus] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    if (!isAdmin) return;

    let isMounted = true;

    const loadEntries = async () => {
      try {
        const data = await loadAdminBoardEntries();
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
  }, [isAdmin]);

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

      const savedEntry = await saveAdminBoardEntry(payload);

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

  if (!isAdmin) return null;

  return (
    <section className="border-b border-green-200 bg-white px-4 py-3">
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        className="flex w-full items-center justify-between rounded-xl border border-green-200 bg-green-50 px-3 py-2 text-left"
      >
        <div>
          <h2 className="text-sm font-black text-green-800">Cozy Farm</h2>
          <p className="text-[11px] text-green-700">Tabla compartida para editar en conjunto.</p>
        </div>
        <span className="text-lg font-black text-green-700">{isOpen ? '−' : '+'}</span>
      </button>

      {isOpen && (
        <div className="mt-3">
              {status && (
            <div className="mb-3 rounded-xl border border-green-200 bg-green-50 px-3 py-2 text-[11px] font-semibold text-green-700">
              {status}
            </div>
          )}

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

          <div className="mt-4 overflow-hidden rounded-2xl border border-green-200">
            <table className="min-w-full divide-y divide-green-200 bg-white text-left text-[11px]">
              <thead className="bg-green-50 text-green-700">
                <tr>
                  <th className="px-2 py-2 font-black">UID</th>
                  <th className="px-2 py-2 font-black">🐸</th>
                  <th className="px-2 py-2 font-black">🐼</th>
                  <th className="px-2 py-2 font-black">💧</th>
                  <th className="px-2 py-2 font-black">🦈</th>
                  <th className="px-2 py-2 font-black">🦉</th>
                  <th className="px-2 py-2 font-black">Prom.</th>
                  <th className="px-2 py-2 font-black">Acción</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-green-100">
                {entries.length === 0 ? (
                  <tr>
                    <td colSpan="8" className="px-3 py-4 text-center text-green-700">
                      Aún no hay registros compartidos.
                    </td>
                  </tr>
                ) : (
                  entries.map((entry) => {
                    const stats = [entry.stat0 ?? 0, entry.stat1 ?? 0, entry.stat2 ?? 0, entry.stat3 ?? 0, entry.stat4 ?? 0];
                    const average = (stats.reduce((sum, value) => sum + value, 0) / stats.length).toFixed(1);

                    return (
                      <tr key={entry.id} className="hover:bg-green-50/70">
                        <td className="px-2 py-2 font-black text-green-900">
                          <div className="flex items-center gap-2">
                            <span>{entry.uid}</span>
                            <button
                              type="button"
                              onClick={() => navigator.clipboard.writeText(entry.uid)}
                              className="rounded-lg bg-green-100 px-2 py-1 text-[10px] font-black text-green-800"
                              title="Copiar UID"
                            >
                              Copiar
                            </button>
                          </div>
                        </td>
                        {stats.map((value, index) => (
                          <td key={`${entry.id}-${index}`} className="px-2 py-2 text-green-800">
                            {value}
                          </td>
                        ))}
                        <td className="px-2 py-2 font-black text-green-800">{average}</td>
                        <td className="px-2 py-2">
                          <div className="flex gap-1">
                            <button
                              type="button"
                              onClick={() => handleEdit(entry)}
                              className="rounded-lg bg-amber-100 px-2 py-1 text-[10px] font-black text-amber-700"
                            >
                              Editar
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDelete(entry.id)}
                              className="rounded-lg bg-red-100 px-2 py-1 text-[10px] font-black text-red-700"
                            >
                              Borrar
                            </button>
                          </div>
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
