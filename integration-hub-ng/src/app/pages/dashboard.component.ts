import { Component, OnInit, AfterViewInit, ViewChild, ElementRef, signal, computed, inject } from '@angular/core';
import { TableModel, TableItem, TableHeaderItem } from 'carbon-components-angular';
import { RoleService } from '../core/role.service';
import { InMemoryDevService } from '../developer/services/in-memory-dev.service';
import { DataTableComponent } from '../shared/components/data-table/data-table.component';

interface SystemService {
  name: string;
  status: 'healthy' | 'warning' | 'error';
  lastChecked: string;
}

interface Alert {
  severity: 'high' | 'medium' | 'low';
  timestamp: string;
  source: string;
  message: string;
}

@Component({
  selector: 'app-dashboard',
  standalone: false,
  template: `
    <!-- System Admin Dashboard -->
    <ng-container *ngIf="currentRole() === 'system-administrator'">
      <div class="dashboard-header">
        <h1 class="dashboard-title">Dashboard</h1>
      </div>
          <!-- System Health Overview -->
      <div class="system-health">
        <div class="health-badges">
          <div *ngFor="let service of systemServices" class="health-badge" [class]="'status-' + service.status" [title]="'Last checked: ' + service.lastChecked">
            <div class="status-indicator"></div>
            <span class="service-name">{{ service.name }}</span>
          </div>
        </div>
      </div>

      <!-- KPI / Metric Cards -->
      <div class="dashboard-metrics">
        <div class="metric-card">
          <div class="metric-label">Companies</div>
          <div class="metric-value">24</div>
        </div>
        <div class="metric-card">
          <div class="metric-label">Active APIs</div>
          <div class="metric-value">18</div>
        </div>
        <div class="metric-card">
          <div class="metric-label">Accounts</div>
          <div class="metric-value">142</div>
        </div>
        <div class="metric-card">
          <div class="metric-label">Active Alerts</div>
          <div class="metric-value">3</div>
        </div>
        <div class="metric-card">
          <div class="metric-label">System Uptime</div>
          <div class="metric-value">99.8<span class="metric-unit">%</span></div>
        </div>
        <div class="metric-card">
          <div class="metric-label">API Throughput</div>
          <div class="metric-value">12.4K<span class="metric-unit">/hr</span></div>
        </div>
      </div>
      
      <!-- Main Content Grid -->
      <div class="dashboard-grid">
        <!-- Recent Activity Table -->
        <div class="dashboard-section activity-section">
          <div class="section-header">
            <h2 class="section-title">Recent Activity</h2>
            <div class="section-filters">
              <button class="filter-btn" [class.active]="selectedFilter === '24h'" (click)="selectedFilter = '24h'">24h</button>
              <button class="filter-btn" [class.active]="selectedFilter === '7d'" (click)="selectedFilter = '7d'">7d</button>
              <button class="filter-btn" [class.active]="selectedFilter === '30d'" (click)="selectedFilter = '30d'">30d</button>
            </div>
          </div>
          <div class="section-content">
            <app-data-table class="minimal" #activityTable [model]="eventsTableModel" [loading]="loading"></app-data-table>
          </div>
        </div>
        
        <!-- Right Sidebar -->
        <div class="dashboard-sidebar">
          <!-- System Alerts Summary -->
          <div class="dashboard-section alerts-section">
            <div class="section-header">
              <h2 class="section-title">System Alerts</h2>
            </div>
            <div class="alerts-list">
              <div *ngFor="let alert of alerts" class="alert-item" [class]="'severity-' + alert.severity">
                <div class="alert-severity-bar"></div>
                <div class="alert-content">
                  <div class="alert-message">{{ alert.message }}</div>
                  <div class="alert-meta">
                    <span class="alert-source">{{ alert.source }}</span>
                    <div class="alert-time">{{ alert.timestamp }}</div>
                  </div>
                </div>
              </div>
            </div>
            <div class="section-footer">
              <a href="#" class="view-all-link">View all alerts →</a>
            </div>
          </div>
          
          <!-- Compliance Snapshot -->
          <div class="dashboard-section compliance-section">
            <div class="section-header">
              <h2 class="section-title">Compliance</h2>
            </div>
            <div class="compliance-section-content">
              <div class="compliance-score">
                <div class="score-label">Compliance Score</div>
                <div class="score-value">94<span class="score-unit">%</span></div>
              </div>
              <div class="compliance-content">
                <div class="compliance-metric">
                  <div class="compliance-label">Policy Violations</div>
                  <div class="compliance-value">2</div>
                </div>
                <div class="compliance-metric">
                  <div class="compliance-label">Certificates Status</div>
                  <div class="compliance-value status-good">Valid</div>
                </div>
                <div class="compliance-metric">
                  <div class="compliance-label">Next Audit</div>
                  <div class="compliance-value">Dec 15, 2024</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </ng-container>

    <!-- Developer Dashboard -->
    <ng-container *ngIf="currentRole() === 'developer-internal'">
      <div class="dashboard-header">
        <h1 class="dashboard-title">Dashboard</h1>
      </div>
      
      <!-- System Health Overview -->
      <div class="system-health">
        <div class="health-badges">
          <div *ngFor="let service of devServices()" class="health-badge" [class]="'status-' + service.status" [title]="'Last checked: ' + service.lastChecked">
            <div class="status-indicator"></div>
            <span class="service-name">{{ service.name }}</span>
          </div>
        </div>
      </div>

      <!-- KPI / Metric Cards -->
      <div class="dashboard-metrics">
        <div class="metric-card">
          <div class="metric-label">APIs</div>
          <div class="metric-value">{{ devApisCount() }}</div>
        </div>
        <div class="metric-card">
          <div class="metric-label">Service Accounts</div>
          <div class="metric-value">{{ devServiceAccountsCount() }}</div>
        </div>
        <div class="metric-card">
          <div class="metric-label">Active Alerts</div>
          <div class="metric-value">1</div>
        </div>
        <div class="metric-card">
          <div class="metric-label">Error Rate</div>
          <div class="metric-value">0.2<span class="metric-unit">%</span></div>
        </div>
        <div class="metric-card">
          <div class="metric-label">Sandbox Calls</div>
          <div class="metric-value">8.4K<span class="metric-unit">/hr</span></div>
        </div>
        <div class="metric-card">
          <div class="metric-label">Last Deployment</div>
          <div class="metric-value">
            <ibm-tag [type]="lastDeploymentStatus() === 'success' ? 'green' : lastDeploymentStatus() === 'failed' ? 'red' : 'blue'">
              {{ lastDeploymentStatus() }}
            </ibm-tag>
          </div>
        </div>
      </div>
      
      <!-- Main Content Grid -->
      <div class="dashboard-grid">
        <!-- Recent Activity Table -->
        <div class="dashboard-section activity-section">
          <div class="section-header">
            <h2 class="section-title">Recent Activity</h2>
            <div class="section-filters">
              <button class="filter-btn" [class.active]="selectedFilter === '24h'" (click)="selectedFilter = '24h'">24h</button>
              <button class="filter-btn" [class.active]="selectedFilter === '7d'" (click)="selectedFilter = '7d'">7d</button>
              <button class="filter-btn" [class.active]="selectedFilter === '30d'" (click)="selectedFilter = '30d'">30d</button>
            </div>
          </div>
          <div class="section-content">
            <app-data-table class="minimal" #devActivityTable [model]="devEventsTableModel" [loading]="loading"></app-data-table>
          </div>
        </div>
        
        <!-- Right Sidebar -->
        <div class="dashboard-sidebar">
          <!-- Recent Deployments -->
          <div class="dashboard-section deployments-section">
            <div class="section-header">
              <h2 class="section-title">Recent Deployments</h2>
            </div>
            <div class="deployments-list">
              <div *ngFor="let deployment of recentDeployments()" class="deployment-item">
                <div class="deployment-info">
                  <div class="deployment-api">{{ deployment.apiName }} {{ deployment.version }}</div>
                  <div class="deployment-meta">
                    <span>{{ deployment.env }}</span>
                    <div class="deployment-time">{{ formatTime(deployment.createdAt) }}</div>
                  </div>
                </div>
                <ibm-tag [type]="deployment.status === 'success' ? 'green' : deployment.status === 'failed' ? 'red' : 'blue'">
                  {{ deployment.status }}
                </ibm-tag>
              </div>
              <div *ngIf="recentDeployments().length === 0" class="empty-deployments">
                No recent deployments
              </div>
            </div>
          </div>
          
          <!-- System Alerts Summary -->
          <div class="dashboard-section alerts-section">
            <div class="section-header">
              <h2 class="section-title">System Alerts</h2>
            </div>
            <div class="alerts-list">
              <div *ngFor="let alert of devAlerts()" class="alert-item" [class]="'severity-' + alert.severity">
                <div class="alert-severity-bar"></div>
                <div class="alert-content">
                  <div class="alert-message">{{ alert.message }}</div>
                  <div class="alert-meta">
                    <span class="alert-source">{{ alert.source }}</span>
                    <div class="alert-time">{{ alert.timestamp }}</div>
                  </div>
                </div>
              </div>
              <div *ngIf="devAlerts().length === 0" class="empty-alerts">
                No active alerts
              </div>
            </div>
            <div class="section-footer" *ngIf="devAlerts().length > 0">
              <a href="#" class="view-all-link">View all alerts →</a>
            </div>
          </div>
        </div>
      </div>
    </ng-container>
  `,
  styles: [`
    .dashboard-header {
      margin-bottom: 1.25rem;
    }
    
    .dashboard-title {
      font-size: 2rem;
      font-weight: 600;
      color: var(--linear-text-primary);
      margin: 0 0 0.5rem 0;
      letter-spacing: -0.03em;
      line-height: 1.2;
    }
  
    
    /* KPI / Metric Cards */
    .dashboard-metrics {
      display: grid;

      gap: 1rem;
      margin-bottom: 4rem;
      
      @media (min-width: 768px) {
        grid-template-columns: repeat(3, 1fr);
        gap: 1.25rem;
      }
      
      @media (min-width: 1024px) {
        grid-template-columns: repeat(6, 1fr);
      }
      
      @media (max-width: 672px) {
        grid-template-columns: 1fr;
      }
    }
    
    .metric-card {
      border-radius: 4px;
      padding: 1.25rem;
      transition: all 200ms ease;
      cursor: default;
      position: relative;
      border: 1px solid rgb(255 255 255 / 0.05);
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      
      &:hover {
        background: rgba(255, 255, 255, 0.02);
      }
    }
    
    .metric-label {
      font-size: 0.85rem;
      font-weight: 400;
      color: var(--linear-text-secondary);
      margin-bottom: 0.75rem;
      line-height: 1.4;
    }
    
    .metric-value {
      font-size: 2rem;
      font-weight: 600;
      color: var(--linear-text-primary);
      line-height: 1;
      letter-spacing: -0.03em;
      
      .metric-unit {
      font-size: 0.85rem;
        font-weight: 400;
      color: var(--linear-text-secondary);
        margin-left: 0.5rem;
      }
    }
    
    /* System Health Overview */
    .system-health {
      padding: .75rem 0;
      margin-bottom: .5rem;
      display: flex;
      align-items: center;
      gap: 1.5rem;
      //border-top: 1px solid rgb(255 255 255 / 0.05);
      //border-bottom: 1px solid rgb(255 255 255 / 0.05);
    }
    
    .health-label {
      font-size: 0.85rem;
      font-weight: 600;
      color: var(--linear-text-secondary);
      white-space: nowrap;
    }
    
    .health-badges {
      display: flex;
      flex-wrap: wrap;
      gap: 1.5rem;
      flex: 1;
    }
    
    .health-badge {
      display: flex;
      align-items: center;
      gap: 0.35rem;
      //padding: 0.5rem 0.75rem;
      background: transparent;
      border-radius: 4px;
      cursor: default;
      transition: background 150ms ease;
      //border: 1px solid rgb(255 255 255 / 0.05);
    }
    
    .status-indicator {
      width: 8px;
      height: 8px;
      border-radius: 50%;
      flex-shrink: 0;
    }
    
    .status-healthy .status-indicator {
      background: #22C55E;
      box-shadow: 0 0 8px rgba(34, 197, 94, 0.4);
    }
    
    .status-warning .status-indicator {
      background: #F59E0B;
      box-shadow: 0 0 8px rgba(245, 158, 11, 0.4);
    }
    
    .status-error .status-indicator {
      background: #EF4444;
      box-shadow: 0 0 8px rgba(239, 68, 68, 0.4);
    }
    
    .service-name {
      font-size: 0.8125rem;
      color: var(--linear-text-primary);
      font-weight: 500;
    }
    
    /* Dashboard Grid */
    .dashboard-grid {
      display: grid;
      grid-template-columns: 1fr;
      gap: 4rem;
      
    }
    
    /* Dashboard Sections */
    .dashboard-section {
      border-radius: 4px;
      overflow: hidden;
    }
    
    .section-header {
      background: transparent;
      display: flex;
      align-items: center;
      gap: 1rem;
    }
    
    .section-title {
      font-size: 0.85rem;
      font-weight: 400;
      color: var(--linear-text-secondary);
      margin: 0;
    }
    
    .section-filters {
      display: flex;
      gap: 0.5rem;
    }
    
    .filter-btn {
      background: transparent;
      border: none;
      color: var(--linear-text-secondary);
      font-size: 0.75rem;
      font-weight: 500;
      padding: 0.375rem 0.75rem;
      border-radius: 4px;
      cursor: pointer;
      transition: all 150ms ease;
      
      &:hover {
        color: var(--linear-text-secondary);
        background: rgba(255, 255, 255, 0.05);
      }
      
      &.active {
        color: var(--linear-text-primary);
        border: 1px solid rgb(255 255 255 / 0.05);
      }
    }
    
    .section-content {
      padding: 0;
    }
    
    .section-footer {
      padding: .25rem 0 1rem 0;
      display: flex;
      align-items: center;
      justify-content: flex-start;
    }
    
    .view-all-link {
      color: #9A9A9C;
      font-size: 0.8125rem;
      text-decoration: none;
      transition: color 150ms ease;
      
      
      &:hover {
        color: var(--linear-text-primary);
      }
    }
    
    /* Recent Activity Table */
    .activity-section {
      overflow-x: visible;
    }
    
    .section-content {
      overflow-x: visible !important;
      width: 100%;
    }
    
    /* System Alerts */
    .alerts-section {
      margin-bottom: 2rem;
    }
    
    .alerts-list {
      padding: 0.75rem 0;
    }
    
    .alert-item {
      display: flex;
      padding: 1rem 1rem;

      border: 1px solid rgb(255 255 255 / 0.05);
      border-radius: 4px;
      margin-bottom: 0.5rem;
      transition: background 150ms ease;
      
      &:last-child {
        margin-bottom: 0;
      }
      
      &:hover {
        background: rgba(255, 255, 255, 0.02);
      }
    }
    
    .alert-severity-bar {
      width: 3px;
      border-radius: 2px;
      margin-right: 1rem;
      flex-shrink: 0;
    }
    
    .severity-high .alert-severity-bar {
      background: #EF4444;
      box-shadow: 0 0 8px rgba(239, 68, 68, 0.9);
    }
    
    .severity-medium .alert-severity-bar {
      background: #F59E0B;
      box-shadow: 0 0 8px rgba(245, 158, 11, 0.9);
    }
    
    .severity-low .alert-severity-bar {
      background: #3B82F6;
      box-shadow: 0 0 8px rgba(59, 130, 246, 0.9);
    }
    
    .alert-content {
      flex: 1;
      min-width: 0;
    }
    
    .alert-message {
      font-size: 0.875rem;
      color: var(--linear-text-primary);
      font-weight: 500;
      margin-bottom: 0.5rem;
      line-height: 1.25;
    }
    
    .alert-meta {
      display: flex;
      gap: 0.75rem;
      font-size: 0.75rem;
      color: var(--linear-text-secondary);
    }
    
    .alert-source {
      font-weight: 300;
    }
    
    .alert-time {
      font-family: 'Monaco', 'Menlo', 'Courier New', monospace;
      border: 1px solid rgba(255, 255, 255, 0.2);
      background: rgba(255, 255, 255, 0.05);
      border-radius: 4px;
      padding: 2px 4px;
      font-size: 0.65rem;
      color: var(--linear-text-secondary);
      font-weight: 300;
      line-height: 1.25;
    }
    
    /* Compliance Snapshot */
    .compliance-section-content {
      display: flex;
      gap: 1rem;
      align-items: flex-start;
      margin-top: 1rem;
    }
    
    .compliance-content {
      flex: 1;
      padding-top: 0.25rem;
      margin-top: 2;
    }
    
    .compliance-metric {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: .35rem 0;
      border-bottom: 1px solid rgba(255, 255, 255, 0.03);
      
      &:last-of-type {
        border-bottom: none;
      }
    }
    
    .compliance-label {
      font-size: 0.8125rem;
      color: var(--linear-text-secondary);
      font-weight: 500;
    }
    
    .compliance-value {
      font-size: 0.875rem;
      color: var(--linear-text-primary);
      font-weight: 300;
      
      &.status-good {
        color: #22C55E;
      }
    }
    
    .compliance-score {
      border-radius: 4px;
      padding: 1.25rem;
      transition: all 200ms ease;
      cursor: default;
      position: relative;
      border: 1px solid rgb(255 255 255 / 0.05);
      text-align: left;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      min-width: 140px;
      flex-shrink: 0;
      
      &:hover {
        background: rgba(255, 255, 255, 0.02);
      }
    }
    
    .score-label {
      font-size: 0.75rem;
      color: #9A9A9C;
      margin-bottom: 0.75rem;
    }
    
    .score-value {
      font-size: 2.5rem;
      font-weight: 600;
      color: var(--linear-text-primary);
      line-height: 1;
      
      .score-unit {
        font-size: 1.25rem;
        color: #9A9A9C;
        margin-left: 0.25rem;
      }
    }

    /* Developer Dashboard Styles */
    .deployments-list {
      margin-top: 1rem;
    }
    
    .deployment-item {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 1rem;
      background: rgba(255, 255, 255, 0.01);
      border: 1px solid rgb(255 255 255 / 0.05);
      border-radius: 4px;
      margin-bottom: 0.5rem;
      transition: background 150ms ease;
      
      &:last-child {
        margin-bottom: 0;
      }
      
      &:hover {
        background: rgba(255, 255, 255, 0.02);
      }
    }
    
    .deployment-info {
      flex: 1;
    }
    
    .deployment-api {
      font-size: 0.875rem;
      font-weight: 500;
      color: var(--linear-text-primary);
      margin-bottom: 0.25rem;
    }
    
    .deployment-meta {
      display: flex;
      gap: 0.75rem;
      font-size: 0.75rem;
      color: var(--linear-text-secondary);
    }
    
    .deployment-time {
      font-family: 'Monaco', 'Menlo', 'Courier New', monospace;
      border: 1px solid rgba(255, 255, 255, 0.2);
      background: rgba(255, 255, 255, 0.05);
      border-radius: 4px;
      padding: 2px 4px;
      font-size: 0.65rem;
    }

    .empty-deployments,
    .empty-alerts {
      padding: 2rem;
      text-align: center;
      color: var(--linear-text-secondary);
      font-size: 0.875rem;
    }
  `]
})
export class DashboardComponent implements OnInit, AfterViewInit {
  private roleService = inject(RoleService);
  private devService = inject(InMemoryDevService);

