import { Component, OnInit, OnDestroy, HostListener, ElementRef, ViewChild, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule, NavigationEnd, ActivatedRoute } from '@angular/router';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { filter, map, takeUntil } from 'rxjs/operators';
import { Subject } from 'rxjs';
import { NavStateService } from './nav-state.service';
import { NAV_SECTIONS } from './nav.config';
import { NavSection } from './nav.types';
import { RoleService } from '../../core/role.service';

@Component({
  selector: 'app-sidebar-nav',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './sidebar-nav.component.html',
  styleUrl: './sidebar-nav.component.scss'
})
export class SidebarNavComponent implements OnInit, OnDestroy {
  @ViewChild('navContainer', { static: false }) navContainer?: ElementRef<HTMLElement>;
  
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  private navState = inject(NavStateService);
  private roleService = inject(RoleService);
  private sanitizer = inject(DomSanitizer);
  private destroy$ = new Subject<void>();
  
  sections = signal<NavSection[]>(NAV_SECTIONS);
  currentPath = signal<string>('');
  focusedIndex = signal<number>(-1);
  
  // Computed: filter sections based on role and access
  visibleSections = computed(() => {
    const role = this.roleService.getCurrentRole();
    const currentPath = this.currentPath();
    
    return this.sections().filter(section => {
      // Filter sections based on role
      if (section.id === 'admin' && role !== 'system-administrator') {
        return false;
      }
      if (section.id === 'developer' && role !== 'developer-internal') {
        return false;
      }
      if (section.id === 'service-accounts' && !this.roleService.canAccessServiceAccounts()) {
        return false;
      }
      if (section.id === 'apis' && !this.roleService.canAccessAPIs()) {
        return false;
      }
      if (section.id === 'applications-apis' && !this.roleService.canAccessAPIs() && role !== 'system-administrator') {
        return false;
      }
      if (section.id === 'companies' && !this.roleService.canAccessCompanies()) {
        return false;
      }
      if (section.id === 'vendors' && role !== 'system-administrator') {
        return false;
      }
      if (section.id === 'users' && !this.roleService.canAccessUsers()) {
        return false;
      }
      if (section.id === 'users-access' && role !== 'system-administrator') {
        return false;
      }
      if (section.id === 'monitoring' && !this.roleService.canAccessMonitoring()) {
        return false;
      }
      if (section.id === 'compliance' && !this.roleService.canAccessCompliance()) {
        return false;
      }
      
      // Filter links within sections
      const visibleLinks = section.links.filter(link => {
        // Special handling for dev routes
        if (link.path.startsWith('/dev/') && role !== 'developer-internal') {
          return false;
        }
        // Special handling for admin routes
        if (link.path.startsWith('/admin/') && role !== 'system-administrator') {
          return false;
        }
        // Special handling for service-accounts at root
        if (link.path === '/service-accounts' && role !== 'developer-internal') {
          return false;
        }
        // Special handling for apis at root vs dev/apis
        if (link.path === '/apis' && role === 'developer-internal') {
          return false; // Use dev/apis instead
        }
        return true;
      });
      
      // Only show section if it has visible links
      return visibleLinks.length > 0;
    }).map(section => ({
      ...section,
      links: section.links.filter(link => {
        if (link.path.startsWith('/dev/') && role !== 'developer-internal') {
          return false;
        }
        if (link.path.startsWith('/admin/') && role !== 'system-administrator') {
          return false;
        }
        if (link.path === '/service-accounts' && role !== 'developer-internal') {
          return false;
        }
        if (link.path === '/apis' && role === 'developer-internal') {
          return false;
        }
        return true;
      })
    }));
  });
  
  // Get all focusable elements (sections + links)
  focusableElements = computed(() => {
    const elements: Array<{ type: 'section' | 'link'; sectionId?: string; linkPath?: string; index: number }> = [];
    let index = 0;
    
    this.visibleSections().forEach(section => {
      elements.push({ type: 'section', sectionId: section.id, index: index++ });
      if (this.navState.isExpanded(section.id)) {
        section.links.forEach(link => {
          elements.push({ type: 'link', sectionId: section.id, linkPath: link.path, index: index++ });
        });
      }
    });
    
    return elements;
  });

  ngOnInit() {
    // Track current route
    this.router.events.pipe(
      filter(event => event instanceof NavigationEnd),
      map(() => this.router.url),
      takeUntil(this.destroy$)
    ).subscribe(url => {
      this.currentPath.set(url);
      this.autoExpandActiveSection(url);
    });
    
    // Set initial path
    this.currentPath.set(this.router.url);
    this.autoExpandActiveSection(this.router.url);
    
    // Watch for role changes
    this.roleService.role$.pipe(
      takeUntil(this.destroy$)
    ).subscribe(() => {
      // Re-evaluate visible sections when role changes
      this.sections.set([...NAV_SECTIONS]);
    });
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }

  isExpanded(sectionId: string): boolean {
    return this.navState.isExpanded(sectionId);
  }

  toggleSection(sectionId: string, event?: Event): void {
    if (event) {
      event.preventDefault();
      event.stopPropagation();
    }
    this.navState.toggleSection(sectionId);
  }

  isLinkActive(linkPath: string): boolean {
    const current = this.currentPath();
    if (linkPath === '/') {
      return current === '/' || current === '';
    }
    return current.startsWith(linkPath);
  }

