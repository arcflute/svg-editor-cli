# SVG 编辑器（CLI）个人 Lab：正式提交文档

## 1. 项目信息和运行方式

- 课程：《高级软件开发技术》；作业：Lab1 Phase 1。
- 作者：李炯燃；学号：26213050243；截止日期：2026-10-31（用户提供）。
- 仓库：[arcflute/svg-editor-cli](https://github.com/arcflute/svg-editor-cli)，分支 main，origin 为该仓库 HTTPS Git 地址。
- 原文：[phase_cli_1.md](../phase_cli_1.md)，全文保持不变。
- 当前实现：19 条命令、六类型领域模型、嵌套树、分组/图层、快照撤销重做、SVG 文件读写。box 和动态插件属于后续阶段。
- 验收日期：2026-10-30，Asia/Shanghai；预览和远程交付状态见 [acceptance.md](acceptance.md)。

环境：Windows PowerShell、Node.js 22.15.0、npm 10.9.2、Git 2.39.1.windows.1。要求 Node 22（>=22.15.0）、npm 10+；其他主版本未验证。TypeScript 5.9.3、tsx 4.23.15、Vitest 5.0.5、Vite 8.3.5、@types/node 22.15.3、saxes 6.0.0 精确锁定，传递依赖由 package-lock.json 固定。

```sh
npm ci
npm run cli
npm run typecheck
npm test
npm run build
node dist/bootstrap/main.js
```

测试一次执行后退出。CLI 显示启动信息和 `svg> `，逐行读取，EOF 退出；不新增 exit/quit。单条错误写 stderr 一行 `error: ...`，不终止后续命令。help 无需文档。

| 类别 | 命令 |
|---|---|
| 文档 | init、read、save、canvas |
| 编辑 | create、delete、move、scale、set、group、ungroup、addto、front、back |
| 查询 | tree、show、help |
| 历史 | undo、redo |

坐标可负，几何尺寸/半径/描边宽度可零；画布尺寸与缩放因子必须是有限正数。仅整行 # 注释；命令内部 #ffffff 是颜色。双引号支持空格/中文及 `\"`、`\\`，不是 shell。路径建议使用 `/`，如 `save "G:/drawings/my image.svg"`；引号中的反斜杠须转义。

所有 create 支持尾部未引用的 `in <gid>`。text 原值由模型保存，XML 转义仅在保存时发生。省略 fill/stroke 不写默认样式。运行样例和实际 SVG 见 [examples/README.md](../examples/README.md)。

成功 init/read/save/修改 canvas 清空并禁用历史，下一次成功编辑解禁；canvas 查询无副作用。每条成功编辑一个撤销单元，包括合法 no-op。成功新编辑清 redo，失败不清。无参数 save 使用最近成功 read/显式 save 的绝对路径；init 清除路径。

## 2. 架构方案

### 2.1 模块划分和职责

![模块依赖图](architecture.svg)

[PlantUML 图源](architecture.puml) · [PNG](architecture.png)。图中各模块均已落地；注册/插件重构仍为规划。本地 Java 24.0.1 + PlantUML 1.2026.9/Smetana 生成，工具放在被忽略的 .tools，不是运行依赖。

| 模块 | 当前职责 |
|---|---|
| domain | Shape 与六类型；SvgDocument/TreeNode 维护根、父级、顺序和 ID；Geometry 封装几何；ShapeFactory 集中构造；多态 clone/展示/ShapeElement 描述 |
| application | 19 种 Command、EditCommand、Dispatcher、ArgumentParser、EditorSession；HistoryManager/HistoryEntry；只读视图/TextPresenter；DocumentStore/SvgCodec 端口 |
| cli | Tokenizer 保留引号来源；CliShell 负责输入、提示符、结果/错误与 EOF |
| infrastructure | FileDocumentStore 的 UTF-8 读写和临时文件替换；XmlSvgCodec 的 XML 校验、两遍 ID 和通用元素遍历 |
| bootstrap | main.ts 注入工厂、文件/编码适配器、会话、分发器及终端流 |
| tests | 领域/分词/命令/历史事务、故障注入、真实文件及 CLI 回放 |
| examples / doc | 可执行样例、真实生成 SVG、需求矩阵、决策、架构、过程与验收证据 |

一类一文件同名；接口/DTO 可独立成文件。main.ts 仅装配，不制造空 Main 类。图形具有自身行为，传输描述不代替领域模型。

### 2.2 设计模式与协作

**Command**：命令对象封装参数/意图，十个编辑命令继承 EditCommand，对候选文档执行 apply，由会话统一生成历史项。文档、查询和历史命令调用相应会话行为。CommandDispatcher 是唯一命令名分派点，help 共用其目录。

**Composite**：Shape 统一 move/scale/set/clone/描述；Group 有序持有 Shape，递归变换先准备全部结果，再提交，每个叶子处理一次。SvgDocument 是无 ID 文档根，不是可编辑 g；与 Shape 通过 TreeNode 共用受控结构机制。Group 不暴露绕过索引的 addChild。

**Factory**：ShapeFactory 唯一映射“类型名→具体类”，构造和参数元数据同源。CLI create 与 XML 导入都使用它；移动、显示和写出走多态行为/描述，不重新分派六类型。

调用路径：CliShell → Tokenizer → CommandDispatcher → Command → EditorSession → domain/应用端口；结果经只读视图/TextPresenter 返回终端。ShapeElement 是中立只读描述，Text 自己区分子文本与属性，XML 层只通用遍历。

### 2.3 依赖方向与理由

| 模块 | 允许依赖 | 理由 |
|---|---|---|
| domain | 仅自身 | 无终端、文件系统、XML 库或外层，可独立测试 |
| application | domain、自有接口 | 无具体 IO/终端，便于故障注入 |
| cli | application、终端标准库 | 不直接修改图形 |
| infrastructure | 应用端口、domain、Node IO/saxes | 实现外部能力，不承包几何或历史 |
| bootstrap | 所有模块 | 构造与业务隔离 |

源码审查覆盖 58 个 TS 源文件、46 个同名类；静态导入方向检查通过。唯一 switch 是公共属性白名单，不是类型分派。

### 2.4 变化点假设与取舍

| 变化点 | 已预留边界 | 暂不实现及理由 |
|---|---|---|
| 新图形/box/插件 | Shape 多态、Factory、Composite | 后续改 ShapeProvider 注册；不提前做加载/版本协议 |
| 新命令/其他交互 | Command 与会话独立于终端 | 后续由 bootstrap 注册命令；不做 GUI/HTTP/路径寻址 |
| 文件来源/XML 库 | DocumentStore/SvgCodec | 当前小型本地 CLI 用同步端口；网络后端再调整异步协议 |
| 大文档/长历史 | 集中历史策略、clone 协议 | 不做增量日志、自动合并、持久历史，等待性能证据 |
| 更广 SVG 语义 | 显式边界、往返和拒绝测试 | 不提前支持任意 transform/path/字体布局，不静默丢失未知内容 |

### 2.5 快照、结构与 IO 事务

编辑先 clone 活动文档，命令仅操作候选；准备 before/after 快照、输出及新历史后一次替换会话状态。具体图形复制真实类和方法，Group 按序复制，文档重建父链接与独立 ID 索引。undo/redo 再克隆目标快照；没有 JSON 克隆。

TreeNode 的结构写入先准备新集合/顺序/父级/索引再提交。move/scale 先检查计算结果，阻止后代溢出造成部分修改。跨文档共享可变实例被拒绝，需要 clone 后插入。

read 在隔离候选完成 XML/显式 ID/自动 ID/结构校验，成功后才输出警告并替换状态。save 先序列化副本并准备新路径/历史，再写同目录独占临时文件、关闭并 rename；失败保留旧文件及会话，清理只触及自己的临时文件。编码器改副本再失败也不污染模型。不承诺断电事务或 stdout 设备故障的业务回滚。

N 为文档节点/文本总量、H 为历史数：编辑/恢复 O(N+H)，历史最坏 O(HN)。适合数十至数百节点的课程 CLI；未做性能基准。实际出现瓶颈再考虑增量 memento、结构共享和检查点。

## 3. 需求与未确认语义

编号、原文章节、场景与状态见 [requirements.md](requirements.md)。以下是项目暂定选择，未获教师确认：

- 跨父 group 采用最近公共祖先、原树先序，在最早涉及的直接分支前插入；旧空组保留。同父按原兄弟顺序。根级 g 禁止 ungroup；解组删除组样式，不展开继承属性。
- 成功文档操作清空旧两栈并禁用，不跨 read/init 恢复旧文档；canvas 查询不触发屏障。
- 显式 save 成功更新后续默认路径，失败不改路径。
- 外部 SVG 采用六类型/白名单、XML 1.0/UTF-8、匹配 viewBox 的子集。transform、未知元素、额外字体/style 属性、嵌套 svg 等明确拒绝；`g data-kind="box"` 降为普通 g 并警告。**不支持任意 SVG，原文背景中含 transform 的示例当前不能读入。**

具体理由、数值/词法边界、XML 库维护状态和 skipLibCheck 取舍见 [decisions.md](decisions.md)。若教师要求更宽兼容范围，应先调整模型和验收；不能把假设写成作业明文允许的裁剪。

## 4. 真实开发过程

前四轮记录保留于 [history.md](history.md)、[round4.md](round4.md)；本次三部分见 [round5.md](round5.md)。用户决定范围和提交方式，AI 协助实现/测试/文档；没有虚构人工审查、师生讨论或逐项确认。

| 开发节点 | 真实提交 |
|---|---|
| 初始化/需求/架构 | c6b5e137ccd1fa8fb760844efb87d17d08660144 |
| 领域/树/克隆 | b930b61cb561aaf07d5154ba84d051b71c66b902 |
| 远程同步文档 | a3beb436e6f02710da6a986b3799173768551ea0 |
| 分词/创建/查询 | c6f728404572bb445fb13ee8106a6594ddcf5697 |
| move / scale / set / delete | e79c17c / aa92715 / 5996f20 / 4fdbf55 |
| 快照撤销重做 | 06967aa |
| 本次分组/图层 | ab81c87，已推送 |
| 本次画布/SVG IO | 0fa46d9，推送实际状态见验收记录 |
| 本次完整验收/文档 | 验证后独立提交，以 Git 历史及交付回复记录真实哈希 |

真实问题及修正：第三方 XML 类型声明与严格 TS 选项不兼容，略过第三方声明内部检查但保留源码 strict；Windows ESM --import 改 file URL；工厂接管孩子前验证父属性。均在发生时记录并验证。

## 5. 一致性自查

| 项目 | 当前实现与证据 |
|---|---|
| OOP/封装 | 46 类同名且独占文件；模型有行为，私有字段/冻结集合保护状态 |
| 模式 | 19 命令、10 编辑子类、Group 多态递归、唯一工厂 |
| 两处分派 | CommandDispatcher 和 ShapeFactory；XML/显示/几何不重复类型分支 |
| 结构/失败原子性 | 树/父级/顺序/索引共同更新；溢出、环、ID 和 IO 故障测试 |
| 快照/历史 | 真实类独立索引、一编辑一单元、失败保留 redo、文档屏障/查询无副作用 |
| 模块边界 | domain 无外层/IO，CLI 仅调 application，适配器经接口注入 |
| 当前与规划 | 19 命令已接通；box、动态注册、完整 transform、增量历史均尚未实现 |
| 文档/Git | 需求/测试/过程逐步维护；不改原文，不提交依赖/构建产物，不重写时间/历史 |

## 6. 质量保证

实际运行 typecheck、test、build；当前 21 个文件、393 项通过，一次退出。领域/应用采用固定预期，故障注入覆盖快照、历史、编码、路径和文件替换；真实子进程覆盖启动、错误恢复、快速多行、EOF 与文件回放。

作业 §6 和 §6.1 A 均经开发/编译入口运行，输出一致、退出 0；§6 两条预期错误，流程图无错误。临时目录真实产物复制为 [demo.svg](../examples/demo.svg)、[flowchart.svg](../examples/flowchart.svg)，非手工伪造。19 条帮助和规范错误有进程测试。没有覆盖率百分比、性能基准或教师验收声明。

最终重装复验、图源/图像、浏览器预览、文档链接、矩阵、原文哈希、Git 同步与 final 标签记录见 [acceptance.md](acceptance.md)。未完成项明确标注，不以测试数量代替。
