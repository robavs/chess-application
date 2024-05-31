import { Component, ElementRef, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { Subject, Subscription, combineLatest, debounceTime, fromEvent, tap } from 'rxjs';
import { Coords, EnPassantTargetSquares, FENChar, pieceImagePaths } from 'src/app/models/models';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { CommonModule } from '@angular/common';
import { ChessBoard } from 'src/app/models/standard-chess';
import { FENConverter } from 'src/app/models/FENConverter/FENConverter';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { FormControl, FormGroup, FormsModule, ReactiveFormsModule } from '@angular/forms';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { ActivatedRoute, Router } from '@angular/router';
import { ChessBoardService } from '../chess-board/chess-board.service';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { PlayAgainstComputerDialogComponent } from '../play-against-computer-dialog/play-against-computer-dialog.component';

// treba da omogucim da kad sam u board editor mode, da mi se updateuje onaj url
@Component({
  selector: 'app-board-editor',
  templateUrl: './board-editor.component.html',
  styleUrls: ['./board-editor.component.css'],
  standalone: true,
  imports: [CommonModule, MatButtonModule, MatIconModule, MatInputModule, MatFormFieldModule, MatSelectModule, FormsModule, ReactiveFormsModule, MatCheckboxModule, MatDialogModule]
})
export class BoardEditorComponent implements OnInit, OnDestroy {
  @ViewChild("chessBoard") private chessBoardRef!: ElementRef<HTMLDivElement>;

  // Needed for images
  public pieceImagePaths: Readonly<Record<FENChar, string>> = pieceImagePaths;
  public whitePieces = [FENChar.WhiteKing, FENChar.WhiteQueen, FENChar.WhiteRook, FENChar.WhiteBishop, FENChar.WhiteKnight, FENChar.WhitePawn];
  public blackPieces = [FENChar.BlackKing, FENChar.BlackQueen, FENChar.BlackRook, FENChar.BlackBishop, FENChar.BlackKnight, FENChar.BlackPawn];

  // Chess board properties
  private standardChess = new ChessBoard();
  private FENConverter = new FENConverter();
  public boardView: (FENChar | null)[][] = this.standardChess.chessBoardView;

  public selectedMode: FENChar | "bin" | "cursor" = "cursor";
  public selectedPiece: FENChar | null = null;
  public dragstartCoords: Coords | null = null;
  private isLeftClickPressed: boolean = false;

  // ovo verovatno radim samo zbog sebe
  public positionConfigForm = new FormGroup({
    player: new FormControl<"w" | "b">("w", { nonNullable: true }),
    castling: new FormGroup({
      whiteKingSide: new FormControl<boolean>(true, { nonNullable: true }),
      whiteQueenSide: new FormControl<boolean>(true, { nonNullable: true }),
      blackKingSide: new FormControl<boolean>(true, { nonNullable: true }),
      blackQueenSide: new FormControl<boolean>(true, { nonNullable: true }),
    }),
    enPassantTargetSquare: new FormControl<EnPassantTargetSquares>("-", { nonNullable: true }),
  });
  public FENPositionForm = new FormControl<string>("");

  // ovo enPassant possible squares se update u zavinosti od toga ako postoje pesaci koji zadovljavaju enPassant
  // i u zavinosti ko je na potezu
  public enPassantCalcuatedSquares: EnPassantTargetSquares[] = [];

  private calculateEnPassantPossibleSquares(): void {
    console.log(this.positionConfigForm.getRawValue().player);
    this.enPassantCalcuatedSquares = this.FENConverter.generatingPossibleEnPassantTargetSquares(this.boardView, this.positionConfigForm.getRawValue().player)
  };

  public flipMode: boolean = false;
  private boardChanged$ = new Subject<void>();
  private subscriptions$ = new Subscription();
  public isPositionValid: boolean = true;

  constructor(
    private router: Router,
    private route: ActivatedRoute,
    private chessBoardService: ChessBoardService,
    private dialog: MatDialog
  ) { }

  public ngOnInit(): void {
    const selectStartSubscription$ = fromEvent(document, "selectstart")
      .pipe(
        tap(event => event.preventDefault())
      )
      .subscribe();

    // if drag end is fired at piece dragged from board and on area that is not board => remove piece from board
    const dragEndSubscription$: Subscription = fromEvent<DragEvent>(document, "dragend")
      .pipe(
        tap((event) => {
          if (!this.dragstartCoords) return;
          const x: number = event.clientX;
          const y: number = event.clientY;
          const { left, right, bottom, top } = this.chessBoardRef.nativeElement.getBoundingClientRect();
          if (x >= left && x <= right && y >= top && y <= bottom) return;

          this.boardView[this.dragstartCoords.x][this.dragstartCoords.y] = null;
          this.dragstartCoords = null;
          this.boardChanged$.next();
        })
      )
      .subscribe();

    // in case we fire up mousedown event, but only finish it out of board
    // that prevent bug when we do this that when we return to board, we call function mouseover
    const mouseUpSubscription$: Subscription = fromEvent(document, "mouseup")
      .pipe(
        tap(() => this.isLeftClickPressed = false)
      )
      .subscribe();

    //-------------------------------- Position Configuration Handling --------------------------------
    const postionConfigValueChagnesSuscription$: Subscription = this.positionConfigForm.valueChanges
      .subscribe({
        next: () => this.handlingGameConfigChanges()
      });

    const boardChangedSubscription$: Subscription = this.boardChanged$
      .pipe(debounceTime(300))
      .subscribe({
        next: () => this.handlingGameConfigChanges()
      });

    // set up the board when page reloads
    let fragment = this.route.snapshot.fragment;
    if (fragment) {
      fragment = fragment.replaceAll("_", " ");

      try {
        if (this.FENConverter.validatingFENPosition(fragment)) {
          this.FENPositionForm.setValue(fragment);
          fragment = fragment.replaceAll(" ", "_");
        }
      }
      catch (err) {
        this.FENPositionForm.setValue(FENConverter.initalFENPosition);
        fragment = FENConverter.initalFENPosition.replaceAll(" ", "_");
        this.router.navigate(["board-editor"], { fragment });
      }

      const [position, player, castling, enPassantTargetSquare, halfClock, fullNumberOfMoves] = fragment.split("_");
      const rows = position.split("/").reverse();
      const boardView: (FENChar | null)[][] = [];

      for (let x = 0; x < 8; x++) {
        const boardRow: (FENChar | null)[] = [];

        for (let y = 0; y < rows[x].length; y++) {
          const item: string = rows[x][y];
          if (item.charCodeAt(0) >= '0'.charCodeAt(0) && item.charCodeAt(0) <= "8".charCodeAt(0)) {
            boardRow.push(...Array(Number(item)).fill(0).map(() => null));
            continue;
          }
          boardRow.push(item as FENChar);
        }
        boardView.push(boardRow);
      }

      this.boardView = boardView;
      this.updateGameConfigForm(player, castling, enPassantTargetSquare);
      this.calculateEnPassantPossibleSquares();
    }

    this.subscriptions$.add(selectStartSubscription$);
    this.subscriptions$.add(dragEndSubscription$);
    this.subscriptions$.add(mouseUpSubscription$);
    this.subscriptions$.add(postionConfigValueChagnesSuscription$);
    this.subscriptions$.add(boardChangedSubscription$);
  }

  public ngOnDestroy(): void {
    this.subscriptions$.unsubscribe();
  }

  public isDark(x: number, y: number): boolean {
    return this.chessBoardService.isSquareDark(x, y);
  }

  // SELECTING PIECE AND MODE
  public selectPieceFromBox(pice: FENChar): void {
    this.selectedPiece = pice;
  }

  public selectMode(mode: FENChar | "bin" | "cursor"): void {
    if (mode !== "bin" && mode !== "cursor") this.selectedPiece = mode;
    else this.selectedPiece = null;
    this.selectedMode = mode;
  }

  public mousedown(): void {
    this.isLeftClickPressed = true;
  }
  // imam neki bug da mi se figura u click mode pojavi i odmah nestane al ne u svakom slucaju
  //-------------------------------- PLACING AND REMOVING PIECES --------------------------------

  public mousemove(x: number, y: number): void {
    if (!this.isLeftClickPressed || this.selectedMode === "cursor") return;

    if (this.selectedMode === "bin" && this.boardView[x][y] !== null) {
      this.boardView[x][y] = null;
      this.boardChanged$.next();
    }

    if (this.selectedPiece && this.boardView[x][y] !== this.selectedPiece) {
      this.boardView[x][y] = this.selectedPiece;
      this.boardChanged$.next();
    }
  }

  public placePieceOnClick(x: number, y: number): void {
    if (this.selectedMode === "cursor") return;

    if (this.selectedMode === "bin" && this.boardView[x][y] !== null) {
      this.boardView[x][y] = null;
      this.boardChanged$.next();
    }

    if (this.selectedPiece) {
      this.boardView[x][y] = (this.boardView[x][y] !== this.selectedPiece) ? this.selectedPiece : null;
      this.boardChanged$.next();
    }
    this.isLeftClickPressed = false;
  }

  public dragstart(x: number, y: number): void {
    if (this.selectedMode !== "cursor") return;

    if (this.boardView[x][y] !== null) {
      this.selectedPiece = this.boardView[x][y];
      this.dragstartCoords = { x, y }
    }
  }

  public dragover(event: DragEvent): void {
    event.preventDefault();
  }

  // when piece is dropped to the table, either from piece box or from the table
  public drop(event: DragEvent, x: number, y: number): void {
    event.preventDefault();

    if (this.selectedPiece) {
      this.boardView[x][y] = this.selectedPiece;
      this.boardChanged$.next();
    }

    if (this.dragstartCoords) {
      const { x: startX, y: startY } = this.dragstartCoords;
      if (startX !== x || startY !== y)
        this.boardView[startX][startY] = null;
    }

    this.selectedMode = "cursor";
    this.dragstartCoords = null;
  }

  //-------------------------------- SETTING BOARD --------------------------------

  private updateGameConfigForm(player: string, castling: string, enPassantTargetSquare: string): void {
    this.positionConfigForm.setValue({
      player: player as ("w" | "b"),
      castling: {
        whiteKingSide: castling.includes("K"),
        whiteQueenSide: castling.includes("Q"),
        blackKingSide: castling.includes("k"),
        blackQueenSide: castling.includes("q")
      },
      enPassantTargetSquare: enPassantTargetSquare as EnPassantTargetSquares
    });
  }

  private setBoardFromFEN(fen: string) {
    this.standardChess.convertFENToBoard(fen);
    this.boardView = this.standardChess.chessBoardView;
    const [position, player, castling, enPassantTargetSquare, halfMoveClock, numberOfFullMoves] = fen.split(" ");
    this.updateGameConfigForm(player, castling, enPassantTargetSquare);
    this.FENPositionForm.setValue(fen);
    this.calculateEnPassantPossibleSquares();
    this.router.navigate(["board-editor"], { fragment: fen.replaceAll(" ", "_") });
  }

  public startingPosition(): void {
    this.setBoardFromFEN(FENConverter.initalFENPosition);
  }

  public clearBoard(): void {
    this.setBoardFromFEN(FENConverter.emptyBoardFENPosition);
  }

  public setFENPosition(): void {
    const FEN: string | null = this.FENPositionForm.value;
    if (!FEN) throw new Error("FEN string cant be empty");

    try {
      if (this.FENConverter.validatingFENPosition(FEN))
        this.isPositionValid = true;
    }
    catch (err) {
      this.isPositionValid = false;
      if (err instanceof Error)
        throw new Error(err.message);
    }
    this.setBoardFromFEN(FEN);
  }

  private handlingGameConfigChanges(): void {
    const positionConfig = this.positionConfigForm.getRawValue();
    const player = positionConfig.player;
    const whiteKingSide = positionConfig.castling.whiteKingSide ? "K" : "";
    const whiteQueenSide = positionConfig.castling.whiteQueenSide ? "Q" : "";
    const blackKingSide = positionConfig.castling.blackKingSide ? "k" : "";
    const blackQueenSide = positionConfig.castling.blackQueenSide ? "q" : "";
    const castlingPossibilites = (whiteKingSide + whiteQueenSide + blackKingSide + blackQueenSide) || "-";
    const enPassantPossibility = positionConfig.enPassantTargetSquare;

    const position = this.FENConverter.convertBoardPositionToFEN(this.boardView);
    let fragment = this.route.snapshot.fragment ?? FENConverter.initalFENPosition.replaceAll(" ", "_");
    let fragmentSplited = fragment.split("_");
    const halfMoveClock = fragmentSplited[4];
    const numberOfFullMoves = fragmentSplited[5];
    const FEN = position + " " + player + " " + castlingPossibilites + " " + enPassantPossibility + " " + halfMoveClock + " " + numberOfFullMoves;
    this.FENPositionForm.setValue(FEN);
    this.router.navigate(["board-editor"], { fragment: FEN.replaceAll(" ", "_") });

    // ne znam jel appropirate da se ovde stavi poziv (ili da promenim naziv funkcije)
    this.calculateEnPassantPossibleSquares();

    try {
      if (this.FENConverter.validatingFENPosition(FEN))
        this.isPositionValid = true;
    } catch (error) {
      this.isPositionValid = false;
    }
  }

  //-------------------------------- NAVIGATE TO ANALYSIS AND COMPUTER MODE --------------------------------
  public goToComputerMode(): void {
    if (!this.isPositionValid) return;

    this.dialog.open(PlayAgainstComputerDialogComponent, {
      data: {
        FEN: this.FENPositionForm.value
      }
    });
  }

  analysisMode(): void {
    if (!this.isPositionValid || !this.FENPositionForm.value) return;
    this.chessBoardService.chessGameConfiguration$.next(this.FENPositionForm.value);
    this.router.navigate(["analysis-mode"]);
  }

  public flipBoard(): void {
    this.flipMode = !this.flipMode;
  }
}