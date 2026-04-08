"use client";

import React, { createContext, useContext, useState, useEffect, useCallback, useMemo, useRef } from "react";
import { useUser } from "@/context/UserContext";

type ActionType = "generate_post" | "schedule_post" | "view_dashboard" | "click_premium";

interface TrialTriggerContextType {
  actionsCount: number;
  showTrialModal: boolean;
  showLockedModal: boolean;
  lockedFeatureName: string;
  trackAction: (action: ActionType) => void;
  setShowTrialModal: (show: boolean) => void;
  setShowLockedModal: (show: boolean) => void;
  triggerLockedModal: (featureName: string) => void;
}

const TrialTriggerContext = createContext<TrialTriggerContextType | undefined>(undefined);

export function TrialTriggerProvider({ children }: { children: React.ReactNode }) {
  const { user, isPro } = useUser();
  const [actionsCount, setActionsCount] = useState(0);
  const [showTrialModal, setShowTrialModal] = useState(false);
  const [showLockedModal, setShowLockedModal] = useState(false);
  const [lockedFeatureName, setLockedFeatureName] = useState("");
  const [hasShownInSession, setHasShownInSession] = useState(false);
  const [actionsSinceDismissal, setActionsSinceDismissal] = useState(0);
  const [lastActionCountAtClose, setLastActionCountAtClose] = useState(-1);
  
  // Use refs for stable access inside trackAction callback
  const isProRef = useRef(isPro);
  const hasShownInSessionRef = useRef(hasShownInSession);

  useEffect(() => {
    isProRef.current = isPro;
  }, [isPro]);

  useEffect(() => {
    hasShownInSessionRef.current = hasShownInSession;
  }, [hasShownInSession]);

  // Load state from session storage
  useEffect(() => {
    const sessionData = sessionStorage.getItem("linkmate_trial_session");
    if (sessionData) {
      const parsed = JSON.parse(sessionData);
      setActionsCount(parsed.actionsCount || 0);
      setHasShownInSession(parsed.hasShownInSession || false);
      setActionsSinceDismissal(parsed.actionsSinceDismissal || 0);
    }
  }, []);

  // Save state to session storage
  useEffect(() => {
    sessionStorage.setItem(
      "linkmate_trial_session",
      JSON.stringify({ actionsCount, hasShownInSession, actionsSinceDismissal })
    );
  }, [actionsCount, hasShownInSession, actionsSinceDismissal]);

  const trackAction = useCallback((action: ActionType) => {
    if (isProRef.current) return;

    setActionsCount((prev) => {
      const newCount = prev + 1;
      
      // If modal was already shown, track actions for cooldown
      if (hasShownInSessionRef.current) {
        setActionsSinceDismissal(s => s + 1);
      }

      // Rule 1: First Value Trigger (First post generated)
      if (!hasShownInSessionRef.current && action === "generate_post") {
        setShowTrialModal(true);
        setHasShownInSession(true);
        setActionsSinceDismissal(0);
      }
      // Rule 3: Re-trigger on Stronger Intent (schedule_post)
      // Rule 2: Cooldown check (Wait for 3 meaningful actions)
      else if (hasShownInSessionRef.current && action === "schedule_post" && actionsSinceDismissal >= 3) {
        setShowTrialModal(true);
        setActionsSinceDismissal(0);
      }
      // Condition 3 (Legacy/Fallback): First threshold
      else if (!hasShownInSessionRef.current && newCount >= 2) {
        setShowTrialModal(true);
        setHasShownInSession(true);
        setActionsSinceDismissal(0);
      }

      return newCount;
    });
  }, [actionsSinceDismissal]); // Added actionsSinceDismissal to deps to ensure Rule 2 check is fresh

  const triggerLockedModal = useCallback((featureName: string) => {
    setLockedFeatureName(featureName);
    setShowLockedModal(true);
  }, []);

  const handleCloseTrial = useCallback(() => {
    setShowTrialModal(false);
    setLastActionCountAtClose(actionsCount);
  }, [actionsCount]);

  const contextValue = useMemo(() => ({
    actionsCount,
    showTrialModal,
    showLockedModal,
    lockedFeatureName,
    trackAction,
    setShowTrialModal: (val: boolean) => {
      setShowTrialModal(val);
      if (!val) {
        setLastActionCountAtClose(actionsCount);
        // We reset the cooldown counter when the modal is closed manually
        // so Rule 2 starts counting from this point
        if (hasShownInSession) {
          setActionsSinceDismissal(0);
        }
      }
    },
    setShowLockedModal,
    triggerLockedModal,
  }), [
    actionsCount,
    showTrialModal,
    showLockedModal,
    lockedFeatureName,
    trackAction,
    triggerLockedModal
  ]);

  return (
    <TrialTriggerContext.Provider value={contextValue}>
      {children}
    </TrialTriggerContext.Provider>
  );
}

export function useTrialTrigger() {
  const context = useContext(TrialTriggerContext);
  if (context === undefined) {
    throw new Error("useTrialTrigger must be used within a TrialTriggerProvider");
  }
  return context;
}
