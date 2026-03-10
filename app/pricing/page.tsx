"use client"

import { useSession } from "next-auth/react"
import { Check, X, ShieldCheck, Zap, ArrowRight, Star } from "lucide-react"
import Link from "next/link"
import { motion } from "framer-motion"
import { PLAN_LIMITS } from "@/lib/plan-limits"

export default function PricingPage() {
  const { data: session } = useSession()
  const userPlan = session?.user?.plan || "free"

  const plans = [
    {
      name: "Free",
      id: "free",
      price: "₹0",
      description: "Perfect for getting started with LinkedIn consistency.",
      features: [
        { text: `${PLAN_LIMITS.free.aiPostsPerDay} AI posts per day`, included: true },
        { text: `${PLAN_LIMITS.free.writingStyles} writing style`, included: true },
        { text: `${PLAN_LIMITS.free.scheduledPostsPerMonth} scheduled posts / month`, included: true },
        { text: "Consistency tracking", included: true },
        { text: "Autopilot mode", included: false },
        { text: "Priority support", included: false },
      ],
      cta: "Current Plan",
      href: "#",
      featured: false,
    },
    {
      name: "Pro",
      id: "pro",
      price: "₹249",
      period: "/month",
      description: "For serious creators who want total LinkedIn automation.",
      features: [
        { text: "Unlimited AI posts", included: true },
        { text: "Unlimited writing styles", included: true },
        { text: "Unlimited scheduled posts", included: true },
        { text: "Consistency reports", included: true },
        { text: "Autopilot mode", included: true },
        { text: "Priority support", included: true },
      ],
      cta: "Upgrade to Pro",
      href: "/api/payments/razorpay/checkout", // This will be handled by a function later
      featured: true,
    },
  ]

  const handleUpgrade = async () => {
    try {
      const response = await fetch("/api/payments/razorpay", {
        method: "POST",
      })

      const data = await response.json()

      if (data.error) {
        alert(data.error)
        return
      }

      const options = {
        key: data.key,
        amount: data.amount,
        currency: data.currency,
        name: "Linkmate Pro",
        description: "Monthly subscription for Linkmate Pro",
        order_id: data.orderId,
        handler: async function (response: any) {
          // In a real app, you'd verify the payment on the server here
          // But our webhook will also handle it asynchronously
          alert("Payment successful! Your account will be upgraded shortly.")
          window.location.href = "/dashboard"
        },
        prefill: {
          name: session?.user?.name || "",
          email: session?.user?.email || "",
        },
        theme: {
          color: "#3b82f6",
        },
      }

      const rzp = new (window as any).Razorpay(options)
      rzp.open()
    } catch (error) {
      console.error("Upgrade error:", error)
      alert("Something went wrong. Please try again.")
    }
  }

  return (
    <div className="min-h-screen bg-[#050505] text-white selection:bg-blue-500/30">
      <script src="https://checkout.razorpay.com/v1/checkout.js" async />
      <div className="max-w-7xl mx-auto px-6 py-24 lg:py-32">
        <div className="text-center mb-20">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <h1 className="text-5xl lg:text-7xl font-bold tracking-tight bg-gradient-to-b from-white to-white/40 bg-clip-text text-transparent mb-6">
              Simple, transparent pricing
            </h1>
            <p className="text-lg text-zinc-400 max-w-2xl mx-auto">
              Choose the plan that&apos;s right for you. Start for free and upgrade when you&apos;re ready to scale.
            </p>
          </motion.div>
        </div>

        <div className="grid md:grid-cols-2 gap-8 max-w-5xl mx-auto">
          {plans.map((plan, index) => (
            <motion.div
              key={plan.name}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
              className={`relative rounded-3xl p-8 lg:p-10 border transition-all duration-300 ${
                plan.featured
                  ? "bg-gradient-to-b from-blue-600/10 to-transparent border-blue-500/50 shadow-[0_0_50px_-12px_rgba(59,130,246,0.25)]"
                  : "bg-zinc-900/50 border-zinc-800 hover:border-zinc-700"
              }`}
            >
              {plan.featured && (
                <div className="absolute -top-4 left-1/2 -translate-x-1/2 px-4 py-1 bg-blue-500 text-white text-xs font-bold rounded-full flex items-center gap-1 uppercase tracking-wider">
                  <Star className="w-3 h-3 fill-current" />
                  Most Popular
                </div>
              )}

              <div className="mb-8">
                <h3 className="text-xl font-semibold mb-2">{plan.name}</h3>
                <div className="flex items-baseline gap-1 mb-4">
                  <span className="text-4xl lg:text-5xl font-bold">{plan.price}</span>
                  {plan.period && <span className="text-zinc-400">{plan.period}</span>}
                </div>
                <p className="text-zinc-400 text-sm leading-relaxed">{plan.description}</p>
              </div>

              <div className="space-y-4 mb-10">
                {plan.features.map((feature) => (
                  <div key={feature.text} className="flex items-start gap-3">
                    <div className={`mt-0.5 rounded-full p-0.5 ${feature.included ? "bg-blue-500/20 text-blue-400" : "bg-zinc-800 text-zinc-600"}`}>
                      {feature.included ? (
                        <Check className="w-3.5 h-3.5" />
                      ) : (
                        <X className="w-3.5 h-3.5" />
                      )}
                    </div>
                    <span className={`text-sm ${feature.included ? "text-zinc-200" : "text-zinc-500"}`}>
                      {feature.text}
                    </span>
                  </div>
                ))}
              </div>

              {userPlan === plan.id ? (
                <button
                  disabled
                  className="w-full py-4 rounded-xl font-semibold bg-zinc-800 text-zinc-400 cursor-not-allowed flex items-center justify-center gap-2"
                >
                  Current Plan
                </button>
              ) : (
                <button
                  onClick={plan.id === "pro" ? handleUpgrade : undefined}
                  className={`w-full py-4 rounded-xl font-semibold transition-all duration-200 flex items-center justify-center gap-2 ${
                    plan.featured
                      ? "bg-blue-600 hover:bg-blue-500 text-white shadow-lg shadow-blue-600/20"
                      : "bg-white hover:bg-zinc-100 text-black"
                  }`}
                >
                  {plan.cta}
                  <ArrowRight className="w-4 h-4" />
                </button>
              )}
            </motion.div>
          ))}
        </div>

        <div className="mt-24 text-center">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-zinc-900 border border-zinc-800 text-zinc-400 text-sm">
                <ShieldCheck className="w-4 h-4 text-blue-500" />
                Secure payments via Razorpay
            </div>
        </div>
      </div>
    </div>
  )
}
