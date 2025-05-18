# ME Server 代码实例详解

## 1. 引言

本文档旨在深入剖析 `@1587causalai/me-server` (ME Server) 的源代码，这是一个专为开发者个人知识管理设计的模型上下文协议 (MCP) 服务器。ME Server 的核心功能是提供对用户本地存储的三个关键 Markdown 文档——个人简历 (`resume.md`)、认知内核笔记 (`cognitive_core.md`) 以及 GitHub 项目概览 (`projects_overview.md`)——的安全、便捷的读取与覆写访问。

通过对 ME Server 具体代码实现的分析，我们将一步步揭示一个功能明确、针对特定需求的 MCP 服务器是如何构建其工具定义、处理请求逻辑以及与 MCP SDK 交互的。这不仅是对 ME Server 技术细节的深度解读，也是一个将 MCP 理论应用于实际项目开发的具体范例。

本文档适合以下读者：
*   希望了解 ME Server内部工作原理的开发者。
*   正在学习如何开发自定义 MCP 服务器的初学者。
*   对 TypeScript、Node.js 在 MCP 服务器开发中的应用感兴趣的实践者。

在开始之前，建议您先熟悉 ME Server 的基本功能和使用方法，可以参考其项目文档：
*   **项目 README**: [`src/me/README.md`](../src/me/README.md)
*   **需求分析**: [`docs/personal_knowledge_base_mcp_server_requirements.md`](personal_knowledge_base_mcp_server_requirements.md)
*   **开发日志**: [`docs/me_server_development_log.md`](me_server_development_log.md)

让我们一同深入 ME Server 的代码世界，探索其构建之道。

## 2. 服务器启动与配置解析

ME Server 的核心入口文件是 `src/me/index.ts`。让我们从文件顶部开始，分析服务器是如何启动、接收参数并进行初始配置的。

### 2.1 Shebang 和模块导入

```typescript
#!/usr/bin/env node

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  ToolSchema,
} from "@modelcontextprotocol/sdk/types.js";
import fs from "fs/promises";
import path from "path";
import os from 'os';
import { z } from "zod";
import { zodToJsonSchema } from "zod-to-json-schema";
```

*   `#!/usr/bin/env node`: 这是一个 shebang 行，它告诉操作系统在执行此文件时使用 `node` 解释器。这使得我们可以直接像执行脚本一样运行 ME Server (例如，在 `package.json` 的 `bin` 字段中指定后，通过 `npx` 或全局安装后直接调用命令)。
*   **模块导入**: 这里导入了所有必要的模块：
    *   来自 `@modelcontextprotocol/sdk` 的核心 MCP 服务器类 (`Server`)、标准输入输出传输层 (`StdioServerTransport`) 以及相关的请求/工具类型定义。
    *   Node.js 内置模块：`fs/promises` (用于异步文件系统操作)、`path` (用于处理文件路径)、`os` (用于获取用户主目录等操作系统相关信息)。
    *   第三方库：`zod` (用于定义数据校验 schema) 和 `zod-to-json-schema` (用于将 Zod schema 转换为 MCP 工具所需的 JSON Schema)。

### 2.2 命令行参数处理与 `dynamicBasePath` 的确定

ME Server 的核心特性之一是它服务于用户指定的本地目录。这部分代码负责从命令行参数中获取这个目录路径：

```typescript
// --- Configuration: Read the target directory from command line arguments ---
const args = process.argv.slice(2);
let configuredRootPath: string;

if (args.length === 0) {
  console.error("Usage: me-server <path_to_your_markdown_documents_directory>");
  console.error("Error: Please provide the directory path where resume.md, cognitive_core.md, and projects_overview.md are located.");
  process.exit(1);
} else if (args.length === 1) {
  configuredRootPath = args[0];
} else {
  console.error("Usage: me-server <path_to_your_markdown_documents_directory>");
  console.error("Error: Please provide exactly one directory path as an argument.");
  process.exit(1);
}
```

*   `process.argv.slice(2)`: `process.argv` 是一个包含命令行所有参数的数组。第一个元素是 Node.js 的执行路径，第二个元素是当前脚本的路径。`slice(2)` 取出的是用户实际提供的参数。
*   逻辑判断 `args.length`：
    *   如果用户没有提供参数 (`args.length === 0`)，服务器会打印错误信息（提示用法和期望的三个 Markdown 文件）并退出。
    *   如果用户提供了一个参数 (`args.length === 1`)，该参数被视为 `configuredRootPath`。
    *   如果用户提供了多个参数，同样打印错误信息并退出。
*   这确保了 ME Server 启动时必须且仅能指定一个目录路径。

接下来，是对这个路径进行规范化和验证：

```typescript
// --- Path Utilities ---
function normalizePath(p: string): string {
  return path.normalize(p);
}

function expandHome(filepath: string): string {
  if (filepath.startsWith('~/') || filepath === '~') {
    return path.join(os.homedir(), filepath.slice(1));
  }
  return filepath;
}

const dynamicBasePath = normalizePath(path.resolve(expandHome(configuredRootPath)));

// Validate that the configured directory exists and is accessible
(async () => {
  try {
    const stats = await fs.stat(dynamicBasePath);
    if (!stats.isDirectory()) {
      console.error(`Error: The configured path ${dynamicBasePath} is not a directory.`);
      process.exit(1);
    }
  } catch (error) {
    console.error(`Error accessing the configured directory ${dynamicBasePath}:`, error);
    process.exit(1);
  }
})();
```

*   `expandHome(filepath: string)`: 一个辅助函数，用于将路径中的 `~` (代表用户主目录) 替换为实际的绝对路径。
*   `normalizePath(p: string)`: 另一个辅助函数，使用 `path.normalize()` 来处理路径中的 `.`、`..` 和多余的斜杠，使其成为标准格式。
*   `dynamicBasePath`: 这是最终确定并经过规范化的、服务器将要服务的基础目录路径。它首先通过 `expandHome` 处理 `~`，然后用 `path.resolve` 获取绝对路径，最后用 `normalizePath` 进行规范化。
*   **目录验证**: 一个立即执行的异步函数 `(async () => { ... })();` 被用来验证 `dynamicBasePath`：
    *   使用 `fs.stat(dynamicBasePath)` 获取路径信息。
    *   检查该路径是否确实是一个目录 (`!stats.isDirectory()`)。
    *   如果路径不存在、不是目录或无法访问，则打印错误并退出。

这部分代码确保了 ME Server 在启动后，拥有一个明确、有效且可访问的 `dynamicBasePath`，后续所有文件操作都将基于此路径进行。 