import { Component, OnInit, signal, inject } from '@angular/core';
import { Router, ActivatedRoute } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  ButtonModule,
  TagModule,
  InputModule,
  ModalModule,
  SelectModule
} from 'carbon-components-angular';
import { VendorCompany } from '../shared/models/vendor-company.model';

@Component({
  selector: 'app-company-details',
  standalone: false,
  template: `
    <div class="page-container">
      <div class="page-header">
        <div class="header-left">
          <h1>{{ company()?.name || 'Company Details' }}</h1>
          <div class="badges">
            <ibm-tag [type]="getStatusColor(company()?.status || '')">
              {{ company()?.status || 'Unknown' }}
            </ibm-tag>
            <ibm-tag [type]="'blue'">
              {{ company()?.tier || 'No Tier' }}
            </ibm-tag>
          </div>
        </div>
        <div class="header-actions">
          <button ibmButton="secondary" (click)="openEditModal()">Edit Company</button>
          <button ibmButton="secondary" (click)="openTierModal()">Change Tier</button>
          <button 
            *ngIf="company()?.status === 'Active'"
            ibmButton="danger" 
            (click)="openDeactivateModal()">
            Deactivate
          </button>
          <button 
            *ngIf="company()?.status === 'Deactivated'"
            ibmButton="primary" 
            (click)="reactivateCompany()">
            Reactivate
          </button>
        </div>
      </div>

      <div class="content-tabs">
        <button 
          class="tab-button"
          [class.active]="activeTab() === 'profile'"
          (click)="activeTab.set('profile')">
          Profile
        </button>
        <button 
          class="tab-button"
          [class.active]="activeTab() === 'access'"
          (click)="activeTab.set('access')">
          Access & Tier
        </button>
        <button 
          class="tab-button"
          [class.active]="activeTab() === 'risk'"
          (click)="activeTab.set('risk')">
          Risk & Compliance
        </button>
        <button 
          class="tab-button"
          [class.active]="activeTab() === 'lifecycle'"
          (click)="activeTab.set('lifecycle')">
          Lifecycle
        </button>
      </div>

      <div class="tab-content">
        <!-- Profile Tab -->
        <div *ngIf="activeTab() === 'profile'" class="tab-panel">
          <div class="section">
            <h2>Company Information</h2>
            <div class="info-grid">
              <div class="info-item">
                <label>Company Name</label>
                <p>{{ company()?.name || 'N/A' }}</p>
              </div>
              <div class="info-item">
                <label>Industry</label>
                <p>Technology Services</p>
              </div>
              <div class="info-item">
                <label>Region</label>
                <p>North America</p>
              </div>
              <div class="info-item">
                <label>Website</label>
                <p><a [href]="company()?.website" target="_blank">{{ company()?.website || 'N/A' }}</a></p>
              </div>
              <div class="info-item">
                <label>Address</label>
                <p>{{ company()?.address || 'N/A' }}</p>
              </div>
            </div>
          </div>

          <div class="section">
            <h2>Primary Contact</h2>
            <div class="info-grid">
              <div class="info-item">
                <label>Contact Name</label>
                <p>{{ company()?.primaryContact || 'N/A' }}</p>
              </div>
              <div class="info-item">
                <label>Email</label>
                <p><a [href]="'mailto:' + company()?.primaryEmail">{{ company()?.primaryEmail || 'N/A' }}</a></p>
              </div>
            </div>
          </div>

          <div class="section" *ngIf="company()?.notes">
            <h2>Notes</h2>
            <p>{{ company()?.notes }}</p>
          </div>
        </div>

        <!-- Access & Tier Tab -->
        <div *ngIf="activeTab() === 'access'" class="tab-panel">
          <div class="section">
            <h2>Current Tier</h2>
            <p class="tier-display">{{ company()?.tier || 'No Tier Assigned' }}</p>
            <div class="tier-selector">
              <label>Change Tier:</label>
              <select ibmSelect [(ngModel)]="selectedTier" class="tier-select">
                <option value="Tier 1">Tier 1</option>
                <option value="Tier 2">Tier 2</option>
                <option value="Tier 3">Tier 3</option>
              </select>
              <button ibmButton="secondary" (click)="changeTier()">Update Tier</button>
            </div>
          </div>

          <div class="section">
            <h2>Access Permissions</h2>
            <p>Access permissions are managed at the tier level. Changes to tier will update access automatically.</p>
          </div>
        </div>

        <!-- Risk & Compliance Tab -->
        <div *ngIf="activeTab() === 'risk'" class="tab-panel">
          <div class="section">
            <h2>Risk Assessment</h2>
            <div class="risk-display">
              <ibm-tag [type]="getRiskColor(company()?.riskLevel || '')">
                {{ company()?.riskLevel || 'Unknown' }} Risk
              </ibm-tag>
              <p class="ai-note">AI-estimated based on integration profile</p>
            </div>
          </div>

          <div class="section">
            <h2>Compliance Status</h2>
            <p>Compliance checks are performed automatically based on vendor tier and risk level.</p>
          </div>
        </div>

        <!-- Lifecycle Tab -->
        <div *ngIf="activeTab() === 'lifecycle'" class="tab-panel">
          <div class="section">
            <h2>Key Dates</h2>
            <div class="info-grid">
              <div class="info-item">
                <label>Submitted</label>
                <p>{{ formatDate(company()?.submittedAt || company()?.createdAt || '') }}</p>
              </div>
              <div class="info-item">
                <label>Created</label>
                <p>{{ formatDate(company()?.createdAt || '') }}</p>
              </div>
              <div class="info-item" *ngIf="company()?.status === 'Deactivated'">
                <label>Deactivated</label>
                <p>{{ formatDate(company()?.createdAt || '') }}</p>
              </div>
            </div>
          </div>

          <div class="section">
            <h2>Status History</h2>
            <p>Current status: <strong>{{ company()?.status || 'Unknown' }}</strong></p>
          </div>
        </div>
      </div>
    </div>

    <!-- Edit Modal -->
    <ibm-modal
      [open]="editModalOpen()"
      [size]="'md'"
      (overlaySelected)="closeEditModal()">
      <ibm-modal-header (closeSelect)="closeEditModal()">
        <p class="bx--modal-header__heading">Edit Company</p>
      </ibm-modal-header>
      <div ibmModalContent>
        <p class="demo-note">This is a demo view. Changes are not saved.</p>
        <div *ngIf="company()">
          <p><strong>Company:</strong> {{ company()!.name }}</p>
          <p><strong>Status:</strong> {{ company()!.status }}</p>
          <p><strong>Tier:</strong> {{ company()!.tier || 'N/A' }}</p>
        </div>
      </div>
      <ibm-modal-footer>
        <button ibmButton="secondary" (click)="closeEditModal()">Close</button>
      </ibm-modal-footer>
    </ibm-modal>

    <!-- Tier Change Modal -->
    <ibm-modal
      [open]="tierModalOpen()"
      [size]="'sm'"
      (overlaySelected)="closeTierModal()">
      <ibm-modal-header (closeSelect)="closeTierModal()">
        <p class="bx--modal-header__heading">Change Tier</p>
      </ibm-modal-header>
      <div ibmModalContent>
        <p class="demo-note">Tier change functionality (demo only)</p>
      </div>
      <ibm-modal-footer>
        <button ibmButton="secondary" (click)="closeTierModal()">Cancel</button>
        <button ibmButton="primary" (click)="confirmTierChange()">Change Tier</button>
      </ibm-modal-footer>
    </ibm-modal>

    <!-- Deactivate Modal -->
    <ibm-modal
      [open]="deactivateModalOpen()"
      [size]="'sm'"
      (overlaySelected)="closeDeactivateModal()">
      <ibm-modal-header (closeSelect)="closeDeactivateModal()">
        <p class="bx--modal-header__heading">Deactivate Company</p>
      </ibm-modal-header>
      <div ibmModalContent>
        <p>Are you sure you want to deactivate {{ company()?.name }}?</p>
        <p class="demo-note">This action is for demo purposes only.</p>
      </div>
      <ibm-modal-footer>
        <button ibmButton="secondary" (click)="closeDeactivateModal()">Cancel</button>
        <button ibmButton="danger" (click)="confirmDeactivate()">Deactivate</button>
      </ibm-modal-footer>
    </ibm-modal>
  `,
  styles: [`
    .page-container {
      max-width: 1400px;
      margin: 0 auto;
      padding: 2rem;
    }

    .page-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      margin-bottom: 2rem;
      padding-bottom: 1.5rem;
      border-bottom: 1px solid var(--linear-border);
    }

    .header-left h1 {
      font-size: 2rem;
      font-weight: 600;
      color: var(--linear-text-primary);
      margin: 0 0 1rem 0;
    }

    .badges {
      display: flex;
      gap: 0.5rem;
    }

    .header-actions {
      display: flex;
      gap: 0.5rem;
      flex-wrap: wrap;
    }

    .content-tabs {
      display: flex;
      gap: 0.5rem;
      margin-bottom: 2rem;
      border-bottom: 1px solid var(--linear-border);
    }

    .tab-button {
      padding: 0.75rem 1.5rem;
      border: none;
      background: transparent;
      color: var(--linear-text-secondary);
      font-size: 0.875rem;
      cursor: pointer;
      border-bottom: 2px solid transparent;
      margin-bottom: -1px;
      transition: all 150ms ease;
    }

    .tab-button:hover {
      color: var(--linear-text-primary);
    }

    .tab-button.active {
      color: var(--linear-accent);
      border-bottom-color: var(--linear-accent);
    }

    .tab-content {
      min-height: 400px;
    }

    .tab-panel {
      animation: fadeIn 0.2s ease;
    }

    @keyframes fadeIn {
      from { opacity: 0; }
      to { opacity: 1; }
    }

    .section {
      margin-bottom: 2rem;
    }

    .section h2 {
      font-size: 1.25rem;
      font-weight: 600;
      color: var(--linear-text-primary);
      margin: 0 0 1rem 0;
    }

    .info-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
      gap: 1.5rem;
    }

    .info-item label {
      display: block;
      font-size: 0.75rem;
      color: var(--linear-text-secondary);
      font-weight: 500;
      margin-bottom: 0.25rem;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }

    .info-item p {
      font-size: 0.875rem;
      color: var(--linear-text-primary);
      margin: 0;
    }

    .info-item a {
      color: var(--linear-accent);
      text-decoration: none;
    }

    .info-item a:hover {
      text-decoration: underline;
    }

    .tier-display {
      font-size: 1.5rem;
      font-weight: 600;
      color: var(--linear-text-primary);
      margin: 0 0 1rem 0;
    }

    .tier-selector {
      display: flex;
      align-items: center;
      gap: 1rem;
      margin-top: 1rem;
    }

    .tier-select {
      min-width: 150px;
    }

    .risk-display {
      display: flex;
      align-items: center;
      gap: 1rem;
      margin-bottom: 1rem;
    }

    .ai-note {
      font-size: 0.75rem;
      color: var(--linear-text-secondary);
      font-style: italic;
      margin: 0;
    }

    .demo-note {
      padding: 0.75rem;
      background: var(--linear-surface);
      border: 1px solid var(--linear-border);
      border-radius: 4px;
      font-size: 0.875rem;
      color: var(--linear-text-secondary);
      margin-bottom: 1rem;
    }
  `]
})
export class CompanyDetailsComponent implements OnInit {
  private router = inject(Router);
  private route = inject(ActivatedRoute);

