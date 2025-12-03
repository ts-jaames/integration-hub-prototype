import { Component } from '@angular/core';

@Component({
  selector: 'app-support-tickets',
  standalone: false,
  template: `
    <div class="page-container">
      <h1>Support & Tickets</h1>
      <p>This page is under construction. Support ticket management will be available here.</p>
    </div>
  `,
  styles: [`
    .page-container {
      padding: 2rem;
    }
  `]
})
export class SupportTicketsComponent {}

