'use client'

import { SplineScene } from "@/components/ui/splite";
import { Card } from "@/components/ui/card"
import { Spotlight } from "@/components/ui/spotlight"
import { Sparkles } from "lucide-react"
 
export function SplineSceneBasic() {
  return (
    <Card className="w-full h-[600px] bg-black/[0.96] relative overflow-hidden border-white/10 rounded-3xl shadow-2xl">
      <Spotlight
        className="-top-40 left-0 md:left-60 md:-top-20"
        fill="white"
      />
      
      <div className="flex h-full flex-col md:flex-row">
        {/* Left content */}
        <div className="flex-1 p-8 md:p-16 relative z-10 flex flex-col justify-center">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/5 border border-white/10 text-white/80 text-xs font-semibold tracking-wider uppercase mb-6 w-fit">
            <Sparkles className="w-3.5 h-3.5" />
            Interactive Engine
          </div>
          <h2 className="text-4xl md:text-6xl font-bold bg-clip-text text-transparent bg-gradient-to-b from-neutral-50 to-neutral-500 leading-tight">
            Visualize your <br/> growth trajectory.
          </h2>
          <p className="mt-6 text-neutral-300 max-w-lg text-lg leading-relaxed">
            Create immersive experiences that capture attention. Watch your personal monopoly grow in real-time with stunning 3D visualizations.
          </p>
        </div>

        {/* Right content */}
        <div className="flex-1 relative min-h-[300px]">
          <SplineScene 
            scene="https://prod.spline.design/kZDDjO5HuC9GJUM2/scene.splinecode"
            className="w-full h-full scale-[1.2] translate-y-10"
          />
        </div>
      </div>
    </Card>
  )
}
