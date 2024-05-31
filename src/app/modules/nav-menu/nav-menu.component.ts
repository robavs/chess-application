import { Component } from '@angular/core';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatButtonModule } from '@angular/material/button';
import { MatMenuModule } from '@angular/material/menu';
import { MatIconModule } from '@angular/material/icon';
import { MatGridListModule } from '@angular/material/grid-list';
import { RouterModule } from '@angular/router';
import { CommonModule } from '@angular/common';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { FENConverter } from 'src/app/models/FENConverter/FENConverter';
import { PlayAgainstComputerDialogComponent } from '../play-against-computer-dialog/play-against-computer-dialog.component';

@Component({
  selector: 'nav-menu',
  templateUrl: './nav-menu.component.html',
  styleUrls: ['./nav-menu.component.css'],
  standalone: true,
  imports: [MatToolbarModule, MatButtonModule, MatMenuModule, MatIconModule, MatGridListModule, RouterModule, CommonModule, MatDialogModule]
})
export class NavMenuComponent {
  constructor(
    public dialog: MatDialog,
  ) { }

  public playAgainstComputer(): void {
    this.dialog.open(PlayAgainstComputerDialogComponent, {
      data: {
        FEN: FENConverter.initalFENPosition
      }
    });
  }
}
