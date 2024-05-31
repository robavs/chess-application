import { Component, OnDestroy, OnInit } from '@angular/core';
import { ChessBoardComponent } from '../chess-board/chess-board.component';
import { Color, FENChar } from 'src/app/models/models';
import { Subscription, firstValueFrom } from 'rxjs';
import { StockfishService } from './computer-mode.service';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MoveListComponent } from '../move-list/move-list.component';
import { ChessBoardService } from '../chess-board/chess-board.service';
import { MatDialog } from '@angular/material/dialog';
import { FENConverter } from 'src/app/models/FENConverter/FENConverter';
import { PlayAgainstComputerDialogComponent } from '../play-against-computer-dialog/play-against-computer-dialog.component';

@Component({
  selector: 'app-computer-mode',
  templateUrl: '../chess-board/chess-board.component.html',
  styleUrls: ['../chess-board/chess-board.component.css'],
  standalone: true,
  imports: [CommonModule, MatButtonModule, MatIconModule, MoveListComponent]
})
export class ComputerModeComponent extends ChessBoardComponent implements OnInit, OnDestroy {
  // dodaj loading state ovde
  // ako sam u view mode a kompjuter je odigrao potez, treba to da ishendlujem, tako da se view ne update
  // nego da imam pokazivac da je kompjuter odigrao, sa nekim timer ili tako nesto
  private computerModeSubscriptions$ = new Subscription();

  constructor(chessBoardService: ChessBoardService, private stockfishService: StockfishService,
    private dialog: MatDialog) {
    super(chessBoardService);
  }

  override ngOnInit(): void {
    super.ngOnInit();

    // flip the board if you choose to play with black pieces
    const computerConfigSubscription$: Subscription = this.stockfishService.computerConfiguration$.subscribe({
      next: (computerConfig) => {
        if (computerConfig.color === Color.White) this.flipBoard();
      }
    });

    const computerBoardStateSubscription$: Subscription = this.chessBoardService.boardState$.subscribe();

    //-------------------------------- DISPLAYING COMPUTER MOVES --------------------------------
    const boardStateSubscription$: Subscription = this.chessBoardService.boardState$.subscribe({
      next: async ({ FEN }) => {
        if (!this.isInitialized) return;

        if (this.standardChess.isGameOver)
          return boardStateSubscription$.unsubscribe();

        const player = FEN.split(" ")[1];
        if (player !== this.stockfishService.computerConfiguration$.value.color) return;

        const { bestmove } = await firstValueFrom(this.stockfishService.getStockfishData(FEN));
        const { prevX, prevY, newX, newY, promotedPiece } = bestmove;

        this.standardChess.move(prevX, prevY, newX, newY, promotedPiece);
        this.updateLastMoveAndCheckState(this.standardChess.lastMove, this.standardChess.checkState);
        this.chessBoardView = this.standardChess.chessBoardView;
        this.gameHistoryPointer++;

        this.chessBoardService.boardState$.next({
          FEN: this.standardChess.boardAsFEN,
          moveList: this.standardChess.moveList
        });
      }
    });

    this.computerModeSubscriptions$.add(computerConfigSubscription$);
    this.computerModeSubscriptions$.add(boardStateSubscription$);
    this.computerModeSubscriptions$.add(computerBoardStateSubscription$);
  }

  public override ngOnDestroy(): void {
    super.ngOnDestroy();
    this.computerModeSubscriptions$.unsubscribe();
  }

  // tu bih trebao da napravim da mi se onako asinhrono pozove metoda
  // koja mi markira safe Squares ako sam kliknuo figuru dok cekam da protivnik odigra
  protected override isSelectedPieceWithWrongColor(piece: FENChar): boolean {
    const pieceColor: Color = piece === piece.toUpperCase() ? Color.White : Color.Black;
    const isSelectingComputerColor = (this.stockfishService.computerConfiguration$.value.color === pieceColor);
    return isSelectingComputerColor;
  }
}