import { Loader2 } from "lucide-react";

export default function Loading() {
  return (
    <div className="flex-1 flex flex-col items-center justify-center min-h-[60vh] space-y-4">
      <div className="relative">
        <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center animate-pulse">
            <Loader2 className="w-6 h-6 text-primary animate-spin" />
        </div>
        <div className="absolute -inset-4 bg-primary/5 rounded-full blur-2xl animate-pulse -z-10" />
      </div>
      <div className="space-y-2 text-center">
        <p className="text-sm font-bold tracking-widest uppercase text-muted-foreground animate-pulse">
          Loading
        </p>
        <div className="flex items-center gap-1 justify-center">
            <div className="w-1.5 h-1.5 rounded-full bg-primary/40 animate-bounce" style={{ animationDelay: '0ms' }} />
            <div className="w-1.5 h-1.5 rounded-full bg-primary/40 animate-bounce" style={{ animationDelay: '150ms' }} />
            <div className="w-1.5 h-1.5 rounded-full bg-primary/40 animate-bounce" style={{ animationDelay: '300ms' }} />
        </div>
      </div>
    </div>
  );
}
