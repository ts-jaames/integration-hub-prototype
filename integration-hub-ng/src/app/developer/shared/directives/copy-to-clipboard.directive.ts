import { Directive, HostListener, Input, inject } from '@angular/core';
import { LoggerService } from '../../../core/services/logger.service';

@Directive({
  selector: '[appCopyToClipboard]',
  standalone: true
})
export class CopyToClipboardDirective {
  private logger = inject(LoggerService);
  
  @Input() appCopyToClipboard: string = '';
  @Input() copyLabel: string = 'Copied to clipboard';

  @HostListener('click', ['$event'])
  async onClick(event: Event) {
    event.preventDefault();
    event.stopPropagation();

    if (!this.appCopyToClipboard) return;

    try {
      await navigator.clipboard.writeText(this.appCopyToClipboard);
      this.logger.debug(this.copyLabel);
    } catch (err) {
      this.logger.error('Failed to copy to clipboard', err);
    }
  }
}

