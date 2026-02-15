"use client"

import Image from "next/image"
import Link from "next/link"
import { useState } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Lock, Eye, EyeOff, CheckCircle } from "lucide-react"
import { toast } from "sonner"

export default function ResetPasswordPage() {
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault()

    if (password.length < 6) {
      toast.error("Password must be at least 6 characters")
      return
    }

    if (password !== confirmPassword) {
      toast.error("Passwords do not match")
      return
    }

    setLoading(true)
    const { error } = await supabase.auth.updateUser({
      password,
    })
    setLoading(false)

    if (error) {
      toast.error(error.message)
    } else {
      setSuccess(true)
      toast.success("Password updated successfully!")
      setTimeout(() => {
        router.push("/")
        router.refresh()
      }, 2000)
    }
  }

  return (
    <div className="min-h-screen w-full flex items-center justify-center p-4">
      <div className="absolute inset-0 -z-10 bg-[radial-gradient(45%_45%_at_50%_50%,#2a2a2a_0,#171717_100%)]" />
      
      <Card className="w-full max-w-md border-zinc-700 shadow-xl shadow-black/20 backdrop-blur-sm bg-zinc-800/80">
        <CardHeader className="space-y-4 pb-8">
          <div className="flex justify-center">
            <div className="size-16 rounded-2xl overflow-hidden shadow-lg border border-zinc-700/50">
              <Image 
                src="/logo.svg" 
                alt="Posted Logo" 
                width={64} 
                height={64}
                className="w-full h-full object-cover"
              />
            </div>
          </div>
          <div className="space-y-1 text-center">
            <CardTitle className="text-2xl font-bold tracking-tight text-[#dbdbdb]">
              {success ? "Password updated" : "Set new password"}
            </CardTitle>
            <CardDescription className="text-[#dbdbdb]/60">
              {success
                ? "You'll be redirected to the dashboard shortly."
                : "Enter your new password below"}
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {success ? (
            <div className="text-center space-y-4">
              <div className="mx-auto size-12 rounded-full bg-[#ddfc7b]/10 flex items-center justify-center">
                <CheckCircle className="size-6 text-[#ddfc7b]" />
              </div>
              <p className="text-sm text-[#dbdbdb]/60">Redirecting...</p>
            </div>
          ) : (
            <form onSubmit={handleUpdatePassword} className="space-y-4">
              <div className="space-y-3">
                <div className="relative">
                  <Input
                    type={showPassword ? "text" : "password"}
                    placeholder="New password (min. 6 characters)"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    minLength={6}
                    className="h-11 rounded-xl border-zinc-700 bg-zinc-900 text-[#dbdbdb] focus:ring-[#ddfc7b] pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-[#dbdbdb]/40 hover:text-[#dbdbdb]/70 transition-colors"
                  >
                    {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                  </button>
                </div>
                <Input
                  type={showPassword ? "text" : "password"}
                  placeholder="Confirm new password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  minLength={6}
                  className="h-11 rounded-xl border-zinc-700 bg-zinc-900 text-[#dbdbdb] focus:ring-[#ddfc7b]"
                />
              </div>
              <Button 
                type="submit" 
                className="w-full h-11 bg-[#ddfc7b] text-[#171717] hover:bg-[#ddfc7b]/90 transition-all font-semibold rounded-xl"
                disabled={loading}
              >
                {loading ? "Updating..." : "Update password"}
                <Lock className="ml-2 size-4" />
              </Button>
            </form>
          )}
        </CardContent>
        <CardFooter className="flex justify-center border-t border-zinc-700 mt-4 py-6">
          <Link
            href="/login"
            className="text-sm text-[#dbdbdb]/60 hover:text-[#ddfc7b] transition-colors"
          >
            Back to login
          </Link>
        </CardFooter>
      </Card>
    </div>
  )
}
