import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = 'https://zcjwzikydemajehwpegt.supabase.co'
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inpjand6aWt5ZGVtYWplaHdwZWd0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODI1OTMzNDksImV4cCI6MjA5ODE2OTM0OX0.Zl7Ubc0zZxlokoijuvsWjkl0iZntBMjgom6jO5IVrzk'

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false
  }
})

// ── AUTH ──────────────────────────────────────────────────────────────────────

export async function signUp({ email, password, name, role, inviteCode, phone }) {
  // 1. Create auth user
  const { data: authData, error: authError } = await supabase.auth.signUp({
    email: email.trim().toLowerCase(),
    password
  })
  if (authError) throw authError
  if (!authData.user) throw new Error('Sign up failed — no user returned')

  const userId = authData.user.id
  const avatarInitials = name.trim().split(' ').map(w => w[0] || '').join('').slice(0, 2).toUpperCase()

  // 2. Insert profile into users table
  const { error: profileError } = await supabase.from('users').insert({
    id: userId,
    email: email.trim().toLowerCase(),
    name: name.trim(),
    role,
    avatar: avatarInitials,
    phone: phone || null,
    invite_code: inviteCode || null,
    plan: role === 'manager' ? 'pro' : null,
    rating: 5.0,
    jobs_completed: 0,
    total_earned: 0,
    stripe_status: 'pending',
    joined_at: new Date().toISOString()
  })
  if (profileError) throw profileError

  return { userId, email, name, role }
}

export async function signIn({ email, password }) {
  const { data, error } = await supabase.auth.signInWithPassword({
    email: email.trim().toLowerCase(),
    password
  })
  if (error) throw error
  return data
}

export async function signOut() {
  const { error } = await supabase.auth.signOut()
  if (error) throw error
}

export async function getCurrentUser() {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data: profile, error } = await supabase
    .from('users')
    .select('*')
    .eq('id', user.id)
    .single()

  if (error || !profile) return null
  return profile
}

export function onAuthStateChange(callback) {
  return supabase.auth.onAuthStateChange(async (event, session) => {
    if (session?.user) {
      const profile = await getCurrentUser()
      callback(profile)
    } else {
      callback(null)
    }
  })
}

// ── USERS ─────────────────────────────────────────────────────────────────────

export async function getUserProfile(userId) {
  const { data, error } = await supabase
    .from('users')
    .select('*')
    .eq('id', userId)
    .single()
  if (error) throw error
  return data
}

export async function updateUserProfile(userId, updates) {
  const { data, error } = await supabase
    .from('users')
    .update(updates)
    .eq('id', userId)
    .select()
    .single()
  if (error) throw error
  return data
}

export async function getCleanersByInviteCode(inviteCode) {
  const { data, error } = await supabase
    .from('users')
    .select('*')
    .eq('invite_code', inviteCode)
    .eq('role', 'manager')
    .single()
  if (error) return null
  return data
}

export async function getTeamCleaners(managerId) {
  // Get cleaners linked to this manager via property_cleaners
  const { data, error } = await supabase
    .from('users')
    .select('*')
    .eq('role', 'cleaner')
    .order('name')
  if (error) throw error
  return data || []
}

// ── PROPERTIES ────────────────────────────────────────────────────────────────

export async function getProperties(managerId) {
  const { data, error } = await supabase
    .from('properties')
    .select('*')
    .eq('manager_id', managerId)
    .order('created_at', { ascending: true })
  if (error) throw error
  // Map JSONB columns back to app field names
  return (data || []).map(p => ({
    ...p,
    tasks: p.tasks_data || [],
    rooms: p.rooms_data || [],
    inventory: p.inventory_data || [],
    schedule: p.schedule || [],
    cleanerPhotos: p.cleaner_photos || [],
    linenBagPhotos: p.linen_bag_photos || [],
    cleanerNotes: p.cleaner_notes || '',
    checkIn: p.check_in || '4:00 PM',
    checkOut: p.check_out || '11:00 AM',
    sameDay: p.same_day || false,
    accessCode: p.access_code || '',
    supplyInfo: p.supply_info || '',
    alarmCode: p.alarm_code || '',
    linenRate: p.linen_rate || 10,
    linenBags: p.linen_bags || 0,
    totalBeds: p.total_beds || 1,
    assignedTo: p.assigned_to || null,
  }))
}

