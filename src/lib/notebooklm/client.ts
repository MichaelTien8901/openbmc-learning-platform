/**
 * NotebookLM MCP Client
 *
 * Handles communication with NotebookLM via MCP protocol.
 * Supports multiple backends:
 * - Browser automation (development)
 * - MCP server (production)
 * - Cached/static fallback (offline)
 */

import type {
  NotebookConfig,
  NotebookLMQuery,
  NotebookLMResponse,
  NotebookLMStatus,
  ContentGenerationRequest,
  GeneratedContent,
  QuizGenerationRequest,
  GeneratedQuiz,
  MCPRequest,
  MCPResponse,
} from "./types";

// Connection modes
export type ConnectionMode = "mcp" | "browser" | "fallback";

interface NotebookLMClientConfig {
  mode: ConnectionMode;
  mcpEndpoint?: string;
  browserScriptPath?: string;
  timeout?: number;
  maxRetries?: number;
}

const DEFAULT_CONFIG: NotebookLMClientConfig = {
  mode: "fallback",
  timeout: 30000,
  maxRetries: 3,
};

class NotebookLMClient {
  private config: NotebookLMClientConfig;
  private status: NotebookLMStatus;
  private notebooks: Map<string, NotebookConfig> = new Map();
  private activeNotebookId: string | null = null;
  private requestIdCounter = 0;

  constructor(config: Partial<NotebookLMClientConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.status = {
      connected: false,
      lastChecked: new Date(),
    };
  }

  /**
   * Initialize the client and check connection
   */
  async initialize(): Promise<boolean> {
    try {
      // Determine the best connection mode
      if (this.config.mode === "mcp" && this.config.mcpEndpoint) {
        const connected = await this.connectMCP();
        if (connected) {
          this.status.connected = true;
          return true;
        }
      }

      // Fall back to browser automation if configured
      if (
        this.config.mode === "browser" ||
        (this.config.mode === "mcp" && !this.status.connected)
      ) {
        // Browser automation would be handled by external script
        this.status.connected = false;
        this.status.error = "Browser automation requires manual setup";
      }

      // Fall back to cached content
      this.config.mode = "fallback";
      this.status.connected = false;
      this.status.error = "Running in fallback mode - using cached content";
      return false;
    } catch (error) {
      this.status.connected = false;
      this.status.error = error instanceof Error ? error.message : "Unknown error";
      return false;
    } finally {
      this.status.lastChecked = new Date();
    }
  }

  /**
   * Connect to MCP server
   */
  private async connectMCP(): Promise<boolean> {
    if (!this.config.mcpEndpoint) {
      return false;
    }

    try {
      const response = await fetch(`${this.config.mcpEndpoint}/health`, {
        method: "GET",
        signal: AbortSignal.timeout(5000),
      });

      if (response.ok) {
        const data = await response.json();
        return data.status === "healthy";
      }
      return false;
    } catch {
      return false;
    }
  }

  /**
   * Get current connection status
   */
  getStatus(): NotebookLMStatus {
    return { ...this.status };
  }

  /**
   * Register a notebook for querying
   */
  registerNotebook(notebook: NotebookConfig): void {
    this.notebooks.set(notebook.id, notebook);
    if (notebook.isActive) {
      this.activeNotebookId = notebook.id;
    }
  }

  /**
   * Set the active notebook
   */
  setActiveNotebook(notebookId: string): boolean {
    if (this.notebooks.has(notebookId)) {
      this.activeNotebookId = notebookId;
      return true;
    }
    return false;
  }

  /**
   * Get registered notebooks
   */
  getNotebooks(): NotebookConfig[] {
    return Array.from(this.notebooks.values());
  }

  /**
   * Query NotebookLM with a question
   */
  async query(request: NotebookLMQuery): Promise<NotebookLMResponse> {
    const notebookId = request.notebookId || this.activeNotebookId;

    if (!notebookId) {
      throw new Error("No notebook specified or active");
    }

    const notebook = this.notebooks.get(notebookId);
    if (!notebook) {
      throw new Error(`Notebook not found: ${notebookId}`);
    }

    // If not connected, return fallback response
    if (!this.status.connected || this.config.mode === "fallback") {
      return this.getFallbackResponse(request);
    }

    // Send query via MCP
    try {
      const mcpRequest: MCPRequest = {
        id: this.generateRequestId(),
        method: "notebooklm/query",
        params: {
          question: request.question,
          notebookUrl: notebook.url,
          context: request.context,
        },
      };

      const response = await this.sendMCPRequest(mcpRequest);

      if (response.error) {
        throw new Error(response.error.message);
      }

      const result = response.result as {
        answer: string;
        citations?: Array<{ text: string; source: string }>;
      };

      return {
        answer: result.answer,
        citations: result.citations || [],
        confidence: 0.9,
        timestamp: new Date(),
        cached: false,
      };
    } catch (error) {
      // On error, try fallback
      console.error("NotebookLM query failed:", error);
      return this.getFallbackResponse(request);
    }
  }

