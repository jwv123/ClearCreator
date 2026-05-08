import { ApplicationConfig, provideBrowserGlobalErrorListeners, inject } from '@angular/core';
import { provideRouter } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import { provideAnimations } from '@angular/platform-browser/animations';
import { provideApollo } from 'apollo-angular';
import { HttpLink } from 'apollo-angular/http';
import { ApolloLink, InMemoryCache } from '@apollo/client';

import { routes } from './app.routes';
import { environment } from '../environments/environment';
import { AuthService } from './core/services/auth.service';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideRouter(routes),
    provideHttpClient(),
    provideAnimations(),
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