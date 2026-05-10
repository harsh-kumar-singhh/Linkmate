import { useState, useEffect, useRef } from "react";
import { X, Trash2, CheckCircle2, Sparkles, Loader2, Lightbulb, Send, Check } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { formatDistanceToNow } from "date-fns";

export interface Idea {
    id: string;
    content: string;
    used: boolean;
    createdAt: string;
}

interface IdeaVaultProps {
    isOpen: boolean;
    onClose: () => void;
    onSelectIdea: (content: string) => void;
}

export function IdeaVault({ isOpen, onClose, onSelectIdea }: IdeaVaultProps) {
    const [ideas, setIdeas] = useState<Idea[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [newIdea, setNewIdea] = useState("");
    const [isSaving, setIsSaving] = useState(false);
    const [successFeedback, setSuccessFeedback] = useState(false);
    const [deletingId, setDeletingId] = useState<string | null>(null);
    const inputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        if (isOpen) {
            fetchIdeas();
            setTimeout(() => inputRef.current?.focus(), 100);
        }
    }, [isOpen]);

    const fetchIdeas = async () => {
        setIsLoading(true);
        try {
            const res = await fetch("/api/ideas");
            if (res.ok) {
                const result = await res.json();
                const ideasList = result.data || [];
                setIdeas(Array.isArray(ideasList) ? ideasList : []);
            }
        } catch (error) {
            console.error("Failed to fetch ideas", error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleSaveIdea = async (e?: React.FormEvent) => {
        e?.preventDefault();
        if (!newIdea.trim() || isSaving) return;

        setIsSaving(true);
        try {
            const res = await fetch("/api/ideas", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ content: newIdea.trim() })
            });

            if (res.ok) {
                const result = await res.json();
                if (result.success && result.data) {
                    setIdeas([result.data, ...ideas]);
                    setNewIdea("");
                    setSuccessFeedback(true);
                    setTimeout(() => setSuccessFeedback(false), 2000);
                }
            }
        } catch (error) {
            console.error("Failed to save idea", error);
        } finally {
            setIsSaving(false);
        }
    };

    const handleDelete = async (e: React.MouseEvent, id: string) => {
        e.stopPropagation();
        if (deletingId) return;

        const previousIdeas = [...ideas];
        // Optimistic UI: remove immediately
        setIdeas(ideas.filter(idea => idea.id !== id));
        setDeletingId(id);

        try {
            const res = await fetch(`/api/ideas/${id}`, { method: "DELETE" });
            if (!res.ok) throw new Error("Failed to delete");
        } catch (error) {
            console.error("Failed to delete idea", error);
            // Restore on error
            setIdeas(previousIdeas);
            alert("Failed to delete idea. Please try again.");
        } finally {
            setDeletingId(null);
        }
    };

    const handleSelect = async (idea: Idea) => {
        onSelectIdea(idea.content);
        try {
            // Mark as used in the background
            await fetch(`/api/ideas/${idea.id}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ used: true })
            });
        } catch (error) {
            console.error("Failed to mark as used", error);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
            <div 
                className="w-full sm:w-[500px] sm:max-w-[90vw] h-[80vh] sm:h-[600px] flex flex-col bg-card border border-border shadow-2xl sm:rounded-2xl rounded-t-2xl animate-in slide-in-from-bottom-8 sm:slide-in-from-bottom-4 duration-300 relative overflow-hidden"
            >
                {/* Header */}
                <div className="flex items-center justify-between p-5 border-b border-border/50">
                    <div className="flex items-center gap-2 text-primary">
                        <Lightbulb className="w-5 h-5" />
                        <h2 className="font-bold text-lg text-foreground">Idea Vault</h2>
                    </div>
                    <Button variant="ghost" size="icon" onClick={onClose} className="rounded-full hover:bg-secondary">
                        <X className="w-5 h-5 text-muted-foreground" />
                    </Button>
                </div>

                {/* Input Area */}
                <div className="p-4 border-b border-border/50 bg-secondary/20">
                    <form onSubmit={handleSaveIdea} className="relative">
                        <Input
                            ref={inputRef}
                            value={newIdea}
                            onChange={(e) => setNewIdea(e.target.value)}
                            placeholder="Drop a raw thought... we'll shape it ✨"
                            className={cn(
                                "w-full pr-12 bg-background border-border/80 focus:border-primary/50 focus:ring-primary/20 h-11 rounded-xl shadow-inner transition-all",
                                successFeedback && "border-emerald-500/50 bg-emerald-500/5 shadow-[0_0_15px_rgba(16,185,129,0.1)] text-emerald-600"
                            )}
                            disabled={isSaving}
                        />
                        <Button 
                            type="submit" 
                            size="icon" 
                            disabled={!newIdea.trim() || isSaving}
                            className={cn(
                                "absolute right-1 top-1 bottom-1 h-9 w-9 rounded-lg transition-all disabled:opacity-50",
                                successFeedback 
                                    ? "bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500/20" 
                                    : "bg-primary/10 text-primary hover:bg-primary hover:text-white"
                            )}
                        >
                            {isSaving ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                            ) : successFeedback ? (
                                <Check className="w-4 h-4" />
                            ) : (
                                <Send className="w-4 h-4" />
                            )}
                        </Button>
                    </form>
                </div>

                {/* List Area */}
                 <div className="flex-1 overflow-y-auto p-4 space-y-3">
                    {isLoading ? (
                        <div className="flex flex-col items-center justify-center h-full text-muted-foreground gap-3">
                            <Loader2 className="w-6 h-6 animate-spin text-primary/50" />
                            <p className="text-sm font-medium">Loading your ideas...</p>
                        </div>
                    ) : ideas.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-full text-muted-foreground gap-2 pt-10">
                            <Lightbulb className="w-10 h-10 text-muted-foreground/30 mb-2" />
                            <p className="font-medium text-foreground/80">No ideas yet.</p>
                            <p className="text-sm">Capture your first thought 👀</p>
                        </div>
                    ) : (
                        <AnimatePresence mode="popLayout" initial={false}>
                            {ideas.map((idea) => (
                                <motion.div 
                                    key={idea.id}
                                    layout
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, scale: 0.95, transition: { duration: 0.2 } }}
                                    onClick={() => handleSelect(idea)}
                                    className={cn(
                                        "p-4 rounded-xl border border-border/60 bg-background/50 hover:bg-secondary/40 cursor-pointer group transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md hover:border-primary/30 flex items-start justify-between gap-3",
                                        idea.used && "opacity-60 grayscale hover:grayscale-0",
                                        deletingId === idea.id && "opacity-50 pointer-events-none"
                                    )}
                                >
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm leading-relaxed text-foreground whitespace-pre-wrap line-clamp-3">
                                            {idea.content}
                                        </p>
                                        <div className="flex items-center gap-3 mt-2">
                                            <span className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider">
                                                {formatDistanceToNow(new Date(idea.createdAt), { addSuffix: true })}
                                            </span>
                                            {idea.used && (
                                                <span className="flex items-center gap-1 text-[10px] text-emerald-500 font-medium">
                                                    <CheckCircle2 className="w-3 h-3" /> Used
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                    <div className="flex flex-col items-end gap-2">
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            onClick={(e) => handleDelete(e, idea.id)}
                                            className={cn(
                                                "w-8 h-8 rounded-lg transition-opacity text-muted-foreground hover:text-destructive hover:bg-destructive/10",
                                                deletingId !== idea.id && "opacity-0 group-hover:opacity-100"
                                            )}
                                        >
                                            {deletingId === idea.id ? (
                                                <Loader2 className="w-4 h-4 animate-spin" />
                                            ) : (
                                                <Trash2 className="w-4 h-4" />
                                            )}
                                        </Button>
                                    </div>
                                </motion.div>
                            ))}
                        </AnimatePresence>
                    )}
                </div>
            </div>
        </div>
    );
}
