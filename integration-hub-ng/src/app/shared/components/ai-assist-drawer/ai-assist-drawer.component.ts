import {
  Component,
  Input,
  Output,
  EventEmitter,
  OnInit,
  OnDestroy,
  OnChanges,
  SimpleChanges,
  signal,
  computed,
  effect,
  EffectRef,
  WritableSignal,
  ViewChild,
  ElementRef,
  inject
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subject, Observable, of, delay, Subscription } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import {
  ButtonModule,
  IconModule
} from 'carbon-components-angular';

export interface SuggestedAction {
  id: string;
  label: string;
  icon?: string;
  category?: string;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
  isStreaming?: boolean;
}

@Component({
  selector: 'app-ai-assist-drawer',
  standalone: true,
  imports: [CommonModule, FormsModule, ButtonModule, IconModule],
  template: `
    <!-- Backdrop -->
    <div 
      class="drawer-backdrop"
      [class.visible]="isOpen()"
      (click)="close()"
      *ngIf="isOpen()">
    </div>

    <!-- Drawer -->
    <div 
      class="ai-assist-drawer"
      [class.open]="isOpen()"
      [class.sliding-in]="isSlidingIn()">
      
      <!-- Header -->
      <div class="drawer-header">
        <div class="header-content">
          <div class="header-title-group">
            <div class="assist-icon">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M12 2C6.48 2 2 6.48 2 12C2 17.52 6.48 22 12 22C17.52 22 22 17.52 22 12C22 6.48 17.52 2 12 2ZM13 17H11V15H13V17ZM13 13H11V7H13V13Z" fill="currentColor"/>
              </svg>
            </div>
            <div class="header-text">
              <h3 class="drawer-title">AI Assist</h3>
              <p class="drawer-subtitle" *ngIf="context">{{ context }}</p>
            </div>
          </div>
          <button 
            ibmButton="ghost" 
            size="sm"
            class="close-button"
            (click)="close()"
            [attr.aria-label]="'Close AI Assist'"
            type="button">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M12 4L4 12M4 4L12 12" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
          </button>
        </div>
      </div>

      <!-- Body -->
      <div class="drawer-body">
        <!-- Description -->
        <div class="description-section" *ngIf="description">
          <p class="description-text">{{ description }}</p>
        </div>

        <!-- Suggested Actions -->
        <div class="actions-section" *ngIf="suggestedActions().length > 0">
          <p class="actions-label">Quick actions</p>
          <div class="actions-grid">
            <button
              *ngFor="let action of suggestedActions()"
              class="action-button"
              [class.processing]="processingAction() === action.id"
              (click)="handleAction(action)"
              [disabled]="processingAction() !== null"
              type="button">
              <span class="action-icon" *ngIf="action.icon">{{ action.icon }}</span>
              <span class="action-label">{{ action.label }}</span>
              <span class="action-loader" *ngIf="processingAction() === action.id">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="2" stroke-dasharray="31.416" stroke-dashoffset="31.416" opacity="0.3"/>
                  <circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="2" stroke-dasharray="31.416" stroke-dashoffset="23.562" transform="rotate(-90 12 12)">
                    <animateTransform attributeName="transform" type="rotate" values="0 12 12;360 12 12" dur="1s" repeatCount="indefinite"/>
                  </circle>
                </svg>
              </span>
            </button>
          </div>
        </div>

        <!-- Chat Section -->
        <div class="chat-section">
          <div class="chat-header">
            <p class="chat-label">Ask a question</p>
          </div>
          
          <!-- Messages -->
          <div class="messages-container" #messagesContainer>
            <div *ngIf="messages().length === 0" class="empty-chat">
              <p class="empty-text">Start a conversation or use a quick action above.</p>
            </div>
            
            <div 
              *ngFor="let message of messages()" 
              class="message"
              [class.user]="message.role === 'user'"
              [class.assistant]="message.role === 'assistant'"
              [class.streaming]="message.isStreaming">
              <div class="message-avatar" *ngIf="message.role === 'assistant'">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M12 2C6.48 2 2 6.48 2 12C2 17.52 6.48 22 12 22C17.52 22 22 17.52 22 12C22 6.48 17.52 2 12 2ZM13 17H11V15H13V17ZM13 13H11V7H13V13Z" fill="currentColor"/>
                </svg>
              </div>
              <div class="message-content">
                <div class="message-text" [innerHTML]="formatMessage(message.content)"></div>
                <span class="message-time" *ngIf="!message.isStreaming">{{ formatTime(message.timestamp) }}</span>
              </div>
            </div>

            <!-- Typing Indicator -->
            <div *ngIf="sending()" class="message assistant">
              <div class="message-avatar">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M12 2C6.48 2 2 6.48 2 12C2 17.52 6.48 22 12 22C17.52 22 22 17.52 22 12C22 6.48 17.52 2 12 2ZM13 17H11V15H13V17ZM13 13H11V7H13V13Z" fill="currentColor"/>
                </svg>
              </div>
              <div class="message-content">
                <div class="typing-indicator">
                  <span></span>
                  <span></span>
                  <span></span>
                </div>
              </div>
            </div>
          </div>

          <!-- Input -->
          <div class="input-section">
            <div class="input-container">
              <input
                ibmText
                [(ngModel)]="inputMessage"
                (keydown.enter)="onEnterKey($event)"
                placeholder="Ask about webhooks..."
                class="chat-input"
                [disabled]="sending() || processingAction() !== null"
                #inputRef>
              <button 
                ibmButton="primary" 
                size="sm"
                class="send-button"
                (click)="sendMessage()"
                [disabled]="!inputMessage.trim() || sending() || processingAction() !== null"
                [attr.aria-label]="'Send message'"
                type="button">
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M14.5 1.5L7 9M14.5 1.5L10 14.5L7 9M14.5 1.5L1.5 5L7 9" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
                </svg>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    /* ===== Backdrop ===== */
    .drawer-backdrop {
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: rgba(0, 0, 0, 0.4);
      backdrop-filter: blur(4px);
      -webkit-backdrop-filter: blur(4px);
      z-index: 999;
      opacity: 0;
      pointer-events: none;
      transition: opacity 0.3s ease;
    }

    .drawer-backdrop.visible {
      opacity: 1;
      pointer-events: auto;
    }

    /* ===== Drawer ===== */
    .ai-assist-drawer {
      position: fixed;
      top: 0;
      right: 0;
      bottom: 0;
      width: 480px;
      max-width: 90vw;
      background: var(--assist-drawer-bg, #ffffff);
      box-shadow: 
        -4px 0 24px rgba(0, 0, 0, 0.15),
        -2px 0 8px rgba(0, 0, 0, 0.1);
      z-index: 1000;
      display: flex;
      flex-direction: column;
      transform: translateX(100%);
      transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1);
      overflow: hidden;
    }

    .ai-assist-drawer.open {
      transform: translateX(0);
    }

    .ai-assist-drawer.sliding-in {
      animation: slideIn 0.3s cubic-bezier(0.4, 0, 0.2, 1) forwards;
    }

    @keyframes slideIn {
      from {
        transform: translateX(100%);
      }
      to {
        transform: translateX(0);
      }
    }

    /* ===== Header ===== */
    .drawer-header {
      flex-shrink: 0;
      padding: 1.25rem 1.5rem;
      border-bottom: 1px solid var(--assist-border, rgba(0, 0, 0, 0.08));
      background: var(--assist-header-bg, rgba(255, 255, 255, 0.95));
    }

    .header-content {
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 1rem;
    }

    .header-title-group {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      flex: 1;
      min-width: 0;
    }

    .assist-icon {
      width: 36px;
      height: 36px;
      border-radius: 8px;
      background: linear-gradient(135deg, #0f62fe 0%, #0043ce 100%);
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
      color: white;
    }

    .header-text {
      flex: 1;
      min-width: 0;
    }

    .drawer-title {
      font-size: 1rem;
      font-weight: 600;
      color: var(--assist-text-primary, #161616);
      margin: 0 0 0.125rem 0;
      line-height: 1.4;
    }

    .drawer-subtitle {
      font-size: 0.75rem;
      color: var(--assist-text-secondary, #6b6b6b);
      margin: 0;
      line-height: 1.4;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .close-button {
      color: var(--assist-text-secondary, #6b6b6b) !important;
      min-width: 32px;
      padding: 0.5rem;
      border-radius: 8px;
      transition: all 0.2s ease;
      flex-shrink: 0;
    }

    .close-button:hover {
      background: var(--assist-hover-bg, rgba(0, 0, 0, 0.05));
      color: var(--assist-text-primary, #161616) !important;
    }

    /* ===== Body ===== */
    .drawer-body {
      flex: 1;
      display: flex;
      flex-direction: column;
      overflow: hidden;
      min-height: 0;
    }

    /* Description */
    .description-section {
      padding: 1.25rem 1.5rem;
      border-bottom: 1px solid var(--assist-border, rgba(0, 0, 0, 0.08));
      background: var(--assist-surface, rgba(15, 98, 254, 0.04));
    }

    .description-text {
      font-size: 0.875rem;
      color: var(--assist-text-primary, #161616);
      margin: 0;
      line-height: 1.6;
    }

    /* Actions */
    .actions-section {
      padding: 1.25rem 1.5rem;
      border-bottom: 1px solid var(--assist-border, rgba(0, 0, 0, 0.08));
      flex-shrink: 0;
    }

    .actions-label {
      font-size: 0.75rem;
      font-weight: 600;
      color: var(--assist-text-secondary, #6b6b6b);
      margin: 0 0 0.75rem 0;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }

    .actions-grid {
      display: grid;
      grid-template-columns: 1fr;
      gap: 0.5rem;
    }

    .action-button {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      padding: 0.75rem 1rem;
      background: var(--assist-action-bg, rgba(15, 98, 254, 0.08));
      border: 1px solid var(--assist-action-border, rgba(15, 98, 254, 0.15));
      border-radius: 8px;
      color: var(--assist-accent, #0f62fe);
      font-size: 0.875rem;
      text-align: left;
      cursor: pointer;
      transition: all 0.2s ease;
      position: relative;
    }

    .action-button:hover:not(:disabled) {
      background: var(--assist-action-hover, rgba(15, 98, 254, 0.12));
      border-color: var(--assist-accent, #0f62fe);
      transform: translateX(2px);
    }

    .action-button:active:not(:disabled) {
      transform: translateX(1px);
    }

    .action-button:disabled {
      opacity: 0.6;
      cursor: not-allowed;
    }

    .action-button.processing {
      background: var(--assist-action-bg, rgba(15, 98, 254, 0.08));
    }

    .action-icon {
      font-size: 1rem;
      flex-shrink: 0;
    }

    .action-label {
      flex: 1;
    }

    .action-loader {
      flex-shrink: 0;
      color: var(--assist-accent, #0f62fe);
    }

    /* Chat Section */
    .chat-section {
      flex: 1;
      display: flex;
      flex-direction: column;
      overflow: hidden;
      min-height: 0;
    }

    .chat-header {
      padding: 1rem 1.5rem;
      border-bottom: 1px solid var(--assist-border, rgba(0, 0, 0, 0.08));
      flex-shrink: 0;
    }

    .chat-label {
      font-size: 0.75rem;
      font-weight: 600;
      color: var(--assist-text-secondary, #6b6b6b);
      margin: 0;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }

    .messages-container {
      flex: 1;
      overflow-y: auto;
      padding: 1.25rem 1.5rem;
      display: flex;
      flex-direction: column;
      gap: 1rem;
      min-height: 0;
      scroll-behavior: smooth;
    }

    .messages-container::-webkit-scrollbar {
      width: 6px;
    }

    .messages-container::-webkit-scrollbar-track {
      background: transparent;
    }

    .messages-container::-webkit-scrollbar-thumb {
      background: var(--assist-scrollbar, rgba(0, 0, 0, 0.2));
      border-radius: 3px;
    }

    .messages-container::-webkit-scrollbar-thumb:hover {
      background: var(--assist-scrollbar-hover, rgba(0, 0, 0, 0.3));
    }

    .empty-chat {
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 2rem;
      text-align: center;
    }

    .empty-text {
      font-size: 0.875rem;
      color: var(--assist-text-secondary, #6b6b6b);
      margin: 0;
    }

    .message {
      display: flex;
      gap: 0.5rem;
      align-items: flex-start;
      animation: messageSlideIn 0.2s ease-out;
    }

    @keyframes messageSlideIn {
      from {
        opacity: 0;
        transform: translateY(4px);
      }
      to {
        opacity: 1;
        transform: translateY(0);
      }
    }

    .message.user {
      flex-direction: row-reverse;
    }

    .message-avatar {
      width: 24px;
      height: 24px;
      border-radius: 50%;
      background: linear-gradient(135deg, #0f62fe 0%, #0043ce 100%);
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
      color: white;
      margin-top: 0.125rem;
    }

    .message.user .message-avatar {
      display: none;
    }

    .message-content {
      max-width: 80%;
      display: flex;
      flex-direction: column;
      gap: 0.25rem;
    }

    .message.user .message-content {
      align-items: flex-end;
    }

    .message-text {
      padding: 0.625rem 0.875rem;
      border-radius: 12px;
      font-size: 0.875rem;
      line-height: 1.5;
      word-wrap: break-word;
    }

    .message.user .message-text {
      background: linear-gradient(135deg, #0f62fe 0%, #0043ce 100%);
      color: white;
      border-bottom-right-radius: 4px;
    }

    .message.assistant .message-text {
      background: var(--assist-message-bg, rgba(0, 0, 0, 0.04));
      color: var(--assist-text-primary, #161616);
      border-bottom-left-radius: 4px;
    }

    .message.streaming .message-text::after {
      content: '▊';
      animation: blink 1s infinite;
      margin-left: 2px;
    }

    @keyframes blink {
      0%, 50% { opacity: 1; }
      51%, 100% { opacity: 0; }
    }

    .message-time {
      font-size: 0.6875rem;
      color: var(--assist-text-secondary, #6b6b6b);
      padding: 0 0.5rem;
    }

    .typing-indicator {
      display: flex;
      gap: 0.375rem;
      padding: 0.625rem 0.875rem;
      background: var(--assist-message-bg, rgba(0, 0, 0, 0.04));
      border-radius: 12px;
      border-bottom-left-radius: 4px;
    }

    .typing-indicator span {
      width: 6px;
      height: 6px;
      border-radius: 50%;
      background: var(--assist-text-secondary, #6b6b6b);
      animation: typingBounce 1.4s infinite;
    }

    .typing-indicator span:nth-child(2) {
      animation-delay: 0.2s;
    }

    .typing-indicator span:nth-child(3) {
      animation-delay: 0.4s;
    }

    @keyframes typingBounce {
      0%, 60%, 100% {
        opacity: 0.4;
        transform: translateY(0);
      }
      30% {
        opacity: 1;
        transform: translateY(-4px);
      }
    }

    /* Input */
    .input-section {
      flex-shrink: 0;
      padding: 1rem 1.5rem;
      border-top: 1px solid var(--assist-border, rgba(0, 0, 0, 0.08));
      background: var(--assist-input-bg, rgba(255, 255, 255, 0.95));
    }

    .input-container {
      display: flex;
      gap: 0.75rem;
      align-items: center;
    }

    .chat-input {
      flex: 1;
      min-width: 0;
    }

    .send-button {
      flex-shrink: 0;
      min-width: 40px;
      padding: 0.5rem;
    }

    /* Dark Mode */
    @media (prefers-color-scheme: dark) {
      .ai-assist-drawer {
        --assist-drawer-bg: #1a1a1a;
        --assist-header-bg: rgba(26, 26, 26, 0.95);
        --assist-border: rgba(255, 255, 255, 0.1);
        --assist-text-primary: #f4f4f4;
        --assist-text-secondary: #a8a8a8;
        --assist-hover-bg: rgba(255, 255, 255, 0.1);
        --assist-scrollbar: rgba(255, 255, 255, 0.2);
        --assist-scrollbar-hover: rgba(255, 255, 255, 0.3);
        --assist-message-bg: rgba(255, 255, 255, 0.08);
        --assist-input-bg: rgba(26, 26, 26, 0.95);
        --assist-surface: rgba(15, 98, 254, 0.15);
        --assist-action-bg: rgba(15, 98, 254, 0.15);
        --assist-action-border: rgba(15, 98, 254, 0.25);
        --assist-action-hover: rgba(15, 98, 254, 0.2);
        --assist-accent: #4589ff;
      }
    }

    /* Responsive */
    @media (max-width: 768px) {
      .ai-assist-drawer {
        width: 100%;
        max-width: 100%;
      }
    }
  `]
})
export class AiAssistDrawerComponent implements OnInit, OnDestroy, OnChanges {
  @Input() isOpen!: WritableSignal<boolean>;
  @Input() context?: string;
  @Input() description?: string;
  @Input() suggestedActions!: WritableSignal<SuggestedAction[]>;
  @Output() closed = new EventEmitter<void>();
  @Output() actionTriggered = new EventEmitter<SuggestedAction>();

