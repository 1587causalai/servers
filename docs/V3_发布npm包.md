# V3：打包并发布我们的定制 MCP 服务器到 npm

在 [V1](my_first_customization.md) 和 [V2](flexible_directory_config.md) 中，我们成功定制了 MCP 文件服务器，使其能够灵活配置目标目录，并优化了与 AI 的交互。现在，是时候将我们的劳动成果打包成一个 npm 包，方便自己和他人使用了。

本章将详细记录如何将 `configurable-personal-fs-server` （其源代码位于 `src/filesystem/index.ts`）发布为一个 npm 包：`@1587causalai/configurable-personal-fs-server`。

## 1. 准备工作：`package.json` 和服务器代码

我们的目标是让用户可以通过 `npx @1587causalai/configurable-personal-fs-server [可选的目录路径]` 来直接运行服务器。

### a. 配置 `src/filesystem/package.json`

我们对位于 `src/filesystem/` 目录下的 `package.json` 文件进行了以下关键修改：

*   **`name`**: 设置为带 scope 的包名 `@1587causalai/configurable-personal-fs-server`。
*   **`version`**: 初始化为 `0.1.0`。每次发布新版本前都需要递增此版本号。
*   **`description`**: 添加了中文描述，说明了其核心功能："一个高度可配置的个人文件系统MCP服务器，具有上下文感知AI交互能力。允许通过命令行参数动态配置根目录，或默认为当前工作目录。"
*   **`author`**: 设置为 npm 用户名 `1587causalai`。
*   **`repository`**, **`bugs`**, **`homepage`**: 更新为指向我们的 GitHub 仓库 `https://github.com/1587causalai/servers` 的对应路径。
*   **`keywords`**: 添加了相关关键字，如 "mcp", "personal-documents", "configurable-server"。
*   **`bin`**: 这是非常重要的一项，它将 npm 包链接到一个或多个可执行命令。
    ```json
    "bin": {
      "configurable-personal-fs-server": "dist/index.js"
    }
    ```
    这意味着当用户安装此包后（全局安装或通过 `npx`），就可以使用 `configurable-personal-fs-server` 这个命令了，它会执行 `dist/index.js` 文件。
*   **`files`**: 指定只包含 `dist` 目录在发布的包中。`dist` 目录将存放由 TypeScript 编译生成的 JavaScript 文件。
    ```json
    "files": [
      "dist"
    ]
    ```
*   **`scripts`**:
    *   `"build": "tsc && shx chmod +x dist/*.js"`: 编译 TypeScript (`tsc`) 并给输出的 `dist/index.js` 添加可执行权限。
    *   `"prepare": "npm run build"`: 这个脚本会在 `npm publish` 前自动运行，确保发布的是最新编译的代码。

### b. 调整 `src/filesystem/index.ts`

*   **Shebang**: 确保文件开头有 `#!/usr/bin/env node`，这使得脚本可以直接作为 Node.js 可执行文件运行。
*   **MCP 服务器名称与版本**: `index.ts` 内部通过 `new Server({ name: "...", version: "..." }, ...)` 定义的服务器名和版本，我们也将其更新为与 `package.json` 中的核心名称和版本一致（例如 `name: "configurable-personal-fs-server"`, `version: "0.1.0"`），以便在 MCP 客户端中保持一致性。

## 2. 编写 README

我们为这个 npm 包在 `src/filesystem/README.md` 中编写了详细的说明文档（即您当前正在阅读的这个中文版 README 的源文件）。它包括：
*   包的基本信息 (名称, 版本, 作者, 仓库)。
*   核心特性，特别是动态目录配置和增强的 AI 上下文感知。
*   安装和使用方法 (`npx` 命令示例)。
*   如何在 MCP 客户端 (如 Cursor) 中配置此服务器的示例。
*   开发历程回顾和设计理念，并链接到 V1 和 V2 的文档。
*   API 工具列表的简述。
*   从源码构建的说明。

## 3. 构建与发布流程

以下是在本地终端中执行的步骤：

### a. 进入包目录

```bash
cd /path/to/your/project/servers/src/filesystem/
```

### b. 安装/更新依赖

