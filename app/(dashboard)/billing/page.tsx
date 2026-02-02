"use client"

import { useState, useEffect, useMemo } from "react"
import { createClient } from "@/lib/supabase/client"
import { CreditCard, Check, Zap, Building, Crown, Loader2, ArrowRight, Download, ExternalLink, Receipt, Settings } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"

const plans = [
  {
    name: "Pro",
    price: "200€",
    description: "Best for content creators and small businesses looking to scale.",
    features: [
      "Unlimited Accounts",
      "Premium Templates",
      "Unlimited AI Generation",
      "Priority Support",
      "Custom Branding",
      "API Access",
      "Advanced Analytics"
    ],
    buttonText: "Upgrade to Pro",
    current: false,
    popular: true,
  },
]

const invoices = [
  { id: "INV-8492", date: "Jan 12, 2026", amount: "200.00€", status: "Paid" },
  { id: "INV-7231", date: "Dec 12, 2025", amount: "200.00€", status: "Paid" },
  { id: "INV-6120", date: "Nov 12, 2025", amount: "200.00€", status: "Paid" },
]

export default function BillingPage() {
  const [currentOrg, setCurrentOrg] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  
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
        setCurrentOrg((orgMembers as any).organizations)
      }
      setLoading(false)
    }

    loadBillingData()
  }, [supabase])

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="size-6 animate-spin text-zinc-400" />
      </div>
    )
  }

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
            <p className="text-lg font-black text-[#ddfc7b] leading-none uppercase">{currentOrg?.plan || "Free"}</p>
          </div>
          <div className="w-px h-8 bg-zinc-800" />
          <div className="space-y-0.5">
            <p className="text-[10px] font-black text-zinc-500 uppercase tracking-widest leading-none">Next Renewal</p>
            <p className="text-sm font-bold text-white leading-none">March 12, 2026</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Plan Card */}
        <div className="lg:col-span-1">
          {plans.map((plan) => (
            <Card 
              key={plan.name} 
              className={cn(
                "bg-[#2a2a2a] border-zinc-800 shadow-xl overflow-hidden flex flex-col h-full",
                plan.popular && "border-[#ddfc7b]/50 ring-1 ring-[#ddfc7b]/20"
              )}
            >
              {plan.popular && (
                <div className="bg-[#ddfc7b] text-black text-center py-1 text-[10px] font-black uppercase tracking-widest">
                  Most Popular
                </div>
              )}
              <CardHeader className="space-y-1 pt-6">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-xl font-black text-white uppercase">{plan.name}</CardTitle>
                  <Zap className="size-5 text-[#ddfc7b]" />
                </div>
                <div className="flex items-baseline gap-1">
                  <span className="text-3xl font-black text-white">{plan.price}</span>
                  <span className="text-zinc-500 text-sm">/month</span>
                </div>
                <CardDescription className="text-zinc-400 text-xs mt-2">{plan.description}</CardDescription>
              </CardHeader>
              <CardContent className="flex-1 space-y-4 pt-4">
                <div className="space-y-2">
                  {plan.features.map((feature) => (
                    <div key={feature} className="flex items-center gap-2 text-xs text-zinc-300">
                      <Check className="size-3.5 text-[#ddfc7b] shrink-0" />
                      <span>{feature}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
              <CardFooter className="pb-6">
                <Button 
                  className={cn(
                    "w-full rounded-xl font-black uppercase tracking-wider text-xs h-11",
                    plan.current 
                      ? "bg-zinc-800 text-zinc-400 cursor-default hover:bg-zinc-800" 
                      : "bg-[#ddfc7b] text-black hover:bg-[#c9e86a]" 
                  )}
                  disabled={plan.current}
                >
                  {plan.buttonText}
                  {!plan.current && <ArrowRight className="size-3.5 ml-2" />}
                </Button>
              </CardFooter>
            </Card>
          ))}
        </div>

        {/* Subscription Management & History */}
        <div className="lg:col-span-2 space-y-6">
          {/* Manage Subscription */}
          <Card className="bg-[#2a2a2a] border-zinc-800 shadow-xl overflow-hidden">
            <CardHeader className="border-b border-zinc-800 bg-zinc-800/20">
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <CardTitle className="text-white flex items-center gap-2">
                    <Settings className="size-5 text-[#ddfc7b]" />
                    Manage Subscription
                  </CardTitle>
                  <CardDescription className="text-zinc-400 text-xs">Update your plan, payment method, or cancel your subscription.</CardDescription>
                </div>
                <Button variant="outline" className="border-zinc-700 text-zinc-300 hover:bg-zinc-800 rounded-xl font-bold text-xs h-9">
                  Customer Portal
                  <ExternalLink className="size-3 ml-2" />
                </Button>
              </div>
            </CardHeader>
            <CardContent className="pt-6 space-y-6">
              <div className="flex flex-col sm:flex-row items-center justify-between p-4 bg-zinc-900/50 rounded-2xl border border-zinc-800 gap-4">
                <div className="flex items-center gap-4">
                  <div className="size-10 rounded-xl bg-zinc-800 flex items-center justify-center border border-zinc-700">
                    <CreditCard className="size-5 text-zinc-400" />
                  </div>
                  <div className="space-y-0.5">
                    <p className="text-sm font-bold text-white">Visa ending in 4242</p>
                    <p className="text-xs text-zinc-500">Expires 12/2028</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Button variant="ghost" className="text-zinc-400 hover:text-white hover:bg-zinc-800 rounded-xl font-bold text-xs h-8">Edit</Button>
                </div>
              </div>

              <div className="flex items-center justify-between pt-2">
                <div className="space-y-0.5">
                  <p className="text-xs font-bold text-white uppercase tracking-wider">Cancel Subscription</p>
                  <p className="text-[10px] text-zinc-500">Once cancelled, you'll still have access until March 12, 2026.</p>
                </div>
                <Button variant="ghost" className="text-red-400/70 hover:text-red-400 hover:bg-red-400/10 rounded-xl font-bold text-xs h-8">
                  Cancel Plan
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Billing History */}
          <Card className="bg-[#2a2a2a] border-zinc-800 shadow-xl overflow-hidden">
            <CardHeader className="border-b border-zinc-800 bg-zinc-800/20">
              <CardTitle className="text-white flex items-center gap-2">
                <Receipt className="size-5 text-[#ddfc7b]" />
                Billing History
              </CardTitle>
              <CardDescription className="text-zinc-400 text-xs">Download and view your past invoices.</CardDescription>
            </CardHeader>
            <CardContent className="p-0">
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
                          <span className="text-xs font-bold text-white">{invoice.id}</span>
                        </td>
                        <td className="px-6 py-4">
                          <span className="text-xs text-zinc-400">{invoice.date}</span>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-bold text-white">{invoice.amount}</span>
                            <Badge className="bg-emerald-500/10 text-emerald-500 border-none text-[9px] font-black uppercase px-1.5 py-0 h-4">
                              {invoice.status}
                            </Badge>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <Button variant="ghost" size="icon" className="size-8 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800">
                            <Download className="size-4" />
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
