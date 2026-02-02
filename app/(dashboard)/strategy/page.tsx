import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Lightbulb, Target, TrendingUp, Zap } from "lucide-react"

export default function StrategyPage() {
  const steps = [
    { title: "Define Goals", icon: Target, description: "Set your primary objectives for this strategy." },
    { title: "Target Audience", icon: TrendingUp, description: "Identify who you want to reach and engage." },
    { title: "Content Pillars", icon: Lightbulb, description: "Outline the key topics and themes for your brand." },
    { title: "Action Plan", icon: Zap, description: "Create a schedule and distribution strategy." },
  ]

  return (
    <div className="space-y-8 p-8 max-w-5xl mx-auto">
      <div className="text-center space-y-2">
        <h1 className="text-4xl font-black tracking-tighter text-[#dbdbdb] uppercase italic">Strategy Builder</h1>
        <p className="text-[#dbdbdb]/60 text-sm font-medium">Craft a winning game plan for your social presence.</p>
      </div>

      <div className="grid gap-6 md:grid-cols-2 mt-12">
        {steps.map((step, index) => (
          <Card key={step.title} className="bg-zinc-900/50 border-zinc-800 backdrop-blur-sm group hover:border-[#ddfc7b]/30 transition-colors">
            <CardHeader className="pb-2">
              <div className="size-10 rounded-xl bg-zinc-800 flex items-center justify-center mb-4 group-hover:bg-[#ddfc7b] group-hover:text-[#171717] transition-all duration-500">
                <step.icon className="size-5" />
              </div>
              <CardTitle className="text-lg font-black text-[#dbdbdb] flex items-center gap-3">
                <span className="text-[#ddfc7b] font-mono text-sm">0{index + 1}</span>
                {step.title}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-[#dbdbdb]/60 leading-relaxed font-medium">
                {step.description}
              </p>
              <button className="mt-6 text-[10px] font-black uppercase tracking-[0.2em] text-[#ddfc7b] hover:translate-x-1 transition-transform inline-flex items-center gap-2">
                Get Started →
              </button>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="mt-12 p-8 rounded-2xl bg-[#ddfc7b] text-[#171717]">
        <div className="flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="space-y-2">
            <h2 className="text-2xl font-black uppercase italic leading-tight">Ready to launch?</h2>
            <p className="font-bold text-sm opacity-80">Generate a complete social strategy in seconds using AI.</p>
          </div>
          <button className="whitespace-nowrap px-8 py-4 bg-[#171717] text-[#ddfc7b] rounded-xl font-black uppercase tracking-widest text-xs hover:scale-105 transition-transform active:scale-95 shadow-xl">
            Start AI Generation
          </button>
        </div>
      </div>
    </div>
  )
}
