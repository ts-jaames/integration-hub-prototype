import { Component, Input, Output, EventEmitter, signal, OnChanges, SimpleChanges, OnInit, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ModalModule, ButtonModule, InputModule } from 'carbon-components-angular';
import { AgentStep, StepFeedback } from '../../../core/models/agent-resolution.model';

@Component({
  selector: 'app-step-correction-modal',
  standalone: true,
  imports: [CommonModule, FormsModule, ModalModule, ButtonModule, InputModule],
  template: `
    <ibm-modal
      [open]="open()"
      [size]="'lg'"
      [hasScrollingContent]="true"
      (overlaySelected)="onCancel()"
      class="correction-modal">
      <ibm-modal-header (closeSelect)="onCancel()" class="modal-header-dark">
        <p class="modal-title">Correct Step {{ step()?.index }}</p>
      </ibm-modal-header>
      <div ibmModalContent class="modal-content-dark">
        <div *ngIf="step()" class="correction-form">
          <!-- Original Output -->
          <div class="form-section">
            <label class="section-label">Original Output</label>
            <textarea
              [value]="originalOutput()"
              readonly
              rows="4"
              class="readonly-textarea"
              disabled>
            </textarea>
          </div>

          <!-- Corrected Output -->
          <div class="form-section">
            <label class="section-label">Corrected Output</label>
            <textarea
              [(ngModel)]="correctedOutput"
              rows="4"
              placeholder="Edit the output text as needed..."
              class="editable-textarea">
            </textarea>
          </div>

          <!-- Correction Note -->
          <div class="form-section">
            <label class="section-label">Correction Note</label>
            <textarea
              [(ngModel)]="correctionNote"
              rows="3"
              placeholder="Why was this incorrect or incomplete?"
              class="editable-textarea">
            </textarea>
          </div>

          <!-- Verdict -->
          <div class="form-section">
            <label class="section-label">Verdict</label>
            <div class="radio-group">
              <label class="radio-option">
                <input
                  type="radio"
                  name="verdict"
                  value="correct"
                  [(ngModel)]="verdict"
                  [checked]="verdict === 'correct'"
                  class="radio-input">
                <span class="radio-label">This step was correct</span>
              </label>
              <label class="radio-option">
                <input
                  type="radio"
                  name="verdict"
                  value="partial"
                  [(ngModel)]="verdict"
                  [checked]="verdict === 'partial'"
                  class="radio-input">
                <span class="radio-label">Partially correct</span>
              </label>
              <label class="radio-option">
                <input
                  type="radio"
                  name="verdict"
                  value="incorrect"
                  [(ngModel)]="verdict"
                  [checked]="verdict === 'incorrect'"
                  class="radio-input">
                <span class="radio-label">Incorrect</span>
              </label>
            </div>
          </div>

          <!-- Confidence Slider -->
          <div class="form-section">
            <label class="section-label">
              Adjusted Confidence Score
              <span class="original-confidence" *ngIf="originalConfidence() !== null">
                (Original: {{ originalConfidence() }}%)
              </span>
            </label>
            <div class="confidence-control">
              <input
                type="range"
                min="0"
                max="100"
                [(ngModel)]="adjustedConfidence"
                class="confidence-slider"
                (input)="onConfidenceChange($event)">
              <div class="confidence-display">
                <span class="confidence-value">{{ adjustedConfidence }}%</span>
              </div>
            </div>
          </div>

          <!-- Optional Reasoning Hint -->
          <div class="form-section">
            <label class="section-label">Updated Reasoning Hint (Optional)</label>
            <textarea
              [(ngModel)]="updatedReasoningHint"
              rows="2"
              placeholder="Provide guidance for future similar steps..."
              class="editable-textarea">
            </textarea>
          </div>

          <p class="help-text">
            This feedback will be used to improve future AI behavior.
          </p>
        </div>
      </div>
      <ibm-modal-footer class="modal-footer-dark">
        <button 
          class="btn-secondary" 
          (click)="onCancel()">
          Cancel
        </button>
        <button 
          class="btn-primary" 
          (click)="onSave()"
          [disabled]="!canSave()">
          Save Correction
        </button>
      </ibm-modal-footer>
    </ibm-modal>
  `,
  styles: [`
    /* Modal Overlay */
    :host ::ng-deep .bx--modal-overlay {
      background: rgba(0, 0, 0, 0.6) !important;
      backdrop-filter: blur(4px);
    }

    /* Modal Container - Force dark background */
    :host ::ng-deep .bx--modal-container {
      background: #111417 !important;
      border-radius: 12px;
      box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.4);
      max-width: 700px !important;
      width: 90vw;
    }

    :host ::ng-deep .bx--modal {
      max-width: 700px !important;
      background: #111417 !important;
    }

    :host ::ng-deep .bx--modal-scroll-content {
      background: #111417 !important;
      mask-image: none !important;
      -webkit-mask-image: none !important;
    }

    :host ::ng-deep .cds--modal-scroll-content {
      background: #111417 !important;
      mask-image: none !important;
      -webkit-mask-image: none !important;
    }

    .modal-header-dark {
      background: #111417 !important;
      border-bottom: 1px solid rgba(255, 255, 255, 0.1);
      padding: 1.5rem 2rem;
    }

    :host ::ng-deep .bx--modal-header {
      background: #111417 !important;
    }

    :host ::ng-deep .bx--modal-header__heading {
      color: #f5f5f5 !important;
    }

    .modal-title {
      font-size: 1.25rem;
      font-weight: 600;
      color: #f5f5f5 !important;
      margin: 0;
    }

    .modal-content-dark {
      background: #111417 !important;
      padding: 2rem;
      max-height: 70vh;
      overflow-y: auto;
    }

    :host ::ng-deep [ibmModalContent] {
      background: #111417 !important;
    }

    .modal-content-dark::-webkit-scrollbar {
      width: 8px;
    }

    .modal-content-dark::-webkit-scrollbar-track {
      background: rgba(255, 255, 255, 0.05);
      border-radius: 4px;
    }

    .modal-content-dark::-webkit-scrollbar-thumb {
      background: rgba(255, 255, 255, 0.2);
      border-radius: 4px;
    }

    .modal-content-dark::-webkit-scrollbar-thumb:hover {
      background: rgba(255, 255, 255, 0.3);
    }

    .correction-form {
      display: flex;
      flex-direction: column;
      gap: 1.5rem;
    }

    .form-section {
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
    }

    .section-label {
      font-size: 0.875rem;
      font-weight: 500;
      color: #e5e5e5;
      margin-bottom: 0.25rem;
      display: flex;
      align-items: center;
      gap: 0.5rem;
    }

    .original-confidence {
      font-size: 0.75rem;
      font-weight: 400;
      color: #737373;
    }

    /* Textareas - Override Carbon styles */
    :host ::ng-deep .readonly-textarea,
    :host ::ng-deep .editable-textarea {
      width: 100% !important;
      background: #262626 !important;
      border: 1px solid #404040 !important;
      border-radius: 8px !important;
      padding: 0.75rem 1rem !important;
      font-size: 0.875rem !important;
      color: #f5f5f5 !important;
      font-family: inherit !important;
      line-height: 1.5 !important;
      resize: vertical;
      transition: all 0.2s ease;
      box-sizing: border-box;
    }

    .readonly-textarea {
      background: #1a1a1a !important;
      border: 1px solid #525252 !important;
      color: #f5f5f5 !important;
      cursor: not-allowed !important;
      opacity: 1 !important;
      font-weight: 400 !important;
    }

    .readonly-textarea:disabled {
      background: #1a1a1a !important;
      border-color: #525252 !important;
      color: #f5f5f5 !important;
      opacity: 1 !important;
      -webkit-text-fill-color: #f5f5f5 !important;
    }

    .readonly-textarea:focus {
      outline: none !important;
      border-color: #525252 !important;
      background: #1a1a1a !important;
      color: #f5f5f5 !important;
    }

    /* Override any Carbon input styling */
    :host ::ng-deep textarea.readonly-textarea.bx--text-area,
    :host ::ng-deep textarea.readonly-textarea.cds--text-area {
      background: #1a1a1a !important;
      border-color: #525252 !important;
      color: #f5f5f5 !important;
      opacity: 1 !important;
    }

    .editable-textarea {
      background: #262626 !important;
      border: 1px solid #404040 !important;
      color: #f5f5f5 !important;
    }

    .editable-textarea::placeholder {
      color: #737373 !important;
    }

    .editable-textarea:focus {
      outline: none !important;
      border-color: #3b82f6 !important;
      box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1) !important;
      background: #262626 !important;
    }

    /* Radio Group */
    .radio-group {
      display: flex;
      flex-direction: column;
      gap: 0.75rem;
      margin-top: 0.25rem;
    }

    .radio-option {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      cursor: pointer;
      padding: 0.5rem;
      border-radius: 6px;
      transition: background 0.2s ease;
    }

    .radio-option:hover {
      background: rgba(255, 255, 255, 0.05);
    }

    .radio-input {
      width: 18px;
      height: 18px;
      cursor: pointer;
      accent-color: #3b82f6;
      flex-shrink: 0;
    }

    .radio-input:focus {
      outline: 2px solid #3b82f6;
      outline-offset: 2px;
      border-radius: 50%;
    }

    .radio-label {
      font-size: 0.875rem;
      color: #e5e5e5;
      user-select: none;
    }

    /* Confidence Slider */
    .confidence-control {
      display: flex;
      align-items: center;
      gap: 1rem;
      margin-top: 0.5rem;
    }

    .confidence-slider {
      flex: 1;
      height: 6px;
      border-radius: 3px;
      background: #262626;
      outline: none;
      -webkit-appearance: none;
      appearance: none;
      cursor: pointer;
    }

    .confidence-slider::-webkit-slider-thumb {
      -webkit-appearance: none;
      appearance: none;
      width: 20px;
      height: 20px;
      border-radius: 50%;
      background: #3b82f6;
      cursor: pointer;
      border: 2px solid #111417;
      box-shadow: 0 2px 4px rgba(0, 0, 0, 0.3);
      transition: all 0.2s ease;
    }

    .confidence-slider::-webkit-slider-thumb:hover {
      background: #2563eb;
      transform: scale(1.1);
    }

    .confidence-slider::-webkit-slider-thumb:active {
      transform: scale(1.15);
    }

    .confidence-slider::-moz-range-thumb {
      width: 20px;
      height: 20px;
      border-radius: 50%;
      background: #3b82f6;
      cursor: pointer;
      border: 2px solid #111417;
      box-shadow: 0 2px 4px rgba(0, 0, 0, 0.3);
      transition: all 0.2s ease;
    }

    .confidence-slider::-moz-range-thumb:hover {
      background: #2563eb;
      transform: scale(1.1);
    }

    .confidence-slider::-moz-range-track {
      height: 6px;
      background: #262626;
      border-radius: 3px;
    }

    .confidence-display {
      min-width: 60px;
      text-align: right;
    }

    .confidence-value {
      font-size: 0.875rem;
      font-weight: 600;
      color: #d4d4d4;
    }

    .help-text {
      font-size: 0.75rem;
      color: #737373;
      margin: 0;
      font-style: italic;
      margin-top: 0.5rem;
    }

    /* Footer */
    .modal-footer-dark {
      background: #111417 !important;
      border-top: 1px solid rgba(255, 255, 255, 0.1);
      padding: 1.5rem 2rem;
      display: flex;
      justify-content: flex-end;
      gap: 0.75rem;
    }

    :host ::ng-deep .bx--modal-footer {
      background: #111417 !important;
    }

    .btn-primary,
    .btn-secondary {
      padding: 0.5rem 1rem;
      border-radius: 8px;
      font-size: 0.875rem;
      font-weight: 500;
      cursor: pointer;
      transition: all 0.2s ease;
      border: none;
    }

    .btn-primary {
      background: #2563eb;
      color: white;
    }

    .btn-primary:hover:not(:disabled) {
      background: #1d4ed8;
    }

    .btn-primary:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }

    .btn-secondary {
      background: transparent;
      color: #d4d4d4;
    }

    .btn-secondary:hover {
      color: #f5f5f5;
      background: rgba(255, 255, 255, 0.05);
    }

    /* Carbon Modal Overrides */
    :host ::ng-deep .bx--modal-close {
      color: #d4d4d4;
    }

    :host ::ng-deep .bx--modal-close:hover {
      color: #f5f5f5;
      background: rgba(255, 255, 255, 0.1);
    }

    /* Responsive */
    @media (max-width: 768px) {
      :host ::ng-deep .bx--modal-container {
        width: 95vw;
        margin: 1rem;
      }

      .modal-content-dark {
        padding: 1.5rem;
      }

      .modal-header-dark,
      .modal-footer-dark {
        padding: 1rem 1.5rem;
      }
    }
  `]
})
export class StepCorrectionModalComponent implements OnChanges, OnInit {
  @Input() open = signal(false);
  @Input() step = signal<AgentStep | null>(null);
  @Output() saved = new EventEmitter<StepFeedback>();
  @Output() cancelled = new EventEmitter<void>();

