import { FormGroup } from '@angular/forms';

declare module '@angular/forms' {
  interface FormGroup {
    validate(): string[];
  }
}