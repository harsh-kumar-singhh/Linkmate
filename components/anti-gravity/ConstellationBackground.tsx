"use client"

export function ConstellationBackground() {
  return (
    <div className="fixed inset-0 pointer-events-none overflow-hidden z-[1]">
      {/* 
        Original floating shapes (sphere, rounded_cube, ring) removed 
        to ensure zero 'blobs' or unnatural circular gradients 
        cluttering the immersive 3D background.
      */}
    </div>
  )
}
