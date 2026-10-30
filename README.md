# SVG 编辑器 CLI

《高级软件开发技术》个人 Lab。第四轮已支持六种图形、嵌套容器、创建/查询、基础编辑及快照撤销重做。可用命令：`init/create/tree/show/help/move/scale/set/delete/undo/redo`。新增 `group/ungroup/addto/front/back`；SVG 文件读写仍待下一部分。

需要 Node.js 22（>=22.15.0）与 npm 10+。

```sh
npm ci
npm run cli
npm run typecheck
npm test
npm run build
```

CLI 显示 `svg>`，输入 `help` 查看语法；后续命令明确标为尚未实现。EOF 退出，不提供 exit/quit。构建后可运行 `node dist/bootstrap/main.js`。

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
