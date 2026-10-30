# 前四轮真实过程与验证（历史记录）

以下保留对应轮次当时的事实和测试数量；当前状态以 [正式提交文档](README.md) 和 [后续开发记录](round5.md) 为准。

## 4. 过程记录

以下按轮次保留实际工作，不编造用户确认或人工验收；1–10 为第一轮、11–17 为第二轮与认证同步、18 起为第三轮：

1. 读取全部 phase_cli_1.md，检查工作区及父级可适用 AGENTS.md。初始只有作业文件，无代码、Git 仓库或项目约定。记录原文 SHA-256 为 `D8BBF9409A9596035F13AE809888C64E813EA76966B649911536DA44EABC7F76`，后续复核一致。
2. 核实 Node/npm/Git 版本。默认 PowerShell 配置因 PATH 中 Java 路径引号触发 Conda 初始化错误，改用不加载 profile 的执行会话；未改系统配置。
3. 在当前项目根初始化 main 分支，确认没有误用父级仓库。查询 Git 身份为空，git var GIT_AUTHOR_IDENT 明确失败；无远程，因此暂不提交、不推送。
4. 对照原文细则纠正容易混淆的边界：canvas 查询不禁用历史，box 不属当前阶段，g 为根直接子节点时禁止 ungroup；区分 set 白名单与外部 SVG 兼容范围。
5. 建需求矩阵、五模块架构和命令对象＋快照方案；把跨父 group、历史边界、外部 SVG、保存路径写为假设，未冒充教师确认。
6. 查询 npm 元数据后选定兼容的精确依赖并安装，生成锁文件。创建 strict TS 配置、CliShell 与 bootstrap；没有为目录填充空类，没有实现业务命令。
7. 建真实子进程冒烟测试，覆盖启动/EOF、多行 CRLF、空行、末行没有换行和未实现错误；首次 typecheck、测试和 build 均通过。实际 npm run cli 输入及构建入口也已检查。
8. 本机有 Java 但无可用 PlantUML/Graphviz 命令或现成 jar。下载官方 PlantUML 1.2026.9 至忽略目录，在本地渲染；首次未引用的 `-Djava.awt.headless=true` 被 PowerShell 错误解析，改成单引号参数后成功。查看 PNG 后发现接口标签贴近邻接内容，将其改为标记 interfaces 的组件框，重新渲染复核。没有使用远程服务上传项目图源，也未声称在浏览器预览业务 SVG。
9. 文档检查脚本经 PowerShell 管道传入 Node 时，中文正则因默认编码变为问号；仅为该检查会话设置 UTF-8 输出编码后通过。共检查 73 个唯一需求编号、完整表格列/状态、6 份 Markdown 的本地文件链接目标及锁文件声明一致性；不是业务测试。
10. 将本轮 18 个新文件及未修改的作业基线显式加入暂存区，检查无依赖目录/构建产物/日志/工具 jar。全量 diff --check 发现原始 phase_cli_1.md 文件末尾已有空行提示，遵守不可修改原文要求保留；排除该基线后，本轮新增文件检查通过。7 项本轮成果更新为已验证，其余 66 项保持未实现。因提交身份缺失保留暂存，尚无提交哈希。
11. 第二轮开始前重新只读审查基线，确认 19 个暂存文件和原文哈希未变，锁文件一致。远程 ls-remote 成功且没有引用，确认用户提供的仓库为空。发现 Git 身份仍缺失后未开始第二轮代码；用户提供 arcflute 署名与邮箱后，仅配置本项目身份和 origin，更新仓库信息，准备独立第一轮提交。用户明确授权两轮分别推送，覆盖第一轮“不推送”的限制。
12. 建立第一轮根提交 `c6b5e137ccd1fa8fb760844efb87d17d08660144`，没有混入 domain 文件。实际 `git push -u origin main` 失败：`Cannot prompt because user interactivity has been disabled` / `could not read Username for 'https://github.com': terminal prompts disabled`。只读访问空仓库成功不代表有写权限；通知用户认证缺失后，依其授权继续第二轮本地开发。
13. 实现六种 Shape、工厂与领域异常，使用私有字段、不可变 Geometry 和预计算提交动作。TreeNode 将父链接/有序子节点/归属/ID 索引封装在同一结构实现内，SvgDocument 是独立根，Group 不暴露会绕开索引的孩子写接口。
14. 创建领域测试，覆盖全部六类型、失败输入、有限数溢出、树约束、克隆隔离及作业流程图。第一批 typecheck 与 72 项测试全部通过（含既有 2 项启动测试），没有伪造测试失败后修复的经历。
15. 编写与复核代码过程中发现初稿 clone 对每个根调用 insert 会重复复制索引，Group 构造也重复扫描后代；改成文档一次建索引，以及 Group 验证互异 detached 根，避免宽树/深树上的重复工作。另补尺寸溢出与 line 第二端点溢出测试；最终 74 项测试通过。此修正来自代码复杂度分析，没有声称做过性能基准。
16. 实际运行 typecheck、test、build、开发 CLI 和编译入口，全部通过；CLI 对 init/help 仍明确报未实现。检查 domain import、类名和分派位置后更新领域子需求、决策、架构图及正式文档；未实现分词、命令执行或历史/IO，未做业务 SVG 浏览器预览。
17. 用户回复 GitHub 认证已配置后，重新检查发现远程 main 已指向第二轮提交 `b930b61cb561aaf07d5154ba84d051b71c66b902`。fetch 后核实两轮提交均在远程祖先历史中；执行 `git push -u origin main` 返回 Everything up-to-date，并建立跟踪关系。仅更新文档中的当前同步状态，保留先前真实认证失败记录，不改写两轮提交、不新增业务功能。
18. 第三轮读取用户附件、原文和现有代码/文档；工作区干净，本地 main 与 origin/main 同为 `a3beb436e6f02710da6a986b3799173768551ea0`。fetch 成功、无双方独有提交；基线 typecheck 和 74 项测试通过，未重置或覆盖工作区。
19. 将 ShapeFactory 的集中 switch 改为同一个构造/参数描述表；新增各图形的多态几何展示值。增加逐字符 Tokenizer、五种 Command、唯一分发器、私有 EditorSession 与只读 TextPresenter；CLI/入口接入，未新增依赖或未来命令占位类。
20. 首次类型检查发现按 `parent === document` 判断不能让 TypeScript 排除 SvgDocument，随后读取 type/id 报错。改为检查父级是否具有图形身份（`'id' in parent`），保持无图形 ID 的文档根语义；没有按六种类型再分派。修正后类型检查通过。
21. 保留原领域测试与启动/EOF 验证目的，增加词法、六种参数、失败候选、冻结查询、错误恢复和 60 条快速输入用例。8 个文件共 164 项测试通过。真实样例回放验证八个图形的固定树、子树、文本、样式与父级；没有 move/undo/save 或 SVG 浏览器预览。
22. 构建通过后分别用 npm run cli 和编译入口 stdin 回放样例。临时比对脚本最初搜索宽泛的 svg-editor，误匹配 npm 包名横幅；改成完整启动行定位，并将创建计数限定为图形摘要（排除画布 init）。修正后的核验通过：退出码均 0，stderr 均空，八次图形创建且业务输出一致。
23. 源码 AST 检查确认 27 个类独占同名文件，实际 import 符合依赖方向；分支审查未发现外层图形类型分派。文档统计脚本初次正则漏掉 E2E 两行，修正编号匹配后验证 100 个唯一编号（47 已验证/53 未实现）、完整列/状态及六份 Markdown 的本地文件链接。原文 SHA-256 未变；本地重新渲染架构 SVG/PNG 并查看。
24. 提交前再次 fetch 时遇到 GitHub 443 连接失败（约 21 秒后退出 128）；没有把网络失败当作远程为空，也没有改写历史或更换仓库。此前本轮起始 fetch 成功；最终推送与引用核验以交付回复中的实际结果为准。
25. 2026-10-30，用户询问提交与进度。实际重新 fetch/push 仍连接失败，经 GitHub 连接器确认远程 main 为 a3beb43；说明第三轮仅本地提交、先前按轮次提交粒度偏大。用户随后授权先继续本地开发、推送以后处理。第四轮没有再发起推送。
26. 以 c6f7284 为干净基线，typecheck 和原 164 项测试通过；依次实现移动、缩放、属性修改、子树删除，每项在针对性测试和文档更新后独立提交，分别为 e79c17c、aa92715、5996f20、4fdbf55。没有人为等待或修改提交时间。
27. 为历史把活动文档和 HistoryManager 合为一个 state 引用。HistoryEntry 保存独立的前后快照，恢复时再克隆，规避“恢复后再编辑污染历史”的风险。调整旧候选测试对 clone 次数的固定下标假设，保留其原子性验证目的；没有虚构产品测试失败。详细设计、检查顺序见 round4.md。
28. 全量 typecheck、292 项测试和 build 通过；真实回放 round4.commands.txt 的开发与编译入口，退出 0、stderr 空、业务输出一致。验证移动 node2 不影响连接线、缩放 node1、修改文本/样式和删除后整组恢复。仍未生成 SVG 或做浏览器验收。


