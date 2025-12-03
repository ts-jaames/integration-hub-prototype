import { Component, OnInit, OnDestroy, AfterViewInit, ViewChild, ElementRef, HostListener } from '@angular/core';
import { TocService, TocHeading } from '../../services/toc.service';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-doc-layout',
  standalone: false,
  template: `
    <div class="doc-layout-wrapper">
      <div class="doc-layout-grid">
        <!-- Main Content Area -->
        <main class="doc-content" #contentArea>
          <button 
            *ngIf="showMobileTocButton"
            class="mobile-toc-button"
            (click)="openMobileToc()"
            aria-label="Open table of contents"
            type="button">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M2 4H14M2 8H14M2 12H14" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
            </svg>
            <span>Page outline</span>
          </button>
          
          <ng-content></ng-content>
        </main>
        
        <!-- Right Sidebar TOC -->
        <aside 
          *ngIf="showToc"
          class="doc-sidebar"
          [class.mobile-visible]="mobileTocOpen">
          <app-doc-toc
            [headings]="headings"
            [activeId]="activeId"
            [isMobile]="isMobile"
            [mobileOpen]="mobileTocOpen"
            (navigate)="onTocNavigate($event)"
            (closeMobile)="closeMobileToc()">
          </app-doc-toc>
        </aside>
      </div>
      
      <!-- Mobile overlay -->
      <div 
        *ngIf="isMobile && mobileTocOpen"
        class="mobile-overlay"
        (click)="closeMobileToc()"
        aria-hidden="true">
      </div>
    </div>
  `,
  styles: [`
    .doc-layout-wrapper {
      min-height: 100vh;
      // Ensure no overflow that would break sticky positioning
      overflow: visible;
    }
    
    .doc-layout-grid {
      display: flex;
      gap: 80px;
      max-width: 1400px;
      align-items: start;
      // Ensure grid items can be sticky
      position: relative;
    }
    
    .doc-content {
      grid-column: 2;
      max-width: 100%;
      color: #EAEAEA;
      line-height: 1.7;
      
      // Typography
      h1 {
        font-size: 2.5rem;
        font-weight: 600;
        color: #EAEAEA;
        margin: 0 0 1.5rem 0;
        line-height: 1.2;
        letter-spacing: -0.02em;
      }
      
      h2 {
        font-size: 1.75rem;
        font-weight: 600;
        color: #EAEAEA;
        margin: 3rem 0 1rem 0;
        padding-top: 1rem;
        line-height: 1.3;
        letter-spacing: -0.01em;
        
        &:first-of-type {
          margin-top: 2rem;
        }
      }
      
      h3 {
        font-size: 1.25rem;
        font-weight: 600;
        color: #EAEAEA;
        margin: 2rem 0 0.75rem 0;
        line-height: 1.4;
      }
      
      h4 {
        font-size: 1rem;
        font-weight: 600;
        color: rgba(234, 234, 234, 0.9);
        margin: 1.5rem 0 0.5rem 0;
      }
      
      p {
        font-size: 1rem;
        margin: 0 0 1.5rem 0;
        color: rgba(234, 234, 234, 0.9);
        max-width: 70ch;
      }
      
      // Code blocks
      pre {
        background: #111;
        border: 1px solid rgba(255, 255, 255, 0.08);
        border-radius: 6px;
        padding: 1.25rem;
        overflow-x: auto;
        margin: 1.5rem 0;
        font-size: 0.875rem;
        line-height: 1.6;
        
        code {
          background: transparent;
          padding: 0;
          border: none;
          color: #EAEAEA;
          font-family: 'Monaco', 'Menlo', 'Courier New', monospace;
        }
      }
      
      code {
        background: rgba(255, 255, 255, 0.1);
        border: 1px solid rgba(255, 255, 255, 0.08);
        border-radius: 4px;
        padding: 0.125rem 0.375rem;
        font-size: 0.875em;
        font-family: 'Monaco', 'Menlo', 'Courier New', monospace;
        color: #EAEAEA;
      }
      
      // Tables
      table {
        width: 100%;
        border-collapse: collapse;
        margin: 1.5rem 0;
        overflow-x: auto;
        display: block;
        
        thead {
          background: #151515;
          border-bottom: 1px solid rgba(255, 255, 255, 0.08);
        }
        
        th {
          padding: 0.75rem 1rem;
          text-align: left;
          font-weight: 600;
          font-size: 0.875rem;
          color: #EAEAEA;
          white-space: nowrap;
        }
        
        tbody {
          tr {
            border-bottom: 1px solid rgba(255, 255, 255, 0.08);
            
            &:last-child {
              border-bottom: none;
            }
          }
          
          td {
            padding: 0.75rem 1rem;
            font-size: 0.875rem;
            color: rgba(234, 234, 234, 0.9);
          }
        }
      }
      
      // Callouts / Info boxes
      .callout {
        background: #151515;
        border: 1px solid rgba(255, 255, 255, 0.08);
        border-left: 3px solid rgba(255, 255, 255, 0.2);
        border-radius: 6px;
        padding: 1.25rem;
        margin: 1.5rem 0;
        
        p:last-child {
          margin-bottom: 0;
        }
      }
      
      // Lists
      ul, ol {
        margin: 0 0 1.5rem 0;
        padding-left: 1.5rem;
        color: rgba(234, 234, 234, 0.9);
        
        li {
          margin: 0.5rem 0;
          line-height: 1.7;
        }
      }
      
      // Links
      a {
        color: #EAEAEA;
        text-decoration: underline;
        text-decoration-color: rgba(255, 255, 255, 0.3);
        transition: text-decoration-color 150ms ease;
        
        &:hover {
          text-decoration-color: rgba(255, 255, 255, 0.6);
        }
        
        &:focus {
          outline: 2px solid rgba(255, 255, 255, 0.5);
          outline-offset: 2px;
          border-radius: 2px;
        }
      }
      
      // Blockquotes
      blockquote {
        border-left: 3px solid rgba(255, 255, 255, 0.2);
        padding-left: 1.25rem;
        margin: 1.5rem 0;
        color: rgba(234, 234, 234, 0.8);
        font-style: italic;
      }
    }
    
    .mobile-toc-button {
      display: none;
      align-items: center;
      gap: 0.5rem;
      background: #151515;
      border: 1px solid rgba(255, 255, 255, 0.08);
      border-radius: 6px;
      padding: 0.75rem 1rem;
      color: #EAEAEA;
      font-size: 0.875rem;
      cursor: pointer;
      margin-bottom: 2rem;
      transition: all 150ms ease;
      
      &:hover {
        background: rgba(21, 21, 21, 0.8);
        border-color: rgba(255, 255, 255, 0.12);
      }
      
      &:focus {
        outline: 2px solid rgba(255, 255, 255, 0.5);
        outline-offset: 2px;
      }
      
      svg {
        flex-shrink: 0;
      }
    }
    
    .doc-sidebar {
      grid-column: 3;
      position: relative;
      align-self: start;
      height: fit-content;
      // Ensure parent has enough height for sticky child
      min-height: 0;
      top: 100px;
      position: sticky;
    }
    
    .mobile-overlay {
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: rgba(0, 0, 0, 0.7);
      z-index: 999;
    }
    
    // Responsive
    @media (max-width: 1279px) {
      .doc-layout-grid {
        grid-template-columns: 1fr minmax(600px, 760px);
        gap: 2rem 3rem;
        
        &::after {
          display: none;
        }
      }
      
      .doc-sidebar {
        display: none !important;
      }
      
      .mobile-toc-button {
        display: flex;
      }
    }
    
    @media (min-width: 1280px) {
      .doc-sidebar {
        display: block !important;
      }
    }
    
    @media (max-width: 1023px) {
      .doc-layout-wrapper {
        padding: 1rem 0;
      }
      
      .doc-layout-grid {
        grid-template-columns: 1fr;
        padding: 0 1rem;
        gap: 0;
      }
      
      .doc-content {
        grid-column: 1;
        max-width: 100%;
      }
      
      .doc-sidebar.mobile-visible {
        display: block;
        position: fixed;
        top: 0;
        right: 0;
        bottom: 0;
        z-index: 1000;
        width: 320px;
        max-width: 85vw;
      }
    }
    
    @media (max-width: 767px) {
      .doc-content {
        h1 {
          font-size: 2rem;
        }
        
        h2 {
          font-size: 1.5rem;
        }
        
        h3 {
          font-size: 1.125rem;
        }
      }
    }
    
    // Reduced motion
    @media (prefers-reduced-motion: reduce) {
      * {
        animation-duration: 0.01ms !important;
        animation-iteration-count: 1 !important;
        transition-duration: 0.01ms !important;
      }
    }
  `]
})
export class DocLayoutComponent implements OnInit, AfterViewInit, OnDestroy {
  @ViewChild('contentArea') contentArea!: ElementRef<HTMLElement>;
  
