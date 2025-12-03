import { Component, Input, Output, EventEmitter, OnInit, OnDestroy, AfterViewChecked, ViewChild, ElementRef, HostListener } from '@angular/core';
import { TocHeading, TocService } from '../../services/toc.service';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-doc-toc',
  standalone: false,
  template: `
    <nav class="doc-toc" [class.mobile-open]="mobileOpen" [attr.aria-label]="'Table of contents'">

        <button 
          *ngIf="isMobile"
          class="toc-close"
          (click)="closeMobile.emit()"
          aria-label="Close table of contents"
          type="button">
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M12 4L4 12M4 4L12 12" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
          </svg>
        </button>

      
      <ul class="toc-list" #tocList>
        <li 
          *ngFor="let heading of headings; trackBy: trackByHeading"
          [class]="'toc-item toc-level-' + heading.level"
          [class.active]="activeId === heading.id">
          <a
            [href]="'#' + heading.id"
            [attr.aria-current]="activeId === heading.id ? 'true' : null"
            [class.active]="activeId === heading.id"
            (click)="handleClick($event, heading.id)"
            class="toc-link">
            {{ heading.text }}
          </a>
        </li>
      </ul>
      
      <div *ngIf="headings.length === 0" class="toc-empty">
        No headings found
      </div>
    </nav>
  `,
  styles: [`
    .doc-toc {
      position: -webkit-sticky; // Safari support
      position: sticky;
      top: 2rem;
      align-self: start;
      max-height: calc(100vh - 4rem);
      overflow-y: auto;
      overflow-x: hidden;
      padding: 0 0 2rem 1.5rem;
      border-left: 1px solid var(--linear-border);
      min-width: 280px;
      max-width: 320px;
      // Ensure smooth scrolling
      scroll-behavior: smooth;
      // Ensure it stays on screen
      z-index: 10;
      // Ensure it's a block element
      display: block;
      width: 100%;
      // Force hardware acceleration
      will-change: transform;
    }
    
    .toc-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 1.5rem;
      padding-bottom: 0.75rem;
      border-bottom: 1px solid rgba(255, 255, 255, 0.08);
    }
    
    .toc-title {
      font-size: 0.75rem;
      font-weight: 600;
      color: rgba(234, 234, 234, 0.64);
      text-transform: uppercase;
      letter-spacing: 0.05em;
      margin: 0;
    }
    
    .toc-close {
      background: transparent;
      border: none;
      color: rgba(234, 234, 234, 0.64);
      cursor: pointer;
      padding: 0.25rem;
      display: flex;
      align-items: center;
      justify-content: center;
      border-radius: 4px;
      transition: all 150ms ease;
      
      &:hover {
        color: #EAEAEA;
        background: rgba(255, 255, 255, 0.05);
      }
      
      &:focus {
        outline: 2px solid rgba(255, 255, 255, 0.5);
        outline-offset: 2px;
      }
    }
    
    .toc-list {
      list-style: none;
      padding: 0;
      margin: 0;
    }
    
    .toc-item {
      margin: 0;
      padding: 0;
    }
    
    .toc-link {
      display: block;
      padding: 0.375rem 0;
      color: rgba(234, 234, 234, 0.64);
      text-decoration: none;
      font-size: 0.875rem;
      line-height: 1.5;
      transition: color 150ms ease;
      border-radius: 4px;
      position: relative;
      
      &:hover {
        color: #EAEAEA;
      }
      
      &:focus {
        outline: 2px solid rgba(255, 255, 255, 0.5);
        outline-offset: 2px;
        color: #EAEAEA;
      }
      
      &.active {
        color: #EAEAEA;
        font-weight: 600;
        
        &::before {
          content: '';
          position: absolute;
          left: -1.5rem;
          top: 50%;
          transform: translateY(-50%);
          width: 2px;
          height: 1.25rem;
          background: #EAEAEA;
          border-radius: 1px;
        }
      }
    }
    
    .toc-level-3 .toc-link {
      padding-left: 1rem;
      font-size: 0.8125rem;
    }
    
    .toc-empty {
      color: rgba(234, 234, 234, 0.4);
      font-size: 0.875rem;
      font-style: italic;
      padding: 1rem 0;
    }
    
    // Mobile styles
    @media (max-width: 1023px) {
      .doc-toc {
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: #0E0E0E;
        z-index: 1000;
        padding: 1.5rem;
        border-left: none;
        max-height: 100dvh;
        transform: translateX(100%);
        transition: transform 200ms ease;
        
        &.mobile-open {
          transform: translateX(0);
        }
      }
      
      .toc-header {
        margin-bottom: 1.5rem;
      }
    }
  `]
})
export class DocTocComponent implements OnInit, OnDestroy, AfterViewChecked {
  @Input() headings: TocHeading[] = [];
  @Input() activeId: string | null = null;
  @Input() isMobile: boolean = false;
  @Input() mobileOpen: boolean = false;
  @Output() navigate = new EventEmitter<string>();
  @Output() closeMobile = new EventEmitter<void>();
  
