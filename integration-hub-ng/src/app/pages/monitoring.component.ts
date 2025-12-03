import { Component, OnInit } from '@angular/core';

@Component({
  selector: 'app-monitoring',
  standalone: false,
  template: `
    <div class="page-header">
      <h1 class="page-title">Monitoring</h1>
      <p class="page-subtitle">System health, performance metrics, and analytics</p>
    </div>
    
    <div class="monitoring-grid">
      <div class="monitoring-card">
        <div class="card-label">system health</div>
        <div class="card-value">98.5%</div>
        <div class="card-trend">↑ 0.2% from last hour</div>
      </div>
      
      <div class="monitoring-card">
        <div class="card-label">active apis</div>
        <div class="card-value">24</div>
        <div class="card-trend">2 in maintenance</div>
      </div>
      
      <div class="monitoring-card">
        <div class="card-label">requests (24h)</div>
        <div class="card-value">1.2M</div>
        <div class="card-trend">↑ 12% from yesterday</div>
      </div>
      
      <div class="monitoring-card">
        <div class="card-label">error rate</div>
        <div class="card-value">0.03%</div>
        <div class="card-trend">↓ 0.01% from last hour</div>
      </div>
    </div>
    
    <div class="page-section">
      <div class="section-header">
        <h2 class="section-title">recent alerts</h2>
      </div>
      <div class="section-content">
        <div class="alert-item">
          <div class="alert-severity warning"></div>
          <div class="alert-content">
            <div class="alert-title">High request latency detected</div>
            <div class="alert-meta">Customer API • 5 minutes ago</div>
          </div>
        </div>
        <div class="alert-item">
          <div class="alert-severity info"></div>
          <div class="alert-content">
            <div class="alert-title">API version deprecation notice</div>
            <div class="alert-meta">Payment API v2.0 • 2 hours ago</div>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .page-header {
      margin-bottom: 4rem;
    }
    
    .page-title {
      font-size: 1.75rem;
      font-weight: 600;
      color: var(--linear-text-primary);
      margin: 0 0 0.5rem 0;
      letter-spacing: -0.02em;
      line-height: 1.2;
    }
    
    .page-subtitle {
      font-size: 0.875rem;
      color: var(--linear-text-secondary);
      margin: 0;
      font-weight: 400;
      line-height: 1.5;
    }
    
    .monitoring-grid {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 1rem;
      margin-bottom: 4rem;
      
      @media (min-width: 768px) {
        grid-template-columns: repeat(4, 1fr);
        gap: 1.25rem;
      }
    }
    
    .monitoring-card {
      background: var(--linear-surface);
      border: 1px solid var(--linear-border);
      border-radius: 12px;
      padding: 1.5rem;
    }
    
    .card-label {
      font-size: 0.75rem;
      font-weight: 500;
      color: var(--linear-text-secondary);
      margin-bottom: 0.875rem;
      text-transform: lowercase;
      letter-spacing: 0.01em;
    }
    
    .card-value {
      font-size: 2rem;
      font-weight: 600;
      color: var(--linear-text-primary);
      line-height: 1;
      letter-spacing: -0.03em;
      margin-bottom: 0.5rem;
    }
    
    .card-trend {
      font-size: 0.75rem;
      color: var(--linear-text-secondary);
      line-height: 1.5;
    }
    
    .page-section {
      background: var(--linear-surface);
      border: 1px solid var(--linear-border);
      border-radius: 12px;
      overflow: hidden;
    }
    
    .section-header {
      padding: 1.5rem 1.75rem;
      border-bottom: 1px solid var(--linear-border);
    }
    
    .section-title {
      font-size: 0.875rem;
      font-weight: 600;
      color: var(--linear-text-secondary);
      margin: 0;
      letter-spacing: 0.01em;
      text-transform: lowercase;
    }
    
    .section-content {
      padding: 1rem 1.75rem;
    }
    
    .alert-item {
      display: flex;
      gap: 1rem;
      padding: 1rem 0;
      border-bottom: 1px solid var(--linear-border);
      
      &:last-child {
        border-bottom: none;
      }
    }
    
    .alert-severity {
      width: 4px;
      border-radius: 2px;
      flex-shrink: 0;
      
      &.warning {
        background: #F59E0B;
      }
      
      &.info {
        background: var(--linear-accent);
      }
    }
    
    .alert-content {
      flex: 1;
    }
    
    .alert-title {
      font-size: 0.875rem;
      font-weight: 500;
      color: var(--linear-text-primary);
      margin-bottom: 0.25rem;
    }
    
    .alert-meta {
      font-size: 0.75rem;
      color: var(--linear-text-secondary);
    }
  `]
})
export class MonitoringComponent implements OnInit {
  ngOnInit() {}
}

