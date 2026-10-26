# SVG 编辑器（CLI）个人 Lab：正式提交文档初版

## 1. 项目信息和运行方式

- 课程：《高级软件开发技术》；作业：Lab1 Phase 1。
- 作业基线：[phase_cli_1.md](../phase_cli_1.md)，保持原文不变。
- Git 仓库地址：[arcflute/svg-editor-cli](https://github.com/arcflute/svg-editor-cli)。本项目独立仓库的 origin 为 `https://github.com/arcflute/svg-editor-cli.git`，目标分支 main。
- 当前进度：第一轮——需求分析、架构设计、工程初始化与最小启动验证。**图形、业务命令、SVG 读写与历史均未实现**。
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

图源：[architecture.puml](architecture.puml)；兼容预览：[PNG](architecture.png)。图中实线为当前 `main.ts → CliShell` 依赖，虚线为规划依赖。已用本地 Java 24.0.1 + PlantUML 1.2026.9 的 Smetana 布局生成，无需 Graphviz；工具 jar 放在被忽略的 `.tools/`，不作为项目依赖或提交内容。图源遵循 [PlantUML 官方命令行用法](https://plantuml.com/command-line)。

```powershell
java '-Djava.awt.headless=true' -jar .tools/plantuml.jar -charset UTF-8 -tsvg doc/architecture.puml
java '-Djava.awt.headless=true' -jar .tools/plantuml.jar -charset UTF-8 -tpng doc/architecture.puml
```

上述为本机重现命令，克隆仓库后需自行提供 PlantUML jar；运行 CLI 和测试不依赖 Java/PlantUML。

| 模块/目录 | 职责及计划中的类/接口 | 当前状态 |
|---|---|---|
| src/domain/ | Shape、Rect、Circle、Ellipse、Line、Text、Group；SvgDocument 根树/唯一索引；ShapeFactory 类型构造；几何、结构约束及 deepClone | 仅规划，尚未建目录/空类 |
| src/application/ | Command 与具体 CreateCommand 等；CommandDispatcher、EditorSession、HistoryManager；DocumentStore/SvgCodec 外部能力接口 | 仅规划 |
| src/cli/ | readline 终端外壳、Tokenizer、CommandParser；保留引号边界，格式化应用结果 | 已实现 CliShell 外壳；分词/解析/命令反馈未实现 |
| src/infrastructure/ | FileDocumentStore、XmlSvgCodec 实现接口；文件和 XML 库细节 | 仅规划，不提前选 XML 库 |
| src/bootstrap/ | main.ts 装配输入输出和 CLI；以后装配会话、工厂、端口适配器 | 已实现最小装配 |
| tests/ | 领域单元、事务/应用、SVG 集成、CLI 进程验收 | 已有 2 项进程启动冒烟测试 |
| examples/ | §6/§6.1 版本 A 命令脚本和配套 SVG | 只有范围说明，业务样例待实现 |
| doc/ | 正式提交文档、需求矩阵、决策与架构图 | 本轮初版 |

与建议目录的唯一区别是暂不创建无代码目录；职责边界不变。每个类将独占同名文件；main.ts 是装配入口，不人为创建没有行为的 Main 类。

### 2.2 设计模式选择与计划落地位置

**Command**：应用层的 Command 抽象及 CreateCommand、MoveCommand、GroupCommand、SaveCommand 等具体命令封装意图和验证后的参数。CommandDispatcher 是唯一按命令名选择实现的入口。EditCommand 进入候选文档事务；DocumentCommand 通过端口读写并建立历史边界；QueryCommand 输出只读结果；UndoCommand/RedoCommand 委托 HistoryManager。当前只有 CLI 外壳，**Command 尚未实现**。

**Composite**：Shape 抽象统一 move/scale/set/deepClone 与描述行为；Group 封装有序 Shape 子节点，递归调用行为，叶子各自实现几何更新。SvgDocument 是文档聚合与根容器管理者，负责结构/ID 不变量；删除和重挂接调用其封装方法，命令不改数组和父链接。普通 g 的公共样式保留在自身，通过 SVG 继承表达；不做 box 的字段传播。禁止把模型变成数据袋再在外层按 tag 操作。

**Factory**：domain/ShapeFactory 是唯一图形类型名分派点，集中六种内置类的创建及导入构造。read 的 XML 库对象先转为中立描述，仍通过这个工厂；显示与输出由图形多态生成只读描述，通用格式器处理，不再 switch(tag)。两处分派明确标为未来重构点：在后续命令/插件扩展需要时转为由 bootstrap 装配的命令注册表和 ShapeProvider 注册表；本轮不实现注册机制。

协作流程：CliShell 读行 → Tokenizer/CommandParser 形成通用请求 → CommandDispatcher 构造命令 → EditorSession/HistoryManager 管理事务 → ShapeFactory/SvgDocument/Shape 完成行为。文件能力由应用接口调用 infrastructure；输出以结果/警告返回 CLI。完整快照设计见 [D-03](decisions.md#d-03-命令对象与文档快照仅设计)：用各类 deepClone 保留行为，按树重建父链接、顺序与 ID 索引，执行候选副本后整体提交；不是直接 JSON 还原。复杂度 O(N) 每次、O(HN) 历史空间，适合本 Lab 小文档；历史系统本轮不编码。

### 2.3 依赖方向规则及理由

| 模块 | 允许的项目依赖 | 禁止/理由 |
|---|---|---|
| domain | 自身纯领域代码 | 不依赖 application/cli/infrastructure/bootstrap，不用 readline、fs、XML 库；模型行为可独立测试 |
| application | domain；自身声明的端口 | 不引用具体 CLI/IO 实现；通过接口替换外部能力并注入故障测试 |
| cli | application；终端标准库 | 不直接依赖 domain 具体类或修改图形字段；只调用用例，保证多通道一致性 |
| infrastructure | application 中的接口、domain；fs/XML 库 | 不依赖 cli/bootstrap；只负责适配及格式，不承包核心几何行为 |
| bootstrap | 以上模块与进程流 | 只负责构造和连接，不放业务规则 |
| tests | 被测模块及测试工具 | 生产代码不能反向依赖 tests |

领域 DTO/接口保持中立，不泄露 XML 库节点。当前唯一跨模块 import 为 bootstrap→cli，符合规则；未来违反方向即记为待处理项，不能以“先能运行”为由静默保留。

### 2.4 变化点假设、预留与不预留

| 变化点 | 预留的设计边界 | 暂不预留的能力与理由 |
|---|---|---|
| 新图形/box/插件 | Shape 多态与集中 ShapeFactory；Composite 有序树 | 无动态插件加载器/box；后续阶段再把集中分派改注册协议 |
| 命令扩展与多通道 | Command 对象、会话与 CLI 分离，统一 ID | 无 GUI、HTTP、路径寻址，当前没有需求 |
| 文件存储或 XML 实现替换 | 应用端口 DocumentStore/SvgCodec | 不提前安装 XML 库或做通用存储插件框架 |
| 历史性能 | HistoryManager 集中事务与快照协议 | 暂不做逆操作日志、持久化、拖拽事件合并，等待真实性能证据 |
| 更广 SVG 支持 | A-03 兼容边界和往返测试计划 | 不先写 transform 矩阵系统或任意 XML 透传 |

## 3. 需求范围与待确认事项

[需求矩阵](requirements.md) 用稳定编号关联章节、模块、验收场景与状态，覆盖全部命令/白名单/错误/历史/结构/IO/交付要求。当前业务全部“未实现”；文档中的类名和测试场景是规划，不代表已有代码或通过测试。

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

## 5. 一致性自查

| 检查 | 规划架构 | 当前骨架实际情况 | 结论/后续 |
|---|---|---|---|
| 模块划分 | domain/application/cli/infrastructure/bootstrap | 仅 cli/CliShell.ts、bootstrap/main.ts；其余随实现创建 | 分阶段落实，未偏离职责；已记录不建空目录的选择 |
| 类封装 | 一类一文件、图形类多态行为 | 唯一类 CliShell 同名文件，流为 private readonly；main 为装配 | 骨架符合；图形类层次尚不能验收 |
| 模式 | Command/Composite/Factory | 均仅设计，无假实现 | 业务轮实现后逐项审查 ARC-002–004 |
| 依赖方向 | 内层不依赖外层；bootstrap 装配 | 已读 import：bootstrap→cli；cli 仅 node:readline/node:stream | 当前无反向依赖；未部署自动架构守卫 |
| 名字分派 | 仅两个规划位置 | 当前无命令/类型名分派，统一拒绝非空输入 | 尚不能据此宣称业务符合；以后检查所有分派点 |
| 文档与状态 | 每轮同步更新 | 矩阵区分骨架验证与业务未实现 | 不把设计完成混作功能完成 |
| Git/交付 | 分步提交、远程、最终标签 | 已配置用户指定的项目身份和 origin，第一轮基线即将独立提交 | 两轮分别提交与推送；final 留到最终验收 |

## 6. 质量保证手段

### 本轮实际执行

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

### 后续计划（尚未执行）

- 领域单元测试覆盖六类型几何/封装、结构/ID 不变量、深拷贝后方法可用、顺序与父链接独立。
- 参数化命令测试覆盖全部语法、白名单及规范错误；先做明确边界再扩展正常流程。
- 事务测试对比失败前后的完整会话：图形、当前文档、路径、两栈及历史禁用位；故障注入验证读写失败和 redo 保留。
- 临时目录集成测试覆盖 SVG 编码、补 ID 冲突、保存读回和兼容边界；XML 库选定后增加恶意/畸形输入测试。
- 按 §6 与 §6.1 版本 A 回放实际命令，保存真实样例，再在浏览器打开 SVG 记录视觉结果。
- 最终按 requirements.md 逐项填验证证据，审查面向对象、两处分派和依赖方向，持续维护 Git 提交历史；全部完成后才处理 final 标签。

本轮没有覆盖率数字、业务正确性结论或人工浏览器验收结果；不以启动测试替代课程最终验收。
