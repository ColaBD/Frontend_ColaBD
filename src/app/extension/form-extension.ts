import { FormGroup } from "@angular/forms";

// export class FormGroupExtension extends FormGroup{
//   validateForm(){
//     const erros: string[] = [];

//     for (let campo of Object.keys(this.controls)) {
//       const controle = this.get(campo);

//       if (!controle?.errors) {
//         continue;
//       }

//       controle.markAsTouched();

//       for (let erro of Object.keys(controle.errors)) {
//         switch (erro) {
//           case 'required':
//             erros.push(`O campo "${campo}" é obrigatório`);
//             break;
//           case 'email':
//             erros.push(`O campo "${campo}" deve possuir um formato válido`);
//             break;
//         }
//       }
//     }

//     return erros;
//   }
// }

FormGroup.prototype.validate = function () {
  const erros: string[] = [];

  for (let campo of Object.keys(this.controls)) {
    const controle = this.get(campo);

    if (!controle?.errors) {
      continue;
    }

    controle.markAsTouched();

    for (let erro of Object.keys(controle.errors)) {
      switch (erro) {
        case 'required':
          erros.push(`O campo "${campo}" é obrigatório`);
          break;
        case 'email':
          erros.push(`O campo "${campo}" deve possuir um formato válido`);
          break;
      }
    }
  }

  return erros;
}