  @ViewChild('activityTable') activityTable!: ElementRef<DataTableComponent>;
  @ViewChild('devActivityTable') devActivityTable!: ElementRef<DataTableComponent>;
  
  loading = false;
  eventsTableModel = new TableModel();
  devEventsTableModel = new TableModel();
  selectedFilter = '24h';
  
  currentRole = signal<string>('system-administrator');
  
  systemServices: SystemService[] = [
    { name: 'API Gateway', status: 'healthy', lastChecked: '2 min ago' },
    { name: 'Auth Service', status: 'healthy', lastChecked: '1 min ago' },
    { name: 'Monitoring Agent', status: 'warning', lastChecked: '5 min ago' },
    { name: 'Database Sync', status: 'healthy', lastChecked: '30 sec ago' },
    { name: 'Compliance Scanner', status: 'healthy', lastChecked: '10 min ago' }
  ];
  
  alerts: Alert[] = [
    { severity: 'high', timestamp: '14:32', source: 'Order API', message: 'High Latency Detected' },
    { severity: 'medium', timestamp: '13:15', source: 'Auth Service', message: 'Failed Auth Attempt' },
    { severity: 'low', timestamp: '12:08', source: 'Monitoring', message: 'Certificate Expiring Soon' }
  ];

  // Developer data
  devApis = signal<any[]>([]);
  devServiceAccounts = signal<any[]>([]);
  devDeployments = signal<any[]>([]);