## 6. 质量保证手段

### 第一轮实际执行（历史记录）

| 检查/命令 | 结果及范围 |
|---|---|
| npm install --save-dev --save-exact（锁定版本见 package.json） | 成功生成 package-lock.json；审计 42 个包，0 个已知漏洞（安装当时的 registry 结果） |
| npm ls --depth=0 | 5 个直接开发依赖均与声明版本一致 |
| npm run typecheck | 退出码 0；strict 检查代码、测试及 Vitest 配置 |
| npm test | 退出码 0；1 个测试文件、2 个真实进程测试通过；自动退出 |
| npm run build | 退出码 0；生成 dist/，不跟踪构建产物 |
| npm run cli（空行后 EOF；另一次输入 init/help 后 EOF） | 均退出码 0；有启动信息/提示符，业务命令明确拒绝 |
| node dist/bootstrap/main.js（空行后 EOF） | 退出码 0；构建结果能独立由 Node 启动 |
| PlantUML 本地 SVG/PNG 渲染 | 首次 Java 参数解析失败，引用参数后成功；标签布局调整后复核 |
| 原文 SHA-256 | 与首次读取一致；未改作业要求 |
| import/类声明审查 | 当前仅一个 CliShell 类、无业务类型分支；依赖符合骨架计划 |
| PlantUML `-checkonly` 与修订后图片查看 | 语法检查退出码 0；SVG/PNG 均已生成，接口标签布局已复核 |
| 文档与锁文件脚本检查 | 73 个唯一需求编号、列/状态完整；6 份 Markdown 无缺失的本地文件链接目标（不含锚点校验）；依赖声明与锁文件根一致 |
| `git diff --cached --check -- . ':(exclude)phase_cli_1.md'` | 通过。本轮文件无空白错误；未排除原文的全量检查仅报告原文末尾空行，原文不修改 |
| git status / diff --cached / ls-files / check-ignore | 19 个暂存文件：18 个新增成果＋原始要求基线；node_modules、dist、.tools 均忽略，没有无关内容 |
| git remote -v / git tag --list / 身份查询 | 无远程、无标签；姓名/邮箱未配置，未创建提交 |

