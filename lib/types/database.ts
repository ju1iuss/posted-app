// Database types for TypeScript
// These match the Supabase schema

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          email: string
          full_name: string | null
          avatar_url: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          email: string
          full_name?: string | null
          avatar_url?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          email?: string
          full_name?: string | null
          avatar_url?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      organizations: {
        Row: {
          id: string
          name: string
          slug: string
          plan: 'free' | 'pro' | 'enterprise'
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          slug: string
          plan?: 'free' | 'pro' | 'enterprise'
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          slug?: string
          plan?: 'free' | 'pro' | 'enterprise'
          created_at?: string
          updated_at?: string
        }
      }
      organization_members: {
        Row: {
          id: string
          organization_id: string
          profile_id: string
          role: 'owner' | 'admin' | 'member'
          created_at: string
        }
        Insert: {
          id?: string
          organization_id: string
          profile_id: string
          role?: 'owner' | 'admin' | 'member'
          created_at?: string
        }
        Update: {
          id?: string
          organization_id?: string
          profile_id?: string
          role?: 'owner' | 'admin' | 'member'
          created_at?: string
        }
      }
      brands: {
        Row: {
          id: string
          organization_id: string
          name: string
          color: string | null
          position: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          organization_id: string
          name: string
          color?: string | null
          position?: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          organization_id?: string
          name?: string
          color?: string | null
          position?: number
          created_at?: string
          updated_at?: string
        }
      }
      accounts: {
        Row: {
          id: string
          organization_id: string
          brand_id: string | null
          name: string
          username: string | null
          theme: string | null
          niche: string | null
          prompt: string | null
          notes: string | null
          status: 'planning' | 'warming_up' | 'active' | 'not_active' | 'paused'
          metadata: Json
          template_id: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          organization_id: string
          brand_id?: string | null
          name: string
          username?: string | null
          theme?: string | null
          niche?: string | null
          prompt?: string | null
          notes?: string | null
          status?: 'planning' | 'warming_up' | 'active' | 'not_active' | 'paused'
          metadata?: Json
          template_id?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          organization_id?: string
          brand_id?: string | null
          name?: string
          username?: string | null
          theme?: string | null
          niche?: string | null
          prompt?: string | null
          notes?: string | null
          status?: 'planning' | 'warming_up' | 'active' | 'not_active' | 'paused'
          metadata?: Json
          template_id?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      strategies: {
        Row: {
          id: string
          organization_id: string
          account_id: string | null
          name: string
          description: string | null
          target_audience: string | null
          tone_guidelines: string | null
          content_themes: string[] | null
          hashtag_sets: Json | null
          posting_schedule: Json | null
          recommendations: string | null
          status: 'draft' | 'active' | 'completed'
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          organization_id: string
          account_id?: string | null
          name: string
          description?: string | null
          target_audience?: string | null
          tone_guidelines?: string | null
          content_themes?: string[] | null
          hashtag_sets?: Json | null
          posting_schedule?: Json | null
          recommendations?: string | null
          status?: 'draft' | 'active' | 'completed'
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          organization_id?: string
          account_id?: string | null
          name?: string
          description?: string | null
          target_audience?: string | null
          tone_guidelines?: string | null
          content_themes?: string[] | null
          hashtag_sets?: Json | null
          posting_schedule?: Json | null
          recommendations?: string | null
          status?: 'draft' | 'active' | 'completed'
          created_at?: string
          updated_at?: string
        }
      }
      posts: {
        Row: {
          id: string
          account_id: string
          strategy_id: string | null
          type: 'carousel' | 'video' | 'image'
          title: string | null
          caption: string | null
          hashtags: string[] | null
          content: Json
          video_url: string | null
          status: 'draft' | 'ready' | 'exported' | 'posted'
          exported_at: string | null
          posted_at: string | null
          metrics: Json
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          account_id: string
          strategy_id?: string | null
          type: 'carousel' | 'video' | 'image'
          title?: string | null
          caption?: string | null
          hashtags?: string[] | null
          content?: Json
          video_url?: string | null
          status?: 'draft' | 'ready' | 'exported' | 'posted'
          exported_at?: string | null
          posted_at?: string | null
          metrics?: Json
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          account_id?: string
          strategy_id?: string | null
          type?: 'carousel' | 'video' | 'image'
          title?: string | null
          caption?: string | null
          hashtags?: string[] | null
          content?: Json
          video_url?: string | null
          status?: 'draft' | 'ready' | 'exported' | 'posted'
          exported_at?: string | null
          posted_at?: string | null
          metrics?: Json
          created_at?: string
          updated_at?: string
        }
      }
      images: {
        Row: {
          id: string
          organization_id: string | null
          storage_path: string
          url: string
          filename: string | null
          source: 'upload' | 'ai_generated' | 'collection'
          prompt: string | null
          width: number | null
          height: number | null
          size_bytes: number | null
          mime_type: string | null
          tags: string[] | null
          metadata: Json
          created_at: string
        }
        Insert: {
          id?: string
          organization_id?: string | null
          storage_path: string
          url: string
          filename?: string | null
          source?: 'upload' | 'ai_generated' | 'collection'
          prompt?: string | null
          width?: number | null
          height?: number | null
          size_bytes?: number | null
          mime_type?: string | null
          tags?: string[] | null
          metadata?: Json
          created_at?: string
        }
        Update: {
          id?: string
          organization_id?: string | null
          storage_path?: string
          url?: string
          filename?: string | null
          source?: 'upload' | 'ai_generated' | 'collection'
          prompt?: string | null
          width?: number | null
          height?: number | null
          size_bytes?: number | null
          mime_type?: string | null
          tags?: string[] | null
          metadata?: Json
          created_at?: string
        }
      }
      collections: {
        Row: {
          id: string
          organization_id: string | null
          name: string
          slug: string
          description: string | null
          cover_image_url: string | null
          is_public: boolean
          category: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          organization_id?: string | null
          name: string
          slug: string
          description?: string | null
          cover_image_url?: string | null
          is_public?: boolean
          category?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          organization_id?: string | null
          name?: string
          slug?: string
          description?: string | null
          cover_image_url?: string | null
          is_public?: boolean
          category?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      collection_images: {
        Row: {
          id: string
          collection_id: string
          image_id: string
          position: number
          created_at: string
        }
        Insert: {
          id?: string
          collection_id: string
          image_id: string
          position?: number
          created_at?: string
        }
        Update: {
          id?: string
          collection_id?: string
          image_id?: string
          position?: number
          created_at?: string
        }
      }
      post_images: {
        Row: {
          id: string
          post_id: string
          image_id: string
          position: number
          created_at: string
        }
        Insert: {
          id?: string
          post_id: string
          image_id: string
          position?: number
          created_at?: string
        }
        Update: {
          id?: string
          post_id?: string
          image_id?: string
          position?: number
          created_at?: string
        }
      }
      templates: {
        Row: {
          id: string
          organization_id: string | null
          name: string
          description: string | null
          type: 'carousel' | 'video'
          aspect_ratio: string
          width: number
          height: number
          prompt: string | null
          is_premade: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          organization_id?: string | null
          name: string
          description?: string | null
          type: 'carousel' | 'video'
          aspect_ratio?: string
          width?: number
          height?: number
          prompt?: string | null
          is_premade?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          organization_id?: string | null
          name?: string
          description?: string | null
          type?: 'carousel' | 'video'
          aspect_ratio?: string
          width?: number
          height?: number
          prompt?: string | null
          is_premade?: boolean
          created_at?: string
          updated_at?: string
        }
      }
      template_slides: {
        Row: {
          id: string
          template_id: string
          position: number
          background_type: 'none' | 'color' | 'image' | 'collection_random' | 'collection_specific' | null
          background_color: string | null
          background_image_id: string | null
          background_collection_id: string | null
          video_url: string | null
          video_collection_id: string | null
          created_at: string
        }
        Insert: {
          id?: string
          template_id: string
          position?: number
          background_type?: 'none' | 'color' | 'image' | 'collection_random' | 'collection_specific' | null
          background_color?: string | null
          background_image_id?: string | null
          background_collection_id?: string | null
          video_url?: string | null
          video_collection_id?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          template_id?: string
          position?: number
          background_type?: 'none' | 'color' | 'image' | 'collection_random' | 'collection_specific' | null
          background_color?: string | null
          background_image_id?: string | null
          background_collection_id?: string | null
          video_url?: string | null
          video_collection_id?: string | null
          created_at?: string
        }
      }
      template_layers: {
        Row: {
          id: string
          slide_id: string
          type: 'text' | 'image'
          position: number
          x: number
          y: number
          width: number
          text_content: string | null
          font_family: string | null
          font_size: number | null
          font_weight: string | null
          text_color: string | null
          text_align: string | null
          background_color: string | null
          stroke_color: string | null
          stroke_width: number | null
          image_id: string | null
          image_collection_id: string | null
          image_source_type: 'specific' | 'collection_random' | 'upload' | null
          created_at: string
        }
        Insert: {
          id?: string
          slide_id: string
          type: 'text' | 'image'
          position?: number
          x?: number
          y?: number
          width?: number
          text_content?: string | null
          font_family?: string | null
          font_size?: number | null
          font_weight?: string | null
          text_color?: string | null
          text_align?: string | null
          background_color?: string | null
          stroke_color?: string | null
          stroke_width?: number | null
          image_id?: string | null
          image_collection_id?: string | null
          image_source_type?: 'specific' | 'collection_random' | 'upload' | null
          created_at?: string
        }
        Update: {
          id?: string
          slide_id?: string
          type?: 'text' | 'image'
          position?: number
          x?: number
          y?: number
          width?: number
          text_content?: string | null
          font_family?: string | null
          font_size?: number | null
          font_weight?: string | null
          text_color?: string | null
          text_align?: string | null
          background_color?: string | null
          stroke_color?: string | null
          stroke_width?: number | null
          image_id?: string | null
          image_collection_id?: string | null
          image_source_type?: 'specific' | 'collection_random' | 'upload' | null
          created_at?: string
        }
      }
    }
  }
}
