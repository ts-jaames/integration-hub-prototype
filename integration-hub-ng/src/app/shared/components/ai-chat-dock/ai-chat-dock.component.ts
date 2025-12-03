import { Component, OnInit, signal, computed, inject, ViewChild, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  ButtonModule,
  IconModule
} from 'carbon-components-angular';
import { AiAssistantService, ChatMessage } from '../../../core/ai-assistant.service';

@Component({
  selector: 'app-ai-chat-dock',
  standalone: true,
  imports: [CommonModule, FormsModule, ButtonModule, IconModule],
  template: `
    <div class="chat-dock" [class.expanded]="isExpanded()">
      <div class="chat-header" *ngIf="isExpanded()">
        <div class="chat-header-content">
          <span class="chat-title">AI Assistant</span>
        </div>
        <button 
          ibmButton="ghost" 
          size="sm"
          class="toggle-button"
          (click)="toggleExpanded(); $event.stopPropagation()"
          [attr.aria-label]="'Minimize chat'">
          <svg width="16" height="16" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M5 10L15 10" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
        </button>
      </div>
      
      <button 
        *ngIf="!isExpanded()"
        class="chat-fab"
        (click)="toggleExpanded()"
        [attr.aria-label]="'Open AI Assistant'">
        <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M10 2C5.58172 2 2 5.58172 2 10C2 14.4183 5.58172 18 10 18C14.4183 18 18 14.4183 18 10C18 5.58172 14.4183 2 10 2Z" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
          <path d="M10 6V14M6 10H14" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
      </button>

      <div class="chat-body" *ngIf="isExpanded()">
        <div class="messages-container" #messagesContainer>
          <div *ngIf="messages().length === 0" class="welcome-message">
            <p>I'm your AI assistant. I can help you understand insights, explain risks, and guide you through workflows.</p>
            <p class="welcome-hint">Try asking:</p>
            <ul class="suggestions-list">
              <li>"What does this insight mean?"</li>
              <li>"How do I resolve this?"</li>
              <li>"What's the business impact?"</li>
            </ul>
          </div>
          <div 
            *ngFor="let message of messages()" 
            class="message"
            [class.user]="message.role === 'user'"
            [class.assistant]="message.role === 'assistant'">
            <div class="message-content">
              <p>{{ message.content }}</p>
              <span class="message-time">{{ formatTime(message.timestamp) }}</span>
            </div>
          </div>
          <div *ngIf="sending()" class="message assistant">
            <div class="message-content">
              <div class="typing-indicator">
                <span></span>
                <span></span>
                <span></span>
              </div>
            </div>
          </div>
        </div>

        <div class="chat-input-container">
          <input
            ibmText
            [(ngModel)]="inputMessage"
            (keydown.enter)="sendMessage()"
            placeholder="Ask a question..."
            class="chat-input"
            [disabled]="sending()">
          <button 
            ibmButton="primary" 
            size="sm"
            (click)="sendMessage()"
            [disabled]="!inputMessage.trim() || sending()"
            class="send-button">
            Send
          </button>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .chat-dock {
      position: fixed;
      bottom: 1.5rem;
      right: 1.5rem;
      z-index: 100;
      transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    }

    .chat-dock:not(.expanded) {
      width: auto;
      height: auto;
    }

    .chat-dock.expanded {
      width: 380px;
      max-width: calc(100vw - 3rem);
      height: 600px;
      max-height: calc(100vh - 3rem);
      display: flex;
      flex-direction: column;
      background: rgba(255, 255, 255, 0.8);
      backdrop-filter: blur(20px) saturate(180%);
      -webkit-backdrop-filter: blur(20px) saturate(180%);
      border: 1px solid rgba(255, 255, 255, 0.3);
      border-radius: 20px;
      box-shadow: 
        0 8px 32px rgba(0, 0, 0, 0.1),
        0 2px 8px rgba(0, 0, 0, 0.05),
        inset 0 1px 0 rgba(255, 255, 255, 0.6);
    }

    .chat-fab {
      width: 56px;
      height: 56px;
      border-radius: 50%;
      background: rgba(255, 255, 255, 0.85);
      backdrop-filter: blur(20px) saturate(180%);
      -webkit-backdrop-filter: blur(20px) saturate(180%);
      border: 1px solid rgba(255, 255, 255, 0.4);
      box-shadow: 
        0 8px 24px rgba(0, 0, 0, 0.12),
        0 2px 8px rgba(0, 0, 0, 0.08),
        inset 0 1px 0 rgba(255, 255, 255, 0.7);
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
      color: var(--cds-link-primary, #0f62fe);
      padding: 0;
      margin: 0;
    }

    .chat-fab:hover {
      transform: scale(1.05);
      box-shadow: 
        0 12px 32px rgba(0, 0, 0, 0.16),
        0 4px 12px rgba(0, 0, 0, 0.12),
        inset 0 1px 0 rgba(255, 255, 255, 0.8);
    }

    .chat-fab:active {
      transform: scale(0.98);
    }

    .chat-fab svg {
      width: 24px;
      height: 24px;
    }

    .chat-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 1rem 1.25rem;
      border-bottom: 1px solid rgba(0, 0, 0, 0.08);
      cursor: default;
      flex-shrink: 0;
    }

    .chat-header-content {
      display: flex;
      flex-direction: column;
      gap: 0.25rem;
    }

    .chat-title {
      font-size: 0.9375rem;
      font-weight: 600;
      color: var(--linear-text-primary);
    }

    .toggle-button {
      color: var(--linear-text-secondary) !important;
      min-width: 32px;
      padding: 0.5rem;
      border-radius: 8px;
      transition: background 0.2s ease;
    }

    .toggle-button:hover {
      background: rgba(0, 0, 0, 0.05);
    }

    .chat-body {
      display: flex;
      flex-direction: column;
      flex: 1;
      overflow: hidden;
      min-height: 0;
    }

    .messages-container {
      flex: 1;
      overflow-y: auto;
      padding: 1.25rem;
      display: flex;
      flex-direction: column;
      gap: 1rem;
      min-height: 0;
    }

    .messages-container::-webkit-scrollbar {
      width: 6px;
    }

    .messages-container::-webkit-scrollbar-track {
      background: transparent;
    }

    .messages-container::-webkit-scrollbar-thumb {
      background: rgba(0, 0, 0, 0.2);
      border-radius: 3px;
    }

    .messages-container::-webkit-scrollbar-thumb:hover {
      background: rgba(0, 0, 0, 0.3);
    }

    .welcome-message {
      padding: 1.5rem;
      background: rgba(15, 98, 254, 0.06);
      border: 1px solid rgba(15, 98, 254, 0.12);
      border-radius: 12px;
      font-size: 0.875rem;
      color: var(--linear-text-primary);
      line-height: 1.6;
    }

    .welcome-message p {
      margin: 0 0 0.75rem 0;
    }

    .welcome-message p:last-child {
      margin-bottom: 0;
    }

    .welcome-hint {
      font-weight: 600;
      margin-top: 1rem !important;
    }

    .suggestions-list {
      margin: 0.5rem 0 0 0;
      padding-left: 1.5rem;
      list-style-type: disc;
    }

    .suggestions-list li {
      margin-bottom: 0.25rem;
      font-size: 0.8125rem;
    }

    .message {
      display: flex;
      margin-bottom: 0.5rem;
    }

    .message.user {
      justify-content: flex-end;
    }

    .message.assistant {
      justify-content: flex-start;
    }

    .message-content {
      max-width: 80%;
      padding: 0.75rem 1rem;
      border-radius: 8px;
      font-size: 0.875rem;
      line-height: 1.5;
    }

    .message.user .message-content {
      background: var(--cds-link-primary, #0f62fe);
      color: white;
      border-bottom-right-radius: 4px;
      box-shadow: 0 2px 8px rgba(15, 98, 254, 0.2);
    }

    .message.assistant .message-content {
      background: rgba(255, 255, 255, 0.6);
      backdrop-filter: blur(10px);
      border: 1px solid rgba(0, 0, 0, 0.08);
      color: var(--linear-text-primary);
      border-bottom-left-radius: 4px;
    }

    .message-content p {
      margin: 0 0 0.5rem 0;
    }

    .message-content p:last-child {
      margin-bottom: 0;
    }

    .message-time {
      display: block;
      font-size: 0.75rem;
      opacity: 0.7;
      margin-top: 0.5rem;
    }

    .typing-indicator {
      display: flex;
      gap: 0.25rem;
      padding: 0.5rem 0;
    }

    .typing-indicator span {
      width: 8px;
      height: 8px;
      border-radius: 50%;
      background: var(--linear-text-secondary);
      animation: typing 1.4s infinite;
    }

    .typing-indicator span:nth-child(2) {
      animation-delay: 0.2s;
    }

    .typing-indicator span:nth-child(3) {
      animation-delay: 0.4s;
    }

    @keyframes typing {
      0%, 60%, 100% {
        opacity: 0.3;
        transform: translateY(0);
      }
      30% {
        opacity: 1;
        transform: translateY(-4px);
      }
    }

    .chat-input-container {
      display: flex;
      gap: 0.5rem;
      padding: 1rem 1.25rem;
      border-top: 1px solid rgba(0, 0, 0, 0.08);
      background: rgba(255, 255, 255, 0.5);
      backdrop-filter: blur(10px);
      flex-shrink: 0;
    }

    .chat-input {
      flex: 1;
    }

    .send-button {
      flex-shrink: 0;
    }

    @media (max-width: 768px) {
      .chat-dock {
        right: 1rem;
        bottom: 1rem;
      }

      .chat-dock.expanded {
        width: calc(100vw - 2rem);
        height: calc(100vh - 4rem);
        max-height: calc(100vh - 4rem);
      }

      .chat-fab {
        width: 52px;
        height: 52px;
      }
    }
  `]
})
export class AiChatDockComponent implements OnInit {
  private aiAssistant = inject(AiAssistantService);

  @ViewChild('messagesContainer', { static: false }) messagesContainer?: ElementRef<HTMLDivElement>;

  isExpanded = signal(false);
  inputMessage = '';
  sending = signal(false);
  messages = signal<ChatMessage[]>([]);
  contextInsightId?: string;

  ngOnInit() {
    this.aiAssistant.chatMessages$.subscribe(messages => {
      this.messages.set(messages);
      setTimeout(() => this.scrollToBottom(), 100);
    });
  }

  toggleExpanded() {
    this.isExpanded.set(!this.isExpanded());
    if (this.isExpanded()) {
      setTimeout(() => this.scrollToBottom(), 100);
    }
  }

  sendMessage() {
    const message = this.inputMessage.trim();
    if (!message || this.sending()) return;

    this.inputMessage = '';
    this.sending.set(true);

    const context = this.contextInsightId ? { insightId: this.contextInsightId } : undefined;
    this.aiAssistant.sendChatMessage(message, context).subscribe(() => {
      this.sending.set(false);
      setTimeout(() => this.scrollToBottom(), 100);
    });
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

  setContext(insightId: string) {
    this.contextInsightId = insightId;
  }

  clearContext() {
    this.contextInsightId = undefined;
  }
}

