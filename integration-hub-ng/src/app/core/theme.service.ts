import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';

export type Theme = 'light' | 'dark';

@Injectable({
  providedIn: 'root'
})
export class ThemeService {
  private themeSubject = new BehaviorSubject<Theme>(this.getInitialTheme());
  public theme$: Observable<Theme> = this.themeSubject.asObservable();

  constructor() {
    // Apply initial theme
    this.applyTheme(this.getInitialTheme());
  }

  private getInitialTheme(): Theme {
    // Check localStorage first
    const savedTheme = localStorage.getItem('theme') as Theme;
    if (savedTheme === 'light' || savedTheme === 'dark') {
      return savedTheme;
    }
    
    // Default to dark theme
    return 'dark';
  }

  getCurrentTheme(): Theme {
    return this.themeSubject.value;
  }

  toggleTheme(): void {
    const newTheme = this.themeSubject.value === 'light' ? 'dark' : 'light';
    this.setTheme(newTheme);
  }

  setTheme(theme: Theme): void {
    this.themeSubject.next(theme);
    localStorage.setItem('theme', theme);
    this.applyTheme(theme);
  }

  private applyTheme(theme: Theme): void {
    const root = document.documentElement;
    const body = document.body;
    
    // Add theme class to html and body for global theme application
    root.classList.remove('theme-light', 'theme-dark');
    body.classList.remove('theme-light', 'theme-dark');
    root.classList.add(`theme-${theme}`);
    body.classList.add(`theme-${theme}`);
    
    if (theme === 'dark') {
      // Modern dark theme colors
      root.style.setProperty('--linear-bg', '#060e19');
      root.style.setProperty('--linear-surface', '#09132185');
      root.style.setProperty('--linear-surface-hover', '#222223');
      root.style.setProperty('--linear-border', '#2A2A2C');
      root.style.setProperty('--linear-text-primary', '#FAFAFA');
      root.style.setProperty('--linear-text-secondary', '#9A9A9C');
      root.style.setProperty('--linear-accent', '#3B82F6');
      root.style.setProperty('--linear-accent-hover', '#60A5FA');
    } else {
      // Light theme colors - off-white background with dark gray text
      root.style.setProperty('--linear-bg', '#FAF9F6');
      root.style.setProperty('--linear-surface', '#FFFFFF');
      root.style.setProperty('--linear-surface-hover', '#F5F4F1');
      root.style.setProperty('--linear-border', '#E5E4E0');
      root.style.setProperty('--linear-text-primary', '#262626');
      root.style.setProperty('--linear-text-secondary', '#6B6B6B');
      root.style.setProperty('--linear-accent', '#3B82F6');
      root.style.setProperty('--linear-accent-hover', '#2563EB');
    }
    
    // Update Carbon theme variables
    root.style.setProperty('--cds-background', root.style.getPropertyValue('--linear-bg'));
    root.style.setProperty('--cds-layer-01', root.style.getPropertyValue('--linear-surface'));
    root.style.setProperty('--cds-layer-02', root.style.getPropertyValue('--linear-surface-hover'));
    root.style.setProperty('--cds-text-primary', root.style.getPropertyValue('--linear-text-primary'));
    root.style.setProperty('--cds-text-secondary', root.style.getPropertyValue('--linear-text-secondary'));
    root.style.setProperty('--cds-border-subtle-01', root.style.getPropertyValue('--linear-border'));
    root.style.setProperty('--cds-button-primary', root.style.getPropertyValue('--linear-accent'));
    root.style.setProperty('--cds-button-primary-hover', root.style.getPropertyValue('--linear-accent-hover'));
  }
}

