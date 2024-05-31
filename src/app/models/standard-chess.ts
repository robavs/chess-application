import { MoveType, CheckState, Color, Coords, FENChar, GameHistory, LastMove, MoveList, PositionDescription, SafeSquares, columns } from "./models";
import { FENConverter } from "./FENConverter/FENConverter";
import { Piece, Pawn, Knight, Bishop, Rook, Queen, King } from "./Pieces";

// this model should be extensible, so it would be easy to add different game variants
// such as King of the hill, Crazy House
export class ChessBoard {
    // generalno da vidim gde sve treba da se ubaci getter;
    private readonly chessBoardSize: number = 8;
    private chessBoard: (Piece | null)[][];
    private _playerColor: Color = Color.White;

    private _safeSquares: SafeSquares = new Map<string, Coords[]>();
    private _lastMove: LastMove | undefined;
    private _checkState: CheckState = { isCheck: false };
    private _moveList: MoveList = [];
    private _gameHistory: GameHistory;

    private _isGameOver: boolean = false;
    private _gameOverMessage: string | undefined;

    private threeFoldRepetitionDictionary = new Map<string, number>();
    private threeFoldRepetitionFlag: boolean = false;
    private fiftyMoveRuleCounter = 0;

    // FEN properties
    private FENConverter: FENConverter;
    private numberOfFullMoves: number = 1;
    private _boardAsFEN: string = FENConverter.initalFENPosition;

    constructor() {
        this.chessBoard = [
            [
                new Rook(Color.White), new Knight(Color.White), new Bishop(Color.White), new Queen(Color.White),
                new King(Color.White), new Bishop(Color.White), new Knight(Color.White), new Rook(Color.White)
            ],
            [
                new Pawn(Color.White), new Pawn(Color.White), new Pawn(Color.White), new Pawn(Color.White),
                new Pawn(Color.White), new Pawn(Color.White), new Pawn(Color.White), new Pawn(Color.White)
            ],
            [null, null, null, null, null, null, null, null],
            [null, null, null, null, null, null, null, null],
            [null, null, null, null, null, null, null, null],
            [null, null, null, null, null, null, null, null],
            [
                new Pawn(Color.Black), new Pawn(Color.Black), new Pawn(Color.Black), new Pawn(Color.Black),
                new Pawn(Color.Black), new Pawn(Color.Black), new Pawn(Color.Black), new Pawn(Color.Black)
            ],
            [
                new Rook(Color.Black), new Knight(Color.Black), new Bishop(Color.Black), new Queen(Color.Black),
                new King(Color.Black), new Bishop(Color.Black), new Knight(Color.Black), new Rook(Color.Black)
            ]
        ];
        this.FENConverter = new FENConverter();
        this._safeSquares = this.findSafeSquares();
        this._gameHistory = [{ board: this.chessBoardView, lastMove: this._lastMove, checkState: this._checkState, FEN: FENConverter.initalFENPosition }];
        // this.threeFoldRepetitionDictionary.set(FENConverter.initalFENPosition, 1);
    }

    //-------------------------------- GETTERS FOR PROPERTIES --------------------------------

    public get playerColor(): Color {
        return this._playerColor;
    }

    public get chessBoardView(): (FENChar | null)[][] {
        return this.chessBoard.map(row => row.map(piece => {
            return piece instanceof Piece ? piece.FENChar : null;
        }));
    }

    public get safeSquares(): SafeSquares {
        return this._safeSquares;
    }

    public get gameOverMessage(): string | undefined {
        return this._gameOverMessage;
    }

    public get isGameOver(): boolean {
        return this._isGameOver;
    }

    public get moveList(): MoveList {
        return this._moveList;
    }

    public get lastMove(): LastMove | undefined {
        return this._lastMove;
    }

    public get checkState(): CheckState {
        return this._checkState;
    }

    public get gameHistory(): GameHistory {
        return this._gameHistory;
    }

    public set moveList(moveList: MoveList) {
        this._moveList = moveList;
    }

    public get boardAsFEN(): string {
        return this._boardAsFEN;
    }

    private areCoordsValid(x: number, y: number): boolean {
        return x >= 0 && y >= 0 && x < this.chessBoardSize && y < this.chessBoardSize;
    }

    //-------------------------------- FUNCTIONS FOR CACLUCALTING SAFE SQUARES, AND DETRMING IF POSITION IS IN CHECK --------------------------------

