# SVG 编辑器 CLI

《高级软件开发技术》个人 Lab。现已实现 Phase 1 的 19 条 CLI 命令：六种图形、嵌套容器、编辑/分组/图层、撤销重做、画布及 SVG 文件读写。最终场景和浏览器验收正在进行；box 与动态插件属于后续阶段。

需要 Node.js 22（>=22.15.0）与 npm 10+。

```sh
npm ci
npm run cli
npm run typecheck
npm test
npm run build
```

CLI 显示 `svg>`，输入 `help` 查看语法。EOF 退出，不提供 exit/quit。构建后可运行 `node dist/bootstrap/main.js`。

```text
init
create g scene
create rect r1 10 20 100 50 #4a90d9 in scene
create text t1 20 45 "你好 SVG" in scene
tree
show r1
move scene 10 20
set r1 fill red
undo
redo
```

脚本回放方法与引号规则见 [examples/README.md](examples/README.md)，创建/查询样例为 [round3.commands.txt](examples/round3.commands.txt)，编辑/历史样例为 [round4.commands.txt](examples/round4.commands.txt)。成功 init 清空并禁用历史，下一次成功编辑解禁；失败编辑保留文档和历史，成功新编辑清空 redo。

- [正式提交文档、架构与真实过程记录](doc/README.md)
- [需求及验收矩阵](doc/requirements.md)
- [设计决策与待确认事项](doc/decisions.md)
- [原始作业要求](phase_cli_1.md)

Git 仓库：[arcflute/svg-editor-cli](https://github.com/arcflute/svg-editor-cli)，目标分支 `main`。截至本轮开始，第四轮全部提交（最新 `06967aa`）已同步。接下来三部分各自完成后提交并推送，见 [开发记录](doc/round5.md)。最终验收完成后再打 `final` 标签。

文件示例：`save "drawing.svg"`、`read "drawing.svg"`、`canvas 1024 768`。无参数 save 使用最近成功读入/保存路径；init 清除路径。init/read/save/修改 canvas 成功清空并禁用历史，canvas 查询不改变历史。外部 SVG 兼容范围见正式文档与 A-03：不静默忽略 transform 或未知属性。
