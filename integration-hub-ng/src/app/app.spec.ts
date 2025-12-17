import { TestBed } from '@angular/core/testing';
import { RouterTestingModule } from '@angular/router/testing';
import { AppComponent } from './app.component';
import { AppModule } from './app.module';
import { ThemeService } from './core/theme.service';
import { RoleService } from './core/role.service';
import { SearchService } from './core/search.service';
import { AuthStateService } from './sys-admin/services/auth-state.service';
import { LoggerService } from './core/services/logger.service';
import { BehaviorSubject, of } from 'rxjs';

describe('AppComponent', () => {
  let themeService: jasmine.SpyObj<ThemeService>;
  let roleService: jasmine.SpyObj<RoleService>;
  let searchService: jasmine.SpyObj<SearchService>;
  let authState: jasmine.SpyObj<AuthStateService>;
  let logger: jasmine.SpyObj<LoggerService>;

  beforeEach(async () => {
    // Create spies for services
    const themeSubject = new BehaviorSubject<'light' | 'dark'>('light');
    const roleSubject = new BehaviorSubject<string>('system-administrator');
    const searchResultsSubject = new BehaviorSubject<any[]>([]);

    const themeServiceSpy = jasmine.createSpyObj('ThemeService', ['toggleTheme'], {
      theme$: themeSubject.asObservable()
    });
    const roleServiceSpy = jasmine.createSpyObj('RoleService', ['setRole', 'getCurrentRole'], {
      role$: roleSubject.asObservable(),
      roles: []
    });
    const searchServiceSpy = jasmine.createSpyObj('SearchService', ['updateSearchResults'], {
      searchResults$: searchResultsSubject.asObservable()
    });
    const authStateSpy = jasmine.createSpyObj('AuthStateService', ['getCurrentUser'], {
      getCurrentUser: () => ({ asReadonly: () => of({ id: '1', email: 'test@test.com', roles: [] }) })
    });
    const loggerSpy = jasmine.createSpyObj('LoggerService', ['debug', 'info', 'warn', 'error']);

    await TestBed.configureTestingModule({
      imports: [
        AppModule,
        RouterTestingModule
      ],
      providers: [
        { provide: ThemeService, useValue: themeServiceSpy },
        { provide: RoleService, useValue: roleServiceSpy },
        { provide: SearchService, useValue: searchServiceSpy },
        { provide: AuthStateService, useValue: authStateSpy },
        { provide: LoggerService, useValue: loggerSpy }
      ]
    }).compileComponents();

    themeService = TestBed.inject(ThemeService) as jasmine.SpyObj<ThemeService>;
    roleService = TestBed.inject(RoleService) as jasmine.SpyObj<RoleService>;
    searchService = TestBed.inject(SearchService) as jasmine.SpyObj<SearchService>;
    authState = TestBed.inject(AuthStateService) as jasmine.SpyObj<AuthStateService>;
    logger = TestBed.inject(LoggerService) as jasmine.SpyObj<LoggerService>;
  });

  it('should create the app', () => {
    const fixture = TestBed.createComponent(AppComponent);
    const app = fixture.componentInstance;
    expect(app).toBeTruthy();
    expect(app.title).toBe('Integration Hub');
  });

  it('should initialize with default values', () => {
    const fixture = TestBed.createComponent(AppComponent);
    const app = fixture.componentInstance;
    
    expect(app.currentRole).toBe('system-administrator');
    expect(app.showRoleSelector).toBe(false);
    expect(app.showSearchModal).toBe(false);
    expect(app.isMobileMenuOpen).toBe(false);
  });

  it('should subscribe to theme service on init', () => {
    const fixture = TestBed.createComponent(AppComponent);
    fixture.detectChanges();
    
    // Theme service should be subscribed to
    expect(themeService.theme$).toBeDefined();
  });

  it('should subscribe to role service on init', () => {
    const fixture = TestBed.createComponent(AppComponent);
    fixture.detectChanges();
    
    // Role service should be subscribed to
    expect(roleService.role$).toBeDefined();
  });
});
