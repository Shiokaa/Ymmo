import { Component, signal } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { ButtonModule } from 'primeng/button';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, ButtonModule],
  templateUrl: './app.html',
  styleUrl: './app.css',
})
export class App {
  protected readonly title = signal('frontend');
  protected readonly message = signal('Cliquez sur le bouton pour tester !');

  onTestClick() {
    this.message.set('Le bouton PrimeNG fonctionne parfaitement ! 🚀');
  }
}