    private isPositionSafeAfterMove(prevX: number, prevY: number, newX: number, newY: number): boolean {
        const piece: Piece | null = this.chessBoard[prevX][prevY];
        if (!piece) return false;

        const newPiece: Piece | null = this.chessBoard[newX][newY];
        // cant put your piece on square with piece of your color
        if (newPiece && newPiece.color === piece.color) return false;

        // simulate new position
        this.chessBoard[newX][newY] = piece;
        this.chessBoard[prevX][prevY] = null;

        const isPlayerInCheckAfterMovingPiece: boolean = this.isInCheck(piece.color, false);

        // reset position back
        this.chessBoard[prevX][prevY] = piece;
        this.chessBoard[newX][newY] = newPiece;

        return !isPlayerInCheckAfterMovingPiece;
    }

    // function that checks if the player is in check
    // i ovo mi se ne svidja sto postavlja stanje checkState, moracu to da vidim da handle
    public isInCheck(playerColor: Color, checkingCurrentPosition: boolean): boolean {
        for (let x = 0; x < this.chessBoardSize; x++) {
            for (let y = 0; y < this.chessBoardSize; y++) {
                const piece = this.chessBoard[x][y];

                if (!piece || piece.color === playerColor) continue;

                for (const { x: dx, y: dy } of piece.directions) {
                    let newX = x + dx;
                    let newY = y + dy;
                    if (!this.areCoordsValid(newX, newY)) continue;

                    if (piece instanceof Pawn || piece instanceof Knight || piece instanceof King) {
                        // pawn is not attacking straight
                        if (piece instanceof Pawn && dy === 0) continue;

                        const attackedPiece = this.chessBoard[newX][newY];
                        if (attackedPiece instanceof King && attackedPiece.color === playerColor) {
                            if (checkingCurrentPosition)
                                this._checkState = { isCheck: true, x: newX, y: newY };
                            return true;
                        }
                    }
                    else {
                        while (this.areCoordsValid(newX, newY)) {
                            const attackedPiece: Piece | null = this.chessBoard[newX][newY];
                            if (attackedPiece instanceof King && attackedPiece.color === playerColor) {
                                if (checkingCurrentPosition)
                                    this._checkState = { isCheck: true, x: newX, y: newY };
                                return true;
                            }

                            if (attackedPiece) break;

                            newX += dx;
                            newY += dy;
                        }
                    }
                }
            }
        }
        if (checkingCurrentPosition) this._checkState = { isCheck: false };
        return false;
    }

    private canCastle(king: King, kingSideCastle: boolean): boolean {
        if (king.hasMoved) return false;

        const kingPositionX: number = king.color === Color.White ? 0 : 7;
        const kingPositionY: number = 4;
        const rookPositionX: number = kingPositionX;
        const rookPositionY: number = kingSideCastle ? 7 : 0;
        const rook: Piece | null = this.chessBoard[rookPositionX][rookPositionY];

        if (!(rook instanceof Rook) || rook.hasMoved || this._checkState.isCheck) return false;

        // treba da promenim ime ovim promenljivima
        const firstNextKingPositionY: number = kingPositionY + (kingSideCastle ? 1 : -1);
        const secondNextKingPositionY: number = kingPositionY + (kingSideCastle ? 2 : -2);

        if (this.chessBoard[kingPositionX][firstNextKingPositionY] ||
            this.chessBoard[kingPositionX][secondNextKingPositionY])
            return false;

        if (!kingSideCastle && this.chessBoard[kingPositionX][1])
            return false;

        return this.isPositionSafeAfterMove(kingPositionX, kingPositionY, kingPositionX, firstNextKingPositionY) &&
            this.isPositionSafeAfterMove(kingPositionX, kingPositionY, kingPositionX, secondNextKingPositionY);
    }

    // mora deskrminisuca unija za lastMove
    private canCaptureEnPassant(pawn: Pawn, pawnX: number, pawnY: number): boolean {
        if (!this._lastMove) return false;
        const { piece, prevX, currX, currY } = this._lastMove;

        if (
            !(piece instanceof Pawn) ||
            pawn.color !== this._playerColor ||
            Math.abs(currX - prevX) !== 2 ||
            pawnX !== currX ||
            Math.abs(pawnY - currY) !== 1
        ) {
            return false;
        }

        const pawnNewX: number = pawnX + (pawn.color === Color.White ? 1 : -1);
        const pawnNewY: number = currY;

        this.chessBoard[currX][currY] = null;
        const isPositionSafe: boolean = this.isPositionSafeAfterMove(pawnX, pawnY, pawnNewX, pawnNewY);
        this.chessBoard[currX][currY] = piece;

        return isPositionSafe;
    }

