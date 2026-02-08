import Stripe from 'stripe'

if (!process.env.STRIPE_SECRET_KEY) {
  throw new Error('STRIPE_SECRET_KEY is not set')
}

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: '2026-01-28.clover',
  typescript: true,
})

export const STRIPE_PRICE_ID = process.env.STRIPE_PRICE_ID!

// Subscription status types that allow access
export const ACTIVE_SUBSCRIPTION_STATUSES = ['trialing', 'active'] as const

// Check if subscription status allows access
export function hasActiveSubscription(status: string | null | undefined): boolean {
  if (!status) return false
  return ACTIVE_SUBSCRIPTION_STATUSES.includes(status as any)
}
