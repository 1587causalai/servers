# MCP 工作原理详解：深入了解AI如何与工具交互

本文档旨在深入解析客户端应用程序（如 Cursor）如何通过模型上下文协议（MCP）与 MCP 服务器（例如我们定制的 Filesystem 服务器）进行交互，并调用其提供的工具。

## 1. MCP 协议概览

模型上下文协议（Model Context Protocol, MCP）是一个定义了 AI 模型（或代表其行事的代理）与各种工具或能力之间标准化接口的规范。其主要目标是使 AI 能够可靠且可预测地与外部系统（如文件系统、代码库、Web 搜索等）进行交互。

## 2. 客户端与服务器的角色定位

在 MCP 生态系统中，主要有两个参与者：

-   **MCP 服务器 (例如，我们定制的 `src/filesystem/index.ts`)**：
    -   负责实现一个或多个工具的具体逻辑（例如，读取文件、列出目录等）。
    -   负责向任何连接的客户端声明其能力（即它所提供的工具）。
    -   执行客户端请求的工具调用，并返回结果。

-   **MCP 客户端 (例如，Cursor)**：
    -   与最终用户进行交互，接收指令（通常是自然语言形式）。
    -   管理与一个或多个 MCP 服务器的连接。
    -   从连接的服务器发现可用的工具。
    -   利用 AI 模型来解释用户意图，并选择合适的工具来满足请求。
    -   根据 MCP 规范格式化工具调用请求，并将其发送给服务器。
    -   从服务器接收结果，并将其呈现给用户或用于进一步的操作。

## 3. 核心交互流程剖析

客户端与服务器之间的交互通常遵循以下步骤：

### a. 服务发现 (Tool Discovery)

这是客户端了解服务器能做什么的过程。

1.  **客户端请求**：建立连接后，客户端会向 MCP 服务器发送一个 `ListToolsRequest`（列出工具请求）。
2.  **服务器响应**：服务器处理此请求（在我们的 `index.ts` 中由 `server.setRequestHandler(ListToolsRequestSchema, ...)` 处理）并返回其支持的所有工具的列表。
    对于每个工具，服务器会提供：
    -   `name`：工具的唯一字符串标识符（例如：`"read_file"`）。
    -   `description`：一段自然语言描述，解释该工具的功能、用途以及何时可能有用。这对于 AI 模型理解和选择工具至关重要。
    -   `inputSchema`：一个 JSON Schema，定义了该工具期望的参数（例如，对于 `read_file`，此 schema 会指明需要一个名为 `path` 的字符串类型参数）。

### b. 用户指令与工具选择 (AI 驱动)

一旦客户端获得了可用工具的列表：

1.  **用户输入**：用户向客户端提供指令（例如，"读取项目简介文件"或"我能访问哪些目录？"）。
2.  **AI 解析**：客户端的底层 AI 模型分析用户的自然语言输入。
3.  **工具匹配**：AI 模型将解析后的用户意图与来自所有已连接 MCP 服务器的可用工具的 `description` 进行比较。它尝试找到描述与用户请求最匹配的工具。
    *例如*：如果用户说"显示允许的文件夹"，AI 可能会将其匹配到 `list_allowed_directories` 工具，因为其描述是"返回此服务器允许访问的目录列表"。

### c. 工具调用 (Tool Calling)

AI 模型选定工具后：

1.  **客户端请求**：客户端构建一个 `CallToolRequest`（调用工具请求）。该请求包含：
    -   所选工具的 `name`。
    -   工具所需的 `arguments`（参数），这些参数基于其 `inputSchema` 并从用户输入中提取（例如，对于 `read_file`，参数对象将是 `{"path": "/path/to/your/file.md"}`）。
2.  **服务器执行**：MCP 服务器接收 `CallToolRequest`。其中心请求处理器（在 `index.ts` 中的 `server.setRequestHandler(CallToolRequestSchema, ...)` 代码块）会使用 `switch` 语句（或类似逻辑）根据工具的 `name` 将请求路由到实现该工具逻辑的特定函数。
3.  **服务器响应**：执行工具逻辑后，服务器将包含 `content`（工具执行的结果）的响应发送回客户端；如果出现问题，则返回错误信息。

### d. 结果呈现

客户端接收服务器的响应，并将信息呈现给用户（例如，显示文件内容或错误消息）。

## 4. 我们的定制实践：动态上下文与智能交互

在我们的学习与定制之旅中 (详见 [V1](my_first_customization.md), [V2](flexible_directory_config.md), [V3](V3_发布npm包.md) 和 [最终成果总结](我的定制文件服务器成果.md))，我们将官方的 Filesystem MCP Server 发展为了一个名为 `[@1587causalai/configurable-personal-fs-server](https://www.npmjs.com/package/@1587causalai/configurable-personal-fs-server)` 的 npm 包。这个过程很好地演示了 MCP 的核心交互原理：

1.  **客户端传递配置给服务器**：
    当用户在 MCP 客户端（如 Cursor）中配置此服务器时，可以在 `args` 数组中提供一个路径参数：
    ```json
    "me": {
      "command": "npx",
      "args": [
        "-y",
        "@1587causalai/configurable-personal-fs-server@0.1.1",
        "/path/to/my/documents" // 这个路径作为命令行参数传递给服务器脚本
      ]
    }
    ```
    如果未提供路径，服务器脚本 (`src/filesystem/index.ts`) 设计为默认使用当前工作目录。

2.  **服务器根据配置调整行为和工具声明**：
    *   **动态确定操作目录**：服务器启动时读取这个命令行参数（或使用默认值），并将其设为唯一的 `allowedDirectories[0]`，我们称之为 `dynamicBasePath`。所有的文件操作，如 `read_file`, `list_directory` 等，都会被 `validatePath` 函数限制在这个 `dynamicBasePath` 之内。
    *   **上下文感知的工具描述**：在响应客户端的 `ListToolsRequest` 时，服务器的工具 `description`（在 `src/filesystem/index.ts` 的 `ListToolsRequestSchema` 处理器中定义）被设计为动态地包含这个 `dynamicBasePath`。例如，`read_file` 的描述会变成类似："【个人文档专用】读取此个人文档 (/path/to/my/documents) 内的指定文件..."。

3.  **AI 利用增强的描述进行工具选择与调用**：
    *   客户端的 AI 模型接收到这些包含明确路径上下文的工具描述后，能够更准确地理解用户的意图。
    *   例如，当用户对配置为服务 `/path/to/my/documents` 的 `@me` 服务器说："读取 README.md"，AI 能更好地理解这个 `README.md` 指的是 `/path/to/my/documents/README.md`，因为它看到的 `read_file` 工具描述已经指明了这个操作的主要上下文。
    *   这减少了歧义，使得用户可以用更简洁、更自然的语言与特定配置的服务器实例进行交互。

这个定制过程不仅产出了一个更实用的工具，也深刻揭示了 MCP 服务器如何通过其声明的工具（特别是描述）来引导和赋能 AI 客户端，以及客户端配置如何影响服务器行为，完美体现了 MCP 的设计哲学。

## 5. 我们项目中的关键文件

-   `servers/src/filesystem/index.ts`：我们定制的 MCP 服务器的核心。它包含了工具的定义（名称、描述、schema）及其实现逻辑。
-   `docs/index.html` 与 `docs/_sidebar.md`：定义了此 `docsify` 文档网站的结构和导航。

通过理解这些组件及其交互方式，我们为根据特定需求开发和定制 MCP 服务器奠定了坚实的基础。 