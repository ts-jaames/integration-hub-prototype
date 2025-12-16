import { Component, Input, Output, EventEmitter, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TableModule, TableModel } from 'carbon-components-angular';

@Component({
  selector: 'app-data-table',
  standalone: true,
  imports: [CommonModule, TableModule],
  templateUrl: './data-table.component.html',
  styleUrls: ['./data-table.styles.scss']
})
export class DataTableComponent {
  @Input() model!: TableModel;
  @Input() loading: boolean = false;
  @Input() size: 'sm' | 'md' | 'lg' | 'xl' = 'md';
  @Input() sortable: boolean = true;
  @Input() stickyHeader: boolean = false;
  
  @Output() rowClick = new EventEmitter<any>();
  @Output() onRowClick = new EventEmitter<any>();
  @Output() onSelectAll = new EventEmitter<any>();
  @Output() onSelectRow = new EventEmitter<any>();

  constructor(public elementRef: ElementRef) {}

  handleRowClick(event: any) {
    // Carbon table rowClick event can be just a number (row index) or an object
    // Extract row index from various possible structures
    let rowIndex: number | undefined;
    
    if (typeof event === 'number') {
      rowIndex = event;
    } else {
      rowIndex = event?.selectedRowIndex ?? event?.rowIndex ?? event?.index ?? event?.row;
      // Sometimes the row index is nested in event.event
      if (rowIndex === undefined && typeof event?.event === 'number') {
        rowIndex = event.event;
      }
    }
    
    // Ensure we pass through the event with proper structure
    const rowClickEvent = {
      ...event,
      selectedRowIndex: rowIndex,
      rowIndex: rowIndex,
      model: event?.model ?? this.model,
      event: event?.event || event
    };
    
    // Emit both events for compatibility
    this.rowClick.emit(rowClickEvent);
    this.onRowClick.emit(rowClickEvent);
  }
}

