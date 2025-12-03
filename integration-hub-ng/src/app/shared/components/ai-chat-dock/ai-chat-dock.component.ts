import { 
  Component, 
  OnInit, 
  OnDestroy,
  signal, 
  computed, 
  inject, 
  ViewChild, 
  ElementRef,
  effect
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, NavigationEnd } from '@angular/router';
import { filter, takeUntil } from 'rxjs/operators';
import { Subject, Observable } from 'rxjs';
import {
  ButtonModule,
  IconModule
} from 'carbon-components-angular';
import { AiAssistantService, ChatMessage } from '../../../core/ai-assistant.service';

interface ContextualSuggestion {
  id: string;
  text: string;
  icon?: string;
  category: string;
}

@Component({
  selector: 'app-ai-chat-dock',
  standalone: true,
  imports: [CommonModule, FormsModule, ButtonModule, IconModule],
  template: `
    <!-- Minimized FAB Button -->
    <button 
      *ngIf="!isExpanded()"
      class="assistant-fab"
      [class.has-suggestions]="hasProactiveSuggestions()"
      [class.animating]="isAnimating()"
      (click)="openAssistant()"
      [attr.aria-label]="'Open AI Assistant'"
      type="button">
      <div class="fab-content">
        <svg class="fab-icon" width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M12 2C6.48 2 2 6.48 2 12C2 17.52 6.48 22 12 22C17.52 22 22 17.52 22 12C22 6.48 17.52 2 12 2ZM13 17H11V15H13V17ZM13 13H11V7H13V13Z" fill="currentColor"/>
        </svg>
        <div class="fab-pulse" *ngIf="hasProactiveSuggestions()"></div>
        <div class="fab-halo" *ngIf="hasProactiveSuggestions()"></div>
      </div>
    </button>

    <!-- Expanded Assistant Panel -->
    <div 
      class="assistant-panel"
      [class.expanded]="isExpanded()"
      [class.sliding-up]="isSlidingUp()"
      [class.sliding-down]="isSlidingDown()">
      
      <!-- Header -->
      <div class="assistant-header">
        <div class="header-content">
          <div class="header-title-group">
            <div class="assistant-avatar">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M12 2C6.48 2 2 6.48 2 12C2 17.52 6.48 22 12 22C17.52 22 22 17.52 22 12C22 6.48 17.52 2 12 2ZM13 17H11V15H13V17ZM13 13H11V7H13V13Z" fill="currentColor"/>
              </svg>
            </div>
            <div class="header-text">
              <h3 class="assistant-title">AI Assistant</h3>
              <p class="assistant-subtitle" *ngIf="currentContext()">{{ currentContext() }}</p>
            </div>
          </div>
          <button 
            ibmButton="ghost" 
            size="sm"
            class="close-button"
            (click)="closeAssistant()"
            [attr.aria-label]="'Minimize assistant'"
            type="button">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M12 4L4 12M4 4L12 12" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
          </button>
        </div>
      </div>

      <!-- Body -->
      <div class="assistant-body">
        <!-- Messages Container -->
        <div class="messages-container" #messagesContainer>
          <!-- Welcome State -->
          <div *ngIf="messages().length === 0" class="welcome-state">
            <div class="welcome-icon">
              <svg width="48" height="48" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M12 2C6.48 2 2 6.48 2 12C2 17.52 6.48 22 12 22C17.52 22 22 17.52 22 12C22 6.48 17.52 2 12 2ZM13 17H11V15H13V17ZM13 13H11V7H13V13Z" fill="currentColor"/>
              </svg>
            </div>
            <h4 class="welcome-title">How can I help you today?</h4>
            <p class="welcome-description">I can help you understand insights, explain risks, and guide you through workflows.</p>
            
            <!-- Contextual Suggestions -->
            <div *ngIf="contextualSuggestions().length > 0" class="suggestions-section">
              <p class="suggestions-label">Try asking:</p>
              <div class="suggestions-grid">
                <button
                  *ngFor="let suggestion of contextualSuggestions()"
                  class="suggestion-chip"
                  (click)="selectSuggestion(suggestion.text)"
                  type="button">
                  <span class="suggestion-text">{{ suggestion.text }}</span>
                </button>
              </div>
            </div>
          </div>

          <!-- Messages -->
          <div 
            *ngFor="let message of messages()" 
            class="message"
            [class.user]="message.role === 'user'"
            [class.assistant]="message.role === 'assistant'">
            <div class="message-avatar" *ngIf="message.role === 'assistant'">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M12 2C6.48 2 2 6.48 2 12C2 17.52 6.48 22 12 22C17.52 22 22 17.52 22 12C22 6.48 17.52 2 12 2ZM13 17H11V15H13V17ZM13 13H11V7H13V13Z" fill="currentColor"/>
              </svg>
            </div>
            <div class="message-content">
              <div class="message-text">{{ message.content }}</div>
              <span class="message-time">{{ formatTime(message.timestamp) }}</span>
            </div>
          </div>

          <!-- Typing Indicator -->
          <div *ngIf="sending()" class="message assistant">
            <div class="message-avatar">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
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

        <!-- Input Section -->
        <div class="input-section">
          <div class="input-container">
            <input
              ibmText
              [(ngModel)]="inputMessage"
              (keydown.enter)="onEnterKey($event)"
              placeholder="Ask a question..."
              class="chat-input"
              [disabled]="sending()"
              #inputRef>
            <button 
              ibmButton="primary" 
              size="sm"
              class="send-button"
              (click)="sendMessage()"
              [disabled]="!inputMessage.trim() || sending()"
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
  `,
  styles: [`
    /* ===== FAB Button (Minimized State) ===== */
    .assistant-fab {
      position: fixed !important;
      bottom: 1.5rem !important;
      right: 1.5rem !important;
      top: auto !important;
      left: auto !important;
      z-index: 1000;
      width: 64px;
      height: 64px;
      border-radius: 50%;
      border: none;
      background: var(--assistant-fab-bg, linear-gradient(135deg, #0f62fe 0%, #0043ce 100%));
      box-shadow: 
        0 4px 16px rgba(15, 98, 254, 0.3),
        0 2px 8px rgba(15, 98, 254, 0.2),
        inset 0 1px 0 rgba(255, 255, 255, 0.2);
      cursor: pointer;
      transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
      padding: 0;
      margin: 0;
      display: flex;
      align-items: center;
      justify-content: center;
      overflow: visible;
    }

    .assistant-fab:hover {
      transform: translateY(-2px) scale(1.05);
      box-shadow: 
        0 8px 24px rgba(15, 98, 254, 0.4),
        0 4px 12px rgba(15, 98, 254, 0.3),
        inset 0 1px 0 rgba(255, 255, 255, 0.3);
    }

    .assistant-fab:active {
      transform: translateY(0) scale(0.98);
    }

    .assistant-fab.has-suggestions {
      animation: fabPulse 2s ease-in-out infinite;
    }

    .fab-content {
      position: relative;
      z-index: 2;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .fab-icon {
      color: white;
      filter: drop-shadow(0 1px 2px rgba(0, 0, 0, 0.2));
    }

    /* Pulse Animation for Proactive State */
    .fab-pulse {
      position: absolute;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      width: 100%;
      height: 100%;
      border-radius: 50%;
      background: rgba(255, 255, 255, 0.4);
      animation: pulseRing 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
      z-index: 1;
    }

    /* Gradient Halo Effect */
    .fab-halo {
      position: absolute;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      width: 120%;
      height: 120%;
      border-radius: 50%;
      background: radial-gradient(circle, rgba(15, 98, 254, 0.3) 0%, rgba(15, 98, 254, 0) 70%);
      animation: haloGlow 2s ease-in-out infinite;
      z-index: 0;
    }

    @keyframes fabPulse {
      0%, 100% {
        transform: scale(1);
      }
      50% {
        transform: scale(1.05);
      }
    }

    @keyframes pulseRing {
      0% {
        transform: translate(-50%, -50%) scale(1);
        opacity: 1;
      }
      100% {
        transform: translate(-50%, -50%) scale(1.5);
        opacity: 0;
      }
    }

    @keyframes haloGlow {
      0%, 100% {
        opacity: 0.6;
        transform: translate(-50%, -50%) scale(1);
      }
      50% {
        opacity: 1;
        transform: translate(-50%, -50%) scale(1.1);
      }
    }

    /* ===== Assistant Panel (Expanded State) ===== */
    .assistant-panel {
      position: fixed;
      bottom: 1.5rem;
      right: 1.5rem;
      z-index: 1000;
      width: 420px;
      max-width: calc(100vw - 3rem);
      height: 640px;
      max-height: calc(100vh - 3rem);
      display: flex;
      flex-direction: column;
      background: var(--assistant-panel-bg, rgba(255, 255, 255, 0.95));
      backdrop-filter: blur(24px) saturate(180%);
      -webkit-backdrop-filter: blur(24px) saturate(180%);
      border: 1px solid var(--assistant-border, rgba(0, 0, 0, 0.08));
      border-radius: 20px;
      box-shadow: 
        0 20px 60px rgba(0, 0, 0, 0.15),
        0 8px 24px rgba(0, 0, 0, 0.1),
        inset 0 1px 0 rgba(255, 255, 255, 0.8);
      opacity: 0;
      transform: translateY(20px) scale(0.95);
      pointer-events: none;
      transition: all 0.4s cubic-bezier(0.34, 1.56, 0.64, 1);
    }

    .assistant-panel.expanded {
      opacity: 1;
      transform: translateY(0) scale(1);
      pointer-events: auto;
    }

    .assistant-panel.sliding-up {
      animation: slideUp 0.4s cubic-bezier(0.34, 1.56, 0.64, 1) forwards;
    }

    .assistant-panel.sliding-down {
      animation: slideDown 0.3s cubic-bezier(0.4, 0, 0.2, 1) forwards;
    }

    @keyframes slideUp {
      from {
        opacity: 0;
        transform: translateY(40px) scale(0.9);
      }
      to {
        opacity: 1;
        transform: translateY(0) scale(1);
      }
    }

    @keyframes slideDown {
      from {
        opacity: 1;
        transform: translateY(0) scale(1);
      }
      to {
        opacity: 0;
        transform: translateY(20px) scale(0.95);
        pointer-events: none;
      }
    }

    /* ===== Header ===== */
    .assistant-header {
      flex-shrink: 0;
      padding: 1.25rem 1.5rem;
      border-bottom: 1px solid var(--assistant-border, rgba(0, 0, 0, 0.08));
      background: var(--assistant-header-bg, rgba(255, 255, 255, 0.8));
      border-radius: 20px 20px 0 0;
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

    .assistant-avatar {
      width: 40px;
      height: 40px;
      border-radius: 50%;
      background: linear-gradient(135deg, #0f62fe 0%, #0043ce 100%);
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
      box-shadow: 0 2px 8px rgba(15, 98, 254, 0.3);
    }

    .assistant-avatar svg {
      color: white;
      width: 20px;
      height: 20px;
    }

    .header-text {
      flex: 1;
      min-width: 0;
    }

    .assistant-title {
      font-size: 1rem;
      font-weight: 600;
      color: var(--assistant-text-primary, #161616);
      margin: 0 0 0.125rem 0;
      line-height: 1.4;
    }

    .assistant-subtitle {
      font-size: 0.75rem;
      color: var(--assistant-text-secondary, #6b6b6b);
      margin: 0;
      line-height: 1.4;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .close-button {
      color: var(--assistant-text-secondary, #6b6b6b) !important;
      min-width: 32px;
      padding: 0.5rem;
      border-radius: 8px;
      transition: all 0.2s ease;
      flex-shrink: 0;
    }

    .close-button:hover {
      background: var(--assistant-hover-bg, rgba(0, 0, 0, 0.05));
      color: var(--assistant-text-primary, #161616) !important;
    }

    /* ===== Body ===== */
    .assistant-body {
      flex: 1;
      display: flex;
      flex-direction: column;
      overflow: hidden;
      min-height: 0;
    }

    .messages-container {
      flex: 1;
      overflow-y: auto;
      padding: 1.5rem;
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
      background: var(--assistant-scrollbar, rgba(0, 0, 0, 0.2));
      border-radius: 3px;
    }

    .messages-container::-webkit-scrollbar-thumb:hover {
      background: var(--assistant-scrollbar-hover, rgba(0, 0, 0, 0.3));
    }

    /* Welcome State */
    .welcome-state {
      display: flex;
      flex-direction: column;
      align-items: center;
      text-align: center;
      padding: 2rem 1rem;
    }

    .welcome-icon {
      width: 64px;
      height: 64px;
      border-radius: 50%;
      background: linear-gradient(135deg, rgba(15, 98, 254, 0.1) 0%, rgba(15, 98, 254, 0.05) 100%);
      display: flex;
      align-items: center;
      justify-content: center;
      margin-bottom: 1.5rem;
      color: var(--assistant-accent, #0f62fe);
    }

    .welcome-title {
      font-size: 1.125rem;
      font-weight: 600;
      color: var(--assistant-text-primary, #161616);
      margin: 0 0 0.5rem 0;
    }

    .welcome-description {
      font-size: 0.875rem;
      color: var(--assistant-text-secondary, #6b6b6b);
      margin: 0 0 2rem 0;
      line-height: 1.6;
      max-width: 320px;
    }

    .suggestions-section {
      width: 100%;
      max-width: 360px;
    }

    .suggestions-label {
      font-size: 0.75rem;
      font-weight: 600;
      color: var(--assistant-text-secondary, #6b6b6b);
      margin: 0 0 0.75rem 0;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }

    .suggestions-grid {
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
    }

    .suggestion-chip {
      padding: 0.75rem 1rem;
      background: var(--assistant-chip-bg, rgba(15, 98, 254, 0.08));
      border: 1px solid var(--assistant-chip-border, rgba(15, 98, 254, 0.15));
      border-radius: 12px;
      color: var(--assistant-accent, #0f62fe);
      font-size: 0.875rem;
      text-align: left;
      cursor: pointer;
      transition: all 0.2s ease;
      width: 100%;
    }

    .suggestion-chip:hover {
      background: var(--assistant-chip-hover, rgba(15, 98, 254, 0.12));
      border-color: var(--assistant-accent, #0f62fe);
      transform: translateX(4px);
    }

    .suggestion-chip:active {
      transform: translateX(2px);
    }

    .suggestion-text {
      display: block;
    }

    /* Messages */
    .message {
      display: flex;
      gap: 0.75rem;
      align-items: flex-start;
      animation: messageSlideIn 0.3s ease-out;
    }

    @keyframes messageSlideIn {
      from {
        opacity: 0;
        transform: translateY(8px);
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
      width: 32px;
      height: 32px;
      border-radius: 50%;
      background: linear-gradient(135deg, #0f62fe 0%, #0043ce 100%);
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
      box-shadow: 0 2px 4px rgba(15, 98, 254, 0.2);
    }

    .message.user .message-avatar {
      display: none;
    }

    .message-avatar svg {
      color: white;
      width: 16px;
      height: 16px;
    }

    .message-content {
      max-width: 75%;
      display: flex;
      flex-direction: column;
      gap: 0.25rem;
    }

    .message.user .message-content {
      align-items: flex-end;
    }

    .message-text {
      padding: 0.75rem 1rem;
      border-radius: 16px;
      font-size: 0.875rem;
      line-height: 1.5;
      word-wrap: break-word;
    }

    .message.user .message-text {
      background: linear-gradient(135deg, #0f62fe 0%, #0043ce 100%);
      color: white;
      border-bottom-right-radius: 4px;
      box-shadow: 0 2px 8px rgba(15, 98, 254, 0.3);
    }

    .message.assistant .message-text {
      background: var(--assistant-message-bg, rgba(0, 0, 0, 0.04));
      color: var(--assistant-text-primary, #161616);
      border-bottom-left-radius: 4px;
    }

    .message-time {
      font-size: 0.6875rem;
      color: var(--assistant-text-secondary, #6b6b6b);
      padding: 0 0.5rem;
    }

    .typing-indicator {
      display: flex;
      gap: 0.375rem;
      padding: 0.75rem 1rem;
      background: var(--assistant-message-bg, rgba(0, 0, 0, 0.04));
      border-radius: 16px;
      border-bottom-left-radius: 4px;
    }

    .typing-indicator span {
      width: 8px;
      height: 8px;
      border-radius: 50%;
      background: var(--assistant-text-secondary, #6b6b6b);
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
        transform: translateY(-6px);
      }
    }

    /* ===== Input Section ===== */
    .input-section {
      flex-shrink: 0;
      padding: 1rem 1.5rem 1.5rem;
      border-top: 1px solid var(--assistant-border, rgba(0, 0, 0, 0.08));
      background: var(--assistant-input-bg, rgba(255, 255, 255, 0.6));
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

    /* ===== Dark Mode Support ===== */
    @media (prefers-color-scheme: dark) {
      .assistant-panel {
        --assistant-panel-bg: rgba(26, 26, 26, 0.95);
        --assistant-header-bg: rgba(26, 26, 26, 0.8);
        --assistant-border: rgba(255, 255, 255, 0.1);
        --assistant-text-primary: #f4f4f4;
        --assistant-text-secondary: #a8a8a8;
        --assistant-hover-bg: rgba(255, 255, 255, 0.1);
        --assistant-scrollbar: rgba(255, 255, 255, 0.2);
        --assistant-scrollbar-hover: rgba(255, 255, 255, 0.3);
        --assistant-message-bg: rgba(255, 255, 255, 0.08);
        --assistant-input-bg: rgba(26, 26, 26, 0.6);
        --assistant-chip-bg: rgba(15, 98, 254, 0.15);
        --assistant-chip-border: rgba(15, 98, 254, 0.25);
        --assistant-chip-hover: rgba(15, 98, 254, 0.2);
        --assistant-accent: #4589ff;
      }
    }

    /* ===== Responsive ===== */
    @media (max-width: 768px) {
      .assistant-fab {
        bottom: 1rem !important;
        right: 1rem !important;
        top: auto !important;
        left: auto !important;
        width: 56px;
        height: 56px;
      }

      .assistant-panel {
        bottom: 0;
        right: 0;
        left: 0;
        width: 100%;
        height: 100%;
        max-width: 100%;
        max-height: 100%;
        border-radius: 0;
      }

      .assistant-header {
        border-radius: 0;
      }
    }
  `]
})
export class AiChatDockComponent implements OnInit, OnDestroy {
  private aiAssistant = inject(AiAssistantService);
  private router = inject(Router);
  private destroy$ = new Subject<void>();

