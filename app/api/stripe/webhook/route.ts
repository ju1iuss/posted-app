import { NextRequest, NextResponse } from 'next/server'
import { stripe } from '@/lib/stripe'
import { createClient } from '@supabase/supabase-js'
import Stripe from 'stripe'

// Disable body parsing - Stripe needs raw body for signature verification
export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

// Use service role for webhook to bypass RLS
function getSupabaseAdmin() {
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error('SUPABASE_SERVICE_ROLE_KEY is not set')
  }
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  )
}

export async function POST(request: NextRequest) {
  const body = await request.text()
  const signature = request.headers.get('stripe-signature')

  if (!signature) {
    return NextResponse.json({ error: 'No signature' }, { status: 400 })
  }

  let event: Stripe.Event

  try {
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET!
    )
  } catch (err: any) {
    console.error('Webhook signature verification failed:', err.message)
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
  }

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session
        await handleCheckoutCompleted(session)
        break
      }

      case 'customer.subscription.created':
      case 'customer.subscription.updated': {
        const subscription = event.data.object as Stripe.Subscription
        await handleSubscriptionUpdated(subscription)
        break
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription
        await handleSubscriptionDeleted(subscription)
        break
      }

      case 'invoice.payment_failed': {
        const invoice = event.data.object as Stripe.Invoice
        await handlePaymentFailed(invoice)
        break
      }

      default:
        console.log(`Unhandled event type: ${event.type}`)
    }

    return NextResponse.json({ received: true })
  } catch (error: any) {
    console.error('Webhook handler error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

async function handleCheckoutCompleted(session: Stripe.Checkout.Session) {
  const organizationId = session.metadata?.organization_id

  if (!organizationId) {
    console.error('No organization_id in checkout session metadata')
    return
  }

  const subscriptionId = session.subscription as string

  // Fetch the subscription to get details
  const subscription = await stripe.subscriptions.retrieve(subscriptionId, {
    expand: ['latest_invoice', 'customer']
  })

  const supabaseAdmin = getSupabaseAdmin()
  
  const { error } = await supabaseAdmin
    .from('organizations')
    .update({
      stripe_subscription_id: subscriptionId,
      subscription_status: subscription.status,
      subscription_current_period_end: (subscription as any).current_period_end
        ? new Date((subscription as any).current_period_end * 1000).toISOString()
        : null,
      trial_ends_at: subscription.trial_end 
        ? new Date(subscription.trial_end * 1000).toISOString() 
        : null,
    })
    .eq('id', organizationId)

  if (error) {
    console.error('Error updating organization after checkout:', error)
    throw error
  }

  console.log(`Checkout completed for org ${organizationId}, subscription: ${subscriptionId}`)
}

async function handleSubscriptionUpdated(subscription: Stripe.Subscription) {
  const supabaseAdmin = getSupabaseAdmin()
  const organizationId = subscription.metadata?.organization_id

  if (!organizationId) {
    // Try to find org by subscription ID
    const { data: org } = await supabaseAdmin
      .from('organizations')
      .select('id')
      .eq('stripe_subscription_id', subscription.id)
      .single()

    if (!org) {
      console.error('Could not find organization for subscription:', subscription.id)
      return
    }

    await updateOrganizationSubscription(org.id, subscription)
  } else {
    await updateOrganizationSubscription(organizationId, subscription)
  }
}

async function updateOrganizationSubscription(organizationId: string, subscription: Stripe.Subscription) {
  const supabaseAdmin = getSupabaseAdmin()
  
  const { error } = await supabaseAdmin
    .from('organizations')
    .update({
      subscription_status: subscription.status,
      subscription_current_period_end: (subscription as any).current_period_end
        ? new Date((subscription as any).current_period_end * 1000).toISOString()
        : null,
      trial_ends_at: subscription.trial_end 
        ? new Date(subscription.trial_end * 1000).toISOString() 
        : null,
    })
    .eq('id', organizationId)

  if (error) {
    console.error('Error updating subscription status:', error)
    throw error
  }

  console.log(`Subscription updated for org ${organizationId}: ${subscription.status}`)
}

async function handleSubscriptionDeleted(subscription: Stripe.Subscription) {
  const supabaseAdmin = getSupabaseAdmin()
  
  // Find org by subscription ID
  const { data: org } = await supabaseAdmin
    .from('organizations')
    .select('id')
    .eq('stripe_subscription_id', subscription.id)
    .single()

  if (!org) {
    console.error('Could not find organization for deleted subscription:', subscription.id)
    return
  }

  const { error } = await supabaseAdmin
    .from('organizations')
    .update({
      subscription_status: 'canceled',
      subscription_current_period_end: null,
      trial_ends_at: null,
    })
    .eq('id', org.id)

  if (error) {
    console.error('Error updating organization after subscription deletion:', error)
    throw error
  }

  console.log(`Subscription canceled for org ${org.id}`)
}

async function handlePaymentFailed(invoice: Stripe.Invoice) {
  const supabaseAdmin = getSupabaseAdmin()
  const subscriptionId = typeof (invoice as any).subscription === 'string' 
    ? (invoice as any).subscription 
    : (invoice as any).subscription?.id
  
  if (!subscriptionId) return

  // Find org by subscription ID
  const { data: org } = await supabaseAdmin
    .from('organizations')
    .select('id')
    .eq('stripe_subscription_id', subscriptionId)
    .single()

  if (!org) {
    console.error('Could not find organization for failed payment:', subscriptionId)
    return
  }

  // Update to past_due status
  const { error } = await supabaseAdmin
    .from('organizations')
    .update({ subscription_status: 'past_due' })
    .eq('id', org.id)

  if (error) {
    console.error('Error updating organization after payment failure:', error)
  }

  console.log(`Payment failed for org ${org.id}`)
}
