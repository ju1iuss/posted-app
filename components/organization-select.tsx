"use client"

import * as React from "react"
import { useEffect, useState, useMemo } from "react"
import { createClient } from "@/lib/supabase/client"
import { Building2, ChevronDown, Check, Plus } from "lucide-react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from "@/components/ui/dropdown-menu"
import { cn } from "@/lib/utils"

export function OrganizationSelect() {
  const [organizations, setOrganizations] = useState<any[]>([])
  const [currentOrg, setCurrentOrg] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const supabase = useMemo(() => createClient(), [])

  useEffect(() => {
    async function loadOrgs() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        setLoading(false)
        return
      }

      const { data: orgMembers } = await supabase
        .from('organization_members')
        .select('organizations(*)')
        .eq('profile_id', user.id)

      const orgs = orgMembers?.map(m => (m as any).organizations).filter(Boolean) || []
      setOrganizations(orgs)
      
      if (orgs.length > 0) {
        setCurrentOrg(orgs[0])
      }
      setLoading(false)
    }

    loadOrgs()
  }, [supabase])

  if (loading) return <div className="h-8 w-32 animate-pulse bg-zinc-800 rounded-lg" />

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button className="flex items-center gap-2.5 px-4 py-1.5 rounded-lg hover:bg-zinc-800 border border-transparent hover:border-zinc-700 transition-all duration-200 group min-w-[200px]">
          <div className="flex aspect-square size-7 items-center justify-center rounded-md bg-[#ddfc7b] text-[#171717] shadow-sm transition-transform group-hover:scale-105">
            <Building2 className="size-3.5" />
          </div>
          <div className="flex flex-col text-left overflow-hidden flex-1">
            <span className="truncate text-[13px] font-bold tracking-tight text-[#dbdbdb]">{currentOrg?.name || "Select Org"}</span>
            <span className="truncate text-[9px] font-black uppercase tracking-widest text-[#dbdbdb]/60 leading-none mt-0.5">{currentOrg?.plan || "Free"}</span>
          </div>
          <ChevronDown className="size-3.5 text-[#dbdbdb]/60 transition-transform duration-300 group-data-[state=open]:rotate-180 flex-shrink-0" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        className="w-56 rounded-xl bg-zinc-800 p-1 shadow-lg border-zinc-700"
        align="start"
        sideOffset={8}
      >
        <DropdownMenuLabel className="px-2 py-1.5 text-[9px] font-bold text-[#dbdbdb]/60 uppercase tracking-widest">Organizations</DropdownMenuLabel>
        {organizations.map((org) => (
          <DropdownMenuItem 
            key={org.id}
            onClick={() => setCurrentOrg(org)}
            className="flex items-center gap-2 rounded-lg px-2 py-1.5 cursor-pointer transition-all focus:bg-zinc-700"
          >
            <div className="flex size-6 items-center justify-center rounded-md bg-zinc-700 border border-zinc-600">
              <Building2 className="size-3 text-[#dbdbdb]" />
            </div>
            <div className="flex flex-col leading-none">
              <span className="text-[12px] font-bold text-[#dbdbdb]">{org.name}</span>
              <span className="text-[8px] font-black text-[#dbdbdb]/60 uppercase tracking-wider mt-0.5">{org.plan}</span>
            </div>
            {org.id === currentOrg?.id && (
              <div className="ml-auto flex size-4 items-center justify-center rounded-full bg-[#ddfc7b]">
                <Check className="size-2 text-[#171717]" />
              </div>
            )}
          </DropdownMenuItem>
        ))}
        <DropdownMenuSeparator className="my-1 bg-zinc-700" />
        <DropdownMenuItem className="flex items-center gap-2 rounded-lg px-2 py-1.5 cursor-pointer text-[#dbdbdb]/60 transition-all hover:text-[#dbdbdb] focus:bg-zinc-700">
          <div className="flex size-6 items-center justify-center rounded-md border border-dashed border-zinc-600">
            <Plus className="size-3" />
          </div>
          <span className="text-[12px] font-bold">New Org</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
