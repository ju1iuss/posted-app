"use client"

import { useEffect, useState, useMemo, useRef } from "react"
import { usePathname, useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { Loader2 } from "lucide-react"

// Routes that don't require an active subscription
const ALLOWED_ROUTES = ['/subscribe', '/billing', '/success']

export function SubscriptionGuard({ children }: { children: React.ReactNode }) {
  const [subscriptionStatus, setSubscriptionStatus] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const checkedRef = useRef(false)
  const pathname = usePathname()
  const router = useRouter()
  const supabase = useMemo(() => createClient(), [])

  // Only check subscription ONCE on mount, not on every navigation
  useEffect(() => {
    if (checkedRef.current) return
    checkedRef.current = true

    async function checkSubscription() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        setLoading(false)
        return
      }

      // Get ALL user's organizations and check if any has an active subscription
      const { data: orgMembers } = await supabase
        .from('organization_members')
        .select('organizations(subscription_status)')
        .eq('profile_id', user.id)

      if (orgMembers && orgMembers.length > 0) {
        // Check if any org has active or trialing subscription
        const hasAnyActiveOrg = orgMembers.some(member => {
          const org = member.organizations as any
          return org?.subscription_status === 'active' || org?.subscription_status === 'trialing'
        })
        setSubscriptionStatus(hasAnyActiveOrg ? 'active' : 'none')
      } else {
        setSubscriptionStatus('none')
      }
      
      setLoading(false)
    }

    checkSubscription()
  }, [supabase])

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
      <div className="fixed inset-0 flex items-center justify-center bg-[#171717] z-50">
        <Loader2 className="size-6 animate-spin text-zinc-400" />
      </div>
    )
  }

  // If no active subscription and not on allowed route, show nothing (will redirect)
  if (!hasActiveSubscription && !isAllowedRoute) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-[#171717] z-50">
        <Loader2 className="size-6 animate-spin text-zinc-400" />
      </div>
    )
  }

  return <>{children}</>
}
