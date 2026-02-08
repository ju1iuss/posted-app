"use client"

import { useState, useEffect, useMemo } from "react"
import { useSearchParams } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { Check, Zap, Loader2, ArrowRight, Shield, Users, Sparkles, Lock, Key, AlertCircle, ArrowLeft } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { toast } from "sonner"
import Image from "next/image"
import { cn } from "@/lib/utils"
import Link from "next/link"

const features = [
  "Unlimited Accounts",
  "Premium Templates", 
  "Unlimited AI Generation",
  "Priority Support",
  "Custom Branding",
  "API Access",
  "Advanced Analytics",
  "2 Team Seats Included"
]

export default function SubscribePage() {
  const [currentOrg, setCurrentOrg] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [checkoutLoading, setCheckoutLoading] = useState(false)
  const [inviteCode, setInviteCode] = useState("")
  const [isUnlocked, setIsUnlocked] = useState(false)
  
  const searchParams = useSearchParams()
  const canceled = searchParams.get('canceled')
  
  const supabase = useMemo(() => createClient(), [])

  useEffect(() => {
    if (canceled) {
      setIsUnlocked(true)
      toast.error("Checkout was canceled.")
    }
  }, [canceled])

  useEffect(() => {
    async function loadOrgData() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data: orgMembers } = await supabase
        .from('organization_members')
        .select('organizations(*)')
        .eq('profile_id', user.id)
        .limit(1)
        .single()
      
      if (orgMembers) {
        setCurrentOrg((orgMembers as any).organizations)
      }
      setLoading(false)
    }

    loadOrgData()
  }, [supabase])

  const handleUnlock = (e: React.FormEvent) => {
    e.preventDefault()
    if (inviteCode.trim().toUpperCase() === "POSTEDBETA26") {
      setIsUnlocked(true)
      toast.success("Access granted. Welcome to the beta.")
    } else {
      toast.error("Invalid access code.")
    }
  }

  const handleStartTrial = async () => {
    if (!currentOrg) return
    
    setCheckoutLoading(true)
    try {
      const response = await fetch('/api/stripe/create-checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ organizationId: currentOrg.id }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to create checkout session')
      }

      // Redirect to Stripe Checkout
      window.location.href = data.url
    } catch (error: any) {
      console.error('Checkout error:', error)
      toast.error(error.message || 'Failed to start checkout')
      setCheckoutLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[600px]">
        <Loader2 className="size-6 animate-spin text-zinc-400" />
      </div>
    )
  }

  if (!isUnlocked) {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center p-4">
        <Link 
          href="https://posted.dev"
          className="mb-8 flex items-center gap-2 text-zinc-500 hover:text-white transition-colors text-[10px] font-black uppercase tracking-widest"
        >
          <ArrowLeft className="size-3" />
          Back to Homepage
        </Link>
        <div className="max-w-sm w-full space-y-8 text-center">
          <div className="flex justify-center">
            <div className="size-16 rounded-2xl bg-zinc-800 flex items-center justify-center border border-zinc-700 shadow-2xl">
              <Lock className="size-6 text-[#ddfc7b]" />
            </div>
          </div>
          <div className="space-y-2">
            <h1 className="text-2xl font-black text-white uppercase tracking-tighter">Private Beta Access</h1>
            <p className="text-zinc-500 text-xs font-medium">Enter your exclusive access code to view plans.</p>
          </div>
          <form onSubmit={handleUnlock} className="space-y-4">
            <div className="relative group">
              <Key className="absolute left-4 top-1/2 -translate-y-1/2 size-4 text-zinc-600 group-focus-within:text-[#ddfc7b] transition-colors" />
              <Input 
                value={inviteCode}
                onChange={(e) => setInviteCode(e.target.value)}
                placeholder="ENTER ACCESS CODE"
                className="h-14 bg-zinc-900/50 border-zinc-800 rounded-2xl pl-12 text-center font-black tracking-[0.2em] text-[#ddfc7b] placeholder:text-zinc-700 focus:ring-1 focus:ring-[#ddfc7b]/30 uppercase"
                autoFocus
              />
            </div>
            <Button 
              type="submit"
              className="w-full h-12 bg-white text-black hover:bg-zinc-200 rounded-2xl font-black uppercase tracking-widest text-[10px]"
            >
              Verify Access
            </Button>
          </form>
          <p className="text-[10px] text-zinc-600 font-bold uppercase tracking-widest">
            Member of the beta? Check your email for your code.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-[80vh] flex flex-col items-center justify-center p-4 animate-in fade-in zoom-in-95 duration-500">
      <Link 
        href="https://posted.dev"
        className="mb-8 flex items-center gap-2 text-zinc-500 hover:text-white transition-colors text-[10px] font-black uppercase tracking-widest"
      >
        <ArrowLeft className="size-3" />
        Back to Homepage
      </Link>
      <div className="max-w-lg w-full space-y-8">
        {/* Header */}
        <div className="text-center space-y-4">
          <div className="flex justify-center">
            <div className="size-12 rounded-xl overflow-hidden border border-zinc-700/50 shadow-lg">
              <Image 
                src="/logo.svg" 
                alt="Posted" 
                width={48} 
                height={48}
                className="w-full h-full object-cover"
              />
            </div>
          </div>
          <div className="space-y-2">
            <h1 className="text-3xl font-black text-white tracking-tight">Welcome to Posted</h1>
            <p className="text-zinc-400 text-sm max-w-sm mx-auto">
              Manage Viral TikTok Accounts and create unlimited Content Pieces.
            </p>
          </div>
        </div>

        {/* Canceled Notification */}
        {canceled && (
          <div className="bg-amber-500/10 border border-amber-500/20 rounded-2xl p-4 flex items-center gap-4 animate-in fade-in slide-in-from-top-4 duration-500">
            <div className="size-10 rounded-xl bg-amber-500/20 flex items-center justify-center shrink-0">
              <AlertCircle className="size-5 text-amber-500" />
            </div>
            <div className="space-y-0.5 text-left">
              <p className="text-sm font-bold text-amber-500 uppercase tracking-tighter">Checkout Canceled</p>
              <p className="text-[11px] text-amber-500/70 font-medium leading-tight">No worries! Your access code is still active. You can start your trial whenever you're ready.</p>
            </div>
          </div>
        )}

        {/* Plan Card */}
        <Card className="bg-[#2a2a2a] border-[#ddfc7b]/50 ring-1 ring-[#ddfc7b]/20 shadow-xl overflow-hidden">
          <div className="bg-[#ddfc7b] text-black text-center py-1.5 text-[10px] font-black uppercase tracking-widest">
            3-Day Trial for 1€
          </div>
          <CardHeader className="space-y-1 pt-6">
            <div className="flex items-center justify-between">
              <CardTitle className="text-xl font-black text-white uppercase">Pro Plan</CardTitle>
              <Zap className="size-5 text-[#ddfc7b]" />
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-4xl font-black text-white">200€</span>
              <span className="text-zinc-500 text-sm">/month after trial</span>
            </div>
            <CardDescription className="text-zinc-400 text-xs mt-2">
              Everything you need to create viral content at scale.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 pt-4">
            <div className="grid grid-cols-2 gap-2">
              {features.map((feature) => (
                <div key={feature} className="flex items-center gap-2 text-xs text-zinc-300">
                  <Check className="size-3.5 text-[#ddfc7b] shrink-0" />
                  <span>{feature}</span>
                </div>
              ))}
            </div>
          </CardContent>
          <CardFooter className="pb-6 flex-col gap-4">
            <Button 
              onClick={handleStartTrial}
              disabled={checkoutLoading}
              className="w-full rounded-xl font-black uppercase tracking-wider text-xs h-12 bg-[#ddfc7b] text-black hover:bg-[#c9e86a]"
            >
              {checkoutLoading ? (
                <>
                  <Loader2 className="size-4 mr-2 animate-spin" />
                  Redirecting to checkout...
                </>
              ) : (
                <>
                  Start 3-Day Trial for 1€
                  <ArrowRight className="size-4 ml-2" />
                </>
              )}
            </Button>
            <p className="text-[10px] text-zinc-500 text-center">
              Cancel anytime during trial. No questions asked.
            </p>
          </CardFooter>
        </Card>

        {/* Trust badges */}
        <div className="flex items-center justify-center gap-6 text-zinc-500">
          <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-wider font-bold">
            <Shield className="size-3.5" />
            <span>Secure Payment</span>
          </div>
          <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-wider font-bold">
            <Users className="size-3.5" />
            <span>2 Seats Included</span>
          </div>
          <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-wider font-bold">
            <Sparkles className="size-3.5" />
            <span>Instant Access</span>
          </div>
        </div>
      </div>
    </div>
  )
}