  @ViewChild('messagesContainer', { static: false }) messagesContainer?: ElementRef<HTMLDivElement>;
  @ViewChild('inputRef', { static: false }) inputRef?: ElementRef<HTMLInputElement>;

  // State signals
  isExpanded = signal(false);
  isSlidingUp = signal(false);
  isSlidingDown = signal(false);
  isAnimating = signal(false);
  inputMessage = '';
  sending = signal(false);
  messages = signal<ChatMessage[]>([]);
  contextInsightId?: string;
  currentRoute = signal<string>('');

  // Computed signals
  currentContext = computed(() => {
    const route = this.currentRoute();
    return this.getContextLabel(route);
  });

  contextualSuggestions = computed(() => {
    const route = this.currentRoute();
    return this.getContextualSuggestions(route);
  });

  hasProactiveSuggestions = computed(() => {
    // Placeholder: Check if assistant has proactive suggestions
    // In future, this could check for new insights, alerts, etc.
    return this.contextualSuggestions().length > 0 && !this.isExpanded();
  });

  constructor() {
    // Effect to handle auto-scroll when messages change
    effect(() => {
      if (this.messages().length > 0 && this.isExpanded()) {
        setTimeout(() => this.scrollToBottom(), 100);
      }
    });
  }

  ngOnInit() {
    // Subscribe to chat messages
    this.aiAssistant.chatMessages$.pipe(
      takeUntil(this.destroy$)
    ).subscribe(messages => {
      this.messages.set(messages);
    });

    // Track route changes for contextual suggestions
    this.router.events.pipe(
      filter(event => event instanceof NavigationEnd),
      takeUntil(this.destroy$)
    ).subscribe(() => {
      this.currentRoute.set(this.router.url);
    });

    // Set initial route
    this.currentRoute.set(this.router.url);
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }

