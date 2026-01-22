import { Component, OnInit, HostListener, ViewChild, ElementRef, AfterViewInit } from '@angular/core';
import { Router, NavigationEnd } from '@angular/router';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { ThemeService, Theme } from './core/theme.service';
import { RoleService, UserRole, RoleConfig } from './core/role.service';
import { SearchService, SearchResult } from './core/search.service';
import { LumenIconComponent } from './shared/icons/lumen-icon.component';
import { AuthStateService } from './sys-admin/services/auth-state.service';
import { AiChatDockComponent } from './shared/components/ai-chat-dock/ai-chat-dock.component';
import { filter, debounceTime, distinctUntilChanged } from 'rxjs/operators';
import { Subject } from 'rxjs';

@Component({
  selector: 'app-root',
  standalone: false,
  templateUrl: './app.html',
  styleUrl: './app.scss'
})
export class AppComponent implements OnInit, AfterViewInit {
  @ViewChild('searchInput', { static: false }) searchInput?: ElementRef<HTMLInputElement>;
  @ViewChild('roleSelectorContainer', { static: false }) roleSelectorContainer?: ElementRef<HTMLElement>;
  @ViewChild(AiChatDockComponent, { static: false }) aiChatDock?: AiChatDockComponent;
  
  title = 'Integration Hub';
  currentTheme: Theme = 'light';
  currentRole: UserRole = 'system-administrator';
  showRoleSelector = false;
  roles: RoleConfig[] = [];
  showSearchModal = false;
  searchQuery = '';
  searchResults: SearchResult[] = [];
  selectedResultIndex = -1;
  isMobileMenuOpen = false;
  private searchSubject = new Subject<string>();

  constructor(
    public themeService: ThemeService,
    public roleService: RoleService,
    private router: Router,
    private searchService: SearchService,
    private sanitizer: DomSanitizer,
    private authState: AuthStateService
  ) {}

  ngOnInit() {
    this.themeService.theme$.subscribe(theme => {
      this.currentTheme = theme;
    });

    this.roleService.role$.subscribe(role => {
      this.currentRole = role;
      // Close dropdown when role changes
      this.showRoleSelector = false;
      // Navigate to dashboard if current route is not accessible
      this.checkRouteAccess();
    });

    this.roles = this.roleService.roles;

    // Close dropdown on route change
    this.router.events.pipe(
      filter(event => event instanceof NavigationEnd)
    ).subscribe(() => {
      this.showRoleSelector = false;
      this.closeSearchModal();
      this.closeMobileMenu();
    });

    // Setup search with debounce
    this.searchSubject.pipe(
      debounceTime(150),
      distinctUntilChanged()
    ).subscribe(query => {
      this.searchService.updateSearchResults(query);
    });

    // Subscribe to search results
    this.searchService.searchResults$.subscribe(results => {
      this.searchResults = results;
      this.selectedResultIndex = -1;
    });
  }

  @HostListener('document:click', ['$event'])
  onClickOutside(event: MouseEvent) {
    const target = event.target as HTMLElement;
    if (!target.closest('.role-selector-container')) {
      this.showRoleSelector = false;
    }
  }

  checkRouteAccess() {
    const currentUrl = this.router.url;
    const path = currentUrl.split('/')[1] || '';
    
    // Skip check for /dev routes and service-accounts as they have their own guards
    if (path === 'dev' || path === 'service-accounts') {
      return;
    }
    
    if (path && !this.canAccess(path)) {
      this.router.navigate(['/']);
    }
  }

  toggleTheme() {
    this.themeService.toggleTheme();
  }

  toggleAiAssistant() {
    this.aiChatDock?.toggleAssistant();
  }

  selectRole(role: UserRole, event?: MouseEvent) {
    if (event) {
      event.stopPropagation();
    }
    this.roleService.setRole(role);
    this.showRoleSelector = false;
  }

  toggleRoleSelector(event?: MouseEvent) {
    if (event) {
      event.stopPropagation();
    }
    this.showRoleSelector = !this.showRoleSelector;
  }

  getCurrentRoleLabel(): string {
    return this.roleService.getCurrentRoleConfig().label;
  }

  canAccess(path: string): boolean {
    switch(path) {
      case 'companies': return this.roleService.canAccessCompanies();
      case 'users': return this.roleService.canAccessUsers();
      case 'service-accounts': return this.roleService.canAccessServiceAccounts();
      case 'apis': return this.roleService.canAccessAPIs();
      case 'monitoring': return this.roleService.canAccessMonitoring();
      case 'compliance': return this.roleService.canAccessCompliance();
      case 'admin': return this.currentRole === 'system-administrator';
      case 'dev': return this.currentRole === 'developer-internal';
      default: return true;
    }
  }

  openSearchModal() {
    this.showSearchModal = true;
    this.searchQuery = '';
    this.searchResults = [];
    setTimeout(() => {
      this.searchInput?.nativeElement.focus();
    }, 100);
  }

  closeSearchModal() {
    this.showSearchModal = false;
    this.searchQuery = '';
    this.searchResults = [];
    this.selectedResultIndex = -1;
  }

  onSearchInput(event: Event) {
    const query = (event.target as HTMLInputElement).value;
    this.searchQuery = query;
    this.searchSubject.next(query);
  }

  selectResult(result: SearchResult) {
    this.router.navigate([result.route]);
    this.closeSearchModal();
  }

  highlightText(text: string, query: string): SafeHtml {
    if (!query || !text) return this.sanitizer.bypassSecurityTrustHtml(text);
    const escapedQuery = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(`(${escapedQuery})`, 'gi');
    const highlighted = text.replace(regex, '<strong>$1</strong>');
    return this.sanitizer.bypassSecurityTrustHtml(highlighted);
  }

  toggleMobileMenu(): void {
    this.isMobileMenuOpen = !this.isMobileMenuOpen;
  }

  closeMobileMenu(): void {
    this.isMobileMenuOpen = false;
  }

  closeMobileMenuOnNavigate(): void {
    // Close mobile menu when a navigation link is clicked
    if (this.isMobileMenuOpen) {
      // Use setTimeout to allow navigation to complete first
      setTimeout(() => {
        this.closeMobileMenu();
      }, 100);
    }
  }

  ngAfterViewInit() {
    // Component initialized
  }

  shouldOpenDropdownDown(): boolean {
    // Check if there's enough space above the role selector
    if (!this.roleSelectorContainer) {
      return false;
    }
    
    const container = this.roleSelectorContainer.nativeElement;
    const rect = container.getBoundingClientRect();
    const spaceAbove = rect.top;
    const spaceBelow = window.innerHeight - rect.bottom;
    
    // If there's less space above than below, open downward
    // Also check if there's very little space above (less than 200px)
    return spaceAbove < 200 || spaceAbove < spaceBelow;
  }

  @HostListener('keydown', ['$event'])
  onKeyDown(event: KeyboardEvent) {
    if (event.key === 'Escape' && this.showSearchModal) {
      this.closeSearchModal();
      return;
    }

    if (event.key === 'k' && (event.metaKey || event.ctrlKey)) {
      event.preventDefault();
      this.openSearchModal();
      return;
    }

    if (!this.showSearchModal) return;

    if (event.key === 'ArrowDown') {
      event.preventDefault();
      this.selectedResultIndex = Math.min(this.selectedResultIndex + 1, this.searchResults.length - 1);
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      this.selectedResultIndex = Math.max(this.selectedResultIndex - 1, -1);
    } else if (event.key === 'Enter' && this.selectedResultIndex >= 0) {
      event.preventDefault();
      this.selectResult(this.searchResults[this.selectedResultIndex]);
    }
  }
}

