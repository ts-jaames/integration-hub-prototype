import { Component, OnInit, AfterViewInit, signal, computed, inject, HostListener, ViewChild, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import {
  TableModule,
  TableModel,
  TableItem,
  TableHeaderItem,
  ButtonModule,
  TagModule,
  ModalModule,
  InputModule,
  SelectModule,
  CheckboxModule,
  TabsModule
} from 'carbon-components-angular';
import { InMemoryDevService } from '../../services/in-memory-dev.service';
import { ApiEntity, ApiAuditLog, EnvKey } from '../../models';
import { StatusTagPipe } from '../../shared/pipes/status-tag.pipe';
import { DataTableComponent } from '../../../shared/components/data-table/data-table.component';
import { ConfirmDialogComponent } from '../../shared/components/confirm-dialog/confirm-dialog.component';

@Component({
  selector: 'app-api-catalog',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    TableModule,
    ButtonModule,
    TagModule,
    ModalModule,
    InputModule,
    SelectModule,
    CheckboxModule,
    TabsModule,
    StatusTagPipe,
    DataTableComponent,
    ConfirmDialogComponent
  ],
  template: `
    <div class="page-wrapper" [class.drawer-open]="detailsDrawerOpen()">
      <div class="page-container">
        <!-- Page Header -->
        <div class="page-header">
          <div class="header-content">
            <div class="header-text">
              <h1>API Catalog</h1>
            </div>
            <div class="header-actions">
              <button ibmButton="primary" (click)="router.navigate(['/dev/apis/new'])">
                New API
              </button>
            </div>
          </div>
        </div>


        <!-- Enhanced Filters -->
        <div class="page-toolbar">
          <div class="toolbar-left">
            <div class="search-wrapper">
              <input 
                ibmText 
                placeholder="Search by name, slug, or tag..." 
                [(ngModel)]="searchQuery" 
                (ngModelChange)="updateFilters()"
                class="search-input">
            </div>
            
            <div class="filter-pills">
              <button 
                class="filter-pill" 
                [class.active]="statusFilter === 'released'"
                (click)="toggleStatusFilter('released')">
                Active
              </button>
              <button 
                class="filter-pill" 
                [class.active]="statusFilter === 'deprecated'"
                (click)="toggleStatusFilter('deprecated')">
                Deprecated
              </button>
              <button 
                class="filter-pill" 
                [class.active]="envFilter === 'sandbox'"
                (click)="toggleEnvFilter('sandbox')">
                Sandbox
              </button>
              <button 
                class="filter-pill" 
                [class.active]="envFilter === 'prod'"
                (click)="toggleEnvFilter('prod')">
                Prod
              </button>
              <select [(ngModel)]="ownerFilter" (ngModelChange)="updateFilters()" class="owner-select">
                <option value="">All Owners</option>
                <option *ngFor="let owner of uniqueOwners()" [value]="owner">{{ owner }}</option>
              </select>
              <select [(ngModel)]="tagFilter" (ngModelChange)="updateFilters()" class="tag-select">
                <option value="">All Tags</option>
                <option *ngFor="let tag of uniqueTags()" [value]="tag">{{ tag }}</option>
              </select>
            </div>
          </div>
          
          <button 
            *ngIf="hasActiveFilters()"
            class="reset-filters" 
            (click)="resetFilters()">
            Reset Filters
          </button>
        </div>

        <!-- Main Table -->
        <div class="table-card">
          <h2 class="card-title">All APIs</h2>
          
          <div *ngIf="filteredApis().length === 0 && !loading()" class="empty-state">
            <div class="empty-icon">📡</div>
            <h3>No APIs found</h3>
            <button ibmButton="primary" (click)="router.navigate(['/dev/apis/new'])">Create API</button>
          </div>

          <div *ngIf="filteredApis().length > 0 || loading()" class="app-table">
            <app-data-table 
              #apiTable
              [model]="tableModel" 
              [loading]="loading()" 
              size="sm"
              (rowClick)="onRowClick($event)"
              (onRowClick)="onRowClick($event)">
            </app-data-table>
          </div>

        </div>
      </div>

      <!-- API Detail Drawer -->
      <div class="details-drawer" [class.open]="detailsDrawerOpen()">
        <div class="drawer-header">
          <div class="drawer-header-content">
            <div>
              <h2>{{ selectedApi()?.name || 'Details' }}</h2>
              <div class="drawer-subheader">
                <code class="api-slug">{{ selectedApi()?.slug || '' }}</code>
              </div>
            </div>
            <ibm-tag [type]="getStatusTagType(selectedApi())">
              {{ getCurrentVersionStatus(selectedApi()) | statusTag }}
            </ibm-tag>
          </div>
          <button 
            class="close-button" 
            (click)="closeDetailsDrawer()"
            aria-label="Close details drawer">
            ×
          </button>
        </div>
        
        <div class="drawer-content" *ngIf="selectedApi()">
          <ibm-tabs>
            <ibm-tab heading="Overview">
              <div class="tab-content">
                <div class="detail-item">
                  <label>Description</label>
                  <div>{{ selectedApi()!.description || 'No description' }}</div>
                </div>
                <div class="detail-item">
                  <label>Owner Team</label>
                  <div>{{ selectedApi()!.ownerTeam || 'Unassigned' }}</div>
                </div>
                <div class="detail-item">
                  <label>Environments</label>
                  <div class="env-tags">
                    <ibm-tag *ngFor="let env of selectedApi()!.envs" type="blue">
                      {{ env === 'prod' ? 'Production' : 'Sandbox' }}
                    </ibm-tag>
                  </div>
                </div>
                <div class="detail-item">
                  <label>Auth Method</label>
                  <div>{{ selectedApi()!.authMethod || 'Not configured' }}</div>
                </div>
                <div class="detail-item">
                  <label>Version</label>
                  <div>
                    <select [(ngModel)]="selectedVersion" (ngModelChange)="onVersionChange()" class="version-select">
                      <option *ngFor="let v of selectedApi()!.versions" [value]="v.name">
                        {{ v.name }} ({{ v.status }})
                      </option>
                    </select>
                  </div>
                </div>
                <div class="detail-item" *ngIf="selectedApi()?.tags && selectedApi()!.tags!.length > 0">
                  <label>Tags</label>
                  <div class="tags-list">
                    <ibm-tag *ngFor="let tag of selectedApi()!.tags!" type="gray">
                      {{ tag }}
                    </ibm-tag>
                  </div>
                </div>
                <div class="detail-item" *ngIf="selectedApi()?.deprecationNotice">
                  <label>Deprecation Notice</label>
                  <div class="deprecation-notice">{{ selectedApi()!.deprecationNotice }}</div>
                </div>
                <div class="detail-item">
                  <label>Created</label>
                  <div>{{ formatDate(selectedApi()!.createdAt) }}</div>
                </div>
                <div class="detail-item">
                  <label>Last Updated</label>
                  <div>{{ formatDate(selectedApi()!.updatedAt) }}</div>
                </div>
              </div>
            </ibm-tab>
            
            <ibm-tab heading="Usage">
              <div class="tab-content">
                <div class="usage-metrics" *ngIf="selectedApi()?.usageMetrics">
                  <div class="metric-card">
                    <div class="metric-label">Total Requests (7d)</div>
                    <div class="metric-value">{{ selectedApi()!.usageMetrics!.totalRequests.toLocaleString() }}</div>
                  </div>
                  <div class="metric-card">
                    <div class="metric-label">Error Rate</div>
                    <div class="metric-value">{{ (selectedApi()!.usageMetrics!.errorRate * 100).toFixed(2) }}%</div>
                  </div>
                  <div class="metric-card">
                    <div class="metric-label">Avg Latency</div>
                    <div class="metric-value">{{ selectedApi()!.usageMetrics!.avgLatency }}ms</div>
                  </div>
                  <div class="sparkline-container">
                    <label>Requests Trend (7 days)</label>
                    <div class="sparkline">
                      <svg width="100%" height="40" viewBox="0 0 200 40">
                        <polyline
                          [attr.points]="getSparklinePoints(selectedApi()!.usageMetrics!.requestsLast7Days)"
                          fill="none"
                          stroke="var(--linear-accent)"
                          stroke-width="2"/>
                      </svg>
                    </div>
                  </div>
                </div>
                <div *ngIf="!selectedApi()?.usageMetrics" class="no-metrics">
                  No usage data available
                </div>
              </div>
            </ibm-tab>
            
            <ibm-tab heading="Consumers">
              <div class="tab-content">
                <div class="consumers-list" *ngIf="selectedApi()?.consumers && selectedApi()!.consumers!.length > 0">
                  <div *ngFor="let consumer of selectedApi()!.consumers!" class="consumer-item">
                    <div>
                      <strong>{{ consumer.name }}</strong>
                      <div class="consumer-type">{{ consumer.type }}</div>
                    </div>
                  </div>
                </div>
                <div *ngIf="!selectedApi()?.consumers || selectedApi()!.consumers!.length === 0" class="no-consumers">
                  No consumers registered
                </div>
              </div>
            </ibm-tab>
            
            <ibm-tab heading="Links">
              <div class="tab-content">
                <div class="links-list">
                  <a href="#" class="link-item" (click)="openSchema($event)">
                    <span>📄</span>
                    <span>View Schema (OpenAPI)</span>
                  </a>
                  <a href="#" class="link-item" (click)="openSwagger($event)">
                    <span>🔗</span>
                    <span>Open in Swagger UI</span>
                  </a>
                  <a href="#" class="link-item" (click)="openPostman($event)">
                    <span>📬</span>
                    <span>Import to Postman</span>
                  </a>
                  <a href="#" class="link-item" (click)="openDocs($event)">
                    <span>📚</span>
                    <span>View Documentation</span>
                  </a>
                  <a href="#" class="link-item" (click)="openLogs($event)">
                    <span>📊</span>
                    <span>View Logs</span>
                  </a>
                </div>
              </div>
            </ibm-tab>
            
            <ibm-tab heading="Audit Log">
              <div class="tab-content">
                <div class="audit-list">
                  <div *ngFor="let log of auditLogs()" class="audit-item">
                    <div class="audit-time">{{ formatTime(log.timestamp) }}</div>
                    <div class="audit-action">{{ log.action }}</div>
                    <div class="audit-actor">{{ log.actor }}</div>
                    <div class="audit-details">{{ log.details || '' }}</div>
                  </div>
                </div>
              </div>
            </ibm-tab>
          </ibm-tabs>
        </div>
      </div>

      <!-- Drawer Overlay -->
      <div 
        class="drawer-overlay" 
        [class.open]="detailsDrawerOpen() || actionMenuOpen() !== null"
        (click)="closeAll()"
        aria-hidden="true">
      </div>

      <!-- Action Menu (positioned fixed) -->
      <div class="action-menu" [class.open]="actionMenuOpen() !== null" *ngIf="actionMenuOpen() !== null && getApiById(actionMenuOpen()!)">
        <button class="menu-item" (click)="editApi(getApiById(actionMenuOpen()!)!)">
          <span>✏️</span>
          <span>Edit Metadata</span>
        </button>
        <button class="menu-item" (click)="deprecateApi(getApiById(actionMenuOpen()!)!)" *ngIf="getCurrentVersionStatus(getApiById(actionMenuOpen()!)!) !== 'deprecated'">
          <span>⚠️</span>
          <span>Deprecate</span>
        </button>
        <button class="menu-item" (click)="reEnableApi(getApiById(actionMenuOpen()!)!)" *ngIf="getCurrentVersionStatus(getApiById(actionMenuOpen()!)!) === 'deprecated'">
          <span>✅</span>
          <span>Re-enable</span>
        </button>
        <button class="menu-item" (click)="rotateCredentials(getApiById(actionMenuOpen()!)!)">
          <span>🔄</span>
          <span>Rotate Credentials</span>
        </button>
        <button class="menu-item" (click)="syncSchema(getApiById(actionMenuOpen()!)!)">
          <span>🔄</span>
          <span>Sync Schema</span>
        </button>
        <button class="menu-item danger" (click)="deleteApi(getApiById(actionMenuOpen()!)!)">
          <span>🗑️</span>
          <span>Delete</span>
        </button>
      </div>

      <!-- Deprecate Confirmation Dialog -->
      <app-confirm-dialog
        [open]="deprecateConfirmOpen()"
        title="Deprecate API"
        [message]="deprecateConfirmMessage()"
        confirmLabel="Deprecate"
        [danger]="true"
        (confirmed)="confirmDeprecate()"
        (cancelled)="cancelDeprecate()">
      </app-confirm-dialog>
    </div>
  `,
  styles: [`
    .page-wrapper {
      min-height: 100vh;
      background: var(--linear-bg);
    }

    .page-container {
      max-width: 1200px;
      margin: 0 auto;
    }

    .page-header {
      margin-bottom: 24px;
    }

    .header-content {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      gap: 24px;
    }

    .header-text {
      flex: 1;
    }

    h1 {
      font-size: 2rem;
      font-weight: 600;
      color: var(--linear-text-primary);
      margin: 0 0 8px 0;
    }

    .header-subtext {
      font-size: 0.875rem;
      color: var(--linear-text-secondary);
      margin: 0;
      line-height: 1.5;
    }

    .header-actions {
      display: flex;
      gap: 12px;
    }

    /* Recent Section */
    .recent-section {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
      gap: 16px;
      margin-bottom: 24px;
    }

    .recent-widget {
      //background: var(--linear-surface);
      //border: 1px solid rgba(255, 255, 255, 0.05);
      //border-radius: 10px;
      //padding: 16px;
      margin-top: 1.25rem;
    }

    .recent-widget h3 {
      font-size: 0.85rem;
      font-weight: 400;
      color: var(--linear-text-secondary);
      margin: 0 0 12px 0;
    }

    .recent-list {
      display: flex;
      flex-direction: column;
      gap: 8px;
    }

    .recent-item {
      display: flex;
      justify-content: space-between;
      border: 1px solid rgba(255, 255, 255, 0.05);
      align-items: center;
      padding: 8px;
      border-radius: 6px;
      cursor: pointer;
      transition: background 150ms ease;
    }

    .recent-item:hover {
      background: rgba(255, 255, 255, 0.02);
    }

    .recent-name {
      font-size: 0.875rem;
      color: var(--linear-text-primary);
      font-weight: 500;
    }

    .recent-time {
      font-size: 0.75rem;
      color: var(--linear-text-secondary);
    }

    /* Page Toolbar */
    .page-toolbar {
      display: flex;
      margin-top: 4rem;
      justify-content: space-between;
      align-items: center;
      gap: 16px;
      margin-bottom: 16px;
      background: var(--linear-surface);
    }

    .toolbar-left {
      display: flex;
      align-items: center;
      gap: 12px;
      flex: 1;
      flex-wrap: wrap;
    }

    .search-wrapper {
      position: relative;
      flex: 1;
      min-width: 250px;
    }

    .search-input {
      width: 100%;
    }

    .filter-pills {
      display: flex;
      gap: 8px;
      flex-wrap: wrap;
      align-items: center;
    }

    .filter-pill {
      padding: 6px 12px;
      background: transparent;
      border: 1px solid rgba(255, 255, 255, 0.06);
      border-radius: 16px;
      color: var(--linear-text-secondary);
      font-size: 0.8125rem;
      cursor: pointer;
      transition: all 150ms ease;
    }

    .filter-pill:hover {
      background: rgba(255, 255, 255, 0.02);
      border-color: rgba(255, 255, 255, 0.1);
    }

    .filter-pill.active {
      background: rgba(255, 255, 255, 0.08);
      border-color: rgba(255, 255, 255, 0.15);
      color: var(--linear-text-primary);
    }

    .owner-select, .tag-select {
      padding: 6px 12px;
      background: var(--linear-surface);
      border: 1px solid rgba(255, 255, 255, 0.06);
      border-radius: 6px;
      color: var(--linear-text-primary);
      font-size: 0.8125rem;
    }

    .reset-filters {
      font-size: 0.8125rem;
      color: var(--linear-text-secondary);
      background: none;
      border: none;
      cursor: pointer;
      padding: 6px 12px;
      text-decoration: underline;
    }

    .reset-filters:hover {
      color: var(--linear-text-primary);
    }

    /* Table Card */
    .table-card {
    margin-top: 2rem;
    }

    .card-title {
      font-size: .85rem;
      font-weight: 400;
      color: var(--linear-text-secondary);
      margin: 0 0 16px 0;
    }

    .app-table {
      margin-top: 16px;
    }

    /* Make table rows clickable */
    ::ng-deep .app-table tbody tr {
      cursor: pointer;
      transition: background-color 150ms ease;
    }

    ::ng-deep .app-table tbody tr:hover {
      background-color: rgba(255, 255, 255, 0.02);
    }

    /* Action column should not trigger row click */
    ::ng-deep .app-table tbody td:last-child {
      cursor: pointer;
    }

    /* Empty State */
    .empty-state {
      text-align: center;
      padding: 48px 24px;
    }

    .empty-icon {
      font-size: 3rem;
      margin-bottom: 16px;
      opacity: 0.5;
    }

    .empty-state h3 {
      font-size: 1.125rem;
      color: var(--linear-text-primary);
      margin: 0 0 8px 0;
    }

    /* Details Drawer */
    .drawer-overlay {
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: rgba(0, 0, 0, 0.8);
      backdrop-filter: blur(10px);
      z-index: 1000;
      opacity: 0;
      pointer-events: none;
      transition: opacity 200ms ease;
    }

    .drawer-overlay.open {
      opacity: 1;
      pointer-events: all;
    }

    .details-drawer {
      position: fixed;
      top: 0;
      right: -480px;
      width: 480px;
      max-width: 90vw;
      height: 100vh;
      background: var(--linear-surface);
      border-left: 1px solid rgba(255, 255, 255, 0.06);
      z-index: 1001;
      transition: right 300ms ease;
      display: flex;
      flex-direction: column;
      overflow: hidden;
      box-shadow: -4px 0 24px rgba(0, 0, 0, 0.2);
    }

    .details-drawer.open {
      right: 0;
    }

    .drawer-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      padding: 20px;
      border-bottom: 1px solid rgba(255, 255, 255, 0.06);
    }

    .drawer-header-content {
      flex: 1;
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
    }

    .drawer-header h2 {
      font-size: 1.25rem;
      font-weight: 600;
      color: var(--linear-text-primary);
      margin: 0 0 8px 0;
    }

    .drawer-subheader {
      display: flex;
      align-items: center;
      gap: 8px;
      margin-top: 4px;
    }

    .api-slug {
      font-family: monospace;
      font-size: 0.8125rem;
      color: var(--linear-text-secondary);
      background: rgba(255, 255, 255, 0.05);
      padding: 4px 8px;
      border-radius: 4px;
    }

    .close-button {
      background: none;
      border: none;
      font-size: 1.5rem;
      color: var(--linear-text-secondary);
      cursor: pointer;
      padding: 0;
      width: 32px;
      height: 32px;
      display: flex;
      align-items: center;
      justify-content: center;
      border-radius: 6px;
      transition: background 150ms ease;
    }

    .close-button:hover {
      background: rgba(255, 255, 255, 0.05);
    }

    .drawer-content {
      flex: 1;
      overflow-y: auto;
      padding: 20px;
    }

    .tab-content {
      padding: 16px 0;
    }

    .detail-item {
      margin-bottom: 16px;
    }

    .detail-item label {
      display: block;
      font-size: 0.75rem;
      color: var(--linear-text-secondary);
      text-transform: uppercase;
      font-weight: 600;
      margin-bottom: 8px;
    }

    .detail-item > div {
      color: var(--linear-text-primary);
      font-size: 0.875rem;
    }

    .env-tags, .tags-list {
      display: flex;
      gap: 8px;
      flex-wrap: wrap;
    }

    .version-select {
      padding: 6px 12px;
      background: var(--linear-surface);
      border: 1px solid rgba(255, 255, 255, 0.06);
      border-radius: 6px;
      color: var(--linear-text-primary);
      font-size: 0.875rem;
    }

    .deprecation-notice {
      padding: 12px;
      background: rgba(245, 158, 11, 0.1);
      border: 1px solid rgba(245, 158, 11, 0.2);
      border-radius: 6px;
      color: var(--linear-text-primary);
    }

    /* Usage Metrics */
    .usage-metrics {
      display: flex;
      flex-direction: column;
      gap: 16px;
    }

    .metric-card {
      padding: 12px;
      background: rgba(255, 255, 255, 0.02);
      border: 1px solid rgba(255, 255, 255, 0.06);
      border-radius: 6px;
    }

    .metric-label {
      font-size: 0.75rem;
      color: var(--linear-text-secondary);
      margin-bottom: 4px;
    }

    .metric-value {
      font-size: 1.25rem;
      font-weight: 600;
      color: var(--linear-text-primary);
    }

    .sparkline-container {
      margin-top: 16px;
    }

    .sparkline-container label {
      display: block;
      font-size: 0.75rem;
      color: var(--linear-text-secondary);
      margin-bottom: 8px;
    }

    .sparkline {
      width: 100%;
      height: 40px;
      background: rgba(255, 255, 255, 0.02);
      border-radius: 4px;
      padding: 4px;
    }

    .no-metrics, .no-consumers {
      padding: 24px;
      text-align: center;
      color: var(--linear-text-secondary);
      font-size: 0.875rem;
    }

    /* Consumers */
    .consumers-list {
      display: flex;
      flex-direction: column;
      gap: 12px;
    }

    .consumer-item {
      padding: 12px;
      background: rgba(255, 255, 255, 0.02);
      border: 1px solid rgba(255, 255, 255, 0.06);
      border-radius: 6px;
    }

    .consumer-type {
      font-size: 0.75rem;
      color: var(--linear-text-secondary);
      margin-top: 4px;
    }

    /* Links */
    .links-list {
      display: flex;
      flex-direction: column;
      gap: 8px;
    }

    .link-item {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 12px;
      background: rgba(255, 255, 255, 0.02);
      border: 1px solid rgba(255, 255, 255, 0.06);
      border-radius: 6px;
      color: var(--linear-text-primary);
      text-decoration: none;
      transition: background 150ms ease;
      cursor: pointer;
    }

    .link-item:hover {
      background: rgba(255, 255, 255, 0.05);
    }

    /* Audit Log */
    .audit-list {
      display: flex;
      flex-direction: column;
      gap: 12px;
    }

    .audit-item {
      padding: 12px;
      background: rgba(255, 255, 255, 0.02);
      border: 1px solid rgba(255, 255, 255, 0.06);
      border-radius: 6px;
    }

    .audit-time {
      font-size: 0.75rem;
      color: var(--linear-text-secondary);
      margin-bottom: 4px;
    }

    .audit-action {
      font-size: 0.875rem;
      color: var(--linear-text-primary);
      font-weight: 500;
      margin-bottom: 2px;
    }

    .audit-actor {
      font-size: 0.8125rem;
      color: var(--linear-text-secondary);
      margin-bottom: 2px;
    }

    .audit-details {
      font-size: 0.8125rem;
      color: var(--linear-text-secondary);
    }

    /* Action Menu */
    .action-menu {
      position: fixed;
      background: var(--linear-surface);
      border: 1px solid rgba(255, 255, 255, 0.06);
      border-radius: 6px;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
      z-index: 1002;
      min-width: 200px;
      overflow: hidden;
      opacity: 0;
      pointer-events: none;
      transform: scale(0.95);
      transition: all 150ms ease;
    }

    .action-menu.open {
      opacity: 1;
      pointer-events: all;
      transform: scale(1);
    }

    .menu-item {
      display: flex;
      align-items: center;
      gap: 12px;
      width: 100%;
      padding: 12px 16px;
      background: transparent;
      border: none;
      color: var(--linear-text-primary);
      font-size: 0.875rem;
      text-align: left;
      cursor: pointer;
      transition: background 150ms ease;
    }

    .menu-item:hover {
      background: rgba(255, 255, 255, 0.05);
    }

    .menu-item.danger {
      color: #ef4444;
    }

    .menu-item.danger:hover {
      background: rgba(239, 68, 68, 0.1);
    }

    @media (max-width: 991px) {
      .details-drawer {
        width: 100vw;
        right: -100vw;
      }
      
      .page-container {
        padding: 16px 12px;
      }
      
      .header-content {
        flex-direction: column;
        align-items: stretch;
      }
    }
  `]
})
export class ApiCatalogPage implements OnInit, AfterViewInit {
  private devService = inject(InMemoryDevService);
  router = inject(Router);

