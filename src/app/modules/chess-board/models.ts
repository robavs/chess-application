import { FENChar, MoveList } from "src/app/models/models";

type SquareWithPiece = {
    piece: FENChar,
    x: number,
    y: number
};

type SquareWithoutPiece = {
    piece: null
};

export type SelectedSquare = SquareWithPiece | SquareWithoutPiece;

export enum MovingPieceEvent {
    Click,
    Drag
};

export type BoardState = {
    FEN: string,
    moveList: MoveList
}