    private findSafeSquares(): SafeSquares {
        const safeSquares: SafeSquares = new Map<string, Coords[]>();

        for (let x = 0; x < this.chessBoardSize; x++) {
            for (let y = 0; y < this.chessBoardSize; y++) {
                const piece: Piece | null = this.chessBoard[x][y];
                if (!piece || piece.color !== this._playerColor) continue;

                const pieceSafeSquares: Coords[] = [];
                for (const { x: dx, y: dy } of piece.directions) {
                    let newX = x + dx;
                    let newY = y + dy;

                    if (!this.areCoordsValid(newX, newY)) continue;

                    let newPiece: Piece | null = this.chessBoard[newX][newY];
                    if (newPiece && newPiece.color === piece.color) continue;

                    if (piece instanceof Pawn) {
                        // cant move pawn two squares straight if there is piece infront of him
                        if (dx == 2 || dx == -2) {
                            if (newPiece) continue;
                            if (this.chessBoard[newX + (dx === 2 ? -1 : 1)][newY]) continue;
                        }

                        // cant move pawn one square straight if piece is infront of him
                        if ((dx === 1 || dx === -1) && dy === 0 && newPiece) continue;

                        // prevent pawn from going diagonally if there is not piece, or newPiece has same color
                        if ((dy == 1 || dy == -1) && (!newPiece || piece.color === newPiece.color)) continue;
                    }

                    if (piece instanceof Pawn || piece instanceof Knight || piece instanceof King) {
                        if (this.isPositionSafeAfterMove(x, y, newX, newY))
                            pieceSafeSquares.push({ x: newX, y: newY });
                    }
                    else {
                        while (this.areCoordsValid(newX, newY)) {
                            newPiece = this.chessBoard[newX][newY];
                            // can't put piece on square where is our piece
                            if (newPiece && newPiece.color == piece.color) break;

                            if (this.isPositionSafeAfterMove(x, y, newX, newY)) pieceSafeSquares.push({ x: newX, y: newY });

                            // we cant go after we found safe square that has piece with different color
                            if (newPiece) break;

                            newX += dx;
                            newY += dy;
                        }
                    }
                }

                // checking for special moves
                if (piece instanceof King) {
                    if (this.canCastle(piece, true))
                        pieceSafeSquares.push({ x, y: 6 });

                    if (this.canCastle(piece, false))
                        pieceSafeSquares.push({ x, y: 2 });
                }

                else if (piece instanceof Pawn && this.canCaptureEnPassant(piece, x, y))
                    pieceSafeSquares.push({ x: x + (piece.color === Color.White ? 1 : -1), y: this._lastMove!.prevY });

                if (pieceSafeSquares.length)
                    safeSquares.set(x + "," + y, pieceSafeSquares);
            }
        }
        return safeSquares;
    }

