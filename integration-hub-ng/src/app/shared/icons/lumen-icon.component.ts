import { Component, Input, HostListener, ElementRef, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';

/**
 * LumenIconComponent - A bright white glowing icon symbolizing "shedding light on darkness"
 * 
 * Features:
 * - Bright white core with concentric wave lines
 * - Soft radial glow with SVG filters
 * - Subtle pulsating animation
 * - Carbon-compatible sizing (16, 20, 24, 32, 48)
 * - Accessible with proper ARIA attributes
 * 
 * @example
 * ```html
 * <lumen-icon [size]="32" [animated]="true" ariaLabel="Lumen" />
 * ```
 */
@Component({
  selector: 'lumen-icon',
  standalone: true,
  imports: [CommonModule],
  host: {
    '[style.opacity]': 'brightnessOpacity',
    '[style.filter]': 'combinedFilter'
  },
  template: `
    <svg
      [attr.width]="resolvedSize"
      [attr.height]="resolvedSize"
      [attr.viewBox]="'0 0 100 100'"
      xmlns="http://www.w3.org/2000/svg"
      [attr.role]="ariaLabel ? 'img' : null"
      [attr.aria-label]="ariaLabel || null"
      [attr.aria-hidden]="ariaLabel ? null : 'true'"
      class="lumen-svg"
      [class.animated]="animated"
    >
      <defs>
        <!-- Core radial gradient - bright white center (#FFFFFF) fading to edges -->
        <radialGradient id="lumen-core-{{uniqueId}}" cx="50%" cy="50%" r="60%">
          <stop offset="0%" stop-color="#FFFFFF" stop-opacity="1" />
          <stop offset="30%" stop-color="#FFFFFF" stop-opacity="1" />
          <stop offset="50%" stop-color="#FFFFFF" stop-opacity="0.95" />
          <stop offset="70%" stop-color="#FFFFFF" stop-opacity="0.6" />
          <stop offset="100%" stop-color="#FFFFFF" stop-opacity="0.2" />
        </radialGradient>

        <!-- Stroke gradient for wave lines - white with opacity fade -->
        <linearGradient id="lumen-stroke-{{uniqueId}}" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="#FFFFFF" stop-opacity="0.9" />
          <stop offset="50%" stop-color="#FFFFFF" stop-opacity="0.6" />
          <stop offset="100%" stop-color="#FFFFFF" stop-opacity="0.3" />
        </linearGradient>

        <!-- Outer glow filter with generous bounds -->
        <filter id="lumen-glow-{{uniqueId}}" x="-100%" y="-100%" width="300%" height="300%">
          <feGaussianBlur stdDeviation="8" result="blur"/>
          <feMerge>
            <feMergeNode in="blur"/>
            <feMergeNode in="SourceGraphic"/>
          </feMerge>
        </filter>

        <!-- Inner glow filter for core -->
        <filter id="lumen-inner-glow-{{uniqueId}}" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="3" result="innerBlur"/>
          <feMerge>
            <feMergeNode in="innerBlur"/>
            <feMergeNode in="SourceGraphic"/>
          </feMerge>
        </filter>
      </defs>

      <!-- Accessibility: Title for screen readers -->
      <ng-container *ngIf="ariaLabel">
        <title>{{ ariaLabel }}</title>
      </ng-container>

      <!-- Soft glow ellipse behind everything -->
      <ellipse
        cx="50"
        cy="50"
        rx="30"
        ry="30"
        [attr.fill]="'url(#lumen-core-' + uniqueId + ')'"
        [attr.filter]="'url(#lumen-glow-' + uniqueId + ')'"
        class="core-glow pulsate-core"
      />

      <!-- Core circle with inner glow -->
      <circle
        cx="50"
        cy="50"
        r="18"
        [attr.fill]="'url(#lumen-core-' + uniqueId + ')'"
        [attr.filter]="'url(#lumen-inner-glow-' + uniqueId + ')'"
        class="pulsate-core"
      />

      <!-- Wave lines: 3 concentric circles + 1 top arc -->
      <g class="waves pulsate-waves">
        <!-- Inner wave -->
        <circle
          cx="50"
          cy="50"
          r="26"
          fill="none"
          [attr.stroke]="'url(#lumen-stroke-' + uniqueId + ')'"
          stroke-width="1.5"
          stroke-linecap="round"
          opacity="0.85"
        />
        <!-- Middle wave -->
        <circle
          cx="50"
          cy="50"
          r="34"
          fill="none"
          [attr.stroke]="'url(#lumen-stroke-' + uniqueId + ')'"
          stroke-width="1.25"
          stroke-linecap="round"
          opacity="0.65"
        />
        <!-- Outer wave -->
        <circle
          cx="50"
          cy="50"
          r="42"
          fill="none"
          [attr.stroke]="'url(#lumen-stroke-' + uniqueId + ')'"
          stroke-width="1.1"
          stroke-linecap="round"
          opacity="0.5"
        />
        <!-- Top arc wave -->
        <path
          d="M 10 50 A 40 40 0 0 1 90 50"
          fill="none"
          [attr.stroke]="'url(#lumen-stroke-' + uniqueId + ')'"
          stroke-width="1"
          stroke-linecap="round"
          opacity="0.35"
        />
      </g>
    </svg>
  `,
  styles: [`
    :host {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      line-height: 0;
      /* Smooth brightness transition based on cursor proximity */
      transition: opacity 0.4s cubic-bezier(0.4, 0, 0.2, 1),
                  filter 0.4s cubic-bezier(0.4, 0, 0.2, 1);
    }

    /* Light theme variant - softer/neutral drop shadow */
    :host-context(.bx--body--light-theme),
    :host-context([data-carbon-theme="white"]),
    :host-context([data-carbon-theme="g10"]),
    :host-context([data-carbon-theme="g90"]),
    :host-context([data-carbon-theme="g100"]) {
      filter: drop-shadow(0 0 6px rgba(0, 0, 0, 0.15)) 
              drop-shadow(0 0 12px rgba(0, 0, 0, 0.1));
    }

    .lumen-svg {
      /* Crisp rendering for dark backgrounds */
      shape-rendering: geometricPrecision;
      image-rendering: optimizeQuality;
      overflow: visible;
    }

    /* Subtle breathing animation for core when animated=true */
    .animated .pulsate-core {
      animation: lumen-breathe-core 3s ease-in-out infinite;
      transform-origin: 50px 50px;
    }

    /* Subtle breathing animation for waves when animated=true */
    .animated .pulsate-waves {
      animation: lumen-breathe-waves 3s ease-in-out infinite;
      transform-origin: 50px 50px;
    }

    @keyframes lumen-breathe-core {
      0% {
        opacity: 0.7;
        transform: scale(1);
      }
      50% {
        opacity: 1;
        transform: scale(1.05);
      }
      100% {
        opacity: 0.7;
        transform: scale(1);
      }
    }

    @keyframes lumen-breathe-waves {
      0% {
        opacity: 0.6;
        transform: scale(1);
      }
      50% {
        opacity: 0.9;
        transform: scale(1.03);
      }
      100% {
        opacity: 0.6;
        transform: scale(1);
      }
    }
  `]
})
export class LumenIconComponent implements OnInit, OnDestroy {
  /** Size in px or any CSS length. Use Carbon-friendly sizes: 16, 20, 24, 32, 48 */
  @Input() size: number | string = 48;

  /** Enable subtle breathing animation for core + waves */
  @Input() animated: boolean = true;

  /** Accessible name; if provided, sets role="img" and includes <title>; otherwise aria-hidden="true" */
  @Input() ariaLabel?: string;

  // Generate unique ID per instance to avoid SVG ID collisions
  uniqueId = Math.random().toString(36).substring(2, 9);

  // Cursor proximity tracking for brightness
  cursorDistance = Infinity;
  maxProximityDistance = 150; // Distance in pixels where icon reaches max brightness
  minBrightness = 0.6; // Minimum brightness when cursor is far away
  maxBrightness = 1.0; // Maximum brightness when cursor is near

  constructor(private elementRef: ElementRef) {}

  ngOnInit() {
    // Component initialized
  }

  ngOnDestroy() {
    // Cleanup if needed
  }

  @HostListener('document:mousemove', ['$event'])
  onMouseMove(event: MouseEvent) {
    const hostElement = this.elementRef.nativeElement;
    const rect = hostElement.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    
    // Calculate distance from cursor to icon center
    const deltaX = event.clientX - centerX;
    const deltaY = event.clientY - centerY;
    this.cursorDistance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
  }

  @HostListener('document:mouseleave')
  onMouseLeave() {
    // Reset distance when mouse leaves document
    this.cursorDistance = Infinity;
  }

  /**
   * Calculate opacity based on cursor proximity
   * Returns value between minBrightness and maxBrightness
   */
  get brightnessOpacity(): number {
    if (this.cursorDistance >= this.maxProximityDistance) {
      return this.minBrightness;
    }
    
    // Linear interpolation between min and max based on distance
    const proximityFactor = 1 - (this.cursorDistance / this.maxProximityDistance);
    return this.minBrightness + (this.maxBrightness - this.minBrightness) * proximityFactor;
  }

  /**
   * Calculate brightness filter based on cursor proximity
   * Increases brightness when cursor is near
   */
  get brightnessFilter(): string {
    const brightness = this.brightnessOpacity;
    // Brightness filter: 1.0 = normal, higher = brighter
    // Map opacity (0.6-1.0) to brightness (1.0-1.5)
    const brightnessValue = 1.0 + (brightness - this.minBrightness) * 1.25;
    return `brightness(${brightnessValue})`;
  }

  /**
   * Combined filter: brightness + drop-shadow
   * Combines proximity-based brightness with ambient glow
   */
  get combinedFilter(): string {
    const opacity = this.brightnessOpacity;
    // Calculate brightness value (1.0 to 1.5)
    const brightnessValue = 1.0 + (opacity - this.minBrightness) * 1.25;
    // Calculate glow intensity based on brightness
    const glowIntensity1 = 0.15 + (opacity - this.minBrightness) * 0.1;
    const glowIntensity2 = 0.1 + (opacity - this.minBrightness) * 0.05;
    // Combine brightness with drop-shadow for ambient light
    return `brightness(${brightnessValue}) drop-shadow(0 0 10px rgba(255, 255, 255, ${glowIntensity1})) drop-shadow(0 0 20px rgba(255, 255, 255, ${glowIntensity2}))`;
  }

  /**
   * Resolve size input to string format
   * Numbers are treated as pixels, strings are used as-is
   */
  get resolvedSize(): string {
    return typeof this.size === 'number' ? `${this.size}` : this.size;
  }
}