  company = signal<VendorCompany | null>(null);
  activeTab = signal<'profile' | 'access' | 'risk' | 'lifecycle'>('profile');
  editModalOpen = signal(false);
  tierModalOpen = signal(false);
  deactivateModalOpen = signal(false);
  selectedTier = '';

  // Mock data - in real app, this would come from a service
  private mockCompanies: VendorCompany[] = [
    {
      id: '1',
      name: 'Acme Corporation',
      primaryContact: 'John Smith',
      primaryEmail: 'john.smith@acme.com',
      status: 'Active',
      tier: 'Tier 1',
      riskLevel: 'Low',
      createdAt: '2024-01-15T10:00:00Z',
      website: 'https://acme.com',
      address: '123 Main St, San Francisco, CA',
      vendor: true
    },
    {
      id: '2',
      name: 'TechStart Inc',
      primaryContact: 'Sarah Johnson',
      primaryEmail: 'sarah.j@techstart.com',
      status: 'Pending',
      tier: 'Tier 2',
      riskLevel: 'Medium',
      createdAt: '2024-02-20T14:30:00Z',
      submittedAt: '2024-02-20T14:30:00Z',
      website: 'https://techstart.com',
      vendor: true
    },
    {
      id: '3',
      name: 'Global Solutions Ltd',
      primaryContact: 'Michael Chen',
      primaryEmail: 'm.chen@globalsolutions.com',
      status: 'Active',
      tier: 'Tier 1',
      riskLevel: 'Low',
      createdAt: '2023-11-10T09:15:00Z',
      website: 'https://globalsolutions.com',
      address: '456 Business Ave, New York, NY',
      vendor: true
    },
    {
      id: '4',
      name: 'InnovateCo',
      primaryContact: 'Emily Davis',
      primaryEmail: 'emily.d@innovateco.com',
      status: 'Pending',
      tier: 'Tier 3',
      riskLevel: 'High',
      createdAt: '2024-03-05T11:20:00Z',
      submittedAt: '2024-03-05T11:20:00Z',
      website: 'https://innovateco.com',
      vendor: true
    },
    {
      id: '5',
      name: 'DataFlow Systems',
      primaryContact: 'Robert Wilson',
      primaryEmail: 'r.wilson@dataflow.com',
      status: 'Active',
      tier: 'Tier 2',
      riskLevel: 'Medium',
      createdAt: '2024-01-28T16:45:00Z',
      website: 'https://dataflow.com',
      address: '789 Tech Blvd, Austin, TX',
      vendor: true
    },
    {
      id: '7',
      name: 'SecureNet Partners',
      primaryContact: 'David Martinez',
      primaryEmail: 'd.martinez@securenet.com',
      status: 'Deactivated',
      tier: 'Tier 1',
      riskLevel: 'Low',
      createdAt: '2023-09-15T08:30:00Z',
      website: 'https://securenet.com',
      vendor: true
    }
  ];

