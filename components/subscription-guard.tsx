"use client"

import { useEffect, useState, useMemo } from "react"
import { usePathname, useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { Loader2 } from "lucide-react"

// Routes that don't require an active subscription
const ALLOWED_ROUTES = ['/subscribe', '/billing', '/success']

export function SubscriptionGuard({ children }: { children: React.ReactNode }) {
  const [subscriptionStatus, setSubscriptionStatus] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const pathname = usePathname()
  const router = useRouter()
  const supabase = useMemo(() => createClient(), [])

  useEffect(() => {
    async function checkSubscription() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        setLoading(false)
        return
      }

      // Get user's current organization and its subscription status
      const { data: orgMember } = await supabase
        .from('organization_members')
        .select('organizations(subscription_status)')
        .eq('profile_id', user.id)
        .limit(1)
        .single()

      if (orgMember) {
        const org = orgMember.organizations as any
        setSubscriptionStatus(org?.subscription_status || 'none')
      } else {
        setSubscriptionStatus('none')
      }
      
      setLoading(false)
    }

    checkSubscription()
  }, [supabase, pathname])

  // Check if current route is allowed without subscription
  const isAllowedRoute = ALLOWED_ROUTES.some(route => pathname.startsWith(route))

  // Check if subscription is active
  const hasActiveSubscription = subscriptionStatus === 'active' || subscriptionStatus === 'trialing'

  useEffect(() => {
    if (!loading && !hasActiveSubscription && !isAllowedRoute) {
      router.push('/subscribe')
    }
  }, [loading, hasActiveSubscription, isAllowedRoute, router])

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="size-6 animate-spin text-zinc-400" />
      </div>
    )
  }

  // If no active subscription and not on allowed route, show nothing (will redirect)
  if (!hasActiveSubscription && !isAllowedRoute) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="size-6 animate-spin text-zinc-400" />
      </div>
    )
  }

  return <>{children}</>
}
