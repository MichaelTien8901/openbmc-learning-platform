import { NextResponse } from "next/server";
import { getNotebookLMService } from "@/lib/notebooklm";
import type { ApiResponse } from "@/types";

interface AIStatusResponse {
  notebookLm: {
    connected: boolean;
    mode: string;
    lastChecked: string;
    error?: string;
    notebooks: Array<{
      id: string;
      name: string;
      isActive: boolean;
    }>;
  };
  tts: {
    available: boolean;
    method: "browser";
  };
  rateLimit: {
    enabled: boolean;
    maxRequests: number;
    windowMs: number;
  };
}

/**
 * GET /api/ai/status - Check AI service connection status
 */
export async function GET(): Promise<NextResponse<ApiResponse<AIStatusResponse>>> {
  try {
    const service = getNotebookLMService();
    const status = service.getStatus();

    // Note: We can't check browser TTS support server-side
    // Client must check window.speechSynthesis availability

    const response: AIStatusResponse = {
      notebookLm: {
        connected: status.connected,
        mode: status.connected ? "mcp" : "fallback",
        lastChecked: status.lastChecked.toISOString(),
        error: status.error,
        notebooks: [], // Would be populated from service
      },
      tts: {
        available: true, // Assume available, client verifies
        method: "browser",
      },
      rateLimit: {
        enabled: true,
        maxRequests: 20,
        windowMs: 60 * 60 * 1000, // 1 hour
      },
    };

    return NextResponse.json({
      success: true,
      data: response,
    });
  } catch (error) {
    console.error("AI status check error:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to check AI service status",
      },
      { status: 500 }
    );
  }
}
