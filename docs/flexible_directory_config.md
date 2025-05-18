# V2：实现灵活的目录配置与默认行为

在完成了 [V1：一次简单的定制：硬编码访问目录](my_first_customization.md) 后，我虽然对 MCP 服务器的修改和基本运作有了一定了解，但也意识到了硬编码路径带来的不便：每次想让服务器指向不同的目录，都需要修改源代码，这非常不灵活。

这个阶段的核心目标是让我定制的服务器更加智能和易用，具体表现为：

1.  能够通过客户端（如 Cursor）的配置文件（例如 `mcp.json`）传入一个特定的目录路径，让服务器实例能专为该路径服务。
2.  当直接在终端运行服务器脚本且不提供任何路径参数时，服务器能够默认服务于一个有意义的目录（我们选择了当前工作目录 `process.cwd()`）。
3.  **最关键的是，通过优化服务器向AI客户端声明其能力的方式（即工具描述），使得AI能够深刻理解服务器的"专有上下文"，即它主要围绕配置好的核心目录进行操作，从而在用户通过 `@服务器名` (例如 `@me`) 发出相对简洁的指令时，AI也能准确地在该核心目录下执行操作。**

## 1. 需求分析与设计思路

核心需求是让服务器的根目录（`allowedDirectories[0]`）能够动态配置，并且让AI理解这种配置的含义。

-   **参数来源**：通过**命令行参数**传递根目录路径给 `src/filesystem/index.ts` 脚本。
-   **参数规则**：
    -   一个参数：视为根目录路径。
    -   无参数：默认使用 `process.cwd()`，并提示用户。
    -   多于一个参数：报错退出。
-   **服务器名称**：改为更通用的 `configurable-personal-fs-server`。
-   **工具描述的革命性优化——注入上下文感知**：
    -   这是本阶段成功的关键。我们意识到，仅仅让服务器内部知道自己的操作目录是不够的，还必须通过其"自我介绍"（即工具描述）清晰地传达给AI客户端。
    -   新的描述策略包括：
        -   使用明确的身份标签，如"【个人文档专用】"。
        -   在每个工具描述中都明确包含动态的根目录路径 `(${dynamicBasePath})`。
        -   清晰指导AI如何处理相对路径（即，所有相对路径都将以 `dynamicBasePath` 作为基准进行解析）。
        -   对于像 `list_directory`、`directory_tree`、`search_files` 等工具，明确指出当用户未提供具体子路径时，默认操作 `dynamicBasePath` 本身。
    -   目标是让AI在看到 `@me` 这样的服务器特定指令时，能自动将后续操作与 `me` 服务器配置的 `dynamicBasePath` 强关联起来。

## 2. 核心代码变更 (`src/filesystem/index.ts`)

### a. 处理命令行参数并确定根目录 (逻辑同前一版本)

```typescript
const args = process.argv.slice(2);
let configuredRootPath: string;
if (args.length === 0) {
  configuredRootPath = process.cwd();
  console.warn(`No directory path provided. Defaulting to current working directory: ${configuredRootPath}`);
} else if (args.length === 1) {
  configuredRootPath = args[0];
} else {
  console.error("Usage: custom-mcp-filesystem-server [<allowed-directory>]");
  console.error("Error: Please provide at most one directory path as an argument.");
  process.exit(1);
}
const allowedDirectories = [normalizePath(path.resolve(expandHome(configuredRootPath)))];
```

### b. 服务器名称和版本 (同前一版本)

```typescript
const server = new Server({ name: "configurable-personal-fs-server", version: "0.3.0" }, /* ... */);
```

### c. 全面革新的动态工具描述

这是本次成功的核心。在 `server.setRequestHandler(ListToolsRequestSchema, ...)` 中，我们为每个工具精心撰写了新的中文描述，注入了强烈的上下文感知信息。例如：

**`list_directory` 的新描述：**
```typescript
description: `【个人文档专用】列出此个人文档 (${dynamicBasePath}) 内指定子路径下的文件和目录。如果未提供具体子路径或提供的是根目录标识（如'.'），则默认列出个人文档根目录 (${dynamicBasePath}) 的内容。所有路径操作均以此个人文档目录为基准。`
```

**`read_file` 的新描述：**
```typescript
description: `【个人文档专用】读取此个人文档 (${dynamicBasePath}) 内的指定文件。请提供相对于此文档根目录的文件路径 (例如 'MyNotes/todo.txt') 或仅文件名 (例如 'README.md'，将在根目录下查找)。所有文件读取均严格限制在此个人文档目录内。`
```
*(注：所有工具的描述都按照此原则进行了修改，详见 `index.ts` 源码)*

### d. 服务器启动日志 (同前一版本)

### e. `validatePath` 中相对路径的解析 (同前一版本，依然关键)

## 3. 客户端配置 (`mcp.json`) (配置方式同前一版本)

例如，将名为 `me` 的服务器实例配置为服务特定个人文档目录：
```json
{
  "mcpServers": {
    "me": { // 使用了 @me 这个易记的名称
      "command": "npx",
      "args": [
        "ts-node",
        "/path/to/your/servers/src/filesystem/index.ts",
        "/path/to/your/personal_docs_directory" // @me 服务器服务的特定目录
      ]
    }
  }
}
```

## 4. 测试过程与令人振奋的结果！

在对 `index.ts` 进行上述工具描述的全面优化，并彻底重启Cursor客户端以加载新的工具声明后，测试结果非常理想：

1.  **指令**: `@me 你看看有哪些文件吧？`
    **结果**: Cursor (AI) 成功理解了我的意图，并正确调用了 `me` 服务器的 `list_directory` 工具，列出了我在 `mcp.json` 中为 `me` 服务器配置的那个特定个人文档目录 (`dynamicBasePath`) 下的文件和文件夹。它不再困惑，也没有尝试去操作当前工作区或其他不相关的目录。

2.  **指令**: `@me 读取 README.md`
    **结果**: 同样地，AI 准确地调用了 `me` 服务器的 `read_file` 工具，并在 `me` 配置的 `dynamicBasePath` 目录下成功找到了 `README.md` 文件并返回了其内容。

这些测试表明，通过精心设计工具的自然语言描述，并清晰地传达服务器的"专有上下文"和"默认行为预期"，AI客户端能够更智能、更准确地执行用户的简洁指令，显著改善了用户体验。

## 5. 达成的效果与核心收获

通过这一阶段的迭代，我们的定制MCP服务器取得了质的飞跃：

-   **AI理解力大幅提升**：优化的工具描述使得AI能准确理解 `@me` 这类服务器特定指令的上下文，即便用户指令相对模糊（如未指定完整路径），AI也能正确地在服务器配置的核心目录下操作。
-   **交互更自然流畅**：用户不再需要每次都输入冗长、精确的参数，可以用更接近自然对话的方式与特定服务器实例互动。
-   **验证了描述工程的重要性**：这次实践深刻揭示了在MCP框架下，工具的自然语言描述（`description`）对于引导AI行为、弥合人类意图与机器执行之间差距的关键作用。这不仅仅是"元数据"，更是与AI"沟通"的桥梁。

这次的成功为后续开发更复杂的、面向特定领域知识的 `personal-docs-mcp-server` 奠定了坚实的基础，也让我对如何设计能被AI高效理解和使用的工具 API 有了更深的体会。 