  @ViewChild('messagesContainer', { static: false }) messagesContainer?: ElementRef<HTMLDivElement>;
  @ViewChild('inputRef', { static: false }) inputRef?: ElementRef<HTMLInputElement>;

  inputMessage = '';
  sending = signal(false);
  messages = signal<ChatMessage[]>([]);
  processingAction = signal<string | null>(null);
  isSlidingIn = signal(false);

  private destroy$ = new Subject<void>();
  private effectRef?: EffectRef;
  private timeoutIds: number[] = [];
  private subscriptions: Subscription[] = [];

  constructor() {
    // Effect will be set up after inputs are initialized
  }

  ngOnInit() {
    // Watch for drawer opening to trigger slide-in animation
    if (this.isOpen) {
      this.effectRef = effect(() => {
        if (this.isOpen && this.isOpen()) {
          this.isSlidingIn.set(true);
          const timeoutId = window.setTimeout(() => {
            this.inputRef?.nativeElement.focus();
            this.isSlidingIn.set(false);
            // Remove from tracking array
            this.timeoutIds = this.timeoutIds.filter(id => id !== timeoutId);
          }, 300);
          this.timeoutIds.push(timeoutId);
        }
      });
    }
  }

  ngOnChanges(changes: SimpleChanges) {
    // Handle input changes if needed
    if (changes['isOpen'] && this.isOpen && this.isOpen()) {
      this.isSlidingIn.set(true);
      const timeoutId = window.setTimeout(() => {
        this.inputRef?.nativeElement.focus();
        this.isSlidingIn.set(false);
        // Remove from tracking array
        this.timeoutIds = this.timeoutIds.filter(id => id !== timeoutId);
      }, 300);
      this.timeoutIds.push(timeoutId);
    }
  }

