import { useState, useMemo } from 'react';
import { updateUserProfile, deleteUserAccount } from '../services/albumStore';

export function UserManager({
  currentUser,
  users = [],
  onReloadUsers,
  onUserUpdated,
  onUserDeleted,
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

  if (!isVaiu) {
    return null;
  }

  return (
    <section className="mb-4 rounded-2xl border-2 border-indigo-500 bg-white p-3 shadow-md">
      {/* Botón Encabezado para desplegar */}
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        className="flex w-full items-center justify-between rounded-xl bg-indigo-50 hover:bg-indigo-100/90 px-3.5 py-2.5 text-left border border-indigo-200 transition"
      >
        <div className="flex items-center gap-2.5">
          <span className="rounded-full bg-indigo-600 px-2.5 py-0.5 text-[10px] font-black uppercase text-white tracking-wider shadow-sm">
            Exclusivo Vaiu
          </span>
          <div>
            <h2 className="text-sm font-black text-indigo-950 flex items-center gap-1.5">
              <span>🛠️ Modificar Cuentas & PINs</span>
            </h2>
            <p className="text-[11px] text-indigo-800 font-semibold">
              Consulta credenciales, edita UID/Nombre o cambia PINs olvidados.
            </p>
          </div>
        </div>
        <span className="text-xl font-black text-indigo-800">{isOpen ? '−' : '+'}</span>
      </button>

      {isOpen && (
        <div className="mt-3 space-y-3">
          {/* Mensajes de estado */}
          {statusMessage.text && (
            <div
              className={`rounded-xl px-3 py-2 text-xs font-bold text-center border shadow-sm ${
                statusMessage.type === 'error'
                  ? 'bg-red-100 text-red-900 border-red-300'
                  : 'bg-emerald-100 text-emerald-900 border-emerald-300'
              }`}
            >
              {statusMessage.text}
            </div>
          )}

          {/* Barra de Búsqueda y Filtros */}
          <div className="flex flex-wrap items-center justify-between gap-2 bg-indigo-50/90 p-2.5 rounded-xl border border-indigo-200">
            <div className="flex-1 min-w-[180px]">
              <div className="relative">
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="🔍 Buscar por nombre o UID..."
                  className="w-full rounded-xl border border-indigo-300 bg-white pl-3 pr-8 py-1.5 text-xs font-bold text-gray-900 placeholder:text-gray-500 outline-none focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600 shadow-sm"
                />
                {searchTerm && (
                  <button
                    type="button"
                    onClick={() => setSearchTerm('')}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-gray-500 hover:text-gray-800 font-black"
                  >
                    ✕
                  </button>
                )}
              </div>
            </div>

            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => setShowPins((prev) => !prev)}
                className="rounded-lg bg-white hover:bg-indigo-100/80 px-2.5 py-1.5 text-[11px] font-black text-indigo-900 border border-indigo-300 transition flex items-center gap-1 shadow-sm"
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
                className="rounded-lg bg-white hover:bg-indigo-100/80 px-2.5 py-1.5 text-[11px] font-black text-indigo-900 border border-indigo-300 transition flex items-center gap-1 shadow-sm disabled:opacity-60"
                title="Actualizar lista de usuarios"
              >
                <span>🔄</span>
                <span>Refrescar ({users.length})</span>
              </button>
            </div>
          </div>

          {/* Modal / Formulario de Edición */}
          {editingUser && (
            <div className="p-3.5 rounded-xl bg-indigo-50/95 border-2 border-indigo-400 space-y-3 shadow-sm">
              <div className="flex items-center justify-between border-b border-indigo-200 pb-2">
                <h3 className="text-xs font-black text-indigo-950 flex items-center gap-1.5">
                  <span>✏️ Editando a:</span>
                  <span className="text-indigo-900 underline font-extrabold">{editingUser.name}</span>
                </h3>
                <span className="text-[10px] bg-indigo-200 text-indigo-950 px-2 py-0.5 rounded-full font-black">
                  UID actual: {editingUser.uid}
                </span>
              </div>

              <form onSubmit={handleSaveEdit} className="space-y-2.5">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <div>
                    <label className="block text-[10px] font-black uppercase text-indigo-950 mb-1">
                      UID (ID Jugador)
                    </label>
                    <input
                      type="text"
                      value={formUid}
                      onChange={(e) => setFormUid(e.target.value)}
                      className="w-full rounded-lg border-2 border-indigo-300 bg-white px-2.5 py-1.5 text-xs font-black text-gray-900 outline-none focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600 shadow-sm"
                      required
                    />
                    <p className="text-[10px] text-indigo-900 font-semibold mt-0.5">
                      Al cambiarlo se transfiere su progreso.
                    </p>
                  </div>

                  <div>
                    <label className="block text-[10px] font-black uppercase text-indigo-950 mb-1">
                      Nombre
                    </label>
                    <input
                      type="text"
                      value={formName}
                      onChange={(e) => setFormName(e.target.value)}
                      className="w-full rounded-lg border-2 border-indigo-300 bg-white px-2.5 py-1.5 text-xs font-black text-gray-900 outline-none focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600 shadow-sm"
                      required
                    />
                    <p className="text-[10px] text-indigo-900 font-semibold mt-0.5">
                      Nombre o apodo visible.
                    </p>
                  </div>

                  <div>
                    <label className="block text-[10px] font-black uppercase text-indigo-950 mb-1">
                      PIN de Acceso
                    </label>
                    <input
                      type="text"
                      value={formPin}
                      onChange={(e) => setFormPin(e.target.value)}
                      className="w-full rounded-lg border-2 border-indigo-300 bg-white px-2.5 py-1.5 text-xs font-black text-gray-900 outline-none focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600 shadow-sm"
                      placeholder="Ej. 1234"
                      required
                    />
                    <p className="text-[10px] text-indigo-900 font-semibold mt-0.5">
                      PIN para iniciar sesión.
                    </p>
                  </div>
                </div>

                <div className="flex gap-2 pt-1">
                  <button
                    type="submit"
                    disabled={isProcessing}
                    className="flex-1 rounded-xl bg-indigo-600 hover:bg-indigo-500 px-3 py-2 text-xs font-black text-white shadow transition disabled:opacity-50"
                  >
                    {isProcessing ? '⏳ Guardando...' : '💾 Guardar Cambios'}
                  </button>
                  <button
                    type="button"
                    onClick={handleCancelEdit}
                    disabled={isProcessing}
                    className="rounded-xl border border-gray-300 bg-white px-3 py-2 text-xs font-bold text-gray-800 hover:bg-gray-100 transition shadow-sm"
                  >
                    Cancelar
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* Tabla / Lista de Usuarios */}
          <div className="w-full overflow-x-auto rounded-xl border border-indigo-200 shadow-sm bg-white">
            <table className="w-full min-w-[340px] divide-y divide-indigo-100 text-left text-xs">
              <thead className="bg-indigo-100/90 text-indigo-950 select-none">
                <tr>
                  <th className="px-3 py-2 font-black">Nombre</th>
                  <th className="px-3 py-2 font-black">UID</th>
                  <th className="px-2 py-2 font-black text-center">PIN</th>
                  <th className="px-2 py-2 font-black text-center">Rol</th>
                  <th className="px-2.5 py-2 font-black text-center">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-indigo-100">
                {filteredUsers.length === 0 ? (
                  <tr>
                    <td colSpan="5" className="px-3 py-6 text-center text-xs font-semibold text-indigo-800">
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
                        className={`hover:bg-indigo-50/70 transition ${
                          isSelf ? 'bg-indigo-50/50 font-medium' : ''
                        }`}
                      >
                        {/* Nombre */}
                        <td className="px-3 py-2 font-bold text-gray-900">
                          <div className="flex items-center gap-1.5">
                            <span className="font-extrabold text-gray-900">{user.name}</span>
                            {isSelf && (
                              <span className="text-[9px] bg-indigo-600 text-white px-1.5 py-0.2 rounded font-black tracking-wide">
                                TÚ
                              </span>
                            )}
                          </div>
                        </td>

                        {/* UID con 1-clic para copiar */}
                        <td className="px-3 py-2 font-bold text-indigo-950">
                          <button
                            type="button"
                            onClick={() => copyToClipboard(user.uid, `uid-${user.uid}`)}
                            className="flex items-center gap-1 group text-left cursor-pointer rounded px-1.5 py-0.5 hover:bg-indigo-100/80 transition active:scale-95"
                            title="Toca para copiar UID"
                          >
                            <span className="font-mono text-xs font-bold text-indigo-950">{user.uid}</span>
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
                              className="inline-flex items-center gap-1 rounded bg-indigo-50 px-2 py-0.5 border border-indigo-200 text-indigo-950 font-mono font-black text-xs hover:bg-indigo-100 transition shadow-sm"
                              title="Toca para copiar PIN"
                            >
                              <span>{user.pin}</span>
                              <span className="text-[9px]">
                                {isCopiedPin ? '✅' : '📋'}
                              </span>
                            </button>
                          ) : (
                            <span className="text-gray-500 font-mono text-xs font-black">••••</span>
                          )}
                        </td>

                        {/* Rol */}
                        <td className="px-2 py-2 text-center">
                          {user.is_admin ? (
                            <span className="inline-block bg-purple-100 text-purple-900 text-[10px] font-black px-2 py-0.5 rounded-full border border-purple-300">
                              Admin
                            </span>
                          ) : (
                            <span className="inline-block bg-gray-100 text-gray-800 text-[10px] font-bold px-2 py-0.5 rounded-full border border-gray-200">
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
                              className="rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white px-2.5 py-1 text-[11px] font-black transition flex items-center gap-1 shadow-sm disabled:opacity-50"
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
                                className="rounded-lg bg-red-100 hover:bg-red-200 text-red-800 border border-red-300 px-2 py-1 text-[11px] font-black transition shadow-sm disabled:opacity-50"
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
