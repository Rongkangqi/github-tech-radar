import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ArrowDown, ArrowRight, ArrowUpRight, Bookmark, Check, Code2, Cpu, Database, GitBranch, Info, LayoutTemplate, LoaderCircle, Menu, Orbit, Radio, RefreshCw, Search, ShieldCheck, Star, Terminal, X } from 'lucide-react';
import { DIRECTIONS, fmt, type RadarData, type Repo } from '../lib/radar';
import RadarScene from './components/RadarScene';
import ProjectDialog from './components/ProjectDialog';

type View = 'overview' | 'new' | 'saved';
const languageColors: Record<string, string> = { Python: '#c49b32', TypeScript: '#3178c6', JavaScript: '#c2a900', Rust: '#b46d48', Go: '#27a6b7', Java: '#ad7544', 'C++': '#886ab5', C: '#6d79a1', Shell: '#6a8d49', Swift: '#db7351' };
const directionIcons = [Cpu, LayoutTemplate, Terminal, Database, ShieldCheck, Orbit];
const viewNames: Record<View, string> = { overview: '全部项目', new: '新项目雷达', saved: '我的观察清单' };
const dateText = (value: string) => new Date(value).toLocaleString('zh-CN', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hour12: false });
function ago(value: string) { const days = Math.max(0, Math.floor((Date.now() - new Date(value).getTime()) / 86400000)); return days === 0 ? '今天有提交' : `${days} 天前提交`; }

