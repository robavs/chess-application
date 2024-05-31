import { AfterViewInit, Component, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { CommonModule } from '@angular/common';
import { StockfishService } from '../computer-mode/computer-mode.service';
import { ChessMove } from '../computer-mode/models';
import { BehaviorSubject, Subscription, finalize, firstValueFrom, interval, tap } from 'rxjs';
import { ChessBoardService } from '../chess-board/chess-board.service';
import { ChessBoardComponent } from '../chess-board/chess-board.component';
import { ChessBoard } from 'src/app/models/standard-chess';
import { CheckState, Color, FENChar, GameHistory, LastMove, pieceImagePaths } from 'src/app/models/models';

@Component({
    selector: 'app-analysis-mode',
    templateUrl: './analysis-mode.component.html',
    styleUrls: ['./analysis-mode.component.css'],
    standalone: true,
    imports: [CommonModule, MatSlideToggleModule, ChessBoardComponent]
})
export class AnalysisModeComponent implements OnInit, AfterViewInit, OnDestroy {
    public pieceImagePaths: Readonly<Record<FENChar, string>> = pieceImagePaths;

    @ViewChild("chessBoard") chessBoardCmp!: ChessBoardComponent;

    // Stockfish repsonse properties
    // "..." means that black is playing
    public moves: ([string | "...", string?])[] = [];
    private engineLinesFEN: string[] = [];
    public evaluationBarPercentage: number = 50;

    // Chess board preview properties
    public isPreviewMode: boolean = false;
    public chessBoardPreview: (FENChar | null)[][] = [];
    private checkStatePreviewMode: CheckState = { isCheck: false };
    private lastMovePreviewMode: LastMove | undefined;
    private gameHistory: GameHistory = [];

    public currentMove: number = 0;
    private moveListNeededToPremove: ChessMove[] = [];

    public showAnalysisFeatures: boolean = true;
    public areMovesCalculated: boolean = false;
    private subscriptions$ = new Subscription();
    private isViewInitialized$ = new BehaviorSubject<boolean>(false);

    constructor(private stockfishService: StockfishService, private chessBoardService: ChessBoardService) { }
    // treba da promenim i gameHistory pointer kada sam u view mode
    public ngAfterViewInit() {
        this.isViewInitialized$.next(true);
    }

    // ima neki bug ako numOfFullmoves nije 1 u FEN
    public ngOnInit(): void {
        this.isViewInitialized$.subscribe({
            next: (isViewInitialized) => {
                if (!isViewInitialized) return;

                const boardStateSubscription$: Subscription = this.chessBoardService.boardState$.subscribe({
                    next: async ({ FEN }) => {
                        if (this.chessBoardCmp.standardChess.isGameOver)
                            return boardStateSubscription$.unsubscribe();

                        this.areMovesCalculated = false;

                        const { continuation, evaluation } = await firstValueFrom(this.stockfishService.getStockfishData(FEN));

                        // ovde treba bolji algoritam za prikazivanje postotka, i da se handluje situacija ukoliko je check mate
                        // sa tarabicama i tako to
                        // treba da se ispravi ovo za evaluation, i da se podesi ona tarabica ukoliko je checkmate
                        if (typeof evaluation.evaluation === "number") {
                            if (Math.abs(evaluation.evaluation) > 9) {
                                this.evaluationBarPercentage = evaluation.evaluation > 0 ? 90 : -90;
                            }
                            else this.evaluationBarPercentage = (50 + (evaluation.evaluation / 8) * 100);
                        }
                        else {
                            this.evaluationBarPercentage = 100;
                        }

                        this.engineLinesFEN = [];
                        const currentChessBoard = new ChessBoard();
                        currentChessBoard.convertFENToBoard(FEN);

                        const FENSplited: string[] = FEN.split(" ");
                        const isBlackMove: boolean = FENSplited[1] === "b";
                        const numOfFullMoves = Number(FENSplited[5]);

                        this.moveListNeededToPremove = continuation;

                        continuation.forEach(move => {
                            const { prevX, prevY, newX, newY, promotedPiece } = move;
                            currentChessBoard.move(prevX, prevY, newX, newY, promotedPiece);
                            this.engineLinesFEN.push(currentChessBoard.boardAsFEN);
                        });
                        this.gameHistory = currentChessBoard.gameHistory;
                        this.moves = currentChessBoard.moveList;
                        // because we convert FEN to board, from the FEN we updated number_of_full_moves in StandardChess instance, which causes that moveList would not start indexing game from zero, but rather than
                        // current number_of_full_moves, which means that moveList will have empty elements at the beggining
                        // thats why we need to filter them out
                        this.moves = this.moves.filter(move => move);

                        if (isBlackMove) {
                            this.moves[0].unshift("...");
                            this.engineLinesFEN.unshift("...");
                        }
                        this.currentMove = numOfFullMoves;
                        this.areMovesCalculated = true;
                    }
                });
                this.subscriptions$.add(boardStateSubscription$);
            }
        });
    }

    public ngOnDestroy(): void {
        this.subscriptions$.unsubscribe();
    }

    public toggleAnalysisView(): void {
        this.showAnalysisFeatures = !this.showAnalysisFeatures;
    }

    // update board when clicking on one of the engine line moves
    //------------------------------------
    //------------------------------------
    //------------------------------------
    // ISPRAVKA ALERTTTTTTTT
    //------------------------------------
    //------------------------------------
    //------------------------------------
    // ovaj metod treba da se ispravi kada sam podesio da prvi igra crni, ili sta bese, al znam da treba ispravka
    public updateBoard(FENIndex: number): void {
        const FEN: string = this.engineLinesFEN[FENIndex];
        if (FEN === "...") return;

        let start: number = this.engineLinesFEN[0] === "..." ? 1 : 0;
        let numberOfMovesToPremove: number = FENIndex - start + 1;
        this.moveListNeededToPremove = this.moveListNeededToPremove.slice(0, numberOfMovesToPremove);

        this.isPreviewMode = false;
        this.areMovesCalculated = false;
        const chessBoardCmp: ChessBoardComponent = this.chessBoardCmp;

        const premoveGameInterval$: Subscription = interval(100)
            .pipe(
                tap((timerIndex: number) => {
                    if (timerIndex === this.moveListNeededToPremove.length)
                        premoveGameInterval$.unsubscribe();

                    const { prevX, prevY, newX, newY, promotedPiece } = this.moveListNeededToPremove[timerIndex];
                    chessBoardCmp.standardChess.move(prevX, prevY, newX, newY, promotedPiece);
                    chessBoardCmp.updateLastMoveAndCheckState(chessBoardCmp.standardChess.lastMove, chessBoardCmp.standardChess.checkState);
                    chessBoardCmp.chessBoardView = chessBoardCmp.standardChess.chessBoardView;
                    chessBoardCmp.gameHistoryPointer++;
                }),
                finalize(() => {
                    this.chessBoardService.boardState$.next({
                        FEN: chessBoardCmp.standardChess.boardAsFEN,
                        moveList: chessBoardCmp.standardChess.moveList
                    });
                })
            )
            .subscribe();
    }

    // ovo isto treba se ispravi
    //-------------------------------- PREVIEW BOARD MODE --------------------------------

    public isSquareDark(x: number, y: number): boolean {
        return this.chessBoardService.isSquareDark(x, y);
    }

    public isSquareInLastMove(x: number, y: number): boolean {
        return this.chessBoardService.isSquareLastMove(this.lastMovePreviewMode, x, y)
    }

    // ovo u servis stavljam
    public isSquareChecked(x: number, y: number): boolean {
        return this.chessBoardService.isSuqareInCheck(this.checkStatePreviewMode, x, y);
    }

    public leavePreviewMode(): void {
        this.isPreviewMode = false;
    }

    // ima neki bug kada sam u view modu i kliknem na potez da mi lose obradi
    public previewBoard(moveNumber: number): void {
        // you cant click on move which is ...
        if (this.chessBoardCmp.standardChess.playerColor === Color.Black) moveNumber--;
        if (this.engineLinesFEN[moveNumber] === "...") return;

        this.isPreviewMode = true;
        const { board, lastMove, checkState } = this.gameHistory[moveNumber];
        this.checkStatePreviewMode = checkState;
        this.chessBoardPreview = board;
        this.lastMovePreviewMode = lastMove;
        if (lastMove) this.chessBoardService.moveSound(lastMove.moveType);
    }
}