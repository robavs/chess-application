import { MoveType as Behavior, Color, EnPassantTargetSquares, FENChar, LastMove, columns } from "../models";
import { Bishop, King, Knight, Pawn, Piece, Queen, Rook } from "../Pieces";
import { ChessBoard } from "../standard-chess";

export class FENConverter {
    public static readonly initalFENPosition: string = "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1";
    public static readonly emptyBoardFENPosition: string = "8/8/8/8/8/8/8/8 w - - 0 1";

    private isNumber = (char: string): boolean => char.charCodeAt(0) >= '0'.charCodeAt(0) && char.charCodeAt(0) <= "8".charCodeAt(0);

    // u neki alert da vatam ove greskice
    private validateCastlingAvialibilty(castlingAvailability: string): boolean {
        return ["-", "KQkq", "KQk", "KQq", "Qkq", "Kkq", "KQ", "kq", "Kk", "Kq", "Qk", "Qq", "K", "Q", "k", "q"]
            .includes(castlingAvailability);
    }

    private validatingEnPassantPossibility(enPassanatPossibility: string): boolean {
        return ["-", "a3", "b3", "c3", "d3", "e3", "f3", "g3", "h3", "a6", "b6", "c6", "d6", "e6", "f6", "g6", "h6"].includes(enPassanatPossibility)
    }

    public validatingFENPosition(FEN: string): boolean {
        const FENArray: string[] = FEN.split(" ");
        if (FENArray.length !== 6)
            throw new Error("Invalid FEN format. Must have all six components (board position, player to move, castlingAvailability, number of half moves and number of full moves) separeted via space");

        const [boardPosition, playerToMove, castlingAvailability, enPassantTargetSquare, HalfmoveClock, FullMoveNumber] = FENArray;
        const rows: string[] = boardPosition.split("/").reverse();

        if (playerToMove !== "w" && playerToMove !== "b")
            throw new Error("player to move must be configured either with 'w' or 'b'");

        if (!this.validateCastlingAvialibilty(castlingAvailability))
            throw new Error("Invalid castling, '-' represents that no side has right to castle, use 'K', 'Q', 'k' and 'q' to represent each side castling rights");

        if (!this.validatingEnPassantPossibility(enPassantTargetSquare))
            throw new Error("Invalidid en passant target square");

        if (playerToMove === "w" && enPassantTargetSquare.includes("3") ||
            playerToMove === "b" && enPassantTargetSquare.includes("6"))
            throw new Error("En passant square " + enPassantTargetSquare + " is invalid for player " + playerToMove);

        if (!this.isNumber(HalfmoveClock))
            throw new Error("Half move clock must be number");
        else {
            if (Number(HalfmoveClock) > 50)
                throw new Error("Half move clock cant exceeded 50 because it means that game is finished with a draw");
        }

        if (!this.isNumber(FullMoveNumber))
            throw new Error("Number of full move must be valid number");
        else {
            if (Number(HalfmoveClock) > Number(FullMoveNumber))
                throw new Error("Half move clock number can't exceeded number of full move");
        }
        if (rows.length !== 8)
            throw new Error("Chess board has 8 rows seprated via slash (/)");

        let whiteKingCounter: number = 0;
        let blackKingCounter: number = 0;

        for (let x = 0; x < 8; x++) {
            let squareCounter = 0;
            for (let y = 0; y < rows[x].length; y++) {
                const square: string = rows[x][y];
                if (this.isNumber(square)) {
                    squareCounter += Number(square);
                    continue;
                }

                if (whiteKingCounter > 1 || blackKingCounter > 1)
                    throw new Error("It is illegal that one side has more than one king");

                if (square === "K") whiteKingCounter++;
                else if (square === "k") blackKingCounter++;

                if ((square === "p" || square === "P") && (x === 0 || x === 7))
                    throw new Error("Pawn cant be placed on last ranks");
                squareCounter++;
            }

            if (squareCounter !== 8)
                throw new Error("Invalid FEN. Every row should have exactly 8 squares");
        }

        if (whiteKingCounter === 0 || blackKingCounter === 0)
            throw new Error("Both sides must have kings");

        // checking if the opposite player in check
        const standardChess = new ChessBoard();
        standardChess.convertFENToBoard(FEN);

        // checking if proviede en passant square is valid
        if (!this.isEnPassantTargetSquareValid(enPassantTargetSquare as EnPassantTargetSquares, standardChess.chessBoardView))
            throw new Error("En passant target square not valid");

        const oppositePlayer = playerToMove === "w" ? Color.Black : Color.White;
        const isOppositePlayerInCheck: boolean = standardChess.isInCheck(oppositePlayer, false);
        if (isOppositePlayerInCheck)
            throw new Error("Player that isn't playing is in check");

        // checking if player on move has any safe squares
        const safeSquares = standardChess.safeSquares;
        if (!safeSquares.size)
            throw new Error("Player doesn't have any safe squares");

        return true;
    }

