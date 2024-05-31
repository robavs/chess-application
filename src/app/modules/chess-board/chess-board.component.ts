import { Component, OnDestroy, OnInit } from '@angular/core';
import { ChessBoard } from 'src/app/models/standard-chess';
import { MoveType, CheckState, Color, Coords, FENChar, GameHistory, LastMove, MoveList, SafeSquares, pieceImagePaths } from 'src/app/models/models';
import { Subscription, filter, fromEvent, tap } from 'rxjs';
import { MovingPieceEvent, SelectedSquare } from './models';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MoveListComponent } from '../move-list/move-list.component';
import { MatIconModule } from '@angular/material/icon';
import { ChessBoardService } from './chess-board.service';
import { PlayAgainstComputerDialogComponent } from '../play-against-computer-dialog/play-against-computer-dialog.component';
import { FENConverter } from 'src/app/models/FENConverter/FENConverter';

@Component({
  selector: 'chess-board',
  templateUrl: './chess-board.component.html',
  styleUrls: ['./chess-board.component.css'],
  standalone: true,
  imports: [CommonModule, MatButtonModule, MatIconModule, MoveListComponent, PlayAgainstComputerDialogComponent]
})
export class ChessBoardComponent implements OnInit, OnDestroy {
  //-------------------------------- CHESS BOARD --------------------------------
  public standardChess = new ChessBoard();
  public chessBoardView = this.standardChess.chessBoardView;
  public get whoIsPlaying(): Color { return this.standardChess.playerColor; };
  public get message(): string {
    const whoIsPlayingMessage = (this.standardChess.playerColor === Color.White ? "White" : "Black") + " is playing";
    return this.standardChess.gameOverMessage ?? whoIsPlayingMessage;
  };
  public get safeSquares(): SafeSquares { return this.standardChess.safeSquares; };
  public get moveList(): MoveList { return this.standardChess.moveList; };
  public get gameHistory(): GameHistory { return this.standardChess.gameHistory; };

  //-------------------------------- SQUARE CURRENT STATE PROPERTIES --------------------------------
  private selectedPiece: SelectedSquare = { piece: null };
  private selectedPieceSafeCoords: Coords[] = [];
  private lastMove: LastMove | undefined;
  private checkState: CheckState = this.standardChess.checkState;

  //-------------------------------- PROMOTION PROPERTIES --------------------------------
  public isPromotionActive: boolean = false;
  private promotionCoords: Coords | null = null;
  private promotedPiece: FENChar | null = null;
  public promotionPieces(): FENChar[] {
    return this.whoIsPlaying === Color.White ?
      [FENChar.WhiteKnight, FENChar.WhiteBishop, FENChar.WhiteRook, FENChar.WhiteQueen] :
      [FENChar.BlackKnight, FENChar.BlackBishop, FENChar.BlackRook, FENChar.BlackQueen];
  };

  public pieceImagePaths = pieceImagePaths;
  public flipMode: boolean = false;
  public gameHistoryPointer: number = 0;
  private subscriptions$ = new Subscription();
  protected isInitialized: boolean = false;

  constructor(protected chessBoardService: ChessBoardService) { }

  public ngOnInit(): void {
    const keyEventSubscription$: Subscription = fromEvent<KeyboardEvent>(document, "keyup")
      .pipe(
        filter(event => event.key === "ArrowRight" || event.key === "ArrowLeft"),
        tap((event) => {
          switch (event.key) {
            case "ArrowRight":
              if (this.gameHistoryPointer === this.gameHistory.length - 1) return;
              this.gameHistoryPointer++;
              break;
            case "ArrowLeft":
              if (this.gameHistoryPointer === 0) return;
              this.gameHistoryPointer--;
              break;
            default:
              break;
          }
          this.showPreviousPosition(this.gameHistoryPointer);
        })
      )
      .subscribe();

    const selectStartSubscription$: Subscription = fromEvent(document, "selectstart")
      .pipe(
        tap((event) => event.preventDefault())
      )
      .subscribe();

    // in case if game has different configuration than inital, because we can play against friend with different
    // position which we will add in board editor as possibility
    const chessGameConfigSubsciption$: Subscription = this.chessBoardService.chessGameConfiguration$
      .subscribe({
        next: (FEN) => {
          if (FEN === null) return;

          this.standardChess.convertFENToBoard(FEN);
          this.chessBoardView = this.standardChess.chessBoardView;
          this.checkState = this.standardChess.checkState;
          this.lastMove = this.standardChess.lastMove;
          this.isInitialized = true;

          this.chessBoardService.boardState$.next({
            FEN: this.standardChess.boardAsFEN,
            moveList: this.standardChess.moveList
          });
        }
      });

    // need to update safe squares of selectedPiece in case when you playing against computer, (or in future
    // against friend online, (trebao bih onda i za sebe posle da uvedem opciju za premove))
    const boardStateSub$: Subscription = this.chessBoardService.boardState$.subscribe({
      next: () => {
        if (this.selectedPiece.piece) {
          const { x, y } = this.selectedPiece;
          this.selectedPieceSafeCoords = this.safeSquares.get(x + "," + y) || [];
        }
      }
    });

    this.subscriptions$.add(keyEventSubscription$);
    this.subscriptions$.add(selectStartSubscription$);
    this.subscriptions$.add(chessGameConfigSubsciption$);
    this.subscriptions$.add(boardStateSub$);
  }

