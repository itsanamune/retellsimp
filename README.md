# Retell AI MCP Server

A Model Context Protocol (MCP) server that provides tools for interacting with the [Retell AI](https://retellai.com) API. Build, test, deploy, and monitor AI phone agents directly through Claude or other MCP-compatible clients.

## Features

This MCP server exposes 45+ tools covering all major Retell AI API endpoints:

### Call Management
- Create outbound phone calls and web calls
- Retrieve call details including transcripts and recordings
- List and filter calls with pagination
- Update call metadata and data storage settings
- Delete calls and associated data

### Chat Management
- Create chat sessions and SMS conversations
- Send messages and receive responses
- List and manage chat sessions

### Phone Number Management
- Purchase/register new phone numbers
- Import existing numbers via SIP
- Configure inbound/outbound agents per number
- List and manage phone numbers

### Agent Management
- Create and configure voice agents
- Create and configure chat agents
- Publish agent versions
- Manage agent settings (voice, language, behavior)

### LLM & Conversation Flow
- Create and manage Retell LLM configurations
- Design conversation flows with node-based structure
- Configure custom prompts and function calling

### Knowledge Base
- Create knowledge bases for agent context
- Add sources (URLs, text, documents)
- Manage knowledge base sources

### Voice & Batch Operations
- List available voices
- Schedule batch outbound calls
- Run automated agent tests

### Account
- Check concurrent call limits

## Installation

```bash
npm install
npm run build
```

## Configuration

### Environment Variable

Set your Retell AI API key as an environment variable:

```bash
export RETELL_API_KEY="your-api-key-here"
```

Get your API key from the [Retell AI Dashboard](https://dashboard.retellai.com/).

### Claude Code Configuration

#### Option 1: Using the CLI (Recommended)

Add the MCP server using the `claude mcp add` command:

```bash
claude mcp add --transport stdio retell-ai -e RETELL_API_KEY=your-api-key-here -- node /path/to/retell-ai-mcp/dist/index.js
```

You can also use environment variable expansion:

```bash
claude mcp add --transport stdio retell-ai -e RETELL_API_KEY=\${RETELL_API_KEY} -- node /path/to/retell-ai-mcp/dist/index.js
```

#### Option 2: Project Configuration File

Create a `.mcp.json` file in your project root to share with your team:

```json
{
  "mcpServers": {
    "retell-ai": {
      "command": "node",
      "args": ["/path/to/retell-ai-mcp/dist/index.js"],
      "env": {
        "RETELL_API_KEY": "${RETELL_API_KEY}"
      }
    }
  }
}
```

The `${RETELL_API_KEY}` syntax will expand the environment variable at runtime.

#### Managing the Server

```bash
# List configured MCP servers
claude mcp list

# Get details about the retell-ai server
claude mcp get retell-ai

# Remove the server
claude mcp remove retell-ai
```

### Claude Desktop Configuration

Add this to your Claude Desktop config file:

**macOS**: `~/Library/Application Support/Claude/claude_desktop_config.json`
**Windows**: `%APPDATA%\Claude\claude_desktop_config.json`

```json
{
  "mcpServers": {
    "retell-ai": {
      "command": "node",
      "args": ["/path/to/retell-ai-mcp/dist/index.js"],
      "env": {
        "RETELL_API_KEY": "your-api-key-here"
      }
    }
  }
}
```

## Available Tools

### Call Tools
| Tool | Description |
|------|-------------|
| `retell_create_phone_call` | Create a new outbound phone call |
| `retell_create_web_call` | Create a new web call session |
| `retell_get_call` | Retrieve details of a specific call |
| `retell_list_calls` | List and filter calls |
| `retell_update_call` | Update call metadata |
| `retell_delete_call` | Delete a call |

### Chat Tools
| Tool | Description |
|------|-------------|
| `retell_create_chat` | Create a chat session |
| `retell_create_sms_chat` | Start an SMS conversation |
| `retell_get_chat` | Get chat details |
| `retell_create_chat_completion` | Send a message |
| `retell_list_chats` | List all chats |
| `retell_end_chat` | End a chat session |

### Phone Number Tools
| Tool | Description |
|------|-------------|
| `retell_create_phone_number` | Purchase a phone number |
| `retell_get_phone_number` | Get phone number details |
| `retell_list_phone_numbers` | List all phone numbers |
| `retell_update_phone_number` | Update phone number settings |
| `retell_delete_phone_number` | Delete a phone number |
| `retell_import_phone_number` | Import via SIP |

### Voice Agent Tools
| Tool | Description |
|------|-------------|
| `retell_create_agent` | Create a voice agent |
| `retell_get_agent` | Get agent details |
| `retell_list_agents` | List all agents |
| `retell_update_agent` | Update agent config |
| `retell_delete_agent` | Delete an agent |
| `retell_publish_agent` | Publish agent version |
| `retell_get_agent_versions` | Get version history |

### Chat Agent Tools
| Tool | Description |
|------|-------------|
| `retell_create_chat_agent` | Create a chat agent |
| `retell_get_chat_agent` | Get chat agent details |
| `retell_list_chat_agents` | List chat agents |
| `retell_update_chat_agent` | Update chat agent |
| `retell_delete_chat_agent` | Delete chat agent |

### LLM Tools
| Tool | Description |
|------|-------------|
| `retell_create_llm` | Create LLM configuration |
| `retell_get_llm` | Get LLM details |
| `retell_list_llms` | List all LLMs |
| `retell_update_llm` | Update LLM config |
| `retell_delete_llm` | Delete LLM |

### Conversation Flow Tools
| Tool | Description |
|------|-------------|
| `retell_create_conversation_flow` | Create a flow |
| `retell_get_conversation_flow` | Get flow details |
| `retell_list_conversation_flows` | List all flows |
| `retell_update_conversation_flow` | Update a flow |
| `retell_delete_conversation_flow` | Delete a flow |

### Knowledge Base Tools
| Tool | Description |
|------|-------------|
| `retell_create_knowledge_base` | Create knowledge base |
| `retell_get_knowledge_base` | Get KB details |
| `retell_list_knowledge_bases` | List all KBs |
| `retell_delete_knowledge_base` | Delete KB |
| `retell_add_knowledge_base_sources` | Add sources |
| `retell_delete_knowledge_base_source` | Remove source |

### Voice Tools
| Tool | Description |
|------|-------------|
| `retell_get_voice` | Get voice details |
| `retell_list_voices` | List available voices |

### Batch Tools
| Tool | Description |
|------|-------------|
| `retell_create_batch_call` | Schedule bulk calls |
| `retell_create_batch_test` | Run agent tests |

### Account Tools
| Tool | Description |
|------|-------------|
| `retell_get_concurrency` | Check call limits |
| `retell_register_phone_call` | Register inbound call |

## Example Usage

Once configured, you can use Claude to interact with Retell AI:

**List available voices:**
> "Show me all available voices for Retell AI"

**Create an agent:**
> "Create a new voice agent named 'Support Bot' using the voice '11labs-Adrian' with a friendly greeting"

**Make a phone call:**
> "Call +1234567890 from my registered number +0987654321 using the Support Bot agent"

**Check call history:**
> "Show me all calls from the last 24 hours"

## Development

```bash
# Install dependencies
npm install

# Build TypeScript
npm run build

# Watch mode for development
npm run dev
```

## License

MIT

## Links

- [Retell AI Documentation](https://docs.retellai.com)
- [Retell AI Dashboard](https://dashboard.retellai.com)
- [Claude Code MCP Documentation](https://code.claude.com/docs/en/mcp)
- [MCP Protocol](https://modelcontextprotocol.io)
