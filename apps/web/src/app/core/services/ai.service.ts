import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, Subject, map, catchError, of } from 'rxjs';

export interface AiModelInfo {
  name: string;
  modifiedAt: string;
  size: number;
}

@Injectable({ providedIn: 'root' })
export class AiService {
  private apiUrl = '/api/ai';

  constructor(private http: HttpClient) {}

  loadModels(): Observable<AiModelInfo[]> {
    return this.http.get<AiModelInfo[]>(`${this.apiUrl}/models`).pipe(
      catchError(() => of([{ name: 'gpt-oss:120b', modifiedAt: '', size: 0 }])),
    );
  }

  checkConnection(): Observable<boolean> {
    return this.http.get<AiModelInfo[]>(`${this.apiUrl}/models`).pipe(
      map(() => true),
      catchError(() => of(false)),
    );
  }

  generateDesign(prompt: string, canvasWidth = 1080, canvasHeight = 1080, model = 'gpt-oss:120b'): Observable<any> {
    return this.http.post(`${this.apiUrl}/generate`, {
      prompt,
      canvasWidth,
      canvasHeight,
      model,
    });
  }

  generateDesignStream(prompt: string, canvasWidth = 1080, canvasHeight = 1080, model = 'gpt-oss:120b', signal?: AbortSignal): Observable<string> {
    const subject = new Subject<string>();

    fetch(`${this.apiUrl}/generate/stream`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt, canvasWidth, canvasHeight, model }),
      signal,
    }).then(async (response) => {
      if (!response.ok) {
        const errorBody = await response.text().catch(() => '');
        subject.error({ status: response.status, message: errorBody });
        subject.complete();
        return;
      }

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();

      if (!reader) {
        subject.error('No response body');
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
              if (data.error) {
                subject.error(data.error);
                return;
              }
              if (data.content) {
                subject.next(JSON.stringify({ type: 'content', content: data.content }));
              }
              if (data.validated && data.design) {
                subject.next(JSON.stringify({ type: 'design', design: data.design }));
              }
              if (data.done) {
                subject.complete();
                return;
              }
            } catch {}
          }
        }
      }

      subject.complete();
    }).catch((err) => {
      if (err.name === 'AbortError') {
        subject.complete();
      } else {
        subject.error(err);
      }
    });

    return subject.asObservable();
  }

  modifyElements(instruction: string, elementContexts: any[], model = 'gpt-oss:120b'): Observable<any> {
    return this.http.post(`${this.apiUrl}/modify`, {
      instruction,
      elementContexts,
      model,
    });
  }
}