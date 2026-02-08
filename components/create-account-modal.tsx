"use client"

import { useState, useMemo, useEffect } from "react"
import { createClient } from "@/lib/supabase/client"
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogDescription,
  DialogTrigger
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { toast } from "sonner"
import { Plus, UserCircle, Sparkles, Shuffle, Layout } from "lucide-react"
import Image from "next/image"
import { TemplateSelectorModal } from "@/components/template-selector-modal"

interface CreateAccountModalProps {
  organizationId: string
  onAccountCreated?: (account: any) => void
  children?: React.ReactNode
}

const PROFILE_IMAGES = [
  "304f3d97891b0e150af1af0865bc7293.jpg",
  "7503e4cd8b6f05ad88f1a02afee71ca3.jpg",
  "7fad32e2107350c7f472ac85da30d597.jpg",
  "98ba2dd52d1e5ca476dfa624fb0870ef.jpg",
  "a3e6f65a776da84ebbe229872b14d5d1.jpg",
  "a67bbd2371cd11546dd8df93c791c269.jpg",
]

const GIRL_NAMES = [
  "Lara", "Emma", "Sophia", "Olivia", "Isabella", "Mia", "Charlotte", "Amelia",
  "Harper", "Evelyn", "Abigail", "Emily", "Ella", "Elizabeth", "Camila", "Luna",
  "Sofia", "Avery", "Mila", "Aria", "Scarlett", "Penelope", "Layla", "Chloe",
  "Victoria", "Madison", "Eleanor", "Grace", "Nora", "Riley", "Zoey", "Hannah"
]

const UNIVERSITIES = [
  "TUM", "LMU", "TU Berlin", "Heidelberg", "Freiburg", "Mannheim", "Hamburg", "Bonn"
]

const CITIES = [
  "Munich", "Berlin", "Hamburg", "Cologne", "Frankfurt", "Stuttgart", "Düsseldorf", "Dortmund"
]

const THEMES = [
  "Dark Academia", "Light Academia", "Cottagecore", "Goblincore", "Vintage", "Minimalist",
  "Aesthetic", "Soft Girl", "E-Girl", "Indie", "Y2K", "Coastal", "Nature", "Urban"
]

const NICHES = [
  "Self Improvement", "Fashion", "Beauty", "Lifestyle", "Travel", "Food", "Fitness",
  "Study Tips", "Productivity", "Motivation", "Aesthetic", "Art", "Photography", "Wellness"
]

const AI_PROMPTS = [
  "Create engaging TikTok content focused on lifestyle and daily routines. Keep it authentic and relatable.",
  "Generate motivational content that inspires viewers to improve themselves. Use trending formats.",
  "Create aesthetic content showcasing beautiful moments and spaces. Focus on visual appeal.",
  "Generate educational content that teaches something valuable in an entertaining way.",
  "Create content about personal growth and self-care. Make it warm and encouraging.",
  "Generate trendy content that follows current TikTok formats while staying authentic.",
  "Create lifestyle content showing day-in-the-life moments. Keep it real and engaging.",
  "Generate content about productivity and study tips. Make it actionable and inspiring."
]