    public convertBoardToFEN(
        board: (Piece | null)[][],
        boardView: (FENChar | null)[][],
        playerColor: Color,
        lastMove: LastMove | undefined,
        fiftyMoveRuleCounter: number,
        numberOfFullMoves: number
    ): string {
        let FEN: string = this.convertBoardPositionToFEN(boardView);
        const currentPlayer: string = playerColor === Color.White ? "w" : "b";
        const castlingAvailability: string = this.castlingAvailabilty(board);
        const enPassantPossibility: string = this.enPassantPossibility(lastMove, playerColor);

        FEN += " " + currentPlayer;
        FEN += " " + castlingAvailability;
        FEN += " " + enPassantPossibility;
        FEN += " " + fiftyMoveRuleCounter * 2;
        FEN += " " + numberOfFullMoves;
        return FEN;
    }

    // converting first part
    public convertBoardPositionToFEN(board: (FENChar | null)[][]) {
        let FENFirstPart: string = "";

        // need to loop backwards because fen represent board starting from 8th row
        for (let i = 7; i >= 0; i--) {
            let FENRow: string = ""
            let consecutiveEmptySquaresCounter = 0;

            for (const piece of board[i]) {
                if (!piece) {
                    consecutiveEmptySquaresCounter++;
                    continue;
                }

                if (consecutiveEmptySquaresCounter !== 0)
                    FENRow += String(consecutiveEmptySquaresCounter);

                consecutiveEmptySquaresCounter = 0;
                let pieceChar: string = piece;
                FENRow += pieceChar
            }

            if (consecutiveEmptySquaresCounter !== 0)
                FENRow += String(consecutiveEmptySquaresCounter);

            FENFirstPart += (i === 0) ? FENRow : FENRow + "/";
        }
        return FENFirstPart;
    }

    private castlingAvailabilty(board: (Piece | null)[][]): string {
        const castlingPossibilites = (color: Color): string => {
            let castlingAvailability: string = "";

            const kingPositionX: number = color === Color.White ? 0 : 7;
            const king = board[kingPositionX][4]

            if (king instanceof King && !king.hasMoved) {
                const rookPositionX = color === Color.White ? 0 : 7;
                const kingSideRook = board[rookPositionX][7];
                const queenSideRook = board[rookPositionX][0];

                if (kingSideRook instanceof Rook && !kingSideRook.hasMoved)
                    castlingAvailability += "k";

                if (queenSideRook instanceof Rook && !queenSideRook.hasMoved)
                    castlingAvailability += "q";

                if (color === Color.White) castlingAvailability = castlingAvailability.toUpperCase();
            }
            return castlingAvailability;
        }

        let castlingAvailability: string = castlingPossibilites(Color.White) + castlingPossibilites(Color.Black);
        return castlingAvailability !== "" ? castlingAvailability : "-";
    }

    private enPassantPossibility(lastMove: LastMove | undefined, playerColor: Color): string {
        if (!lastMove) return "-";
        const { piece, currX: newX, prevX, prevY } = lastMove;
        if (piece instanceof Pawn && Math.abs(newX - prevX) === 2) {
            const row: number = playerColor === Color.White ? 6 : 3;
            return columns[prevY].toLowerCase() + String(row);
        }
        return "-";
    }

