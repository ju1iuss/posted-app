"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { 
  Heart, 
  MessageCircle, 
  MoreHorizontal,
  Plus,
  Verified,
  Lock,
  Play
} from "lucide-react"

// Mock data
const accountData = {
  username: "sophia1",
  displayName: "Sophia",
  verified: true,
  bio: "✨ Content Creator | Fashion & Lifestyle\n📍 Los Angeles\n💌 sophia@example.com",
  followers: "2.5M",
  following: "892",
  likes: "45.2M",
  profilePic: "https://api.dicebear.com/7.x/avataaars/svg?seed=sophia",
}

const posts = [
  {
    id: 1,
    thumbnail: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=600&h=600&fit=crop",
    views: "1.2M",
  },
  {
    id: 2,
    thumbnail: "https://images.unsplash.com/photo-1517841905240-472988babdf9?w=600&h=600&fit=crop",
    views: "890K",
  },
  {
    id: 3,
    thumbnail: "https://images.unsplash.com/photo-1529626455594-4ff0802cfb7e?w=600&h=600&fit=crop",
    views: "2.1M",
  },
  {
    id: 4,
    thumbnail: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=600&h=600&fit=crop",
    views: "1.5M",
  },
  {
    id: 5,
    thumbnail: "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=600&h=600&fit=crop",
    views: "980K",
  },
  {
    id: 6,
    thumbnail: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=600&h=600&fit=crop",
    views: "1.8M",
  },
  {
    id: 7,
    thumbnail: "https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=600&h=600&fit=crop",
    views: "3.4M",
  },
  {
    id: 8,
    thumbnail: "https://images.unsplash.com/photo-1488161628813-04466f872be2?w=600&h=600&fit=crop",
    views: "1.1M",
  },
  {
    id: 9,
    thumbnail: "https://images.unsplash.com/photo-1524504388940-b1c1722653e1?w=600&h=600&fit=crop",
    views: "2.5M",
  },
]

export default function AccountPage() {
  const [activeTab, setActiveTab] = useState<"videos" | "liked" | "private">("videos")

  return (
    <div className="min-h-screen pb-10">
      <div className="max-w-[800px] mx-auto px-4 pt-4">
        {/* Profile Info Section */}
        <div className="flex flex-col gap-6 mb-8">
          <div className="flex gap-5 items-start">
            <Avatar className="size-28 md:size-32 border border-border">
              <AvatarImage src={accountData.profilePic} alt={accountData.displayName} />
              <AvatarFallback className="text-2xl">{accountData.displayName[0]}</AvatarFallback>
            </Avatar>
            <div className="flex flex-col gap-4 py-2">
              <div className="flex flex-col gap-1">
                <div className="flex items-center gap-2">
                  <h1 className="text-2xl md:text-3xl font-bold tracking-tight">{accountData.username}</h1>
                  {accountData.verified && (
                    <Verified className="size-5 text-[#20D5EC] fill-[#20D5EC]" />
                  )}
                </div>
                <h2 className="text-lg font-medium">{accountData.displayName}</h2>
              </div>
              
              <div className="flex gap-4">
                <Button className="bg-[#FE2C55] hover:bg-[#E11D48] text-white px-8 font-bold rounded-sm h-10 transition-colors">
                  Follow
                </Button>
                <Button variant="outline" size="icon" className="h-10 w-10 border-2">
                  <Plus className="size-5" />
                </Button>
                <Button variant="outline" size="icon" className="h-10 w-10 border-2">
                  <MoreHorizontal className="size-5" />
                </Button>
              </div>
            </div>
          </div>

          {/* Stats Row */}
          <div className="flex gap-5 text-lg">
            <div>
              <span className="font-bold">{accountData.following}</span>
              <span className="text-muted-foreground ml-1">Following</span>
            </div>
            <div>
              <span className="font-bold">{accountData.followers}</span>
              <span className="text-muted-foreground ml-1">Followers</span>
            </div>
            <div>
              <span className="font-bold">{accountData.likes}</span>
              <span className="text-muted-foreground ml-1">Likes</span>
            </div>
          </div>

          {/* Bio Section */}
          <div className="text-base whitespace-pre-line leading-relaxed">
            {accountData.bio}
          </div>
        </div>

        {/* Tabs Section */}
        <div className="flex border-b border-border/60 mb-2">
          <button
            onClick={() => setActiveTab("videos")}
            className={`flex items-center gap-2 px-8 py-3 font-bold text-base border-b-2 transition-all ${
              activeTab === "videos"
                ? "border-foreground text-foreground"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            Videos
          </button>
          <button
            onClick={() => setActiveTab("private")}
            className={`flex items-center gap-2 px-8 py-3 font-bold text-base border-b-2 transition-all ${
              activeTab === "private"
                ? "border-foreground text-foreground"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            <Lock className="size-4" />
            Liked
          </button>
        </div>

        {/* Video Grid */}
        <div className="grid grid-cols-3 gap-px md:gap-1">
          {posts.map((post) => (
            <div
              key={post.id}
              className="group relative aspect-square cursor-pointer overflow-hidden bg-muted"
            >
              <img
                src={post.thumbnail}
                alt={`Post ${post.id}`}
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors" />
              <div className="absolute bottom-2 left-2 flex items-center gap-1 text-white drop-shadow-md">
                <Play className="size-4 fill-white" />
                <span className="text-sm font-bold">{post.views}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
