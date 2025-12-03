import { inject } from '@angular/core';
import { Router, CanActivateFn } from '@angular/router';
import { DevAuthStateService } from '../services/auth-state.service';

export const devRoleGuard: CanActivateFn = (route, state) => {
  const authState = inject(DevAuthStateService);
  const router = inject(Router);

  if (authState.hasRole('DEVELOPER_INTERNAL')) {
    return true;
  }

  router.navigate(['/']);
  return false;
};

