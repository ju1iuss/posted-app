"use client"

import { useEffect, useState, useMemo, useRef } from "react"
import { useRouter } from "next/navigation"
import { Check, ArrowRight, PartyPopper, Sparkles, Zap, ShieldCheck, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { createClient } from "@/lib/supabase/client"
import confetti from "canvas-confetti"

export default function SuccessPage() {
  const router = useRouter()
  const [isReady, setIsReady] = useState(false)
  const [pollCount, setPollCount] = useState(0)
  const confettiFired = useRef(false)
  const supabase = useMemo(() => createClient(), [])

  // Poll for subscription status
  useEffect(() => {
    let isMounted = true
    
    const checkSubscription = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return false

        const { data: orgMember } = await supabase
          .from('organization_members')
          .select('organizations(subscription_status)')
          .eq('profile_id', user.id)
          .limit(1)
          .single()

        const status = (orgMember?.organizations as any)?.subscription_status
        return status === 'active' || status === 'trialing'
      } catch (e) {
        console.error('Error checking subscription:', e)
        return false
      }
    }

    const poll = async () => {
      if (!isMounted) return
      
      const hasSubscription = await checkSubscription()
      
      if (hasSubscription) {
        setIsReady(true)
        return
      }
      
      setPollCount(prev => prev + 1)
      
      // Poll for up to 30 seconds (15 attempts at 2s each)
      if (pollCount < 15) {
        setTimeout(poll, 2000)
      } else {
        // After 30 seconds, assume it worked and let them proceed
        // The webhook will eventually process
        setIsReady(true)
      }
    }

    poll()
    
    return () => { isMounted = false }
  }, [supabase, pollCount])

  // Fire confetti when ready
  useEffect(() => {
    if (!isReady || confettiFired.current) return
    confettiFired.current = true

    const duration = 3 * 1000
    const animationEnd = Date.now() + duration
    const defaults = { startVelocity: 30, spread: 360, ticks: 60, zIndex: 0 }

    const randomInRange = (min: number, max: number) => Math.random() * (max - min) + min

    const interval = setInterval(function() {
      const timeLeft = animationEnd - Date.now()

      if (timeLeft <= 0) {
        return clearInterval(interval)
      }

      const particleCount = 50 * (timeLeft / duration)
      confetti({ ...defaults, particleCount, origin: { x: randomInRange(0.1, 0.3), y: Math.random() - 0.2 } })
      confetti({ ...defaults, particleCount, origin: { x: randomInRange(0.7, 0.9), y: Math.random() - 0.2 } })
    }, 250)

    return () => clearInterval(interval)
  }, [isReady])

  const handleGoToDashboard = () => {
    router.push("/dashboard")
  }

  // Loading state while polling
  if (!isReady) {
    return (
      <div className="min-h-[80vh] flex items-center justify-center p-4">
        <div className="max-w-md w-full space-y-8 text-center">
          <div className="flex justify-center">
            <div className="relative">
              <div className="size-24 rounded-full bg-[#ddfc7b]/10 flex items-center justify-center border border-[#ddfc7b]/20">
                <Loader2 className="size-12 text-[#ddfc7b] animate-spin" />
              </div>
            </div>
          </div>
          <div className="space-y-3">
            <h1 className="text-2xl font-black text-white uppercase tracking-tighter">Setting Up Your Account</h1>
            <p className="text-zinc-400 text-sm font-medium px-4">
              We're activating your subscription. This usually takes just a few seconds...
            </p>
          </div>
          <div className="flex justify-center gap-1">
            {[0, 1, 2].map((i) => (
              <div 
                key={i} 
                className="size-2 rounded-full bg-[#ddfc7b] animate-pulse"
                style={{ animationDelay: `${i * 200}ms` }}
              />
            ))}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-[80vh] flex items-center justify-center p-4">
      <div className="max-w-md w-full space-y-8 text-center animate-in fade-in zoom-in-95 duration-500">
        {/* Success Icon */}
        <div className="flex justify-center">
          <div className="relative">
            <div className="size-24 rounded-full bg-emerald-500/10 flex items-center justify-center border border-emerald-500/20 shadow-[0_0_50px_-12px_rgba(16,185,129,0.5)]">
              <Check className="size-12 text-emerald-500" />
            </div>
            <div className="absolute -top-2 -right-2 size-8 rounded-lg bg-[#ddfc7b] flex items-center justify-center shadow-lg animate-bounce">
              <Zap className="size-4 text-black" />
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="space-y-3">
          <div className="flex items-center justify-center gap-2">
            <PartyPopper className="size-5 text-[#ddfc7b]" />
            <h1 className="text-3xl font-black text-white uppercase tracking-tighter">You're In!</h1>
            <PartyPopper className="size-5 text-[#ddfc7b]" />
          </div>
          <p className="text-zinc-400 text-sm font-medium px-4">
            Welcome to the future of TikTok content creation. Your Pro subscription is now active.
          </p>
        </div>

        {/* Features list */}
        <Card className="bg-[#2a2a2a] border-zinc-800 shadow-2xl overflow-hidden py-4">
          <CardContent className="space-y-4 pt-4">
            <div className="grid gap-3">
              <div className="flex items-center gap-3 text-left">
                <div className="size-8 rounded-lg bg-zinc-800 flex items-center justify-center border border-zinc-700">
                  <Sparkles className="size-4 text-[#ddfc7b]" />
                </div>
                <div>
                  <p className="text-xs font-bold text-white uppercase tracking-wider">Unlimited Generation</p>
                  <p className="text-[10px] text-zinc-500">Create as much content as you want.</p>
                </div>
              </div>
              <div className="flex items-center gap-3 text-left">
                <div className="size-8 rounded-lg bg-zinc-800 flex items-center justify-center border border-zinc-700">
                  <ShieldCheck className="size-4 text-[#ddfc7b]" />
                </div>
                <div>
                  <p className="text-xs font-bold text-white uppercase tracking-wider">Priority Support</p>
                  <p className="text-[10px] text-zinc-500">Your requests go to the top of the line.</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Action */}
        <div className="space-y-4">
          <Button 
            onClick={handleGoToDashboard}
            className="w-full h-14 bg-white text-black hover:bg-zinc-200 rounded-2xl font-black uppercase tracking-widest text-xs flex items-center justify-center gap-3 transition-all active:scale-95"
          >
            Go to Dashboard
            <ArrowRight className="size-4" />
          </Button>
        </div>
      </div>
    </div>
  )
}