  @ViewChild('apiTable') apiTable!: ElementRef<DataTableComponent>;

  loading = signal(false);
  apis = signal<ApiEntity[]>([]);
  selectedApi = signal<ApiEntity | null>(null);
  detailsDrawerOpen = signal(false);
  selectedVersion = '';
  auditLogs = signal<ApiAuditLog[]>([]);
  actionMenuOpen = signal<string | null>(null);
  apiToDeprecate = signal<ApiEntity | null>(null);
  deprecateConfirmOpen = signal(false);

  searchQuery = '';
  statusFilter = '';
  envFilter = '';
  ownerFilter = '';
  tagFilter = '';
  showDeprecated = false;

  tableModel = new TableModel();

  filteredApis = computed(() => {
    let filtered = [...this.apis()];

    if (this.searchQuery) {
      const query = this.searchQuery.toLowerCase();
      filtered = filtered.filter(a => 
        a.name.toLowerCase().includes(query) ||
        a.slug.toLowerCase().includes(query) ||
        (a.tags && a.tags.some(t => t.toLowerCase().includes(query)))
      );
    }

    if (this.statusFilter) {
      filtered = filtered.filter(a => 
        a.versions.some(v => v.status === this.statusFilter)
      );
    }

    if (this.envFilter) {
      filtered = filtered.filter(a => 
        a.envs.includes(this.envFilter as EnvKey)
      );
    }

    if (this.ownerFilter) {
      filtered = filtered.filter(a => 
        a.ownerTeam === this.ownerFilter
      );
    }

    if (this.tagFilter) {
      filtered = filtered.filter(a => 
        a.tags && a.tags.includes(this.tagFilter)
      );
    }

    if (!this.showDeprecated) {
      filtered = filtered.filter(a => 
        !a.versions.some(v => v.status === 'deprecated')
      );
    }

    return filtered;
  });

