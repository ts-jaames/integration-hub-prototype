# Documentation Layout Component

A reusable documentation-style layout component for the LUMEN Admin/Developer portal with automatic table of contents generation and scroll spy functionality.

## Features

- **Single-column content area** optimized for readability (70-80ch line length)
- **Auto-generated table of contents** from h2 and h3 headings
- **Scroll spy** that highlights the active section as you scroll
- **Sticky sidebar** that stays visible while scrolling
- **Responsive design** with mobile collapse
- **Accessibility** features including keyboard navigation and ARIA attributes
- **Dark theme** aligned with LUMEN design system

## Usage

### Basic Example

```typescript
import { Component } from '@angular/core';

@Component({
  selector: 'app-my-docs',
  template: `
    <app-doc-layout>
      <h1>My Documentation</h1>
      
      <p>Introduction text...</p>
      
      <h2 id="section-one">Section One</h2>
      <p>Content for section one...</p>
      
      <h3 id="subsection">Subsection</h3>
      <p>Subsection content...</p>
      
      <h2 id="section-two">Section Two</h2>
      <p>Content for section two...</p>
    </app-doc-layout>
  `
})
export class MyDocsComponent {}
```

### With Markdown Content

If you're using a markdown-to-HTML converter, simply wrap the rendered HTML:

```typescript
@Component({
  template: `
    <app-doc-layout>
      <div [innerHTML]="markdownContent | markdown"></div>
    </app-doc-layout>
  `
})
```

## Components

### `<app-doc-layout>`

Main layout wrapper component that provides the two-column structure.

**Features:**
- Automatically extracts h2 and h3 headings from content
- Generates unique IDs for headings (slugifies text)
- Initializes scroll spy using IntersectionObserver
- Handles responsive behavior (mobile collapse)

**No inputs required** - automatically scans content on mount.

### `<app-doc-toc>`

Table of contents sidebar component (used internally by doc-layout).

**Inputs:**
- `headings: TocHeading[]` - Array of heading objects
- `activeId: string | null` - Currently active section ID
- `isMobile: boolean` - Whether in mobile view
- `mobileOpen: boolean` - Whether mobile TOC is open

**Outputs:**
- `navigate: EventEmitter<string>` - Emits when a TOC item is clicked
- `closeMobile: EventEmitter<void>` - Emits when mobile TOC should close

## Services

### `TocService`

Service for managing table of contents and scroll spy.

**Methods:**
- `extractHeadings(contentElement: HTMLElement): TocHeading[]` - Extract headings from content
- `initScrollSpy(contentElement: HTMLElement): void` - Initialize scroll spy observer
- `scrollToHeading(id: string, smooth?: boolean): void` - Scroll to a heading
- `destroyScrollSpy(): void` - Clean up observer
- `reset(): void` - Reset service state

**Observables:**
- `headings$: Observable<TocHeading[]>` - Stream of headings
- `activeId$: Observable<string | null>` - Stream of active section ID

## Directives

### `appDocAnchor`

Directive that automatically adds IDs to h2 and h3 elements.

**Usage:**
```html
<h2 appDocAnchor>My Heading</h2>
```

If the heading doesn't have an ID, it will be auto-generated from the text content.

## Styling

The layout uses CSS custom properties for theming. Key variables:

- `--doc-max-width: 880px` - Maximum content width
- Background: `#0E0E0E`
- Surface: `#151515`
- Text primary: `#EAEAEA`
- Text muted: `rgba(234, 234, 234, 0.64)`
- Divider: `rgba(255, 255, 255, 0.08)`

### Customizing Max Width

Override the max-width in your component styles:

```scss
:host ::ng-deep .doc-content {
  max-width: 960px; // Custom width
}
```

## Responsive Behavior

- **Desktop (≥1280px)**: Two-column layout with sticky TOC sidebar
- **Tablet (1024-1279px)**: Single column with "Page outline" button
- **Mobile (<1024px)**: Full-width content, TOC in slide-out drawer

## Accessibility

- All TOC links are keyboard navigable
- Arrow Up/Down keys navigate between TOC items
- Enter/Space activate links
- Visible focus indicators
- `aria-current="true"` on active link
- Smooth scrolling respects `prefers-reduced-motion`
- Headings receive focus when navigated to

## Browser Support

- Modern browsers with IntersectionObserver support
- Graceful degradation for older browsers (TOC still works, scroll spy may not)

## Example Page

See `webhooks-docs.component.ts` for a complete example with:
- Multiple h2 and h3 headings
- Code blocks
- Tables
- Callout boxes
- Lists

Access it at `/docs/webhooks` route.

## Notes

- The layout enforces **single-column content** - avoid multi-column layouts in the main content area
- TOC automatically hides if fewer than 2 headings are found
- Headings are automatically slugified for IDs (e.g., "How it works" → "how-it-works")
- Duplicate slugs are handled with numeric suffixes (e.g., "section", "section-1", "section-2")

