import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';

export interface SearchResult {
  id: string;
  title: string;
  description: string;
  icon: string;
  category: string;
  route: string;
}

@Injectable({
  providedIn: 'root'
})
export class SearchService {
  private searchResultsSubject = new BehaviorSubject<SearchResult[]>([]);
  public searchResults$: Observable<SearchResult[]> = this.searchResultsSubject.asObservable();

  // Mock search data - in production this would come from an API
  private allItems: SearchResult[] = [
    {
      id: '1',
      title: 'Companies',
      description: 'Manage vendor companies and organizations',
      icon: 'building',
      category: 'Organization',
      route: '/companies'
    },
    {
      id: '2',
      title: 'Users',
      description: 'Manage user accounts and role assignments',
      icon: 'users',
      category: 'Organization',
      route: '/users'
    },
    {
      id: '3',
      title: 'Service Accounts',
      description: 'Manage service accounts and API credentials',
      icon: 'key',
      category: 'Access & APIs',
      route: '/service-accounts'
    },
    {
      id: '4',
      title: 'APIs',
      description: 'Manage API lifecycle, configuration, and policies',
      icon: 'api',
      category: 'Access & APIs',
      route: '/apis'
    },
    {
      id: '5',
      title: 'Monitoring',
      description: 'System health, performance metrics, and analytics',
      icon: 'chart',
      category: 'Operations',
      route: '/monitoring'
    },
    {
      id: '6',
      title: 'Compliance',
      description: 'Audit logs, compliance scans, and governance',
      icon: 'shield',
      category: 'Operations',
      route: '/compliance'
    },
    {
      id: '7',
      title: 'Dashboard',
      description: 'Overview of your integration hub',
      icon: 'dashboard',
      category: 'Overview',
      route: '/'
    },
    {
      id: '8',
      title: 'Create Service Account',
      description: 'Generate new service account credentials',
      icon: 'plus',
      category: 'Actions',
      route: '/service-accounts'
    },
    {
      id: '9',
      title: 'Register API',
      description: 'Register a new API endpoint',
      icon: 'plus',
      category: 'Actions',
      route: '/apis'
    },
    {
      id: '10',
      title: 'Invite User',
      description: 'Invite a new user to the platform',
      icon: 'plus',
      category: 'Actions',
      route: '/users'
    }
  ];

  search(query: string): SearchResult[] {
    if (!query || query.trim().length === 0) {
      return [];
    }

    const searchTerm = query.toLowerCase().trim();
    const results = this.allItems.filter(item => {
      const titleMatch = item.title.toLowerCase().includes(searchTerm);
      const descMatch = item.description.toLowerCase().includes(searchTerm);
      const categoryMatch = item.category.toLowerCase().includes(searchTerm);
      return titleMatch || descMatch || categoryMatch;
    });

    // Sort by relevance (title matches first, then description)
    return results.sort((a, b) => {
      const aTitleMatch = a.title.toLowerCase().startsWith(searchTerm);
      const bTitleMatch = b.title.toLowerCase().startsWith(searchTerm);
      if (aTitleMatch && !bTitleMatch) return -1;
      if (!aTitleMatch && bTitleMatch) return 1;
      return 0;
    }).slice(0, 10); // Limit to 10 results
  }

  updateSearchResults(query: string): void {
    const results = this.search(query);
    this.searchResultsSubject.next(results);
  }
}

