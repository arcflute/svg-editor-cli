# SVG 编辑器（CLI）个人 Lab：正式提交文档（第二轮）

## 1. 项目信息和运行方式

- 课程：《高级软件开发技术》；作业：Lab1 Phase 1。
- 作业基线：[phase_cli_1.md](../phase_cli_1.md)，保持原文不变。
- Git 仓库地址：[arcflute/svg-editor-cli](https://github.com/arcflute/svg-editor-cli)。本项目独立仓库的 origin 为 `https://github.com/arcflute/svg-editor-cli.git`，目标分支 main。
- 当前进度：第二轮——六类型领域模型、文档树与 ID/结构约束、深拷贝及领域测试已实现。**分词、CLI 业务命令、Command 执行器、SVG 读写与历史仍未实现**；领域层尚未接入 CLI。
- 第一轮独立提交：`c6b5e137ccd1fa8fb760844efb87d17d08660144`。其推送因本地 HTTPS Git 认证缺失失败；两轮本地成果待远程同步，不能把配置 origin 当成推送成功。
- 记录日期：2026-10-26（Asia/Shanghai）。作者姓名、学号、课程截止时间尚未提供，不代填。
- 实际开发环境：Windows PowerShell；Node.js v22.15.0；npm 10.9.2；Git 2.39.1.windows.1。第一轮结束时身份缺失；开始第二轮前，已按用户提供的署名和邮箱配置项目级 Git 身份，不修改全局配置。

在项目根目录运行（首次安装后即可启动）：

```sh
npm ci
npm run cli
npm run typecheck
npm test
npm run build
node dist/bootstrap/main.js
```

`npm test` 使用 `vitest run`，执行一次退出。CLI 显示 `svg-editor 0.1` 启动信息与 `svg> `，读取输入；非空输入统一输出 `error: command not implemented in this scaffold`，不会返回 created/saved 等虚假成功。空行重新提示。EOF 正常结束，Windows 终端一般可在空行按 Ctrl+Z 再回车，POSIX 终端按 Ctrl+D；本轮自动验证采用关闭 stdin，未声称人工测试过这些按键。注释、引号、help 等业务语法均留到后续轮。

固定开发依赖为 TypeScript 5.9.3、tsx 4.23.15、Vitest 5.0.5、Vite 8.3.5、@types/node 22.15.3，均通过 npm 安装，锁文件纳入待提交文件。版本依据与工具链理由见 [D-01](decisions.md#d-01-工具链与目录)。

## 2. 架构方案

### 2.1 模块划分和职责

![模块依赖图](architecture.svg)

图源：[architecture.puml](architecture.puml)；兼容预览：[PNG](architecture.png)。实线为当前入口装配和测试依赖，虚线为规划依赖；领域层已实现但未接入入口。采用本地 Java 24.0.1 + PlantUML 1.2026.9 的 Smetana 布局，无需 Graphviz；工具 jar 放在被忽略的 `.tools/`，不作为项目依赖或提交内容。图源遵循 [PlantUML 官方命令行用法](https://plantuml.com/command-line)。

```powershell
java '-Djava.awt.headless=true' -jar .tools/plantuml.jar -charset UTF-8 -tsvg doc/architecture.puml
java '-Djava.awt.headless=true' -jar .tools/plantuml.jar -charset UTF-8 -tpng doc/architecture.puml
```

上述为本机重现命令，克隆仓库后需自行提供 PlantUML jar；运行 CLI 和测试不依赖 Java/PlantUML。

| 模块/目录 | 职责及计划中的类/接口 | 当前状态 |
|---|---|---|
| src/domain/ | Shape、六种具体类型、SvgDocument、ShapeFactory；TreeNode 封装结构，GeometricShape/Geometry 复用几何行为，Validation/DomainError/ShapeStyle 统一校验与契约 | 已实现 14 个类＋1 个样式接口，clone 保留类型和独立树/索引 |
| src/application/ | Command 与具体 CreateCommand 等；CommandDispatcher、EditorSession、HistoryManager；DocumentStore/SvgCodec 外部能力接口 | 仅规划 |
| src/cli/ | readline 终端外壳、Tokenizer、CommandParser；保留引号边界，格式化应用结果 | 已实现 CliShell 外壳；分词/解析/命令反馈未实现 |
| src/infrastructure/ | FileDocumentStore、XmlSvgCodec 实现接口；文件和 XML 库细节 | 仅规划，不提前选 XML 库 |
| src/bootstrap/ | main.ts 装配输入输出和 CLI；以后装配会话、工厂、端口适配器 | 已实现最小装配 |
| tests/ | 领域单元、结构/克隆/流程图集成、CLI 进程验收；未来加入应用/IO 测试 | 5 个测试文件共 74 项，其中领域 72 项、原启动测试 2 项 |
| examples/ | §6/§6.1 版本 A 命令脚本和配套 SVG | 只有范围说明，业务样例待实现 |
| doc/ | 正式提交文档、需求矩阵、决策与架构图 | 已同步第二轮实现范围与验证证据 |

与建议目录的唯一区别是暂不创建无代码目录；职责边界不变。所有已实现类独占同名文件；main.ts 是装配入口，不人为创建没有行为的 Main 类。结构/几何辅助类均实际被模型使用，不是占位框架。

### 2.2 设计模式选择与计划落地位置

**Command（规划）**：应用层的 Command 抽象及具体命令封装意图和参数；CommandDispatcher 是唯一按命令名选择实现的入口。EditCommand 进入候选文档事务；DocumentCommand 通过端口读写并建立历史边界；QueryCommand 输出只读结果；UndoCommand/RedoCommand 委托 HistoryManager。**Command 尚未实现**，领域方法不是 CLI 命令。

**Composite（已落实）**：Shape 统一 move/scale/set/clone 与 attributes；Group 有序持有 Shape 子节点并多态递归，叶子通过 GeometricShape/不可变 Geometry 更新自身字段。SvgDocument 通过 TreeNode 的受保护操作统一维护结构与 ID 索引；外层无容器写数组接口。普通 g 的样式仅保留在自身，未来序列化通过 SVG 继承呈现；本轮不做渲染或 box。

**Factory（已落实领域创建）**：ShapeFactory.create(type, id, attributes) 是唯一图形类型名分派点，构造六种具体类，未知类型包括 box 均抛 DomainError。工厂不读取 CLI token；未来参数 schema 和 XML 中立描述仍应进入这个单一分派点，显示/输出使用模型描述，不能在外层再 switch(tag)。未来将集中静态分派改成 bootstrap 装配的命令/ShapeProvider 注册表；本轮不实现动态注册机制。

规划协作流程：CliShell → Tokenizer/CommandParser → CommandDispatcher → EditorSession/HistoryManager → 领域对象；IO 走应用接口。当前仅有外壳和可独立调用的领域层。快照方案见 [D-03、D-06](decisions.md)：已实现 clone 保留类行为、顺序、父子关系与独立索引，复制 O(N)；候选会话提交及 O(HN) 历史存储仍是设计（此处 H 为历史项数）。

### 2.3 依赖方向规则及理由

| 模块 | 允许的项目依赖 | 禁止/理由 |
|---|---|---|
| domain | 自身纯领域代码 | 不依赖 application/cli/infrastructure/bootstrap，不用 readline、fs、XML 库；模型行为可独立测试 |
| application | domain；自身声明的端口 | 不引用具体 CLI/IO 实现；通过接口替换外部能力并注入故障测试 |
| cli | application；终端标准库 | 不直接依赖 domain 具体类或修改图形字段；只调用用例，保证多通道一致性 |
| infrastructure | application 中的接口、domain；fs/XML 库 | 不依赖 cli/bootstrap；只负责适配及格式，不承包核心几何行为 |
| bootstrap | 以上模块与进程流 | 只负责构造和连接，不放业务规则 |
| tests | 被测模块及测试工具 | 生产代码不能反向依赖 tests |

领域接口保持中立，不泄露 XML 库节点。当前唯一生产代码跨模块 import 为 bootstrap→cli，domain 只依赖自身的相对模块；tests 依赖领域模型。未引入终端、文件系统、XML 或外层依赖。未来违反方向即记为待处理项。

### 2.4 变化点假设、预留与不预留

| 变化点 | 预留的设计边界 | 暂不预留的能力与理由 |
|---|---|---|
| 新图形/box/插件 | Shape 多态与集中 ShapeFactory；Composite 有序树 | 无动态插件加载器/box；后续阶段再把集中分派改注册协议 |
| 命令扩展与多通道 | Command 对象、会话与 CLI 分离，统一 ID | 无 GUI、HTTP、路径寻址，当前没有需求 |
| 文件存储或 XML 实现替换 | 应用端口 DocumentStore/SvgCodec | 不提前安装 XML 库或做通用存储插件框架 |
| 历史性能 | HistoryManager 集中事务与快照协议 | 暂不做逆操作日志、持久化、拖拽事件合并，等待真实性能证据 |
| 更广 SVG 支持 | A-03 兼容边界和往返测试计划 | 不先写 transform 矩阵系统或任意 XML 透传 |

### 2.5 第二轮公开领域 API

| API | 当前契约 |
|---|---|
| `new SvgDocument(width = 800, height = 600, roots = [])` | 正有限画布尺寸；批量根构造原子验证后一次建索引；文档根无图形 ID |
| `document.find(id)` / `require(id)` | 返回原实例或 undefined；require 缺失时抛 DomainError；大小写敏感 |
| `document.insert(shape, parentId?, position?)` | 仅接受 detached 子树，省略父级为文档根；完整检查内部/外部重复 ID、父级与下标后挂入 |
| `document.remove(id)` | 返回被移除的原子树；子孙 ID 全部释放，内部父子关系保留，子树根 parent=null |
| `document.reparent(id, parentId?, position?)` | 同文档内重挂接；检查环；position 为移除后的最终位置，默认追加；索引仍指向原实例 |
| `document.resize(width, height)` | 先校验两尺寸再更新；只是领域操作，不等于 canvas 命令/历史屏障 |
| `shape.id/type/parent/children/attributes/style` | ID/父级只读；集合和属性为冻结副本；子元素仍提供行为方法 |
| `shape.move/scale/set` | 多态更新、严格白名单、溢出失败无部分修改；Group 样式不覆写孩子 |
| `shape.clone()` / `document.clone()` | 实际具体类独立副本；保持缺省样式、文本、顺序与新父链接/索引 |
| `ShapeFactory.create(type, id, attributes)` | 中立命名属性，如 rect 使用 width/height，数值已是 number；拒绝 box/未知类型及未知字段 |

结构细节与数值选择见 [D-04–D-06](decisions.md)。`Group` 无公开 add/remove 子节点接口，文档树和索引只能通过文档一起维护；单独 Group 构造用于组装 detached 树，不替代应用层 group 命令。

## 3. 需求范围与待确认事项

[需求矩阵](requirements.md) 用稳定编号关联章节、模块、验收场景与状态。第二轮增加 DOM 子需求记录领域验证；原命令/IO/历史需求仍待实现，不能把工厂创建当作 create 命令、把 clone 当作 undo/redo。纯领域树需求 STR-001 已验证。当前与规划的类明确区分见模块表。

四项主要歧义的暂定选择详见 [决策记录 A-01–A-04](decisions.md)：跨父 group 用最近共同祖先和原树顺序；成功文档操作清空两栈并禁用；外部 SVG 对不支持的语义明确拒绝、box 标记按普通 g 降级；成功显式 save 更新后续默认路径。它们均未获教师确认，尤其 transform 支持范围与原文背景示例有待核实。它们不阻塞本轮骨架，也不能当作验收标准已获批准。

## 4. 过程记录

以下只记本轮实际发生的工作，不编造用户确认或人工验收：

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

## 5. 一致性自查

| 检查 | 规划架构 | 当前骨架实际情况 | 结论/后续 |
|---|---|---|---|
| 模块划分 | domain/application/cli/infrastructure/bootstrap | 已有 domain/cli/bootstrap；application/infrastructure 留到需要时 | 符合分阶段方案；增加的内部结构/几何类见 D-04–06 |
| 类封装 | 一类一文件、图形类多态行为 | 领域 14 类均同名文件，继承 TreeNode/Shape/GeometricShape；状态为 #private | 领域实现符合；不以此代替未来应用层审查 |
| 模式 | Command/Composite/Factory | Composite 与集中 Factory 已实现并测试；Command 仍规划 | 不把领域方法称作命令对象 |
| 依赖方向 | 内层不依赖外层；bootstrap 装配 | domain import 均在 domain 内，无 node/IO/XML/CLI 依赖；入口仍只装配外壳 | 当前符合；这是源码审查，不声称已有永久自动守卫 |
| 名字分派 | 命令分发/图形工厂两处 | 唯一图形类型 switch 在 ShapeFactory；Shape 中另有属性白名单 switch | 属性校验不是按图形类型分派；CommandDispatcher 尚未实现 |
| 文档与状态 | 每轮同步更新 | 追加已验证 DOM 子项，完整 CLI/IO/历史项保持未实现 | 工厂不等于 create；clone 不等于 undo/redo |
| Git/交付 | 分步提交、远程、最终标签 | 第一轮已独立提交，origin/身份已配置；推送受认证阻碍 | 第二轮另作提交，不强推、不重写、不打 final |

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

已完成第二轮提交前检查。提交与推送沿用用户明确授权，认证失败时保留本地两轮提交，不合并、不改提交时间、不强推；最终哈希和远程核验结果以本轮交付回复及 Git 记录为准。

测试按行为分布：Shapes.test.ts 验证类型/属性/几何/原子性/Composite；SvgDocument.test.ts 验证树/索引/归属/顺序；Clone.test.ts 验证真实类和双向隔离；Flowchart.test.ts 构造 §6.1 版本 A，并确认只移动 node2 的矩形与文字。未使用同一套实现计算结果当作预期值，也未增加覆盖率工具或声称测得覆盖率。

### 后续计划（尚未执行）

- 持续扩展领域回归测试，当前核心行为已覆盖；以后新增语义时同步补测试。
- 参数化命令测试覆盖全部语法、白名单及规范错误；先做明确边界再扩展正常流程。
- 事务测试对比失败前后的完整会话：图形、当前文档、路径、两栈及历史禁用位；故障注入验证读写失败和 redo 保留。
- 临时目录集成测试覆盖 SVG 编码、补 ID 冲突、保存读回和兼容边界；XML 库选定后增加恶意/畸形输入测试。
- 按 §6 与 §6.1 版本 A 回放实际命令，保存真实样例，再在浏览器打开 SVG 记录视觉结果。
- 最终按 requirements.md 逐项填验证证据，审查面向对象、两处分派和依赖方向，持续维护 Git 提交历史；全部完成后才处理 final 标签。

本轮验证的是领域行为与外壳，不是完整 CLI 业务。没有覆盖率数字或人工浏览器验收结果，不以当前测试替代课程最终验收。

## 7. 第三轮接入注意事项（仅计划）

init 可通过 new SvgDocument 建立应用会话中的当前文档；create 应由应用 Command 使用 ShapeFactory.create 与 document.insert，数值转换和引号保留属于后续解析层；类型参数顺序/schema 从唯一工厂分派点获得，不能在 CLI 再复制类型分支。默认/显式样式必须保持区别，父容器通过 insert 校验，错误前缀由 CLI 统一加。

tree/show 可读取 roots、children、id/type、attributes 和 parent；只遍历/格式化只读视图，不修改字段。根是 SvgDocument，不存在用户指定的根图形 ID。若要类型专用摘要，添加多态描述行为，不能为每种图形写外部分支链。help 与参数语法说明由后续应用/解析契约统一提供。当前均未接入。

未来会话事务用 document.clone 准备候选，但本轮 clone 没有处理路径、历史或禁用位；应用层仍需独立保证失败命令不改会话、成功编辑一个撤销单元和历史屏障。第三轮即使只贯通部分命令，也不能将未实现的 undo/redo 当成完成。
