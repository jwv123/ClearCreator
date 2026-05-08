import { Injectable, signal, computed } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class AiState {
  isGenerating = signal(false);
  streamingResponse = signal('');
  generationHistory: any[] = [];
  activePrompt = signal('');
  selectedModel = signal('gpt-oss:120b');

  selectedContext = computed(() => {
    // Will be derived from SelectionState when elements are selected
    return [];
  });
}