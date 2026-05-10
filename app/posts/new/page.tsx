import { Suspense } from "react"
import NewPostClient from "./NewPostClient"

export default function NewPostPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center min-h-screen">
          <div className="w-12 h-12 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      }
    >
      <NewPostClient />
    </Suspense>
  )
}