import { Injectable } from '@angular/core';
import {
  HttpRequest,
  HttpHandler,
  HttpEvent,
  HttpInterceptor
} from '@angular/common/http';
import { Observable, catchError, delay, retry, tap, throwError } from 'rxjs';

@Injectable()
export class HandlingErrorInterceptor implements HttpInterceptor {

  constructor() { }

  intercept(request: HttpRequest<unknown>, next: HttpHandler): Observable<HttpEvent<unknown>> {
    return next.handle(request).pipe(
      retry(3),
      catchError(() => {
        return throwError(() => new Error("It failed"));
      }),
      delay(500)
    );
  }
}
