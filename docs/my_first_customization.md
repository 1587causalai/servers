# 我的第一次 MCP 定制：硬编码访问目录

这是我学习和探索 MCP 定制开发的第一步。我的目标是通过一个尽可能简单的修改，来体验 MCP 服务器的开发和集成流程，并为后续更复杂的个人文档管理服务器打下基础。

## 1. 初始目标与思路

我希望快速上手 MCP 开发，了解其基本概念和运作方式。我们确定了一个初步方案：不从零开始，而是基于官方提供的 Filesystem MCP Server 进行修改。具体需求是：

-   让这个服务器只能访问我电脑上一个特定的文件夹，我们命名为 `MyPersonalDocsMVP`，路径为 `/Users/gongqian/DailyLog/projects/personal-docs-mcp-server/MyPersonalDocsMVP`。
-   服务器至少能成功读取这个文件夹里的 `README.md` 文件，以验证功能。

## 2. 定制方案：从参数到硬编码

起初，我们查阅官方 Filesystem MCP Server 的 `README.md`，了解到可以通过启动服务器时的命令行参数来指定允许访问的目录。这是一个标准的配置方式。

然而，为了更深入地体验"定制"服务器的感觉，并确保这个服务器"专用于"我的个人目录，我们选择了直接修改服务器的源代码，将允许访问的目录硬编码到 `src/filesystem/index.ts` 文件中。

### 核心代码修改

主要的改动是替换掉原先从命令行参数读取 `allowedDirectories` 的逻辑，直接在代码中赋固定值。

修改前的相关逻辑（示意）：

```typescript
// const args = process.argv.slice(2);
// const allowedDirectories = args.map(dir => path.resolve(expandHome(dir)));
```

修改后的核心代码段，位于 `src/filesystem/index.ts`：

```typescript
// Hardcode the allowed directory path
const myPersonalDocsMVPPath = "/Users/gongqian/DailyLog/projects/personal-docs-mcp-server/MyPersonalDocsMVP";

// ... (其他辅助函数如 normalizePath, expandHome)

// Store allowed directories in normalized form
const allowedDirectories = [
  normalizePath(path.resolve(expandHome(myPersonalDocsMVPPath)))
];

// Validate that all directories exist and are accessible
// (移除了对命令行参数的依赖，直接使用硬编码的 allowedDirectories)
await Promise.all(allowedDirectories.map(async (dir) => {
  try {
    const stats = await fs.stat(dir); // dir 已是处理后的绝对路径
    if (!stats.isDirectory()) {
      console.error(`Error: ${dir} is not a directory`);
      process.exit(1);
    }
  } catch (error) {
    console.error(`Error accessing directory ${dir}:`, error);
    process.exit(1);
  }
}));
```

同时，为了清晰，我们还修改了服务器启动时打印的日志信息：

```typescript
// console.error("Secure MCP Filesystem Server running on stdio");
// console.error("Allowed directories:", allowedDirectories);
console.error("Custom MCP Filesystem Server running on stdio");
console.error("Hardcoded allowed directory:", allowedDirectories);
```

## 3. 运行与客户端配置

### a. 直接运行测试

修改完成后，我首先在项目根目录（`servers`）下的终端中直接运行脚本，以快速验证修改是否生效：

```bash
npx ts-node src/filesystem/index.ts
```

预期的输出，确认硬编码路径被正确加载：

```
Custom MCP Filesystem Server running on stdio
Hardcoded allowed directory: [
  '/Users/gongqian/DailyLog/projects/personal-docs-mcp-server/MyPersonalDocsMVP'
]
```

### b. 配置 Cursor 客户端

为了让 Cursor能够调用这个定制的服务器，我修改了 Cursor 的 MCP 配置文件（通常是用户设置中的 `mcp.json`，或者通过 Cursor 的 MCP 设置界面进行配置）。关键是创建一个新的服务器条目，并将其 `command` 和 `args` 指向我们修改后的本地脚本。

我的配置 (`mcp.json` 或等效配置) 如下：

```json
{
  "mcpServers": {
    // ... 可能有其他服务器配置，如官方 filesystem
    "my-personal-filesystem": { // 给定制服务器一个清晰的名称
      "command": "npx",
      "args": [
        "ts-node",
        "/Users/gongqian/DailyLog/projects/servers/src/filesystem/index.ts" // 指向我本地的脚本绝对路径
      ]
      // "timeout": 60, // 可选配置
      // "disabled": false // 可选配置
    }
  }
}
```

**注意**：确保 `args` 中的脚本路径是正确的绝对路径。并且，自定义服务器的条目（如 `"my-personal-filesystem"`）必须位于 `"mcpServers"` 对象内部。

## 4. 测试过程与关键发现

配置完成后，我在 Cursor 中进行了测试：

1.  **确认服务器加载**：在 Cursor 的 MCP 设置中，我的 `my-personal-filesystem` 服务器显示为已激活。
2.  **测试 `list_allowed_directories`**：
    通过聊天框输入：`@my-personal-filesystem list_allowed_directories`
    服务器正确返回了硬编码的路径：
    ```
    Allowed directories:
    /Users/gongqian/DailyLog/projects/personal-docs-mcp-server/MyPersonalDocsMVP
    ```
3.  **测试 `read_file`**：
    -   读取允许路径下的 `README.md`：
        `@my-personal-filesystem read_file path="/Users/gongqian/DailyLog/projects/personal-docs-mcp-server/MyPersonalDocsMVP/README.md"`
        成功返回文件内容。
    -   尝试读取非法路径下的文件，服务器按预期报错并拒绝访问。

4.  **对客户端工具选择的理解**：
    当我尝试用自然语言如"mcp 读取一下我个人的信息吧"进行测试时，发现 Cursor 调用了 `list_allowed_directories` 而不是直接去读取 `README.md`。这引发了我对 MCP 工作原理的进一步思考：客户端（Cursor）是基于服务器声明的工具及其描述（`description`）来选择调用哪个工具的。服务器本身是被动提供能力，并不主动执行未被请求的操作。

## 5. 遇到的疑问：服务器进程的生命周期

在测试中，我注意到一个现象：即使我在终端中通过 `^C` 手动停止了 `npx ts-node` 命令启动的服务器实例，Cursor 中配置的 `my-personal-filesystem` 似乎仍能继续工作。这说明 Cursor 客户端很可能根据其 `mcp.json` 配置独立管理了服务器进程的启动和生命周期。我手动在终端启动的实例更多是用于开发和即时调试。

## 6. 小结与展望

通过这次简单的硬编码定制，我成功地：

-   体验了修改 MCP 服务器代码的基本流程。
-   理解了如何在客户端（Cursor）中配置和调用一个本地的、定制的 MCP 服务器。
-   对 MCP 的服务发现、工具声明和调用机制有了初步的、实际的认识。
-   验证了通过硬编码方式限制服务器访问范围的可行性。

这为我后续开发功能更完善的 `personal-docs-mcp-server` 积累了宝贵的实践经验。下一步，我计划继续深化对 MCP 协议的理解，并开始思考如何为我的个人文档管理需求设计更具体的工具。 