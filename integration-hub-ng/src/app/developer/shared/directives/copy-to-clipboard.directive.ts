import { Directive, HostListener, Input } from '@angular/core';

@Directive({
  selector: '[appCopyToClipboard]',
  standalone: true
})
export class CopyToClipboardDirective {
  @Input() appCopyToClipboard: string = '';
  @Input() copyLabel: string = 'Copied to clipboard';

  @HostListener('click', ['$event'])
  async onClick(event: Event) {
    event.preventDefault();
    event.stopPropagation();

    if (!this.appCopyToClipboard) return;

    try {
      await navigator.clipboard.writeText(this.appCopyToClipboard);
      console.log(this.copyLabel);
    } catch (err) {
      console.error('Failed to copy to clipboard');
    }
  }
}