原始要求只作为仓库基线纳入暂存，内容哈希不变。实际图源和文档图片纳入暂存；本地工具 jar 不纳入。上述质量检查表记录第一轮结束时的实际情况。第二轮开始前身份与远程配置已补齐；按新授权分别提交并推送第一轮、第二轮，不重写历史、不强制推送、不打 final 标签。

### 第二轮实际执行

| 检查/命令 | 结果及范围 |
|---|---|
| 第一轮暂存/身份/分支检查 | 19 个文件均属本项目；工作树与暂存一致；身份由用户补充后配置，仅创建第一轮提交 |
| `git ls-remote --symref https://github.com/arcflute/svg-editor-cli.git` | 返回 0、无引用，远程当时为空；不是网络失败推断 |
| `git push -u origin main` | 失败，缺少可用的 HTTPS Git 凭据；未声称同步成功 |
| `npm run typecheck` | 退出码 0，strict 检查源代码/测试/配置 |
| `npm test` | 退出码 0，5 个文件、74 项通过并退出；领域 72 项＋既有启动 2 项 |
| `npm run build` | 退出码 0，生产源代码可编译 |
| `npm run cli` 输入 init/help 后 EOF | 退出码 0，两条均明确报未实现，提示符及退出正常 |
| `node dist/bootstrap/main.js` 空行后 EOF | 退出码 0，编译入口可运行 |
| 原文 SHA-256 | 仍为 `D8BBF9409A9596035F13AE809888C64E813EA76966B649911536DA44EABC7F76` |
| 源码复核 | 领域无外层依赖；每类同名文件；工厂唯一类型名分派；无 JSON 克隆；未修改原 CLI 代码/测试 |
| PlantUML SVG/PNG 渲染、`-checkonly`、PNG 查看 | 本地生成成功，语法检查退出码 0；已查看第二轮图，实际领域/测试与规划模块标识清楚 |
| TypeScript AST 检查脚本 | 14 个领域类均与文件同名且一类一文件；导入仅 ./；仅有工厂类型 switch 和公共属性 switch |
| 文档/锁文件检查脚本 | 6 份 Markdown 本地文件链接目标存在（不含锚点校验）；90 个唯一需求编号、25 已验证/65 未实现，列与状态完整；锁文件一致 |
| Git 最终暂存审查 | 26 个第二轮相关文件，diff --cached --check 通过；node_modules/dist/.tools 忽略；原文、CLI、原启动测试、package 配置/锁文件与第一轮提交无差异 |
| 认证完成后的 ls-remote / fetch / merge-base --is-ancestor | 远程 main 与本地第二轮提交一致，两轮开发提交均为远程 main 的祖先 |
| 认证完成后的 `git push -u origin main` | 退出码 0、Everything up-to-date，已建立 main → origin/main 跟踪；先前失败记录保留为真实过程 |

