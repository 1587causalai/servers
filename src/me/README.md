# ME Server: 你的个人知识库助手

**NPM 包名:** `@1587causalai/me-server`
**版本:** `0.1.0`
**作者:** `1587causalai`
**仓库地址:** [https://github.com/1587causalai/servers/tree/main/src/me](https://github.com/1587causalai/servers/tree/main/src/me)

ME Server 是一个专为开发者设计的模型上下文协议 (MCP) 服务器，旨在将您的个人核心知识文档深度集成到 AI 辅助开发环境中。它允许 AI 助手安全、便捷地访问您本地存储的三个关键 Markdown 文档：个人简历、认知内核笔记以及 GitHub 项目概览。

通过 ME Server，AI 能够更好地理解您的技能背景、思考模式和当前工作重点，从而提供更精准、个性化的开发支持。服务器的核心设计原则是数据本地化与用户隐私至上，所有个人文档均由用户指定并存储在本地。

此服务器是在 `@1587causalai/configurable-personal-fs-server` 基础上演进而来的，专注于从通用文件服务转向特定的个人知识供给。

## 主要特性

*   **专注核心文档访问：**
    *   提供对三个核心 Markdown 文档的只读访问：
        1.  `resume.md` (个人简历)
        2.  `cognitive_core.md` (认知内核)
        3.  `projects_overview.md` (GitHub 项目概览)
*   **动态本地目录配置：**
    *   用户在启动服务器时通过命令行参数指定一个本地目录的绝对路径。
    *   ME Server 将在该指定目录中查找上述三个核心 Markdown 文件。
    *   确保所有个人数据保留在用户本地，由用户完全掌控。
*   **增强的 AI 上下文感知：**
    *   工具描述采用中文，并动态包含配置好的用户指定路径 (`dynamicBasePath`)。
    *   AI 客户端能清晰理解每个工具的作用和数据来源。
*   **【开发者个人专属】**：工具描述和服务器定位均强调其为开发者个人知识管理和AI增强而设计。

## 安装与使用

您可以使用 `npx` 直接运行此服务器：

```bash
npx -y @1587causalai/me-server@0.1.0 /您存放核心文档的本地目录绝对路径
```

*   必须提供 `[您的文档路径]`，服务器将在该目录内查找 `resume.md`, `cognitive_core.md`, 和 `projects_overview.md`。

## 客户端配置 (例如 Cursor 的 `mcp.json`)

要将 ME Server 与 MCP 客户端 (如 Cursor) 一起使用，请将以下配置添加到客户端的 MCP 设置中：

```json
{
  "mcpServers": {
    "me": { // 您可以选择任何别名
      "command": "npx",
      "args": [
        "-y",
        "@1587causalai/me-server@0.1.0", // 使用已发布的包名和版本号
        "/您存放核心文档的本地目录绝对路径" // 替换为您实际的目录路径
      ],
      "timeout": 60 // 可选
    }
  }
}
```
**重要提示：** 与之前的 `configurable-personal-fs-server` 类似，强烈建议在客户端配置中明确指定包版本号，以避免 `npx` 缓存或 `latest` 标签解析可能导致的问题。

## 开发历程与设计理念

ME Server 的诞生源于对提升 AI 助手个性化能力的探索。我们认识到，通用的 AI 模型缺乏对开发者个人独特背景、经验和当前工作流的深入了解。

1.  **前身与基础：** `@1587causalai/configurable-personal-fs-server` 提供了坚实的基础，特别是其动态目录配置和对"描述工程"的早期探索，使得 AI 可以与用户指定的文件系统进行交互。
2.  **聚焦与深化：** ME Server 从通用文件访问进化为对三个高度结构化（由用户自行组织）的个人核心文档的专门访问。这种聚焦使得服务器目标更明确，与 AI 的交互也更有针对性。
3.  **核心理念：** "让 AI 更懂我"。通过提供标准化的个人信息入口，ME Server 致力于赋能 AI 助手，使其成为开发者更贴心、更高效的编程伙伴。

"描述工程"在 MCP 框架中的重要性依然突出。为 ME Server 的工具精心设计描述，对于确保 AI 正确理解其能力、并将其无缝整合到开发者的工作流中至关重要。

## API 工具

ME Server 提供以下核心工具。AI 所见的工具描述会动态引用配置的用户指定根路径 (`dynamicBasePath`)，并明确指出每个工具对应的特定 Markdown 文件：

*   **`get_resume_document()`**:
    *   **描述**: 【开发者个人专属】读取位于 `dynamicBasePath` 下的 `resume.md` 文件，获取您的个人简历 Markdown 文档的全部内容。
    *   **输入**: 无。
    *   **输出**: 包含简历 Markdown 内容的字符串。

*   **`get_cognitive_core_document()`**:
    *   **描述**: 【开发者个人专属】读取位于 `dynamicBasePath` 下的 `cognitive_core.md` 文件，获取您的认知内核 Markdown 文档的全部内容。
    *   **输入**: 无。
    *   **输出**: 包含认知内核 Markdown 内容的字符串。

*   **`get_projects_overview_document()`**:
    *   **描述**: 【开发者个人专属】当需要快速掌握您当前重点关注的 GitHub 项目（如目标、状态、技术栈）时，调用此工具读取位于 `dynamicBasePath` 下的 `projects_overview.md` 文件，获取您的项目概览。
    *   **输入**: 无。
    *   **输出**: 包含 GitHub 项目概览 Markdown 内容的字符串。

*   **`update_resume_document()`**:
    *   **描述**: 【开发者个人专属-修改操作】使用提供的新内容完全覆写位于 `dynamicBasePath` 下的 `resume.md` 文件。请谨慎使用，旧内容将被替换。
    *   **输入**: `new_content` (string) - 简历的全部新 Markdown 内容。
    *   **输出**: 操作成功或失败的简单消息。

*   **`update_cognitive_core_document()`**:
    *   **描述**: 【开发者个人专属-修改操作】使用提供的新内容完全覆写位于 `dynamicBasePath` 下的 `cognitive_core.md` 文件。请谨慎使用，旧内容将被替换。
    *   **输入**: `new_content` (string) - 认知内核文档的全部新 Markdown 内容。
    *   **输出**: 操作成功或失败的简单消息。

*   **`update_projects_overview_document()`**:
    *   **描述**: 【开发者个人专属-修改操作】使用提供的新内容完全覆写位于 `dynamicBasePath` 下的 `projects_overview.md` 文件。请谨慎使用，旧内容将被替换。
    *   **输入**: `new_content` (string) - GitHub 项目概览的全部新 Markdown 内容。
    *   **输出**: 操作成功或失败的简单消息。

(有关 AI 看到的完整动态描述及详细输入输出 schéma，请参阅源代码 `index.ts` 或相关工具定义部分。)

## 从源码构建

如果您克隆了本仓库并希望从源码构建：
1.  导航到 `src/me` 目录。
2.  安装依赖：`npm install`
3.  构建 TypeScript 代码：`npm run build`

编译后的输出文件将位于 `dist` 文件夹中。

## 许可证

MIT 许可证。详情请参阅主仓库中的 [LICENSE](../../LICENSE) 文件。
