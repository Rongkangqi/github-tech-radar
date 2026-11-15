import { useState } from 'react';
import { Languages } from 'lucide-react';
import type { Repo } from '../../lib/radar';
import { readDescription, readingLanguages, type ReadingLanguage } from '../../lib/descriptions';

export function DescriptionLanguage({ value, onChange, detail = false }: { value: ReadingLanguage; onChange: (value: ReadingLanguage) => void; detail?: boolean }) {
  return <label className="description-language"><Languages size={16} /><span>简介语言</span><select aria-label={detail ? '详情简介语言' : '简介语言'} value={value} onChange={event => onChange(event.target.value as ReadingLanguage)}>{readingLanguages.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}</select></label>;
}

export default function RepoDescription({ repo, language, detail = false }: { repo: Repo; language: ReadingLanguage; detail?: boolean }) {
  const [showOriginal, setShowOriginal] = useState(false);
  const result = readDescription(repo, language);
  const text = showOriginal ? repo.description : result.text;
  return <div className={`description-block ${detail ? 'description-detail' : ''}`}>
    <p className={detail ? 'detail-description' : 'repo-description'} lang={showOriginal ? repo.descriptionLanguage : result.lang} dir="auto">{text}</p>
    <div className="description-caption">
      <span>{result.pending ? '译文暂未生成 · 显示原文' : result.translated && !showOriginal ? '机器翻译' : '作者原文'}</span>
      {result.translated && <button type="button" aria-pressed={showOriginal} onClick={() => setShowOriginal(!showOriginal)}>{showOriginal ? '查看译文' : '查看原文'}</button>}
    </div>
    {detail && result.translated && !showOriginal && <details className="original-description"><summary>对照作者原文</summary><p lang={repo.descriptionLanguage} dir="auto">{repo.description}</p></details>}
  </div>;
}
