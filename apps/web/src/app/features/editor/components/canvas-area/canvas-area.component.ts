import { Component, OnInit, OnDestroy, ViewChild, ElementRef, inject, ChangeDetectionStrategy, NgZone } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CanvasWrapperService } from '../../canvas/canvas-wrapper.service';
import { CanvasState } from '../../state/canvas.state';

@Component({
  selector: 'app-canvas-area',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="canvas-area" #canvasContainer>
      <div class="canvas-wrapper">
        <canvas #canvasEl></canvas>
      </div>
    </div>
  `,
  styles: [`
    .canvas-area {
      flex: 1;
      display: flex;
      align-items: center;
      justify-content: center;
      background: #e8e8e8;
      overflow: hidden;
      position: relative;
    }
    .canvas-wrapper {
      background: #fff;
      box-shadow: 0 2px 8px rgba(0,0,0,0.15);
    }
  `],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CanvasAreaComponent implements OnInit, OnDestroy {
  @ViewChild('canvasEl') canvasEl!: ElementRef<HTMLCanvasElement>;
  @ViewChild('canvasContainer') canvasContainer!: ElementRef<HTMLDivElement>;

  private canvasWrapper = inject(CanvasWrapperService);
  private canvasState = inject(CanvasState);
  private zone = inject(NgZone);
  private resizeObserver?: ResizeObserver;

  ngOnInit(): void {
    // Canvas init happens in ngAfterViewInit when ViewChild refs are available
  }

  ngAfterViewInit(): void {
    if (this.canvasEl && this.canvasContainer) {
      this.canvasWrapper.init(
        this.canvasEl.nativeElement,
        this.canvasState.canvasWidth(),
        this.canvasState.canvasHeight()
      );

      // Initial fit
      this.zone.runOutsideAngular(() => {
        this.fitCanvasToContainer();
      });

      // Watch for container resize
      this.resizeObserver = new ResizeObserver(() => {
        this.zone.runOutsideAngular(() => {
          this.fitCanvasToContainer();
        });
      });
      this.resizeObserver.observe(this.canvasContainer.nativeElement);
    }
  }

  ngOnDestroy(): void {
    this.resizeObserver?.disconnect();
    this.canvasWrapper.dispose();
  }

  private fitCanvasToContainer(): void {
    const container = this.canvasContainer?.nativeElement;
    if (!container) return;

    const containerWidth = container.clientWidth;
    const containerHeight = container.clientHeight;

    this.canvasWrapper.fitToScreen(containerWidth, containerHeight);
  }
}