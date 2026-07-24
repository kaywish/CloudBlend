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
    throw new Error(error.message)
  }
}

export async function fetchNotifications(): Promise<
  AppNotification[]
> {
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
  const { error } = await supabase
    .from("notifications")
    .update({
      is_read: true,
    })
    .eq("id", notificationId)

  if (error) {
    throw new Error(error.message)
  }
}

export async function markAllNotificationsRead(): Promise<void> {
  const { data: authData, error: authError } =
    await supabase.auth.getUser()

  if (authError) {
    throw new Error(authError.message)
  }

  const userId = authData.user?.id

  if (!userId) {
    throw new Error("You must be signed in.")
  }

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
  const { count, error } = await supabase
    .from("notifications")
    .select("id", {
      count: "exact",
      head: true,
    })
    .eq("is_read", false)

  if (error) {
    throw new Error(error.message)
  }

  return count ?? 0
}