  public ngOnDestroy(): void {
    this.subscriptions$.unsubscribe();
    this.chessBoardService.chessGameConfiguration$.next(FENConverter.initalFENPosition);
  }

  //-------------------------------- SQUARE CURRENT STATE METHODS --------------------------------

  public isSquareDark(x: number, y: number): boolean {
    return this.chessBoardService.isSquareDark(x, y);
  }

  public isSuqareInCheck(x: number, y: number): boolean {
    return this.chessBoardService.isSuqareInCheck(this.checkState, x, y);
  }

  public isSquareLastMove(x: number, y: number): boolean {
    return this.chessBoardService.isSquareLastMove(this.lastMove, x, y);
  }

  public isSquareSelected(x: number, y: number): boolean {
    if (!this.selectedPiece.piece) return false;
    return this.selectedPiece.x === x && this.selectedPiece.y === y;
  }

  public isSquareSafeForSelectedPiece(newX: number, newY: number): boolean {
    return this.selectedPieceSafeCoords.some(({ x, y }) => x === newX && y === newY);
  }

  public isSquarePromotion(x: number, y: number): boolean {
    if (!this.promotionCoords) return false;
    return this.promotionCoords.x === x && this.promotionCoords.y === y;
  }

  //-------------------------------- Mark and unmark selected, safe, checked and promoted square --------------------------------

  private unmarkPreviousSelectedAndSafeSquares(): void {
    this.selectedPieceSafeCoords = [];
    this.selectedPiece = { piece: null };

    if (this.isPromotionActive) {
      this.isPromotionActive = false;
      this.promotionCoords = this.promotedPiece = null;
    }
  }

  public updateLastMoveAndCheckState(lastMove: LastMove | undefined, checkState: CheckState): void {
    this.lastMove = lastMove;
    this.checkState = checkState;

    if (this.lastMove)
      this.chessBoardService.moveSound(this.lastMove.moveType);
    else
      this.chessBoardService.moveSound(new Set<MoveType>([MoveType.BasicMove]));
  }

  //-------------------------------- METHODS FOR SELECTING AND PLACING PIECES --------------------------------

  private selectingPiece(x: number, y: number, movingPieceEvent: MovingPieceEvent): void {
    const piece: FENChar | null = this.chessBoardView[x][y];
    if (!piece) return;

    if (this.isSelectedPieceWithWrongColor(piece)) return;

    const isSameSquareClicked: boolean = !!this.selectedPiece.piece && this.selectedPiece.x === x && this.selectedPiece.y === y;
    this.unmarkPreviousSelectedAndSafeSquares();

    // preventing unselecting piece if it has been selected but its dragged for the second time
    if (isSameSquareClicked && movingPieceEvent === MovingPieceEvent.Click) return;

    this.selectedPieceSafeCoords = this.safeSquares.get(x + "," + y) || [];
    this.selectedPiece = { piece, x, y };
  }

  private placingPiece(newX: number, newY: number, movingPieceEvent: MovingPieceEvent): void {
    if (!this.selectedPiece.piece) return;

    // HANDLING INCORRECT MOVE
    if (!this.isSquareSafeForSelectedPiece(newX, newY)) {
      this.handlingIncorrectMove(newX, newY, movingPieceEvent);
      return;
    }

    // PAWN PROMOTION 
    const isPawnSelected: boolean = (this.selectedPiece.piece === FENChar.WhitePawn || this.selectedPiece.piece === FENChar.BlackPawn)
    const isPawnOnLastRank: boolean = isPawnSelected && (newX === 7 || newX === 0);
    const shouldOpenPromotionDialog: boolean = !this.isPromotionActive && isPawnOnLastRank;

    if (shouldOpenPromotionDialog) {
      this.selectedPieceSafeCoords = [];
      this.isPromotionActive = true;
      this.promotionCoords = { x: newX, y: newY };
      return;
    }

    this.updateBoardState(this.selectedPiece.x, this.selectedPiece.y, newX, newY);
  }

