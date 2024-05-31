import { Piece } from "./Pieces";

export enum Color {
    White = "w",
    Black = "b"
}

export type Coords = {
    x: number
    y: number
}

export enum FENChar {
    WhitePawn = "P",
    WhiteKnight = "N",
    WhiteBishop = "B",
    WhiteRook = "R",
    WhiteQueen = "Q",
    WhiteKing = "K",
    BlackPawn = "p",
    BlackKnight = "n",
    BlackBishop = "b",
    BlackRook = "r",
    BlackQueen = "q",
    BlackKing = "k"
}

export const pieceImagePaths: Readonly<Record<FENChar, string>> = {
    [FENChar.WhitePawn]: `assets/pieces/wP.svg`,
    [FENChar.WhiteKnight]: `assets/pieces/wN.svg`,
    [FENChar.WhiteBishop]: `assets/pieces/wB.svg`,
    [FENChar.WhiteRook]: `assets/pieces/wR.svg`,
    [FENChar.WhiteQueen]: `assets/pieces/wQ.svg`,
    [FENChar.WhiteKing]: `assets/pieces/wK.svg`,
    [FENChar.BlackPawn]: `assets/pieces/bP.svg`,
    [FENChar.BlackKnight]: `assets/pieces/bN.svg`,
    [FENChar.BlackBishop]: `assets/pieces/bB.svg`,
    [FENChar.BlackRook]: `assets/pieces/bR.svg`,
    [FENChar.BlackQueen]: `assets/pieces/bQ.svg`,
    [FENChar.BlackKing]: `assets/pieces/bK.svg`
}

export type SafeSquares = Map<string, Coords[]>;

export enum MoveType {
    Capture,
    Castling,
    Check,
    CheckMate,
    Promotion,
    BasicMove
}

export type LastMove = {
    piece: Piece,
    prevX: number,
    prevY: number,
    currX: number,
    currY: number,
    moveType: Set<MoveType>
}

type KingChecked = {
    isCheck: true,
    x: number,
    y: number
}

type KingNotChecked = {
    isCheck: false
}

export type CheckState = KingChecked | KingNotChecked

export type MoveList = ([string, string?])[];

// a ne svidja mi se ovaj approach da budem iskren, moracu da pogledam kako da ga zamenim
export const columns = ["a", "b", "c", "d", "e", "f", "g", "h"] as const;

// gameHistory je u formi niza da bi se lakse pristupilo
// array[0] = inital, array[1] = prvi potez beli, array[2] = prvi potez crni itd

// da razmislim da li ovde moze fen da se pamti umesto board
// reprezentacije ili oba da pamtim
// FEN jedino se pamti u slucaju da kasnije napravim mogunocst vracanja 
// poteza pa ce to da mi znaci da odatle vidim castling i tako to
export interface PositionDescription {
    lastMove: LastMove | undefined,
    board: (FENChar | null)[][],
    checkState: CheckState,
    FEN: string
};

export type GameHistory = Array<PositionDescription>;

export type EnPassantTargetSquares = "-" | "a3" | "b3" | "c3" | "d3" | "e3" | "f3" | "g3" | "h3" |
    "a6" | "b6" | "c6" | "d6" | "e6" | "f6" | "g6" | "h6";