    // MOVE PIECE, AND UPDATING ALL NECESSARY PROPERITES AFTER MOVE IS PLAYED
    public move(prevX: number, prevY: number, newX: number, newY: number, promotedPieceType: FENChar | null): void {
        if (!this.areCoordsValid(prevX, prevY) || !this.areCoordsValid(newX, newY)) return;

        const piece: Piece | null = this.chessBoard[prevX][prevY];
        if (!piece || piece.color !== this._playerColor) return;

        const pieceSafeSquares: Coords[] | undefined = this.safeSquares.get(prevX + "," + prevY);

        if (!pieceSafeSquares || !pieceSafeSquares.find(({ x, y }) => x === newX && y === newY))
            throw Error(`Square is not safe ${prevX}, ${prevY}, ${newX}, ${newY}, ${piece}`)

        if ((piece instanceof Pawn || piece instanceof Rook || piece instanceof King) && !piece.hasMoved)
            piece.hasMoved = true;

        let moveType = new Set<MoveType>();
        const newSquarePiece: Piece | null = this.chessBoard[newX][newY];
        if (newSquarePiece) moveType.add(MoveType.Capture);

        this.handlingSpecialMoves(piece, prevX, prevY, newX, newY, moveType);

        // Fifty Move Rule update
        if (piece instanceof Pawn || newSquarePiece) this.fiftyMoveRuleCounter = 0;
        else this.fiftyMoveRuleCounter += 0.5;

        // update board for promotion
        if (promotedPieceType) {
            this.chessBoard[newX][newY] = this.promotedPiece(promotedPieceType);
            moveType.add(MoveType.Promotion);
        }
        else this.chessBoard[newX][newY] = piece;

        this.chessBoard[prevX][prevY] = null;

        this._playerColor = this._playerColor === Color.White ? Color.Black : Color.White;
        this._lastMove = { piece, prevX, prevY, currX: newX, currY: newY, moveType: moveType };
        this.isInCheck(this._playerColor, true);

        // needed to calculate safeSquares for next move, in order to see if check or checkmate happens
        const safeSquares: SafeSquares = this.findSafeSquares();
        if (this._checkState.isCheck)
            moveType.add(!safeSquares.size ? MoveType.CheckMate : MoveType.Check);

        else if (!moveType.size) moveType.add(MoveType.BasicMove);

        this.storeMove(promotedPieceType);
        this.updateGameHistory();

        this._safeSquares = safeSquares;
        if (this._playerColor === Color.White) this.numberOfFullMoves++;

        this._boardAsFEN = this.FENConverter.convertBoardToFEN(this.chessBoard, this.chessBoardView, this._playerColor, this._lastMove, this.fiftyMoveRuleCounter, this.numberOfFullMoves);
        this.updateThreeFoldRepetitionDictionary(this._boardAsFEN);
        this._isGameOver = this.isGameFinished();
    }

    private updateThreeFoldRepetitionDictionary(FEN: string): void {
        const threeFoldRepetitionFENKey: string = FEN.split(" ").slice(0, 4).join("");
        const threeFoldRepetitionValue: number | undefined = this.threeFoldRepetitionDictionary.get(threeFoldRepetitionFENKey);

        if (threeFoldRepetitionValue === undefined) {
            this.threeFoldRepetitionDictionary.set(threeFoldRepetitionFENKey, 1);
        }
        else {
            if (threeFoldRepetitionValue === 2) this.threeFoldRepetitionFlag = true;
            this.threeFoldRepetitionDictionary.set(threeFoldRepetitionFENKey, threeFoldRepetitionValue + 1);
        }
    }

    //-------------------------------- SPECIAL MOVES FUNCTIONS --------------------------------
    private handlingSpecialMoves(
        piece: Piece, prevX: number, prevY: number, newX: number, newY: number, moveType: Set<MoveType>
    ): void {
        // castling
        if (piece instanceof King && Math.abs(newY - prevY) === 2) {
            //newY > piece.Y represents king side castling

            const rookPoistionX: number = prevX;
            const rookPositionY: number = newY > prevY ? 7 : 0;
            const rook = this.chessBoard[rookPoistionX][rookPositionY] as Rook;
            const rookNewY: number = newY > prevY ? 5 : 3;
            this.chessBoard[rookPoistionX][rookPositionY] = null;
            this.chessBoard[rookPoistionX][rookNewY] = rook;
            rook.hasMoved = true;
            moveType.add(MoveType.Castling);
        }

        // en passant special move
        else if (
            piece instanceof Pawn &&
            this._lastMove &&
            this._lastMove.piece instanceof Pawn &&
            Math.abs(this._lastMove.currX - this._lastMove.prevX) === 2 &&
            prevX === this._lastMove.currX &&
            newY === this._lastMove.currY
        ) {
            this.chessBoard[this._lastMove.currX][this._lastMove.currY] = null;
            moveType.add(MoveType.Capture);
        }
    }

    // handling promotion
    private promotedPiece(promotedPieceType: FENChar): Knight | Bishop | Rook | Queen {
        if (promotedPieceType === FENChar.WhiteKnight || promotedPieceType === FENChar.BlackKnight)
            return new Knight(this._playerColor);

        if (promotedPieceType === FENChar.WhiteBishop || promotedPieceType === FENChar.BlackBishop)
            return new Bishop(this._playerColor);

        if (promotedPieceType === FENChar.WhiteRook || promotedPieceType === FENChar.BlackRook)
            return new Rook(this._playerColor);

        return new Queen(this._playerColor);
    }

