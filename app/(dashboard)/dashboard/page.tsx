import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { LayoutDashboard, Users, FileText, BarChart3, Sparkles } from "lucide-react"

export default function DashboardPage() {
  const stats = [
    { title: "Total Accounts", value: "12", icon: Users, description: "+2 from last month" },
    { title: "Active Templates", value: "24", icon: FileText, description: "5 new this week" },
    { title: "Total Exports", value: "128", icon: BarChart3, description: "+12% increase" },
  ]

  return (
    <div className="space-y-8 p-8">
      <div>
        <h1 className="text-3xl font-black tracking-tight text-[#dbdbdb] uppercase italic">Dashboard</h1>
        <p className="text-[#dbdbdb]/60 text-sm font-medium">Welcome back to your command center.</p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        {stats.map((stat) => (
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
              {[1, 2, 3].map((i) => (
                <div key={i} className="flex items-center gap-4 p-3 rounded-lg bg-zinc-800/50 border border-zinc-700/50">
                  <div className="size-8 rounded-full bg-[#ddfc7b]/10 flex items-center justify-center">
                    <Sparkles className="size-4 text-[#ddfc7b]" />
                  </div>
                  <div className="flex-1">
                    <p className="text-xs font-bold text-[#dbdbdb]">New template created</p>
                    <p className="text-[10px] text-[#dbdbdb]/40 font-medium">2 hours ago</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
        <Card className="col-span-3 bg-zinc-900/50 border-zinc-800 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="text-sm font-black uppercase tracking-widest text-[#dbdbdb]">Quick Actions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <button className="w-full p-3 rounded-lg bg-[#ddfc7b] text-[#171717] font-black text-xs uppercase tracking-widest hover:scale-[1.02] transition-transform active:scale-[0.98]">
              Create New Template
            </button>
            <button className="w-full p-3 rounded-lg bg-zinc-800 text-[#dbdbdb] font-black text-xs uppercase tracking-widest hover:bg-zinc-700 transition-colors border border-zinc-700">
              Manage Accounts
            </button>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

