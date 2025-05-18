# 可配置的个人文件系统 MCP 服务器 (Configurable Personal Filesystem MCP Server)

**NPM 包名:** `@1587causalai/configurable-personal-fs-server`
**版本:** `0.1.0`
**作者:** `1587causalai`
**仓库地址:** [https://github.com/1587causalai/servers/tree/main/src/filesystem](https://github.com/1587causalai/servers/tree/main/src/filesystem)

这是一个定制版的模型上下文协议 (MCP) 文件系统操作服务器，旨在提供更强的灵活性和更好的人工智能 (AI) 交互体验。它允许用户通过命令行参数动态配置其服务的根目录，或者在未提供参数时默认使用当前工作目录。

该服务器的一个关键特性是其**具备上下文感知能力的工具描述**，这显著改善了 AI 客户端 (如 Cursor) 理解和与服务器交互的方式。这使得命令执行更自然、更准确，尤其是在使用简洁的对话式指令时。

此服务器基于原始的 `@modelcontextprotocol/server-filesystem` 构建，但针对个人文档管理和 AI 可用性进行了重要增强。

## 主要特性

*   继承自基础服务器的所有标准文件系统操作：
    *   读/写文件
    *   创建/列出/删除目录
    *   移动文件/目录
    *   搜索文件
    *   获取文件元数据
    *   支持差异比较的选择性文件编辑
*   **动态根目录配置：**
    *   通过命令行参数指定单个根目录。
    *   如果未提供参数，则默认为当前工作目录 (`process.cwd()`)。
*   **增强的 AI 上下文感知：**
    *   工具描述采用中文，并动态包含配置好的 `dynamicBasePath` (动态基本路径)。
    *   AI 客户端能更好地理解相对路径和服务器的操作上下文。
    *   改进了自然语言交互 (例如，AI 能正确推断出类似 `@me 列出文件` 这类指令的目标目录)。
*   **【个人文档专用】**：工具描述经过定制，以表明其专为个人文档管理而设计。

## 安装与使用

您可以使用 `npx` 直接运行此服务器：

```bash
npx -y @1587causalai/configurable-personal-fs-server [您的文档路径]
```

*   如果提供了 `[您的文档路径]`，服务器将仅在该目录内操作。
*   如果未提供路径，服务器将在执行命令时所在的当前工作目录内操作。

## 客户端配置 (例如 Cursor 的 `mcp.json`)

要将此服务器与 MCP 客户端 (如 Cursor) 一起使用，请将以下配置添加到客户端的 MCP 设置中：

```json
{
  "mcpServers": {
    "my-docs": { // 您可以选择任何别名，例如 "me", "personal-docs"
      "command": "npx",
      "args": [
        "-y",
        "@1587causalai/configurable-personal-fs-server",
        "/您个人文档目录的绝对路径" // 替换为您期望的目录
      ],
      "timeout": 60 // 可选
    }
  }
}
```

如果您希望服务器默认使用其当前工作目录（对于 GUI 客户端，`npx` 的有效运行目录可能不太可预测），您可以省略路径参数：

```json
{
  "mcpServers": {
    "my-cwd-docs": {
      "command": "npx",
      "args": [
        "-y",
        "@1587causalai/configurable-personal-fs-server"
      ]
    }
  }
}
```
通常建议提供绝对路径以确保行为一致。

## 客户端配置提示与故障排除

如果您在客户端（如 Cursor）中配置此服务器后遇到问题（例如服务器显示"无可用工具"或无法正常工作），请尝试以下建议：

*   **在客户端配置中明确指定包版本**：
    这是解决许多问题的关键步骤。在您的 `mcp.json` (或客户端的图形化配置界面) 中，确保 `args` 包含了明确的版本号，例如：
    ```json
    "args": [
      "-y",
      "@1587causalai/configurable-personal-fs-server@0.1.1", // 明确指定版本号
      "/您个人文档目录的绝对路径"
    ]
    ```
    这可以避免因 `npx` 缓存或 `latest` 标签解析问题导致客户端加载了旧的或有问题的版本。

*   **处理客户端缓存**：
    MCP 客户端可能会缓存服务器信息。尝试：
    1.  **彻底重启客户端**。
    2.  使用客户端内建的服务器**刷新或重载**功能。
    3.  在客户端设置中**先禁用再重新启用**此服务器。

*   **确保使用的是最新修复版本**：
    如果您是为了修复旧版本的问题而发布了新版本（例如从 `0.1.0` 升级到 `0.1.1`），请务必确保客户端配置指向了这个**新版本**。

遵循这些提示，特别是明确指定版本号，通常能解决客户端无法正确加载和使用通过 npm 发布的 MCP 服务器的问题。

## 开发历程与设计理念

此服务器中的增强功能是逐步迭代开发的：

1.  **初次定制：** 从硬编码目录开始，以理解基本概念。(详见: [`docs/my_first_customization.md`](../../docs/my_first_customization.md))
2.  **灵活配置与 AI 上下文：** 实现了动态目录配置，并且至关重要地，改进了工具描述，使服务器在与 AI 交互时更"智能"。这通过允许更自然的语言命令，显著提高了可用性。(详见: [`docs/flexible_directory_config.md`](../../docs/flexible_directory_config.md))

核心经验是"描述工程"在 MCP 框架中的重要性。精心设计的工具描述对于弥合人类意图与 AI 执行之间的差距至关重要。

## API 工具

此服务器提供以下工具。请注意，AI 所见的工具描述会动态引用配置的根路径 (`dynamicBasePath`)：

*   **read_file**: 【个人文档专用】读取此个人文档 (`dynamicBasePath`) 内的指定文件...
*   **read_multiple_files**: 【个人文档专用】同时读取此个人文档 (`dynamicBasePath`) 内的多个指定文件...
*   **write_file**: 【个人文档专用】在此个人文档 (`dynamicBasePath`) 内创建新文件或覆写现有文件...
*   **edit_file**: 【个人文档专用】对此个人文档 (`dynamicBasePath`) 内的指定文本文件进行基于行的编辑...
*   **create_directory**: 【个人文档专用】在此个人文档 (`dynamicBasePath`) 内创建新目录...
*   **list_directory**: 【个人文档专用】列出此个人文档 (`dynamicBasePath`) 内指定子路径下的文件和目录...
*   **directory_tree**: 【个人文档专用】获取此个人文档 (`dynamicBasePath`) 内指定子路径下文件和目录的递归树状JSON视图...
*   **move_file**: 【个人文档专用】在此个人文档 (`dynamicBasePath`) 内移动或重命名文件和目录...
*   **search_files**: 【个人文档专用】在此个人文档 (`dynamicBasePath`) 内递归搜索文件和目录...
*   **get_file_info**: 【个人文档专用】获取此个人文档 (`dynamicBasePath`) 内指定文件或目录的元数据...
*   **list_allowed_directories**: 返回此【个人文档专用】服务器当前唯一配置允许操作的根目录: `dynamicBasePath`...

(有关 AI 看到的完整动态描述，请参阅源代码 `index.ts`。)

## 从源码构建

如果您克隆了本仓库：
1.  导航到 `src/filesystem` 目录。
2.  安装依赖：`npm install`
3.  构建 TypeScript 代码：`npm run build`

编译后的输出文件将位于 `dist` 文件夹中。

## 许可证

MIT 许可证。详情请参阅主仓库中的 [LICENSE](../../LICENSE) 文件。
