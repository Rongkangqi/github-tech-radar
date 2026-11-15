import type { Repo } from './radar.ts';

export type ReadingLanguage = 'zh' | 'en' | 'original';
export const readingLanguages: { value: ReadingLanguage; label: string }[] = [
  { value: 'zh', label: '中文' }, { value: 'en', label: 'English' }, { value: 'original', label: '作者原文' },
];
export function readDescription(repo: Repo, language: ReadingLanguage) {
  if (language === 'original' || language === repo.descriptionLanguage) {
    return { text: repo.description, translated: false, pending: false, lang: repo.descriptionLanguage };
  }
  const translation = repo.descriptionTranslations?.[language];
  if (typeof translation === 'string' && translation.trim()) {
    return { text: translation, translated: true, pending: false, lang: language };
  }
  return { text: repo.description, translated: false, pending: true, lang: repo.descriptionLanguage };
}
export function searchableDescription(repo: Repo) {
  return [repo.description, repo.descriptionTranslations?.zh, repo.descriptionTranslations?.en].filter(Boolean).join(' ');
}
