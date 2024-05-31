import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { ChessMove, StockfishQueryParams, StockfishResponse, ComputerConfgiuration, stockfishLevels, StockfishData, Evaluation } from './models';
import { BehaviorSubject, Observable, catchError, firstValueFrom, of, switchMap, throwError } from 'rxjs';
import { Color, FENChar } from 'src/app/models/models';

@Injectable({
  providedIn: 'root'
})
export class StockfishService {
  private readonly api: string = "https://stockfish.online/api/s/v2.php";

  public computerConfiguration$ = new BehaviorSubject<ComputerConfgiuration>({ color: Color.Black, level: 1 });

  constructor(private http: HttpClient) { }

  private convertColumnLetterToYCoord(s: string): number {
    return s.charCodeAt(0) - "a".charCodeAt(0);
  }

  private promotionPiece(s: string | undefined): FENChar | null {
    if (!s) return null;
    const computerColor = this.computerConfiguration$.value.color;
    if (s === "n") return computerColor === Color.White ? FENChar.WhiteKnight : FENChar.BlackKnight;
    if (s === "b") return computerColor === Color.White ? FENChar.WhiteBishop : FENChar.BlackBishop;
    if (s === "r") return computerColor === Color.White ? FENChar.WhiteRook : FENChar.BlackRook;
    return computerColor === Color.White ? FENChar.WhiteQueen : FENChar.BlackQueen;
  }

  private moveFromStockfishString(move: string): ChessMove {
    const prevY: number = this.convertColumnLetterToYCoord(move[0]);
    const prevX: number = Number(move[1]) - 1;
    const newY: number = this.convertColumnLetterToYCoord(move[2]);
    const newX: number = Number(move[3]) - 1;
    const promotedPiece: FENChar | null = this.promotionPiece(move[4]);
    return { prevX, prevY, newX, newY, promotedPiece };
  }

  public getStockfishData(fen: string): Observable<StockfishData> {
    const queryParams: StockfishQueryParams = {
      fen,
      depth: this.computerConfiguration$.value.level,
    };
    let params = new HttpParams().appendAll(queryParams);

    return this.http.get<StockfishResponse>(this.api, { params })
      .pipe(
        switchMap(response => {
          if (!response) throw new Error("null");
          if (!response.success) throw new Error(response.error);
          const bestmove: ChessMove = this.moveFromStockfishString(response.bestmove.split(" ")[1]);
          const continuation: ChessMove[] = response.continuation.split(" ").map(move => this.moveFromStockfishString(move));
          const { mate, evaluation } = response;
          // need to handle evaluation object
          let positionEvaluation: Evaluation = { evaluation: 0, mate: null };
          if (evaluation !== null && mate === null) positionEvaluation = { evaluation, mate: null };
          else if (evaluation === null && mate !== null) positionEvaluation = { evaluation: null, mate };

          return of({
            bestmove,
            continuation,
            evaluation: positionEvaluation
          });
        }),
        // proveri sta radi ovaj catchOperator
        catchError(() => throwError(() => new Error("Handle that")))
      );
  }
}