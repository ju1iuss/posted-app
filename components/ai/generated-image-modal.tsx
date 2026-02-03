"use client"

import { useState } from "react"
import { 
  X, 
  RefreshCw, 
  Download, 
  Plus, 
  FolderPlus,
  Check,
  ChevronDown,
  Wand2,
  Loader2
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu"
import { toast } from "sonner"

interface GeneratedImageModalProps {
  imageUrl: string;
  onClose: () => void;
  onRedo: (instructions?: string) => Promise<void>;
  onSaveToCollection: (collectionId: string) => Promise<void>;
  onCreateCollection: (name: string) => Promise<void>;
  collections: { id: string; name: string }[];
  isRedoing?: boolean;
  isSaving?: boolean;
}

export function GeneratedImageModal({
  imageUrl,
  onClose,
  onRedo,
  onSaveToCollection,
  onCreateCollection,
  collections,
  isRedoing = false,
  isSaving = false
}: GeneratedImageModalProps) {
  const [redoInstructions, setRedoInstructions] = useState("")
  const [isCreatingNewCollection, setIsCreatingNewCollection] = useState(false)
  const [newCollectionName, setNewCollectionName] = useState("")

  const handleDownload = async () => {
    try {
      const response = await fetch(imageUrl)
      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `ai-generated-${Date.now()}.png`
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)
    } catch (error) {
      toast.error("Failed to download image")
    }
  }

  const handleCreateCollection = async () => {
    if (!newCollectionName.trim()) return
    await onCreateCollection(newCollectionName.trim())
    setIsCreatingNewCollection(false)
    setNewCollectionName("")
  }

  return (
    <div className="fixed inset-0 z-[100] bg-black/95 backdrop-blur-sm flex items-center justify-center p-4 md:p-10 animate-in fade-in duration-200">
      <button 
        className="absolute top-6 right-6 size-12 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-all hover:scale-110 z-[110]"
        onClick={onClose}
      >
        <X className="size-6" />
      </button>

      <div className="flex flex-col lg:flex-row max-w-5xl w-full bg-zinc-900 rounded-3xl overflow-hidden border border-white/10 shadow-2xl overflow-y-auto lg:overflow-visible max-h-[90vh] lg:max-h-[600px]">
        {/* Image Preview Area */}
        <div className="flex-1 bg-zinc-950 flex items-center justify-center min-h-[300px] lg:min-h-full relative overflow-hidden group">
          <img 
            src={imageUrl} 
            className="w-full h-full object-contain"
            alt="AI Generated"
          />
          
          {/* Top Actions Overlay */}
          <div className="absolute top-4 left-4 flex gap-2">
            <Button 
              size="sm"
              variant="secondary"
              onClick={handleDownload}
              className="bg-black/40 hover:bg-black/60 backdrop-blur-md border border-white/10 text-white h-8 px-3 rounded-full flex items-center gap-1.5 transition-all text-[10px] font-black uppercase tracking-widest"
              title="Download Image"
            >
              <Download className="size-3.5" />
              Download
            </Button>
          </div>

          {isRedoing && (
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm flex flex-col items-center justify-center gap-4">
              <div className="size-10 rounded-full border-4 border-[#ddfc7b]/20 border-t-[#ddfc7b] animate-spin" />
              <p className="text-[#ddfc7b] font-black uppercase tracking-widest text-[10px] animate-pulse">Regenerating...</p>
            </div>
          )}
        </div>

        {/* Controls Sidebar */}
        <div className="w-full lg:w-[300px] p-5 lg:p-6 flex flex-col gap-6 bg-zinc-900 border-l border-white/5 overflow-y-auto">
          <div className="space-y-3">
            <h3 className="text-lg font-bold text-white tracking-tight flex items-center gap-2">
              <Wand2 className="size-4 text-[#ddfc7b]" />
              Refine & Save
            </h3>
            <p className="text-white/40 text-[10px] leading-normal">
              Tweak the result or save it to your collection.
            </p>
          </div>

          <div className="space-y-5">
            {/* Redo Section */}
            <div className="space-y-2.5">
              <label className="text-[9px] font-black uppercase tracking-widest text-white/40 ml-1">Regenerate</label>
              <textarea 
                value={redoInstructions}
                onChange={(e) => setRedoInstructions(e.target.value)}
                placeholder="E.g. More shadows, warmer lighting..."
                className="w-full h-20 bg-zinc-950 border-2 border-zinc-800 rounded-xl p-3 text-[11px] text-white placeholder:text-white/20 focus:outline-none focus:border-[#ddfc7b]/50 transition-colors resize-none font-medium"
              />
              <Button 
                onClick={() => onRedo(redoInstructions)}
                disabled={isRedoing}
                className="w-full bg-[#ddfc7b] hover:bg-[#c6e36d] text-[#171717] font-black uppercase tracking-widest text-[9px] h-10 rounded-xl flex items-center justify-center gap-2 transition-all shadow-lg shadow-[#ddfc7b]/10 group"
              >
                {isRedoing ? (
                  <RefreshCw className="size-3.5 animate-spin" />
                ) : (
                  <RefreshCw className="size-3.5 group-hover:rotate-180 transition-transform duration-500" />
                )}
                Redo
              </Button>
            </div>

            <div className="h-px bg-white/5" />

            {/* Save Section */}
            <div className="space-y-2.5">
              <label className="text-[9px] font-black uppercase tracking-widest text-white/40 ml-1">Collection</label>
              <div className="relative">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button 
                      variant="outline" 
                      className="w-full bg-zinc-950 border-zinc-800 hover:bg-zinc-900 text-white rounded-xl h-10 text-[11px] font-bold justify-between px-3"
                      disabled={isSaving}
                    >
                      {isSaving ? (
                        <div className="flex items-center gap-2">
                          <Loader2 className="size-3 animate-spin text-[#ddfc7b]" />
                          <span>Saving...</span>
                        </div>
                      ) : (
                        <>
                          <span className="truncate">Add to Collection</span>
                          <ChevronDown className="size-3.5 opacity-40" />
                        </>
                      )}
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent className="w-[250px] bg-zinc-900 border-zinc-800 text-white p-2 rounded-xl shadow-2xl z-[150]" align="start" side="bottom" sideOffset={8}>
                    <div className="text-[9px] font-black uppercase tracking-widest text-white/40 p-2 mb-1">My Collections</div>
                    <div className="max-h-[200px] overflow-y-auto custom-scrollbar">
                      {collections.length === 0 ? (
                        <div className="px-2 py-4 text-center text-[10px] text-white/20 font-medium">No collections yet</div>
                      ) : (
                        collections.map((col) => (
                          <DropdownMenuItem 
                            key={col.id}
                            className="rounded-lg focus:bg-[#ddfc7b] focus:text-black cursor-pointer py-2 transition-colors"
                            onClick={() => onSaveToCollection(col.id)}
                          >
                            <div className="flex items-center gap-2">
                              <Plus className="size-3 opacity-40" />
                              <span className="text-[11px] font-bold">{col.name}</span>
                            </div>
                          </DropdownMenuItem>
                        ))
                      )}
                    </div>
                    <DropdownMenuSeparator className="bg-white/5 my-2" />
                    <DropdownMenuItem 
                      className="rounded-lg focus:bg-white/10 cursor-pointer py-2 transition-colors text-[#ddfc7b]"
                      onSelect={(e) => {
                        e.preventDefault()
                        setIsCreatingNewCollection(true)
                      }}
                    >
                      <div className="flex items-center gap-2">
                        <FolderPlus className="size-3.5" />
                        <span className="text-[11px] font-bold">New Collection</span>
                      </div>
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>

              {isCreatingNewCollection && (
                <div className="mt-2.5 p-2.5 rounded-xl bg-zinc-950 border border-zinc-800 animate-in slide-in-from-top-2 duration-200">
                  <Input 
                    placeholder="Collection name..."
                    value={newCollectionName}
                    onChange={(e) => setNewCollectionName(e.target.value)}
                    className="bg-zinc-900 border-zinc-800 text-[11px] h-8 mb-2 focus-visible:ring-[#ddfc7b]"
                    autoFocus
                  />
                  <div className="flex gap-2">
                    <Button 
                      size="sm" 
                      className="flex-1 bg-[#ddfc7b] text-black text-[9px] font-black uppercase h-7"
                      onClick={handleCreateCollection}
                    >
                      Create
                    </Button>
                    <Button 
                      size="sm" 
                      variant="ghost" 
                      className="flex-1 text-[9px] font-black uppercase h-7 text-white/40 hover:text-white"
                      onClick={() => setIsCreatingNewCollection(false)}
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="mt-auto pt-5 border-t border-white/5">
            <div className="flex items-center gap-2.5 text-white/60">
              <div className="size-8 rounded-full bg-zinc-950 border border-zinc-800 flex items-center justify-center text-[#ddfc7b]">
                <Plus className="size-4" />
              </div>
              <p className="text-[9px] font-bold leading-tight">Your generations are ready to use.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