    public convertFENtoBoard(FEN: string):
        [(Piece | null)[][], Color, LastMove | undefined, number, number] {
        const [boardPosition, playerToMove, castlingAvailability, enPassantTargetSquare, HalfMoveClock, FullMoveNumber] = FEN.split(" ");
        const rows = boardPosition.split("/").reverse();

        // na osnovu enPassantTargetSquare ce da odredis lastMove
        const board: (Piece | null)[][] = []

        for (let x = 0; x < 8; x++) {
            const boardRow: (Piece | null)[] = [];
            let pieceY: number = 0;

            for (let y = 0; y < rows[x].length; y++) {
                const square: string = rows[x][y];
                if (this.isNumber(square)) {
                    const emptySquaresNum: number = Number(square);
                    boardRow.push(...Array(emptySquaresNum).fill(0).map(() => null));
                    pieceY += emptySquaresNum;
                    continue;
                }

                let piece: Piece;

                if (square === FENChar.BlackPawn) piece = new Pawn(Color.Black);
                else if (square === FENChar.BlackKnight) piece = new Knight(Color.Black);
                else if (square === FENChar.BlackBishop) piece = new Bishop(Color.Black);
                else if (square === FENChar.BlackRook) piece = new Rook(Color.Black);
                else if (square === FENChar.BlackQueen) piece = new Queen(Color.Black);
                else if (square === FENChar.BlackKing) piece = new King(Color.Black);
                else if (square === FENChar.WhitePawn) piece = new Pawn(Color.White);
                else if (square === FENChar.WhiteKnight) piece = new Knight(Color.White);
                else if (square === FENChar.WhiteRook) piece = new Rook(Color.White);
                else if (square === FENChar.WhiteBishop) piece = new Bishop(Color.White);
                else if (square === FENChar.WhiteQueen) piece = new Queen(Color.White);
                else piece = new King(Color.White);

                if (piece instanceof Pawn && (piece.color === Color.White && x !== 1 || piece.color === Color.Black && x !== 6))
                    piece.hasMoved = true;

                else if (piece instanceof Rook || piece instanceof King)
                    this.markIfKingOrRookMoved(piece, x, pieceY, castlingAvailability);

                pieceY++;
                boardRow.push(piece);
            }

            board.push(boardRow);
        }

        // last move is only valid in case that en passant target square exists
        let lastMove: LastMove | undefined;
        if (enPassantTargetSquare !== "-") {
            const file: string = enPassantTargetSquare.charAt(0);
            const rank: string = enPassantTargetSquare.charAt(1);
            const isWhite: boolean = rank === "3";
            const y: number = file.charCodeAt(0) - "a".charCodeAt(0);

            lastMove = {
                piece: board[isWhite ? 3 : 4][y]!,
                prevX: isWhite ? 1 : 6,
                prevY: y,
                currX: isWhite ? 3 : 4,
                currY: y,
                moveType: new Set<Behavior>([Behavior.BasicMove])
            };
        }
        return [
            board,
            playerToMove === "w" ? Color.White : Color.Black,
            lastMove,
            Number(HalfMoveClock),
            Number(FullMoveNumber)
        ];
    }

    private markIfKingOrRookMoved(piece: Rook | King, x: number, y: number, castlingAvailability: string): void {
        if (piece instanceof King) {
            const isKingOnSamePlace: boolean = (piece.color === Color.White && x === 0 && y === 4) || (x === 7 && y === 4);
            const notAllowedToCastle: boolean = piece.color === Color.White ?
                castlingAvailability === "-" || castlingAvailability === "kq" || castlingAvailability === "k" || castlingAvailability === "q" :
                castlingAvailability === "-" || castlingAvailability === "KQ" || castlingAvailability === "K" || castlingAvailability === "Q";

            if (!isKingOnSamePlace || notAllowedToCastle) piece.hasMoved = true;
        }
        else {
            if (piece.color === Color.White) {
                const isQueenSideRook: boolean = x === 0 && y === 0;
                const isKingSideRook: boolean = x === 0 && y === 7;

                if (!isQueenSideRook && !isKingSideRook) piece.hasMoved = true;

                else if (isQueenSideRook && !castlingAvailability.includes("Q")) piece.hasMoved = true;

                else if (isKingSideRook && !castlingAvailability.includes("K")) piece.hasMoved = true;
            }
            else {
                const isQueenSideRook: boolean = x === 7 && y === 0;
                const isKingSideRook: boolean = x === 7 && y === 7;

                if (!isQueenSideRook && !isKingSideRook) piece.hasMoved = true;

                else if (isQueenSideRook && !castlingAvailability.includes("q")) piece.hasMoved = true;

                else if (isKingSideRook && !castlingAvailability.includes("k")) piece.hasMoved = true;
            }
        }
    }

