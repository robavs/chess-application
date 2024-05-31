import { Component, Inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatDividerModule } from '@angular/material/divider';
import { CommonModule } from '@angular/common';
import { Color } from 'src/app/models/models';
import { Router } from '@angular/router';
import { ComputerConfgiuration } from '../computer-mode/models';
import { ChessBoardService } from '../chess-board/chess-board.service';
import { StockfishService } from '../computer-mode/computer-mode.service';

export interface MatDialogData {
  FEN: string
}

@Component({
  selector: 'play-against-computer-dialog',
  templateUrl: './play-against-computer-dialog.component.html',
  styleUrls: ['./play-against-computer-dialog.component.css'],
  standalone: true,
  imports: [MatDialogModule, MatButtonModule, MatDividerModule, CommonModule],
})
export class PlayAgainstComputerDialogComponent {
  public stockfishLevels: readonly number[] = [1, 2, 3, 4, 5];
  public stockfishLevel: number = 1;

  constructor(
    private stockfishService: StockfishService,
    private chessBoardService: ChessBoardService,
    private router: Router,
    private dialog: MatDialog,
    @Inject(MAT_DIALOG_DATA) public data: MatDialogData
  ) { }

  public chooseStockfishLevel(level: number): void {
    this.stockfishLevel = level;
  }

  public play(player: "w" | "b"): void {
    this.dialog.closeAll();
    const computerConfiguration: ComputerConfgiuration = {
      color: player === "w" ? Color.Black : Color.White,
      level: this.stockfishLevel
    };
    this.stockfishService.computerConfiguration$.next(computerConfiguration);
    this.chessBoardService.chessGameConfiguration$.next(this.data.FEN);
    this.router.navigate(["against-computer"]);
  }

  public cancelPlayingAgainstComputer(): void {
    this.router.navigate(["against-friend"]);
  }
}
