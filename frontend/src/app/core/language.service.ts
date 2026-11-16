import { Injectable, inject, signal } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';

import { Lang } from './models';

const LANG_KEY = 'nutriscan.lang';

@Injectable({ providedIn: 'root' })
export class LanguageService {
  private translate = inject(TranslateService);

  readonly languages: { code: Lang; label: string }[] = [
    { code: 'en', label: 'EN' },
    { code: 'ru', label: 'RU' },
    { code: 'kk', label: 'KZ' },
  ];
  readonly current = signal<Lang>('en');

  init(): void {
    const saved = localStorage.getItem(LANG_KEY) as Lang | null;
    this.use(saved ?? 'en');
  }

  use(lang: Lang): void {
    this.current.set(lang);
    localStorage.setItem(LANG_KEY, lang);
    this.translate.use(lang);
    document.documentElement.lang = lang;
  }

  /** Picks name_en / name_ru / name_kk from an object, falling back to English. */
  localName(obj: { name_en: string; name_ru?: string; name_kk?: string } | null | undefined): string {
    if (!obj) return '';
    const value = obj[`name_${this.current()}` as 'name_en'];
    return value || obj.name_en;
  }
}