    // en passant target square is considered valid if:
    // 1) white pawn is on 4th rank, and there is no piece on 3rd and 2nd rank on the same file
    // 2) black pawn is on 5th rank, and there is no piece on 6th and 7th rank on the same file
    // there is no checking if move is valid, just in case that move is happend (not if the move is safe or whatsoever)
    // cekiraj poziciju kad je en passant jedini safe square
    // treba i ovo da istestiram
    private isEnPassantTargetSquareValid(enPassantTargetSquare: EnPassantTargetSquares, board: (FENChar | null)[][]): boolean {
        if (enPassantTargetSquare === "-") return true;

        const file: string = enPassantTargetSquare.charAt(0);
        const rank: string = enPassantTargetSquare.charAt(1);
        const y: number = file.charCodeAt(0) - "a".charCodeAt(0);
        const isWhite: boolean = rank === "3";

        const pawn = board[isWhite ? 3 : 4][y];
        const isPawn: boolean = pawn === FENChar.WhitePawn && isWhite || pawn === FENChar.BlackPawn && !isWhite;
        const isPawnPrevSquareEmpty: boolean = board[isWhite ? 2 : 5][y] === null;
        const isPawnInitalSquareEmpty: boolean = board[isWhite ? 1 : 6][y] === null;

        return isPawn && isPawnPrevSquareEmpty && isPawnInitalSquareEmpty;
    }

    // ovo samo sluzi da da mogucnost igranja en passant, u smislu setovanja lastMove kod FEN, medjutim
    // ne garantuje da je taj potez validan
    public generatingPossibleEnPassantTargetSquares(board: (FENChar | null)[][], player: "w" | "b"): EnPassantTargetSquares[] {
        // ukoliko je player === "w" to znaci da treba da pretrazujemo (5ti red po sahovskoj notaciji) i trazimo sve pesake
        // crne boje, koje za svoje susede sa leve i desne strane imaju makar jednog pesaka koji je bele boje,
        // i isto to samo za 3. red vazi kada gledamo za crnog igraca

        const rank: number = player === "w" ? 4 : 3;
        const enPassantTargetSquares: EnPassantTargetSquares[] = [];

        for (let i = 0; i < 8; i++) {
            const currPiece = board[rank][i];

            const pieceFromLeft = i - 1 >= 0 ? board[rank][i - 1] : null;
            const pieceFromRight = i + 1 <= 7 ? board[rank][i + 1] : null;
            const isPawnPrevSquareEmpty = board[player === "w" ? 5 : 2][i] === null;
            const isPawnInitalSquareEmpty = board[player === "w" ? 6 : 1][i] === null;

            if (!isPawnPrevSquareEmpty || !isPawnInitalSquareEmpty) continue;

            const currPlayerPawn = player === "w" ? FENChar.WhitePawn : FENChar.BlackPawn;
            const hasPawnNeighbour = pieceFromLeft === currPlayerPawn || pieceFromRight === currPlayerPawn;

            if (player === "w" && currPiece === FENChar.BlackPawn && hasPawnNeighbour)
                enPassantTargetSquares.push((columns[i] + "6") as EnPassantTargetSquares);

            else if (player === "b" && currPiece === FENChar.WhitePawn && hasPawnNeighbour)
                enPassantTargetSquares.push((columns[i] + "3") as EnPassantTargetSquares);
        };
        return enPassantTargetSquares;
    }
}