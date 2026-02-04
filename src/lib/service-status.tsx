"use client";

import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from "react";

export interface ServiceStatus {
  database: "healthy" | "degraded" | "unavailable" | "unknown";
  notebookLm: "healthy" | "degraded" | "unavailable" | "unknown";
  tts: "healthy" | "unavailable" | "unknown";
  sandbox: "healthy" | "degraded" | "unavailable" | "unknown";
}

export interface DegradedFeature {
  feature: keyof ServiceStatus;
  message: string;
  severity: "warning" | "error";
}

interface ServiceStatusContextType {
  status: ServiceStatus;
  degradedFeatures: DegradedFeature[];
  checkStatus: () => Promise<void>;
  isLoading: boolean;
  dismissDegradedFeature: (feature: keyof ServiceStatus) => void;
  dismissedFeatures: Set<keyof ServiceStatus>;
}

const defaultStatus: ServiceStatus = {
  database: "unknown",
  notebookLm: "unknown",
  tts: "unknown",
  sandbox: "unknown",
};

const ServiceStatusContext = createContext<ServiceStatusContextType | null>(null);

export function ServiceStatusProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<ServiceStatus>(defaultStatus);
  const [isLoading, setIsLoading] = useState(false);
  const [dismissedFeatures, setDismissedFeatures] = useState<Set<keyof ServiceStatus>>(new Set());

  const checkStatus = useCallback(async () => {
    setIsLoading(true);
    try {
      // Check health endpoint
      const response = await fetch("/api/health");
      const data = await response.json();

      const newStatus: ServiceStatus = {
        database: data.success && data.data?.database ? "healthy" : "unavailable",
        notebookLm: "unavailable", // NotebookLM not yet implemented
        tts:
          typeof window !== "undefined" && "speechSynthesis" in window ? "healthy" : "unavailable",
        sandbox: "unavailable", // Sandbox not yet implemented
      };

      setStatus(newStatus);
    } catch {
      setStatus({
        database: "unavailable",
        notebookLm: "unavailable",
        tts:
          typeof window !== "undefined" && "speechSynthesis" in window ? "healthy" : "unavailable",
        sandbox: "unavailable",
      });
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Check status on mount and periodically
  useEffect(() => {
    checkStatus();

    // Check every 5 minutes
    const interval = setInterval(checkStatus, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, [checkStatus]);

  // Check TTS availability when window is available
  useEffect(() => {
    if (typeof window !== "undefined") {
      setStatus((prev) => ({
        ...prev,
        tts: "speechSynthesis" in window ? "healthy" : "unavailable",
      }));
    }
  }, []);

  const degradedFeatures: DegradedFeature[] = [];

  if (status.database === "unavailable") {
    degradedFeatures.push({
      feature: "database",
      message: "Database connection unavailable. Some features may not work.",
      severity: "error",
    });
  } else if (status.database === "degraded") {
    degradedFeatures.push({
      feature: "database",
      message: "Database is experiencing issues. Performance may be affected.",
      severity: "warning",
    });
  }

  if (status.notebookLm === "unavailable") {
    degradedFeatures.push({
      feature: "notebookLm",
      message: "AI-powered Q&A and quiz generation are currently unavailable.",
      severity: "warning",
    });
  }

  if (status.tts === "unavailable") {
    degradedFeatures.push({
      feature: "tts",
      message: "Text-to-speech is not available in your browser.",
      severity: "warning",
    });
  }

  if (status.sandbox === "unavailable") {
    degradedFeatures.push({
      feature: "sandbox",
      message: "Code sandbox environment is not available.",
      severity: "warning",
    });
  }

  const dismissDegradedFeature = useCallback((feature: keyof ServiceStatus) => {
    setDismissedFeatures((prev) => new Set([...prev, feature]));
  }, []);

  return (
    <ServiceStatusContext.Provider
      value={{
        status,
        degradedFeatures: degradedFeatures.filter((f) => !dismissedFeatures.has(f.feature)),
        checkStatus,
        isLoading,
        dismissDegradedFeature,
        dismissedFeatures,
      }}
    >
      {children}
    </ServiceStatusContext.Provider>
  );
}

export function useServiceStatus() {
  const context = useContext(ServiceStatusContext);
  if (!context) {
    throw new Error("useServiceStatus must be used within ServiceStatusProvider");
  }
  return context;
}