如果 `package.json` 中有依赖变动，或首次设置，运行：
```bash
npm install
```

### c. 构建项目

此命令会编译 TypeScript 代码到 `dist` 目录：
```bash
npm run build
```

### d. 登录 npm (若需要)

如果尚未登录 npm CLI，执行：
```bash
npm login
```
按照提示输入您的 npm 用户名 (`1587causalai`)、密码和邮箱。

### e. 发布到 npm

```bash
npm publish --access public
```
`--access public` 参数对于 scoped 包 (@username/package-name) 以公共方式免费发布是必需的。

发布成功后，我们的包就可以在 npm 仓库中找到了：`https://www.npmjs.com/package/@1587causalai/configurable-personal-fs-server`。

## 4. 客户端配置故障排查与重要提示

在我们将新发布的 `@1587causalai/configurable-personal-fs-server@0.1.1` 配置到 MCP 客户端（如 Cursor）时，遇到了一些波折。起初，即使包已成功发布并且可以在本地终端通过 `npx` 命令正常启动，但在客户端的 MCP 设置中，服务器可能仍显示"无可用工具 (No tools available)"，或者无法按预期工作。

经过排查，我们发现以下几点对于确保客户端正确加载和运行定制的 npm 包至关重要：

*   **明确指定包版本**：
    在客户端的 MCP 服务器配置中（例如 `mcp.json` 或通过设置界面），强烈建议在 `args` 中明确指定要使用的 npm 包的版本号。例如：
    ```json
    "me": {
      "command": "npx",
      "args": [
        "-y",
        "@1587causalai/configurable-personal-fs-server@0.1.1", // 明确指定版本！
        "/您的/目标目录"
      ]
    }
    ```
    这样做可以避免 `npx` 可能存在的缓存问题，或者因默认拉取 `latest` 标签而导致的不确定性（例如，`latest` 可能尚未指向您刚刚发布的最新版本，或指向了更早期的有问题的版本）。这是我们最终解决问题的关键一步。

*   **客户端缓存**：
    MCP 客户端（如 Cursor）可能会缓存服务器的工具列表和其他信息。如果在配置或排除故障时遇到问题，尝试以下操作：
    1.  **彻底重启客户端**：这是清除客户端状态和缓存的最简单方法。
    2.  **使用客户端的刷新/重载功能**：如果 MCP 设置界面提供针对单个服务器的刷新按钮，请使用它。
    3.  **禁用再启用服务器**：在客户端设置中暂时禁用然后重新启用该 MCP 服务器。

*   **版本迭代**：
    当我们发现并修复了之前版本（例如 `0.1.0`）中可能存在的问题（如 `bin` 配置未生效、打包内容不完整等），并通过发布新版本（`0.1.1`）来解决时，确保客户端使用的是这个**新版本**至关重要。仅仅因为 npm 仓库中存在某个版本的包，并不代表该版本一定能按预期在所有环境中完美运行。

通过在客户端配置中明确指定 `@1587causalai/configurable-personal-fs-server@0.1.1`，并确保客户端加载了这个最新版本，我们的定制 MCP 服务器最终得以在 Cursor 中完全正常运行，其工具也能够被正确识别和调用。

这部分经历也再次印证了版本管理和客户端配置细节在实际部署中的重要性。

## 5. 后续步骤与注意事项

*   **版本控制**: 每次更新代码并希望重新发布时，务必在 `package.json` 中升级 `version` 字段 (遵循语义化版本规范，如 `0.1.1`, `0.2.0`, `1.0.0`)，然后再运行 `npm publish`。
*   **本地测试**: 在发布前，可以使用 `npm link` 在本地模拟全局安装并测试 `bin` 命令，或直接用 `node dist/index.js [params]` 测试编译后的脚本。
*   **文档同步**: 随着功能的迭代，记得同步更新 `src/filesystem/README.md` 以及相关的 `docs` 目录下的文档。

通过这些步骤，我们成功地将一个本地开发的定制 MCP 服务器转化为了一个公开可用的 npm 包，极大地扩展了其可用性和分享的便利性。这是我们 MCP 定制之旅的一个重要里程碑！ 