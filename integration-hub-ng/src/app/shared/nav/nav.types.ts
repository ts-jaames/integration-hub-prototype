export interface NavLink {
  label: string;
  path: string;
  icon?: string; // Icon name (e.g., 'dashboard', 'building', 'users', etc.)
}

export interface NavSection {
  id: string;
  label: string;
  links: NavLink[];
}

