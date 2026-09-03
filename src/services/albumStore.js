import { supabase } from '../supabaseClient'

const toCardRow = (card) => ({
  id: card.id,
  page: card.page,
  slot: card.slot,
  name: card.name,
  stars: card.stars,
  default_frame: card.defaultFrame,
  image_url: card.imageUrl || null,
})

const toProgressRow = (userId, cardId, count) => ({
  user_id: userId,
  card_id: cardId,
  count,
})

export async function loadGeneralCards() {
  const { data, error } = await supabase
    .from('general_cards')
    .select('id,page,slot,name,stars,default_frame')
    .order('page', { ascending: true })
    .order('slot', { ascending: true })

  if (error) throw error

  return data || []
}

export async function saveGeneralCard(card) {
  const { error } = await supabase.from('general_cards').upsert(toCardRow(card))

  if (error) throw error
}

export async function loadTeamProgress() {
  let allRows = []
  let page = 0
  const pageSize = 1000
  let hasMore = true

  while (hasMore) {
    const from = page * pageSize
    const to = from + pageSize - 1
    const { data, error } = await supabase
      .from('player_progress')
      .select('user_id,card_id,count')
      .range(from, to)

    if (error) throw error

    if (data && data.length > 0) {
      allRows.push(...data)
      if (data.length < pageSize) {
        hasMore = false
      } else {
        page++
      }
    } else {
      hasMore = false
    }
  }

  return allRows.reduce((progress, row) => {
    progress[row.user_id] ||= {}
    progress[row.user_id][row.card_id] = { count: row.count || 0 }
    return progress
  }, {})
}

export async function saveCardProgress(userId, cardId, count) {
  const { error } = await supabase
    .from('player_progress')
    .upsert(toProgressRow(userId, cardId, count), { onConflict: 'user_id,card_id' })

  if (error) throw error
}

// Guarda todo el progreso del usuario en una sola petición batch
export async function saveAllProgress(userId, progressMap) {
  const rows = Object.entries(progressMap).map(([cardId, entry]) =>
    toProgressRow(userId, cardId, typeof entry === 'number' ? entry : entry?.count ?? 0)
  )

  if (rows.length === 0) return

  const { data, error } = await supabase
    .from('player_progress')
    .upsert(rows, { onConflict: 'user_id,card_id', ignoreDuplicates: false })
    .select()

  if (error) {
    console.error('[saveAllProgress] Error de Supabase:', error)
    throw error
  }

  return data
}


// Usuarios
export async function loadUsers() {
  const { data, error } = await supabase
    .from('users')
    .select('uid,name,pin,is_admin')

  if (error) throw error

  return data || []
}

export async function loginUser(identifier, pin) {
  const normalizedIdentifier = String(identifier || '').trim();

  const { data, error } = await supabase
    .from('users')
    .select('*')
    .or(`uid.eq.${normalizedIdentifier},name.eq.${normalizedIdentifier}`)
    .eq('pin', pin)
    .limit(1)
    .maybeSingle()

  if (error) {
    if (error.code === 'PGRST116') {
      return null
    }
    throw error
  }

  return data
}

export async function registerUser(uid, name, pin) {
  const { data, error } = await supabase
    .from('users')
    .insert({ uid, name, pin, is_admin: false })
    .select()
    .single()

  if (error) throw error

  return data
}

export async function loadAdminBoardEntries(userUid) {
  let query = supabase
    .from('admin_board_entries')
    .select('*')
    .order('created_at', { ascending: false })

  if (userUid) {
    query = query.or(`group_code.eq.${userUid},uid.eq.${userUid}`)
  }

  const { data, error } = await query

  if (error) throw error

  return data || []
}

export async function loadAllAdminBoardEntries() {
  const { data, error } = await supabase
    .from('admin_board_entries')
    .select('*')
    .order('created_at', { ascending: false })

  if (error) throw error

  // Excluir la lista personal del usuario Vaiu (UID 10589616 o 'Vaiu')
  const excludedGroups = ['10589616', 'vaiu'];
  return (data || []).filter(
    (entry) => !excludedGroups.includes(String(entry.group_code || '').trim().toLowerCase())
  );
}

export async function saveAdminBoardEntry(entry, groupCode = 'global') {
  const payload = {
    id: entry.id || undefined,
    uid: entry.uid,
    group_code: groupCode || 'global',
    stat0: entry.stat0 ?? 0,
    stat1: entry.stat1 ?? 0,
    stat2: entry.stat2 ?? 0,
    stat3: entry.stat3 ?? 0,
    stat4: entry.stat4 ?? 0,
    stat5: entry.stat5 ?? 0,
  }

  let { data, error } = await supabase
    .from('admin_board_entries')
    .upsert(payload, { onConflict: 'uid,group_code' })
    .select()
    .single()

  // Fallback si la columna stat5 aún no se ha creado en la base de datos de Supabase
  if (error && (error.code === 'PGRST204' || String(error.message).includes('stat5'))) {
    console.warn(
      "Aviso: La columna 'stat5' aún no existe en Supabase. Ejecuta: alter table public.admin_board_entries add column if not exists stat5 integer default 0;"
    )
    const { stat5, ...fallbackPayload } = payload
    const retry = await supabase
      .from('admin_board_entries')
      .upsert(fallbackPayload, { onConflict: 'uid,group_code' })
      .select()
      .single()

    if (retry.error) throw retry.error
    return { ...retry.data, stat5: entry.stat5 ?? 0 }
  }

  if (error) throw error

  return data
}

export async function deleteAdminBoardEntry(id) {
  const { error } = await supabase
    .from('admin_board_entries')
    .delete()
    .eq('id', id)

  if (error) throw error
}

export async function deleteAdminBoardEntriesByUid(uid) {
  const { error } = await supabase
    .from('admin_board_entries')
    .delete()
    .eq('uid', uid)

  if (error) throw error
}