  /**
   * Generate teaching content for a lesson
   */
  async generateContent(request: ContentGenerationRequest): Promise<GeneratedContent> {
    const notebook = this.notebooks.get(request.notebookId);
    if (!notebook) {
      throw new Error(`Notebook not found: ${request.notebookId}`);
    }

    // If not connected, return structured fallback
    if (!this.status.connected || this.config.mode === "fallback") {
      return this.getFallbackContent(request);
    }

    try {
      const mcpRequest: MCPRequest = {
        id: this.generateRequestId(),
        method: "notebooklm/generate-content",
        params: {
          topic: request.topic,
          notebookUrl: notebook.url,
          style: request.style || "detailed",
        },
      };

      const response = await this.sendMCPRequest(mcpRequest);

      if (response.error) {
        throw new Error(response.error.message);
      }

      return response.result as GeneratedContent;
    } catch (error) {
      console.error("Content generation failed:", error);
      return this.getFallbackContent(request);
    }
  }

  /**
   * Generate quiz questions for a lesson
   */
  async generateQuiz(request: QuizGenerationRequest): Promise<GeneratedQuiz> {
    const notebook = this.notebooks.get(request.notebookId);
    if (!notebook) {
      throw new Error(`Notebook not found: ${request.notebookId}`);
    }

    // If not connected, return empty quiz
    if (!this.status.connected || this.config.mode === "fallback") {
      return this.getFallbackQuiz(request);
    }

    try {
      const mcpRequest: MCPRequest = {
        id: this.generateRequestId(),
        method: "notebooklm/generate-quiz",
        params: {
          topic: request.topic,
          notebookUrl: notebook.url,
          questionCount: request.questionCount || 5,
          difficulty: request.difficulty || "medium",
        },
      };

      const response = await this.sendMCPRequest(mcpRequest);

      if (response.error) {
        throw new Error(response.error.message);
      }

      return response.result as GeneratedQuiz;
    } catch (error) {
      console.error("Quiz generation failed:", error);
      return this.getFallbackQuiz(request);
    }
  }

  /**
   * Send MCP request to server
   */
  private async sendMCPRequest(request: MCPRequest): Promise<MCPResponse> {
    if (!this.config.mcpEndpoint) {
      throw new Error("MCP endpoint not configured");
    }

    const response = await fetch(`${this.config.mcpEndpoint}/rpc`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(request),
      signal: AbortSignal.timeout(this.config.timeout || 30000),
    });

    if (!response.ok) {
      throw new Error(`MCP request failed: ${response.status}`);
    }

    return response.json();
  }

  /**
   * Generate unique request ID
   */
  private generateRequestId(): string {
    return `req_${Date.now()}_${++this.requestIdCounter}`;
  }

  /**
   * Get fallback response when NotebookLM is unavailable
   */
  private getFallbackResponse(request: NotebookLMQuery): NotebookLMResponse {
    return {
      answer:
        "I apologize, but the AI-powered Q&A feature is currently unavailable. " +
        "Please refer to the lesson content or try again later. " +
        `Your question was: "${request.question}"`,
      citations: [],
      confidence: 0,
      timestamp: new Date(),
      cached: true,
    };
  }

  /**
   * Get fallback content when generation is unavailable
   */
  private getFallbackContent(request: ContentGenerationRequest): GeneratedContent {
    return {
      objectives: [`Learn about ${request.topic}`],
      introduction: `This lesson covers ${request.topic}. AI-generated content is currently unavailable.`,
      concepts: [
        {
          title: request.topic,
          explanation: "Please refer to the lesson content for detailed information.",
          keyPoints: ["Content generation temporarily unavailable"],
        },
      ],
      examples: [],
      useCases: [],
      exercises: [],
      summary: `Review the lesson materials for information about ${request.topic}.`,
      generatedAt: new Date(),
    };
  }

  /**
   * Get fallback quiz when generation is unavailable
   */
  private getFallbackQuiz(_request: QuizGenerationRequest): GeneratedQuiz {
    return {
      questions: [],
      generatedAt: new Date(),
    };
  }

  /**
   * Check if client is connected
   */
  isConnected(): boolean {
    return this.status.connected;
  }

  /**
   * Get current connection mode
   */
  getConnectionMode(): ConnectionMode {
    return this.config.mode;
  }
}

// Singleton instance
let clientInstance: NotebookLMClient | null = null;

/**
 * Get or create the NotebookLM client instance
 */
export function getNotebookLMClient(config?: Partial<NotebookLMClientConfig>): NotebookLMClient {
  if (!clientInstance) {
    clientInstance = new NotebookLMClient(config);
  }
  return clientInstance;
}

/**
 * Reset the client instance (for testing)
 */
export function resetNotebookLMClient(): void {
  clientInstance = null;
}

export { NotebookLMClient };
