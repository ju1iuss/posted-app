"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Sparkles, UserPlus, Image as ImageIcon, Layout, ArrowRight, PlayCircle } from "lucide-react"
import { CreateAccountModal } from "@/components/create-account-modal"
import Link from "next/link"

interface NewUserCardProps {
  organizationId: string
  onAccountCreated: () => void
}

export function NewUserCard({ organizationId, onAccountCreated }: NewUserCardProps) {
  const steps = [
    {
      title: "Create your first account",
      description: "Set up your TikTok profile to start organizing your content strategy.",
      icon: UserPlus,
      action: (
        <CreateAccountModal organizationId={organizationId} onAccountCreated={onAccountCreated}>
          <button className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-[#ddfc7b] hover:text-[#ddfc7b]/80 transition-colors">
            Get Started <ArrowRight className="size-3" />
          </button>
        </CreateAccountModal>
      )
    },
    {
      title: "Set up brand collections",
      description: "Upload your brand images and assets to use in your video templates.",
      icon: ImageIcon,
      action: (
        <Link href="/collections" className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-[#ddfc7b] hover:text-[#ddfc7b]/80 transition-colors">
          Go to Collections <ArrowRight className="size-3" />
        </Link>
      )
    },
    {
      title: "Design video templates",
      description: "Create or choose templates that define the look and feel of your content.",
      icon: Layout,
      action: (
        <Link href="/templates" className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-[#ddfc7b] hover:text-[#ddfc7b]/80 transition-colors">
          Create Template <ArrowRight className="size-3" />
        </Link>
      )
    },
    {
      title: "Generate & manage content",
      description: "On your account pages, create new posts and manage your TikTok accounts.",
      icon: PlayCircle,
      action: (
        <Link href="/dashboard" className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-[#ddfc7b] hover:text-[#ddfc7b]/80 transition-colors">
          View Accounts <ArrowRight className="size-3" />
        </Link>
      )
    }
  ]

  return (
    <Card className="bg-zinc-900/50 border-zinc-800 backdrop-blur-sm overflow-hidden">
      <CardHeader className="border-b border-zinc-800/50 bg-zinc-800/20 py-4">
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-lg bg-[#ddfc7b]/10">
            <Sparkles className="size-4 text-[#ddfc7b]" />
          </div>
          <div>
            <CardTitle className="text-sm font-black uppercase tracking-widest text-[#dbdbdb]">
              Welcome to Posted
            </CardTitle>
            <p className="text-[10px] font-bold text-[#dbdbdb]/40 uppercase">
              Follow these steps to launch your first automated TikTok channel
            </p>
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <div className="grid md:grid-cols-2 divide-x divide-y md:divide-y-0 divide-zinc-800/50">
          {steps.map((step, index) => (
            <div key={index} className="p-6 hover:bg-zinc-800/30 transition-colors group">
              <div className="flex items-start gap-4">
                <div className="size-10 rounded-xl bg-zinc-800 border border-zinc-700 flex items-center justify-center flex-shrink-0 group-hover:border-[#ddfc7b]/30 group-hover:bg-[#ddfc7b]/5 transition-all">
                  <step.icon className="size-5 text-[#dbdbdb]/60 group-hover:text-[#ddfc7b] transition-colors" />
                </div>
                <div className="space-y-2">
                  <div>
                    <h4 className="text-xs font-black uppercase tracking-wider text-[#dbdbdb]">
                      {index + 1}. {step.title}
                    </h4>
                    <p className="text-[11px] text-[#dbdbdb]/60 leading-relaxed mt-1">
                      {step.description}
                    </p>
                  </div>
                  {step.action}
                </div>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