  // ===== UI Logic =====
  openAssistant() {
    this.isSlidingDown.set(false);
    this.isSlidingUp.set(true);
    this.isExpanded.set(true);
    
    // Focus input after animation
    setTimeout(() => {
      this.inputRef?.nativeElement.focus();
      this.isSlidingUp.set(false);
    }, 400);
  }

  closeAssistant() {
    this.isSlidingUp.set(false);
    this.isSlidingDown.set(true);
    
    setTimeout(() => {
      this.isExpanded.set(false);
      this.isSlidingDown.set(false);
    }, 300);
  }

  selectSuggestion(text: string) {
    this.inputMessage = text;
    this.inputRef?.nativeElement.focus();
    // Optionally auto-send
    // this.sendMessage();
  }

  onEnterKey(event: Event) {
    const keyboardEvent = event as KeyboardEvent;
    if (keyboardEvent.key === 'Enter' && !keyboardEvent.shiftKey) {
      keyboardEvent.preventDefault();
      this.sendMessage();
    }
  }

  // ===== Chat Logic (Separated) =====
  sendMessage() {
    const message = this.inputMessage.trim();
    if (!message || this.sending()) return;

    this.inputMessage = '';
    this.sending.set(true);

    const context = this.contextInsightId ? { insightId: this.contextInsightId } : undefined;
    
    // Use placeholder method for future AI integration
    this.sendChatMessage(message, context).subscribe({
      next: () => {
        this.sending.set(false);
      },
      error: (error) => {
        console.error('Error sending message:', error);
        this.sending.set(false);
      }
    });
  }

