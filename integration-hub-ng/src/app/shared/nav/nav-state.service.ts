import { Injectable, signal } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class NavStateService {
  private readonly STORAGE_KEY = 'nav-expanded-sections';
  
  // Signal to track expanded section IDs
  expandedSections = signal<Set<string>>(new Set(this.loadFromStorage()));

  constructor() {
    // Load persisted state on initialization
    const saved = this.loadFromStorage();
    if (saved.size > 0) {
      this.expandedSections.set(saved);
    }
  }

  isExpanded(sectionId: string): boolean {
    return this.expandedSections().has(sectionId);
  }

  toggleSection(sectionId: string): void {
    const current = new Set(this.expandedSections());
    if (current.has(sectionId)) {
      current.delete(sectionId);
    } else {
      current.add(sectionId);
    }
    this.expandedSections.set(current);
    this.saveToStorage(current);
  }

  expandSection(sectionId: string): void {
    const current = new Set(this.expandedSections());
    current.add(sectionId);
    this.expandedSections.set(current);
    this.saveToStorage(current);
  }

  collapseSection(sectionId: string): void {
    const current = new Set(this.expandedSections());
    current.delete(sectionId);
    this.expandedSections.set(current);
    this.saveToStorage(current);
  }

  private loadFromStorage(): Set<string> {
    try {
      const stored = localStorage.getItem(this.STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored) as string[];
        return new Set(parsed);
      }
    } catch (error) {
      console.warn('Failed to load nav state from localStorage', error);
    }
    return new Set();
  }

  private saveToStorage(sections: Set<string>): void {
    try {
      const array = Array.from(sections);
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(array));
    } catch (error) {
      console.warn('Failed to save nav state to localStorage', error);
    }
  }
}

