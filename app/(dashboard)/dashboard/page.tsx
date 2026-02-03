"use client"

import { useState, useEffect, useMemo } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { LayoutDashboard, Users, FileText, BarChart3, Sparkles, Plus, Settings } from "lucide-react"
import { Skeleton } from "@/components/ui/skeleton"
import { createClient } from "@/lib/supabase/client"
import Link from "next/link"
import { formatDistanceToNow } from "date-fns"

export default function DashboardPage() {
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState({
    totalAccounts: { value: 0, change: "" },
    activeTemplates: { value: 0, change: "" },
    totalExports: { value: 0, change: "" }
  })
  const [recentActivity, setRecentActivity] = useState<any[]>([])
  const supabase = useMemo(() => createClient(), [])

  useEffect(() => {
    async function loadDashboardData() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data: orgMembers } = await supabase
        .from('organization_members')
        .select('organization_id')
        .eq('profile_id', user.id)
        .limit(1)
        .single()

      const orgId = orgMembers?.organization_id
      if (!orgId) {
        setLoading(false)
        return
      }

      // 1. Fetch Accounts Stats
      const { count: totalAccounts } = await supabase
        .from('accounts')
        .select('*', { count: 'exact', head: true })
        .eq('organization_id', orgId)

      const lastMonth = new Date()
      lastMonth.setMonth(lastMonth.getMonth() - 1)
      const { count: accountsLastMonth } = await supabase
        .from('accounts')
        .select('*', { count: 'exact', head: true })
        .eq('organization_id', orgId)
        .lt('created_at', lastMonth.toISOString())

      const accountsDiff = (totalAccounts || 0) - (accountsLastMonth || 0)

      // 2. Fetch Template Stats
      const { count: totalTemplates } = await supabase
        .from('templates')
        .select('*', { count: 'exact', head: true })
        .eq('organization_id', orgId)

      const lastWeek = new Date()
      lastWeek.setDate(lastWeek.getDate() - 7)
      const { count: newTemplatesThisWeek } = await supabase
        .from('templates')
        .select('*', { count: 'exact', head: true })
        .eq('organization_id', orgId)
        .gte('created_at', lastWeek.toISOString())

      // 3. Fetch Export Stats (Posts with status exported/posted)
      const { data: orgAccounts } = await supabase
        .from('accounts')
        .select('id')
        .eq('organization_id', orgId)
      
      const accountIds = orgAccounts?.map(a => a.id) || []
      
      let totalExports = 0
      if (accountIds.length > 0) {
        const { count } = await supabase
          .from('posts')
          .select('*', { count: 'exact', head: true })
          .in('account_id', accountIds)
          .in('status', ['exported', 'posted'])
        totalExports = count || 0
      }

      setStats({
        totalAccounts: { 
          value: totalAccounts || 0, 
          change: accountsDiff >= 0 ? `+${accountsDiff} from last month` : `${accountsDiff} from last month`
        },
        activeTemplates: { 
          value: totalTemplates || 0, 
          change: `${newTemplatesThisWeek || 0} new this week` 
        },
        totalExports: { 
          value: totalExports, 
          change: "+0% increase" // For now simplified, could calculate properly if needed
        }
      })

      // 4. Fetch Recent Activity
      const activities: any[] = []

      // Latest templates
      const { data: latestTemplates } = await supabase
        .from('templates')
        .select('id, name, created_at')
        .eq('organization_id', orgId)
        .order('created_at', { ascending: false })
        .limit(5)

      latestTemplates?.forEach(t => {
        activities.push({
          id: `template-${t.id}`,
          title: `New template created: ${t.name}`,
          time: new Date(t.created_at),
          type: 'template'
        })
      })

      // Latest posts
      if (accountIds.length > 0) {
        const { data: latestPosts } = await supabase
          .from('posts')
          .select('id, created_at, accounts(name)')
          .in('account_id', accountIds)
          .order('created_at', { ascending: false })
          .limit(5)

        latestPosts?.forEach((p: any) => {
          activities.push({
            id: `post-${p.id}`,
            title: `New post generated for ${p.accounts?.name || 'account'}`,
            time: new Date(p.created_at),
            type: 'post'
          })
        })
      }

      setRecentActivity(
        activities
          .sort((a, b) => b.time.getTime() - a.time.getTime())
          .slice(0, 5)
      )

      setLoading(false)
    }

    loadDashboardData()
  }, [supabase])

  const statConfig = [
    { title: "Total Accounts", value: stats.totalAccounts.value, icon: Users, description: stats.totalAccounts.change },
    { title: "Active Templates", value: stats.activeTemplates.value, icon: FileText, description: stats.activeTemplates.change },
    { title: "Total Exports", value: stats.totalExports.value, icon: BarChart3, description: stats.totalExports.change },
  ]

  if (loading) {
    return (
      <div className="min-h-screen pb-10">
        <div className="max-w-[1000px] mx-auto px-6 pt-10">
          <div className="flex flex-col gap-8">
            <div className="space-y-2">
              <Skeleton className="h-10 w-48 bg-zinc-800" />
              <Skeleton className="h-4 w-64 bg-zinc-800" />
            </div>

            <div className="grid gap-4 md:grid-cols-3">
              {[...Array(3)].map((_, i) => (
                <Card key={i} className="bg-zinc-900/50 border-zinc-800 backdrop-blur-sm">
                  <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                    <Skeleton className="h-3 w-24 bg-zinc-800" />
                    <Skeleton className="size-4 bg-zinc-800" />
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <Skeleton className="h-8 w-12 bg-zinc-800" />
                    <Skeleton className="h-3 w-32 bg-zinc-800" />
                  </CardContent>
                </Card>
              ))}
            </div>

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
              <Card className="col-span-4 bg-zinc-900/50 border-zinc-800 backdrop-blur-sm">
                <CardHeader>
                  <Skeleton className="h-4 w-32 bg-zinc-800" />
                </CardHeader>
                <CardContent className="space-y-4">
                  {[...Array(3)].map((_, i) => (
                    <div key={i} className="flex items-center gap-4 p-3 rounded-lg bg-zinc-800/50 border border-zinc-700/50">
                      <Skeleton className="size-8 rounded-full bg-zinc-800" />
                      <div className="flex-1 space-y-2">
                        <Skeleton className="h-3 w-32 bg-zinc-800" />
                        <Skeleton className="h-2 w-20 bg-zinc-800" />
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>
              <Card className="col-span-3 bg-zinc-900/50 border-zinc-800 backdrop-blur-sm">
                <CardHeader>
                  <Skeleton className="h-4 w-32 bg-zinc-800" />
                </CardHeader>
                <CardContent className="space-y-2">
                  <Skeleton className="h-10 w-full rounded-lg bg-zinc-800" />
                  <Skeleton className="h-10 w-full rounded-lg bg-zinc-800" />
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen pb-10">
      <div className="max-w-[1000px] mx-auto px-6 pt-10">
        <div className="flex flex-col gap-8">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <h1 className="text-3xl font-bold tracking-tight text-[#dbdbdb]">Dashboard</h1>
              <p className="text-[#dbdbdb]/60 text-sm">Welcome back to your command center.</p>
            </div>
          </div>

      <div className="grid gap-4 md:grid-cols-3">
        {statConfig.map((stat) => (
          <Card key={stat.title} className="bg-zinc-900/50 border-zinc-800 backdrop-blur-sm">
            <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
              <CardTitle className="text-xs font-black uppercase tracking-widest text-[#dbdbdb]/60">
                {stat.title}
              </CardTitle>
              <stat.icon className="size-4 text-[#ddfc7b]" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-black text-[#dbdbdb]">{stat.value}</div>
              <p className="text-[10px] font-bold text-[#dbdbdb]/40 uppercase mt-1">
                {stat.description}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
        <Card className="col-span-4 bg-zinc-900/50 border-zinc-800 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="text-sm font-black uppercase tracking-widest text-[#dbdbdb]">Recent Activity</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {recentActivity.length > 0 ? recentActivity.map((activity) => (
                <div key={activity.id} className="flex items-center gap-4 p-3 rounded-lg bg-zinc-800/50 border border-zinc-700/50">
                  <div className="size-8 rounded-full bg-[#ddfc7b]/10 flex items-center justify-center">
                    <Sparkles className="size-4 text-[#ddfc7b]" />
                  </div>
                  <div className="flex-1">
                    <p className="text-xs font-bold text-[#dbdbdb]">{activity.title}</p>
                    <p className="text-[10px] text-[#dbdbdb]/40 font-medium">{formatDistanceToNow(activity.time, { addSuffix: true })}</p>
                  </div>
                </div>
              )) : (
                <div className="text-center py-8">
                  <p className="text-xs text-[#dbdbdb]/40 font-bold uppercase tracking-widest">No recent activity</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
        <Card className="col-span-3 bg-zinc-900/50 border-zinc-800 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="text-sm font-black uppercase tracking-widest text-[#dbdbdb]">Quick Actions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <Link href="/templates?new=true" className="block">
              <button className="w-full p-3 rounded-lg bg-[#ddfc7b] text-[#171717] font-black text-xs uppercase tracking-widest hover:scale-[1.02] transition-transform active:scale-[0.98] flex items-center justify-center gap-2">
                <Plus className="size-3.5" />
                Create New Template
              </button>
            </Link>
            <Link href="/dashboard" className="block">
              <button className="w-full p-3 rounded-lg bg-zinc-800 text-[#dbdbdb] font-black text-xs uppercase tracking-widest hover:bg-zinc-700 transition-colors border border-zinc-700 flex items-center justify-center gap-2">
                <Settings className="size-3.5" />
                Manage Accounts
              </button>
            </Link>
          </CardContent>
        </Card>
      </div>
        </div>
      </div>
    </div>
  )
}

