"use client"

import { useState } from "react"
import { Play, BookOpen, Search } from "lucide-react"
import { Input } from "@/components/ui/input"
import { VideoModal } from "@/components/video-modal"
import { cn } from "@/lib/utils"

const TUTORIALS = [
  {
    id: "1",
    title: "Getting Started with Posted",
    description: "Learn the basics of how to create your first post and manage your accounts.",
    thumbnail: "https://images.unsplash.com/photo-1611162617474-5b21e879e113?q=80&w=1000&auto=format&fit=crop",
    videoUrl: "https://www.youtube.com/watch?v=dQw4w9WgXcQ", // Placeholder
    duration: "2:45",
    category: "Basics"
  },
  {
    id: "2",
    title: "Using AI to Generate Content",
    description: "Discover how to use our AI tools to generate high-quality images and captions.",
    thumbnail: "https://images.unsplash.com/photo-1677442136019-21780ecad995?q=80&w=1000&auto=format&fit=crop",
    videoUrl: "https://www.youtube.com/watch?v=dQw4w9WgXcQ", // Placeholder
    duration: "4:20",
    category: "AI Tools"
  },
  {
    id: "3",
    title: "Mastering the Template Editor",
    description: "A deep dive into creating and customizing templates for your brand.",
    thumbnail: "https://images.unsplash.com/photo-1586717791821-3f44a563dc4c?q=80&w=1000&auto=format&fit=crop",
    videoUrl: "https://www.youtube.com/watch?v=dQw4w9WgXcQ", // Placeholder
    duration: "6:15",
    category: "Design"
  },
  {
    id: "4",
    title: "Managing Collections",
    description: "How to organize your assets and templates into collections for better workflow.",
    thumbnail: "https://images.unsplash.com/photo-1544391496-1ca7c97457cd?q=80&w=1000&auto=format&fit=crop",
    videoUrl: "https://www.youtube.com/watch?v=dQw4w9WgXcQ", // Placeholder
    duration: "3:10",
    category: "Workflow"
  }
]

export default function TutorialsPage() {
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedVideo, setSelectedVideo] = useState<{ url: string; title: string } | null>(null)

  const filteredTutorials = TUTORIALS.filter(t => 
    t.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    t.description.toLowerCase().includes(searchQuery.toLowerCase())
  )

  return (
    <div className="min-h-screen pb-10">
      <div className="max-w-[1000px] mx-auto px-6 pt-10">
        <div className="flex flex-col gap-8">
          {/* Header */}
          <div className="flex flex-col gap-1">
            <h1 className="text-3xl font-bold tracking-tight text-[#dbdbdb]">Tutorials</h1>
            <p className="text-[#dbdbdb]/60 text-sm">Learn how to make the most out of Posted with our video guides.</p>
          </div>

          {/* Search */}
          <div className="relative max-w-md">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-[#dbdbdb]/60" />
            <Input 
              placeholder="Search tutorials..." 
              className="pl-10 h-11 rounded-xl border-zinc-700 bg-zinc-800 text-[#dbdbdb] focus:bg-zinc-800 focus:border-zinc-600 transition-all"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          {/* Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-6">
            {filteredTutorials.map((tutorial) => (
              <div 
                key={tutorial.id}
                onClick={() => setSelectedVideo({ url: tutorial.videoUrl, title: tutorial.title })}
                className="group relative flex flex-col bg-zinc-800/50 border border-zinc-700 rounded-2xl overflow-hidden hover:border-zinc-600 transition-all cursor-pointer"
              >
                {/* Thumbnail */}
                <div className="relative aspect-video overflow-hidden">
                  <img 
                    src={tutorial.thumbnail} 
                    alt={tutorial.title}
                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                  />
                  <div className="absolute inset-0 bg-black/20 group-hover:bg-black/40 transition-colors flex items-center justify-center">
                    <div className="size-12 rounded-full bg-[#ddfc7b] flex items-center justify-center shadow-lg transform transition-transform duration-300 group-hover:scale-110">
                      <Play className="size-5 fill-[#171717] text-[#171717] ml-1" />
                    </div>
                  </div>
                  <div className="absolute bottom-3 right-3 px-2 py-1 rounded-md bg-black/60 backdrop-blur-md text-[10px] font-bold text-white border border-white/10">
                    {tutorial.duration}
                  </div>
                  <div className="absolute top-3 left-3 px-2 py-1 rounded-md bg-[#ddfc7b] text-[10px] font-black uppercase tracking-wider text-[#171717]">
                    {tutorial.category}
                  </div>
                </div>

                {/* Content */}
                <div className="p-5 flex flex-col gap-2">
                  <h3 className="font-bold text-[#dbdbdb] text-lg leading-tight group-hover:text-[#ddfc7b] transition-colors">
                    {tutorial.title}
                  </h3>
                  <p className="text-sm text-[#dbdbdb]/60 line-clamp-2">
                    {tutorial.description}
                  </p>
                </div>
              </div>
            ))}

            {filteredTutorials.length === 0 && (
              <div className="col-span-full py-20 flex flex-col items-center justify-center text-center bg-zinc-800/30 rounded-3xl border border-dashed border-zinc-700">
                <div className="size-12 rounded-2xl bg-zinc-800 flex items-center justify-center mb-4">
                  <BookOpen className="size-6 text-[#dbdbdb]/60" />
                </div>
                <h3 className="font-bold text-[#dbdbdb]">No tutorials found</h3>
                <p className="text-sm text-[#dbdbdb]/60 mt-1">Try a different search term.</p>
              </div>
            )}
          </div>
        </div>
      </div>

      <VideoModal 
        isOpen={!!selectedVideo}
        onClose={() => setSelectedVideo(null)}
        videoUrl={selectedVideo?.url || ""}
        title={selectedVideo?.title || ""}
      />
    </div>
  )
}
