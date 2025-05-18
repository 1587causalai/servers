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

// --- Zod Schemas for Tools (all tools currently take no arguments) ---
const NoArgsSchema = z.object({}); // Empty schema for tools without arguments

// Schema for tools that update a document by overwriting its content
const UpdateDocumentArgsSchema = z.object({
  new_content: z.string().describe("文档的全部新 Markdown 内容。"),
});

type ToolInput = z.infer<typeof ToolSchema.shape.inputSchema>;

// --- Server Setup ---
const server = new Server(
  {
    name: "me-server", // Updated server name
    version: "0.1.0",   // Updated server version
  },
  {
    capabilities: {
      tools: {},
    },
  },
);

// --- Tool Definitions and Handlers ---

// Helper function to read a specific file from the dynamicBasePath
async function readMarkdownFile(filename: string): Promise<string> {
  const filePath = path.join(dynamicBasePath, filename);
  try {
    // Basic path validation (ensure it's within the base path - though less critical with fixed filenames)
    if (!normalizePath(filePath).startsWith(dynamicBasePath)) {
        throw new Error(`Attempt to access file outside the configured directory: ${filename}`);
    }
    return await fs.readFile(filePath, "utf-8");
  } catch (error: any) {
    if (error.code === 'ENOENT') {
      throw new Error(`File not found: ${filename} in directory ${dynamicBasePath}. Please ensure the file exists.`);
    }
    throw error; // Re-throw other errors
  }
}

// Helper function to write (overwrite) a specific file in the dynamicBasePath
async function writeMarkdownFile(filename: string, newContent: string): Promise<void> {
  const filePath = path.join(dynamicBasePath, filename);
  try {
    // Basic path validation (ensure it's within the base path)
    if (!normalizePath(filePath).startsWith(dynamicBasePath)) {
        throw new Error(`Attempt to write file outside the configured directory: ${filename}`);
    }
    await fs.writeFile(filePath, newContent, "utf-8");
  } catch (error: any) {
    console.error(`Error writing file ${filename} in directory ${dynamicBasePath}:`, error);
    throw new Error(`Failed to write to ${filename}: ${error.message || 'Unknown error'}`);
  }
}

server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: "get_resume_document",
        description:
          `【开发者个人专属】当需要完整了解您的专业履历、技能和项目经验时，调用此工具读取位于 ${dynamicBasePath} 下的 resume.md 文件，获取您的个人简历全文。`,
        inputSchema: zodToJsonSchema(NoArgsSchema) as ToolInput,
      },
      {
        name: "get_cognitive_core_document",
        description:
          `【开发者个人专属】当需要深入探究您的核心思考、方法论或过往经验总结时，调用此工具读取位于 ${dynamicBasePath} 下的 cognitive_core.md 文件，获取您的认知内核笔记全文。`,
        inputSchema: zodToJsonSchema(NoArgsSchema) as ToolInput,
      },
      {
        name: "get_projects_overview_document",
        description:
          `【开发者个人专属】当需要快速掌握您当前重点关注的 GitHub 项目（如目标、状态、技术栈）时，调用此工具读取位于 ${dynamicBasePath} 下的 projects_overview.md 文件，获取您的项目概览。`,
        inputSchema: zodToJsonSchema(NoArgsSchema) as ToolInput,
      },
      {
        name: "update_resume_document",
        description:
          `【开发者个人专属-修改操作】使用提供的新内容完全覆写位于 ${dynamicBasePath} 下的 resume.md 文件。请谨慎使用，旧内容将被替换。`,
        inputSchema: zodToJsonSchema(UpdateDocumentArgsSchema) as ToolInput,
      },
      {
        name: "update_cognitive_core_document",
        description:
          `【开发者个人专属-修改操作】使用提供的新内容完全覆写位于 ${dynamicBasePath} 下的 cognitive_core.md 文件。请谨慎使用，旧内容将被替换。`,
        inputSchema: zodToJsonSchema(UpdateDocumentArgsSchema) as ToolInput,
      },
      {
        name: "update_projects_overview_document",
        description:
          `【开发者个人专属-修改操作】使用提供的新内容完全覆写位于 ${dynamicBasePath} 下的 projects_overview.md 文件。请谨慎使用，旧内容将被替换。`,
        inputSchema: zodToJsonSchema(UpdateDocumentArgsSchema) as ToolInput,
      },
    ],
  };
});

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  try {
    const { name, arguments: args } = request.params;

    switch (name) {
      case "get_resume_document": {
        const content = await readMarkdownFile("resume.md");
        return {
          content: [{ type: "text", text: content }],
        };
      }
      case "get_cognitive_core_document": {
        const content = await readMarkdownFile("cognitive_core.md");
        return {
          content: [{ type: "text", text: content }],
        };
      }
      case "get_projects_overview_document": {
        const content = await readMarkdownFile("projects_overview.md");
        return {
          content: [{ type: "text", text: content }],
        };
      }
      case "update_resume_document": {
        const parsedArgs = UpdateDocumentArgsSchema.safeParse(args);
        if (!parsedArgs.success) {
          throw new Error(`Invalid arguments for ${name}: ${parsedArgs.error.flatten().fieldErrors.new_content?.join(', ') || 'Invalid input'}`);
        }
        await writeMarkdownFile("resume.md", parsedArgs.data.new_content);
        return {
          content: [{ type: "text", text: `Successfully updated resume.md.` }],
        };
      }
      case "update_cognitive_core_document": {
        const parsedArgs = UpdateDocumentArgsSchema.safeParse(args);
        if (!parsedArgs.success) {
          throw new Error(`Invalid arguments for ${name}: ${parsedArgs.error.flatten().fieldErrors.new_content?.join(', ') || 'Invalid input'}`);
        }
        await writeMarkdownFile("cognitive_core.md", parsedArgs.data.new_content);
        return {
          content: [{ type: "text", text: `Successfully updated cognitive_core.md.` }],
        };
      }
      case "update_projects_overview_document": {
        const parsedArgs = UpdateDocumentArgsSchema.safeParse(args);
        if (!parsedArgs.success) {
          throw new Error(`Invalid arguments for ${name}: ${parsedArgs.error.flatten().fieldErrors.new_content?.join(', ') || 'Invalid input'}`);
        }
        await writeMarkdownFile("projects_overview.md", parsedArgs.data.new_content);
        return {
          content: [{ type: "text", text: `Successfully updated projects_overview.md.` }],
        };
      }
      default:
        throw new Error(`Unknown tool: ${name}`);
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error(`Error calling tool ${request.params.name}:`, errorMessage); // Log server-side error
    return {
      content: [{ type: "text", text: `Error: ${errorMessage}` }],
      isError: true,
    };
  }
});

// --- Start Server ---
async function runServer() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("ME Server (Personal Knowledge Base Assistant) running on stdio");
  console.error("Serving documents from directory:", dynamicBasePath);
}

runServer().catch((error) => {
  console.error("Fatal error running ME Server:", error);
  process.exit(1);
});