  // Placeholder method for future backend/AI integration
  private sendChatMessage(message: string, context?: { insightId?: string }): Observable<ChatMessage> {
    // Currently uses the service, but this can be replaced with actual AI API call
    return this.aiAssistant.sendChatMessage(message, context);
  }

  formatTime(timestamp: string): string {
    const date = new Date(timestamp);
    return date.toLocaleTimeString('en-US', { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  }

  private scrollToBottom() {
    if (this.messagesContainer) {
      const element = this.messagesContainer.nativeElement;
      element.scrollTop = element.scrollHeight;
    }
  }

  // ===== Context Management =====
  setContext(insightId: string) {
    this.contextInsightId = insightId;
  }

  clearContext() {
    this.contextInsightId = undefined;
  }

  // ===== Contextual Suggestions Logic =====
  private getContextLabel(route: string): string {
    const routeMap: Record<string, string> = {
      '/': 'Dashboard',
      '/companies': 'Company Management',
      '/users': 'User Management',
      '/apis': 'API Catalog',
      '/service-accounts': 'Service Accounts',
      '/monitoring': 'Monitoring',
      '/compliance': 'Compliance',
      '/admin/companies': 'Admin: Companies',
      '/admin/registrations': 'Admin: Registrations',
      '/admin/audit': 'Admin: Audit Log',
      '/dev/dashboard': 'Developer Dashboard',
      '/dev/apis': 'Developer: APIs',
      '/dev/service-accounts': 'Developer: Service Accounts',
    };

    // Check exact match first
    if (routeMap[route]) {
      return routeMap[route];
    }

    // Check partial matches
    for (const [key, value] of Object.entries(routeMap)) {
      if (route.startsWith(key)) {
        return value;
      }
    }

    return '';
  }

  private getContextualSuggestions(route: string): ContextualSuggestion[] {
    const suggestions: Record<string, ContextualSuggestion[]> = {
      '/': [
        { id: '1', text: 'Show me recent insights', category: 'Overview' },
        { id: '2', text: 'What are the top risks?', category: 'Risk' },
        { id: '3', text: 'Explain the dashboard metrics', category: 'Help' },
      ],
      '/companies': [
        { id: '1', text: 'How do I add a new company?', category: 'Help' },
        { id: '2', text: 'What are the vendor requirements?', category: 'Info' },
        { id: '3', text: 'Show me high-risk companies', category: 'Filter' },
      ],
      '/users': [
        { id: '1', text: 'How do I assign roles?', category: 'Help' },
        { id: '2', text: 'What permissions does each role have?', category: 'Info' },
        { id: '3', text: 'Show me inactive users', category: 'Filter' },
      ],
      '/apis': [
        { id: '1', text: 'How do I create a new API?', category: 'Help' },
        { id: '2', text: 'Explain API policies', category: 'Info' },
        { id: '3', text: 'What are best practices for API design?', category: 'Help' },
      ],
      '/service-accounts': [
        { id: '1', text: 'How do I create a service account?', category: 'Help' },
        { id: '2', text: 'When should I rotate API keys?', category: 'Security' },
        { id: '3', text: 'Explain service account scopes', category: 'Info' },
      ],
      '/monitoring': [
        { id: '1', text: 'What metrics should I watch?', category: 'Info' },
        { id: '2', text: 'How do I set up alerts?', category: 'Help' },
        { id: '3', text: 'Explain the performance dashboard', category: 'Help' },
      ],
      '/compliance': [
        { id: '1', text: 'What compliance checks are running?', category: 'Info' },
        { id: '2', text: 'How do I resolve compliance issues?', category: 'Help' },
        { id: '3', text: 'Show me recent audit events', category: 'Filter' },
      ],
      '/admin/companies': [
        { id: '1', text: 'How do I approve a registration?', category: 'Help' },
        { id: '2', text: 'What is the review process?', category: 'Info' },
        { id: '3', text: 'Show me pending registrations', category: 'Filter' },
      ],
      '/dev/apis': [
        { id: '1', text: 'How do I deploy an API?', category: 'Help' },
        { id: '2', text: 'Explain the API editor', category: 'Help' },
        { id: '3', text: 'What are deployment best practices?', category: 'Info' },
      ],
    };

    // Check exact match first
    if (suggestions[route]) {
      return suggestions[route];
    }

    // Check partial matches
    for (const [key, value] of Object.entries(suggestions)) {
      if (route.startsWith(key)) {
        return value;
      }
    }

    // Default suggestions
    return [
      { id: '1', text: 'How can you help me?', category: 'General' },
      { id: '2', text: 'What features are available?', category: 'General' },
      { id: '3', text: 'Show me recent activity', category: 'General' },
    ];
  }
}

