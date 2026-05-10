import { Component, inject, ChangeDetectionStrategy, input, output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { NzSelectModule } from 'ng-zorro-antd/select';
import { NzSpinModule } from 'ng-zorro-antd/spin';
import { FontService } from '../../../../core/services/font.service';

@Component({
  selector: 'app-font-selector',
  standalone: true,
  imports: [CommonModule, FormsModule, NzSelectModule, NzSpinModule],
  template: `
    <nz-select
      [ngModel]="selectedFont()"
      (ngModelChange)="onFontChange($event)"
      nzShowSearch
      nzSize="small"
      nzPlaceholder="Search fonts..."
      class="full-width"
      [nzFilterOption]="filterOption"
      (nzOpenChange)="onDropdownOpen($event)"
    >
      <nz-option-group nzLabel="System Fonts">
        @for (font of fontService.systemFonts; track font.family) {
          <nz-option
            [nzValue]="font.family"
            [nzLabel]="font.family"
            [nzCustomContent]="true"
          >
            <span [style.font-family]="'&quot;' + font.family + '&quot;, ' + font.category" [style.font-size.px]="14">{{ font.family }}</span>
          </nz-option>
        }
      </nz-option-group>
      <nz-option-group nzLabel="Google Fonts">
        @if (fontService.fontsLoading()) {
          <nz-option nzDisabled nzCustomContent>
            <nz-spin nzSize="small"></nz-spin>
            <span style="margin-left: 8px">Loading fonts...</span>
          </nz-option>
        } @else {
          @for (font of fontService.popularFonts(); track font.family) {
            <nz-option
              [nzValue]="font.family"
              [nzLabel]="font.family"
              [nzCustomContent]="true"
            >
              <span [style.font-family]="'&quot;' + font.family + '&quot;, ' + font.category" [style.font-size.px]="14">{{ font.family }}</span>
            </nz-option>
          }
        }
      </nz-option-group>
    </nz-select>
  `,
  styles: [`
    :host { display: block; }
    .full-width { width: 100%; }
  `],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FontSelectorComponent {
  fontService = inject(FontService);

  selectedFont = input('Arial');
  fontChange = output<string>();

  filterOption = (input: string, option: { nzLabel?: string | number | null }): boolean => {
    const label = (option.nzLabel as string)?.toLowerCase() ?? '';
    return label.includes(input.toLowerCase());
  };

  onDropdownOpen(open: boolean): void {
    if (open) {
      this.fontService.preloadPopularFontsForPreview();
    }
  }

  onFontChange(fontFamily: string): void {
    this.fontService.ensureFontLoaded(fontFamily).then(() => {
      this.fontChange.emit(fontFamily);
    });
  }
}