  headings: TocHeading[] = [];
  activeId: string | null = null;
  showToc = false;
  showMobileTocButton = false;
  isMobile = false;
  mobileTocOpen = false;
  
  private subscriptions = new Subscription();
  private resizeObserver?: ResizeObserver;
  
  constructor(private tocService: TocService) {}
  
  ngOnInit(): void {
    // Subscribe to headings
    this.subscriptions.add(
      this.tocService.headings$.subscribe(headings => {
        this.headings = headings;
        this.showToc = headings.length >= 2;
        console.log('Headings updated:', headings.length, 'Show TOC:', this.showToc); // Debug
        this.updateMobileButtonVisibility();
      })
    );
    
    // Subscribe to active ID
    this.subscriptions.add(
      this.tocService.activeId$.subscribe(activeId => {
        this.activeId = activeId;
      })
    );
    
    // Check initial mobile state
    this.checkMobile();
    
    // Listen for resize
    this.setupResizeObserver();
  }
  
  ngAfterViewInit(): void {
    // Extract headings from content
    setTimeout(() => {
      if (this.contentArea?.nativeElement) {
        const headings = this.tocService.extractHeadings(this.contentArea.nativeElement);
        
        console.log('Extracted headings:', headings); // Debug
        
        if (headings.length > 0) {
          // Initialize scroll spy
          this.tocService.initScrollSpy(this.contentArea.nativeElement);
        }
      } else {
        console.warn('Content area not found'); // Debug
      }
    }, 100);
    
    // Handle initial hash
    if (window.location.hash) {
      const id = window.location.hash.substring(1);
      setTimeout(() => {
        this.tocService.scrollToHeading(id, false);
      }, 300);
    }
  }
  
  ngOnDestroy(): void {
    this.subscriptions.unsubscribe();
    this.tocService.destroyScrollSpy();
    if (this.resizeObserver) {
      this.resizeObserver.disconnect();
    }
  }
  
  onTocNavigate(id: string): void {
    this.tocService.scrollToHeading(id);
  }
  
  openMobileToc(): void {
    this.mobileTocOpen = true;
    document.body.style.overflow = 'hidden';
  }
  
  closeMobileToc(): void {
    this.mobileTocOpen = false;
    document.body.style.overflow = '';
  }
  
  @HostListener('window:resize')
  onResize(): void {
    this.checkMobile();
  }
  
  private checkMobile(): void {
    this.isMobile = window.innerWidth < 1024;
    this.updateMobileButtonVisibility();
  }
  
  private updateMobileButtonVisibility(): void {
    this.showMobileTocButton = this.isMobile && this.headings.length >= 2;
  }
  
  private setupResizeObserver(): void {
    if (typeof ResizeObserver !== 'undefined') {
      this.resizeObserver = new ResizeObserver(() => {
        this.checkMobile();
      });
      
      if (this.contentArea?.nativeElement) {
        this.resizeObserver.observe(this.contentArea.nativeElement);
      }
    }
  }
}

