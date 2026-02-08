"use client"

import * as React from "react"
import { Moon } from "lucide-react"
import { Button } from "@/components/ui/button"

// Dark mode is now forced - this component is disabled
export function DarkModeToggle() {
  return (
    <Button
      variant="ghost"
      size="sm"
      className="h-8 w-8 p-0 text-[#dbdbdb] hover:text-[#dbdbdb] hover:bg-zinc-800 rounded-lg border border-zinc-700 cursor-not-allowed opacity-50"
      disabled
      title="Dark mode is always enabled"
    >
      <Moon className="size-4" />
    </Button>
  )
}
