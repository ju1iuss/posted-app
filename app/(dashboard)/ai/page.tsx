"use client"

import { useState, useRef, useEffect } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { 
  Sparkles, 
  Download, 
  History, 
  Wand2, 
  Upload,
  Maximize2,
  X
} from "lucide-react"
import { cn } from "@/lib/utils"
import { createClient } from "@/lib/supabase/client"
import { toast } from "sonner"
import { CreditLimitModal } from "@/components/credit-limit-modal"
import { GeneratedImageModal } from "@/components/ai/generated-image-modal"

interface InspoImage {
  url: string
  category: string
  filename: string
}

export default function AIImageCreator() {
  const [productImage, setProductImage] = useState<string | null>(null)
  const [selectedRefImage, setSelectedRefImage] = useState<string | null>(null)
  const [isGenerating, setIsGenerating] = useState(false)
  const [generatedImages, setGeneratedImages] = useState<any[]>([])
  const [inspoImages, setInspoImages] = useState<InspoImage[]>([])
  const [categories, setCategories] = useState<string[]>([])
  const [selectedCategory, setSelectedCategory] = useState<string>("All")
  const [isUploading, setIsUploading] = useState(false)
  const [isLoadingCollection, setIsLoadingCollection] = useState(false)
  const [orgId, setOrgId] = useState<string | null>(null)
  const [currentCredits, setCurrentCredits] = useState<number | null>(null)
  const [showCreditModal, setShowCreditModal] = useState(false)
  const [customInstructions, setCustomInstructions] = useState("")
  const [zoomedVibeImage, setZoomedVibeImage] = useState<string | null>(null)
  const [selectedGeneratedImage, setSelectedGeneratedImage] = useState<any | null>(null)
  const [userCollections, setUserCollections] = useState<any[]>([])
  const [isSavingToCollection, setIsSavingToCollection] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const supabase = createClient()

  // Fetch organization and recent history
  useEffect(() => {
    async function init() {
      // Fetch user-specific data first to check org access
      const { data: { user } } = await supabase.auth.getUser()
      
      let currentOrgId: string | null = null
      if (user) {
        const { data: orgMembers } = await supabase
          .from('organization_members')
          .select('organization_id')
          .eq('profile_id', user.id)
          .limit(1)

        currentOrgId = orgMembers?.[0]?.organization_id || null
        
        if (currentOrgId) {
          setOrgId(currentOrgId)
          
          // Fetch current credits
          const { data: orgData } = await supabase
            .from('organizations')
            .select('credits')
            .eq('id', currentOrgId)
            .single()
          
          if (orgData) setCurrentCredits(orgData.credits)
          
          const { data } = await supabase
            .from('images')
            .select('*')
            .eq('organization_id', currentOrgId)
            .eq('source', 'ai_generated')
            .order('created_at', { ascending: false })
            .limit(10)
          
          if (data) setGeneratedImages(data)

          // Fetch user collections
          const { data: collections } = await supabase
            .from('collections')
            .select('id, name')
            .eq('organization_id', currentOrgId)
            .order('name')
          
          if (collections) setUserCollections(collections)
        }
      }

      // Fetch Inspo images from Supabase storage bucket
      setIsLoadingCollection(true)
      try {
        const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg']
        const fetchedImages: InspoImage[] = []
        const categoriesSet = new Set<string>()

        // Try to list root - if it returns folders, use them
        // Otherwise, we'll try common folder names
        const { data: rootItems, error: rootError } = await supabase.storage
          .from('Inspo')
          .list('', { limit: 1000, sortBy: { column: 'name', order: 'asc' } })

        console.log('Root items:', rootItems, 'Error:', rootError)

        // If root listing works and returns items
        if (rootItems && rootItems.length > 0) {
          for (const item of rootItems) {
            // Check if it's a folder (no id or metadata is null)
            const isFolder = !item.id || item.metadata === null
            
            if (isFolder) {
              const categoryName = item.name
              categoriesSet.add(categoryName)

              // List files in this category folder
              const { data: categoryFiles, error: categoryError } = await supabase.storage
                .from('Inspo')
                .list(categoryName, { limit: 1000, sortBy: { column: 'name', order: 'asc' } })

              console.log(`Files in ${categoryName}:`, categoryFiles?.length || 0)

              if (categoryFiles) {
                for (const file of categoryFiles) {
                  if (file.id) {
                    const ext = file.name.toLowerCase().substring(file.name.lastIndexOf('.'))
                    if (imageExtensions.includes(ext)) {
                      const { data: { publicUrl } } = supabase.storage
                        .from('Inspo')
                        .getPublicUrl(`${categoryName}/${file.name}`)

                      fetchedImages.push({
                        url: publicUrl,
                        category: categoryName,
                        filename: file.name
                      })
                    }
                  }
                }
              }
            }
          }
        } else if (rootError) {
          // If there's an error, log it
          console.error('Error listing Inspo bucket root:', rootError)
          toast.error("Unable to list Inspo bucket. Please ensure RLS policies allow SELECT on storage.objects for bucket 'Inspo'")
        } else {
          // Empty result - bucket might be empty or permissions issue
          console.warn('Inspo bucket root listing returned empty array')
        }

        console.log('Final fetched images:', fetchedImages.length)
        console.log('Final fetched categories:', Array.from(categoriesSet))

        setInspoImages(fetchedImages)
        setCategories(Array.from(categoriesSet).sort())
      } catch (error: any) {
        console.error('Error fetching Inspo images:', error)
        toast.error("Failed to load images: " + (error.message || 'Unknown error'))
        setInspoImages([])
        setCategories([])
      } finally {
        setIsLoadingCollection(false)
      }
    }
    init()

    // Load product image from session storage
    const savedProductImage = sessionStorage.getItem('ai-product-image')
    if (savedProductImage) {
      setProductImage(savedProductImage)
      setCustomInstructions("Please replace the products with a clear brand name on it in this photo with this attached product.")
    }
  }, [])

  // Save product image to session storage whenever it changes
  useEffect(() => {
    if (productImage) {
      sessionStorage.setItem('ai-product-image', productImage)
    } else {
      sessionStorage.removeItem('ai-product-image')
    }
  }, [productImage])

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
      setCustomInstructions("Please replace the products with a clear brand name on it in this photo with this attached product.")
      toast.success("Product image uploaded!")
    } catch (error: any) {
      toast.error("Upload failed: " + error.message)
    } finally {
      setIsUploading(false)
    }
  }

  const handleGenerate = async (refImage: string, redoInstructions?: string) => {
    if (!productImage) {
      toast.error("Please upload a product image first")
      return
    }

    if (currentCredits !== null && currentCredits <= 0) {
      setShowCreditModal(true)
      return
    }

    const vibe = "lifestyle"
    const instructions = redoInstructions || customInstructions

    setSelectedRefImage(refImage)
    setIsGenerating(true)

    // Add loading placeholder to generations
    const placeholderId = `loading-${Date.now()}`
    const placeholder = {
      id: placeholderId,
      url: refImage, // Use the vibe image as placeholder background
      status: 'loading',
      created_at: new Date().toISOString()
    }
    setGeneratedImages(prev => [placeholder, ...prev])

    // Optimistically update credits
    const previousCredits = currentCredits
    if (currentCredits !== null && orgId) {
      const newCredits = currentCredits - 1
      setCurrentCredits(newCredits)
      window.dispatchEvent(new CustomEvent('credits-updated', { 
        detail: { credits: newCredits, organizationId: orgId } 
      }))
    }

    try {
      const response = await fetch('/api/ai/edit-image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: `Place this product naturally in this ${vibe} setting. ${instructions}. Maintain professional lighting, high resolution, and preserve the product's details. Make it look like a high-end commercial photo.`,
          imageUrls: [productImage, refImage],
          organizationId: orgId
        })
      })

      if (!response.ok) {
        if (response.status === 402) {
          // Revert on 402
          if (previousCredits !== null && orgId) {
            setCurrentCredits(previousCredits)
            window.dispatchEvent(new CustomEvent('credits-updated', { 
              detail: { credits: previousCredits, organizationId: orgId } 
            }))
          }
          setShowCreditModal(true)
          return
        }
        throw new Error("Generation failed")
      }

      const data = await response.json()
      
      // Replace placeholder with final image
      setGeneratedImages(prev => prev.map(img => 
        img.id === placeholderId ? data.image : img
      ))
      
      // If we are redoing (modal is open), update the selected image to show the new one
      if (selectedGeneratedImage) {
        setSelectedGeneratedImage(data.image)
      }
      
      // Sync with server response
      if (typeof data.newCredits === 'number' && data.organizationId) {
        setCurrentCredits(data.newCredits)
        window.dispatchEvent(new CustomEvent('credits-updated', { 
          detail: { credits: data.newCredits, organizationId: data.organizationId } 
        }))
      }
      
      toast.success("Image generated successfully!")
    } catch (error: any) {
      console.error(error)
      // Update placeholder to error state
      setGeneratedImages(prev => prev.map(img => 
        img.id === placeholderId ? { ...img, status: 'error' } : img
      ))
      // Revert on error
      if (previousCredits !== null && orgId) {
        setCurrentCredits(previousCredits)
        window.dispatchEvent(new CustomEvent('credits-updated', { 
          detail: { credits: previousCredits, organizationId: orgId } 
        }))
      }
      toast.error("Generation failed: " + error.message)
    } finally {
      setIsGenerating(false)
    }
  }

  const handleSaveToCollection = async (collectionId: string) => {
    if (!selectedGeneratedImage || !orgId) return

    setIsSavingToCollection(true)
    try {
      const { error } = await supabase
        .from('collection_images')
        .insert({
          collection_id: collectionId,
          image_id: selectedGeneratedImage.id
        })

      if (error) {
        if (error.code === '23505') {
          toast.error("Image already in this collection")
        } else {
          throw error
        }
      } else {
        toast.success("Saved to collection!")
      }
    } catch (error: any) {
      toast.error("Failed to save: " + error.message)
    } finally {
      setIsSavingToCollection(false)
    }
  }

  const handleCreateCollection = async (name: string) => {
    if (!orgId) return

    try {
      const { data, error } = await supabase
        .from('collections')
        .insert({
          name,
          slug: name.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
          organization_id: orgId
        })
        .select()
        .single()

      if (error) throw error
      
      setUserCollections(prev => [...prev, data])
      toast.success("Collection created!")
      
      // Automatically save to the new collection
      await handleSaveToCollection(data.id)
    } catch (error: any) {
      toast.error("Failed to create collection: " + error.message)
    }
  }

  return (
    <div className="min-h-screen pb-10">
      <div className="max-w-[1000px] mx-auto px-6 pt-10">
        <div className="flex flex-col gap-8">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <h1 className="text-3xl font-bold tracking-tight text-[#dbdbdb] flex items-center gap-3">
                AI Image Replace
                <div className="px-2 py-0.5 rounded-full bg-[#ddfc7b] text-[#171717] text-[10px] font-black uppercase tracking-widest">Beta</div>
              </h1>
              <p className="text-[#dbdbdb]/60 text-sm">Upload your product and pick a vibe to generate high-end lifestyle photos.</p>
            </div>
          </div>

          <div className="grid lg:grid-cols-[220px_1fr] gap-6">
            {/* Left Sidebar: Upload & Selected */}
            <div className="space-y-4">
              <Card className="bg-zinc-900/50 border-zinc-800 backdrop-blur-xl rounded-xl overflow-hidden border-t-zinc-700">
                <CardContent className="p-4 space-y-4">
                  <div className="space-y-2">
                    <label className="text-[9px] font-black uppercase tracking-widest text-[#dbdbdb]/60 ml-1">1. Your Product</label>
                    <div 
                      onClick={() => fileInputRef.current?.click()}
                      className={cn(
                        "relative w-36 h-36 mx-auto rounded-lg border-2 border-dashed border-zinc-800 flex flex-col items-center justify-center cursor-pointer hover:border-[#ddfc7b]/50 transition-all overflow-hidden bg-zinc-950",
                        productImage && "border-solid border-[#ddfc7b]/30"
                      )}
                    >
                      {productImage ? (
                        <>
                          <img src={productImage} alt="Product" className="w-full h-full object-cover" />
                          <div className="absolute inset-0 bg-black/40 opacity-0 hover:opacity-100 flex items-center justify-center transition-opacity">
                            <Upload className="size-5 text-white" />
                          </div>
                        </>
                      ) : (
                        <div className="text-center p-4">
                          {isUploading ? (
                            <div className="animate-spin size-6 border-2 border-[#ddfc7b] border-t-transparent rounded-full mx-auto" />
                          ) : (
                            <>
                              <Upload className="size-6 text-[#dbdbdb]/20 mx-auto mb-2" />
                              <p className="text-[10px] font-bold text-[#dbdbdb]/40 uppercase tracking-tight">Click to upload</p>
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
                    <div className="space-y-3 pt-3 border-t border-zinc-800">
                      <label className="text-[9px] font-black uppercase tracking-widest text-[#dbdbdb]/60 ml-1">2. Instructions (Optional)</label>
                      <textarea 
                        value={customInstructions}
                        onChange={(e) => setCustomInstructions(e.target.value)}
                        placeholder="E.g. Make the lighting warmer..."
                        className="w-full h-20 bg-zinc-950 border-2 border-zinc-800 rounded-lg p-2 text-[10px] text-[#dbdbdb] placeholder:text-[#dbdbdb]/20 focus:outline-none focus:border-[#ddfc7b]/50 transition-colors resize-none font-medium"
                      />
                      <Button 
                        variant="ghost" 
                        onClick={() => setProductImage(null)}
                        className="w-full text-[9px] font-bold text-red-500/60 hover:text-red-500 hover:bg-red-500/10 py-1.5 h-auto"
                      >
                        Clear Product
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>

              {generatedImages.length > 0 && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <h4 className="text-[9px] font-black uppercase tracking-widest text-[#dbdbdb]/60 flex items-center gap-1.5">
                      <History className="size-2.5" />
                      Your Generations
                    </h4>
                  </div>
                  <div className="grid grid-cols-2 gap-1.5">
                    {generatedImages.map((img) => (
                      <div key={img.id} className="group relative aspect-square rounded-md bg-zinc-800 border border-zinc-700 overflow-hidden shadow-md">
                        <img src={img.url} className={cn("w-full h-full object-cover transition-transform group-hover:scale-110", img.status === 'loading' && "blur-sm grayscale opacity-50")} />
                        
                        {img.status === 'loading' ? (
                          <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-black/20">
                            <div className="size-4 border-2 border-[#ddfc7b] border-t-transparent rounded-full animate-spin" />
                            <span className="text-[8px] font-black text-[#ddfc7b] uppercase tracking-widest animate-pulse">Creating...</span>
                          </div>
                        ) : img.status === 'error' ? (
                          <div className="absolute inset-0 flex flex-col items-center justify-center gap-1 bg-red-500/10 backdrop-blur-[1px]">
                            <X className="size-4 text-red-500" />
                            <span className="text-[8px] font-black text-red-500 uppercase tracking-widest">Failed</span>
                            <button 
                              onClick={() => setGeneratedImages(prev => prev.filter(i => i.id !== img.id))}
                              className="text-[7px] font-bold text-red-500/60 hover:text-red-500 uppercase underline"
                            >
                              Remove
                            </button>
                          </div>
                        ) : (
                          <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 flex items-center justify-center gap-2 transition-opacity">
                            <button
                              onClick={(e) => {
                                e.stopPropagation()
                                setSelectedGeneratedImage(img)
                              }}
                              className="size-7 rounded-full bg-white/10 hover:bg-white/20 backdrop-blur-md flex items-center justify-center text-white transition-all hover:scale-110"
                              title="Zoom Image"
                            >
                              <Maximize2 className="size-3.5" />
                            </button>
                            <Button 
                              size="icon" 
                              variant="ghost" 
                              className="size-7 text-white hover:bg-white/20"
                              onClick={async (e) => {
                                e.stopPropagation()
                                try {
                                  const response = await fetch(img.url)
                                  const blob = await response.blob()
                                  const url = window.URL.createObjectURL(blob)
                                  const a = document.createElement('a')
                                  a.href = url
                                  a.download = `ai-generated-${img.id}.png`
                                  document.body.appendChild(a)
                                  a.click()
                                  window.URL.revokeObjectURL(url)
                                  document.body.removeChild(a)
                                } catch (error) {
                                  toast.error("Failed to download image")
                                }
                              }}
                            >
                              <Download className="size-3.5" />
                            </Button>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Right Content: Inspo Grid */}
            <div className="space-y-4">
              <div className="flex flex-wrap items-center gap-2 mb-2">
                <div className="px-3 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest flex items-center gap-1.5 bg-[#ddfc7b] text-[#171717] shadow-lg shadow-[#ddfc7b]/20">
                  <Sparkles className="size-2.5" />
                  Select a Vibe
                </div>
              </div>

              {/* Category Filter */}
              {categories && categories.length > 0 && (
                <div className="flex flex-wrap items-center gap-2 mb-4">
                  <button
                    onClick={() => setSelectedCategory("All")}
                    className={cn(
                      "px-3 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest transition-all",
                      selectedCategory === "All"
                        ? "bg-[#ddfc7b] text-[#171717] shadow-lg shadow-[#ddfc7b]/20"
                        : "bg-zinc-800 text-[#dbdbdb]/60 hover:bg-zinc-700 hover:text-[#dbdbdb]"
                    )}
                  >
                    All
                  </button>
                  {categories.map((category) => (
                    <button
                      key={category}
                      onClick={() => setSelectedCategory(category)}
                      className={cn(
                        "px-3 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest transition-all",
                        selectedCategory === category
                          ? "bg-[#ddfc7b] text-[#171717] shadow-lg shadow-[#ddfc7b]/20"
                          : "bg-zinc-800 text-[#dbdbdb]/60 hover:bg-zinc-700 hover:text-[#dbdbdb]"
                      )}
                    >
                      {category}
                    </button>
                  ))}
                </div>
              )}

              {isLoadingCollection ? (
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  {[1, 2, 3, 4, 5, 6].map((i) => (
                    <div key={i} className="aspect-[4/5] rounded-xl bg-zinc-900 animate-pulse" />
                  ))}
                </div>
              ) : (() => {
                const filteredImages = selectedCategory === "All" 
                  ? inspoImages 
                  : inspoImages.filter(img => img.category === selectedCategory)
                
                return filteredImages.length === 0 ? (
                  <div className="text-center py-12">
                    <p className="text-[#dbdbdb]/60 text-sm">No images found{selectedCategory !== "All" ? ` in ${selectedCategory}` : ""}.</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    {filteredImages.map((img, idx) => (
                      <div 
                        key={idx}
                        className={cn(
                          "group relative rounded-xl overflow-hidden border-2 transition-all aspect-[4/5]",
                          selectedRefImage === img.url && isGenerating ? "border-[#ddfc7b] ring-2 ring-[#ddfc7b]/20" : "border-transparent shadow-lg bg-zinc-900"
                        )}
                      >
                        <img src={img.url} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" />
                        
                        <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-end p-2.5">
                           <div className="flex items-center justify-between gap-1.5">
                              <div className="flex flex-col gap-0.5">
                                <span className="text-[9px] font-black text-white uppercase tracking-widest">Select Vibe</span>
                                <p className="text-[8px] text-white/60 font-medium">Click magic</p>
                              </div>
                              <div className="flex items-center gap-1">
                                <button 
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    setZoomedVibeImage(img.url)
                                  }}
                                  className="size-7 rounded-full bg-white/10 hover:bg-white/20 backdrop-blur-md flex items-center justify-center text-white transition-all hover:scale-110"
                                  title="Zoom Image"
                                >
                                  <Maximize2 className="size-3.5" />
                                </button>
                                <button 
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    if (!productImage) {
                                      toast.error("Please upload a product image first")
                                      return
                                    }
                                    handleGenerate(img.url)
                                  }}
                                  className={cn(
                                    "size-8 rounded-full flex items-center justify-center transition-all hover:scale-110",
                                    productImage 
                                      ? "bg-[#ddfc7b] text-[#171717] shadow-lg shadow-[#ddfc7b]/20 hover:rotate-12" 
                                      : "bg-zinc-800 text-zinc-500 cursor-not-allowed"
                                  )}
                                  title={productImage ? "Generate with this vibe" : "Upload product first"}
                                >
                                  <Wand2 className="size-3.5" />
                                </button>
                              </div>
                           </div>
                        </div>

                      {selectedRefImage === img.url && isGenerating && (
                        <div className="absolute inset-0 bg-zinc-950/80 backdrop-blur-sm flex flex-col items-center justify-center space-y-2 text-center p-4">
                          <div className="size-8 rounded-full border-2 border-[#ddfc7b]/20 border-t-[#ddfc7b] animate-spin" />
                          <div className="flex flex-col gap-1">
                            <span className="text-[9px] font-black text-[#ddfc7b] uppercase tracking-widest animate-pulse">Generating...</span>
                            <span className="text-[8px] text-white/40 font-bold uppercase tracking-tight">Takes about 1 min</span>
                          </div>
                        </div>
                      )}
                      </div>
                    ))}
                  </div>
                )
              })()}
            </div>
          </div>
        </div>
      </div>
      
      <CreditLimitModal 
        open={showCreditModal}
        onOpenChange={setShowCreditModal}
      />

      {/* Generated Image Extended View */}
      {selectedGeneratedImage && (
        <GeneratedImageModal 
          imageUrl={selectedGeneratedImage.url}
          onClose={() => setSelectedGeneratedImage(null)}
          onRedo={async (instructions) => {
            // Get the ref image from metadata
            const refImage = selectedGeneratedImage.metadata?.reference_images?.[1]
            if (refImage) {
              await handleGenerate(refImage, instructions)
            } else {
              toast.error("Original reference image not found")
            }
          }}
          onSaveToCollection={handleSaveToCollection}
          onCreateCollection={handleCreateCollection}
          collections={userCollections}
          isRedoing={isGenerating}
          isSaving={isSavingToCollection}
        />
      )}

      {/* Vibe Zoom Modal (Simple) */}
      {zoomedVibeImage && (
        <div 
          className="fixed inset-0 z-[100] bg-black/95 backdrop-blur-sm flex items-center justify-center p-4 md:p-10 animate-in fade-in duration-200"
          onClick={() => setZoomedVibeImage(null)}
        >
          <button 
            className="absolute top-6 right-6 size-12 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-all hover:scale-110 z-[110]"
            onClick={() => setZoomedVibeImage(null)}
          >
            <X className="size-6" />
          </button>
          <div className="relative max-w-full max-h-full rounded-2xl overflow-hidden shadow-2xl border border-white/10">
            <img 
              src={zoomedVibeImage} 
              className="w-auto h-auto max-w-full max-h-[90vh] object-contain"
              alt="Zoomed vibe"
              onClick={(e) => e.stopPropagation()}
            />
          </div>
        </div>
      )}
    </div>
  )
}

