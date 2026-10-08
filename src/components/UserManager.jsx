import { useState, useMemo } from 'react';
import { updateUserProfile, deleteUserAccount, resetAllPlayerProgress } from '../services/albumStore';

export function UserManager({
  currentUser,
  users = [],
  onReloadUsers,
  onUserUpdated,
  onUserDeleted,
  onResetAllProgress,
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [editingUser, setEditingUser] = useState(null);
  const [formUid, setFormUid] = useState('');
  const [formName, setFormName] = useState('');
  const [formPin, setFormPin] = useState('');
  const [statusMessage, setStatusMessage] = useState({ type: '', text: '' });
  const [isProcessing, setIsProcessing] = useState(false);
  const [showPins, setShowPins] = useState(true);
  const [copiedField, setCopiedField] = useState(null);

  // Solo el usuario Vaiu (UID 10589616 o nombre 'vaiu') tiene acceso
  const isVaiu = useMemo(() => {
    if (!currentUser) return false;
    const uid = String(currentUser.uid || '').trim();
    const name = String(currentUser.name || '').trim().toLowerCase();
    return uid === '10589616' || name === 'vaiu';
  }, [currentUser]);

  const filteredUsers = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    if (!term) return users;
    return users.filter(
      (u) =>
        String(u.uid || '').toLowerCase().includes(term) ||
        String(u.name || '').toLowerCase().includes(term)
    );
  }, [users, searchTerm]);

  const copyToClipboard = async (text, label) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedField(label);
      setTimeout(() => setCopiedField((prev) => (prev === label ? null : prev)), 1500);
    } catch (err) {
      console.warn('Error al copiar:', err);
    }
  };

  const handleStartEdit = (user) => {
    setEditingUser(user);
    setFormUid(user.uid || '');
    setFormName(user.name || '');
    setFormPin(user.pin || '');
    setStatusMessage({ type: '', text: '' });
  };

  const handleCancelEdit = () => {
    setEditingUser(null);
    setFormUid('');
    setFormName('');
    setFormPin('');
  };

  const handleSaveEdit = async (e) => {
    e.preventDefault();
    if (!editingUser) return;

    const trimmedOldUid = editingUser.uid;
    const trimmedNewUid = formUid.trim();
    const trimmedName = formName.trim();
    const trimmedPin = formPin.trim();

    if (!trimmedNewUid || !trimmedName || !trimmedPin) {
      setStatusMessage({
        type: 'error',
        text: 'Todos los campos (UID, Nombre y PIN) son obligatorios.',
      });
      return;
    }

    setIsProcessing(true);
    setStatusMessage({ type: '', text: '' });

    try {
      const updatedUser = await updateUserProfile({
        oldUid: trimmedOldUid,
        newUid: trimmedNewUid,
        name: trimmedName,
        pin: trimmedPin,
      });

      setStatusMessage({
        type: 'success',
        text: `¡Usuario "${trimmedName}" (${trimmedNewUid}) actualizado correctamente!`,
      });

      if (onUserUpdated) {
        onUserUpdated({
          oldUid: trimmedOldUid,
          newUid: trimmedNewUid,
          updatedUser,
        });
      }

      handleCancelEdit();
      if (onReloadUsers) onReloadUsers();
    } catch (err) {
      console.error('Error al actualizar usuario:', err);
      setStatusMessage({
        type: 'error',
        text: err.message || 'No se pudo actualizar el usuario.',
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDelete = async (user) => {
    const isSelf = user.uid === currentUser?.uid;
    if (isSelf) {
      alert('No puedes eliminar tu propia cuenta de administrador.');
      return;
    }

    const confirmDelete = window.confirm(
      `¿Estás seguro de eliminar al usuario "${user.name}" (UID: ${user.uid})?\n\nEsta acción borrará su cuenta y su progreso en el álbum.`
    );
    if (!confirmDelete) return;

    setIsProcessing(true);
    setStatusMessage({ type: '', text: '' });

    try {
      await deleteUserAccount(user.uid);
      setStatusMessage({
        type: 'success',
        text: `Usuario "${user.name}" eliminado correctamente.`,
      });

      if (onUserDeleted) {
        onUserDeleted(user.uid);
      }
      if (onReloadUsers) onReloadUsers();
    } catch (err) {
      console.error('Error al eliminar usuario:', err);
      setStatusMessage({
        type: 'error',
        text: err.message || 'No se pudo eliminar el usuario.',
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleResetAlbumForAll = async () => {
    const confirmation = window.prompt(
      '⚠️ ATENCIÓN: ¿Seguro que deseas REINICIAR el progreso de TODAS las cartas para TODOS los jugadores por nuevo álbum?\n\nEscribe "REINICIAR" para confirmar:'
    );

    if (confirmation !== 'REINICIAR') {
      if (confirmation !== null) {
        alert('Texto incorrecto. Acción cancelada.');
      }
      return;
    }

    setIsProcessing(true);
    setStatusMessage({ type: '', text: '' });

    try {
      await resetAllPlayerProgress();
      if (onResetAllProgress) {
        onResetAllProgress();
      }
      setStatusMessage({
        type: 'success',
        text: '✅ ¡Progreso de todos los jugadores reiniciado con éxito para el nuevo álbum!',
      });
    } catch (err) {
      console.error('Error al reiniciar progreso:', err);
      setStatusMessage({
        type: 'error',
        text: err.message || 'No se pudo reiniciar el progreso.',
      });
    } finally {
      setIsProcessing(false);
    }
  };

  if (!isVaiu) {
    return null;
  }

  return (
    <section className="mb-4 rounded-2xl border-2 border-purple-600/80 bg-stone-900/95 p-3 shadow-lg shadow-purple-950/40">
      {/* Botón Encabezado para desplegar */}
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        className="flex w-full items-center justify-between rounded-xl bg-purple-950/60 hover:bg-purple-900/60 px-3.5 py-2.5 text-left border border-purple-700/60 transition"
      >
        <div className="flex items-center gap-2.5">
          <span className="rounded-full bg-purple-600 px-2.5 py-0.5 text-[10px] font-black uppercase text-white tracking-wider shadow-sm">
            Exclusivo Vaiu
          </span>
          <div>
            <h2 className="text-sm font-black text-purple-200 flex items-center gap-1.5">
              <span>🔮 Modificar Cuentas & PINs</span>
            </h2>
            <p className="text-[11px] text-purple-300/80 font-semibold">
              Consulta credenciales, edita UID/Nombre o cambia PINs olvidados.
            </p>
          </div>
        </div>
        <span className="text-xl font-black text-purple-300">{isOpen ? '−' : '+'}</span>
      </button>

      {isOpen && (
        <div className="mt-3 space-y-3">
          {/* Mensajes de estado */}
          {statusMessage.text && (
            <div
              className={`rounded-xl px-3 py-2 text-xs font-bold text-center border shadow-sm ${
                statusMessage.type === 'error'
                  ? 'bg-red-950/80 text-red-200 border-red-800'
                  : 'bg-emerald-950/80 text-emerald-200 border-emerald-800'
              }`}
            >
              {statusMessage.text}
            </div>
          )}

          {/* Barra de Búsqueda y Filtros */}
          <div className="flex flex-wrap items-center justify-between gap-2 bg-purple-950/40 p-2.5 rounded-xl border border-purple-900/60">
            <div className="flex-1 min-w-[180px]">
              <div className="relative">
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="🔍 Buscar por nombre o UID..."
                  className="w-full rounded-xl border border-purple-700/60 bg-stone-950 pl-3 pr-8 py-1.5 text-xs font-bold text-purple-100 placeholder:text-purple-400/50 outline-none focus:border-purple-400 focus:ring-1 focus:ring-purple-400 shadow-inner"
                />
                {searchTerm && (
                  <button
                    type="button"
                    onClick={() => setSearchTerm('')}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-purple-400 hover:text-purple-200 font-black"
                  >
                    ✕
                  </button>
                )}
              </div>
            </div>

            <div className="flex items-center gap-1.5 flex-wrap">
              <button
                type="button"
                onClick={() => setShowPins((prev) => !prev)}
                className="rounded-lg bg-stone-900 hover:bg-purple-950/80 px-2.5 py-1.5 text-[11px] font-black text-purple-200 border border-purple-800/80 transition flex items-center gap-1 shadow-sm"
                title={showPins ? 'Ocultar PINs' : 'Mostrar PINs'}
              >
                <span>{showPins ? '🙈 Ocultar PINs' : '👁️ Ver PINs'}</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  if (onReloadUsers) onReloadUsers();
                }}
                disabled={isProcessing}
                className="rounded-lg bg-stone-900 hover:bg-purple-950/80 px-2.5 py-1.5 text-[11px] font-black text-purple-200 border border-purple-800/80 transition flex items-center gap-1 shadow-sm disabled:opacity-60"
                title="Actualizar lista de usuarios"
              >
                <span>🔄</span>
                <span>Refrescar ({users.length})</span>
              </button>

              <button
                type="button"
                onClick={handleResetAlbumForAll}
                disabled={isProcessing}
                className="rounded-lg bg-red-700 hover:bg-red-600 text-white px-2.5 py-1.5 text-[11px] font-black transition flex items-center gap-1 shadow-md disabled:opacity-60 border border-red-500/50"
                title="Reiniciar progreso de todos los jugadores para nuevo álbum"
              >
                <span>🗑️</span>
                <span>Reiniciar Álbum</span>
              </button>
            </div>
          </div>

          {/* Modal / Formulario de Edición */}
          {editingUser && (
            <div className="p-3.5 rounded-xl bg-stone-950 border-2 border-purple-500 space-y-3 shadow-md">
              <div className="flex items-center justify-between border-b border-purple-900/60 pb-2">
                <h3 className="text-xs font-black text-purple-200 flex items-center gap-1.5">
                  <span>✏️ Editando a:</span>
                  <span className="text-purple-300 underline font-extrabold">{editingUser.name}</span>
                </h3>
                <span className="text-[10px] bg-purple-950 border border-purple-700 text-purple-300 px-2 py-0.5 rounded-full font-black">
                  UID actual: {editingUser.uid}
                </span>
              </div>

              <form onSubmit={handleSaveEdit} className="space-y-2.5">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <div>
                    <label className="block text-[10px] font-black uppercase text-purple-300 mb-1">
                      UID (ID Jugador)
                    </label>
                    <input
                      type="text"
                      value={formUid}
                      onChange={(e) => setFormUid(e.target.value)}
                      className="w-full rounded-lg border border-purple-700 bg-stone-900 px-2.5 py-1.5 text-xs font-black text-purple-100 outline-none focus:border-purple-400 focus:ring-1 focus:ring-purple-400 shadow-inner"
                      required
                    />
                    <p className="text-[10px] text-purple-400/80 font-semibold mt-0.5">
                      Al cambiarlo se transfiere su progreso.
                    </p>
                  </div>

                  <div>
                    <label className="block text-[10px] font-black uppercase text-purple-300 mb-1">
                      Nombre
                    </label>
                    <input
                      type="text"
                      value={formName}
                      onChange={(e) => setFormName(e.target.value)}
                      className="w-full rounded-lg border border-purple-700 bg-stone-900 px-2.5 py-1.5 text-xs font-black text-purple-100 outline-none focus:border-purple-400 focus:ring-1 focus:ring-purple-400 shadow-inner"
                      required
                    />
                    <p className="text-[10px] text-purple-400/80 font-semibold mt-0.5">
                      Nombre o apodo visible.
                    </p>
                  </div>

                  <div>
                    <label className="block text-[10px] font-black uppercase text-purple-300 mb-1">
                      PIN de Acceso
                    </label>
                    <input
                      type="text"
                      value={formPin}
                      onChange={(e) => setFormPin(e.target.value)}
                      className="w-full rounded-lg border border-purple-700 bg-stone-900 px-2.5 py-1.5 text-xs font-black text-purple-100 outline-none focus:border-purple-400 focus:ring-1 focus:ring-purple-400 shadow-inner"
                      placeholder="Ej. 1234"
                      required
                    />
                    <p className="text-[10px] text-purple-400/80 font-semibold mt-0.5">
                      PIN para iniciar sesión.
                    </p>
                  </div>
                </div>

                <div className="flex gap-2 pt-1">
                  <button
                    type="submit"
                    disabled={isProcessing}
                    className="flex-1 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 px-3 py-2 text-xs font-black text-white shadow transition disabled:opacity-50"
                  >
                    {isProcessing ? '⏳ Guardando...' : '💾 Guardar Cambios'}
                  </button>
                  <button
                    type="button"
                    onClick={handleCancelEdit}
                    disabled={isProcessing}
                    className="rounded-xl border border-stone-800 bg-stone-900 px-3 py-2 text-xs font-bold text-stone-300 hover:bg-stone-800 transition shadow-sm"
                  >
                    Cancelar
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* Tabla / Lista de Usuarios */}
          <div className="w-full overflow-x-auto rounded-xl border border-purple-900/60 shadow-sm bg-stone-950">
            <table className="w-full min-w-[340px] divide-y divide-purple-900/60 text-left text-xs">
              <thead className="bg-purple-950/80 text-purple-200 select-none">
                <tr>
                  <th className="px-3 py-2 font-black">Nombre</th>
                  <th className="px-3 py-2 font-black">UID</th>
                  <th className="px-2 py-2 font-black text-center">PIN</th>
                  <th className="px-2 py-2 font-black text-center">Rol</th>
                  <th className="px-2.5 py-2 font-black text-center">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-purple-950/60">
                {filteredUsers.length === 0 ? (
                  <tr>
                    <td colSpan="5" className="px-3 py-6 text-center text-xs font-semibold text-purple-300/80">
                      {searchTerm
                        ? `No se encontraron usuarios que coincidan con "${searchTerm}".`
                        : 'No hay usuarios registrados.'}
                    </td>
                  </tr>
                ) : (
                  filteredUsers.map((user) => {
                    const isSelf = user.uid === currentUser?.uid;
                    const isCopiedUid = copiedField === `uid-${user.uid}`;
                    const isCopiedPin = copiedField === `pin-${user.uid}`;

                    return (
                      <tr
                        key={user.uid}
                        className={`hover:bg-purple-950/40 transition ${
                          isSelf ? 'bg-purple-950/30 font-medium' : ''
                        }`}
                      >
                        {/* Nombre */}
                        <td className="px-3 py-2 font-bold text-purple-100">
                          <div className="flex items-center gap-1.5">
                            <span className="font-extrabold text-purple-100">{user.name}</span>
                            {isSelf && (
                              <span className="text-[9px] bg-purple-600 text-white px-1.5 py-0.2 rounded font-black tracking-wide">
                                TÚ
                              </span>
                            )}
                          </div>
                        </td>

                        {/* UID con 1-clic para copiar */}
                        <td className="px-3 py-2 font-bold text-purple-200">
                          <button
                            type="button"
                            onClick={() => copyToClipboard(user.uid, `uid-${user.uid}`)}
                            className="flex items-center gap-1 group text-left cursor-pointer rounded px-1.5 py-0.5 hover:bg-purple-900/60 transition active:scale-95"
                            title="Toca para copiar UID"
                          >
                            <span className="font-mono text-xs font-bold text-purple-200">{user.uid}</span>
                            <span className="text-[10px] shrink-0 font-black">
                              {isCopiedUid ? '✅' : '📋'}
                            </span>
                          </button>
                        </td>

                        {/* PIN */}
                        <td className="px-2 py-2 text-center">
                          {showPins ? (
                            <button
                              type="button"
                              onClick={() => copyToClipboard(user.pin, `pin-${user.uid}`)}
                              className="inline-flex items-center gap-1 rounded bg-stone-900 px-2 py-0.5 border border-purple-800 text-purple-200 font-mono font-black text-xs hover:bg-purple-950 transition shadow-sm"
                              title="Toca para copiar PIN"
                            >
                              <span>{user.pin}</span>
                              <span className="text-[9px]">
                                {isCopiedPin ? '✅' : '📋'}
                              </span>
                            </button>
                          ) : (
                            <span className="text-stone-500 font-mono text-xs font-black">••••</span>
                          )}
                        </td>

                        {/* Rol */}
                        <td className="px-2 py-2 text-center">
                          {user.is_admin ? (
                            <span className="inline-block bg-purple-950 text-purple-300 text-[10px] font-black px-2 py-0.5 rounded-full border border-purple-600">
                              Admin
                            </span>
                          ) : (
                            <span className="inline-block bg-stone-900 text-stone-400 text-[10px] font-bold px-2 py-0.5 rounded-full border border-stone-800">
                              Jugador
                            </span>
                          )}
                        </td>

                        {/* Acciones */}
                        <td className="px-2.5 py-2 text-center whitespace-nowrap">
                          <div className="flex gap-1.5 justify-center items-center">
                            <button
                              type="button"
                              onClick={() => handleStartEdit(user)}
                              disabled={isProcessing}
                              className="rounded-lg bg-purple-600 hover:bg-purple-500 text-white px-2.5 py-1 text-[11px] font-black transition flex items-center gap-1 shadow-sm disabled:opacity-50"
                              title="Modificar Nombre, UID o PIN"
                            >
                              <span>✏️</span>
                              <span>Modificar</span>
                            </button>

                            {!isSelf && (
                              <button
                                type="button"
                                onClick={() => handleDelete(user)}
                                disabled={isProcessing}
                                className="rounded-lg bg-red-950/70 hover:bg-red-900 text-red-300 border border-red-800 px-2 py-1 text-[11px] font-black transition shadow-sm disabled:opacity-50"
                                title="Eliminar usuario y progreso"
                              >
                                🗑️
                              </button>
                            )}
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
