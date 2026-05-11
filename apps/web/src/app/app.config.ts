import { ApplicationConfig, provideBrowserGlobalErrorListeners, inject, provideAppInitializer } from '@angular/core';
import { provideRouter } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import { provideAnimations } from '@angular/platform-browser/animations';
import { provideApollo } from 'apollo-angular';
import { HttpLink } from 'apollo-angular/http';
import { ApolloLink, InMemoryCache } from '@apollo/client';
import { provideNzIcons, NzIconService } from 'ng-zorro-antd/icon';
import {
  AlignCenterOutline, AlignLeftOutline, AlignRightOutline,
  AppstoreOutline,
  ArrowLeftOutline,
  BarsOutline, BoldOutline, BorderOutline,
  CheckOutline, CheckCircleOutline, CopyOutline,
  DeleteOutline, DownOutline, DownloadOutline,
  EditOutline, EllipsisOutline, EyeOutline, EyeInvisibleOutline,
  FileImageOutline, FontSizeOutline,
  ItalicOutline,
  LoadingOutline, LockOutline,
  MinusOutline,
  PictureOutline, PlusOutline,
  RedoOutline,
  ThunderboltOutline,
  UndoOutline, UnlockOutline, UpOutline, UploadOutline,
} from '@ant-design/icons-angular/icons';

import { routes } from './app.routes';
import { environment } from '../environments/environment';
import { AuthService } from './core/services/auth.service';

const circleSvg = `<svg viewBox="0 0 1024 1024" fill="currentColor" width="1em" height="1em"><path d="M512 64C264.6 64 64 264.6 64 512s200.6 448 448 448 448-200.6 448-448S759.4 64 512 64zm0 820c-205.4 0-372-166.6-372-372s166.6-372 372-372 372 166.6 372 372-166.6 372-372 372z"/></svg>`;

const icons = [
  AlignCenterOutline, AlignLeftOutline, AlignRightOutline,
  AppstoreOutline, ArrowLeftOutline, BarsOutline, BoldOutline, BorderOutline,
  CheckOutline, CheckCircleOutline, CopyOutline,
  DeleteOutline, DownOutline, DownloadOutline,
  EditOutline, EllipsisOutline, EyeOutline, EyeInvisibleOutline,
  FileImageOutline, FontSizeOutline, ItalicOutline,
  LoadingOutline, LockOutline, MinusOutline,
  PictureOutline, PlusOutline, RedoOutline,
  ThunderboltOutline, UndoOutline, UnlockOutline, UpOutline, UploadOutline,
];

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideRouter(routes),
    provideHttpClient(),
    provideAnimations(),
    provideNzIcons(icons),
    provideAppInitializer(() => {
      inject(NzIconService).addIconLiteral('ant-design:circle', circleSvg);
    }),
    provideApollo(() => {
      const httpLink = inject(HttpLink);
      const authService = inject(AuthService);
      const http = httpLink.create({ uri: environment.graphqlUrl });

      const authMiddleware = new ApolloLink((operation, forward) => {
        const token = authService.currentToken();
        operation.setContext(({ headers = {} }) => ({
          headers: {
            ...headers,
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
        }));
        return forward(operation);
      });

      return {
        link: authMiddleware.concat(http),
        cache: new InMemoryCache(),
      };
    }),
  ]
};