export async function createProperty(property) {
  // Map app field names to DB column names
  const dbProp = {
    manager_id: property.manager_id,
    name: property.name,
    address: property.address,
    type: property.type || 'Airbnb',
    pay: property.pay || 0,
    bedrooms: property.bedrooms || 1,
    bathrooms: property.bathrooms || 1,
    photo: property.photo || null,
    notes: property.notes || '',
    check_in: property.check_in || property.checkIn || '4:00 PM',
    check_out: property.check_out || property.checkOut || '11:00 AM',
    same_day: property.same_day || property.sameDay || false,
    access_code: property.access_code || property.accessCode || null,
    supply_info: property.supply_info || property.supplyInfo || null,
    alarm_code: property.alarm_code || property.alarmCode || null,
    linen_rate: property.linen_rate || property.linenRate || 10,
    total_beds: property.total_beds || property.totalBeds || property.bedrooms || 1,
    tasks_data: property.tasks || [],
    rooms_data: property.rooms || [],
    inventory_data: property.inventory || [],
    schedule: property.schedule || [],
    cleaner_photos: property.cleanerPhotos || [],
    linen_bag_photos: property.linenBagPhotos || [],
    cleaner_notes: property.cleanerNotes || '',
    linen_bags: property.linenBags || 0,
    assigned_to: property.assignedTo || null,
  }
  const { data, error } = await supabase
    .from('properties')
    .insert(dbProp)
    .select()
    .single()
  if (error) throw error
  return data
}

export async function updateProperty(id, updates) {
  // Map app field names to DB column names
  const dbUpdates = {}
  if (updates.name !== undefined) dbUpdates.name = updates.name
  if (updates.address !== undefined) dbUpdates.address = updates.address
  if (updates.type !== undefined) dbUpdates.type = updates.type
  if (updates.pay !== undefined) dbUpdates.pay = updates.pay
  if (updates.bedrooms !== undefined) dbUpdates.bedrooms = updates.bedrooms
  if (updates.bathrooms !== undefined) dbUpdates.bathrooms = updates.bathrooms
  if (updates.photo !== undefined) dbUpdates.photo = updates.photo
  if (updates.notes !== undefined) dbUpdates.notes = updates.notes
  if (updates.checkIn !== undefined) dbUpdates.check_in = updates.checkIn
  if (updates.check_in !== undefined) dbUpdates.check_in = updates.check_in
  if (updates.checkOut !== undefined) dbUpdates.check_out = updates.checkOut
  if (updates.check_out !== undefined) dbUpdates.check_out = updates.check_out
  if (updates.sameDay !== undefined) dbUpdates.same_day = updates.sameDay
  if (updates.same_day !== undefined) dbUpdates.same_day = updates.same_day
  if (updates.accessCode !== undefined) dbUpdates.access_code = updates.accessCode
  if (updates.access_code !== undefined) dbUpdates.access_code = updates.access_code
  if (updates.supplyInfo !== undefined) dbUpdates.supply_info = updates.supplyInfo
  if (updates.supply_info !== undefined) dbUpdates.supply_info = updates.supply_info
  if (updates.alarmCode !== undefined) dbUpdates.alarm_code = updates.alarmCode
  if (updates.alarm_code !== undefined) dbUpdates.alarm_code = updates.alarm_code
  if (updates.linenRate !== undefined) dbUpdates.linen_rate = updates.linenRate
  if (updates.linen_rate !== undefined) dbUpdates.linen_rate = updates.linen_rate
  if (updates.totalBeds !== undefined) dbUpdates.total_beds = updates.totalBeds
  if (updates.total_beds !== undefined) dbUpdates.total_beds = updates.total_beds
  if (updates.tasks !== undefined) dbUpdates.tasks_data = updates.tasks
  if (updates.rooms !== undefined) dbUpdates.rooms_data = updates.rooms
  if (updates.inventory !== undefined) dbUpdates.inventory_data = updates.inventory
  if (updates.schedule !== undefined) dbUpdates.schedule = updates.schedule
  if (updates.cleanerPhotos !== undefined) dbUpdates.cleaner_photos = updates.cleanerPhotos
  if (updates.linenBagPhotos !== undefined) dbUpdates.linen_bag_photos = updates.linenBagPhotos
  if (updates.cleanerNotes !== undefined) dbUpdates.cleaner_notes = updates.cleanerNotes
  if (updates.linenBags !== undefined) dbUpdates.linen_bags = updates.linenBags
  if (updates.assignedTo !== undefined) dbUpdates.assigned_to = updates.assignedTo
  if (updates.guest_rating !== undefined) dbUpdates.guest_rating = updates.guest_rating

  const { data, error } = await supabase
    .from('properties')
    .update(dbUpdates)
    .eq('id', id)
    .select()
    .single()
  if (error) throw error
  return data
}

