import { ErrorHandler, Injectable } from "@angular/core";
import { MatSnackBar } from '@angular/material/snack-bar';

@Injectable()
export class GlobalErrorHandler implements ErrorHandler {

    constructor(private snackbar: MatSnackBar) { }

    public handleError(error: any): void {
        this.snackbar.open(
            error,
            "Close",
            { duration: 5000 }
        );
        throw new Error(error);
    }
}