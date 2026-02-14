"use client"

export const dynamic = "force-dynamic";

import { useState } from "react"
import { signIn } from "next-auth/react"
import { useRouter } from "next/navigation"
import Link from "next/link"

import { ArrowLeft, Sparkles, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import Image from "next/image"

export default function SignupPage() {
  const router = useRouter()
  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState("")

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError("")

    try {
      const response = await fetch("/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, password }),
      })

      const data = await response.json()

      if (!response.ok) {
        setError(data.error || "Something went wrong")
        setIsLoading(false)
        return
      }

      const result = await signIn("credentials", {
        email,
        password,
        redirect: false,
      })

      if (result?.error) {
        setError("Account created, but automatic login failed. Please log in manually.")
        setIsLoading(false)
        return
      }

      router.push("/dashboard")
      router.refresh()
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
          <h2 className="text-6xl font-black tracking-tight leading-[0.9] text-foreground text-balance">
            Build your voice. <br />
            <span className="text-muted-foreground/40 italic">One draft at a time.</span>
          </h2>
          <p className="text-xl text-muted-foreground max-w-md font-light leading-relaxed">
            Join the community of founders and builders who value professional consistency without the noise.
          </p>
        </div>

        <div className="relative z-10 flex items-center gap-4 text-sm font-medium text-muted-foreground">
          <span>Join Linkmate today.</span>
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
            <h1 className="text-4xl font-bold tracking-tight">Create account.</h1>
          </div>

          <div className="space-y-8">


            <Button
              variant="outline"
              className="w-full h-14 rounded-xl flex items-center justify-center gap-3 text-[15px] font-bold tracking-tight shadow-sm bg-white hover:bg-zinc-50 border-zinc-200 text-zinc-900 transition-all active:scale-[0.98] group overflow-hidden"
              onClick={() => signIn("google", { callbackUrl: "/dashboard" })}
              disabled={isLoading}
            >
              <Image
                src="https://www.gstatic.com/images/branding/product/1x/googleg_48dp.png"
                alt="Google"
                width={20}
                height={20}
                className="object-contain"
                unoptimized
              />
              <span>Sign up with Google</span>
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
                <label className="text-[12px] font-bold tracking-widest text-muted-foreground uppercase px-1">Full name</label>
                <Input
                  placeholder="John Doe"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="h-14 rounded-xl border-border bg-secondary/20 focus:ring-1 focus:ring-primary/20 px-6 transition-all"
                  required
                />
              </div>

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
                  minLength={6}
                />
              </div>

              <Button
                type="submit"
                className="w-full h-14 rounded-2xl text-[15px] font-bold tracking-tight shadow-premium"
                disabled={isLoading}
              >
                {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : "Start your journey"}
              </Button>
            </form>

            <p className="text-center text-muted-foreground font-medium">
              Already have an account?{" "}
              <Link href="/login" className="text-primary hover:underline font-bold transition-all">
                Sign in
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

