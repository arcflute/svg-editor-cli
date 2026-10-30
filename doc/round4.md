# 第四轮：基础编辑和历史

开始日期：2026-10-30（Asia/Shanghai）。用户授权继续本地开发、暂缓推送。范围：move/scale/set/delete 与 undo/redo，按独立功能顺序提交；不实现分组、图层、read/save/canvas 或 SVG/XML。

基线：c6f7284，工作区干净；typecheck 与原 164 项测试通过。第三轮提交尚未推送，不修改旧提交或提交时间。

## 设计与实际进展

- 移动：新增 MoveCommand；提取 EditCommand.execute→EditorSession.executeEdit，create 和 move 共用候选副本提交。具体命令只能操作传入的候选，活动文档仍由会话私有持有。移除原会话专用 create 方法，统一入口为后续历史准备。移动摘要统一为 `type#id moved by (dx,dy)`；具体坐标由 show/tree 查询，无按图形类型显示分支。历史尚未接入。
- 缩放：ScaleCommand 校验完整数值后调用模型 scale，位置与尺寸同乘；容器递归处理，文字内容/样式/画布尺寸不变。非正数使用原文规范错误，非有限词法输入先由通用数值解析器拒绝。
- 属性：Shape.attributeKind 从现有 ownAttributes 的字段和值类型导出几何/文本契约，另识别可能缺省的三项公共样式；SetCommand 在候选中按该契约完整转换数值，再调用模型 set。没有按图形类型建立第二份白名单。set 的值是一个词法 token，文本可不引用单个词，含空格必须引用；create 的 content 仍按第三轮约定要求引用。字符串反馈复用 TextPresenter，模型不做 XML 转义。
- 删除和历史：待实现。

## 验证记录

1. 移动：`npm run typecheck` 退出 0；`npm test -- tests/application/MoveCommand.test.ts tests/application/Commands.test.ts` 通过，2 文件 84 项。覆盖旧创建/查询回归以及新移动功能；未把后续历史标为完成。
2. 缩放：`npm run typecheck` 退出 0；`npm test -- tests/application/ScaleCommand.test.ts tests/application/Commands.test.ts` 通过，2 文件 87 项。
3. 属性：`npm run typecheck` 退出 0；`npm test -- tests/application/SetCommand.test.ts tests/application/Commands.test.ts tests/domain/Shapes.test.ts` 通过，3 文件 161 项；覆盖领域回归和描述驱动的输入转换。
