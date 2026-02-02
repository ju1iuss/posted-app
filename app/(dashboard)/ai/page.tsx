"use client"

import { useState, useRef, useEffect } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { 
  ImageIcon, 
  Sparkles, 
  Download, 
  Share2, 
  History, 
  Wand2, 
  Upload, 
  Check, 
  LayoutGrid,
  Zap,
  Crown,
  User,
  Coffee
} from "lucide-react"
import { cn } from "@/lib/utils"
import { createClient } from "@/lib/supabase/client"
import { toast } from "sonner"

const COLLECTIONS = [
  {
    id: "lifestyle",
    name: "Lifestyle",
    icon: Coffee,
    images: [
      "https://images.unsplash.com/photo-1523275335684-37898b6baf30?q=80&w=1000&auto=format&fit=crop",
      "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?q=80&w=1000&auto=format&fit=crop",
      "https://images.unsplash.com/photo-1526170315836-3f3056089b03?q=80&w=1000&auto=format&fit=crop",
      "https://images.unsplash.com/photo-1491553895911-0055eca6402d?q=80&w=1000&auto=format&fit=crop",
    ]
  },
  {
    id: "avatars",
    name: "With Avatars",
    icon: User,
    images: [
      "https://images.unsplash.com/photo-1534528741775-53994a69daeb?q=80&w=1000&auto=format&fit=crop",
      "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?q=80&w=1000&auto=format&fit=crop",
      "https://images.unsplash.com/photo-1494790108377-be9c29b29330?q=80&w=1000&auto=format&fit=crop",
      "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?q=80&w=1000&auto=format&fit=crop",
    ]
  },
  {
    id: "cool",
    name: "Cool Vibe",
    icon: Zap,
    images: [
      "https://images.unsplash.com/photo-1550745165-9bc0b252726f?q=80&w=1000&auto=format&fit=crop",
      "https://images.unsplash.com/photo-1525547718571-03b0572e4115?q=80&w=1000&auto=format&fit=crop",
      "https://images.unsplash.com/photo-1518770660439-4636190af475?q=80&w=1000&auto=format&fit=crop",
      "https://images.unsplash.com/photo-1555680202-c86f0e12f086?q=80&w=1000&auto=format&fit=crop",
    ]
  },
  {
    id: "luxury",
    name: "Luxury Vibe",
    icon: Crown,
    images: [
      "https://images.unsplash.com/photo-1503602642458-232111445657?q=80&w=1000&auto=format&fit=crop",
      "https://images.unsplash.com/photo-1544161515-4af6b1d462c2?q=80&w=1000&auto=format&fit=crop",
      "https://images.unsplash.com/photo-1519415943484-9fa1873496d4?q=80&w=1000&auto=format&fit=crop",
      "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?q=80&w=1000&auto=format&fit=crop",
    ]
  }
]

