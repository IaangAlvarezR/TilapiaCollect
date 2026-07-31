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

const getFileExtension = (file) => {
  const extension = file.name.split('.').pop()
  return extension || file.type.split('/').pop() || 'jpg'
}

export async function uploadAlbumImage(file, folder) {
  const path = `${folder}/${crypto.randomUUID()}.${getFileExtension(file)}`
  const { error: uploadError } = await supabase.storage
    .from('card-images')
    .upload(path, file)

  if (uploadError) throw uploadError

  const { data } = supabase.storage.from('card-images').getPublicUrl(path)

  return data.publicUrl
}

export async function loadGeneralCards() {
  const { data, error } = await supabase
    .from('general_cards')
    .select('id,page,slot,name,stars,default_frame,image_url')
    .order('page', { ascending: true })
    .order('slot', { ascending: true })

  if (error) throw error

  return data || []
}

export async function saveGeneralCard(card) {
  const { error } = await supabase.from('general_cards').upsert(toCardRow(card))

  if (error) throw error
}

export async function loadPageImages() {
  const { data, error } = await supabase
    .from('page_images')
    .select('page,image_url')
    .order('page', { ascending: true })

  if (error) throw error

  return Object.fromEntries((data || []).map((row) => [row.page, row.image_url]))
}

export async function savePageImage(page, imageUrl) {
  const { error } = await supabase.from('page_images').upsert({
    page,
    image_url: imageUrl,
  })

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
