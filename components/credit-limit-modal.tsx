"use client"

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Coins, Sparkles, ArrowRight } from "lucide-react"
import Link from "next/link"

interface CreditLimitModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function CreditLimitModal({ open, onOpenChange }: CreditLimitModalProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[400px] bg-[#171717] border-zinc-700 text-[#dbdbdb] p-0 overflow-hidden">
        <div className="bg-[#ddfc7b] p-8 flex flex-col items-center justify-center text-[#171717] relative overflow-hidden">
          <div className="absolute top-0 right-0 p-4 opacity-20">
            <Sparkles className="size-24 rotate-12" />
          </div>
          <div className="size-16 rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center mb-4 shadow-xl border border-white/30">
            <Coins className="size-8 text-[#171717]" />
          </div>
          <DialogTitle className="text-2xl font-black uppercase tracking-tighter leading-none text-center mb-2">
            Out of Credits
          </DialogTitle>
          <p className="text-[#171717]/80 font-bold text-center text-sm uppercase tracking-widest">
            Ready for more?
          </p>
        </div>
        
        <div className="p-6 space-y-6">
          <div className="space-y-2">
            <p className="text-sm text-center text-zinc-400 font-medium">
              You've used all your credits for this month. Upgrade your plan to continue generating high-quality posts for your accounts.
            </p>
          </div>

          <div className="space-y-3">
            <Button 
              asChild
              className="w-full bg-[#ddfc7b] hover:bg-[#ddfc7b]/90 text-[#171717] font-black uppercase tracking-widest text-xs h-12 rounded-xl group"
              onClick={() => onOpenChange(false)}
            >
              <Link href="/billing" className="flex items-center justify-center gap-2">
                Upgrade Now
                <ArrowRight className="size-4 transition-transform group-hover:translate-x-1" />
              </Link>
            </Button>
            
            <Button 
              variant="ghost"
              className="w-full text-zinc-500 hover:text-[#dbdbdb] hover:bg-zinc-800 font-bold text-xs h-10 rounded-xl transition-all"
              onClick={() => onOpenChange(false)}
            >
              Maybe later
            </Button>
          </div>

          <div className="pt-2 border-t border-zinc-800/50">
            <p className="text-[10px] text-center text-zinc-500 font-medium uppercase tracking-widest">
              Professional growth starts here
            </p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
