"use client"

import { Check, X, ShieldCheck, Zap, ArrowRight, Star, HelpCircle, ChevronDown, Sparkles } from "lucide-react"
import { useState } from "react"
import Link from "next/link"
import { motion, AnimatePresence } from "framer-motion"
import { PLAN_LIMITS } from "@/lib/plan-limits"
import { cn } from "@/lib/utils"

import { useUser } from "@/context/UserContext"

const MotionDiv = motion.div as any

function FAQItem({ question, answer }: { question: string, answer: string }) {
  const [isOpen, setIsOpen] = useState(false)
  return (
    <div className="border-b border-border transition-all">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full py-6 flex items-center justify-between text-left hover:text-primary transition-colors group"
      >
        <span className="text-lg font-semibold pr-8">{question}</span>
        <ChevronDown className={cn("w-5 h-5 text-muted-foreground transition-transform duration-300", isOpen && "rotate-180")} />
      </button>
      <AnimatePresence>
        {isOpen && (
          <MotionDiv
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease: "easeInOut" }}
            className="overflow-hidden"
          >
            <p className="pb-6 text-muted-foreground leading-relaxed">
              {answer}
            </p>
          </MotionDiv>
        )}
      </AnimatePresence>
    </div>
  )
}

export default function PricingPage() {
  const { user } = useUser()
  const userPlan = (user?.plan || "FREE").toUpperCase()

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
      price: "₹0",
      period: "/month",
      description: "Free for limited early users. Save 10+ hours a week.",
      features: [
        { text: "Unlimited AI posts", included: true },
        { text: "Unlimited writing styles", included: true },
        { text: "Unlimited scheduled posts", included: true },
        { text: "Consistency reports", included: true },
        { text: "Autopilot mode", included: true },
        { text: "Priority support", included: true },
      ],
      cta: "Upgrade to Pro",
      href: "#",
      featured: true,
    },
  ]

  const faqs = [
    {
      question: "What exactly is Autopilot Mode?",
      answer: "Autopilot is our premium automation engine. Instead of manually creating posts, you define your strategy once, and our AI weekly generates, optimizes, and prepares your content queue. You just review and approve in one click."
    },
    {
      question: "What happens when I reach my limit on the Free plan?",
      answer: "When you hit a daily or monthly limit, you'll see a friendly prompt to upgrade. You can still access all your existing posts and data, but you'll need to wait for the limit to reset or upgrade to Pro for unlimited access."
    },
    {
      question: "How do 'Writing Styles' work?",
      answer: "Writing Styles (Write Like Me) allows you to train the AI on your specific voice. You can paste samples of your previous posts, and the AI will mimic your tone, structure, and vocabulary perfectly. Free users get 1 style, while Pro users can save unlimited custom personas."
    },
    {
      question: "Can I cancel my subscription at any time?",
      answer: "Yes, absolutely. There are no long-term contracts. You can cancel your subscription from your settings at any time, and you'll retain Pro access until the end of your current billing period."
    },
    {
      question: "Is my LinkedIn account safe with Linkmate?",
      answer: "Linkmate uses official LinkedIn API integrations. We never store your password, and we follow LinkedIn's rate limits and best practices to ensure your account remains in good standing."
    }
  ]

  const handleUpgrade = async () => {
    try {
      const response = await fetch("/api/create-subscription", {
        method: "POST",
      })

      const data = await response.json()

      if (data.error) {
        alert(data.error)
        return
      }

      const options = {
        key: data.razorpayKey,
        subscription_id: data.subscriptionId,
        name: "Linkmate Pro",
        description: "Monthly subscription for Linkmate Pro",
        handler: async function (response: any) {
          console.log("Payment successful for subscription:", response.razorpay_subscription_id);
          alert("Payment successful! Your account will be upgraded within a few minutes.");
          window.location.href = "/dashboard";
        },
        prefill: {
          name: user?.name || "",
          email: user?.email || "",
        },
        theme: {
          color: "#3b82f6",
        },
        modal: {
          ondismiss: function() {
            console.log("Checkout modal closed");
          }
        }
      }

      const rzp = new (window as any).Razorpay(options)
      rzp.open()
    } catch (error) {
      console.error("Upgrade error:", error)
      alert("Something went wrong. Please try again.")
    }
  }

  return (
    <div className="min-h-screen bg-background text-foreground selection:bg-primary/20 transition-colors duration-300">
      <script src="https://checkout.razorpay.com/v1/checkout.js" async />
      <div className="max-w-7xl mx-auto px-6 py-24 lg:py-32">
        {/* Header */}
        <div className="text-center mb-20">
          <MotionDiv
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <h1 className="text-5xl lg:text-7xl font-bold tracking-tight mb-6 bg-gradient-to-b from-foreground to-foreground/50 bg-clip-text text-transparent">
              Simple, transparent pricing
            </h1>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Choose the plan that&apos;s right for you. Start for free and upgrade when you&apos;re ready to scale.
            </p>
          </MotionDiv>
        </div>

        {/* Pricing Cards */}
        <div className="grid md:grid-cols-2 gap-8 max-w-5xl mx-auto mb-32">
          {plans.map((plan, index) => (
            <MotionDiv
              key={plan.name}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
              className={cn(
                "relative rounded-3xl p-8 lg:p-10 border transition-all duration-300",
                plan.featured
                  ? "bg-primary/[0.03] border-primary/50 shadow-2xl shadow-primary/10"
                  : "bg-card border-border hover:border-primary/30"
              )}
            >
              {plan.featured && (
                <div className="absolute -top-4 left-1/2 -translate-x-1/2 px-4 py-1 bg-primary text-primary-foreground text-xs font-bold rounded-full flex items-center gap-1 uppercase tracking-wider shadow-lg">
                  <Star className="w-3 h-3 fill-current" />
                  Most Popular
                </div>
              )}

              <div className="mb-8">
                <h3 className="text-xl font-semibold mb-2">{plan.name}</h3>
                <div className="flex items-baseline gap-1 mb-4">
                  <span className="text-4xl lg:text-5xl font-bold">{plan.price}</span>
                  {plan.period && <span className="text-muted-foreground">{plan.period}</span>}
                </div>
                <p className="text-muted-foreground text-sm leading-relaxed">{plan.description}</p>
              </div>

              <div className="space-y-4 mb-10">
                {plan.features.map((feature) => (
                  <div key={feature.text} className="flex items-start gap-3">
                    <div className={cn(
                      "mt-0.5 rounded-full p-0.5",
                      feature.included ? "bg-primary/20 text-primary" : "bg-muted text-muted-foreground"
                    )}>
                      {feature.included ? (
                        <Check className="w-3.5 h-3.5" />
                      ) : (
                        <X className="w-3.5 h-3.5" />
                      )}
                    </div>
                    <span className={cn(
                      "text-sm font-medium",
                      feature.included ? "text-foreground/90" : "text-muted-foreground/60"
                    )}>
                      {feature.text}
                    </span>
                  </div>
                ))}
              </div>

              {userPlan === plan.id.toUpperCase() ? (
                <button
                  disabled
                  className="w-full py-4 rounded-xl font-semibold bg-muted text-muted-foreground cursor-not-allowed flex items-center justify-center gap-2 border border-border"
                >
                  Current Plan
                </button>
              ) : (
                <button
                  onClick={plan.id === "pro" ? handleUpgrade : undefined}
                  className={cn(
                    "w-full py-4 rounded-xl font-semibold transition-all duration-200 flex items-center justify-center gap-2",
                    plan.featured
                      ? "bg-primary hover:bg-primary/90 text-primary-foreground shadow-lg shadow-primary/20"
                      : "bg-foreground text-background hover:opacity-90"
                  )}
                >
                  {plan.cta}
                  <ArrowRight className="w-4 h-4" />
                </button>
              )}
            </MotionDiv>
          ))}
        </div>

        {/* Feature Highlights / FAQ Section */}
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">Frequently Asked Questions</h2>
            <p className="text-muted-foreground">Everything you need to know about Linkmate and our Pro features.</p>
          </div>

          <div className="bg-card border border-border rounded-[32px] p-8 md:p-12">
            <div className="divide-y divide-border">
              {faqs.map((faq, i) => (
                <FAQItem key={i} question={faq.question} answer={faq.answer} />
              ))}
            </div>
          </div>
        </div>

        <div className="mt-24 text-center">
          <div className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-card border border-border text-muted-foreground text-sm font-medium shadow-sm">
            <ShieldCheck className="w-4 h-4 text-primary" />
            Secure payments via Razorpay • SSL Encrypted
          </div>
        </div>
      </div>
    </div>
  )
}