  uniqueOwners = computed(() => {
    const owners = new Set<string>();
    this.apis().forEach(api => {
      if (api.ownerTeam) owners.add(api.ownerTeam);
    });
    return Array.from(owners).sort();
  });

  uniqueTags = computed(() => {
    const tags = new Set<string>();
    this.apis().forEach(api => {
      if (api.tags) api.tags.forEach(tag => tags.add(tag));
    });
    return Array.from(tags).sort();
  });

  recentlyRegistered = computed(() => {
    return [...this.apis()]
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, 5);
  });

  recentlyUpdated = computed(() => {
    return [...this.apis()]
      .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
      .slice(0, 5);
  });

  recentlyDeprecated = computed(() => {
    return [...this.apis()]
      .filter(a => a.versions.some(v => v.status === 'deprecated'))
      .sort((a, b) => {
        const aDep = a.deprecatedAt || a.updatedAt;
        const bDep = b.deprecatedAt || b.updatedAt;
        return new Date(bDep).getTime() - new Date(aDep).getTime();
      })
      .slice(0, 5);
  });

  @HostListener('keydown', ['$event'])
  handleKeydown(event: KeyboardEvent) {
    if (event.key === 'Escape' && this.detailsDrawerOpen()) {
      this.closeDetailsDrawer();
    }
  }

  ngOnInit() {
    this.loadApis();
  }

  ngAfterViewInit() {
    // Attach click handlers to action column cells after table renders
    setTimeout(() => {
      this.attachActionMenuHandlers();
    }, 300);
  }

  attachActionMenuHandlers() {
    if (!this.apiTable?.nativeElement) return;
    
    const tableElement = this.apiTable.nativeElement.elementRef.nativeElement;
    const actionCells = tableElement.querySelectorAll('tbody td:last-child');
    
    actionCells.forEach((cell: HTMLElement, index: number) => {
      cell.style.cursor = 'pointer';
      
      // Remove existing listeners by cloning
      const newCell = cell.cloneNode(true) as HTMLElement;
      cell.parentNode?.replaceChild(newCell, cell);
      
      newCell.addEventListener('click', (e) => {
        e.stopPropagation(); // Prevent row click from firing
        e.preventDefault();
        const api = this.filteredApis()[index];
        if (api) {
          this.toggleActionMenu(api.id, e);
        }
      });
    });
  }

  loadApis() {
    this.loading.set(true);
    this.devService.listApis().subscribe({
      next: (apis) => {
        this.apis.set(apis);
        this.loading.set(false);
        this.updateTable();
      },
      error: () => {
        this.loading.set(false);
      }
    });
  }

  updateTable() {
    const apis = this.filteredApis();
    
    // Re-attach handlers after table update
    setTimeout(() => {
      this.attachActionMenuHandlers();
    }, 100);

    this.tableModel.header = [
      new TableHeaderItem({ data: 'API' }),
      new TableHeaderItem({ data: 'Version' }),
      new TableHeaderItem({ data: 'Owner' }),
      new TableHeaderItem({ data: 'Environments' }),
      new TableHeaderItem({ data: 'Status' }),
      new TableHeaderItem({ data: 'Usage' }),
      new TableHeaderItem({ data: 'Tags' }),
      new TableHeaderItem({ data: 'Actions' })
    ];

    this.tableModel.data = apis.map((api, index) => {
      const currentVersion = api.versions.find(v => v.name === api.currentVersion) || api.versions[0];
      const usageTag = this.getUsageTag(api);
      const envsDisplay = api.envs.map(e => e === 'prod' ? 'Prod' : 'Sandbox').join(', ');
      
      return [
        new TableItem({ data: api.name, expandedData: api }),
        new TableItem({ data: api.currentVersion }),
        new TableItem({ data: api.ownerTeam || 'Unassigned' }),
        new TableItem({ data: envsDisplay }),
        new TableItem({ data: currentVersion?.status || 'draft' }),
        new TableItem({ data: usageTag }),
        new TableItem({ data: api.tags?.join(', ') || 'None' }),
        new TableItem({ data: '⋮', expandedData: { api, index } })
      ];
    });
  }

  getUsageTag(api: ApiEntity): string {
    if (!api.usageMetrics) return 'No data';
    const total = api.usageMetrics.totalRequests;
    if (total > 100000) return 'High Traffic';
    if (total > 10000) return 'Medium Traffic';
    if (total > 1000) return 'Low Traffic';
    return 'Minimal';
  }

  getStatusTagType(api: ApiEntity | null): 'green' | 'gray' | 'blue' {
    if (!api) return 'blue';
    const status = this.getCurrentVersionStatus(api);
    if (status === 'released') return 'green';
    if (status === 'deprecated') return 'gray';
    return 'blue';
  }

  getCurrentVersionStatus(api: ApiEntity | null): string {
    if (!api) return 'draft';
    const version = api.versions.find(v => v.name === api.currentVersion) || api.versions[0];
    return version?.status || 'draft';
  }

  onRowClick(event: any) {
    // Carbon table rowClick event can be just the row index (number) or an object
    let rowIndex = -1;
    
    if (typeof event === 'number') {
      // Event is directly the row index
      rowIndex = event;
    } else if (event?.selectedRowIndex !== undefined) {
      rowIndex = event.selectedRowIndex;
    } else if (event?.rowIndex !== undefined) {
      rowIndex = event.rowIndex;
    } else if (event?.row !== undefined && Array.isArray(event.row)) {
      // Sometimes the row data is in event.row
      const rowData = event.row;
      // Find the index by matching the first cell data
      if (rowData.length > 0 && rowData[0]?.data) {
        const apiName = rowData[0].data;
        rowIndex = this.filteredApis().findIndex(api => api.name === apiName);
      }
    }
    
    if (rowIndex === -1 || rowIndex < 0) {
      console.warn('Could not determine row index from event:', event);
      return;
    }
    
    const api = this.filteredApis()[rowIndex];
    
    if (!api) {
      console.warn('No API found at row index:', rowIndex, 'Total APIs:', this.filteredApis().length);
      return;
    }
    
    // Close action menu if open
    if (this.actionMenuOpen() === api.id) {
      this.actionMenuOpen.set(null);
    }
    
    // Open the detail drawer
    this.openDetailsDrawer(api);
  }

  openDetailsDrawer(api: ApiEntity) {
    this.selectedApi.set(api);
    this.selectedVersion = api.currentVersion;
    this.detailsDrawerOpen.set(true);
    this.loadAuditLogs(api.id);
  }

  closeDetailsDrawer() {
    this.detailsDrawerOpen.set(false);
    setTimeout(() => {
      this.selectedApi.set(null);
    }, 300);
  }

  loadAuditLogs(apiId: string) {
    // Mock audit logs - in real app, fetch from service
    this.auditLogs.set([
      {
        id: '1',
        apiId,
        action: 'created',
        actor: 'developer@internal.com',
        timestamp: new Date().toISOString(),
        details: 'API created'
      },
      {
        id: '2',
        apiId,
        action: 'version-changed',
        actor: 'developer@internal.com',
        timestamp: new Date(Date.now() - 86400000).toISOString(),
        details: 'Version updated to v2.0',
        version: 'v2.0'
      }
    ]);
  }

  onVersionChange() {
    // Handle version change
  }

  getSparklinePoints(data: number[]): string {
    if (!data || data.length === 0) return '';
    const max = Math.max(...data, 1);
    const width = 200;
    const height = 40;
    const step = width / (data.length - 1);
    
    return data.map((value, index) => {
      const x = index * step;
      const y = height - (value / max) * height;
      return `${x},${y}`;
    }).join(' ');
  }

  openSchema(event: Event) {
    event.preventDefault();
    const api = this.selectedApi();
    if (api?.docs) {
      const openApiDoc = api.docs.find(d => d.format === 'openapi-json');
      if (openApiDoc) {
        window.open(`/api/${api.id}/schema`, '_blank');
      }
    }
  }

  openSwagger(event: Event) {
    event.preventDefault();
    const api = this.selectedApi();
    window.open(`/api/${api?.id}/swagger`, '_blank');
  }

  openPostman(event: Event) {
    event.preventDefault();
    const api = this.selectedApi();
    window.open(`/api/${api?.id}/postman`, '_blank');
  }

  openDocs(event: Event) {
    event.preventDefault();
    this.router.navigate(['/dev/apis', this.selectedApi()?.id]);
  }

  openLogs(event: Event) {
    event.preventDefault();
    window.open(`/monitoring?api=${this.selectedApi()?.id}`, '_blank');
  }

  // Filter methods
  toggleStatusFilter(status: string) {
    this.statusFilter = this.statusFilter === status ? '' : status;
    this.updateFilters();
  }

  toggleEnvFilter(env: string) {
    this.envFilter = this.envFilter === env ? '' : env;
    this.updateFilters();
  }

  updateFilters() {
    this.updateTable();
  }

  hasActiveFilters(): boolean {
    return !!(this.searchQuery || this.statusFilter || this.envFilter || this.ownerFilter || this.tagFilter);
  }

  resetFilters() {
    this.searchQuery = '';
    this.statusFilter = '';
    this.envFilter = '';
    this.ownerFilter = '';
    this.tagFilter = '';
    this.updateFilters();
  }

  formatDate(dateString: string): string {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  }

  formatTime(dateString: string): string {
    return new Date(dateString).toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  formatRelativeTime(dateString: string): string {
    const diffMs = Date.now() - new Date(dateString).getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffHours / 24);
    
    if (diffHours < 1) return 'Just now';
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return this.formatDate(dateString);
  }

  // Lifecycle control methods
  toggleActionMenu(apiId: string, event?: Event) {
    event?.stopPropagation();
    if (this.actionMenuOpen() === apiId) {
      this.actionMenuOpen.set(null);
    } else {
      this.actionMenuOpen.set(apiId);
      // Position menu near the clicked element (simplified - in real app, calculate position)
    }
  }

  getApiById(apiId: string): ApiEntity | null {
    return this.apis().find(a => a.id === apiId) || null;
  }

  closeAll() {
    this.detailsDrawerOpen.set(false);
    this.actionMenuOpen.set(null);
    setTimeout(() => {
      this.selectedApi.set(null);
    }, 300);
  }

  editApi(api: ApiEntity) {
    this.actionMenuOpen.set(null);
    this.router.navigate(['/dev/apis', api.id]);
  }

  deprecateApi(api: ApiEntity) {
    this.actionMenuOpen.set(null);
    this.apiToDeprecate.set(api);
    this.deprecateConfirmOpen.set(true);
  }

  reEnableApi(api: ApiEntity) {
    this.actionMenuOpen.set(null);
    // Re-enable logic
    const updatedApi = {
      ...api,
      versions: api.versions.map(v => 
        v.status === 'deprecated' ? { ...v, status: 'released' as const } : v
      )
    };
    this.devService.updateApi(api.id, updatedApi).subscribe(() => {
      this.loadApis();
    });
  }

  rotateCredentials(api: ApiEntity) {
    this.actionMenuOpen.set(null);
    // Rotate credentials logic
    console.log('Rotating credentials for', api.name);
  }

  syncSchema(api: ApiEntity) {
    this.actionMenuOpen.set(null);
    // Sync schema logic
    console.log('Syncing schema for', api.name);
  }

  deleteApi(api: ApiEntity) {
    this.actionMenuOpen.set(null);
    if (confirm(`Delete ${api.name}? This action cannot be undone.`)) {
      // Delete logic
      console.log('Deleting', api.name);
    }
  }

  confirmDeprecate() {
    const api = this.apiToDeprecate();
    if (!api) return;
    
    const updatedApi = {
      ...api,
      versions: api.versions.map(v => 
        v.name === api.currentVersion ? { ...v, status: 'deprecated' as const } : v
      ),
      deprecationNotice: 'This API has been deprecated and will be removed in a future version.',
      deprecatedAt: new Date().toISOString()
    };
    
    this.devService.updateApi(api.id, updatedApi).subscribe(() => {
      this.deprecateConfirmOpen.set(false);
      this.apiToDeprecate.set(null);
      this.loadApis();
    });
  }

  cancelDeprecate() {
    this.deprecateConfirmOpen.set(false);
    this.apiToDeprecate.set(null);
  }

  deprecateConfirmMessage = computed(() => {
    const api = this.apiToDeprecate();
    return api ? `Deprecate "${api.name}"? This will mark the current version as deprecated.` : '';
  });
}