  private updateBoardState(prevX: number, prevY: number, newX: number, newY: number): void {
    // UPDATE BOARD STATE AND VIEW
    this.standardChess.move(prevX, prevY, newX, newY, this.promotedPiece);
    this.chessBoardView = this.standardChess.chessBoardView;
    this.gameHistoryPointer++;

    this.unmarkPreviousSelectedAndSafeSquares();
    this.updateLastMoveAndCheckState(this.standardChess.lastMove, this.standardChess.checkState);

    // Singalizes that board changed
    this.chessBoardService.boardState$.next({
      FEN: this.standardChess.boardAsFEN,
      moveList: this.standardChess.moveList
    });
  }

  private handlingIncorrectMove(newX: number, newY: number, movingPieceEvent: MovingPieceEvent): void {
    const selectedPiece: FENChar | null = this.chessBoardView[newX][newY];
    const isMoveIllegal: boolean = !selectedPiece || this.isSelectedPieceWithWrongColor(selectedPiece);
    const placingPieceOnSquareWehreYourPieceIs: boolean = !selectedPiece || !this.isSelectedPieceWithWrongColor(selectedPiece);

    if (isMoveIllegal) new Audio("assets/sound/incorrect-move.mp3").play();

    if (isMoveIllegal || placingPieceOnSquareWehreYourPieceIs && movingPieceEvent === MovingPieceEvent.Drag)
      this.unmarkPreviousSelectedAndSafeSquares();
  }

  //-------------------------------- PIECE CLICK AND DRAG & DROP EVENTS --------------------------------

  public dragstart(x: number, y: number): void {
    if (this.isMovingPieceDisabledMode()) return;
    this.selectingPiece(x, y, MovingPieceEvent.Drag);
  }

  public dragover(event: DragEvent): void {
    event.preventDefault();
  }

  public drop(event: DragEvent, x: number, y: number): void {
    event.preventDefault();
    if (this.isMovingPieceDisabledMode()) return;
    this.placingPiece(x, y, MovingPieceEvent.Drag);
  }

  public move(x: number, y: number): void {
    if (this.isMovingPieceDisabledMode()) return;
    this.selectingPiece(x, y, MovingPieceEvent.Click);
    this.placingPiece(x, y, MovingPieceEvent.Click);
  }

  //-------------------------------- PROMOTION --------------------------------

  public promotePiece(piece: FENChar): void {
    if (!this.promotionCoords || !this.selectedPiece.piece) return;
    this.promotedPiece = piece;
    const { x: newX, y: newY } = this.promotionCoords;
    const { x: prevX, y: prevY } = this.selectedPiece;
    this.updateBoardState(prevX, prevY, newX, newY);
  }

  public closePawnPromotionDialog(): void {
    this.unmarkPreviousSelectedAndSafeSquares();
  }

  public showPreviousPosition(moveIndex: number): void {
    const { board, lastMove, checkState } = this.gameHistory[moveIndex];
    this.chessBoardView = board;
    this.gameHistoryPointer = moveIndex;
    this.updateLastMoveAndCheckState(lastMove, checkState);
    this.unmarkPreviousSelectedAndSafeSquares();
  }

  //-------------------------------- FUNCTIONS THAT PREVENT MOVING AND DRAGGIN PIECE () --------------------------------
  // this functions need to be overriden dependeing on which mode player is
  protected isSelectedPieceWithWrongColor(piece: FENChar): boolean {
    const isWhitePieceSelected: boolean = piece === piece.toUpperCase();
    return (this.whoIsPlaying === Color.White && !isWhitePieceSelected) ||
      (this.whoIsPlaying === Color.Black && isWhitePieceSelected);
  }

  public isMovingPieceDisabledMode(): boolean {
    const isViewMode: boolean = this.gameHistoryPointer !== this.gameHistory.length - 1;
    return isViewMode || this.standardChess.isGameOver;
  }

  public isPieceDraggable(piece: FENChar): boolean {
    return !this.isSelectedPieceWithWrongColor(piece) && !this.isMovingPieceDisabledMode()
  }

  public flipBoard(): void {
    this.flipMode = !this.flipMode;
  }
}