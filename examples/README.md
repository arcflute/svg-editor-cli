# 可执行命令样例

[round3.commands.txt](round3.commands.txt) 使用作业 §6.1 版本 A 的八个图形元素，执行 init、八次 create、全文档/子树 tree、show 和 help。此脚本不包含 move、undo、save，不生成 SVG。

在项目根用 PowerShell 回放（UTF-8 防止中文经管道变成问号）：

```powershell
$OutputEncoding = [System.Text.UTF8Encoding]::new()
Get-Content -Raw -Encoding UTF8 examples/round3.commands.txt | npm run cli
npm run build
Get-Content -Raw -Encoding UTF8 examples/round3.commands.txt | node dist/bootstrap/main.js
```

POSIX shell 可使用 `npm run cli < examples/round3.commands.txt`。自动测试直接读取 UTF-8 文件并传给真实子进程 stdin，检查固定八节点树、子树、父级和帮助输出；本轮另实际回放开发与编译入口，确认业务输出一致、退出码 0、stderr 为空。

实际全文档树输出：

```text
svg (800x600)
└── g#flowchart
    ├── g#node1
    │   ├── rect#start  x=120 y=100 w=160 h=60 fill=#4a90d9
    │   └── text#start-label  (155,135) "开始"
    ├── g#node2
    │   ├── rect#process  x=520 y=100 w=160 h=60 fill=#f5a623
    │   └── text#process-label  (545,135) "处理数据"
    └── line#arrow1  (280,130) -> (520,130) stroke=black
```

输入约定：去掉行首空白后以 `#` 开头的是整行注释；命令内部的十六进制颜色保留，不支持行尾注释。text 内容须整体双引号包裹，保留中文、首尾空格和空串；引号内只支持 `\"`、`\\` 两种转义，未知转义报错；引号外反斜杠为普通字符。引号片段必须由空白分隔，不拼接相邻片段。`in` 仅在尾部且未被引用时作为父容器子句。数值允许有限十进制/科学记数法，不接受 `10px`、NaN、Infinity 或空串。详见 [D-07](../doc/decisions.md#d-07-第三轮分词和参数边界)。

## 第四轮编辑与历史回放

[round4.commands.txt](round4.commands.txt) 在同一流程图上移动 node2、撤销/重做、缩放 node1、修改文本和容器样式、删除并恢复整组。上面的回放命令把 round3 换成 round4 即可；两个入口已实际执行，退出 0、stderr 空、业务输出一致。

真实回放节选（撤销删除后）：

```text
undone: delete node1
svg> svg (800x600)
└── g#flowchart
    ├── g#node1
    │   ├── rect#start  x=60 y=50 w=80 h=30 fill=#4a90d9
    │   └── text#start-label  (77.5,67.5) "开始"
    ├── g#node2  stroke-width=2
    │   ├── rect#process  x=520 y=200 w=160 h=60 fill=#f5a623
    │   └── text#process-label  (545,235) "处理数据 v2"
    └── line#arrow1  (280,130) -> (520,130) stroke=black
```

成功 init 清空并禁用历史，下一次成功编辑解禁；失败编辑保留 redo，成功新编辑清 redo。set 的文本值允许单个未引用词；空串、空格仍需引号。create text 的 content 保留第三轮引用要求。该历史脚本不写文件；完整保存/读回与浏览器验证已补在下面，box 留到插件化阶段。

## 完整课程场景与实际 SVG

[transcript.commands.txt](transcript.commands.txt) 对应 §6，读取 [other.svg](other.svg)，生成 [demo.svg](demo.svg)。两条预期错误是祖先后代混选和 save 后禁用 undo，进程仍正常退出。ID 名为 box 的对象实际是 rect，并未实现 box 类型。

[flowchart.commands.txt](flowchart.commands.txt) 对应 §6.1 版本 A，生成 [flowchart.svg](flowchart.svg)：八个对象、整体移动 node2、undo、修改内容和保存。[structure.commands.txt](structure.commands.txt) 单独演示跨父分组/解组与图层操作。

这两个文件已由真实 CLI 生成，读回测试和 Edge 156 无头截图查看均通过；截图与环境记录见 [验收记录](../doc/acceptance.md)。不是人工绘制 SVG，不声称教师已验收。

在项目根构建后，使用 examples 作为工作目录（脚本中的文件路径相对当前目录）：

```powershell
npm run build
$OutputEncoding = [System.Text.UTF8Encoding]::new()
Push-Location examples
Get-Content -Raw -Encoding UTF8 transcript.commands.txt | node ../dist/bootstrap/main.js
Get-Content -Raw -Encoding UTF8 flowchart.commands.txt | node ../dist/bootstrap/main.js
Pop-Location
```

这会重建 examples/demo.svg 与 flowchart.svg。开发入口对应 `node --import ../node_modules/tsx/dist/loader.mjs ../src/bootstrap/main.ts`（在 examples 内执行）。交互式 `npm run cli` 默认以项目根运行，文件参数需使用如 `read examples/other.svg` 的路径。
