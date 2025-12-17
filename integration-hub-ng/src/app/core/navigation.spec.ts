import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { RouterTestingModule } from '@angular/router/testing';
import { Location } from '@angular/common';
import { routes } from '../app.routes';

describe('Navigation', () => {
  let router: Router;
  let location: Location;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [
        RouterTestingModule.withRoutes(routes)
      ]
    }).compileComponents();

    router = TestBed.inject(Router);
    location = TestBed.inject(Location);
  });

  it('should navigate to dashboard on root path', async () => {
    await router.navigate(['/']);
    expect(location.path()).toBe('/');
  });

  it('should navigate to companies page', async () => {
    await router.navigate(['/companies']);
    expect(location.path()).toBe('/companies');
  });

  it('should have routes configured', () => {
    expect(routes).toBeDefined();
    expect(routes.length).toBeGreaterThan(0);
  });

  it('should have wildcard route for unknown paths', () => {
    const wildcardRoute = routes.find(r => r.path === '**');
    expect(wildcardRoute).toBeDefined();
  });
});

