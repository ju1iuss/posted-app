import Stripe from 'stripe'

let stripeInstance: Stripe | null = null

function getStripe(): Stripe {
  if (!stripeInstance) {
    if (!process.env.STRIPE_SECRET_KEY) {
      throw new Error('STRIPE_SECRET_KEY is not set')
    }
    stripeInstance = new Stripe(process.env.STRIPE_SECRET_KEY, {
      apiVersion: '2026-01-28.clover',
      typescript: true,
    })
  }
  return stripeInstance
}

// Lazy initialization - only creates Stripe instance when accessed at runtime
export const stripe = new Proxy({} as Stripe, {
  get(_target, prop) {
    const instance = getStripe()
    const value = instance[prop as keyof Stripe]
    return typeof value === 'function' ? value.bind(instance) : value
  }
}) as Stripe

export const STRIPE_PRICE_ID = process.env.STRIPE_PRICE_ID!

// Subscription status types that allow access
export const ACTIVE_SUBSCRIPTION_STATUSES = ['trialing', 'active'] as const

// Check if subscription status allows access
export function hasActiveSubscription(status: string | null | undefined): boolean {
  if (!status) return false
  return ACTIVE_SUBSCRIPTION_STATUSES.includes(status as any)
}
