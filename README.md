# SVG 编辑器 CLI

《高级软件开发技术》个人 Lab。第四轮已支持六种图形、嵌套容器、创建/查询、基础编辑及快照撤销重做。可用命令：`init/create/tree/show/help/move/scale/set/delete/undo/redo`。分组/图层和 SVG 文件读写留到后续轮。

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

Git 仓库：[arcflute/svg-editor-cli](https://github.com/arcflute/svg-editor-cli)，目标分支 `main`。第一、二轮已推送；2026-10-30 实际核对远程 main 仍为 `a3beb43`。第三轮 `c6f7284` 因网络问题未推送，第四轮按用户新授权先按功能分别本地提交，暂缓推送，不改旧历史。过程见 [第四轮记录](doc/round4.md)。最终验收前不打 `final` 标签。
