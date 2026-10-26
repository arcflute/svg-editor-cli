# 第三轮命令样例

[round3.commands.txt](round3.commands.txt) 使用作业 §6.1 版本 A 的八个图形元素，执行 init、八次 create、全文档/子树 tree、show 和 help。本轮不包含 move、undo、save，不生成 SVG。

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

后续才添加整体变换、撤销重做、保存读回及浏览器验证；box 留到插件化阶段。样例须随功能、需求和实际输出同步更新。
