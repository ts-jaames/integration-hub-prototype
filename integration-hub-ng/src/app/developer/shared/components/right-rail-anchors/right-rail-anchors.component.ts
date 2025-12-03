import { Component, Input, OnInit, OnDestroy, inject } from '@angular/core';
import { CommonModule } from '@angular/common';

export interface Anchor {
  id: string;
  label: string;
}

@Component({
  selector: 'app-right-rail-anchors',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="right-rail">
      <nav class="anchor-nav">
        <a
          *ngFor="let anchor of anchors"
          [href]="'#' + anchor.id"
          [class.active]="activeId === anchor.id"
          (click)="scrollTo(anchor.id, $event)"
          class="anchor-link">
          {{ anchor.label }}
        </a>
      </nav>
    </div>
  `,
  styles: [`
    .right-rail {
      position: sticky;
      top: 80px;
      align-self: flex-start;
    }

    .anchor-nav {
      display: flex;
      flex-direction: column;
      gap: 0.25rem;
    }

    .anchor-link {
      padding: 0.5rem 0.75rem;
      color: var(--linear-text-secondary);
      text-decoration: none;
      font-size: 0.8125rem;
      border-radius: 6px;
      transition: all 150ms ease;
      border-left: 2px solid transparent;

      &:hover {
        color: var(--linear-text-primary);
        background: var(--linear-surface-hover);
      }

      &.active {
        color: var(--linear-accent);
        border-left-color: var(--linear-accent);
        background: var(--linear-surface-hover);
      }
    }

    @media (max-width: 991px) {
      .right-rail {
        display: none;
      }
    }
  `]
})
export class RightRailAnchorsComponent implements OnInit, OnDestroy {
  @Input() anchors: Anchor[] = [];
  
  activeId: string | null = null;
  private observer?: IntersectionObserver;

  ngOnInit() {
    this.setupScrollSpy();
  }

  ngOnDestroy() {
    if (this.observer) {
      this.observer.disconnect();
    }
  }

  scrollTo(id: string, event: Event) {
    event.preventDefault();
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }

  private setupScrollSpy() {
    const options = {
      rootMargin: '-20% 0px -60% 0px',
      threshold: 0
    };

    this.observer = new IntersectionObserver((entries) => {
      const visible = entries
        .filter(e => e.isIntersecting)
        .sort((a, b) => b.intersectionRatio - a.intersectionRatio);

      if (visible.length > 0) {
        const target = visible[0].target as HTMLElement;
        this.activeId = target.id;
      }
    }, options);

    this.anchors.forEach(anchor => {
      const element = document.getElementById(anchor.id);
      if (element) {
        this.observer?.observe(element);
      }
    });
  }
}