  ngOnDestroy() {
    // Clean up effect
    if (this.effectRef) {
      this.effectRef.destroy();
    }

    // Clear all pending timeouts
    this.timeoutIds.forEach(id => clearTimeout(id));
    this.timeoutIds = [];

    // Unsubscribe from all subscriptions
    this.subscriptions.forEach(sub => sub.unsubscribe());
    this.subscriptions = [];

    // Complete destroy subject
    this.destroy$.next();
    this.destroy$.complete();
  }

  close() {
    this.isSlidingIn.set(false);
    if (this.isOpen) {
      this.isOpen.set(false);
    }
    this.closed.emit();
  }

  onEnterKey(event: Event) {
    const keyboardEvent = event as KeyboardEvent;
    if (keyboardEvent.key === 'Enter' && !keyboardEvent.shiftKey) {
      keyboardEvent.preventDefault();
      this.sendMessage();
    }
  }

  sendMessage() {
    const message = this.inputMessage.trim();
    if (!message || this.sending()) return;

    // Add user message
    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      content: message,
      timestamp: new Date().toISOString()
    };
    this.messages.update(msgs => [...msgs, userMessage]);
    this.inputMessage = '';
    this.sending.set(true);

    // Simulate AI response with streaming
    const subscription = this.simulateStreamingResponse(message)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          this.sending.set(false);
          const timeoutId = window.setTimeout(() => {
            this.scrollToBottom();
            this.timeoutIds = this.timeoutIds.filter(id => id !== timeoutId);
          }, 100);
          this.timeoutIds.push(timeoutId);
        },
        error: (error) => {
          console.error('Error sending message:', error);
          this.sending.set(false);
        }
      });
    this.subscriptions.push(subscription);
  }

  handleAction(action: SuggestedAction) {
    this.processingAction.set(action.id);
    this.actionTriggered.emit(action);

    // Simulate diagnostic flow
    const subscription = this.simulateDiagnosticFlow(action)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (result) => {
          this.processingAction.set(null);
          // Add result as assistant message
          const resultMessage: ChatMessage = {
            id: Date.now().toString(),
            role: 'assistant',
            content: result,
            timestamp: new Date().toISOString()
          };
          this.messages.update(msgs => [...msgs, resultMessage]);
          const timeoutId = window.setTimeout(() => {
            this.scrollToBottom();
            this.timeoutIds = this.timeoutIds.filter(id => id !== timeoutId);
          }, 100);
          this.timeoutIds.push(timeoutId);
        },
        error: (error) => {
          console.error('Error processing action:', error);
          this.processingAction.set(null);
        }
      });
    this.subscriptions.push(subscription);
  }

  // Placeholder: Simulate streaming AI response
  private simulateStreamingResponse(userMessage: string): Observable<ChatMessage> {
    const responseId = (Date.now() + 1).toString();
    const mockResponse = this.generateMockResponse(userMessage);
    
    // Create streaming message
    const streamingMessage: ChatMessage = {
      id: responseId,
      role: 'assistant',
      content: '',
      timestamp: new Date().toISOString(),
      isStreaming: true
    };
    
    this.messages.update(msgs => [...msgs, streamingMessage]);
    
    // Simulate character-by-character streaming
    return new Observable(observer => {
      let currentContent = '';
      const words = mockResponse.split(' ');
      let wordIndex = 0;
      
      const streamInterval = setInterval(() => {
        if (wordIndex < words.length) {
          currentContent += (wordIndex > 0 ? ' ' : '') + words[wordIndex];
          wordIndex++;
          
          // Update streaming message
          this.messages.update(msgs => 
            msgs.map(msg => 
              msg.id === responseId 
                ? { ...msg, content: currentContent }
                : msg
            )
          );
          
          this.scrollToBottom();
        } else {
          // Complete streaming
          clearInterval(streamInterval);
          this.messages.update(msgs => 
            msgs.map(msg => 
              msg.id === responseId 
                ? { ...msg, isStreaming: false }
                : msg
            )
          );
          observer.next(streamingMessage);
          observer.complete();
        }
      }, 50); // Stream one word every 50ms

      // Cleanup function to clear interval if Observable is unsubscribed
      return () => {
        clearInterval(streamInterval);
      };
    });
  }

  // Placeholder: Simulate diagnostic flow
  private simulateDiagnosticFlow(action: SuggestedAction): Observable<string> {
    const mockResults: Record<string, string> = {
      'troubleshoot-webhook': `I've analyzed your webhook configuration. Here's what I found:

✓ **Endpoint is reachable** - Your webhook URL responds correctly
✓ **Signature verification** - HMAC validation is working
⚠ **Rate limiting** - You're approaching the rate limit (85% of quota used)

**Recommendations:**
1. Implement exponential backoff for retries
2. Add idempotency checks using event IDs
3. Monitor response times (currently averaging 450ms)

Would you like me to generate a code snippet for any of these?`,

      'explain-payload': `Here's a breakdown of the webhook payload structure:

**Standard Fields:**
- \`id\`: Unique event identifier (use for idempotency)
- \`type\`: Event type (e.g., "api.created")
- \`timestamp\`: ISO 8601 timestamp
- \`data\`: Event-specific data object
- \`signature\`: HMAC SHA-256 signature for verification

**Example Payload:**
\`\`\`json
{
  "id": "evt_1234567890",
  "type": "api.created",
  "timestamp": "2024-11-06T14:32:00Z",
  "data": { /* event data */ },
  "signature": "sha256=abc123..."
}
\`\`\`

The signature is computed using your webhook secret and the request body. Always verify it before processing events.`,

      'generate-retry-logic': `Here's a retry logic snippet for handling webhook failures:

\`\`\`javascript
async function handleWebhookWithRetry(event, maxRetries = 3) {
  let attempt = 0;
  const baseDelay = 1000; // 1 second

  while (attempt < maxRetries) {
    try {
      const response = await processWebhook(event);
      if (response.ok) {
        return response;
      }
      throw new Error(\`HTTP \${response.status}\`);
    } catch (error) {
      attempt++;
      if (attempt >= maxRetries) {
        throw new Error(\`Failed after \${maxRetries} attempts\`);
      }
      // Exponential backoff
      const delay = baseDelay * Math.pow(2, attempt - 1);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
}
\`\`\`

This implements exponential backoff: 1s, 2s, 4s delays between retries.`,

      'check-misconfigurations': `I've checked your webhook configuration for common issues:

✓ **HTTPS endpoint** - Using secure protocol
✓ **Valid URL format** - Endpoint URL is properly formatted
⚠ **Missing idempotency** - No event ID tracking detected
⚠ **No signature verification** - Webhook secret not being validated
✓ **Response time** - Endpoint responds within 5 seconds

**Issues Found:**
1. **Idempotency**: Implement event ID deduplication to prevent duplicate processing
2. **Security**: Add signature verification to ensure requests are from LUMEN

**Quick Fixes:**
- Store processed event IDs in a cache (Redis recommended)
- Verify HMAC signature before processing any event

Would you like code examples for implementing these fixes?`
    };

    const result = mockResults[action.id] || `Processing "${action.label}"...\n\nThis is a placeholder response. In production, this would run actual diagnostics.`;
    
    // Simulate processing delay
    return of(result).pipe(delay(1500));
  }

  // Placeholder: Generate mock AI response
  private generateMockResponse(userMessage: string): string {
    const lowerMessage = userMessage.toLowerCase();
    
    if (lowerMessage.includes('troubleshoot') || lowerMessage.includes('problem') || lowerMessage.includes('issue')) {
      return 'I can help troubleshoot your webhook. Common issues include endpoint accessibility, signature verification, and rate limiting. Would you like me to run a diagnostic check?';
    }
    
    if (lowerMessage.includes('payload') || lowerMessage.includes('structure') || lowerMessage.includes('format')) {
      return 'Webhook payloads include: id (for idempotency), type (event type), timestamp (ISO 8601), data (event-specific), and signature (HMAC SHA-256). Each payload is signed with your webhook secret for verification.';
    }
    
    if (lowerMessage.includes('retry') || lowerMessage.includes('failure') || lowerMessage.includes('error')) {
      return 'For retry logic, implement exponential backoff. Start with 1 second, then 2s, 4s, etc. Always verify the event ID to prevent duplicate processing. Would you like a code snippet?';
    }
    
    if (lowerMessage.includes('verify') || lowerMessage.includes('signature') || lowerMessage.includes('security')) {
      return 'To verify webhooks, compute HMAC SHA-256 of the request body using your webhook secret. Compare it to the signature header. Never process events without verification.';
    }
    
    if (lowerMessage.includes('test') || lowerMessage.includes('testing')) {
      return 'You can test webhooks using the LUMEN dashboard testing tool, or use services like webhook.site during development to inspect incoming payloads.';
    }
    
    return 'I can help you with webhook configuration, troubleshooting, payload structure, retry logic, and security best practices. What would you like to know?';
  }

  formatTime(timestamp: string): string {
    const date = new Date(timestamp);
    return date.toLocaleTimeString('en-US', { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  }

  formatMessage(content: string): string {
    // Simple markdown-like formatting
    return content
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.*?)\*/g, '<em>$1</em>')
      .replace(/`(.*?)`/g, '<code>$1</code>')
      .replace(/```([\s\S]*?)```/g, '<pre><code>$1</code></pre>');
  }

  private scrollToBottom() {
    if (this.messagesContainer) {
      const element = this.messagesContainer.nativeElement;
      element.scrollTop = element.scrollHeight;
    }
  }
}
