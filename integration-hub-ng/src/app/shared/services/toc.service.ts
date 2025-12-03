import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';

export interface TocHeading {
  id: string;
  text: string;
  level: number;
  element: HTMLElement;
}

@Injectable({
  providedIn: 'root'
})
export class TocService {
  private headingsSubject = new BehaviorSubject<TocHeading[]>([]);
  public headings$: Observable<TocHeading[]> = this.headingsSubject.asObservable();
  
  private activeIdSubject = new BehaviorSubject<string | null>(null);
  public activeId$: Observable<string | null> = this.activeIdSubject.asObservable();
  
  private intersectionObserver?: IntersectionObserver;
  private headings: TocHeading[] = [];
  
  /**
   * Extract headings (h2, h3) from content area and generate TOC
   */
  extractHeadings(contentElement: HTMLElement): TocHeading[] {
    const headingElements = contentElement.querySelectorAll('h2, h3');
    const headings: TocHeading[] = [];
    const existingSlugs = new Set<string>();
    
    headingElements.forEach((element) => {
      const heading = element as HTMLElement;
      const text = heading.textContent?.trim() || '';
      const level = parseInt(heading.tagName.substring(1), 10);
      
      // Use existing ID or generate new one
      let id = heading.id;
      if (!id || id.trim() === '') {
        const baseSlug = this.slugify(text);
        id = this.generateUniqueSlug(baseSlug, existingSlugs);
        heading.id = id;
      } else {
        existingSlugs.add(id);
      }
      
      headings.push({
        id,
        text,
        level,
        element: heading
      });
    });
    
    this.headings = headings;
    this.headingsSubject.next(headings);
    return headings;
  }
  
  /**
   * Initialize scroll spy using IntersectionObserver
   */
  initScrollSpy(contentElement: HTMLElement): void {
    this.destroyScrollSpy();
    
    if (this.headings.length === 0) {
      return;
    }
    
    const options: IntersectionObserverInit = {
      rootMargin: '-80px 0px -80% 0px', // Trigger when heading is near top
      threshold: [0, 0.25, 0.5, 0.75, 1]
    };
    
    this.intersectionObserver = new IntersectionObserver((entries) => {
      // Find the most visible heading
      let mostVisibleEntry: IntersectionObserverEntry | null = null;
      let maxRatio = 0;
      
      entries.forEach((entry) => {
        if (entry.isIntersecting && entry.intersectionRatio > maxRatio) {
          maxRatio = entry.intersectionRatio;
          mostVisibleEntry = entry;
        }
      });
      
      // If we found a visible heading, use it
      if (mostVisibleEntry !== null) {
        const entry = mostVisibleEntry as IntersectionObserverEntry;
        const target = entry.target as HTMLElement;
        if (target && target.id) {
          const targetId = target.id;
          this.activeIdSubject.next(targetId || null);
          return;
        }
      }
      
      // Otherwise, check headings that are above the viewport
      const viewportTop = window.scrollY;
      let closestHeading: TocHeading | null = null;
      let minDistance = Infinity;
      
      for (const heading of this.headings) {
        const rect = heading.element.getBoundingClientRect();
        const distance = Math.abs(rect.top - viewportTop);
        
        if (rect.top <= viewportTop + 100 && distance < minDistance) {
          minDistance = distance;
          closestHeading = heading;
        }
      }
      
      // If we found a closest heading, use its ID
      if (closestHeading) {
        this.activeIdSubject.next(closestHeading.id);
      }
    }, options);
    
    // Observe all headings
    this.headings.forEach((heading) => {
      this.intersectionObserver?.observe(heading.element);
    });
  }
  
  /**
   * Scroll to a heading by ID
   */
  scrollToHeading(id: string, smooth: boolean = true): void {
    const heading = this.headings.find(h => h.id === id);
    if (!heading) return;
    
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const shouldSmooth = smooth && !prefersReducedMotion;
    
    heading.element.scrollIntoView({
      behavior: shouldSmooth ? 'smooth' : 'auto',
      block: 'start'
    });
    
    // Update URL hash
    if (history.pushState) {
      history.pushState(null, '', `#${id}`);
    } else {
      window.location.hash = id;
    }
    
    // Focus the heading for screen readers
    heading.element.setAttribute('tabindex', '-1');
    heading.element.focus();
    
    // Remove tabindex after focus
    setTimeout(() => {
      heading.element.removeAttribute('tabindex');
    }, 1000);
  }
  
  /**
   * Destroy scroll spy observer
   */
  destroyScrollSpy(): void {
    if (this.intersectionObserver) {
      this.intersectionObserver.disconnect();
      this.intersectionObserver = undefined;
    }
  }
  
  /**
   * Reset service state
   */
  reset(): void {
    this.destroyScrollSpy();
    this.headings = [];
    this.headingsSubject.next([]);
    this.activeIdSubject.next(null);
  }
  
  private slugify(text: string): string {
    return text
      .toString()
      .toLowerCase()
      .trim()
      .replace(/\s+/g, '-')
      .replace(/[^\w\-]+/g, '')
      .replace(/\-\-+/g, '-')
      .replace(/^-+/, '')
      .replace(/-+$/, '');
  }
  
  private generateUniqueSlug(baseSlug: string, existingSlugs: Set<string>): string {
    let slug = baseSlug;
    let counter = 1;
    
    while (existingSlugs.has(slug)) {
      slug = `${baseSlug}-${counter}`;
      counter++;
    }
    
    existingSlugs.add(slug);
    return slug;
  }
}

