import { Component, OnInit, inject } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { TranslatePipe } from '@ngx-translate/core';

import { AuthService } from './core/auth.service';
import { LanguageService } from './core/language.service';
import { Lang } from './core/models';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, RouterLink, RouterLinkActive, TranslatePipe],
  templateUrl: './app.html',
  styleUrl: './app.scss',
})
export class App implements OnInit {
  protected auth = inject(AuthService);
  protected lang = inject(LanguageService);

  ngOnInit(): void {
    this.lang.init();
  }

  /** Language buttons in the navbar: switch now and remember it in the profile. */
  changeLanguage(code: Lang): void {
    this.lang.use(code);
    this.auth.savePreferredLanguage(code);
  }
}
