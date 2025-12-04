import { Injectable } from '@angular/core';
import { StepFeedback, AgentStep } from '../models/agent-resolution.model';
import { delay, of } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class AgentTeachService {
  private feedbackStore = new Map<string, StepFeedback>();

  /**
   * Save feedback for a specific step in a resolution
   */
  saveStepFeedback(
    resolutionId: string,
    stepId: string,
    feedback: StepFeedback
  ): Promise<void> {
    const key = `${resolutionId}:${stepId}`;
    this.feedbackStore.set(key, feedback);
    
    // Simulate async API call
    return of(undefined).pipe(delay(500)).toPromise() as Promise<void>;
  }

  /**
   * Get feedback for a specific step
   */
  getStepFeedback(resolutionId: string, stepId: string): StepFeedback | undefined {
    const key = `${resolutionId}:${stepId}`;
    return this.feedbackStore.get(key);
  }

  /**
   * Get all feedback for a resolution
   */
  getAllFeedbackForResolution(resolutionId: string): Map<string, StepFeedback> {
    const result = new Map<string, StepFeedback>();
    this.feedbackStore.forEach((feedback, key) => {
      if (key.startsWith(`${resolutionId}:`)) {
        const stepId = key.split(':')[1];
        result.set(stepId, feedback);
      }
    });
    return result;
  }
}

