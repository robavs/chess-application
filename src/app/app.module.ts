import { ErrorHandler, NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { HTTP_INTERCEPTORS, HttpClientModule } from '@angular/common/http';
import { AppComponent } from './app.component';
import { ChessBoardComponent } from './modules/chess-board/chess-board.component';
import { MoveListComponent } from './modules/move-list/move-list.component';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { AppRoutingModule } from './routes/app-routing.module';
import { ComputerModeComponent } from './modules/computer-mode/computer-mode.component';
import { BoardEditorComponent } from './modules/board-editor/board-editor.component';
import { AnalysisModeComponent } from './modules/analysis-mode/analysis-mode.component';
import { HandlingErrorInterceptor } from './interceptors/handling-error.interceptor';
import { GlobalErrorHandler } from './models/global-error-handler/global-error-handler';
import { MatSnackBarModule } from '@angular/material/snack-bar';
import { PlayAgainstComputerDialogComponent } from './modules/play-against-computer-dialog/play-against-computer-dialog.component';
import { NavMenuComponent } from './modules/nav-menu/nav-menu.component';

@NgModule({
  declarations: [
    AppComponent,
  ],
  imports: [
    BrowserModule,
    AppRoutingModule,
    HttpClientModule,
    BrowserAnimationsModule,
    NavMenuComponent,
    ChessBoardComponent,
    MoveListComponent,
    BoardEditorComponent,
    ComputerModeComponent,
    AnalysisModeComponent,
    MatSnackBarModule,
    PlayAgainstComputerDialogComponent,
  ],
  providers: [
    {
      provide: HTTP_INTERCEPTORS,
      useClass: HandlingErrorInterceptor,
      multi: true
    },
    {
      provide: ErrorHandler,
      useClass: GlobalErrorHandler
    }
  ],
  bootstrap: [AppComponent]
})
export class AppModule { }
