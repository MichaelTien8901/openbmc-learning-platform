/**
 * NotebookLM integration types
 */

// Notebook configuration
export interface NotebookConfig {
  id: string;
  name: string;
  url: string;
  description: string;
  topics: string[];
  isActive: boolean;
}

// Query request to NotebookLM
export interface NotebookLMQuery {
  question: string;
  notebookId?: string;
  context?: string;
  maxTokens?: number;
}

// Response from NotebookLM
export interface NotebookLMResponse {
  answer: string;
  citations: Citation[];
  confidence: number;
  timestamp: Date;
  cached: boolean;
}

// Citation from source documents
export interface Citation {
  text: string;
  source: string;
  pageOrSection?: string;
}

// Content generation request
export interface ContentGenerationRequest {
  topic: string;
  lessonId: string;
  notebookId: string;
  style?: "detailed" | "summary" | "tutorial";
}

// Generated teaching content structure
export interface GeneratedContent {
  objectives: string[];
  introduction: string;
  concepts: ConceptSection[];
  examples: CodeExample[];
  useCases: string[];
  exercises: Exercise[];
  summary: string;
  generatedAt: Date;
}

export interface ConceptSection {
  title: string;
  explanation: string;
  keyPoints: string[];
}

export interface CodeExample {
  title: string;
  description: string;
  code: string;
  language: string;
  explanation?: string;
}

export interface Exercise {
  question: string;
  type: "multiple_choice" | "code" | "open_ended";
  options?: string[];
  correctAnswer?: string | number;
  hint?: string;
}

// Quiz generation types
export interface QuizGenerationRequest {
  lessonId: string;
  topic: string;
  notebookId: string;
  questionCount?: number;
  difficulty?: "easy" | "medium" | "hard";
}

export interface GeneratedQuiz {
  questions: QuizQuestion[];
  generatedAt: Date;
}

export interface QuizQuestion {
  question: string;
  options: QuizOption[];
  explanation: string;
  difficulty: "easy" | "medium" | "hard";
}

export interface QuizOption {
  text: string;
  isCorrect: boolean;
}

// Service status
export interface NotebookLMStatus {
  connected: boolean;
  lastChecked: Date;
  activeNotebook?: string;
  error?: string;
  rateLimitRemaining?: number;
  rateLimitReset?: Date;
}

// MCP message types
export interface MCPRequest {
  id: string;
  method: string;
  params: Record<string, unknown>;
}

export interface MCPResponse {
  id: string;
  result?: unknown;
  error?: MCPError;
}

export interface MCPError {
  code: number;
  message: string;
  data?: unknown;
}