  ngOnInit() {
    this.route.params.subscribe(params => {
      const id = params['id'];
      const found = this.mockCompanies.find(c => c.id === id);
      if (found) {
        this.company.set(found);
        this.selectedTier = found.tier || '';
      } else {
        // Default company if not found
        this.company.set(this.mockCompanies[0]);
        this.selectedTier = this.mockCompanies[0].tier || '';
      }
    });
  }

  formatDate(dateString: string): string {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });
  }

  getStatusColor(status: string): 'red' | 'blue' | 'green' | 'gray' | 'magenta' | 'purple' | 'teal' {
    const colors: Record<string, 'red' | 'blue' | 'green' | 'gray' | 'magenta' | 'purple' | 'teal'> = {
      'Active': 'green',
      'Pending': 'blue',
      'Rejected': 'red',
      'Deactivated': 'gray'
    };
    return colors[status] || 'gray';
  }

  getRiskColor(risk: string): 'red' | 'blue' | 'green' | 'gray' | 'magenta' | 'purple' | 'teal' {
    const colors: Record<string, 'red' | 'blue' | 'green' | 'gray' | 'magenta' | 'purple' | 'teal'> = {
      'Low': 'green',
      'Medium': 'magenta', // Changed from 'yellow' as it's not a valid TagType
      'High': 'red'
    };
    return colors[risk] || 'gray';
  }

  openEditModal() {
    this.editModalOpen.set(true);
  }

  closeEditModal() {
    this.editModalOpen.set(false);
  }

  openTierModal() {
    this.tierModalOpen.set(true);
  }

  closeTierModal() {
    this.tierModalOpen.set(false);
  }

  confirmTierChange() {
    alert('Tier change (demo only)');
    this.closeTierModal();
  }

  changeTier() {
    alert('Tier updated (demo only)');
  }

  openDeactivateModal() {
    this.deactivateModalOpen.set(true);
  }

  closeDeactivateModal() {
    this.deactivateModalOpen.set(false);
  }

  confirmDeactivate() {
    const comp = this.company();
    if (comp) {
      comp.status = 'Deactivated';
      this.company.set({ ...comp });
      this.closeDeactivateModal();
      alert('Company deactivated (demo only)');
    }
  }

  reactivateCompany() {
    const comp = this.company();
    if (comp) {
      comp.status = 'Active';
      this.company.set({ ...comp });
      alert('Company reactivated (demo only)');
    }
  }
}

