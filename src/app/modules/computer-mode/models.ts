import { Color, FENChar } from "src/app/models/models"

// nisam siguran jel i ovde treba neki fen
export type ComputerConfgiuration = {
    color: Color,
    level: number
}

export const stockfishLevels: Readonly<Record<number, number>> = {
    1: 10,
    2: 11,
    3: 12,
    4: 13,
    5: 15
}

export type StockfishQueryParams = {
    fen: string;
    depth: number;
}

type StockfsihErrorResponse = {
    success: false;
    error: string;
}

type StockfishSuccessResponse = {
    success: true;
    evaluation: number | null;
    mate: number | null;
    bestmove: string;
    continuation: string;
}

export type StockfishResponse = StockfsihErrorResponse | StockfishSuccessResponse;

export type ChessMove = {
    prevX: number,
    prevY: number,
    newX: number,
    newY: number,
    promotedPiece: FENChar | null
}

export type Evaluation = { evaluation: number; mate: null } | { evaluation: null; mate: number }

export type StockfishData = {
    bestmove: ChessMove;
    continuation: ChessMove[];
    evaluation: Evaluation;
}