第二轮开发与验证已经完成，两轮提交均已远程同步。认证完成后的补充工作仅检查 Git 状态、核实远程历史和更新这些文档，没有修改代码或依赖，因此未重复运行已通过的 74 项测试。文档同步另作提交，不合并、不改提交时间、不强推；最新文档提交与远程核验结果见交付回复及 Git 记录。

测试按行为分布：Shapes.test.ts 验证类型/属性/几何/原子性/Composite；SvgDocument.test.ts 验证树/索引/归属/顺序；Clone.test.ts 验证真实类和双向隔离；Flowchart.test.ts 构造 §6.1 版本 A，并确认只移动 node2 的矩形与文字。未使用同一套实现计算结果当作预期值，也未增加覆盖率工具或声称测得覆盖率。

### 第三轮实际执行

| 检查/命令 | 结果及范围 |
|---|---|
| 基线 `npm run typecheck` / `npm test` | 退出码 0，原 5 文件 74 项通过 |
| 实现后 `npm run typecheck` | 首次发现父级联合类型收窄错误，修正后退出码 0 |
| 实现后 `npm test` | 退出码 0，8 文件 164 项通过，执行一次退出；未报告覆盖率百分比 |
| `npm run build` | 退出码 0，生产 TypeScript 编译成功 |
| `npm run cli` 与 `node dist/bootstrap/main.js` 的 stdin 文件回放 | 两者退出码 0、stderr 为空；八个图形创建，业务输出一致；固定预期树另由进程测试验证 |
| 错误恢复与 EOF 进程测试 | 无文档/词法/ID 错误后继续，CRLF 与末行无换行成功，60 条 create 按顺序处理完 |
| TypeScript AST/import/分支审查 | 27 个类一类一文件且同名，cli→application→domain；domain 仅自身导入；两处名称表，无显示类型分支 |
| 文档/锁文件检查脚本 | 100 个唯一需求编号、47 已验证/53 未实现；六份 Markdown 共 24 个本地文件链接目标存在（未校验锚点）；依赖声明与锁文件一致 |
| PlantUML `-checkonly`、SVG/PNG 生成和图片查看 | 本地执行成功，已查看第三轮架构图；历史/IO 与当前实现区分 |
| 原文哈希及工作区 `git diff --check` | 原文 SHA-256 与第一轮相同；本轮 diff 无空白错误 |

词法与应用测试采用固定数值/输出预期；会话候选测试额外观察 clone 的原/副本引用，确认失败保留活动引用、成功仅提交独立副本。读取旧视图后再编辑不会改变旧视图。源码/文档/架构图与暂存复核结果随本轮交付记录。

### 第四轮实际执行

逐功能检查与提交顺序见 [round4.md](round4.md)。全量 `npm run typecheck`、`npm test`、`npm run build` 均退出 0；14 个文件、292 项测试通过。`npm run cli` 与编译入口的 round4 文件回放均退出 0、stderr 为空、业务输出一致。输入 CRLF、最后一行无换行、快速编辑及连续 undo/redo 均由真实子进程测试验证。

History.test.ts 通过注入快照创建、历史准备、undo/redo 恢复失败检查活动文档＋两栈＋禁用位不变；验证多步顺序、子树恢复、缺省样式、文本原值、ID 复用与 no-op 的一命令一单元。没有以统计覆盖率代替场景断言。

源码 AST/import 审查确认 36 个类均同名且一类一文件，依赖符合约定，无外层图形类型分支。需求脚本确认 109 个唯一编号、66 已验证/43 未实现；7 份 Markdown 的 30 个本地文件链接目标存在（不含锚点验证）。原文哈希、锁文件声明一致；PlantUML 语法检查与 SVG/PNG 生成通过并查看图片，工作区 diff --check 通过。
