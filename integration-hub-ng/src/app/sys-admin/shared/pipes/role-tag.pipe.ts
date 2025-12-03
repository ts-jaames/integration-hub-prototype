import { Pipe, PipeTransform } from '@angular/core';
import { RoleKey } from '../../models';

@Pipe({
  name: 'roleTag',
  standalone: true
})
export class RoleTagPipe implements PipeTransform {
  private roleLabels: Record<RoleKey, string> = {
    SYSTEM_ADMIN: 'System Admin',
    COMPANY_OWNER: 'Company Owner',
    COMPANY_MANAGER: 'Company Manager',
    DEVELOPER: 'Developer',
    ANALYST: 'Analyst',
    SUPPORT: 'Support',
    VIEWER: 'Viewer'
  };

  transform(value: RoleKey | null | undefined): string {
    if (!value) return '';
    return this.roleLabels[value] || value;
  }
}

