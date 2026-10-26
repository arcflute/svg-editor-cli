# SVG 编辑器 CLI

《高级软件开发技术》个人 Lab。当前完成需求、架构、启动骨架，以及六类型领域模型、文档树约束和深拷贝；CLI 业务命令尚未实现。

需要 Node.js 22（>=22.15.0）与 npm 10+。

```sh
npm ci
npm run cli
npm run typecheck
npm test
npm run build
```

CLI 显示 `svg>`，读取输入并明确提示命令尚未实现；EOF 退出。构建后可运行 `node dist/bootstrap/main.js`。

- [正式提交文档、架构与真实过程记录](doc/README.md)
- [需求及验收矩阵](doc/requirements.md)
- [设计决策与待确认事项](doc/decisions.md)
- [原始作业要求](phase_cli_1.md)

Git 仓库：[arcflute/svg-editor-cli](https://github.com/arcflute/svg-editor-cli)，目标分支 `main`。第一轮独立提交为 `c6b5e137ccd1fa8fb760844efb87d17d08660144`，第二轮为 `b930b61cb561aaf07d5154ba84d051b71c66b902`；已确认两轮均保留在远程历史中，本地 main 跟踪 origin/main。此前的 HTTPS 认证阻碍已解除。最终验收前不打 `final` 标签。
