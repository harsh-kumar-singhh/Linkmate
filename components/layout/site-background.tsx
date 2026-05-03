"use client"

import React from "react"

export function SiteBackground() {
  return (
    <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden bg-site-bg">
      {/* Background depth layers - Shared across pages for visual consistency */}
      <div className="absolute top-[-20%] left-[-10%] w-[60%] h-[60%] bg-primary/5 rounded-full blur-[120px]" />
      <div className="absolute bottom-[-20%] right-[-10%] w-[60%] h-[60%] bg-blue-600/5 rounded-full blur-[120px]" />
      <div className="absolute inset-0 noise-bg opacity-[0.02]" />
    </div>
  )
}
