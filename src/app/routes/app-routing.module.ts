import { NgModule } from "@angular/core";
import { RouterModule, Routes } from '@angular/router'
import { ChessBoardComponent } from "../modules/chess-board/chess-board.component";
import { ComputerModeComponent } from "../modules/computer-mode/computer-mode.component";
import { BoardEditorComponent } from "../modules/board-editor/board-editor.component";
import { AnalysisModeComponent } from "../modules/analysis-mode/analysis-mode.component";

const routes: Routes = [
    { path: "against-friend", component: ChessBoardComponent, title: "Play against friend" },
    { path: "against-computer", component: ComputerModeComponent, title: "Play against computer" },
    { path: "board-editor", component: BoardEditorComponent, title: "Board editor" },
    { path: "analysis-mode", component: AnalysisModeComponent, title: "Analysis mode" }
]

@NgModule({
    imports: [RouterModule.forRoot(routes)],
    exports: [RouterModule]
})
export class AppRoutingModule { }