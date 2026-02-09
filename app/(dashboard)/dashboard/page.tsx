"use client"

import Image from "next/image"
import { useState, useEffect, useMemo } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { LayoutDashboard, Users, FileText, BarChart3, Plus, Settings, ArrowRight, Image as ImageIcon, Heart, MessageCircle, Bookmark, Share2 } from "lucide-react"
import { Skeleton } from "@/components/ui/skeleton"
import { createClient } from "@/lib/supabase/client"
import { NewUserCard } from "@/components/new-user-card"
import { PostCarouselCard } from "@/components/post-carousel-card"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { formatDistanceToNow } from "date-fns"
import { cn } from "@/lib/utils"

export default function DashboardPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [organizationId, setOrganizationId] = useState<string | null>(null)
  const [stats, setStats] = useState({
    totalAccounts: { value: 0, change: "" },
    activeTemplates: { value: 0, change: "" },
    totalExports: { value: 0, change: "" }
  })
  const [recentActivity, setRecentActivity] = useState<any[]>([])
  const [latestAccounts, setLatestAccounts] = useState<any[]>([])
  const [latestPosts, setLatestPosts] = useState<any[]>([])
  const supabase = useMemo(() => createClient(), [])

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

    setOrganizationId(orgId)

    const lastMonth = new Date()
    lastMonth.setMonth(lastMonth.getMonth() - 1)
    const lastWeek = new Date()
    lastWeek.setDate(lastWeek.getDate() - 7)

    // Fetch everything in parallel
    const [
      accountsCountRes,
      accountsLastMonthRes,
      templatesCountRes,
      newTemplatesRes,
      orgAccountsRes,
      recentAccountsRes,
      latestTemplatesRes,
    ] = await Promise.all([
      supabase.from('accounts').select('*', { count: 'exact', head: true }).eq('organization_id', orgId),
      supabase.from('accounts').select('*', { count: 'exact', head: true }).eq('organization_id', orgId).lt('created_at', lastMonth.toISOString()),
      supabase.from('templates').select('*', { count: 'exact', head: true }).eq('organization_id', orgId),
      supabase.from('templates').select('*', { count: 'exact', head: true }).eq('organization_id', orgId).gte('created_at', lastWeek.toISOString()),
      supabase.from('accounts').select('id').eq('organization_id', orgId),
      supabase.from('accounts').select('id, name, username, metadata, created_at').eq('organization_id', orgId).order('created_at', { ascending: false }).limit(3),
      supabase.from('templates').select('id, name, created_at').eq('organization_id', orgId).order('created_at', { ascending: false }).limit(5),
    ])

    const totalAccounts = accountsCountRes.count || 0
    const accountsLastMonth = accountsLastMonthRes.count || 0
    const accountsDiff = totalAccounts - accountsLastMonth
    const totalTemplates = templatesCountRes.count || 0
    const newTemplatesThisWeek = newTemplatesRes.count || 0
    const accountIds = orgAccountsRes.data?.map(a => a.id) || []

    setLatestAccounts(recentAccountsRes.data || [])

    // Second batch: things that depend on accountIds
    let totalExports = 0
    let postsForGrid: any[] = []
    let postsForActivity: any[] = []

    if (accountIds.length > 0) {
      const [exportsRes, recentPostsRes, activityPostsRes] = await Promise.all([
        supabase.from('posts').select('*', { count: 'exact', head: true }).in('account_id', accountIds).in('status', ['exported', 'posted']),
        supabase.from('posts').select('id, account_id, created_at, status, content, accounts(id, name, username, metadata)').in('account_id', accountIds).not('content', 'is', null).order('created_at', { ascending: false }).limit(5),
        supabase.from('posts').select('id, created_at, accounts(name)').in('account_id', accountIds).order('created_at', { ascending: false }).limit(5),
      ])

      totalExports = exportsRes.count || 0

      const validPosts = (recentPostsRes.data || []).filter((post: any) =>
        post.content &&
        typeof post.content === 'object' &&
        post.content.template_id &&
        Array.isArray(post.content.slides) &&
        post.content.slides.length > 0
      )
      postsForGrid = validPosts
      postsForActivity = activityPostsRes.data || []
    }

    setStats({
      totalAccounts: {
        value: totalAccounts,
        change: accountsDiff >= 0 ? `+${accountsDiff} from last month` : `${accountsDiff} from last month`
      },
      activeTemplates: {
        value: totalTemplates,
        change: `${newTemplatesThisWeek} new this week`
      },
      totalExports: {
        value: totalExports,
        change: "+0% increase"
      }
    })

    setLatestPosts(postsForGrid)

    // Build activity feed
    const activities: any[] = []
    latestTemplatesRes.data?.forEach(t => {
      activities.push({
        id: `template-${t.id}`,
        title: `New template created: ${t.name}`,
        time: new Date(t.created_at),
        type: 'template'
      })
    })
    postsForActivity.forEach((p: any) => {
      activities.push({
        id: `post-${p.id}`,
        title: `New post generated for ${p.accounts?.name || 'account'}`,
        time: new Date(p.created_at),
        type: 'post'
      })
    })

    setRecentActivity(
      activities.sort((a, b) => b.time.getTime() - a.time.getTime()).slice(0, 5)
    )

    setLoading(false)
  }

  useEffect(() => {
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
          <div className="flex flex-col gap-6">
            <div className="flex items-center justify-between">
              <div className="space-y-2">
                <Skeleton className="h-8 w-48 bg-zinc-800" />
                <Skeleton className="h-3 w-32 bg-zinc-800" />
              </div>
            </div>

            <div className="grid gap-2 grid-cols-3">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="flex items-center gap-2 px-2.5 py-4 rounded-lg bg-zinc-900/50 border border-zinc-800">
                  <Skeleton className="size-3 rounded bg-zinc-800" />
                  <Skeleton className="h-4 w-6 bg-zinc-800" />
                  <Skeleton className="h-2 w-16 bg-zinc-800" />
                </div>
              ))}
            </div>

            <div className="space-y-6">
              <div className="space-y-3">
                <Skeleton className="h-3 w-32 bg-zinc-800 ml-1" />
                <div className="grid grid-cols-3 gap-3">
                  {[...Array(3)].map((_, i) => (
                    <Card key={i} className="bg-zinc-900/50 border-zinc-800 backdrop-blur-sm p-4 flex flex-col items-center gap-3">
                      <Skeleton className="size-16 rounded-full bg-zinc-800" />
                      <div className="space-y-1 w-full flex flex-col items-center">
                        <Skeleton className="h-3 w-20 bg-zinc-800" />
                        <Skeleton className="h-2 w-16 bg-zinc-800" />
                      </div>
                      <div className="w-full flex gap-2">
                        <Skeleton className="flex-1 h-7 bg-zinc-800 rounded-lg" />
                        <Skeleton className="flex-1 h-7 bg-zinc-800 rounded-lg" />
                      </div>
                    </Card>
                  ))}
                </div>
              </div>

              <div className="space-y-3">
                <Skeleton className="h-3 w-32 bg-zinc-800 ml-1" />
                <div className="grid grid-cols-5 gap-3">
                  {[...Array(5)].map((_, i) => (
                    <div key={i} className="space-y-1.5">
                      <Skeleton className="aspect-[9/16] w-full rounded-xl bg-zinc-800" />
                      <div className="flex justify-between px-0.5">
                        <Skeleton className="h-2 w-12 bg-zinc-800" />
                        <Skeleton className="h-2 w-8 bg-zinc-800" />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="space-y-3">
                <Skeleton className="h-3 w-32 bg-zinc-800 ml-1" />
                <Card className="bg-zinc-900/50 border-zinc-800 backdrop-blur-sm">
                  <div className="divide-y divide-zinc-800/30">
                    {[...Array(5)].map((_, i) => (
                      <div key={i} className="px-3 py-2 flex items-start gap-2.5">
                        <Skeleton className="size-1 rounded-full bg-zinc-800 mt-1" />
                        <div className="space-y-1 flex-1">
                          <Skeleton className="h-3 w-full bg-zinc-800" />
                          <Skeleton className="h-2 w-16 bg-zinc-800" />
                        </div>
                      </div>
                    ))}
                  </div>
                </Card>
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen pb-10">
      <div className="max-w-[1000px] mx-auto px-6 pt-10">
        <div className="flex flex-col gap-6">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <h1 className="text-2xl font-black tracking-tight text-[#dbdbdb] uppercase tracking-widest">Dashboard</h1>
              <p className="text-[#dbdbdb]/40 text-[10px] font-bold uppercase tracking-widest">Command Center</p>
            </div>
          </div>

          {stats.totalAccounts.value === 0 && organizationId && (
            <NewUserCard 
              organizationId={organizationId} 
              onAccountCreated={loadDashboardData}
            />
          )}

          {/* Compact Metrics */}
          <div className="grid gap-2 grid-cols-3">
            {statConfig.map((stat) => (
              <div key={stat.title} className="flex items-center gap-2 px-2.5 py-4 rounded-lg bg-zinc-900/50 border border-zinc-800">
                <stat.icon className="size-3 text-[#ddfc7b] flex-shrink-0" />
                <span className="text-sm font-black text-[#dbdbdb] leading-none">{stat.value}</span>
                <span className="text-[8px] font-bold text-[#dbdbdb]/30 uppercase tracking-wider truncate">{stat.title}</span>
              </div>
            ))}
          </div>

          <div className="space-y-6">
            {/* Quick Account Links - Horizontal */}
            {latestAccounts.length > 0 && (
              <div className="space-y-3">
                <div className="flex items-center justify-between px-1">
                  <h2 className="text-[10px] font-black uppercase tracking-widest text-[#dbdbdb]/40">Active Accounts</h2>
                  <Link href="/dashboard" className="text-[9px] font-black uppercase tracking-widest text-[#ddfc7b]/60 hover:text-[#ddfc7b]">View All</Link>
                </div>
                <div className="grid grid-cols-3 gap-3">
                  {latestAccounts.map((account) => (
                    <Link key={account.id} href={`/accounts/${account.id}`} className="group">
                      <Card className="bg-zinc-900/50 border-zinc-800 hover:border-[#ddfc7b]/30 transition-all backdrop-blur-sm overflow-hidden relative">
                        <div className="p-4 flex flex-col items-center text-center space-y-3">
                          <div className="relative">
                            <div className="size-16 rounded-full overflow-hidden border-2 border-[#ddfc7b]/20 group-hover:border-[#ddfc7b]/50 transition-colors p-0.5">
                              <div className="w-full h-full rounded-full overflow-hidden bg-zinc-800">
                                {account.metadata?.profile_picture ? (
                                  <Image 
                                    src={`/profiles/${account.metadata.profile_picture}`}
                                    alt={account.name}
                                    width={64}
                                    height={64}
                                    className="w-full h-full object-cover"
                                  />
                                ) : (
                                  <div className="w-full h-full flex items-center justify-center">
                                    <Users className="size-6 text-zinc-700" />
                                  </div>
                                )}
                              </div>
                            </div>
                            <div className="absolute -bottom-1 -right-1 size-6 rounded-full bg-[#ddfc7b] border-2 border-[#171717] flex items-center justify-center">
                              <Plus className="size-3 text-[#171717] stroke-[3px]" />
                            </div>
                          </div>
                          
                          <div className="min-w-0 space-y-0.5">
                            <p className="text-[11px] font-black text-[#dbdbdb] truncate">{account.name}</p>
                            <p className="text-[9px] text-[#dbdbdb]/40 font-bold truncate tracking-tight">@{account.username || 'username'}</p>
                          </div>

                          <div className="flex gap-4 pt-1">
                            <div className="text-center">
                              <p className="text-[10px] font-black text-[#dbdbdb]">{Math.floor(Math.random() * 50) + 10}k</p>
                              <p className="text-[7px] font-bold text-[#dbdbdb]/30 uppercase tracking-widest">Followers</p>
                            </div>
                            <div className="text-center">
                              <p className="text-[10px] font-black text-[#dbdbdb]">{Math.floor(Math.random() * 200) + 50}k</p>
                              <p className="text-[7px] font-bold text-[#dbdbdb]/30 uppercase tracking-widest">Likes</p>
                            </div>
                          </div>

                          <div className="w-full flex gap-2">
                            <button 
                              className="flex-1 w-full py-1.5 rounded-lg bg-pink-500 hover:bg-pink-600 text-white font-black text-[8px] uppercase tracking-widest transition-all"
                              onClick={(e) => {
                                e.stopPropagation()
                                router.push(`/accounts/${account.id}`)
                              }}
                            >
                              New Post
                            </button>
                            <button 
                              className="flex-1 w-full py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-[#dbdbdb] font-black text-[8px] uppercase tracking-widest transition-all border border-zinc-700"
                              onClick={(e) => {
                                e.stopPropagation()
                                router.push(`/accounts/${account.id}`)
                              }}
                            >
                              Edit
                            </button>
                          </div>
                        </div>
                      </Card>
                    </Link>
                  ))}
                </div>
              </div>
            )}

            {/* Latest Posts - TikTok Style 9:16 - Smaller and Horizontal */}
            {latestPosts.length > 0 && (
              <div className="space-y-3">
                <h2 className="text-[10px] font-black uppercase tracking-widest text-[#dbdbdb]/40 px-1">Latest Created Posts</h2>
                <div className="grid grid-cols-5 gap-3">
                  {latestPosts
                    .filter((post) => post.content && post.content.template_id)
                    .map((post) => (
                      <div key={post.id} className="space-y-1.5">
                        <div className="relative aspect-[9/16] rounded-xl overflow-hidden border border-zinc-800 bg-black group">
                          <PostCarouselCard 
                            postId={post.id}
                            postContent={post.content}
                            status={post.status}
                            className="border-none w-full h-full"
                          />
                          
                          {/* TikTok Overlays - Smaller */}
                          <div className="absolute right-1 bottom-12 flex flex-col gap-2 z-40">
                            <div className="flex flex-col items-center gap-0.5">
                              <div className="p-1 rounded-full bg-black/30 backdrop-blur-md">
                                <Heart className="size-3 text-white" />
                              </div>
                              <span className="text-[8px] font-bold text-white shadow-sm">24k</span>
                            </div>
                            <div className="flex flex-col items-center gap-0.5">
                              <div className="p-1 rounded-full bg-black/30 backdrop-blur-md">
                                <MessageCircle className="size-3 text-white" />
                              </div>
                              <span className="text-[8px] font-bold text-white shadow-sm">156</span>
                            </div>
                            <div className="flex flex-col items-center gap-0.5">
                              <div className="p-1 rounded-full bg-black/30 backdrop-blur-md">
                                <Bookmark className="size-3 text-white" />
                              </div>
                              <span className="text-[8px] font-bold text-white shadow-sm">1.2k</span>
                            </div>
                          </div>

                          <div className="absolute bottom-0 left-0 right-0 p-2 bg-gradient-to-t from-black/90 to-transparent z-40">
                            <p className="text-[9px] font-black text-white mb-0.5 truncate">@{post.accounts?.username || 'user'}</p>
                          </div>
                        </div>
                        <div className="px-0.5">
                          <span className="text-[8px] font-black text-[#dbdbdb]/30 uppercase tracking-widest">
                            {formatDistanceToNow(new Date(post.created_at), { addSuffix: true })}
                          </span>
                        </div>
                      </div>
                    ))}
                </div>
              </div>
            )}

            {/* System Activity - Below Posts */}
            <div className="space-y-3">
              <h2 className="text-[10px] font-black uppercase tracking-widest text-[#dbdbdb]/40 px-1">System Activity</h2>
              <Card className="bg-zinc-900/50 border-zinc-800 backdrop-blur-sm overflow-hidden">
                <div className="divide-y divide-zinc-800/30">
                  {recentActivity.length > 0 ? recentActivity.map((activity) => (
                    <div key={activity.id} className="px-3 py-2 flex items-start gap-2.5 hover:bg-zinc-800/20 transition-colors">
                      <div className="mt-1 size-1 rounded-full bg-[#ddfc7b] flex-shrink-0" />
                      <div className="min-w-0">
                        <p className="text-[10px] font-bold text-[#dbdbdb]/80 leading-tight truncate">{activity.title}</p>
                        <p className="text-[8px] text-[#dbdbdb]/20 font-black uppercase tracking-tighter">
                          {formatDistanceToNow(activity.time, { addSuffix: true })}
                        </p>
                      </div>
                    </div>
                  )) : (
                    <div className="py-6 text-center">
                      <p className="text-[8px] text-[#dbdbdb]/20 font-black uppercase tracking-widest">No Activity</p>
                    </div>
                  )}
                </div>
              </Card>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

