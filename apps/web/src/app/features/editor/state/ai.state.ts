import { Injectable, signal, computed, inject } from '@angular/core';
import { Subscription } from 'rxjs';
import { NzMessageService } from 'ng-zorro-antd/message';
import { AiService, AiModelInfo } from '../../../core/services/ai.service';
import { CanvasWrapperService } from '../canvas/canvas-wrapper.service';
import { CanvasState } from './canvas.state';
import { SelectionState } from './selection.state';

export type GenerationStatus = 'idle' | 'streaming' | 'completed' | 'failed';

export interface GenerationRecord {
  prompt: string;
  model: string;
  timestamp: number;
  status: GenerationStatus;
}

@Injectable({ providedIn: 'root' })
export class AiState {
  private aiService = inject(AiService);
  private canvasWrapper = inject(CanvasWrapperService);
  private canvasState = inject(CanvasState);
  private selectionState = inject(SelectionState);
  private message = inject(NzMessageService);

  // --- Signals ---
  models = signal<AiModelInfo[]>([]);
  selectedModel = signal('gpt-oss:120b');
  isGenerating = signal(false);
  streamingText = signal('');
  activePrompt = signal('');
  generationStatus = signal<GenerationStatus>('idle');
  lastDesign = signal<any | null>(null);
  lastError = signal<string | null>(null);
  generationHistory = signal<GenerationRecord[]>([]);

  selectedContext = computed(() => {
    const ids = this.selectionState.selectedIds();
    return ids
      .map(id => this.canvasWrapper.getElementProperties(id))
      .filter((p): p is NonNullable<typeof p> => p !== null);
  });

  private abortController: AbortController | null = null;
  private currentSubscription: Subscription | null = null;

  constructor() {
    this.loadModels();
  }

  loadModels(): void {
    this.aiService.loadModels().subscribe(models => {
      this.models.set(models);
      if (models.length > 0 && !models.find((m: AiModelInfo) => m.name === this.selectedModel())) {
        this.selectedModel.set(models[0].name);
      }
    });
  }

  setModel(model: string): void {
    this.selectedModel.set(model);
  }

  generateDesignStream(prompt: string): void {
    if (!prompt.trim()) return;

    this.abortController = new AbortController();
    this.isGenerating.set(true);
    this.generationStatus.set('streaming');
    this.streamingText.set('');
    this.activePrompt.set(prompt);
    this.lastError.set(null);
    this.lastDesign.set(null);

    this.aiService.generateDesignStream(
      prompt,
      this.canvasState.canvasWidth(),
      this.canvasState.canvasHeight(),
      this.selectedModel(),
      this.abortController.signal,
    ).subscribe({
      next: (data: string) => {
        try {
          const parsed = JSON.parse(data);
          if (parsed.type === 'content') {
            this.streamingText.update(current => current + parsed.content);
          } else if (parsed.type === 'design') {
            this.lastDesign.set(parsed.design);
            this.generationStatus.set('completed');
            this.streamingText.set('');
          }
        } catch {
          // Ignore parse errors for streaming chunks
        }
      },
      error: (err: any) => {
        this.isGenerating.set(false);
        this.generationStatus.set('failed');

        if (err?.status === 429) {
          this.lastError.set('Rate limit reached. Please wait and try again.');
        } else if (err?.status >= 500) {
          this.lastError.set('AI service is temporarily unavailable. Please try again later.');
        } else if (err?.name === 'AbortError') {
          this.generationStatus.set('idle');
          this.lastError.set(null);
        } else if (typeof err === 'string') {
          this.lastError.set(err);
        } else {
          this.lastError.set('Cannot connect to AI service. Please check your connection.');
        }

        this.pushHistory(prompt, 'failed');
      },
      complete: () => {
        this.isGenerating.set(false);
        this.abortController = null;

        if (this.generationStatus() === 'streaming') {
          // Stream ended without validated design
          this.generationStatus.set('failed');
          if (!this.lastError()) {
            this.lastError.set('AI returned invalid output. Please try a different prompt.');
          }
        }

        this.pushHistory(prompt, this.generationStatus() === 'completed' ? 'completed' : 'failed');
      },
    });
  }

  applyDesignToCanvas(): void {
    const design = this.lastDesign();
    if (!design) {
      this.lastError.set('No design to apply.');
      return;
    }

    // Structural validation: ensure the design has the required shape
    if (!design.elements || !Array.isArray(design.elements)) {
      this.lastError.set('Design validation failed — missing elements array.');
      this.message.error('Invalid design data — please try generating again.');
      return;
    }

    for (const el of design.elements) {
      if (!el.type || typeof el.left !== 'number' || typeof el.top !== 'number') {
        this.lastError.set('Design validation failed — element missing required fields.');
        this.message.error('Invalid design data — please try generating again.');
        return;
      }
    }

    this.canvasWrapper.loadFromJSON(design);
    this.generationStatus.set('idle');
    this.lastDesign.set(null);
    this.streamingText.set('');
    this.message.success('Design applied to canvas');
  }

  modifySelectedElements(instruction: string): void {
    if (!instruction.trim()) return;

    const contexts = this.selectedContext();
    if (contexts.length === 0) {
      this.lastError.set('No elements selected to modify.');
      return;
    }

    this.isGenerating.set(true);
    this.lastError.set(null);

    this.aiService.modifyElements(instruction, contexts, this.selectedModel()).subscribe({
      next: (response: any) => {
        this.isGenerating.set(false);

        if (!response?.modifications || !Array.isArray(response.modifications)) {
          this.lastError.set('AI returned an invalid modification response.');
          return;
        }

        let applied = 0;
        for (const mod of response.modifications) {
          if (mod.id && mod.changes) {
            this.canvasWrapper.updateElement(mod.id, mod.changes);
            applied++;
          }
        }

        if (applied > 0) {
          this.message.success(`Modified ${applied} element(s)`);
        } else {
          this.lastError.set('AI could not match modifications to selected elements. Try selecting elements with IDs.');
        }
      },
      error: (err: any) => {
        this.isGenerating.set(false);
        if (err?.status >= 500) {
          this.lastError.set('AI service is temporarily unavailable.');
        } else {
          this.lastError.set('Failed to modify elements. Please try again.');
        }
      },
    });
  }

  cancelGeneration(): void {
    if (this.abortController) {
      this.abortController.abort();
      this.abortController = null;
    }
    this.isGenerating.set(false);
    this.generationStatus.set('idle');
    this.streamingText.set('');
  }

  clearError(): void {
    this.lastError.set(null);
  }

  resetGeneration(): void {
    this.generationStatus.set('idle');
    this.lastDesign.set(null);
    this.streamingText.set('');
    this.lastError.set(null);
  }

  private pushHistory(prompt: string, status: GenerationStatus): void {
    this.generationHistory.update(history => [
      { prompt, model: this.selectedModel(), timestamp: Date.now(), status },
      ...history.slice(0, 19),
    ]);
  }
}