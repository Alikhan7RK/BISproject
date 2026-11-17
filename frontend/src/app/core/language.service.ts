import { Injectable, inject, signal } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';

import { Lang } from './models';

const LANG_KEY = 'nutriscan.lang';
const DEFAULT_LANG: Lang = 'en'; // also the fallbackLang in app.config.ts

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
    let saved: string | null = null;
    try {
      saved = localStorage.getItem(LANG_KEY);
    } catch {
      // storage blocked (private mode) -> just use the default
    }
    this.use(saved);
  }

  /** Switches the UI language. Anything that is not en/ru/kk (empty, undefined, old value) -> 'en'. */
  use(value: string | null | undefined): void {
    const lang: Lang = this.languages.some((l) => l.code === value) ? (value as Lang) : DEFAULT_LANG;
    this.current.set(lang);
    try {
      localStorage.setItem(LANG_KEY, lang);
    } catch {
      // storage blocked -> the language just isn't remembered after a refresh
    }
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