export default function AIImageCreator() {
  const [productImage, setProductImage] = useState<string | null>(null)
  const [selectedRefImage, setSelectedRefImage] = useState<string | null>(null)
  const [isGenerating, setIsGenerating] = useState(false)
  const [generatedImages, setGeneratedImages] = useState<any[]>([])
  const [activeCollection, setActiveCollection] = useState(COLLECTIONS[0].id)
  const [isUploading, setIsUploading] = useState(false)
  const [orgId, setOrgId] = useState<string | null>(null)
  const [customInstructions, setCustomInstructions] = useState("")
  const fileInputRef = useRef<HTMLInputElement>(null)
  const supabase = createClient()

  // Fetch organization and recent history
  useEffect(() => {
    async function init() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data: orgMembers } = await supabase
        .from('organization_members')
        .select('organization_id')
        .eq('profile_id', user.id)
        .limit(1)

      const currentOrgId = orgMembers?.[0]?.organization_id
      if (currentOrgId) {
        setOrgId(currentOrgId)
        
        const { data } = await supabase
          .from('images')
          .select('*')
          .eq('organization_id', currentOrgId)
          .eq('source', 'ai_generated')
          .order('created_at', { ascending: false })
          .limit(10)
        
        if (data) setGeneratedImages(data)
      }
    }
    init()
  }, [])

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !orgId) {
      if (!orgId) toast.error("Organization not found")
      return
    }

    setIsUploading(true)
    try {
      const fileExt = file.name.split('.').pop()
      const fileName = `${Math.random().toString(36).substring(2)}.${fileExt}`
      const filePath = `${orgId}/${fileName}`

      const { error } = await supabase.storage
        .from('images')
        .upload(filePath, file)

      if (error) throw error

      const { data: { publicUrl } } = supabase.storage
        .from('images')
        .getPublicUrl(filePath)

      setProductImage(publicUrl)
      toast.success("Product image uploaded!")
    } catch (error: any) {
      toast.error("Upload failed: " + error.message)
    } finally {
      setIsUploading(false)
    }
  }

  const handleGenerate = async (refImage: string) => {
    if (!productImage) {
      toast.error("Please upload a product image first")
      return
    }

    const collection = COLLECTIONS.find(c => c.id === activeCollection)
    const vibe = collection?.name || "lifestyle"

    setSelectedRefImage(refImage)
    setIsGenerating(true)

    try {
      const response = await fetch('/api/ai/edit-image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: `Place this product naturally in this ${vibe} setting. ${customInstructions}. Maintain professional lighting, high resolution, and preserve the product's details. Make it look like a high-end commercial photo.`,
          imageUrls: [productImage, refImage],
          organizationId: orgId
        })
      })

      if (!response.ok) throw new Error("Generation failed")

      const data = await response.json()
      setGeneratedImages(prev => [data.image, ...prev])
      toast.success("Image generated successfully!")
    } catch (error: any) {
      toast.error("Generation failed: " + error.message)
    } finally {
      setIsGenerating(false)
    }
  }

  return (
    <div className="h-full flex flex-col p-8 max-w-7xl mx-auto w-full space-y-8">
      <div>
        <h1 className="text-4xl font-black tracking-tighter text-[#dbdbdb] uppercase italic flex items-center gap-3">
          Product Lifestyle Creator
          <div className="px-2 py-0.5 rounded-full bg-[#ddfc7b] text-[#171717] text-[10px] font-black uppercase tracking-widest not-italic">Beta</div>
        </h1>
        <p className="text-[#dbdbdb]/60 text-sm font-medium mt-1">Upload your product and pick a vibe to generate high-end lifestyle photos.</p>
      </div>

      <div className="grid lg:grid-cols-[350px_1fr] gap-10">
        {/* Left Sidebar: Upload & Selected */}
        <div className="space-y-6">
          <Card className="bg-zinc-900/50 border-zinc-800 backdrop-blur-xl rounded-2xl overflow-hidden border-t-zinc-700">
            <CardContent className="p-6 space-y-6">
              <div className="space-y-4">
                <label className="text-[10px] font-black uppercase tracking-widest text-[#dbdbdb]/60 ml-1">1. Your Product</label>
                <div 
                  onClick={() => fileInputRef.current?.click()}
                  className={cn(
                    "relative aspect-square rounded-xl border-2 border-dashed border-zinc-800 flex flex-col items-center justify-center cursor-pointer hover:border-[#ddfc7b]/50 transition-all overflow-hidden bg-zinc-950",
                    productImage && "border-solid border-[#ddfc7b]/30"
                  )}
                >
                  {productImage ? (
                    <>
                      <img src={productImage} alt="Product" className="w-full h-full object-cover" />
                      <div className="absolute inset-0 bg-black/40 opacity-0 hover:opacity-100 flex items-center justify-center transition-opacity">
                        <Upload className="size-6 text-white" />
                      </div>
                    </>
                  ) : (
                    <div className="text-center p-6">
                      {isUploading ? (
                        <div className="animate-spin size-8 border-2 border-[#ddfc7b] border-t-transparent rounded-full mx-auto" />
                      ) : (
                        <>
                          <Upload className="size-8 text-[#dbdbdb]/20 mx-auto mb-3" />
                          <p className="text-xs font-bold text-[#dbdbdb]/40 uppercase tracking-tight">Click to upload product</p>
                        </>
                      )}
                    </div>
                  )}
                  <input 
                    type="file" 
                    ref={fileInputRef} 
                    onChange={handleFileUpload} 
                    className="hidden" 
                    accept="image/*"
                  />
                </div>
              </div>

              {productImage && (
                <div className="space-y-4 pt-4 border-t border-zinc-800">
                  <label className="text-[10px] font-black uppercase tracking-widest text-[#dbdbdb]/60 ml-1">2. Instructions (Optional)</label>
                  <textarea 
                    value={customInstructions}
                    onChange={(e) => setCustomInstructions(e.target.value)}
                    placeholder="E.g. Make the lighting warmer, add more shadows..."
                    className="w-full h-24 bg-zinc-950 border-2 border-zinc-800 rounded-xl p-3 text-xs text-[#dbdbdb] placeholder:text-[#dbdbdb]/20 focus:outline-none focus:border-[#ddfc7b]/50 transition-colors resize-none font-medium"
                  />
                  <Button 
                    variant="ghost" 
                    onClick={() => setProductImage(null)}
                    className="w-full text-[10px] font-bold text-red-500/60 hover:text-red-500 hover:bg-red-500/10"
                  >
                    Clear Product
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          {generatedImages.length > 0 && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="text-[10px] font-black uppercase tracking-widest text-[#dbdbdb]/60 flex items-center gap-2">
                  <History className="size-3" />
                  Your Generations
                </h4>
              </div>
              <div className="grid grid-cols-2 gap-2">
                {generatedImages.map((img) => (
                  <div key={img.id} className="group relative aspect-square rounded-lg bg-zinc-800 border border-zinc-700 overflow-hidden shadow-lg">
                    <img src={img.url} className="w-full h-full object-cover transition-transform group-hover:scale-110" />
                    <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 flex items-center justify-center gap-2 transition-opacity">
                      <Button size="icon" variant="ghost" className="size-8 text-white hover:bg-white/20">
                        <Download className="size-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Right Content: Collection Grid */}
        <div className="space-y-6">
          <div className="flex flex-wrap items-center gap-2 mb-4">
            {COLLECTIONS.map((col) => {
              const Icon = col.icon
              return (
                <button
                  key={col.id}
                  onClick={() => setActiveCollection(col.id)}
                  className={cn(
                    "px-4 py-2 rounded-full text-[10px] font-black uppercase tracking-widest flex items-center gap-2 transition-all",
                    activeCollection === col.id 
                      ? "bg-[#ddfc7b] text-[#171717] shadow-lg shadow-[#ddfc7b]/20" 
                      : "bg-zinc-900 text-[#dbdbdb]/40 hover:text-[#dbdbdb] hover:bg-zinc-800 border border-zinc-800"
                  )}
                >
                  <Icon className="size-3" />
                  {col.name}
                </button>
              )
            })}
          </div>

          <div className="columns-2 md:columns-3 gap-4 space-y-4">
            {COLLECTIONS.find(c => c.id === activeCollection)?.images.map((imgUrl, idx) => (
              <div 
                key={idx}
                onClick={() => handleGenerate(imgUrl)}
                className={cn(
                  "group relative break-inside-avoid rounded-2xl overflow-hidden border-2 cursor-pointer transition-all",
                  selectedRefImage === imgUrl && isGenerating ? "border-[#ddfc7b] ring-4 ring-[#ddfc7b]/20" : "border-transparent hover:border-white/20 shadow-xl"
                )}
              >
                <img src={imgUrl} className="w-full h-auto object-cover transition-transform duration-700 group-hover:scale-105" />
                
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-end p-4">
                   <div className="flex items-center justify-between">
                      <span className="text-[10px] font-black text-white uppercase tracking-widest">Select Vibe</span>
                      <div className="size-8 rounded-full bg-[#ddfc7b] flex items-center justify-center text-[#171717]">
                        <Wand2 className="size-4" />
                      </div>
                   </div>
                </div>

                {selectedRefImage === imgUrl && isGenerating && (
                  <div className="absolute inset-0 bg-zinc-950/80 backdrop-blur-sm flex flex-col items-center justify-center space-y-3">
                    <div className="size-10 rounded-full border-2 border-[#ddfc7b]/20 border-t-[#ddfc7b] animate-spin" />
                    <span className="text-[10px] font-black text-[#ddfc7b] uppercase tracking-widest animate-pulse">Generating...</span>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
