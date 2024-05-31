import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { MoveType, CheckState, LastMove } from 'src/app/models/models';
import { FENConverter } from 'src/app/models/FENConverter/FENConverter';
import { BoardState } from './models';

@Injectable({
  providedIn: 'root'
})
export class ChessBoardService {
  public initalBoardState: BoardState = {
    FEN: FENConverter.initalFENPosition,
    moveList: []
  };
  // represents current board state, which is needed in analysis i computer modes
  public boardState$ = new BehaviorSubject<BoardState>(this.initalBoardState);
  public chessGameConfiguration$ = new BehaviorSubject<string>(FENConverter.initalFENPosition);

  public isSquareDark(x: number, y: number): boolean {
    return x % 2 === 0 && y % 2 === 0 || x % 2 === 1 && y % 2 === 1;
  }

  public isSuqareInCheck(isPositionChecked: CheckState, x: number, y: number): boolean {
    if (!isPositionChecked.isCheck) return false;
    return isPositionChecked.x === x && isPositionChecked.y === y;
  }

  public isSquareLastMove(isSquareLastMove: LastMove | undefined, x: number, y: number): boolean {
    if (!isSquareLastMove) return false;
    const { prevX, prevY, currX, currY } = isSquareLastMove;
    return prevX === x && prevY === y || currX === x && currY === y;
  }

  public moveSound(behaviours: Set<MoveType>): void {
    const moveSound = new Audio("assets/sound/move.mp3");

    // move sound hierarchy
    if (behaviours.has(MoveType.Promotion)) moveSound.src = "assets/sound/promote.mp3";
    else if (behaviours.has(MoveType.Capture)) moveSound.src = "assets/sound/capture.mp3";
    else if (behaviours.has(MoveType.Castling)) moveSound.src = "assets/sound/castling.mp3";

    if (behaviours.has(MoveType.CheckMate)) moveSound.src = "assets/sound/checkmate.mp3";
    else if (behaviours.has(MoveType.Check)) moveSound.src = "assets/sound/check.mp3";

    moveSound.play();
  }
}
