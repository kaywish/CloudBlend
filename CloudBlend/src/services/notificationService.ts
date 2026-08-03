import { supabase } from "@/lib/supabase"

export type AppNotification = {
  id: string
  userId: string
  title: string
  message: string
  type: string
  data: Record<string, unknown> | null
  isRead: boolean
  createdAt: string
}

export async function createNotification({
  userId,
  title,
  message,
  type,
  data,
}: {
  userId: string
  title: string
  message: string
  type: string
  data?: Record<string, unknown>
}): Promise<void> {
  console.log("Creating notification for user:", {
    userId,
    title,
    type,
  })

const { error } = await supabase
  .from("notifications")
  .insert({
    user_id: userId,
    title,
    message,
    type,
    data: data ?? {},
    is_read: false,
  })

if (error) {
  console.error("Notification insert failed:", error)
  throw new Error(error.message)
}

console.log("Notification created successfully")
}

export async function fetchNotifications(): Promise<
  AppNotification[]
> {
  const userId = await getCurrentUserId()

  const { data, error } = await supabase
    .from("notifications")
    .select(`
      id,
      user_id,
      title,
      message,
      type,
      data,
      is_read,
      created_at
    `)
    .eq("user_id", userId)
    .order("created_at", {
      ascending: false,
    })

  if (error) {
    throw new Error(error.message)
  }

  return (data ?? []).map((row) => ({
    id: row.id,
    userId: row.user_id,
    title: row.title,
    message: row.message,
    type: row.type,
    data: row.data ?? null,
    isRead: row.is_read,
    createdAt: row.created_at,
  }))
}

export async function markNotificationRead(
  notificationId: string
): Promise<void> {
  const userId = await getCurrentUserId()

  const { error } = await supabase
    .from("notifications")
    .update({
      is_read: true,
    })
    .eq("id", notificationId)
    .eq("user_id", userId)

  if (error) {
    throw new Error(error.message)
  }
}

async function getCurrentUserId(): Promise<string> {
  const { data, error } = await supabase.auth.getUser()

  if (error) {
    throw new Error(error.message)
  }

  const userId = data.user?.id

  if (!userId) {
    throw new Error("You must be signed in.")
  }

  return userId
}

export async function markAllNotificationsRead(): Promise<void> {
  const userId = await getCurrentUserId()

  const { error } = await supabase
    .from("notifications")
    .update({
      is_read: true,
    })
    .eq("user_id", userId)
    .eq("is_read", false)

  if (error) {
    throw new Error(error.message)
  }
}

export async function getUnreadNotificationCount(): Promise<number> {
  const userId = await getCurrentUserId()

  const { count, error } = await supabase
    .from("notifications")
    .select("id", {
      count: "exact",
      head: true,
    })
    .eq("user_id", userId)
    .eq("is_read", false)

  if (error) {
    throw new Error(error.message)
  }

  return count ?? 0
}