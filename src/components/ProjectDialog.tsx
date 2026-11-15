import type { RefObject } from 'react';
import { ArrowUpRight, Bookmark, ExternalLink, GitFork, GitBranch, Radio, Sparkles, Star, X } from 'lucide-react';
import { DIRECTIONS, type RadarData, type Repo } from '../../lib/radar';
import RepoDescription, { DescriptionLanguage } from './RepoDescription';
import type { ReadingLanguage } from '../../lib/descriptions';

type Props = {
  dialogRef: RefObject<HTMLDialogElement | null>;
  selected: Repo | null;
  data: RadarData | null;
  saved: Record<string, Repo>;
  onClose: () => void;
  onToggle: (repo: Repo) => void;
  readingLanguage: ReadingLanguage;
  onReadingLanguageChange: (value: ReadingLanguage) => void;
};

const dateText = (value: string) => new Date(value).toLocaleString('zh-CN', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hour12: false });

export default function ProjectDialog({ dialogRef, selected, data, saved, onClose, onToggle, readingLanguage, onReadingLanguageChange }: Props) {
  return <dialog ref={dialogRef} className="detail-dialog" aria-labelledby="radar-dialog-title" onCancel={onClose} onClose={onClose} onClick={event => { if (event.target === event.currentTarget) onClose(); }}>
    <div className="dialog-inner">
      <button className="dialog-close icon-button" aria-label="关闭详情" onClick={onClose}><X size={22} /></button>
      {selected ? <>
        <div className="dialog-eyebrow"><GitBranch size={16} /> PROJECT INSIGHT</div>
        <div className="dialog-owner">{selected.owner} /</div>
        <h2 id="radar-dialog-title">{selected.name}</h2>
        <div className="detail-language-control"><DescriptionLanguage value={readingLanguage} onChange={onReadingLanguageChange} detail /></div>
        <RepoDescription key={`${selected.id}-${selected.description}-${readingLanguage}`} repo={selected} language={readingLanguage} detail />
        <div className="detail-metrics"><span><Star size={18} /><b>{selected.stars.toLocaleString()}</b> 累计 Star</span><span><GitFork size={18} /><b>{selected.forks.toLocaleString()}</b> Fork</span></div>
        <div className="detail-insight"><div><Sparkles size={17} /> 从什么方向了解它？</div><h3>{DIRECTIONS.find(d => d.id === selected.direction)?.name}</h3><p>{DIRECTIONS.find(d => d.id === selected.direction)?.use}</p><small>方向解读仅供探索，项目的实际能力以作者文档为准。</small></div>
        <dl className="detail-facts">
          <div><dt>主要语言</dt><dd>{selected.language || '未标注'}</dd></div>
          <div><dt>许可证</dt><dd>{selected.license || '未识别，请查看仓库 LICENSE'}</dd></div>
          <div><dt>创建时间</dt><dd>{new Date(selected.createdAt).toLocaleDateString('zh-CN')}</dd></div>
          <div><dt>最近提交</dt><dd>{dateText(selected.pushedAt)}</dd></div>
          {selected.delta !== null && data?.comparedAt && data.repos.some(r => r.id === selected.id) && <div><dt>较上次采集 Star 变化</dt><dd>{selected.delta > 0 ? '+' : ''}{selected.delta}<small>自 {dateText(data.comparedAt)}</small></dd></div>}
        </dl>
        <div className="detail-topics">{selected.topics.slice(0, 12).map(topic => <span key={topic}>{topic}</span>)}</div>
        <div className="dialog-buttons"><a className="button primary" href={selected.url} target="_blank" rel="noopener noreferrer">去 GitHub 看 README <ArrowUpRight size={17} /></a><button className="button outline" onClick={() => onToggle(selected)}><Bookmark size={16} fill={saved[selected.id] ? 'currentColor' : 'none'} />{saved[selected.id] ? '已加入观察' : '加入观察清单'}</button></div>
        <p className="detail-footnote">{data?.repos.some(r => r.id === selected.id) ? `数据采集于 ${dateText(data.syncedAt)}` : '这是收藏时的快照，本期样本未覆盖该项目。'}</p>
      </> : <>
        <div className="dialog-eyebrow"><Radio size={17} /> ABOUT THIS RADAR</div>
        <h2 id="radar-dialog-title">让发现，<br />有据可循。</h2>
        <p className="detail-description">帮助你发现新项目、新技术和可继续研究的方向。这里展示公开仓库的有限样本，不是 GitHub 官方 Trending 榜单。</p>
        <div className="guide-section"><h3>01 / 我们看什么</h3><p>新项目：近 7、30 或 90 天创建，至少 20 Star，按累计 Star 取前 100 个。活跃热门：近 7 天有提交、至少 500 Star，按累计 Star 取前 100 个。排除 Fork 和已归档仓库，合并去重。按有限规则隐藏名称或简介中同时出现特定商业软件名与下载推广用语的项目，可能存在漏判或误判。</p></div>
        <div className="guide-section"><h3>02 / 如何解读热度</h3><p>方向与语言分布表示样本中的项目数量，不代表全站市场份额，也不表示正在增长。方向按仓库主题、名称和简介进行规则归类，每个项目归入一类，可能存在偏差。Star 是累计收藏数；有上次快照时，详情显示两次采集之间的实际 Star 差值。</p></div>
        <div className="guide-section"><h3>03 / 自动更新与收藏</h3><p>GitHub Actions 计划每小时采集一次，关闭网页后也会运行；调度可能延迟，页面显示实际采集时间。打开页面时读取最近发布的结果，打开期间每小时检查一次。“检查更新”只读取已发布数据。采集失败时保留旧数据，超过 3 小时会提示。观察清单保存在当前浏览器，清除浏览器数据会移除清单。</p></div>
        <div className="guide-section"><h3>04 / 简介翻译与阅读</h3><p>简介语言可选中文、English 或作者原文，选择保存在当前浏览器，并同步应用到卡片和详情。后台使用 Argos 开源翻译模型自动识别简介语言并生成机器译文；新简介或修改后的简介会重新处理，未生成译文时展示原文。技术名词可能翻译不准确，可点击“查看原文”或在详情展开原文对照。搜索同时匹配原文和已生成的中英文译文。</p></div>
        <div className="guide-section"><h3>05 / 从发现到判断</h3><p>先看项目解决什么问题，再读 README、示例、许可证和维护情况。受欢迎是值得打开的线索，是否适合你的应用，还需要结合自己的需求。</p></div>
        <div className="source-links"><a href="https://docs.github.com/en/rest/search/search#search-repositories" target="_blank" rel="noopener noreferrer">GitHub API 文档 <ExternalLink size={14} /></a>{data && <><a href={data.sources.new} target="_blank" rel="noopener noreferrer">新项目查询 <ExternalLink size={14} /></a><a href={data.sources.active} target="_blank" rel="noopener noreferrer">活跃项目查询 <ExternalLink size={14} /></a></>}</div>
      </>}
    </div>
  </dialog>;
}
