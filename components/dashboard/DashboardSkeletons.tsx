import { Card, CardContent } from "@/components/ui/card"
import { cn } from "@/lib/utils"

export function StatSkeleton() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      {[1, 2, 3].map((i) => (
        <Card key={i} className="rounded-2xl border-border/50 shadow-sm overflow-hidden">
          <CardContent className="p-6 flex items-center justify-between">
            <div className="space-y-2 flex-1">
              <div className="h-4 w-24 bg-zinc-200 dark:bg-zinc-800 animate-pulse rounded" />
              <div className="h-8 w-16 bg-zinc-300 dark:bg-zinc-700 animate-pulse rounded" />
            </div>
            <div className="h-10 w-10 rounded-full bg-zinc-200 dark:bg-zinc-800 animate-pulse" />
          </CardContent>
        </Card>
      ))}
    </div>
  )
}

export function PostSkeleton() {
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 pl-1">
        <div className="h-4 w-32 bg-zinc-200 dark:bg-zinc-800 animate-pulse rounded" />
      </div>
      <div className="space-y-3">
        {[1, 2].map((i) => (
          <Card key={i} className="rounded-2xl border-border/50 overflow-hidden">
            <CardContent className="p-5">
              <div className="flex items-start justify-between gap-4">
                <div className="space-y-3 flex-1">
                  <div className="space-y-2">
                    <div className="h-4 w-full bg-zinc-200 dark:bg-zinc-800 animate-pulse rounded" />
                    <div className="h-4 w-2/3 bg-zinc-200 dark:bg-zinc-800 animate-pulse rounded" />
                  </div>
                  <div className="flex gap-3">
                    <div className="h-6 w-24 bg-zinc-200 dark:bg-zinc-800 animate-pulse rounded-lg" />
                  </div>
                </div>
                <div className="h-8 w-8 rounded-lg bg-zinc-200 dark:bg-zinc-800 animate-pulse" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}

export function WelcomeSkeleton() {
  return (
    <div className="space-y-2">
      <div className="h-9 w-64 bg-zinc-200 dark:bg-zinc-800 animate-pulse rounded-lg" />
      <div className="h-4 w-80 bg-zinc-100 dark:bg-zinc-900 animate-pulse rounded" />
    </div>
  )
}

export function ActivityMetricSkeleton() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {[1, 2, 3, 4].map((i) => (
        <Card key={i} className="bg-card border border-border/60 rounded-2xl p-5 shadow-sm space-y-4 overflow-hidden">
          <div className="flex items-center justify-between">
            <div className="h-3 w-20 bg-zinc-200 dark:bg-zinc-800 animate-pulse rounded" />
            <div className="h-4 w-4 bg-zinc-200 dark:bg-zinc-800 animate-pulse rounded-full" />
          </div>
          <div className="space-y-2">
            <div className="h-8 w-12 bg-zinc-300 dark:bg-zinc-700 animate-pulse rounded" />
            <div className="h-3 w-32 bg-zinc-100 dark:bg-zinc-900 animate-pulse rounded" />
          </div>
        </Card>
      ))}
    </div>
  )
}

export function ActivityChartSkeleton() {
  return (
    <Card className="bg-card border border-border/60 rounded-3xl p-6 md:p-8 shadow-sm space-y-8 overflow-hidden">
      <div className="flex items-center justify-between">
        <div className="h-7 w-64 bg-zinc-200 dark:bg-zinc-800 animate-pulse rounded-lg" />
        <div className="h-6 w-24 bg-zinc-100 dark:bg-zinc-900 animate-pulse rounded-full" />
      </div>

      <div className="h-64 w-full flex items-end justify-between gap-1 md:gap-2 px-1 mt-4">
        {[...Array(15)].map((_, i) => (
          <div
            key={i}
            className="flex-1 bg-zinc-100 dark:bg-zinc-800/50 animate-pulse rounded-t-sm"
            style={{ height: `${Math.random() * 40 + 10}%` }}
          />
        ))}
      </div>
    </Card>
  )
}
