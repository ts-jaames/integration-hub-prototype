import { Component, OnInit, OnDestroy, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, ActivatedRoute, NavigationEnd, RouterModule } from '@angular/router';
import { filter, map, takeUntil } from 'rxjs/operators';
import { Subject } from 'rxjs';

interface Breadcrumb {
  label: string;
  path: string;
}

@Component({
  selector: 'app-breadcrumbs',
  standalone: true,
  imports: [CommonModule, RouterModule],
  template: `
    @if (breadcrumbs().length > 0) {
      <nav class="breadcrumbs" aria-label="Breadcrumb">
        <ol class="breadcrumb-list">
          @for (crumb of breadcrumbs(); track crumb.path; let last = $last) {
            <li class="breadcrumb-item">
              @if (last) {
                <span class="breadcrumb-current">{{ crumb.label }}</span>
              } @else {
                <a [routerLink]="crumb.path" class="breadcrumb-link">{{ crumb.label }}</a>
                <svg class="breadcrumb-separator" width="12" height="12" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M7.5 5L12.5 10L7.5 15" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
                </svg>
              }
            </li>
          }
        </ol>
      </nav>
    }
  `,
  styles: [`
    .breadcrumbs {
      padding: 0;
      margin: 0;
    }
    
    .breadcrumb-list {
      display: flex;
      align-items: center;
      flex-wrap: wrap;
      gap: 0.5rem;
      list-style: none;
      margin: 0;
      padding: 0;
    }
    
    .breadcrumb-item {
      display: flex;
      align-items: center;
      gap: 0.5rem;
    }
    
    .breadcrumb-link {
      color: var(--linear-text-secondary);
      text-decoration: none;
      font-size: 0.875rem;
      transition: color 150ms ease;
      
      &:hover {
        color: var(--linear-text-primary);
      }
    }
    
    .breadcrumb-current {
      color: var(--linear-text-primary);
      font-size: 0.875rem;
      font-weight: 500;
    }
    
    .breadcrumb-separator {
      width: 12px;
      height: 12px;
      color: var(--linear-text-secondary);
      stroke-width: 1.5;
      flex-shrink: 0;
    }
  `]
})
export class BreadcrumbsComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();
  
  breadcrumbs = signal<Breadcrumb[]>([]);

  constructor(
    private router: Router,
    private route: ActivatedRoute
  ) {}

  ngOnInit() {
    // Build breadcrumbs on route change
    this.router.events.pipe(
      filter(event => event instanceof NavigationEnd),
      map(() => this.buildBreadcrumbs()),
      takeUntil(this.destroy$)
    ).subscribe(breadcrumbs => {
      this.breadcrumbs.set(breadcrumbs);
    });
    
    // Initial breadcrumbs
    this.breadcrumbs.set(this.buildBreadcrumbs());
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private buildBreadcrumbs(): Breadcrumb[] {
    const breadcrumbs: Breadcrumb[] = [];
    let route = this.route.root;
    let url = '';
    
    while (route.firstChild) {
      route = route.firstChild;
      
      const routeSnapshot = route.snapshot;
      const path = routeSnapshot.url.map(segment => segment.path).join('/');
      
      if (path) {
        url += `/${path}`;
      }
      
      // Get label from route data or generate from path
      const label = routeSnapshot.data['title'] || this.generateLabel(path || routeSnapshot.routeConfig?.path || '');
      
      if (label && path) {
        breadcrumbs.push({ label, path: url });
      } else if (label && !path && routeSnapshot.routeConfig?.path) {
        // Handle root or empty paths
        const routePath = routeSnapshot.routeConfig.path;
        if (routePath === '' || routePath === '/') {
          breadcrumbs.push({ label: 'Dashboard', path: '/' });
        } else {
          breadcrumbs.push({ label, path: url || '/' });
        }
      }
    }
    
    // If no breadcrumbs, add home
    if (breadcrumbs.length === 0) {
      breadcrumbs.push({ label: 'Dashboard', path: '/' });
    }
    
    return breadcrumbs;
  }

  private generateLabel(path: string): string {
    if (!path) return '';
    
    // Handle special cases
    if (path === '' || path === '/') return 'Dashboard';
    
    // Convert kebab-case to Title Case
    return path
      .split('/')
      .filter(p => p)
      .map(segment => {
        // Handle dynamic segments like :id
        if (segment.startsWith(':')) {
          return segment.slice(1).replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
        }
        return segment.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
      })
      .join(' / ');
  }
}

