import { Component } from '@angular/core';

@Component({
  selector: 'app-usage-analytics',
  standalone: false,
  template: `
    <div class="page-container">
      <h1>Usage Analytics</h1>
      <p>This page is under construction. Usage analytics and metrics will be available here.</p>
    </div>
  `,
  styles: [`
    .page-container {
      padding: 2rem;
    }
  `]
})
export class UsageAnalyticsComponent {}