export async function deleteProperty(id) {
  const { error } = await supabase.from('properties').delete().eq('id', id)
  if (error) throw error
}

// ── SCHEDULE SLOTS ────────────────────────────────────────────────────────────

export async function getSlots(propertyId) {
  const { data, error } = await supabase
    .from('schedule_slots')
    .select('*')
    .eq('property_id', propertyId)
    .order('date', { ascending: true })
  if (error) throw error
  return data || []
}

export async function createSlot(slot) {
  const { data, error } = await supabase
    .from('schedule_slots')
    .insert(slot)
    .select()
    .single()
  if (error) throw error
  return data
}

export async function updateSlot(id, updates) {
  const { data, error } = await supabase
    .from('schedule_slots')
    .update(updates)
    .eq('id', id)
    .select()
    .single()
  if (error) throw error
  return data
}

export async function getCleanerSlots(cleanerId) {
  const { data, error } = await supabase
    .from('schedule_slots')
    .select('*, properties(*)')
    .or(`cleaner_id.eq.${cleanerId},cleaner_id2.eq.${cleanerId}`)
    .order('date', { ascending: true })
  if (error) throw error
  return data || []
}

// ── JOBS ──────────────────────────────────────────────────────────────────────

export async function getJobs(filter = {}) {
  let query = supabase.from('jobs').select('*').order('created_at', { ascending: false })
  if (filter.cleanerId) query = query.eq('cleaner_id', filter.cleanerId)
  if (filter.propertyId) query = query.eq('property_id', filter.propertyId)
  if (filter.status) query = query.eq('status', filter.status)
  const { data, error } = await query
  if (error) throw error
  return data || []
}

export async function createJob(job) {
  const { data, error } = await supabase.from('jobs').insert(job).select().single()
  if (error) throw error
  return data
}

export async function updateJob(id, updates) {
  const { data, error } = await supabase.from('jobs').update(updates).eq('id', id).select().single()
  if (error) throw error
  return data
}

export async function getPendingJobs(managerId) {
  // Get all jobs for properties owned by this manager
  const { data, error } = await supabase
    .from('jobs')
    .select(`*, properties!inner(manager_id)`)
    .eq('properties.manager_id', managerId)
    .eq('status', 'pending_approval')
    .order('created_at', { ascending: false })
  if (error) throw error
  return data || []
}

// ── MESSAGES ──────────────────────────────────────────────────────────────────