export function CreateAccountModal({ organizationId, onAccountCreated, children }: CreateAccountModalProps) {
  const [open, setOpen] = useState(false)
  const [creating, setCreating] = useState(false)
  const [profilePicture, setProfilePicture] = useState<string>("")
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(null)
  const [showTemplateModal, setShowTemplateModal] = useState(false)
  const [formData, setFormData] = useState({
    name: "",
    username: "",
    prompt: "",
    notes: "",
    status: "planning" as "planning" | "active" | "paused" | "archived"
  })
  
  const supabase = useMemo(() => createClient(), [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.name || !organizationId || !selectedTemplateId) {
      if (!selectedTemplateId) {
        toast.error("Please select a template")
      }
      return
    }
    
    setCreating(true)
    try {
      const { data, error } = await supabase
        .from('accounts')
        .insert({
          organization_id: organizationId,
          name: formData.name,
          username: formData.username || null,
          prompt: formData.prompt || null,
          notes: formData.notes || null,
          status: "planning",
          template_id: selectedTemplateId,
          metadata: profilePicture ? { profile_picture: profilePicture } : {}
        })
        .select()
        .single()

      if (error) throw error

      toast.success("Account created successfully!")
      setOpen(false)
      setProfilePicture("")
      setSelectedTemplateId(null)
      setFormData({
        name: "",
        username: "",
        prompt: "",
        notes: "",
        status: "planning"
      })
      
      if (onAccountCreated && data) {
        onAccountCreated(data)
      }
    } catch (error: any) {
      console.error(error)
      toast.error(error.message || "Failed to create account")
    } finally {
      setCreating(false)
    }
  }

  const updateField = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  const shuffleInputs = () => {
    // Random profile picture
    const randomProfile = PROFILE_IMAGES[Math.floor(Math.random() * PROFILE_IMAGES.length)]
    setProfilePicture(randomProfile)

    // Random girl name
    const randomName = GIRL_NAMES[Math.floor(Math.random() * GIRL_NAMES.length)]
    
    // Random age (18-25)
    const age = Math.floor(Math.random() * 8) + 18
    
    // Random university and city
    const university = UNIVERSITIES[Math.floor(Math.random() * UNIVERSITIES.length)]
    const city = CITIES[Math.floor(Math.random() * CITIES.length)]
    
    // Generate detailed AI prompt based on context
    const niche = NICHES[Math.floor(Math.random() * NICHES.length)]
    const theme = THEMES[Math.floor(Math.random() * THEMES.length)]
    
    const detailedPrompts = [
      `Create engaging TikTok content focused on ${niche.toLowerCase()} with a ${theme.toLowerCase()} aesthetic. Keep content authentic, relatable, and visually appealing. Use trending formats like transitions, day-in-the-life moments, and educational snippets. Maintain consistent visual style with warm tones and aesthetic backgrounds.`,
      `Generate ${niche.toLowerCase()} content that inspires and educates viewers. Use ${theme.toLowerCase()} visual style with curated backgrounds, soft lighting, and aesthetic compositions. Focus on trending formats like "POV", "Get Ready With Me", and "Day in My Life". Keep captions engaging and use popular hashtags.`,
      `Create ${theme.toLowerCase()}-inspired content about ${niche.toLowerCase()}. Use aesthetic visuals, trending audio, and engaging storytelling. Focus on authentic moments, relatable experiences, and valuable insights. Maintain consistent color palette and visual identity throughout all posts.`,
      `Generate motivational ${niche.toLowerCase()} content with ${theme.toLowerCase()} aesthetic. Use trending TikTok formats, aesthetic backgrounds, and engaging captions. Focus on personal growth, daily routines, and inspiring moments. Keep content authentic and visually cohesive.`,
      `Create lifestyle content showcasing ${niche.toLowerCase()} through a ${theme.toLowerCase()} lens. Use aesthetic visuals, trending sounds, and relatable storytelling. Focus on day-in-the-life moments, routines, and personal experiences. Maintain consistent visual style and engaging narrative.`
    ]
    
    const prompt = detailedPrompts[Math.floor(Math.random() * detailedPrompts.length)]
    
    // Generate bio
    const bio = `${university} | ${city.toLowerCase()}\n${age} years old`

    // Set form data
    setFormData({
      name: randomName,
      username: randomName.toLowerCase() + Math.floor(Math.random() * 1000),
      prompt: prompt,
      notes: bio,
      status: "planning"
    })
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {children || (
          <button className="size-6 mr-1 flex items-center justify-center rounded-lg hover:bg-zinc-800 text-[#dbdbdb]/60 hover:text-[#dbdbdb] transition-colors">
            <Plus className="size-4" />
          </button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[700px] rounded-2xl bg-zinc-800 border-zinc-700 max-h-[90vh] overflow-y-auto">
        <form onSubmit={handleSubmit}>
          <div className="absolute top-4 left-4">
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={shuffleInputs}
              className="h-8 w-8 rounded-lg hover:bg-zinc-700 text-[#dbdbdb]/60 hover:text-[#dbdbdb]"
            >
              <Shuffle className="size-4" />
            </Button>
          </div>
          <DialogHeader className="space-y-2 pb-3">
            <div className="flex justify-center">
              {profilePicture ? (
                <div className="size-10 rounded-xl overflow-hidden shadow-md border border-zinc-700">
                  <Image
                    src={`/profiles/${profilePicture}`}
                    alt="Profile"
                    width={40}
                    height={40}
                    className="w-full h-full object-cover"
                  />
                </div>
              ) : (
                <div className="size-10 rounded-xl bg-zinc-900 flex items-center justify-center shadow-md border border-zinc-700">
                  <UserCircle className="size-5 text-[#dbdbdb]/60" />
                </div>
              )}
            </div>
            <div className="space-y-0.5 text-center">
              <DialogTitle className="text-lg font-bold tracking-tight text-[#dbdbdb]">Create Account</DialogTitle>
              <DialogDescription className="text-sm text-[#dbdbdb]/60">
                Add a new TikTok theme account to manage and create content for.
              </DialogDescription>
            </div>
          </DialogHeader>
          
          <div className="grid gap-3 py-2">
            {/* Account Name & Username Row */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="name" className="text-xs font-semibold text-[#dbdbdb]">
                  Account Name <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="name"
                  placeholder="e.g., Motivation Daily"
                  value={formData.name}
                  onChange={(e) => updateField('name', e.target.value)}
                  className="h-9 rounded-lg bg-zinc-900 border-zinc-700 text-[#dbdbdb] text-sm focus:bg-zinc-800"
                  required
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="username" className="text-xs font-semibold text-[#dbdbdb]">
                  TikTok Username
                </Label>
                <div className="relative">
                  <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[#dbdbdb]/60 text-sm">@</span>
                  <Input
                    id="username"
                    placeholder="username"
                    value={formData.username}
                    onChange={(e) => updateField('username', e.target.value)}
                    className="h-9 rounded-lg bg-zinc-900 border-zinc-700 pl-7 text-[#dbdbdb] text-sm focus:bg-zinc-800"
                  />
                </div>
              </div>
            </div>

            {/* AI Prompt */}
            <div className="space-y-1.5">
              <Label htmlFor="prompt" className="text-xs font-semibold flex items-center gap-1.5 text-[#dbdbdb]">
                <Sparkles className="size-3 text-[#dbdbdb]/60" />
                Default AI Prompt
              </Label>
              <Textarea
                id="prompt"
                placeholder="Enter a default prompt for AI content generation..."
                value={formData.prompt}
                onChange={(e) => updateField('prompt', e.target.value)}
                className="min-h-[60px] rounded-lg bg-zinc-900 border-zinc-700 text-[#dbdbdb] resize-none text-sm focus:bg-zinc-800"
              />
            </div>

            {/* Biography */}
            <div className="space-y-1.5">
              <Label htmlFor="notes" className="text-xs font-semibold text-[#dbdbdb]">Biography</Label>
              <Textarea
                id="notes"
                placeholder="Add a biography for this account..."
                value={formData.notes}
                onChange={(e) => updateField('notes', e.target.value)}
                className="min-h-[50px] rounded-lg bg-zinc-900 border-zinc-700 text-[#dbdbdb] resize-none text-sm focus:bg-zinc-800"
              />
            </div>

            {/* Template Selection */}
            <div className="space-y-2">
              <Label className="text-xs font-semibold text-[#dbdbdb] flex items-center gap-1.5">
                <Layout className="size-3 text-[#dbdbdb]/60" />
                Template <span className="text-red-500">*</span>
              </Label>
              
              <Button
                type="button"
                onClick={() => setShowTemplateModal(true)}
                className={`
                  w-full h-12 rounded-xl border-2 border-dashed flex items-center justify-between px-4 transition-all
                  ${selectedTemplateId 
                    ? 'border-[#ddfc7b]/50 bg-zinc-900/50 text-[#dbdbdb]' 
                    : 'border-zinc-700 bg-zinc-900/30 text-[#dbdbdb]/40 hover:bg-zinc-900/50 hover:border-zinc-600'
                  }
                `}
              >
                <div className="flex items-center gap-2">
                  <Layout className={`size-4 ${selectedTemplateId ? 'text-[#ddfc7b]' : 'text-[#dbdbdb]/20'}`} />
                  <span className="text-sm font-bold">
                    {selectedTemplateId ? "Template Selected" : "Select a Template"}
                  </span>
                </div>
                {selectedTemplateId && (
                  <Badge className="bg-[#ddfc7b] text-[#171717] hover:bg-[#ddfc7b] border-none font-bold text-[10px]">
                    Change
                  </Badge>
                )}
              </Button>

              {!selectedTemplateId && (
                <p className="text-[10px] text-red-400 mt-1 ml-1 font-medium">Please select a template to continue</p>
              )}
            </div>
          </div>

          <div className="flex gap-2 pt-3 border-t border-zinc-700">
            <Button 
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
              className="flex-1 h-10 rounded-xl border-zinc-700 bg-zinc-800 text-[#dbdbdb] hover:bg-zinc-700 text-sm font-bold"
            >
              Cancel
            </Button>
            <Button 
              type="submit" 
              className="flex-1 h-10 bg-[#ddfc7b] text-[#171717] hover:bg-[#ddfc7b]/90 transition-all font-black rounded-xl text-sm uppercase tracking-widest"
              disabled={creating || !formData.name || !selectedTemplateId}
            >
              {creating ? "Creating..." : "Create Account"}
            </Button>
          </div>
        </form>

        {/* Template Selector Modal */}
        <TemplateSelectorModal
          open={showTemplateModal}
          onOpenChange={setShowTemplateModal}
          selectedTemplateId={selectedTemplateId}
          onSelectTemplate={(id) => setSelectedTemplateId(id)}
          organizationId={organizationId}
        />
      </DialogContent>
    </Dialog>
  )
}