  devServices = computed(() => [
    { name: 'API Gateway', status: 'healthy' as const, lastChecked: '2 min ago' },
    { name: 'Sandbox Env', status: 'healthy' as const, lastChecked: '1 min ago' },
    { name: 'Dev Tools', status: 'healthy' as const, lastChecked: '3 min ago' }
  ]);

  devApisCount = computed(() => this.devApis().length);
  devServiceAccountsCount = computed(() => this.devServiceAccounts().length);

  recentDeployments = computed(() => {
    return [...this.devDeployments()]
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, 5)
      .map(d => ({
        id: d.id,
        apiName: d.apiId ? 'Orders API' : 'N/A', // Would fetch actual API name
        version: d.version,
        env: d.env,
        status: d.status,
        createdAt: d.createdAt
      }));
  });

  lastDeploymentStatus = computed(() => {
    const sorted = [...this.devDeployments()].sort((a, b) => 
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
    return sorted[0]?.status || 'queued';
  });

  devAlerts = computed(() => [
    { severity: 'medium' as const, timestamp: '14:15', source: 'Sandbox', message: 'Rate limit approaching threshold' }
  ]);

  ngOnInit() {
    // Subscribe to role changes
    this.roleService.role$.subscribe(role => {
      this.currentRole.set(role);
      if (role === 'developer-internal') {
        this.loadDeveloperData();
      }
    });

    // Initialize admin table header
    this.eventsTableModel.header = [
      new TableHeaderItem({ data: 'Timestamp' }),
      new TableHeaderItem({ data: 'User' }),
      new TableHeaderItem({ data: 'Action' }),
      new TableHeaderItem({ data: 'Resource' }),
    ];
    
    // Sample recent events data with status
    this.eventsTableModel.data = [
      [
        new TableItem({ data: '2024-11-06 14:32' }), 
        new TableItem({ data: 'john@acme.com' }), 
        new TableItem({ data: 'Service Account Created' }), 
        new TableItem({ data: 'api-client-prod' }),
      ],
      [
        new TableItem({ data: '2024-11-06 13:15' }), 
        new TableItem({ data: 'jane@techstart.com' }), 
        new TableItem({ data: 'API Access Modified' }), 
        new TableItem({ data: 'Customer API' }),
      ],
      [
        new TableItem({ data: '2024-11-06 12:08' }), 
        new TableItem({ data: 'admin@system' }), 
        new TableItem({ data: 'Company Registered' }), 
        new TableItem({ data: 'TechStart Inc' }),
      ],
      [
        new TableItem({ data: '2024-11-06 11:45' }), 
        new TableItem({ data: 'john@acme.com' }), 
        new TableItem({ data: 'User Invited' }), 
        new TableItem({ data: 'jane@acme.com' }),
      ],
      [
        new TableItem({ data: '2024-11-06 10:22' }), 
        new TableItem({ data: 'system' }), 
        new TableItem({ data: 'Alert Triggered' }), 
        new TableItem({ data: 'High Latency - Order API' }),
      ]
    ];

    // Initialize developer table
    this.devEventsTableModel.header = [
      new TableHeaderItem({ data: 'Timestamp' }),
      new TableHeaderItem({ data: 'User' }),
      new TableHeaderItem({ data: 'Action' }),
      new TableHeaderItem({ data: 'Resource' }),
    ];

    // Get initial role and load data
    this.roleService.role$.subscribe(role => {
      this.currentRole.set(role);
      if (role === 'developer-internal') {
        this.loadDeveloperData();
      }
    }).unsubscribe(); // Get initial value
    
    // Subscribe to role changes
    this.roleService.role$.subscribe(role => {
      this.currentRole.set(role);
      if (role === 'developer-internal') {
        this.loadDeveloperData();
      }
    });
  }

  loadDeveloperData() {
    this.devService.listApis().subscribe(apis => this.devApis.set(apis));
    this.devService.listServiceAccounts().subscribe(accounts => this.devServiceAccounts.set(accounts));
    this.devService.deployments$.subscribe(deployments => {
      this.devDeployments.set(deployments);
      this.updateDevActivityTable();
    });
  }

  updateDevActivityTable() {
    const deployments = this.devDeployments();
    const apis = this.devApis();
    
    // Build activity from deployments and other dev actions
    const activities: any[] = [];
    
    // Add deployment activities
    deployments.slice(0, 3).forEach(d => {
      const api = apis.find(a => a.id === d.apiId);
      activities.push([
        new TableItem({ data: new Date(d.createdAt).toLocaleString() }), 
        new TableItem({ data: 'developer@internal.com' }), 
        new TableItem({ data: 'API_DEPLOYED' }), 
        new TableItem({ data: `${api?.name || 'API'} ${d.version} to ${d.env}` }),
      ]);
    });
    
    // Add other activities if we don't have enough deployments
    if (activities.length < 3) {
      activities.push([
        new TableItem({ data: new Date(Date.now() - 3600000).toLocaleString() }), 
        new TableItem({ data: 'developer@internal.com' }), 
        new TableItem({ data: 'SERVICE_ACCOUNT_CREATED' }), 
        new TableItem({ data: 'Platform Integration' }),
      ]);
    }
    
    if (activities.length < 3) {
      activities.push([
        new TableItem({ data: new Date(Date.now() - 5400000).toLocaleString() }), 
        new TableItem({ data: 'developer@internal.com' }), 
        new TableItem({ data: 'ROUTE_ADDED' }), 
        new TableItem({ data: 'Orders API /orders/{id}' }),
      ]);
    }
    
    this.devEventsTableModel.data = activities;
  }

  formatTime(timestamp: string): string {
    return new Date(timestamp).toLocaleString('en-US', { 
      month: 'short', 
      day: 'numeric', 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  }
  
  ngAfterViewInit() {
    // Wrap timestamp text in badge spans after table renders
    setTimeout(() => {
      this.wrapTimestampsInBadges();
    }, 200);
  }
  
  wrapTimestampsInBadges() {
    const role = this.currentRole();
    const tableComponent = role === 'developer-internal' 
      ? this.devActivityTable?.nativeElement 
      : this.activityTable?.nativeElement;
    
    if (!tableComponent) return;
    
    // Wait a bit for table to render
    setTimeout(() => {
      const tableElement = tableComponent.elementRef?.nativeElement?.querySelector('ibm-table') || 
                          tableComponent.elementRef?.nativeElement;
      if (!tableElement) return;
      
      const timestampCells = tableElement.querySelectorAll('tbody td:first-child');
      
      timestampCells.forEach((cell: HTMLElement) => {
        // Skip if already wrapped
        if (cell.querySelector('.timestamp-badge')) return;
        
        // Get the text content
        const text = cell.textContent?.trim();
        if (!text) return;
        
        // Create badge span
        const badge = document.createElement('span');
        badge.className = 'timestamp-badge';
        badge.textContent = text;
        
        // Clear cell and add badge
        cell.textContent = '';
        cell.appendChild(badge);
      });
    }, 100);
  }
}