  @ViewChild('tocList') tocList!: ElementRef<HTMLUListElement>;
  
  private subscriptions = new Subscription();
  private focusedIndex = -1;
  
  ngOnInit(): void {
    // Handle keyboard navigation
    this.setupKeyboardNavigation();
  }
  
  ngOnDestroy(): void {
    this.subscriptions.unsubscribe();
  }
  
  handleClick(event: Event, id: string): void {
    event.preventDefault();
    this.navigate.emit(id);
    
    if (this.isMobile) {
      this.closeMobile.emit();
    }
  }
  
  trackByHeading(index: number, heading: TocHeading): string {
    return heading.id;
  }
  
  @HostListener('keydown', ['$event'])
  onKeyDown(event: KeyboardEvent): void {
    if (this.headings.length === 0) return;
    
    const links = Array.from(this.tocList.nativeElement.querySelectorAll<HTMLAnchorElement>('.toc-link'));
    
    switch (event.key) {
      case 'ArrowDown':
        event.preventDefault();
        this.focusedIndex = Math.min(this.focusedIndex + 1, links.length - 1);
        links[this.focusedIndex]?.focus();
        break;
        
      case 'ArrowUp':
        event.preventDefault();
        this.focusedIndex = Math.max(this.focusedIndex - 1, 0);
        links[this.focusedIndex]?.focus();
        break;
        
      case 'Enter':
      case ' ':
        if (this.focusedIndex >= 0 && links[this.focusedIndex]) {
          event.preventDefault();
          const id = links[this.focusedIndex].getAttribute('href')?.substring(1);
          if (id) {
            this.navigate.emit(id);
            if (this.isMobile) {
              this.closeMobile.emit();
            }
          }
        }
        break;
        
      case 'Home':
        event.preventDefault();
        this.focusedIndex = 0;
        links[0]?.focus();
        break;
        
      case 'End':
        event.preventDefault();
        this.focusedIndex = links.length - 1;
        links[this.focusedIndex]?.focus();
        break;
    }
  }
  
  private setupKeyboardNavigation(): void {
    // Track focus index when user tabs through links
    const links = this.tocList?.nativeElement?.querySelectorAll<HTMLAnchorElement>('.toc-link');
    if (links) {
      Array.from(links).forEach((link, index) => {
        link.addEventListener('focus', () => {
          this.focusedIndex = index;
        });
      });
    }
  }
  
  ngAfterViewChecked(): void {
    // Scroll active item into view within sidebar
    if (this.activeId && this.tocList?.nativeElement) {
      const activeLink = this.tocList.nativeElement.querySelector<HTMLAnchorElement>(`a[href="#${this.activeId}"]`);
      if (activeLink) {
        // Only scroll if not already visible
        const linkRect = activeLink.getBoundingClientRect();
        const listRect = this.tocList.nativeElement.getBoundingClientRect();
        
        if (linkRect.top < listRect.top || linkRect.bottom > listRect.bottom) {
          activeLink.scrollIntoView({
            behavior: 'smooth',
            block: 'nearest'
          });
        }
      }
    }
  }
}