export async function getMessages(userId, otherUserId) {
  const { data, error } = await supabase
    .from('messages')
    .select('*')
    .or(`and(from_id.eq.${userId},to_id.eq.${otherUserId}),and(from_id.eq.${otherUserId},to_id.eq.${userId})`)
    .order('created_at', { ascending: true })
  if (error) throw error
  return data || []
}

export async function sendMessage(message) {
  const { data, error } = await supabase.from('messages').insert(message).select().single()
  if (error) throw error
  return data
}

export function subscribeToMessages(userId, callback) {
  return supabase
    .channel(`messages:${userId}`)
    .on('postgres_changes', {
      event: 'INSERT',
      schema: 'public',
      table: 'messages',
      filter: `to_id=eq.${userId}`
    }, payload => callback(payload.new))
    .subscribe()
}

// ── NOTIFICATIONS ─────────────────────────────────────────────────────────────

export async function getNotifications(userId) {
  const { data, error } = await supabase
    .from('notifications')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(50)
  if (error) throw error
  return data || []
}

export async function createNotification(notification) {
  const { error } = await supabase.from('notifications').insert(notification)
  if (error) throw error
}

export async function markNotificationsRead(userId) {
  const { error } = await supabase
    .from('notifications')
    .update({ read: true })
    .eq('user_id', userId)
  if (error) throw error
}

export function subscribeToNotifications(userId, callback) {
  return supabase
    .channel(`notifications:${userId}`)
    .on('postgres_changes', {
      event: 'INSERT',
      schema: 'public',
      table: 'notifications',
      filter: `user_id=eq.${userId}`
    }, payload => callback(payload.new))
    .subscribe()
}

// ── FILE STORAGE ──────────────────────────────────────────────────────────────

export async function uploadFile(bucket, path, file) {
  const { data, error } = await supabase.storage
    .from(bucket)
    .upload(path, file, { cacheControl: '3600', upsert: true })
  if (error) throw error
  const { data: { publicUrl } } = supabase.storage.from(bucket).getPublicUrl(path)
  return publicUrl
}

export async function uploadBase64(bucket, path, base64String, mimeType) {
  // Convert base64 to blob for upload
  const base64Data = base64String.split(',')[1]
  const byteCharacters = atob(base64Data)
  const byteNumbers = new Array(byteCharacters.length)
  for (let i = 0; i < byteCharacters.length; i++) {
    byteNumbers[i] = byteCharacters.charCodeAt(i)
  }
  const byteArray = new Uint8Array(byteNumbers)
  const blob = new Blob([byteArray], { type: mimeType })
  return await uploadFile(bucket, path, blob)
}

// ── GUEST REVIEWS ─────────────────────────────────────────────────────────────

export async function saveGuestReview(review) {
  const { data, error } = await supabase
    .from('jobs')
    .update({ guest_rating: review.rating, guest_review: review.comment })
    .eq('id', review.jobId)
    .select()
    .single()
  if (error) throw error
  return data
}

export async function getPropertyReviews(propertyId) {
  const { data, error } = await supabase
    .from('jobs')
    .select('guest_rating, guest_review, completed_at, cleaner_id')
    .eq('property_id', propertyId)
    .not('guest_rating', 'is', null)
    .order('completed_at', { ascending: false })
  if (error) throw error
  return data || []
}

// ── REAL-TIME SUBSCRIPTIONS ───────────────────────────────────────────────────

export function subscribeToJobUpdates(propertyId, callback) {
  return supabase
    .channel(`jobs:${propertyId}`)
    .on('postgres_changes', {
      event: '*',
      schema: 'public',
      table: 'jobs',
      filter: `property_id=eq.${propertyId}`
    }, payload => callback(payload))
    .subscribe()
}

export function subscribeToSlotUpdates(cleanerId, callback) {
  return supabase
    .channel(`slots:${cleanerId}`)
    .on('postgres_changes', {
      event: '*',
      schema: 'public',
      table: 'schedule_slots',
      filter: `cleaner_id=eq.${cleanerId}`
    }, payload => callback(payload))
    .subscribe()
}