  private autoExpandActiveSection(url: string): void {
    // Find the section containing the active link
    for (const section of this.visibleSections()) {
      for (const link of section.links) {
        if (link.path === '/' && (url === '/' || url === '')) {
          this.navState.expandSection(section.id);
          return;
        }
        if (link.path !== '/' && url.startsWith(link.path)) {
          this.navState.expandSection(section.id);
          return;
        }
      }
    }
  }

  @HostListener('keydown', ['$event'])
  onKeyDown(event: KeyboardEvent): void {
    const focusable = this.focusableElements();
    if (focusable.length === 0) return;

    let currentIndex = this.focusedIndex();
    
    switch (event.key) {
      case 'ArrowDown':
        event.preventDefault();
        currentIndex = Math.min(currentIndex + 1, focusable.length - 1);
        this.focusedIndex.set(currentIndex);
        this.focusElement(focusable[currentIndex]);
        break;
        
      case 'ArrowUp':
        event.preventDefault();
        currentIndex = Math.max(currentIndex - 1, 0);
        this.focusedIndex.set(currentIndex);
        this.focusElement(focusable[currentIndex]);
        break;
        
      case 'Enter':
      case ' ':
        if (currentIndex >= 0 && currentIndex < focusable.length) {
          event.preventDefault();
          const element = focusable[currentIndex];
          if (element.type === 'section') {
            this.toggleSection(element.sectionId!);
          } else if (element.linkPath) {
            this.router.navigate([element.linkPath]);
          }
        }
        break;
        
      case 'Home':
        event.preventDefault();
        this.focusedIndex.set(0);
        this.focusElement(focusable[0]);
        break;
        
      case 'End':
        event.preventDefault();
        const lastIndex = focusable.length - 1;
        this.focusedIndex.set(lastIndex);
        this.focusElement(focusable[lastIndex]);
        break;
    }
  }

  private focusElement(element: { type: 'section' | 'link'; sectionId?: string; linkPath?: string }): void {
    // Focus will be handled by the template using tabindex
    // This is mainly for tracking the focused index
  }

  getSectionFocusIndex(sectionId: string): number {
    const focusable = this.focusableElements();
    const element = focusable.find(el => el.type === 'section' && el.sectionId === sectionId);
    return element ? element.index : -1;
  }

  getLinkFocusIndex(sectionId: string, linkPath: string): number {
    const focusable = this.focusableElements();
    const element = focusable.find(el => el.type === 'link' && el.sectionId === sectionId && el.linkPath === linkPath);
    return element ? element.index : -1;
  }

  onSectionFocus(sectionId: string): void {
    const index = this.getSectionFocusIndex(sectionId);
    if (index >= 0) {
      this.focusedIndex.set(index);
    }
  }

  onLinkFocus(sectionId: string, linkPath: string): void {
    const index = this.getLinkFocusIndex(sectionId, linkPath);
    if (index >= 0) {
      this.focusedIndex.set(index);
    }
  }

  getIconSvg(iconName?: string): SafeHtml {
    if (!iconName) return this.sanitizer.bypassSecurityTrustHtml('');
    
    const icons: Record<string, string> = {
      'dashboard': '<path d="M10 2L12 6L16 8L12 10L10 14L8 10L4 8L8 6L10 2Z" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/><path d="M10 14V18" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/><path d="M7 16L10 18L13 16" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>',
      'building': '<path d="M4 6L10 2L16 6V14L10 18L4 14V6Z" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>',
      'users': '<path d="M10 10C12.2091 10 14 8.20914 14 6C14 3.79086 12.2091 2 10 2C7.79086 2 6 3.79086 6 6C6 8.20914 7.79086 10 10 10Z" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/><path d="M3 18C3 14.6863 6.13401 12 10 12C13.866 12 17 14.6863 17 18" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>',
      'key': '<path d="M10 2L3 6V10C3 14 6.5 17.5 10 18C13.5 17.5 17 14 17 10V6L10 2Z" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/><path d="M10 10V14" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/><path d="M10 6V8" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>',
      'api': '<path d="M3 7L10 3L17 7V13L10 17L3 13V7Z" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/><path d="M10 3V17" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>',
      'chart': '<path d="M3 5H17M3 10H17M3 15H17" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>',
      'shield': '<path d="M10 2L3 6V10C3 14 6.5 17.5 10 18C13.5 17.5 17 14 17 10V6L10 2Z" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/><path d="M7 10L9 12L13 8" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>',
      'plus': '<path d="M10 3V17M3 10H17" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>',
      'document': '<path d="M4 4H16V16H4V4Z" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/><path d="M4 7H16" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>',
      'settings': '<path d="M10 2L12 4L10 6L8 4L10 2Z" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/><path d="M14 6L16 8L14 10L12 8L14 6Z" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/><path d="M6 14L8 16L6 18L4 16L6 14Z" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/><path d="M14 14L16 16L14 18L12 16L14 14Z" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/><circle cx="10" cy="10" r="2" stroke="currentColor" stroke-width="1.5" fill="none"/>',
      'support': '<path d="M10 2C5.58172 2 2 5.58172 2 10C2 14.4183 5.58172 18 10 18C14.4183 18 18 14.4183 18 10C18 5.58172 14.4183 2 10 2Z" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/><path d="M10 7V11" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/><path d="M10 13H10.01" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>'
    };
    
    return this.sanitizer.bypassSecurityTrustHtml(icons[iconName] || '');
  }
}

