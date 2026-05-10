import { Component, inject, OnDestroy, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subject, takeUntil, debounceTime } from 'rxjs';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzInputModule } from 'ng-zorro-antd/input';
import { NzInputNumberModule } from 'ng-zorro-antd/input-number';
import { NzDividerModule } from 'ng-zorro-antd/divider';
import { NzTooltipModule } from 'ng-zorro-antd/tooltip';
import { NzEmptyModule } from 'ng-zorro-antd/empty';
import { CanvasWrapperService, ElementProperties } from '../../canvas/canvas-wrapper.service';
import { SelectionState } from '../../state/selection.state';
import { CanvasState } from '../../state/canvas.state';
import { FontSelectorComponent } from '../font-selector/font-selector.component';

@Component({
  selector: 'app-properties-panel',
  standalone: true,
  imports: [
    CommonModule, FormsModule, NzButtonModule, NzIconModule, NzInputModule,
    NzInputNumberModule, NzDividerModule, NzTooltipModule, NzEmptyModule,
    FontSelectorComponent,
  ],
  template: `
    <div class="properties-content">
      @if (selectedType() === 'none') {
        <!-- Canvas Properties -->
        <h4>Canvas</h4>
        <div class="prop-group">
          <label>Width</label>
          <nz-input-group nzCompact>
            <input nz-input type="number" [(ngModel)]="canvasWidth" (ngModelChange)="updateCanvasSize()" />
          </nz-input-group>
        </div>
        <div class="prop-group">
          <label>Height</label>
          <nz-input-group nzCompact>
            <input nz-input type="number" [(ngModel)]="canvasHeight" (ngModelChange)="updateCanvasSize()" />
          </nz-input-group>
        </div>
        <div class="prop-group">
          <label>Background</label>
          <input type="color" [ngModel]="canvasBg" (ngModelChange)="updateCanvasBg($event)" class="color-input" />
          <span class="color-label">{{ canvasBg }}</span>
        </div>
      } @else if (selectedType() === 'textbox') {
        <!-- Text Properties -->
        <h4>Text</h4>
        <div class="prop-group">
          <label>Font</label>
          <app-font-selector [selectedFont]="textProps.fontFamily" (fontChange)="onFontFamilyChange($event)" />
        </div>
        <div class="prop-row">
          <div class="prop-group flex-1">
            <label>Size</label>
            <nz-input-number [(ngModel)]="textProps.fontSize" (ngModelChange)="debouncedUpdateProp('fontSize', $event)" [nzMin]="6" [nzMax]="200" [nzStep]="1" nzSize="small" class="full-width" />
          </div>
          <div class="prop-group flex-1">
            <label>Line Height</label>
            <nz-input-number [(ngModel)]="textProps.lineHeight" (ngModelChange)="debouncedUpdateProp('lineHeight', $event)" [nzMin]="0.5" [nzMax]="3" [nzStep]="0.1" nzSize="small" class="full-width" />
          </div>
        </div>
        <div class="prop-group">
          <label>Style</label>
          <div class="btn-group">
            <button nz-button nzSize="small" [nzType]="textProps.fontWeight === 'bold' ? 'primary' : 'default'" (click)="toggleBold()" nz-tooltip="Bold">
              <span nz-icon nzType="bold"></span>
            </button>
            <button nz-button nzSize="small" [nzType]="textProps.fontStyle === 'italic' ? 'primary' : 'default'" (click)="toggleItalic()" nz-tooltip="Italic">
              <span nz-icon nzType="italic"></span>
            </button>
          </div>
        </div>
        <div class="prop-group">
          <label>Align</label>
          <div class="btn-group">
            <button nz-button nzSize="small" [nzType]="textProps.textAlign === 'left' ? 'primary' : 'default'" (click)="updateProp('textAlign', 'left')">
              <span nz-icon nzType="align-left"></span>
            </button>
            <button nz-button nzSize="small" [nzType]="textProps.textAlign === 'center' ? 'primary' : 'default'" (click)="updateProp('textAlign', 'center')">
              <span nz-icon nzType="align-center"></span>
            </button>
            <button nz-button nzSize="small" [nzType]="textProps.textAlign === 'right' ? 'primary' : 'default'" (click)="updateProp('textAlign', 'right')">
              <span nz-icon nzType="align-right"></span>
            </button>
          </div>
        </div>
        <nz-divider></nz-divider>
        <div class="prop-group">
          <label>Fill Color</label>
          <input type="color" [ngModel]="textProps.fill" (ngModelChange)="updateProp('fill', $event)" class="color-input" />
          <span class="color-label">{{ textProps.fill }}</span>
        </div>
        <div class="prop-group">
          <label>Opacity</label>
          <nz-input-number [(ngModel)]="textProps.opacity" (ngModelChange)="debouncedUpdateProp('opacity', $event)" [nzMin]="0" [nzMax]="1" [nzStep]="0.05" nzSize="small" class="full-width" />
        </div>
      } @else if (selectedType() === 'image') {
        <!-- Image Properties -->
        <h4>Image</h4>
        <div class="prop-group">
          <label>Opacity</label>
          <nz-input-number [(ngModel)]="imageProps.opacity" (ngModelChange)="debouncedUpdateProp('opacity', $event)" [nzMin]="0" [nzMax]="1" [nzStep]="0.05" nzSize="small" class="full-width" />
        </div>
        <div class="prop-row">
          <div class="prop-group flex-1">
            <label>Scale X</label>
            <nz-input-number [(ngModel)]="imageProps.scaleX" (ngModelChange)="debouncedUpdateProp('scaleX', $event)" [nzMin]="0.01" [nzMax]="10" [nzStep]="0.1" nzSize="small" class="full-width" />
          </div>
          <div class="prop-group flex-1">
            <label>Scale Y</label>
            <nz-input-number [(ngModel)]="imageProps.scaleY" (ngModelChange)="debouncedUpdateProp('scaleY', $event)" [nzMin]="0.01" [nzMax]="10" [nzStep]="0.1" nzSize="small" class="full-width" />
          </div>
        </div>
      } @else if (selectedType() === 'rect') {
        <!-- Rectangle Properties -->
        <h4>Rectangle</h4>
        <div class="prop-row">
          <div class="prop-group flex-1">
            <label>Width</label>
            <nz-input-number [(ngModel)]="shapeProps.width" (ngModelChange)="updateDimension()" nzSize="small" class="full-width" />
          </div>
          <div class="prop-group flex-1">
            <label>Height</label>
            <nz-input-number [(ngModel)]="shapeProps.height" (ngModelChange)="updateDimension()" nzSize="small" class="full-width" />
          </div>
        </div>
        <div class="prop-group">
          <label>Corner Radius</label>
          <nz-input-number [(ngModel)]="shapeProps.rx" (ngModelChange)="debouncedUpdateProp('rx', $event); shapeProps.ry = $event; debouncedUpdateProp('ry', $event);" nzSize="small" [nzMin]="0" class="full-width" />
        </div>
        <div class="prop-group">
          <label>Fill</label>
          <input type="color" [ngModel]="shapeProps.fill" (ngModelChange)="updateProp('fill', $event)" class="color-input" />
          <span class="color-label">{{ shapeProps.fill }}</span>
        </div>
        <div class="prop-group">
          <label>Stroke</label>
          <input type="color" [ngModel]="shapeProps.stroke" (ngModelChange)="updateProp('stroke', $event)" class="color-input" />
          <span class="color-label">{{ shapeProps.stroke }}</span>
        </div>
        <div class="prop-group">
          <label>Stroke Width</label>
          <nz-input-number [(ngModel)]="shapeProps.strokeWidth" (ngModelChange)="debouncedUpdateProp('strokeWidth', $event)" [nzMin]="0" [nzMax]="50" nzSize="small" class="full-width" />
        </div>
        <div class="prop-group">
          <label>Opacity</label>
          <nz-input-number [(ngModel)]="shapeProps.opacity" (ngModelChange)="debouncedUpdateProp('opacity', $event)" [nzMin]="0" [nzMax]="1" [nzStep]="0.05" nzSize="small" class="full-width" />
        </div>
      } @else if (selectedType() === 'circle') {
        <!-- Circle Properties -->
        <h4>Circle</h4>
        <div class="prop-group">
          <label>Radius</label>
          <nz-input-number [(ngModel)]="circleProps.radius" (ngModelChange)="debouncedUpdateProp('radius', $event)" nzSize="small" [nzMin]="1" class="full-width" />
        </div>
        <div class="prop-group">
          <label>Fill</label>
          <input type="color" [ngModel]="circleProps.fill" (ngModelChange)="updateProp('fill', $event)" class="color-input" />
          <span class="color-label">{{ circleProps.fill }}</span>
        </div>
        <div class="prop-group">
          <label>Stroke</label>
          <input type="color" [ngModel]="circleProps.stroke" (ngModelChange)="updateProp('stroke', $event)" class="color-input" />
          <span class="color-label">{{ circleProps.stroke }}</span>
        </div>
        <div class="prop-group">
          <label>Stroke Width</label>
          <nz-input-number [(ngModel)]="circleProps.strokeWidth" (ngModelChange)="debouncedUpdateProp('strokeWidth', $event)" [nzMin]="0" [nzMax]="50" nzSize="small" class="full-width" />
        </div>
        <div class="prop-group">
          <label>Opacity</label>
          <nz-input-number [(ngModel)]="circleProps.opacity" (ngModelChange)="debouncedUpdateProp('opacity', $event)" [nzMin]="0" [nzMax]="1" [nzStep]="0.05" nzSize="small" class="full-width" />
        </div>
      } @else {
        <nz-empty nzDescription="Select an element to edit"></nz-empty>
      }
    </div>
  `,
  styles: [`
    .properties-content { padding: 16px; }
    h4 { margin: 0 0 12px; font-size: 13px; font-weight: 600; color: #333; text-transform: uppercase; letter-spacing: 0.5px; }
    .prop-group { margin-bottom: 12px; }
    .prop-group label { display: block; font-size: 11px; color: #666; margin-bottom: 4px; }
    .prop-row { display: flex; gap: 8px; }
    .flex-1 { flex: 1; }
    .full-width { width: 100%; }
    .btn-group { display: inline-flex; gap: 2px; }
    .color-input { width: 28px; height: 28px; padding: 0; border: 1px solid #d9d9d9; border-radius: 4px; cursor: pointer; vertical-align: middle; }
    .color-label { font-size: 11px; color: #666; margin-left: 8px; vertical-align: middle; font-family: monospace; }
  `],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PropertiesPanelComponent implements OnDestroy {
  private canvasWrapper = inject(CanvasWrapperService);
  private selectionState = inject(SelectionState);
  private canvasState = inject(CanvasState);
  private destroy$ = new Subject<void>();
  private propUpdate$ = new Subject<{ prop: string; value: unknown }>();
  private dimensionUpdate$ = new Subject<void>();
  private canvasSizeUpdate$ = new Subject<void>();

  selectedType = this.selectionState.selectedType;

  // Canvas properties
  canvasWidth = this.canvasState.canvasWidth();
  canvasHeight = this.canvasState.canvasHeight();
  canvasBg = this.canvasState.canvasBackground();

  // Text properties (defaults)
  textProps = { fontFamily: 'Arial', fontSize: 24, fontWeight: 'normal', fontStyle: 'normal', textAlign: 'left', fill: '#000000', opacity: 1, lineHeight: 1.3 };

  // Image properties (defaults)
  imageProps = { opacity: 1, scaleX: 1, scaleY: 1 };

  // Shape properties (defaults for rect)
  shapeProps = { width: 200, height: 150, rx: 0, ry: 0, fill: '#4a90d9', stroke: '#2c5f8a', strokeWidth: 2, opacity: 1 };

  // Circle properties (defaults)
  circleProps = { radius: 75, fill: '#e94560', stroke: '#c0392b', strokeWidth: 2, opacity: 1 };

  onFontFamilyChange(fontFamily: string): void {
    this.textProps.fontFamily = fontFamily;
    this.updateProp('fontFamily', fontFamily);
  }

  private currentElementId: string | null = null;

  constructor() {
    // Subscribe to selection changes to refresh properties
    this.canvasWrapper.onSelectionChanged$.pipe(takeUntil(this.destroy$)).subscribe(() => {
      this.loadProperties();
    });

    this.canvasWrapper.onObjectModified$.pipe(takeUntil(this.destroy$)).subscribe(() => {
      this.loadProperties();
    });

    this.canvasWrapper.onTextChanged$.pipe(takeUntil(this.destroy$)).subscribe(() => {
      this.loadProperties();
    });

    // Debounced property updates for numeric inputs (avoid excessive history entries)
    this.propUpdate$.pipe(
      debounceTime(150),
      takeUntil(this.destroy$),
    ).subscribe(({ prop, value }) => {
      if (this.currentElementId) {
        this.canvasWrapper.updateElement(this.currentElementId, { [prop]: value });
      }
    });

    this.dimensionUpdate$.pipe(
      debounceTime(150),
      takeUntil(this.destroy$),
    ).subscribe(() => this.doUpdateDimension());

    this.canvasSizeUpdate$.pipe(
      debounceTime(300),
      takeUntil(this.destroy$),
    ).subscribe(() => this.doUpdateCanvasSize());
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private loadProperties(): void {
    const ids = this.selectionState.selectedIds();
    if (ids.length !== 1) {
      this.currentElementId = null;
      return;
    }

    const id = ids[0];
    this.currentElementId = id;
    const props = this.canvasWrapper.getElementProperties(id);
    if (!props) return;

    if (props.type === 'textbox') {
      this.textProps = {
        fontFamily: props.fontFamily ?? 'Arial',
        fontSize: props.fontSize ?? 24,
        fontWeight: props.fontWeight ?? 'normal',
        fontStyle: props.fontStyle ?? 'normal',
        textAlign: props.textAlign ?? 'left',
        fill: props.fill ?? '#000000',
        opacity: props.opacity,
        lineHeight: props.lineHeight ?? 1.3,
      };
    } else if (props.type === 'image') {
      this.imageProps = {
        opacity: props.opacity,
        scaleX: props.scaleX,
        scaleY: props.scaleY,
      };
    } else if (props.type === 'rect') {
      this.shapeProps = {
        width: Math.round((props.width ?? 200) * props.scaleX),
        height: Math.round((props.height ?? 150) * props.scaleY),
        rx: props.rx ?? 0,
        ry: props.ry ?? 0,
        fill: props.fill ?? '#4a90d9',
        stroke: props.stroke ?? '#2c5f8a',
        strokeWidth: props.strokeWidth,
        opacity: props.opacity,
      };
    } else if (props.type === 'circle') {
      this.circleProps = {
        radius: props.radius ?? 75,
        fill: props.fill ?? '#e94560',
        stroke: props.stroke ?? '#c0392b',
        strokeWidth: props.strokeWidth,
        opacity: props.opacity,
      };
    }
  }

  updateProp(prop: string, value: unknown): void {
    if (!this.currentElementId) return;
    this.canvasWrapper.updateElement(this.currentElementId, { [prop]: value });
  }

  /** Debounced version for numeric inputs that fire rapidly */
  debouncedUpdateProp(prop: string, value: unknown): void {
    this.propUpdate$.next({ prop, value });
  }

  updateDimension(): void {
    this.dimensionUpdate$.next();
  }

  private doUpdateDimension(): void {
    if (!this.currentElementId) return;
    const props = this.canvasWrapper.getElementProperties(this.currentElementId);
    if (!props) return;
    const scaleX = this.shapeProps.width / (props.width || 1);
    const scaleY = this.shapeProps.height / (props.height || 1);
    this.canvasWrapper.updateElement(this.currentElementId, { scaleX, scaleY });
  }

  updateCanvasSize(): void {
    this.canvasSizeUpdate$.next();
  }

  private doUpdateCanvasSize(): void {
    this.canvasState.canvasWidth.set(this.canvasWidth);
    this.canvasState.canvasHeight.set(this.canvasHeight);
    this.canvasWrapper.setDimensions(this.canvasWidth, this.canvasHeight);
  }

  updateCanvasBg(color: string): void {
    this.canvasBg = color;
    this.canvasState.canvasBackground.set(color);
    this.canvasWrapper.setBackgroundColor(color);
  }

  toggleBold(): void {
    const newWeight = this.textProps.fontWeight === 'bold' ? 'normal' : 'bold';
    this.textProps.fontWeight = newWeight;
    this.updateProp('fontWeight', newWeight);
  }

  toggleItalic(): void {
    const newStyle = this.textProps.fontStyle === 'italic' ? 'normal' : 'italic';
    this.textProps.fontStyle = newStyle;
    this.updateProp('fontStyle', newStyle);
  }
}