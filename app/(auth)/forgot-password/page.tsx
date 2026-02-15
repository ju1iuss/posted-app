"use client"

import Image from "next/image"
import Link from "next/link"
import { useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { ArrowLeft, Mail } from "lucide-react"
import { toast } from "sonner"

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("")
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)
  const supabase = createClient()

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/callback?next=/reset-password`,
    })
    setLoading(false)

    if (error) {
      toast.error(error.message)
    } else {
      setSent(true)
      toast.success("Check your email for the reset link!")
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
            <CardTitle className="text-2xl font-bold tracking-tight text-[#dbdbdb]">Reset password</CardTitle>
            <CardDescription className="text-[#dbdbdb]/60">
              {sent
                ? "We've sent you a reset link. Check your email."
                : "Enter your email and we'll send you a reset link"}
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {sent ? (
            <div className="text-center space-y-4">
              <div className="mx-auto size-12 rounded-full bg-[#ddfc7b]/10 flex items-center justify-center">
                <Mail className="size-6 text-[#ddfc7b]" />
              </div>
              <p className="text-sm text-[#dbdbdb]/60">
                Didn&apos;t receive the email? Check your spam folder or{" "}
                <button
                  type="button"
                  onClick={() => setSent(false)}
                  className="text-[#ddfc7b] hover:text-[#ddfc7b]/80 font-medium transition-colors"
                >
                  try again
                </button>
              </p>
            </div>
          ) : (
            <form onSubmit={handleResetPassword} className="space-y-4">
              <Input
                type="email"
                placeholder="name@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="h-11 rounded-xl border-zinc-700 bg-zinc-900 text-[#dbdbdb] focus:ring-[#ddfc7b]"
              />
              <Button 
                type="submit" 
                className="w-full h-11 bg-[#ddfc7b] text-[#171717] hover:bg-[#ddfc7b]/90 transition-all font-semibold rounded-xl"
                disabled={loading}
              >
                {loading ? "Sending..." : "Send reset link"}
                <Mail className="ml-2 size-4" />
              </Button>
            </form>
          )}
        </CardContent>
        <CardFooter className="flex justify-center border-t border-zinc-700 mt-4 py-6">
          <Link
            href="/login"
            className="flex items-center gap-2 text-sm text-[#dbdbdb]/60 hover:text-[#ddfc7b] transition-colors"
          >
            <ArrowLeft className="size-4" />
            Back to login
          </Link>
        </CardFooter>
      </Card>
    </div>
  )
}
