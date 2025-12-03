import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TagModule } from 'carbon-components-angular';
import { CompanyStatus, UserStatus } from '../../../models';

@Component({
  selector: 'app-status-tag',
  standalone: true,
  imports: [CommonModule, TagModule],
  template: `
    <ibm-tag [type]="tagType" [class]="tagClass">
      {{ displayText }}
    </ibm-tag>
  `,
  styles: [`
    :host {
      display: inline-block;
    }
  `]
})
export class StatusTagComponent {
  @Input() status!: CompanyStatus | UserStatus;
  @Input() type: 'company' | 'user' = 'company';

  get tagType(): 'red' | 'blue' | 'green' | 'gray' | 'magenta' | 'purple' | 'teal' {
    if (this.type === 'company') {
      const companyStatus = this.status as CompanyStatus;
      switch (companyStatus) {
        case 'active':
          return 'green';
        case 'suspended':
          return 'red';
        case 'deleted':
          return 'gray';
        case 'pending':
          return 'blue';
        default:
          return 'gray';
      }
    } else {
      const userStatus = this.status as UserStatus;
      switch (userStatus) {
        case 'active':
          return 'green';
        case 'suspended':
          return 'red';
        case 'invited':
          return 'blue';
        case 'deactivated':
          return 'gray';
        default:
          return 'gray';
      }
    }
  }

  get displayText(): string {
    return this.status.charAt(0).toUpperCase() + this.status.slice(1);
  }

  get tagClass(): string {
    return '';
  }
}

