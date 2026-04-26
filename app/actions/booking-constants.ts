// Shared constants — no "use server" or "use client" directive.
// Import freely from both server actions and client components.

export const WORKING_HOURS = [
  "08:00","09:00","10:00","11:00","12:00",
  "13:00","14:00","15:00","16:00","17:00",
] as const

export type WorkingHour = typeof WORKING_HOURS[number]
