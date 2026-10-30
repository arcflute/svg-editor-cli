# 后续三部分开发记录

2026-10-30，用户授权依次完成分组/图层、画布与 SVG IO、最终验收；每部分完成测试和文档后独立提交、推送，不压缩旧历史。作者李炯燃，学号 26213050243；用户提供截止日期 2026-10-31。

## 第一部分：分组与图层

基线 `06967aa` 已在远程 main，本地工作区干净；重新 typecheck 与测试，292 项通过。

新增 GroupCommand、UngroupCommand、AddToCommand、FrontCommand、BackCommand，均复用 EditCommand 的候选文档和单历史项事务。SvgDocument 提供 group/ungroup/reorder 受控入口；TreeNode 先准备完整顺序、父级与索引再提交，不依赖 CLI 保证原子性。

落实暂定 A-01：同父按原兄弟顺序，在最早选中位置插入；跨父采用最近公共祖先，按原树先序排列，在最早涉及的直接分支之前插入。空的旧父组保留；单节点分组允许。ungroup 以孩子替换原组位置，移除组本身及其样式，不把组样式复制给后代。front/back 只改变同级顺序，已经在目标边界也算成功编辑。

结构测试验证原实例、索引、父级与顺序；应用测试覆盖跨父、根 LCA、空组提升、循环/重复/缺失 ID、参数守卫、失败保留 redo 和一条命令一次撤销。新增测试后 `npm run typecheck`、`npm test`、`npm run build` 均退出 0，16 文件共 324 项通过。开发/编译入口回放和图源检查结果在提交前补记。

提交前执行 structure.commands.txt 的开发/编译入口回放：退出 0、stderr 空，确认 group/ungroup 成功反馈；PlantUML 语法检查和 SVG/PNG 渲染成功，git diff --check 通过。

此部分仅完成结构命令；read/save/canvas 与最终 SVG 验收尚未完成。提交和推送的实际哈希以 Git 历史和交付回复为准，不预写尚未发生的推送成功。

第一部分实际提交 `ab81c87`，`git push origin main` 成功，远程从 `06967aa` 快进。

## 第二部分：画布、路径与 SVG 文件读写

增加 ReadCommand、SaveCommand、CanvasCommand，DocumentStore/SvgCodec 端口与两个基础设施实现。领域提供只读 ShapeElement；Text 多态分离文本内容，ShapeFactory 同时构建离线子树，没有在 XML 模块重复六类型分派。先扫描全文件显式 ID，再分配标签+编号；失败导入不发警告、不污染 ID 或会话。

成功 init/read/save/修改 canvas 清空并禁用历史；查询 canvas 不改状态。默认路径按 A-04 更新；读入和编码都隔离副本引用。临时文件写后原子替换目标，失败保留旧文件；此处的文件原子性不包含断电保障。

实际问题与修正：saxes 类型声明不兼容 strict 的部分第三方内部约束，采用 skipLibCheck，仅跳过 .d.ts 内部检查，理由和归档维护状态见 D-12；新增 Windows 文件回放最初把盘符路径传给 ESM --import，进程退出 1，改用 file URL 后通过。工厂新增 children 参数时发现父属性校验可能在接管孩子之后失败，改为先校验再接管并补回归测试。

`npm run typecheck`、`npm test`、`npm run build` 均退出 0：20 文件、390 项测试。覆盖六类型往返、中文/XML 特殊字符、缺省样式、自动 ID 与文件后部显式 ID 冲突、未知属性/DTD/畸形 XML、文档屏障、失败路径/历史保留、编码副本隔离，以及真实临时目录替换失败清理。

开发入口和编译入口实际回放中文带空格路径的 save/read/canvas/show：均退出 0、stderr 空、输出一致。PlantUML 检查与 SVG/PNG 生成通过，git diff --check 通过。最终完整 transcript、浏览器预览和交付文档将在第三部分完成，不用单元测试代替这些验收。