export default function App() {
  const [data, setData] = useState<RadarData | null>(null);
  const [loading, setLoading] = useState(true), [error, setError] = useState('');
  const [days, setDays] = useState(30), [view, setView] = useState<View>('overview');
  const [direction, setDirection] = useState('all'), [language, setLanguage] = useState('all');
  const [query, setQuery] = useState(''), [sort, setSort] = useState('discover'), [limit, setLimit] = useState(12);
  const [saved, setSaved] = useState<Record<string, Repo>>({}), [ready, setReady] = useState(false);
  const [storageError, setStorageError] = useState(''), [selected, setSelected] = useState<Repo | null>(null);
  const [guide, setGuide] = useState(false), [hint, setHint] = useState(''), [menuOpen, setMenuOpen] = useState(false);
  const dialog = useRef<HTMLDialogElement>(null), seq = useRef(0), searchInput = useRef<HTMLInputElement>(null);

  const load = useCallback(async (manual = false) => {
    const id = ++seq.current;
    setLoading(true); setError('');
    try {
      const response = await fetch(`${import.meta.env.BASE_URL}data/radar-${days}.json?t=${Math.floor(Date.now() / 60000)}`, { cache: 'no-store', signal: AbortSignal.timeout(20000) });
      if (!response.ok) throw new Error('暂时无法读取数据，请稍后再试。');
      const json = await response.json() as RadarData;
      if (!Array.isArray(json.repos) || json.days !== days || !Number.isFinite(Date.parse(json.syncedAt))) throw new Error('数据文件暂不可用，请稍后再试。');
      if (Date.now() - Date.parse(json.syncedAt) > 3 * 3600000) { json.stale = true; json.notice ||= '距离上次采集已超过 3 小时，当前展示上次成功的数据。'; }
      if (id !== seq.current) return;
      setData(json);
      if (manual) { setHint(json.stale ? '当前显示上次成功采集的数据。' : '已检查最新数据 · 计划每小时采集'); setTimeout(() => setHint(''), 5000); }
    } catch (e) { if (id === seq.current) setError(e instanceof Error ? e.message : '网络连接暂不可用。'); }
    finally { if (id === seq.current) setLoading(false); }
  }, [days]);

  useEffect(() => { setData(null); void load(); const timer = setInterval(() => void load(), 3600000); return () => { clearInterval(timer); seq.current++; }; }, [load]);
  useEffect(() => {
    try {
      const value = JSON.parse(localStorage.getItem('github-radar-saved-v1') || '{}');
      if (value && typeof value === 'object' && !Array.isArray(value)) {
        setSaved(Object.fromEntries(Object.entries(value).filter(([, value]) => {
          const r = value as Repo | null;
          return r && typeof r === 'object' && typeof r.fullName === 'string' && typeof r.id === 'number' && Array.isArray(r.topics) && typeof r.stars === 'number' && typeof r.createdAt === 'string' && typeof r.pushedAt === 'string' && typeof r.description === 'string' && /^https:\/\/github\.com\//.test(r.url);
        })) as Record<string, Repo>);
      }
    } catch { setStorageError('浏览器暂时无法读取观察清单。'); }
    setReady(true);
  }, []);
  useEffect(() => { if (ready) try { localStorage.setItem('github-radar-saved-v1', JSON.stringify(saved)); } catch { setStorageError('浏览器未能保存清单，当前选择仅在本次浏览中保留。'); } }, [saved, ready]);
  useEffect(() => { if ((selected || guide) && !dialog.current?.open) dialog.current?.showModal(); }, [selected, guide]);
  useEffect(() => { setLimit(12); }, [query, language, direction, view, days, sort]);

  const repos = data?.repos || [];
  const directionStats = DIRECTIONS.map((d, index) => ({ ...d, icon: directionIcons[index], count: repos.filter(r => r.direction === d.id).length }));
  const languages = Object.entries(repos.reduce<Record<string, number>>((counts, r) => { if (r.language) counts[r.language] = (counts[r.language] || 0) + 1; return counts; }, {})).sort((a, b) => b[1] - a[1]);
  const fresh = repos.filter(r => r.isNew).length;
  const languageTotal = repos.filter(r => r.language).length;
  const filtered = useMemo(() => {
    const current = new Map((data?.repos || []).map(r => [r.id, r]));
    let list = view === 'saved' ? Object.values(saved).map(r => current.get(r.id) || r) : (data?.repos || []).filter(r => view !== 'new' || r.isNew);
    const q = query.trim().toLowerCase();
    list = list.filter(r => (direction === 'all' || r.direction === direction) && (language === 'all' || r.language === language) && (!q || `${r.fullName} ${r.description} ${r.topics.join(' ')} ${DIRECTIONS.find(d => d.id === r.direction)?.name}`.toLowerCase().includes(q)));
    return list.sort((a, b) => sort === 'created' ? b.createdAt.localeCompare(a.createdAt) : sort === 'updated' ? b.pushedAt.localeCompare(a.pushedAt) : sort === 'discover' ? Number(b.isNew) - Number(a.isNew) || b.stars - a.stars : b.stars - a.stars);
  }, [data, saved, view, query, direction, language, sort]);
  const languageOptions = [...new Set([...languages.map(l => l[0]), ...(view === 'saved' ? Object.values(saved).map(r => r.language).filter((l): l is string => !!l) : [])])];

  const scrollTo = (id: string) => document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  const chooseView = (next: View, target = 'projects') => { setView(next); setDirection('all'); setLanguage('all'); setQuery(''); setMenuOpen(false); scrollTo(target); };
  const chooseDirection = (id: string) => { setDirection(id); setView('overview'); setLanguage('all'); setQuery(''); scrollTo('projects'); };
  const toggleSaved = (repo: Repo) => setSaved(previous => { const next = { ...previous }; if (next[repo.id]) delete next[repo.id]; else next[repo.id] = repo; return next; });
  const closeDialog = () => { if (dialog.current?.open) dialog.current.close(); setSelected(null); setGuide(false); };
  const empty = !loading && !data;

  return <div className="site-shell">
    <a className="skip-link" href="#projects">跳到项目探索</a>
    <header className="site-header">
      <div className="header-inner">
        <a className="brand" href={import.meta.env.BASE_URL} aria-label="GitHub Radar 首页"><span className="brand-symbol"><Radio size={23} /></span><span className="brand-wordmark">GITHUB <b>RADAR</b><small>开 源 技 术 雷 达</small></span></a>
        <nav id="main-navigation" className={`main-navigation ${menuOpen ? 'is-open' : ''}`} aria-label="主导航">
          <button className={view === 'overview' ? 'active' : ''} onClick={() => chooseView('overview', 'top')}>发现概览</button>
          <button onClick={() => chooseView('overview', 'directions')}>技术方向</button>
          <button className={view === 'new' ? 'active' : ''} onClick={() => chooseView('new')}>新项目雷达</button>
          <button className={view === 'saved' ? 'active' : ''} onClick={() => chooseView('saved')}>观察清单{Object.keys(saved).length > 0 && <span className="nav-count">{Object.keys(saved).length}</span>}</button>
        </nav>
        <div className="header-actions">
          <button className="header-search icon-button" aria-label="搜索项目" onClick={() => { scrollTo('projects'); searchInput.current?.focus({ preventScroll: true }); }}><Search size={19} /></button>
          <button className="button primary header-explore" onClick={() => chooseView('overview')}>探索项目 <ArrowUpRight size={17} /></button>
          <button className="menu-toggle icon-button" aria-label={menuOpen ? '关闭导航' : '打开导航'} aria-expanded={menuOpen} aria-controls="main-navigation" onClick={() => setMenuOpen(!menuOpen)}>{menuOpen ? <X size={23} /> : <Menu size={23} />}</button>
        </div>
      </div>
    </header>

    <main>
      <section className="hero" id="top">
        <div className="hero-grid" />
        <div className="section-container hero-layout">
          <div className="hero-copy">
            <div className="eyebrow hero-eyebrow"><span /> OPEN SOURCE / NEW POSSIBILITIES</div>
            <h1>看见开源动向<br /><em>发现技术的下一站</em></h1>
            <p>从 GitHub 的公开项目中，发现新技术、<br className="desktop-break" />开发工具与值得继续研究的方向。</p>
            <div className="hero-actions"><button className="button primary" onClick={() => chooseView('overview')}>开始探索 <ArrowUpRight size={19} /></button><button className="text-button" onClick={() => setGuide(true)}>了解这份雷达 <ArrowRight size={17} /></button></div>
            <div className="hero-source"><span className={`status-dot ${error || data?.stale ? 'amber' : ''}`} />{loading ? '正在读取公开项目数据' : data ? `最近采集 ${dateText(data.syncedAt)} · 计划每小时更新` : '等待数据同步'}<button aria-label="数据来源与统计说明" onClick={() => setGuide(true)}><Info size={14} /></button></div>
          </div>
          <div className="hero-visual"><div className="scene-topline"><span>GITHUB RADAR</span><span>VOL. {String(days).padStart(2, '0')}D</span></div><RadarScene /><div className="scene-bottomline"><span>PUBLIC REPOSITORY SIGNALS</span><span>{data ? repos.length : '—'} REPOS <i /></span></div></div>
        </div>
        <a className="scroll-cue" href="#directions" aria-label="向下探索技术方向"><ArrowDown size={16} /></a>
      </section>

      <section className="sample-strip" aria-label="当前样本概况"><div className="section-container sample-grid">
        {[{ value: data ? repos.length : '—', unit: '个', label: '本期观察项目', detail: '合并去重的公开仓库' }, { value: data ? fresh : '—', unit: '个', label: `近 ${days} 天新项目`, detail: '按累计 Star 发现' }, { value: data ? directionStats.filter(d => d.count).length : '—', unit: '类', label: '覆盖技术方向', detail: '基于主题与简介归类' }, { value: languages[0]?.[0] || '—', unit: '', label: '样本最多的语言', detail: languages[0] ? `${languages[0][1]} 个项目采用` : '采集后生成统计' }].map(stat => <div className="sample-stat" key={stat.label}><div><strong>{stat.value}</strong><span>{stat.unit}</span></div><h2>{stat.label}</h2><p>{stat.detail}</p></div>)}
      </div></section>

      <section className="directions-section" id="directions">
        <div className="section-container">
          <div className="section-heading centered"><div className="eyebrow">EXPLORE THE LANDSCAPE</div><h2>每一个方向，<span>都可能是新的开始。</span></h2><p>从你关心的领域出发，看见开发者正在创造什么。</p></div>
          <div className="direction-grid">{directionStats.map((d, index) => <button className={`direction-tile ${direction === d.id ? 'selected' : ''}`} key={d.id} onClick={() => chooseDirection(d.id)} aria-pressed={direction === d.id}>
            <div className="direction-top"><d.icon size={27} strokeWidth={1.4} /><span>0{index + 1} / {d.short}</span><ArrowUpRight className="direction-arrow" size={21} /></div>
            <h3>{d.name}</h3><p>{d.description}</p>
            <div className="direction-bottom"><span className="direction-meter"><span style={{ width: `${d.count / Math.max(1, repos.length) * 100}%` }} /></span><strong>{data ? d.count : '—'}<small> 项目</small></strong></div>
          </button>)}</div>
          <div className="direction-note"><span>基于当前样本的项目数量 · 方向归类仅供探索</span><button onClick={() => setGuide(true)}>查看统计口径 <ArrowUpRight size={14} /></button></div>
        </div>
      </section>

      <section className="explorer-section" aria-labelledby="explorer-title">
        <div className="section-container">
          <div className="explorer-heading"><div><div className="eyebrow">THE NEXT THING TO EXPLORE</div><h2 id="explorer-title">{view === 'saved' ? <>把好技术，<br /><span>留在视野里。</span></> : <>找到下一项<br /><span>值得了解的技术。</span></>}</h2><p>{view === 'saved' ? '收藏值得继续了解的项目，慢慢形成自己的技术判断。' : '新项目、新想法，以及持续活跃的开源力量。'}</p></div><button className="refresh-button button outline" onClick={() => void load(true)} disabled={loading} aria-label="检查更新"><RefreshCw size={16} className={loading ? 'spin' : ''} />{loading ? '正在读取' : '检查更新'}</button></div>

          {(error || data?.notice || storageError) && <div className="notice" role="status"><Info size={17} /><span>{error || data?.notice || storageError}</span><button onClick={() => void load()} disabled={loading}>重试</button></div>}
          {data?.incomplete && <div className="notice" role="status"><Info size={17} />GitHub 标记本次搜索结果可能不完整，以下为已返回的样本。</div>}

          <div className="explorer-toolbar" id="projects" tabIndex={-1}><nav className="view-tabs" aria-label="项目视图">{(['overview', 'new', 'saved'] as View[]).map(v => <button key={v} className={view === v ? 'active' : ''} aria-pressed={view === v} onClick={() => chooseView(v)}>{v === 'saved' && <Bookmark size={15} />}{viewNames[v]}<span>{v === 'saved' ? Object.keys(saved).length : v === 'new' ? fresh : repos.length}</span></button>)}</nav>{view !== 'saved' && <select className="period-select" aria-label="新项目创建时间范围" value={days} onChange={event => setDays(Number(event.target.value))}><option value={7}>近 7 天</option><option value={30}>近 30 天</option><option value={90}>近 90 天</option></select>}</div>
          <div className="filters"><label className="search-field"><Search size={19} /><input ref={searchInput} aria-label="搜索项目、技术或主题" placeholder="搜索项目、技术或主题" value={query} onChange={event => setQuery(event.target.value)} />{query && <button aria-label="清空搜索" onClick={() => setQuery('')}><X size={17} /></button>}</label><select aria-label="技术语言" value={language} onChange={event => setLanguage(event.target.value)}><option value="all">所有语言</option>{languageOptions.map(l => <option key={l}>{l}</option>)}</select><select aria-label="项目排序" value={sort} onChange={event => setSort(event.target.value)}><option value="discover">优先看新项目</option><option value="stars">Star 最多</option><option value="created">最新创建</option><option value="updated">最近提交</option></select></div>
          <div className="topic-chips" aria-label="筛选技术方向"><button className={direction === 'all' ? 'active' : ''} aria-pressed={direction === 'all'} onClick={() => setDirection('all')}>全部方向</button>{DIRECTIONS.map(d => <button className={direction === d.id ? 'active' : ''} aria-pressed={direction === d.id} key={d.id} onClick={() => setDirection(d.id)}>{d.name}</button>)}</div>
          <div className="results-line"><p>发现 <strong>{filtered.length}</strong> 个{view === 'saved' ? '收藏' : '匹配'}项目</p><span>{view === 'new' ? `近 ${days} 天创建 · 累计 Star` : view === 'saved' ? '保存在当前浏览器' : `近 ${days} 天新项目 + 近 7 天活跃热门`}</span></div>

          <div aria-live="polite" aria-busy={loading}>
            {loading && !data && view !== 'saved' ? <div className="empty-state"><LoaderCircle className="spin" size={30} /><h3>正在扫描开源世界</h3><p>正在读取最近一次采集结果。</p></div> : filtered.length === 0 ? <div className="empty-state">{view === 'saved' ? <Bookmark size={32} /> : <Search size={32} />}<h3>{empty && view !== 'saved' ? '暂时无法读取最新数据' : view === 'saved' && !Object.keys(saved).length ? '留住让你眼前一亮的项目' : '没有找到匹配的项目'}</h3><p>{empty && view !== 'saved' ? '检查网络后重试，真实数据会在同步后显示。' : view === 'saved' && !Object.keys(saved).length ? '点击项目卡片上的书签，下次可以继续了解。' : '换一个关键词，或清除筛选条件试试。'}</p><button className="button primary" onClick={() => { if (empty && view !== 'saved') void load(); else chooseView('overview'); }}>{empty && view !== 'saved' ? '重新读取' : '探索全部项目'}<ArrowRight size={16} /></button></div> : <div className="project-grid">{filtered.slice(0, limit).map((r, index) => <article className="project-card" key={r.id}>
              <div className="project-top"><span className="project-avatar"><GitBranch size={21} strokeWidth={1.6} /></span><span className="project-owner" title={r.owner}>{r.owner}</span>{r.isNew && <span className="new-badge">NEW</span>}<button className={`save-button icon-button ${saved[r.id] ? 'saved' : ''}`} onClick={() => toggleSaved(r)} aria-label={`${saved[r.id] ? '取消收藏' : '收藏'} ${r.fullName}`} title={saved[r.id] ? '从观察清单移除' : '加入观察清单'}><Bookmark size={19} fill={saved[r.id] ? 'currentColor' : 'none'} /></button></div>
              <h3><button onClick={() => setSelected(r)}>{r.name}</button></h3><p className="repo-description">{r.description}</p>
              <div className="repo-meta"><span className="repo-language"><i style={{ background: languageColors[r.language || ''] || '#84947e' }} />{r.language || '未标注语言'}</span><span>{DIRECTIONS.find(d => d.id === r.direction)?.name}</span></div>
              <div className="project-footer"><span className="star-count" title={`${r.stars.toLocaleString()} 累计 Star`}><Star size={15} />{fmt(r.stars)}<small>累计 Star</small></span><button onClick={() => setSelected(r)} aria-label={`了解项目 ${r.fullName}`}>了解项目 <ArrowUpRight size={17} /></button></div>
              <div className="project-underlay"><span>{String(index + 1).padStart(2, '0')}</span><span>{ago(r.pushedAt)}</span></div>
            </article>)}</div>}
          </div>
          {filtered.length > limit && <div className="load-more-wrap"><button className="button outline load-more" onClick={() => setLimit(limit + 12)}>再发现 {Math.min(12, filtered.length - limit)} 个项目 <ArrowDown size={17} /></button><span>已展示 {Math.min(limit, filtered.length)} / {filtered.length}</span></div>}
          <p className="sample-disclaimer"><Info size={14} />Star 为累计收藏数，不能直接代表近期增速。{view === 'saved' ? '本期未覆盖的收藏项目显示收藏时的快照。' : '统计来自有限样本，适合发现线索。'}</p>

          <section className="language-panel" aria-label="样本语言分布"><div className="language-heading"><Code2 size={25} strokeWidth={1.5} /><h3>用什么语言，<br />创造新的可能？</h3><p>当前样本 · 按项目数统计</p></div><div className="language-grid">{languages.slice(0, 6).map(([name, count]) => <button key={name} className={language === name ? 'chosen' : ''} onClick={() => { setLanguage(language === name ? 'all' : name); scrollTo('projects'); }}><span className="language-name"><i style={{ background: languageColors[name] || '#84947e' }} />{name}<small>{count} 个</small></span><span className="language-bar"><span style={{ width: `${count / Math.max(1, languageTotal) * 100}%`, background: languageColors[name] || '#84947e' }} /></span><span className="language-percentage">{Math.round(count / Math.max(1, languageTotal) * 100)}%</span></button>)}{!languages.length && <p className="muted">读取数据后显示语言统计</p>}</div><p className="language-note">比例以已标注主语言的项目为分母</p></section>
        </div>
      </section>

      <section className="reading-section"><div className="section-container reading-layout"><div><div className="eyebrow">FROM DISCOVERY TO UNDERSTANDING</div><h2>看见热度，<br /><span>也看懂它能做什么。</span></h2></div><div className="reading-copy"><p>先读作者简介，再看 README 中的示例、许可证和维护情况。把值得研究的项目留在观察清单里，让每一次发现，都成为自己的技术判断。</p><button className="button primary" onClick={() => setGuide(true)}>了解数据与方法 <ArrowUpRight size={18} /></button></div></div></section>
    </main>

    <footer className="site-footer"><div className="section-container"><div className="footer-main"><a className="brand" href={import.meta.env.BASE_URL}><span className="brand-symbol"><Radio size={23} /></span><span className="brand-wordmark">GITHUB <b>RADAR</b><small>开 源 技 术 雷 达</small></span></a><p>保持好奇，持续发现。</p><button className="text-button" onClick={() => scrollTo('top')}>回到顶部 <ArrowUpRight size={17} /></button></div><div className="footer-bottom"><span>GitHub Radar · 开源技术观察窗口</span><div><button onClick={() => setGuide(true)}>数据来源与方法</button><a href="https://github.com/Rongkangqi/github-tech-radar" target="_blank" rel="noopener noreferrer"><GitBranch size={14} /> 项目源码 <ArrowUpRight size={13} /></a></div></div></div></footer>
    {hint && <div className="toast" role="status"><Check size={17} />{hint}</div>}
    <ProjectDialog dialogRef={dialog} selected={selected} data={data} saved={saved} onClose={closeDialog} onToggle={toggleSaved} />
  </div>;
}
