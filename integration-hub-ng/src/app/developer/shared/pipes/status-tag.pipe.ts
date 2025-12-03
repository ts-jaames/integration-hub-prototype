import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'statusTag',
  standalone: true
})
export class StatusTagPipe implements PipeTransform {
  transform(value: string): string {
    const statusMap: Record<string, string> = {
      'active': 'Active',
      'suspended': 'Suspended',
      'revoked': 'Revoked',
      'draft': 'Draft',
      'released': 'Released',
      'deprecated': 'Deprecated',
      'queued': 'Queued',
      'success': 'Success',
      'failed': 'Failed'
    };
    return statusMap[value] || value;
  }
}

