import { Injectable, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, Subject } from 'rxjs';

export interface AiModelInfo {
  name: string;
  modifiedAt: string;
  size: number;
}

@Injectable({ providedIn: 'root' })
export class AiService {
  private apiUrl = '/api/ai';

  models = signal<AiModelInfo[]>([]);
  isGenerating = signal(false);
  streamingText = signal('');
  selectedModel = signal('gpt-oss:120b');

  constructor(private http: HttpClient) {
    this.loadModels();
  }

  loadModels() {
    this.http.get<AiModelInfo[]>(`${this.apiUrl}/models`).subscribe({
      next: (models) => this.models.set(models),
      error: () => this.models.set([{ name: 'gpt-oss:120b', modifiedAt: '', size: 0 }]),
    });
  }

  generateDesign(prompt: string, canvasWidth = 1080, canvasHeight = 1080): Observable<any> {
    return this.http.post(`${this.apiUrl}/generate`, {
      prompt,
      canvasWidth,
      canvasHeight,
      model: this.selectedModel(),
    });
  }

  generateDesignStream(prompt: string, canvasWidth = 1080, canvasHeight = 1080): Observable<string> {
    this.isGenerating.set(true);
    this.streamingText.set('');

    const subject = new Subject<string>();

    fetch(`${this.apiUrl}/generate/stream`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt, canvasWidth, canvasHeight, model: this.selectedModel() }),
    }).then(async (response) => {
      const reader = response.body?.getReader();
      const decoder = new TextDecoder();

      if (!reader) {
        subject.error('No response body');
        this.isGenerating.set(false);
        return;
      }

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const text = decoder.decode(value);
        const lines = text.split('\n');

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const data = JSON.parse(line.slice(6));
              if (data.content) {
                this.streamingText.update(current => current + data.content);
                subject.next(data.content);
              }
              if (data.validated && data.design) {
                subject.next(JSON.stringify(data.design));
              }
              if (data.done) {
                this.isGenerating.set(false);
                subject.complete();
              }
              if (data.error) {
                subject.error(data.error);
                this.isGenerating.set(false);
              }
            } catch {}
          }
        }
      }

      this.isGenerating.set(false);
      subject.complete();
    }).catch((err) => {
      this.isGenerating.set(false);
      subject.error(err);
    });

    return subject.asObservable();
  }

  modifyElements(instruction: string, elementContexts: any[]): Observable<any> {
    return this.http.post(`${this.apiUrl}/modify`, {
      instruction,
      elementContexts,
      model: this.selectedModel(),
    });
  }
}