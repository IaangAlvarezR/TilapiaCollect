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
  const { data, error } = await supabase
    .from('player_progress')
    .select('user_id,card_id,count')

  if (error) throw error

  return (data || []).reduce((progress, row) => {
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

export async function loadAdminBoardEntries(groupCode) {
  const { data, error } = await supabase
    .from('admin_board_entries')
    .select('*')
    .eq('group_code', groupCode)
    .order('created_at', { ascending: false })

  if (error) throw error

  return data || []
}

export async function loadAllAdminBoardEntries() {
  const { data, error } = await supabase
    .from('admin_board_entries')
    .select('*')
    .order('created_at', { ascending: false })

  if (error) throw error

  return data || []
}

export async function saveAdminBoardEntry(entry, groupCode) {
  const payload = {
    id: entry.id || undefined,
    uid: entry.uid,
    group_code: groupCode,
    stat0: entry.stat0 ?? 0,
    stat1: entry.stat1 ?? 0,
    stat2: entry.stat2 ?? 0,
    stat3: entry.stat3 ?? 0,
    stat4: entry.stat4 ?? 0,
  }

  const { data, error } = await supabase
    .from('admin_board_entries')
    .upsert(payload, { onConflict: 'uid,group_code' })
    .select()
    .single()

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

