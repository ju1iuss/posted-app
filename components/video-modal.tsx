"use client"

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Play } from "lucide-react"

interface VideoModalProps {
  isOpen: boolean
  onClose: () => void
  videoUrl: string
  title: string
}

export function VideoModal({ isOpen, onClose, videoUrl, title }: VideoModalProps) {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl p-0 overflow-hidden bg-black border-zinc-800">
        <DialogHeader className="p-4 bg-zinc-900 border-b border-zinc-800">
          <DialogTitle className="text-sm font-bold text-[#dbdbdb] flex items-center gap-2">
            <Play className="size-3.5 fill-[#ddfc7b] text-[#ddfc7b]" />
            {title}
          </DialogTitle>
        </DialogHeader>
        <div className="aspect-video w-full bg-black">
          {videoUrl.includes("youtube.com") || videoUrl.includes("youtu.be") ? (
            <iframe
              src={videoUrl.replace("watch?v=", "embed/")}
              className="w-full h-full"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
            />
          ) : videoUrl.includes("loom.com") ? (
            <iframe
              src={videoUrl.replace("/share/", "/embed/")}
              className="w-full h-full"
              allowFullScreen
            />
          ) : (
            <video
              src={videoUrl}
              className="w-full h-full"
              controls
              autoPlay
            />
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
