# 项目协作约定

- 先完整阅读 phase_cli_1.md；作业原文不得修改。当前轮范围服从用户任务，不能自动推进下一轮。
- 阅读 doc/requirements.md、doc/README.md 与 doc/decisions.md；区分作业明文、项目选择和未确认假设。
- 使用 TypeScript、Node.js、npm、Vitest。类封装行为，一类一文件且同名；不得采用公共数据袋配过程式图形操作。
- 必须落实 Command 与 Composite；按命令名/图形类型名分派仅集中于 CommandDispatcher 与 ShapeFactory。移动、缩放、显示和 XML 模块不得各自重复类型分支。
- 本阶段仅内置 rect/circle/ellipse/line/text/g；box 和动态插件留到后续阶段。
- domain 不依赖外层或 IO/XML；application 通过自有接口用外部能力；cli 仅调 application；infrastructure 实现端口；bootstrap 装配。
- 每轮同步更新功能、测试、需求状态和真实过程记录。未执行的检查只写计划，假设不能写成教师确认。
- 适当运行 npm run typecheck、npm test、npm run build 与入口验证。package-lock.json 应跟随依赖变更；不提交 node_modules、dist、日志或本地工具。
- 保留不相关文件/修改，不猜测 Git 身份；远程、推送和 final 标签按用户当前授权及作业阶段处理。
- 按独立功能逐步完成代码、测试和文档，并分别建立真实提交；不等全部功能完成后一次提交，不人为修改提交时间。当前用户允许先完成本地开发，推送时机另行处理。
