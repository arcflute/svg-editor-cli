# 第四轮：基础编辑和历史

开始日期：2026-10-30（Asia/Shanghai）。用户授权继续本地开发、暂缓推送。范围：move/scale/set/delete 与 undo/redo，按独立功能顺序提交；不实现分组、图层、read/save/canvas 或 SVG/XML。

基线：c6f7284，工作区干净；typecheck 与原 164 项测试通过。第三轮提交尚未推送，不修改旧提交或提交时间。

## 设计与实际进展

- 移动：新增 MoveCommand；提取 EditCommand.execute→EditorSession.executeEdit，create 和 move 共用候选副本提交。具体命令只能操作传入的候选，活动文档仍由会话私有持有。移除原会话专用 create 方法，统一入口为历史准备。移动摘要统一为 `type#id moved by (dx,dy)`；具体坐标由 show/tree 查询，无按图形类型显示分支。移动独立提交时尚未接历史，随后统一接入。
- 缩放：ScaleCommand 校验完整数值后调用模型 scale，位置与尺寸同乘；容器递归处理，文字内容/样式/画布尺寸不变。非正数使用原文规范错误，非有限词法输入先由通用数值解析器拒绝。
- 属性：Shape.attributeKind 从现有 ownAttributes 的字段和值类型导出几何/文本契约，另识别可能缺省的三项公共样式；SetCommand 在候选中按该契约完整转换数值，再调用模型 set。没有按图形类型建立第二份白名单。set 的值是一个词法 token，文本可不引用单个词，含空格必须引用；create 的 content 仍按第三轮约定要求引用。字符串反馈复用 TextPresenter，模型不做 XML 转义。
- 删除：DeleteCommand 仅通过 SvgDocument.remove 摘除叶子或整棵子树，索引同步释放；剩余兄弟顺序保持。文档根不是图形，普通图形可以使用 svg 作为 ID，不能通过 delete 删除文档根。
- 历史：HistoryEntry 持有真实 EditCommand、前后文档的独立克隆和成功输出；恢复时再克隆，不重跑命令。HistoryManager 的两个私有数组每次返回新的历史对象。EditorSession 用一个 state 引用同时提交文档/两栈/禁用位；快照、历史准备或恢复失败都不改变旧状态。成功 init 清空两栈并禁用，下一成功编辑解禁；普通空栈使用 nothing to undo/redo，禁用时 undo/redo 均使用作业规定的 undo not allowed after io command。
- 一条成功编辑恰好一条历史，包括 move 0/0、scale 1、set 相同值及空组变换；这些成功操作也清 redo。查询、空行、注释和失败输入不改变历史。undo 摘要为 `undone: <命令意图>`，redo 重用原成功摘要；坐标和树可再查询。输出样式是项目选择，未宣称逐字复制作业所有示例摘要。
- 历史每个节点快照 O(N)，数组迁移 O(H)，一次编辑/撤销/重做为 O(N+H)，总历史空间 O(HN)；当前不设原文未要求的容量上限。类实例、链接、顺序、缺省样式和独立索引由领域 clone 保留。文件路径不在本轮状态中，IO 屏障待后续接入。
- 调整旧测试：第三轮候选引用测试假定下一次 clone 的固定调用下标；历史增加前后快照克隆后，改为记录下一次编辑前的调用边界，再断言它从已提交候选开始。该调整来自实现复核，没有虚构先发生测试失败。当前功能检查尚未遇到产品代码测试失败。

## 验证记录

1. 移动：`npm run typecheck` 退出 0；`npm test -- tests/application/MoveCommand.test.ts tests/application/Commands.test.ts` 通过，2 文件 84 项。覆盖旧创建/查询回归以及新移动功能；未把后续历史标为完成。
2. 缩放：`npm run typecheck` 退出 0；`npm test -- tests/application/ScaleCommand.test.ts tests/application/Commands.test.ts` 通过，2 文件 87 项。
3. 属性：`npm run typecheck` 退出 0；`npm test -- tests/application/SetCommand.test.ts tests/application/Commands.test.ts tests/domain/Shapes.test.ts` 通过，3 文件 161 项；覆盖领域回归和描述驱动的输入转换。
4. 删除：`npm run typecheck` 退出 0；`npm test -- tests/application/DeleteCommand.test.ts tests/application/Commands.test.ts` 通过，2 文件 83 项。
5. 历史第一轮：`npm run typecheck` 退出 0；`npm test -- tests/application/History.test.ts tests/application/Commands.test.ts` 通过，2 文件 101 项。包含文档＋历史状态对比、late snapshot/history failure 与 undo/redo 恢复失败注入。
6. 全量 `npm run typecheck`、`npm test`、`npm run build` 退出 0；14 文件、292 项测试通过。两个入口实际回放 round4.commands.txt，均退出 0、stderr 空、业务输出一致；回放节选见 examples/README.md。
7. AST/import 检查通过：36 个类均同名且一类一文件；domain 无外层依赖，cli 只调 application；应用层未增加图形类型分支。109 个唯一需求编号，66 已验证/43 未实现；7 份 Markdown 共 30 个本地文件链接目标存在（不校验锚点）。锁文件与依赖声明一致，原文 SHA-256 未变。
8. 本地 PlantUML checkonly、SVG/PNG 生成成功并查看第四轮图片；本轮 git diff --check 通过，构建目录/依赖/工具仍忽略。

## 本地提交节点

- e79c17c：移动命令与共用候选编辑入口。
- aa92715：递归缩放命令。
- 5996f20：属性契约与 set 命令。
- 4fdbf55：子树删除命令。
- 历史功能的后续独立提交见 Git 日志与交付回复；不把提交自身哈希回写进同一个提交。

以上按实际工作顺序建立，各自带测试/文档。用户本轮明确允许推送留待后续，未重试推送或安排自动定时推送，未打 final 标签。
