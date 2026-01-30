"use client"

export const dynamic = "force-dynamic";

import { useState } from "react"
import { signIn } from "next-auth/react"
import { useRouter } from "next/navigation"
import Link from "next/link"

import { ArrowLeft, Sparkles, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState("")

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError("")

    try {
      const result = await signIn("credentials", {
        email,
        password,
        redirect: false,
      })

      if (result?.error) {
        setError("Invalid email or password")
      } else {
        router.push("/dashboard")
        router.refresh()
      }
    } catch (err) {
      setError("Something went wrong. Please try again.")
    } finally {
      setIsLoading(false)
    }
  }



  return (
    <div className="min-h-screen grid lg:grid-cols-2 bg-background selection:bg-primary/10 transition-colors duration-500">
      {/* Brand Side */}
      <div className="hidden lg:flex flex-col justify-between p-16 bg-secondary/30 relative overflow-hidden">
        <div className="relative z-10 flex items-center gap-2 font-bold text-xl tracking-tight uppercase">
          Linkmate
        </div>

        <div className="relative z-10 space-y-6">
          <h2 className="text-6xl font-black tracking-tight leading-[0.9] text-site-fg text-balance">
            Broadcast, <br />
            <span className="text-primary italic">Calmly.</span>
          </h2>
          <p className="text-xl text-muted-foreground max-w-md font-light leading-relaxed">
            The quiet professional&apos;s choice for LinkedIn consistency. No noise, just delivery.
          </p>
        </div>

        <div className="relative z-10 flex items-center gap-4 text-sm font-medium text-muted-foreground">
          <span>Trusted by quiet builders.</span>
        </div>

        {/* Decorative mask */}
        <div className="absolute inset-0 pointer-events-none opacity-20">
          <div className="absolute -top-1/4 -left-1/4 w-full h-full bg-primary/20 rounded-full blur-[160px]" />
          <div className="absolute -bottom-1/4 -right-1/4 w-full h-full bg-primary/10 rounded-full blur-[160px]" />
        </div>
      </div>

      {/* Form Side */}
      <div className="flex items-center justify-center p-8 md:p-16 lg:p-24">
        <div className="w-full max-w-md space-y-12">
          <div className="space-y-4">
            <Link href="/" className="inline-flex items-center gap-2 text-sm font-bold text-muted-foreground hover:text-foreground transition-colors group">
              <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
              Back to home
            </Link>
            <h1 className="text-4xl font-bold tracking-tight">Sign in.</h1>
          </div>

          <div className="space-y-8">


            <Button
              variant="outline"
              className="w-full h-14 rounded-2xl flex items-center justify-center gap-3 text-[15px] font-bold tracking-tight shadow-sm hover:bg-secondary/50 group"
              onClick={() => signIn("google", { callbackUrl: "/dashboard" })}
              disabled={isLoading}
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24">
                <path
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  fill="#4285F4"
                />
                <path
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  fill="#34A853"
                />
                <path
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                  fill="#FBBC05"
                />
                <path
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.66l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                  fill="#EA4335"
                />
              </svg>
              <span>Continue with Google</span>
            </Button>

            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t border-border" />
              </div>
              <div className="relative flex justify-center text-xs uppercase font-bold tracking-widest text-muted-foreground bg-site-bg px-4">
                Or email
              </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
              {error && (
                <div className="p-4 bg-destructive/10 border border-destructive/20 rounded-xl text-destructive text-[13px] font-bold">
                  {error}
                </div>
              )}

              <div className="space-y-2">
                <label className="text-[12px] font-bold tracking-widest text-muted-foreground uppercase px-1">Email</label>
                <Input
                  type="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="h-14 rounded-xl border-border bg-secondary/20 focus:ring-1 focus:ring-primary/20 px-6 transition-all"
                  required
                />
              </div>

              <div className="space-y-2">
                <label className="text-[12px] font-bold tracking-widest text-muted-foreground uppercase px-1">Password</label>
                <Input
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="h-14 rounded-xl border-border bg-secondary/20 focus:ring-1 focus:ring-primary/20 px-6 transition-all"
                  required
                />
              </div>

              <Button
                type="submit"
                className="w-full h-14 rounded-2xl text-[15px] font-bold tracking-tight shadow-premium"
                disabled={isLoading}
              >
                {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : "Sign in to Linkmate"}
              </Button>
            </form>

            <p className="text-center text-muted-foreground font-medium">
              Don&apos;t have an account?{" "}
              <Link href="/signup" className="text-primary hover:underline font-bold transition-all">
                Sign up
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