    //-------------------------------- CHECKING FOR INSUFFICIENT MATERIAL SITUATION --------------------------------

    // helper functions to dertmine if insufficientMaterial is happening
    private isSquareDark(x: number, y: number): boolean {
        return x % 2 === 0 && y % 2 === 0 || x % 2 === 1 && y % 2 === 1;
    }

    private playerHasOnlyTwoKnightsAndKing(pieces: { piece: Piece, x: number, y: number }[]): boolean {
        return pieces.filter(piece => piece.piece instanceof Knight).length === 2;
    }

    private playerHasOnlyBishopsWithSameColorAndKing(pieces: { piece: Piece, x: number, y: number }[]): boolean {
        const bishops = pieces.filter(piece => piece.piece instanceof Bishop);
        const areAllBishopsOfSameColor = new Set(bishops.map(bishop => this.isSquareDark(bishop.x, bishop.y))).size === 1;
        return bishops.length === pieces.length - 1 && areAllBishopsOfSameColor;
    }

    private insufficientMaterial(): boolean {
        const whitePieces: { piece: Piece, x: number, y: number }[] = [];
        const blackPieces: { piece: Piece, x: number, y: number }[] = [];

        for (let x = 0; x < this.chessBoardSize; x++) {
            for (let y = 0; y < this.chessBoardSize; y++) {
                const piece: Piece | null = this.chessBoard[x][y];
                if (!piece) continue;

                if (piece.color === Color.White) whitePieces.push({ piece, x, y });
                else blackPieces.push({ piece, x, y });
            }
        }

        if (whitePieces.length === 1 && blackPieces.length === 1)
            return true;

        // King and Minor Piece vs King
        if (whitePieces.length === 1 && blackPieces.length === 2)
            return blackPieces.some(piece => piece.piece instanceof Knight || piece.piece instanceof Bishop);

        else if (whitePieces.length === 2 && blackPieces.length === 1)
            return whitePieces.some(piece => piece.piece instanceof Knight || piece.piece instanceof Bishop);

        // both sides have bishop of same color
        else if (whitePieces.length === 2 && blackPieces.length === 2) {
            const whiteBishop = whitePieces.find(piece => piece.piece instanceof Bishop);
            const blackBishop = blackPieces.find(piece => piece.piece instanceof Bishop);

            if (whiteBishop && blackBishop) {
                const areBishopsOfSameColor: boolean = this.isSquareDark(whiteBishop.x, whiteBishop.y) && this.isSquareDark(blackBishop.x, blackBishop.y) ||
                    !this.isSquareDark(whiteBishop.x, whiteBishop.y) && !this.isSquareDark(blackBishop.x, blackBishop.y);

                if (areBishopsOfSameColor) return true;
            }
        }

        if (whitePieces.length === 3 && blackPieces.length === 1 && this.playerHasOnlyTwoKnightsAndKing(whitePieces) ||
            whitePieces.length === 1 && blackPieces.length === 3 && this.playerHasOnlyTwoKnightsAndKing(blackPieces)
        ) return true;

        if (whitePieces.length >= 3 && blackPieces.length === 1 && this.playerHasOnlyBishopsWithSameColorAndKing(whitePieces) ||
            whitePieces.length === 1 && blackPieces.length >= 3 && this.playerHasOnlyBishopsWithSameColorAndKing(blackPieces)
        ) return true;

        return false;
    }

    private isGameFinished(): boolean {
        if (this.insufficientMaterial()) {
            this._gameOverMessage = "Draw due insufficient material";
            return true;
        }

        if (!this._safeSquares.size) {
            // ovo garant moze bez ovog poziva nego ce imas propery koji to prati, upravo zbog kralja
            if (this._checkState.isCheck) {
                const previousPlayer = this._playerColor === Color.White ? "Black" : "White";
                this._gameOverMessage = previousPlayer + " won by checkmate";
            }
            else this._gameOverMessage = "Stalemate";
            return true;
        }

        if (this.threeFoldRepetitionFlag) {
            this._gameOverMessage = "Draw due three fold repetion rule";
            return true;
        }

        if (this.fiftyMoveRuleCounter === 50) {
            this._gameOverMessage = "Draw due 50 move rule!";
            return true;
        }

        return false;
    }

