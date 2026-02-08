"use client"

import { useState, useEffect, useMemo } from "react"
import { createClient } from "@/lib/supabase/client"
import { CreditCard, Check, Zap, Building, Crown, Loader2, ArrowRight, Download, ExternalLink, Receipt, Settings, AlertCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import { toast } from "sonner"

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

export default function BillingPage() {
  const [currentOrg, setCurrentOrg] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [portalLoading, setPortalLoading] = useState(false)
  const [invoices, setInvoices] = useState<any[]>([])
  const [invoicesLoading, setInvoicesLoading] = useState(false)
  
  const supabase = useMemo(() => createClient(), [])

  useEffect(() => {
    async function loadBillingData() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data: orgMembers } = await supabase
        .from('organization_members')
        .select('organizations(*)')
        .eq('profile_id', user.id)
        .limit(1)
        .single()
      
      if (orgMembers) {
        const org = (orgMembers as any).organizations
        setCurrentOrg(org)
        
        // Load invoices if customer ID exists
        if (org.stripe_customer_id) {
          loadInvoices(org.id)
        }
      }
      setLoading(false)
    }

    async function loadInvoices(orgId: string) {
      setInvoicesLoading(true)
      try {
        const response = await fetch(`/api/stripe/get-invoices?organizationId=${orgId}`)
        if (response.ok) {
          const data = await response.json()
          setInvoices(data.invoices || [])
        }
      } catch (e) {
        console.error("Error loading invoices:", e)
      } finally {
        setInvoicesLoading(false)
      }
    }

    loadBillingData()
  }, [supabase])

  const handleOpenPortal = async () => {
    if (!currentOrg?.stripe_customer_id) {
      toast.error("No billing account found. Please subscribe first.")
      return
    }

    setPortalLoading(true)
    try {
      const response = await fetch('/api/stripe/create-portal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ organizationId: currentOrg.id }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to open customer portal')
      }

      window.location.href = data.url
    } catch (error: any) {
      console.error('Portal error:', error)
      toast.error(error.message || 'Failed to open customer portal')
      setPortalLoading(false)
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return <Badge className="bg-emerald-500/10 text-emerald-500 border-none text-[9px] font-black uppercase">Active</Badge>
      case 'trialing':
        return <Badge className="bg-blue-500/10 text-blue-500 border-none text-[9px] font-black uppercase">Trial</Badge>
      case 'past_due':
        return <Badge className="bg-amber-500/10 text-amber-500 border-none text-[9px] font-black uppercase">Past Due</Badge>
      case 'canceled':
        return <Badge className="bg-red-500/10 text-red-500 border-none text-[9px] font-black uppercase">Canceled</Badge>
      default:
        return <Badge className="bg-zinc-500/10 text-zinc-500 border-none text-[9px] font-black uppercase">Free</Badge>
    }
  }

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'N/A'
    return new Date(dateString).toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric', 
      year: 'numeric' 
    })
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="size-6 animate-spin text-zinc-400" />
      </div>
    )
  }

  const isActive = currentOrg?.subscription_status === 'active' || currentOrg?.subscription_status === 'trialing'

  return (
    <div className="space-y-10 max-w-5xl mx-auto">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-3xl font-black text-white tracking-tight">Billing & Plans</h1>
          <p className="text-zinc-400 text-sm mt-1">Manage your subscription and billing preferences.</p>
        </div>
        <div className="bg-zinc-900/50 border border-zinc-800 rounded-2xl px-6 py-3 flex items-center gap-4">
          <div className="space-y-0.5">
            <p className="text-[10px] font-black text-zinc-500 uppercase tracking-widest leading-none">Current Plan</p>
            <p className="text-lg font-black text-[#ddfc7b] leading-none uppercase mt-1">{currentOrg?.subscription_status === 'active' || currentOrg?.subscription_status === 'trialing' ? 'Pro' : 'Free'}</p>
          </div>
          <div className="w-px h-8 bg-zinc-800" />
          <div className="space-y-0.5">
            <p className="text-[10px] font-black text-zinc-500 uppercase tracking-widest leading-none">
              {currentOrg?.subscription_status === 'trialing' ? 'Trial Ends' : 'Next Renewal'}
            </p>
            <p className="text-sm font-bold text-white leading-none mt-1">
              {currentOrg?.subscription_status === 'trialing' 
                ? formatDate(currentOrg?.trial_ends_at)
                : formatDate(currentOrg?.subscription_current_period_end)}
            </p>
          </div>
        </div>
      </div>

      {/* Past due warning */}
      {currentOrg?.subscription_status === 'past_due' && (
        <Card className="bg-amber-500/10 border-amber-500/30">
          <CardContent className="flex items-center gap-4 py-4">
            <AlertCircle className="size-5 text-amber-500 shrink-0" />
            <div className="flex-1">
              <p className="text-sm font-bold text-amber-500">Payment Failed</p>
              <p className="text-xs text-amber-500/70">Please update your payment method to continue using the service.</p>
            </div>
            <Button 
              onClick={handleOpenPortal}
              disabled={portalLoading}
              className="bg-amber-500 text-black hover:bg-amber-400 rounded-xl font-bold text-xs h-9"
            >
              Update Payment
            </Button>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Plan Card */}
        <div className="lg:col-span-1">
          <Card className={cn(
            "bg-[#2a2a2a] border-zinc-800 shadow-xl overflow-hidden flex flex-col h-full",
            isActive && "border-[#ddfc7b]/50 ring-1 ring-[#ddfc7b]/20"
          )}>
            <div className="bg-[#ddfc7b] text-black text-center py-1 text-[10px] font-black uppercase tracking-widest">
              Most Popular
            </div>
            <CardHeader className="space-y-1 pt-6">
              <div className="flex items-center justify-between">
                <CardTitle className="text-xl font-black text-white uppercase">Pro</CardTitle>
                <Zap className="size-5 text-[#ddfc7b]" />
              </div>
              <div className="flex items-baseline gap-1">
                <span className="text-3xl font-black text-white">200€</span>
                <span className="text-zinc-500 text-sm">/month</span>
              </div>
              <CardDescription className="text-zinc-400 text-xs mt-2">
                Best for content creators and small businesses looking to scale.
              </CardDescription>
            </CardHeader>
            <CardContent className="flex-1 space-y-4 pt-4">
              <div className="space-y-2">
                {features.map((feature) => (
                  <div key={feature} className="flex items-center gap-2 text-xs text-zinc-300">
                    <Check className="size-3.5 text-[#ddfc7b] shrink-0" />
                    <span>{feature}</span>
                  </div>
                ))}
              </div>
            </CardContent>
            <CardFooter className="pb-6">
              <Button 
                onClick={isActive ? handleOpenPortal : () => window.location.href = '/subscribe'}
                disabled={portalLoading}
                className={cn(
                  "w-full rounded-xl font-black uppercase tracking-wider text-xs h-11",
                  isActive 
                    ? "bg-zinc-800 text-zinc-400 hover:bg-zinc-700" 
                    : "bg-[#ddfc7b] text-black hover:bg-[#c9e86a]" 
                )}
              >
                {isActive ? "Manage Subscription" : "Upgrade to Pro"}
                {!isActive && <ArrowRight className="size-3.5 ml-2" />}
              </Button>
            </CardFooter>
          </Card>
        </div>

        {/* Subscription Management & History */}
        <div className="lg:col-span-2 space-y-6">
          <Card className="bg-[#2a2a2a] border-zinc-800 shadow-xl overflow-hidden">
            <CardHeader className="border-b border-zinc-800 bg-zinc-800/20">
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <CardTitle className="text-white flex items-center gap-2 text-lg font-black uppercase">
                    <Settings className="size-5 text-[#ddfc7b]" />
                    Manage Subscription
                  </CardTitle>
                  <CardDescription className="text-zinc-400 text-xs">
                    Update your plan, payment method, or cancel your subscription.
                  </CardDescription>
                </div>
                {currentOrg?.stripe_customer_id && (
                  <Button 
                    variant="outline" 
                    onClick={handleOpenPortal}
                    disabled={portalLoading}
                    className="border-zinc-700 text-zinc-300 hover:bg-zinc-800 rounded-xl font-bold text-xs h-9"
                  >
                    {portalLoading ? (
                      <Loader2 className="size-4 animate-spin" />
                    ) : (
                      <>
                        Customer Portal
                        <ExternalLink className="size-3 ml-2" />
                      </>
                    )}
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent className="pt-6 space-y-6">
              <div className="flex flex-col sm:flex-row items-center justify-between p-4 bg-zinc-900/50 rounded-2xl border border-zinc-800 gap-4">
                <div className="flex items-center gap-4">
                  <div className="size-10 rounded-xl bg-zinc-800 flex items-center justify-center border border-zinc-700">
                    <CreditCard className="size-5 text-zinc-400" />
                  </div>
                  <div className="space-y-0.5">
                    <p className="text-sm font-bold text-white uppercase tracking-tighter">Billing Account</p>
                    <p className="text-xs text-zinc-500 font-mono">{currentOrg?.stripe_customer_id || 'No account linked'}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Button 
                    variant="ghost" 
                    onClick={handleOpenPortal}
                    className="text-zinc-400 hover:text-white hover:bg-zinc-800 rounded-xl font-bold text-xs h-8"
                  >
                    Edit
                  </Button>
                </div>
              </div>

              <div className="flex items-center justify-between pt-2">
                <div className="space-y-0.5">
                  <p className="text-xs font-bold text-white uppercase tracking-wider">Cancel Subscription</p>
                  <p className="text-[10px] text-zinc-500">
                    {isActive 
                      ? `Once cancelled, you'll still have access until ${formatDate(currentOrg?.subscription_current_period_end || currentOrg?.trial_ends_at)}.`
                      : "No active subscription to cancel."}
                  </p>
                </div>
                {isActive && (
                  <Button 
                    variant="ghost" 
                    onClick={handleOpenPortal}
                    className="text-red-400/70 hover:text-red-400 hover:bg-red-400/10 rounded-xl font-bold text-xs h-8"
                  >
                    Cancel Plan
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Billing History */}
          <Card className="bg-[#2a2a2a] border-zinc-800 shadow-xl overflow-hidden">
            <CardHeader className="border-b border-zinc-800 bg-zinc-800/20">
              <CardTitle className="text-white flex items-center gap-2 text-lg font-black uppercase">
                <Receipt className="size-5 text-[#ddfc7b]" />
                Billing History
              </CardTitle>
              <CardDescription className="text-zinc-400 text-xs">Download and view your past invoices.</CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              {invoicesLoading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="size-6 animate-spin text-zinc-500" />
                </div>
              ) : invoices.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full text-left">
                    <thead>
                      <tr className="border-b border-zinc-800/50 bg-zinc-900/20">
                        <th className="px-6 py-4 text-[10px] font-black text-zinc-500 uppercase tracking-widest">Invoice ID</th>
                        <th className="px-6 py-4 text-[10px] font-black text-zinc-500 uppercase tracking-widest">Date</th>
                        <th className="px-6 py-4 text-[10px] font-black text-zinc-500 uppercase tracking-widest">Amount</th>
                        <th className="px-6 py-4 text-[10px] font-black text-zinc-500 uppercase tracking-widest text-right">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-800/50">
                      {invoices.map((invoice) => (
                        <tr key={invoice.id} className="hover:bg-zinc-800/20 transition-colors">
                          <td className="px-6 py-4">
                            <span className="text-xs font-bold text-white">{invoice.number || invoice.id}</span>
                          </td>
                          <td className="px-6 py-4">
                            <span className="text-xs text-zinc-400">{formatDate(invoice.date)}</span>
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-bold text-white">{invoice.amount}</span>
                              <Badge className={cn(
                                "border-none text-[9px] font-black uppercase px-1.5 py-0 h-4",
                                invoice.status === 'paid' ? "bg-emerald-500/10 text-emerald-500" : "bg-zinc-500/10 text-zinc-500"
                              )}>
                                {invoice.status}
                              </Badge>
                            </div>
                          </td>
                          <td className="px-6 py-4 text-right">
                            {invoice.url && (
                              <Button 
                                variant="ghost" 
                                size="icon" 
                                className="size-8 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800"
                                onClick={() => window.open(invoice.url, '_blank')}
                              >
                                <Download className="size-4" />
                              </Button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="py-12 text-center">
                  <p className="text-zinc-500 text-xs font-bold uppercase tracking-widest">No invoices found</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
