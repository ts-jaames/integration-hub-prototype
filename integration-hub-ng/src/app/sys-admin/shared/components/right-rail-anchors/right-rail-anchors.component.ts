import { Component, Input, OnInit, OnDestroy, HostListener, inject } from '@angular/core';
import { CommonModule, DOCUMENT } from '@angular/common';
import { Router } from '@angular/router';

export interface Anchor {
  id: string;
  label: string;
}

@Component({
  selector: 'app-right-rail-anchors',
  standalone: true,
  imports: [CommonModule],
  template: `
    <nav class="right-rail-anchors" [class.mobile-open]="mobileOpen">
      <div class="anchors-header" *ngIf="isMobile">
        <button class="close-button" (click)="mobileOpen = false" aria-label="Close navigation">
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <path d="M12 4L4 12M4 4L12 12" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
          </svg>
        </button>
      </div>
      <ul class="anchors-list">
        <li *ngFor="let anchor of anchors" [class.active]="activeAnchor === anchor.id">
          <a 
            [href]="'#' + anchor.id"
            (click)="scrollToAnchor($event, anchor.id)">
            {{ anchor.label }}
          </a>
        </li>
      </ul>
    </nav>
  `,
  styles: [`
    .right-rail-anchors {
      position: sticky;
      top: 80px;
      align-self: start;
      max-height: calc(100vh - 80px);
      overflow-y: auto;
      padding: 0 0 2rem 1.5rem;
      border-left: 1px solid rgba(0, 0, 0, 0.08);
      min-width: 280px;
      max-width: 280px;
    }

    .anchors-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 1rem;
      padding-bottom: 0.75rem;
      border-bottom: 1px solid rgba(0, 0, 0, 0.08);
    }

    .anchors-header h3 {
      font-size: 0.875rem;
      font-weight: 600;
      color: var(--linear-text-primary);
      margin: 0;
    }

    .close-button {
      background: transparent;
      border: none;
      color: var(--linear-text-secondary);
      cursor: pointer;
      padding: 0.25rem;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .anchors-list {
      list-style: none;
      padding: 0;
      margin: 0;
    }

    .anchors-list li {
      margin: 0;
      padding: 0;
    }

    .anchors-list a {
      display: block;
      padding: 0.5rem 0;
      color: var(--linear-text-secondary);
      text-decoration: none;
      font-size: 0.875rem;
      transition: color 150ms ease;
      border-left: 2px solid transparent;
      padding-left: 0.75rem;
      margin-left: -0.75rem;
    }

    .anchors-list a:hover {
      color: var(--linear-text-primary);
    }

    .anchors-list li.active a {
      color: var(--linear-accent);
      border-left-color: var(--linear-accent);
      font-weight: 500;
    }

    @media (max-width: 991px) {
      .right-rail-anchors {
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: var(--linear-bg);
        z-index: 1000;
        padding: 1.5rem;
        border-left: none;
        max-height: 100vh;
        transform: translateX(100%);
        transition: transform 200ms ease;
        max-width: 100%;
      }

      .right-rail-anchors.mobile-open {
        transform: translateX(0);
      }
    }
  `]
})
export class RightRailAnchorsComponent implements OnInit, OnDestroy {
  @Input() anchors: Anchor[] = [];
  
  activeAnchor = '';
  isMobile = false;
  mobileOpen = false;
  
  private document = inject(DOCUMENT);
  private scrollListener?: () => void;

  ngOnInit() {
    this.checkMobile();
    this.setupScrollListener();
    
    window.addEventListener('resize', () => this.checkMobile());
  }

  ngOnDestroy() {
    if (this.scrollListener) {
      this.document.removeEventListener('scroll', this.scrollListener, true);
    }
    window.removeEventListener('resize', () => this.checkMobile());
  }

  private checkMobile() {
    this.isMobile = window.innerWidth < 992;
  }

  private setupScrollListener() {
    this.scrollListener = () => {
      const scrollPosition = window.scrollY + 100;
      
      for (let i = this.anchors.length - 1; i >= 0; i--) {
        const element = this.document.getElementById(this.anchors[i].id);
        if (element) {
          const offsetTop = element.offsetTop;
          if (scrollPosition >= offsetTop) {
            this.activeAnchor = this.anchors[i].id;
            break;
          }
        }
      }
    };
    
    this.document.addEventListener('scroll', this.scrollListener, true);
    this.scrollListener(); // Initial check
  }

  scrollToAnchor(event: Event, anchorId: string) {
    event.preventDefault();
    const element = this.document.getElementById(anchorId);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' });
      this.activeAnchor = anchorId;
      if (this.isMobile) {
        this.mobileOpen = false;
      }
    }
  }
}

