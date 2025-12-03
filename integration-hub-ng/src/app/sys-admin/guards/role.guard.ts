import { inject } from '@angular/core';
import { Router, CanActivateFn } from '@angular/router';
import { AuthStateService } from '../services/auth-state.service';
import { RoleKey } from '../models';

export const roleGuard: CanActivateFn = (route) => {
  const authState = inject(AuthStateService);
  const router = inject(Router);
  
  const requiredRoles = route.data?.['roles'] as RoleKey[] || ['SYSTEM_ADMIN'];
  
  if (authState.hasAnyRole(requiredRoles)) {
    return true;
  }
  
  router.navigate(['/']);
  return false;
};

