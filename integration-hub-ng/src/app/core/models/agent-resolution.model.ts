export interface AgentResolution {
  id: string;
  title: string;
  description: string;
  resolvedAt: string;
  method: 'ai_agent' | 'manual';
  totalSteps: number;
  totalDurationMs: number;
  totalActions: number;
  steps: AgentStep[];
  countNeedsReview?: number;
}

export interface AgentStep {
  id: string;
  index: number;              // 1..N
  label: string;              // "Starting: Reviewing credential usage"
  status: 'started' | 'completed' | 'failed';
  type?: 'info' | 'success' | 'warning' | 'error';
  message: string;            // longer description in the log
  timestamp: string;
  durationMs?: number;
  // Teach mode fields:
  inputText?: string;
  outputText?: string;
  confidence?: number;        // 0–100
  needsReview?: boolean;      // derived from low confidence or prior feedback
  feedback?: StepFeedback;
}

export interface StepFeedback {
  verdict: 'correct' | 'partial' | 'incorrect';
  adjustedConfidence: number;
  correctionNote: string;
  updatedOutput?: string;
  updatedReasoningHint?: string;
  submittedAt: string;
}

