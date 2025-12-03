import { Directive, ElementRef, OnInit, OnDestroy } from '@angular/core';
import { TocService } from '../services/toc.service';

@Directive({
  selector: 'h2[appDocAnchor], h3[appDocAnchor]',
  standalone: false
})
export class DocAnchorDirective implements OnInit, OnDestroy {
  constructor(
    private el: ElementRef<HTMLElement>,
    private tocService: TocService
  ) {}
  
  ngOnInit(): void {
    const element = this.el.nativeElement;
    const text = element.textContent?.trim() || '';
    
    // Only set ID if not already set
    if (!element.id || element.id.trim() === '') {
      // Generate slug from text
      const slug = this.slugify(text);
      element.id = slug;
    }
  }
  
  ngOnDestroy(): void {
    // Cleanup if needed
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
}