    //-------------------------------- STORE MOVE IN SHORT ALGEBARIC NOTATION --------------------------------

    private storeMove(promotedPieceType: FENChar | null): void {
        const { piece, prevY, currX, currY, moveType: moveType } = this._lastMove!;
        let pieceName: string = !(piece instanceof Pawn) ? piece.FENChar.toUpperCase() : "";
        let move: string;

        // store castling move
        if (moveType.has(MoveType.Castling))
            move = currY - prevY === 2 ? "O-O" : "O-O-O";
        else {
            move = pieceName + this.startingPieceCoordsNotation();
            // when pawn captures we need to include its previous rank(row)
            // because pawn doesnt have its name in notation
            if (moveType.has(MoveType.Capture))
                move += (piece instanceof Pawn) ? columns[prevY] + "x" : "x";
            move += columns[currY] + String(currX + 1);

            if (promotedPieceType)
                move += "=" + promotedPieceType.toUpperCase();
        }

        if (moveType.has(MoveType.Check)) move += "+";
        else if (moveType.has(MoveType.CheckMate)) move += "#";

        if (!this._moveList[this.numberOfFullMoves - 1])
            this._moveList[this.numberOfFullMoves - 1] = [move];
        else
            this._moveList[this.numberOfFullMoves - 1].push(move);
    }

    // need to dermine which piece goes to next square in case that multiple same type pieces could go
    private startingPieceCoordsNotation(): string {
        const { piece: currPiece, prevX, prevY, currX, currY } = this._lastMove!;
        if (currPiece instanceof King || currPiece instanceof Pawn) return "";

        const samePiecesCoords: Coords[] = [{ x: prevX, y: prevY }];
        // determine which same type pieces have same target square as piece that just made a move
        for (let x = 0; x < this.chessBoardSize; x++) {
            for (let y = 0; y < this.chessBoardSize; y++) {
                const piece: Piece | null = this.chessBoard[x][y];
                if (!piece) continue;

                if (piece.FENChar === currPiece.FENChar && (currX !== x || currY !== y)) {
                    const safeSquares: Coords[] | undefined = this._safeSquares.get(x + "," + y);
                    const pieceHasSameTargetSquare: boolean | undefined = safeSquares?.some(coords => coords.x === currX && coords.y === currY);
                    if (pieceHasSameTargetSquare) samePiecesCoords.push({ x, y });
                }
            }
        }

        if (samePiecesCoords.length === 1) return "";

        const piecesFile = new Set(samePiecesCoords.map(coords => coords.y));
        const piecesRank = new Set(samePiecesCoords.map(coords => coords.x));

        // means that all of the pieces are on different files (a, b, c, ...)
        if (piecesFile.size === samePiecesCoords.length)
            return columns[prevY];

        // means that all of the pieces are on different rank (1, 2, 3, ...)
        if (piecesRank.size === samePiecesCoords.length)
            return String(prevX + 1);

        // happens when you have three or more pieces, so that you can detrmine becuse it may happen that there are/is a piece/s that shares
        // same rank with piece that just made a move, and also there is/are piece/s whose sharing same rank
        return columns[prevY] + String(prevX + 1);
    }

    private updateGameHistory(): void {
        const chessBoardView: (FENChar | null)[][] = [...this.chessBoardView.map(row => [...row])];
        const lastMove: LastMove | undefined = this._lastMove ? { ...this._lastMove } : undefined;
        const checkState: CheckState = { ...this._checkState };
        const position: PositionDescription = { board: chessBoardView, lastMove, checkState, FEN: this._boardAsFEN };
        this._gameHistory.push(position);
    }

    //-------------------------------- FUNCTION WHICH IS USED TO CREATE NEW GAME FROM GIVEN FEN --------------------------------
    public convertFENToBoard(FEN: string): void {
        [this.chessBoard, this._playerColor, this._lastMove, this.fiftyMoveRuleCounter, this.numberOfFullMoves] = this.FENConverter.convertFENtoBoard(FEN);
        // need to recalculate safeSquares if game is started from FEN
        this._boardAsFEN = FEN;
        this._safeSquares = this.findSafeSquares();
        this.isInCheck(this._playerColor, true);
        this.updateThreeFoldRepetitionDictionary(FEN);

        this._gameHistory = [];
        this.updateGameHistory();
    }
}