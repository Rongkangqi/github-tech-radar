export const DIRECTIONS = [
  { id: "ai", name: "AI 与智能体", short: "AI / Agents", color: "#d87952", description: "大模型、智能体、模型推理与 AI 应用。", use: "了解如何给应用加入对话、内容生成、智能工作流和本地模型能力。", pattern: /\b(llm|ai|agent|agents|gpt|rag|inference|transformer|diffusion|machine.learning|deep.learning|mcp|generative|model.context.protocol)\b/i },
  { id: "web", name: "Web 与应用开发", short: "Web / Apps", color: "#91a98e", description: "前端框架、应用组件与全栈开发工具。", use: "关注构建网站、桌面应用、界面组件和产品交互的新方法。", pattern: /\b(react|nextjs|next.js|vue|svelte|frontend|front.end|web|website|browser|ui|css|tailwind|electron|mobile|android|ios|swift|flutter)\b/i },
  { id: "devtools", name: "开发者工具", short: "Dev Tools", color: "#d2b46c", description: "编程工具、终端、编辑器与自动化。", use: "发现能改善编程、调试、代码协作和日常开发效率的工具。", pattern: /\b(cli|terminal|editor|developer|development|ide|coding|compiler|linter|debug|automation|productivity|programming)\b/i },
  { id: "data", name: "数据与基础设施", short: "Data / Infra", color: "#859dc1", description: "数据库、数据处理、云服务与运行基础设施。", use: "了解数据存储、检索、服务部署和应用运行的新选择。", pattern: /\b(database|sql|data|analytics|vector|redis|storage|docker|kubernetes|cloud|infrastructure|server|backend|distributed|observability|monitoring)\b/i },
  { id: "systems", name: "系统与安全", short: "Systems", color: "#ad92b8", description: "操作系统、网络、安全与底层工程。", use: "关注系统性能、网络通信、隐私和安全相关的技术。", pattern: /\b(kernel|linux|operating.system|security|secure|network|networking|privacy|encryption|rust|embedded|firmware|reverse.engineering)\b/i },
  { id: "other", name: "更多开源探索", short: "Explore", color: "#aaa69e", description: "学习资源、创意实验和其他开源项目。", use: "发现尚未归入主要技术方向的项目；资源列表也可能出现在这里。", pattern: /./ },
] as const;
export type Repo = { id: number; name: string; owner: string; fullName: string; description: string; descriptionLanguage?: string; descriptionTranslations?: Partial<Record<'zh' | 'en', string>>; url: string; language: string | null; stars: number; forks: number; topics: string[]; license: string | null; createdAt: string; pushedAt: string; direction: string; isNew: boolean; active: boolean; delta: number | null };
export type RadarData = { version: number; days: number; syncedAt: string; comparedAt: string | null; repos: Repo[]; totals: { new: number; active: number }; incomplete: boolean; stale?: boolean; notice?: string; retryAt?: string; sources: { new: string; active: string } };
export function classify(name: string, description: string, topics: string[]) { return DIRECTIONS.find(d => d.pattern.test(topics.join(" ") + " " + name.split("/").pop() + " " + description))!.id; }
export function isDownloadPromotion(repo: Pick<Repo, "name" | "description">) {
  const text = repo.name + " " + repo.description;
  const commercial = /\b(adobe|acrobat|photoshop|premiere|aida.?64|autocad|substance|ableton|winrar|bandicam|fl.studio)\b/i;
  const download = /\b(installer|standalone|full.feature|full.version|setup|download|crack|repack|activator)\b/i;
  return commercial.test(text) && download.test(text);
}
export const fmt = (n: number) => new Intl.NumberFormat("zh-CN", { notation: n >= 10000 ? "compact" : "standard", maximumFractionDigits: 1 }).format(n);