  correctedOutput = '';
  correctionNote = '';
  verdict: 'correct' | 'partial' | 'incorrect' = 'correct';
  adjustedConfidence = 85;
  updatedReasoningHint = '';

  originalOutput = signal('');
  originalConfidence = signal<number | null>(null);

  constructor() {
    // Watch for step changes when modal opens
    effect(() => {
      const currentStep = this.step();
      const isOpen = this.open();
      
      if (isOpen && currentStep) {
        this.initializeFormFields(currentStep);
      }
    });
  }

  ngOnInit() {
    // Initialize if step is already set when component initializes
    if (this.step()) {
      this.initializeFormFields(this.step()!);
    }
  }

  ngOnChanges(changes: SimpleChanges) {
    // Fallback for non-signal inputs or when signal reference changes
    if (changes['step'] && this.step()) {
      this.initializeFormFields(this.step()!);
    }
  }

  private initializeFormFields(step: AgentStep) {
    const outputText = step.outputText || step.message || '';
    this.originalOutput.set(outputText);
    this.originalConfidence.set(step.confidence ?? null);
    this.correctedOutput = outputText;
    this.correctionNote = step.feedback?.correctionNote || '';
    this.verdict = step.feedback?.verdict || 'correct';
    this.adjustedConfidence = step.feedback?.adjustedConfidence || step.confidence || 85;
    this.updatedReasoningHint = step.feedback?.updatedReasoningHint || '';
  }

  onConfidenceChange(event: Event) {
    const target = event.target as HTMLInputElement;
    this.adjustedConfidence = parseInt(target.value, 10);
  }

  canSave(): boolean {
    return this.correctionNote.trim().length > 0 || this.correctedOutput !== this.originalOutput();
  }

  onSave() {
    const feedback: StepFeedback = {
      verdict: this.verdict,
      adjustedConfidence: this.adjustedConfidence,
      correctionNote: this.correctionNote,
      updatedOutput: this.correctedOutput !== this.originalOutput() ? this.correctedOutput : undefined,
      updatedReasoningHint: this.updatedReasoningHint || undefined,
      submittedAt: new Date().toISOString()
    };
    this.saved.emit(feedback);
    this.open.set(false);
  }

  onCancel() {
    this.cancelled.emit();
    this.open.set(false);
  }
}
