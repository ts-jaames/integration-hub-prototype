import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-code-block',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="code-block-wrapper">
      <button 
        class="code-block-copy-button"
        (click)="copyToClipboard()"
        [attr.aria-label]="copied ? 'Copied!' : 'Copy code'"
        type="button">
        <svg *ngIf="!copied" width="16" height="16" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M8 2C7.44772 2 7 2.44772 7 3V5H5C3.89543 5 3 5.89543 3 7V15C3 16.1046 3.89543 17 5 17H13C14.1046 17 15 16.1046 15 15V13H17C17.5523 13 18 12.5523 18 12V3C18 2.44772 17.5523 2 17 2H8Z" fill="currentColor" fill-opacity="0.6"/>
          <path d="M13 5H17V12H13V5ZM5 7H13V15H5V7Z" fill="currentColor"/>
        </svg>
        <svg *ngIf="copied" width="16" height="16" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M7 10L9 12L13 8" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
      </button>
      <pre class="code-block"><code>{{ code }}</code></pre>
    </div>
  `,
  styles: [`
    .code-block-wrapper {
      position: relative;
      margin: 1.5rem 0;
      border: 1px solid var(--linear-border, rgba(255, 255, 255, 0.1));
      border-radius: 8px;
      background: var(--linear-surface, #1A1A1B);
      overflow: hidden;
    }
    
    .code-block-copy-button {
      position: absolute;
      top: 0.75rem;
      right: 0.75rem;
      background: var(--linear-surface-hover, rgba(255, 255, 255, 0.05));
      border: 1px solid var(--linear-border, rgba(255, 255, 255, 0.1));
      border-radius: 6px;
      padding: 0.5rem;
      cursor: pointer;
      color: var(--linear-text-secondary, rgba(255, 255, 255, 0.7));
      display: flex;
      align-items: center;
      justify-content: center;
      transition: all 150ms ease;
      z-index: 10;
      width: 32px;
      height: 32px;
      
      &:hover {
        background: var(--linear-surface-hover, rgba(255, 255, 255, 0.08));
        border-color: var(--linear-border, rgba(255, 255, 255, 0.15));
        color: var(--linear-text-primary, #EAEAEA);
      }
      
      &:active {
        transform: scale(0.95);
      }
      
      &:focus {
        outline: 2px solid var(--linear-accent, #3B82F6);
        outline-offset: 2px;
      }
      
      svg {
        width: 16px;
        height: 16px;
        flex-shrink: 0;
      }
    }
    
    .code-block {
      margin: 0;
      padding: 1.25rem;
      background: transparent;
      border: none;
      overflow-x: auto;
      font-size: 0.875rem;
      line-height: 1.6;
      color: var(--linear-text-primary, #EAEAEA);
      font-family: 'Monaco', 'Menlo', 'Courier New', monospace;
      
      code {
        background: transparent;
        padding: 0;
        border: none;
        color: inherit;
        font-family: inherit;
        font-size: inherit;
        white-space: pre;
      }
    }
    
    // Scrollbar styling
    .code-block::-webkit-scrollbar {
      height: 8px;
    }
    
    .code-block::-webkit-scrollbar-track {
      background: transparent;
    }
    
    .code-block::-webkit-scrollbar-thumb {
      background: var(--linear-border, rgba(255, 255, 255, 0.2));
      border-radius: 4px;
      
      &:hover {
        background: var(--linear-border, rgba(255, 255, 255, 0.3));
      }
    }
  `]
})
export class CodeBlockComponent {
  @Input() code: string = '';
  
  copied = false;
  
  async copyToClipboard(): Promise<void> {
    try {
      await navigator.clipboard.writeText(this.code);
      this.copied = true;
      setTimeout(() => {
        this.copied = false;
      }, 2000);
    } catch (err) {
      console.error('Failed to copy code:', err);
      // Fallback for older browsers
      const textArea = document.createElement('textarea');
      textArea.value = this.code;
      textArea.style.position = 'fixed';
      textArea.style.opacity = '0';
      document.body.appendChild(textArea);
      textArea.select();
      try {
        document.execCommand('copy');
        this.copied = true;
        setTimeout(() => {
          this.copied = false;
        }, 2000);
      } catch (fallbackErr) {
        console.error('Fallback copy failed:', fallbackErr);
      }
      document.body.removeChild(textArea);
    }
  }
}

