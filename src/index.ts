#!/usr/bin/env node

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  Tool,
} from "@modelcontextprotocol/sdk/types.js";

const RETELL_API_BASE = "https://api.retellai.com";

// Get API key from environment
function getApiKey(): string {
  const apiKey = process.env.RETELL_API_KEY;
  if (!apiKey) {
    throw new Error("RETELL_API_KEY environment variable is required");
  }
  return apiKey;
}

// Generic API request helper
async function retellRequest(
  endpoint: string,
  method: string = "GET",
  body?: Record<string, unknown>
): Promise<unknown> {
  const apiKey = getApiKey();

  const headers: Record<string, string> = {
    "Authorization": `Bearer ${apiKey}`,
    "Content-Type": "application/json",
  };

  const options: RequestInit = {
    method,
    headers,
  };

  if (body && method !== "GET") {
    options.body = JSON.stringify(body);
  }

  const response = await fetch(`${RETELL_API_BASE}${endpoint}`, options);

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Retell API error (${response.status}): ${errorText}`);
  }

  // Handle 204 No Content
  if (response.status === 204) {
    return { success: true };
  }

  return response.json();
}

// Define all MCP tools for Retell AI
const tools: Tool[] = [
  // ========== CALL MANAGEMENT (V2) ==========
  {
    name: "retell_create_phone_call",
    description: "Create a new outbound phone call using Retell AI. Initiates a call from a registered phone number to a target number using a configured AI agent.",
    inputSchema: {
      type: "object",
      properties: {
        from_number: {
          type: "string",
          description: "The caller's phone number in E.164 format (e.g., +14157774444). Must be a number registered with Retell."
        },
        to_number: {
          type: "string",
          description: "The recipient's phone number in E.164 format (e.g., +12137774445)"
        },
        override_agent_id: {
          type: "string",
          description: "Optional: Specific agent ID to use for this call instead of the number's default agent"
        },
        metadata: {
          type: "object",
          description: "Optional: Custom metadata to attach to the call for tracking purposes"
        },
        retell_llm_dynamic_variables: {
          type: "object",
          description: "Optional: Dynamic variables to pass to the LLM for personalized responses"
        }
      },
      required: ["from_number", "to_number"]
    }
  },
  {
    name: "retell_create_web_call",
    description: "Create a new web call session. Returns a call ID and access token for establishing a WebRTC connection.",
    inputSchema: {
      type: "object",
      properties: {
        agent_id: {
          type: "string",
          description: "The agent ID to use for the web call"
        },
        metadata: {
          type: "object",
          description: "Optional: Custom metadata to attach to the call"
        },
        retell_llm_dynamic_variables: {
          type: "object",
          description: "Optional: Dynamic variables to pass to the LLM"
        }
      },
      required: ["agent_id"]
    }
  },
  {
    name: "retell_get_call",
    description: "Retrieve details of a specific call including transcript, recording URL, duration, and analysis.",
    inputSchema: {
      type: "object",
      properties: {
        call_id: {
          type: "string",
          description: "The unique identifier of the call to retrieve"
        }
      },
      required: ["call_id"]
    }
  },
  {
    name: "retell_list_calls",
    description: "List and filter calls with pagination support. Can filter by agent, status, time range, and more.",
    inputSchema: {
      type: "object",
      properties: {
        filter_criteria: {
          type: "object",
          description: "Optional filter criteria",
          properties: {
            agent_id: { type: "array", items: { type: "string" }, description: "Filter by agent IDs" },
            call_type: { type: "array", items: { type: "string" }, description: "Filter by call type (phone_call, web_call)" },
            call_status: { type: "array", items: { type: "string" }, description: "Filter by status (registered, ongoing, ended, error)" },
            start_timestamp_gte: { type: "integer", description: "Filter calls starting after this Unix timestamp" },
            start_timestamp_lte: { type: "integer", description: "Filter calls starting before this Unix timestamp" }
          }
        },
        limit: {
          type: "integer",
          description: "Number of results to return (default: 50, max: 1000)"
        },
        pagination_key: {
          type: "string",
          description: "Pagination key from previous response for fetching next page"
        },
        sort_order: {
          type: "string",
          enum: ["ascending", "descending"],
          description: "Sort order by start timestamp"
        }
      }
    }
  },
  {
    name: "retell_update_call",
    description: "Update call metadata or data storage settings for a specific call.",
    inputSchema: {
      type: "object",
      properties: {
        call_id: {
          type: "string",
          description: "The unique identifier of the call to update"
        },
        metadata: {
          type: "object",
          description: "New metadata to set for the call"
        },
        data_storage_setting: {
          type: "string",
          enum: ["everything", "everything_except_pii", "basic_attributes_only"],
          description: "Data retention policy for the call"
        }
      },
      required: ["call_id"]
    }
  },
  {
    name: "retell_delete_call",
    description: "Delete a call and all associated data including recordings and transcripts.",
    inputSchema: {
      type: "object",
      properties: {
        call_id: {
          type: "string",
          description: "The unique identifier of the call to delete"
        }
      },
      required: ["call_id"]
    }
  },

  // ========== CHAT MANAGEMENT ==========
  {
    name: "retell_create_chat",
    description: "Create a new chat session with a chat agent.",
    inputSchema: {
      type: "object",
      properties: {
        agent_id: {
          type: "string",
          description: "The chat agent ID to use for the session"
        },
        metadata: {
          type: "object",
          description: "Optional: Custom metadata for the chat session"
        },
        retell_llm_dynamic_variables: {
          type: "object",
          description: "Optional: Dynamic variables for personalized responses"
        }
      },
      required: ["agent_id"]
    }
  },
  {
    name: "retell_create_sms_chat",
    description: "Start an outbound SMS conversation using a specified chat agent.",
    inputSchema: {
      type: "object",
      properties: {
        from_number: {
          type: "string",
          description: "The sender's phone number in E.164 format"
        },
        to_number: {
          type: "string",
          description: "The recipient's phone number in E.164 format"
        },
        agent_id: {
          type: "string",
          description: "The chat agent ID to handle the conversation"
        },
        metadata: {
          type: "object",
          description: "Optional: Custom metadata for the SMS chat"
        }
      },
      required: ["from_number", "to_number", "agent_id"]
    }
  },
  {
    name: "retell_get_chat",
    description: "Retrieve details of a specific chat session.",
    inputSchema: {
      type: "object",
      properties: {
        chat_id: {
          type: "string",
          description: "The unique identifier of the chat to retrieve"
        }
      },
      required: ["chat_id"]
    }
  },
  {
    name: "retell_create_chat_completion",
    description: "Send a message in an existing chat session and get the agent's response.",
    inputSchema: {
      type: "object",
      properties: {
        chat_id: {
          type: "string",
          description: "The chat session ID"
        },
        content: {
          type: "string",
          description: "The message content to send"
        }
      },
      required: ["chat_id", "content"]
    }
  },
  {
    name: "retell_list_chats",
    description: "List all chat sessions with optional filtering.",
    inputSchema: {
      type: "object",
      properties: {
        limit: {
          type: "integer",
          description: "Number of results to return"
        },
        pagination_key: {
          type: "string",
          description: "Pagination key for fetching next page"
        }
      }
    }
  },
  {
    name: "retell_end_chat",
    description: "End an active chat session.",
    inputSchema: {
      type: "object",
      properties: {
        chat_id: {
          type: "string",
          description: "The chat session ID to end"
        }
      },
      required: ["chat_id"]
    }
  },

  // ========== PHONE NUMBER MANAGEMENT ==========
  {
    name: "retell_create_phone_number",
    description: "Register/purchase a new phone number for use with Retell AI agents.",
    inputSchema: {
      type: "object",
      properties: {
        area_code: {
          type: "string",
          description: "The area code for the phone number (e.g., '415' for San Francisco)"
        },
        inbound_agent_id: {
          type: "string",
          description: "Optional: Agent ID to handle inbound calls to this number"
        },
        outbound_agent_id: {
          type: "string",
          description: "Optional: Agent ID to use for outbound calls from this number"
        },
        nickname: {
          type: "string",
          description: "Optional: A friendly name for the phone number"
        }
      },
      required: ["area_code"]
    }
  },
  {
    name: "retell_get_phone_number",
    description: "Retrieve details of a specific phone number.",
    inputSchema: {
      type: "object",
      properties: {
        phone_number: {
          type: "string",
          description: "The phone number in E.164 format to retrieve"
        }
      },
      required: ["phone_number"]
    }
  },
  {
    name: "retell_list_phone_numbers",
    description: "List all phone numbers registered with your Retell account.",
    inputSchema: {
      type: "object",
      properties: {}
    }
  },
  {
    name: "retell_update_phone_number",
    description: "Update settings for a phone number including assigned agents.",
    inputSchema: {
      type: "object",
      properties: {
        phone_number: {
          type: "string",
          description: "The phone number in E.164 format to update"
        },
        inbound_agent_id: {
          type: "string",
          description: "New agent ID for inbound calls (null to remove)"
        },
        outbound_agent_id: {
          type: "string",
          description: "New agent ID for outbound calls (null to remove)"
        },
        nickname: {
          type: "string",
          description: "New nickname for the phone number"
        }
      },
      required: ["phone_number"]
    }
  },
  {
    name: "retell_delete_phone_number",
    description: "Delete/release a phone number from your account.",
    inputSchema: {
      type: "object",
      properties: {
        phone_number: {
          type: "string",
          description: "The phone number in E.164 format to delete"
        }
      },
      required: ["phone_number"]
    }
  },
  {
    name: "retell_import_phone_number",
    description: "Import an existing phone number from an external provider via SIP.",
    inputSchema: {
      type: "object",
      properties: {
        phone_number: {
          type: "string",
          description: "The phone number to import in E.164 format"
        },
        termination_uri: {
          type: "string",
          description: "SIP termination URI for the phone number"
        },
        inbound_agent_id: {
          type: "string",
          description: "Optional: Agent ID for inbound calls"
        },
        outbound_agent_id: {
          type: "string",
          description: "Optional: Agent ID for outbound calls"
        }
      },
      required: ["phone_number", "termination_uri"]
    }
  },

  // ========== VOICE AGENT MANAGEMENT ==========
  {
    name: "retell_create_agent",
    description: "Create a new voice agent with specified configuration including voice, LLM engine, and behavior settings.",
    inputSchema: {
      type: "object",
      properties: {
        voice_id: {
          type: "string",
          description: "The voice ID to use for the agent (use retell_list_voices to see available voices)"
        },
        response_engine: {
          type: "object",
          description: "The LLM engine configuration. Use type: 'retell-llm' with llm_id, or type: 'conversation-flow' with conversation_flow_id",
          properties: {
            type: {
              type: "string",
              enum: ["retell-llm", "custom-llm", "conversation-flow"],
              description: "The type of response engine"
            },
            llm_id: {
              type: "string",
              description: "The LLM ID (for retell-llm type)"
            },
            conversation_flow_id: {
              type: "string",
              description: "The conversation flow ID (for conversation-flow type)"
            }
          },
          required: ["type"]
        },
        agent_name: {
          type: "string",
          description: "Optional: Display name for the agent"
        },
        language: {
          type: "string",
          description: "Language code (e.g., 'en-US', 'es-ES', 'multi' for multilingual)"
        },
        voice_model: {
          type: "string",
          enum: ["eleven_turbo_v2", "eleven_flash_v2", "eleven_flash_v2_5", "tts-1", "gpt-4o-mini-tts", "azure", "deepgram", "smallest-ai"],
          description: "Text-to-speech model to use"
        },
        voice_temperature: {
          type: "number",
          description: "Voice naturalness (0-2, default 1)"
        },
        voice_speed: {
          type: "number",
          description: "Speech rate (0.5-2, default 1)"
        },
        interruption_sensitivity: {
          type: "number",
          description: "How sensitive to user interruptions (0-1)"
        },
        enable_backchannel: {
          type: "boolean",
          description: "Enable conversational acknowledgments like 'uh-huh', 'I see'"
        },
        end_call_after_silence_ms: {
          type: "integer",
          description: "Milliseconds of silence before ending call"
        },
        max_call_duration_ms: {
          type: "integer",
          description: "Maximum call duration in milliseconds"
        },
        webhook_url: {
          type: "string",
          description: "URL for receiving call event webhooks"
        }
      },
      required: ["voice_id", "response_engine"]
    }
  },
  {
    name: "retell_get_agent",
    description: "Retrieve the configuration and details of a specific voice agent.",
    inputSchema: {
      type: "object",
      properties: {
        agent_id: {
          type: "string",
          description: "The unique identifier of the agent"
        }
      },
      required: ["agent_id"]
    }
  },
  {
    name: "retell_list_agents",
    description: "List all voice agents in your Retell account.",
    inputSchema: {
      type: "object",
      properties: {}
    }
  },
  {
    name: "retell_update_agent",
    description: "Update configuration for an existing voice agent.",
    inputSchema: {
      type: "object",
      properties: {
        agent_id: {
          type: "string",
          description: "The agent ID to update"
        },
        agent_name: {
          type: "string",
          description: "New display name"
        },
        voice_id: {
          type: "string",
          description: "New voice ID"
        },
        language: {
          type: "string",
          description: "New language code"
        },
        webhook_url: {
          type: "string",
          description: "New webhook URL"
        },
        interruption_sensitivity: {
          type: "number",
          description: "New interruption sensitivity"
        },
        enable_backchannel: {
          type: "boolean",
          description: "Enable/disable backchannel"
        }
      },
      required: ["agent_id"]
    }
  },
  {
    name: "retell_delete_agent",
    description: "Delete a voice agent from your account.",
    inputSchema: {
      type: "object",
      properties: {
        agent_id: {
          type: "string",
          description: "The agent ID to delete"
        }
      },
      required: ["agent_id"]
    }
  },
  {
    name: "retell_publish_agent",
    description: "Publish/deploy the current agent configuration as a new version.",
    inputSchema: {
      type: "object",
      properties: {
        agent_id: {
          type: "string",
          description: "The agent ID to publish"
        }
      },
      required: ["agent_id"]
    }
  },
  {
    name: "retell_get_agent_versions",
    description: "Retrieve the version history of an agent.",
    inputSchema: {
      type: "object",
      properties: {
        agent_id: {
          type: "string",
          description: "The agent ID to get versions for"
        }
      },
      required: ["agent_id"]
    }
  },

  // ========== CHAT AGENT MANAGEMENT ==========
  {
    name: "retell_create_chat_agent",
    description: "Create a new chat agent for text-based conversations.",
    inputSchema: {
      type: "object",
      properties: {
        response_engine: {
          type: "object",
          description: "The LLM engine configuration",
          properties: {
            type: {
              type: "string",
              enum: ["retell-llm", "custom-llm"],
              description: "The type of response engine"
            },
            llm_id: {
              type: "string",
              description: "The LLM ID to use"
            }
          },
          required: ["type"]
        },
        agent_name: {
          type: "string",
          description: "Display name for the chat agent"
        },
        webhook_url: {
          type: "string",
          description: "URL for receiving chat event webhooks"
        }
      },
      required: ["response_engine"]
    }
  },
  {
    name: "retell_get_chat_agent",
    description: "Retrieve details of a specific chat agent.",
    inputSchema: {
      type: "object",
      properties: {
        agent_id: {
          type: "string",
          description: "The chat agent ID"
        }
      },
      required: ["agent_id"]
    }
  },
  {
    name: "retell_list_chat_agents",
    description: "List all chat agents in your account.",
    inputSchema: {
      type: "object",
      properties: {}
    }
  },
  {
    name: "retell_update_chat_agent",
    description: "Update a chat agent's configuration.",
    inputSchema: {
      type: "object",
      properties: {
        agent_id: {
          type: "string",
          description: "The chat agent ID to update"
        },
        agent_name: {
          type: "string",
          description: "New display name"
        },
        webhook_url: {
          type: "string",
          description: "New webhook URL"
        }
      },
      required: ["agent_id"]
    }
  },
  {
    name: "retell_delete_chat_agent",
    description: "Delete a chat agent.",
    inputSchema: {
      type: "object",
      properties: {
        agent_id: {
          type: "string",
          description: "The chat agent ID to delete"
        }
      },
      required: ["agent_id"]
    }
  },

  // ========== RETELL LLM MANAGEMENT ==========
  {
    name: "retell_create_llm",
    description: "Create a new Retell LLM configuration with custom prompts and settings.",
    inputSchema: {
      type: "object",
      properties: {
        model: {
          type: "string",
          description: "The base model (e.g., 'gpt-4o', 'claude-3.5-sonnet', 'gpt-4o-mini')"
        },
        general_prompt: {
          type: "string",
          description: "The main system prompt defining the agent's behavior and personality"
        },
        begin_message: {
          type: "string",
          description: "Optional: The greeting message the agent says when call starts"
        },
        general_tools: {
          type: "array",
          description: "Optional: Array of tool configurations for function calling",
          items: {
            type: "object"
          }
        },
        inbound_dynamic_variables_webhook_url: {
          type: "string",
          description: "Optional: Webhook URL to fetch dynamic variables for inbound calls"
        },
        knowledge_base_ids: {
          type: "array",
          items: { type: "string" },
          description: "Optional: Array of knowledge base IDs to use"
        }
      },
      required: ["model", "general_prompt"]
    }
  },
  {
    name: "retell_get_llm",
    description: "Retrieve a Retell LLM configuration.",
    inputSchema: {
      type: "object",
      properties: {
        llm_id: {
          type: "string",
          description: "The LLM configuration ID"
        }
      },
      required: ["llm_id"]
    }
  },
  {
    name: "retell_list_llms",
    description: "List all Retell LLM configurations.",
    inputSchema: {
      type: "object",
      properties: {}
    }
  },
  {
    name: "retell_update_llm",
    description: "Update a Retell LLM configuration.",
    inputSchema: {
      type: "object",
      properties: {
        llm_id: {
          type: "string",
          description: "The LLM configuration ID to update"
        },
        model: {
          type: "string",
          description: "New base model"
        },
        general_prompt: {
          type: "string",
          description: "New system prompt"
        },
        begin_message: {
          type: "string",
          description: "New greeting message"
        }
      },
      required: ["llm_id"]
    }
  },
  {
    name: "retell_delete_llm",
    description: "Delete a Retell LLM configuration.",
    inputSchema: {
      type: "object",
      properties: {
        llm_id: {
          type: "string",
          description: "The LLM configuration ID to delete"
        }
      },
      required: ["llm_id"]
    }
  },

  // ========== CONVERSATION FLOW MANAGEMENT ==========
  {
    name: "retell_create_conversation_flow",
    description: "Create a new conversation flow for structured, node-based conversation design.",
    inputSchema: {
      type: "object",
      properties: {
        name: {
          type: "string",
          description: "Name for the conversation flow"
        },
        nodes: {
          type: "array",
          description: "Array of node configurations defining the flow"
        },
        edges: {
          type: "array",
          description: "Array of edge configurations connecting nodes"
        }
      },
      required: ["name"]
    }
  },
  {
    name: "retell_get_conversation_flow",
    description: "Retrieve a conversation flow configuration.",
    inputSchema: {
      type: "object",
      properties: {
        conversation_flow_id: {
          type: "string",
          description: "The conversation flow ID"
        }
      },
      required: ["conversation_flow_id"]
    }
  },
  {
    name: "retell_list_conversation_flows",
    description: "List all conversation flows.",
    inputSchema: {
      type: "object",
      properties: {}
    }
  },
  {
    name: "retell_update_conversation_flow",
    description: "Update a conversation flow.",
    inputSchema: {
      type: "object",
      properties: {
        conversation_flow_id: {
          type: "string",
          description: "The conversation flow ID to update"
        },
        name: {
          type: "string",
          description: "New name"
        },
        nodes: {
          type: "array",
          description: "Updated nodes"
        },
        edges: {
          type: "array",
          description: "Updated edges"
        }
      },
      required: ["conversation_flow_id"]
    }
  },
  {
    name: "retell_delete_conversation_flow",
    description: "Delete a conversation flow.",
    inputSchema: {
      type: "object",
      properties: {
        conversation_flow_id: {
          type: "string",
          description: "The conversation flow ID to delete"
        }
      },
      required: ["conversation_flow_id"]
    }
  },

  // ========== KNOWLEDGE BASE MANAGEMENT ==========
  {
    name: "retell_create_knowledge_base",
    description: "Create a new knowledge base for providing context to agents.",
    inputSchema: {
      type: "object",
      properties: {
        knowledge_base_name: {
          type: "string",
          description: "Name for the knowledge base"
        },
        enable_auto_refresh: {
          type: "boolean",
          description: "Whether to automatically refresh sources"
        }
      },
      required: ["knowledge_base_name"]
    }
  },
  {
    name: "retell_get_knowledge_base",
    description: "Retrieve a knowledge base configuration.",
    inputSchema: {
      type: "object",
      properties: {
        knowledge_base_id: {
          type: "string",
          description: "The knowledge base ID"
        }
      },
      required: ["knowledge_base_id"]
    }
  },
  {
    name: "retell_list_knowledge_bases",
    description: "List all knowledge bases.",
    inputSchema: {
      type: "object",
      properties: {}
    }
  },
  {
    name: "retell_delete_knowledge_base",
    description: "Delete a knowledge base.",
    inputSchema: {
      type: "object",
      properties: {
        knowledge_base_id: {
          type: "string",
          description: "The knowledge base ID to delete"
        }
      },
      required: ["knowledge_base_id"]
    }
  },
  {
    name: "retell_add_knowledge_base_sources",
    description: "Add documentation sources (URLs or text) to a knowledge base.",
    inputSchema: {
      type: "object",
      properties: {
        knowledge_base_id: {
          type: "string",
          description: "The knowledge base ID"
        },
        sources: {
          type: "array",
          description: "Array of source configurations",
          items: {
            type: "object",
            properties: {
              type: {
                type: "string",
                enum: ["url", "text", "document"],
                description: "Source type"
              },
              url: {
                type: "string",
                description: "URL for url type sources"
              },
              content: {
                type: "string",
                description: "Text content for text type sources"
              },
              title: {
                type: "string",
                description: "Title for the source"
              }
            }
          }
        }
      },
      required: ["knowledge_base_id", "sources"]
    }
  },
  {
    name: "retell_delete_knowledge_base_source",
    description: "Remove a source from a knowledge base.",
    inputSchema: {
      type: "object",
      properties: {
        knowledge_base_id: {
          type: "string",
          description: "The knowledge base ID"
        },
        source_id: {
          type: "string",
          description: "The source ID to delete"
        }
      },
      required: ["knowledge_base_id", "source_id"]
    }
  },

  // ========== VOICE MANAGEMENT ==========
  {
    name: "retell_get_voice",
    description: "Retrieve details of a specific voice.",
    inputSchema: {
      type: "object",
      properties: {
        voice_id: {
          type: "string",
          description: "The voice ID to retrieve"
        }
      },
      required: ["voice_id"]
    }
  },
  {
    name: "retell_list_voices",
    description: "List all available voices for use with agents.",
    inputSchema: {
      type: "object",
      properties: {}
    }
  },

  // ========== BATCH OPERATIONS ==========
  {
    name: "retell_create_batch_call",
    description: "Schedule bulk outbound phone calls.",
    inputSchema: {
      type: "object",
      properties: {
        from_number: {
          type: "string",
          description: "The caller's phone number"
        },
        tasks: {
          type: "array",
          description: "Array of call tasks with to_number and optional metadata",
          items: {
            type: "object",
            properties: {
              to_number: { type: "string" },
              metadata: { type: "object" },
              retell_llm_dynamic_variables: { type: "object" }
            },
            required: ["to_number"]
          }
        },
        name: {
          type: "string",
          description: "Name for the batch job"
        },
        trigger_timestamp: {
          type: "integer",
          description: "Unix timestamp to start the batch (optional, starts immediately if not set)"
        }
      },
      required: ["from_number", "tasks"]
    }
  },
  {
    name: "retell_create_batch_test",
    description: "Run automated test scenarios against an agent.",
    inputSchema: {
      type: "object",
      properties: {
        agent_id: {
          type: "string",
          description: "The agent ID to test"
        },
        test_cases: {
          type: "array",
          description: "Array of test case configurations"
        }
      },
      required: ["agent_id", "test_cases"]
    }
  },

  // ========== ACCOUNT & TELEPHONY ==========
  {
    name: "retell_get_concurrency",
    description: "Check the current concurrent call limits and usage for your account.",
    inputSchema: {
      type: "object",
      properties: {}
    }
  },
  {
    name: "retell_register_phone_call",
    description: "Register an inbound call from a custom telephony provider.",
    inputSchema: {
      type: "object",
      properties: {
        agent_id: {
          type: "string",
          description: "The agent ID to handle the call"
        },
        from_number: {
          type: "string",
          description: "The caller's phone number"
        },
        to_number: {
          type: "string",
          description: "The called number"
        },
        metadata: {
          type: "object",
          description: "Optional metadata for the call"
        }
      },
      required: ["agent_id", "from_number", "to_number"]
    }
  }
];

// Tool execution handler
async function executeTool(name: string, args: Record<string, unknown>): Promise<unknown> {
  switch (name) {
    // Call Management
    case "retell_create_phone_call":
      return retellRequest("/v2/create-phone-call", "POST", args);
    case "retell_create_web_call":
      return retellRequest("/v2/create-web-call", "POST", args);
    case "retell_get_call":
      return retellRequest(`/v2/get-call/${args.call_id}`, "GET");
    case "retell_list_calls":
      return retellRequest("/v2/list-calls", "POST", args);
    case "retell_update_call": {
      const { call_id, ...updateData } = args;
      return retellRequest(`/v2/update-call/${call_id}`, "PATCH", updateData as Record<string, unknown>);
    }
    case "retell_delete_call":
      return retellRequest(`/v2/delete-call/${args.call_id}`, "DELETE");

    // Chat Management
    case "retell_create_chat":
      return retellRequest("/create-chat", "POST", args);
    case "retell_create_sms_chat":
      return retellRequest("/create-sms-chat", "POST", args);
    case "retell_get_chat":
      return retellRequest(`/get-chat/${args.chat_id}`, "GET");
    case "retell_create_chat_completion":
      return retellRequest("/create-chat-completion", "POST", args);
    case "retell_list_chats":
      return retellRequest("/list-chat", "GET");
    case "retell_end_chat":
      return retellRequest("/end-chat", "PATCH", args);

    // Phone Number Management
    case "retell_create_phone_number":
      return retellRequest("/create-phone-number", "POST", args);
    case "retell_get_phone_number":
      return retellRequest(`/get-phone-number/${encodeURIComponent(args.phone_number as string)}`, "GET");
    case "retell_list_phone_numbers":
      return retellRequest("/list-phone-numbers", "GET");
    case "retell_update_phone_number": {
      const { phone_number, ...phoneUpdateData } = args;
      return retellRequest(`/update-phone-number/${encodeURIComponent(phone_number as string)}`, "PATCH", phoneUpdateData as Record<string, unknown>);
    }
    case "retell_delete_phone_number":
      return retellRequest(`/delete-phone-number/${encodeURIComponent(args.phone_number as string)}`, "DELETE");
    case "retell_import_phone_number":
      return retellRequest("/import-phone-number", "POST", args);

    // Voice Agent Management
    case "retell_create_agent":
      return retellRequest("/create-agent", "POST", args);
    case "retell_get_agent":
      return retellRequest(`/get-agent/${args.agent_id}`, "GET");
    case "retell_list_agents":
      return retellRequest("/list-agents", "GET");
    case "retell_update_agent": {
      const { agent_id, ...agentUpdateData } = args;
      return retellRequest(`/update-agent/${agent_id}`, "PATCH", agentUpdateData as Record<string, unknown>);
    }
    case "retell_delete_agent":
      return retellRequest(`/delete-agent/${args.agent_id}`, "DELETE");
    case "retell_publish_agent":
      return retellRequest(`/publish-agent/${args.agent_id}`, "POST");
    case "retell_get_agent_versions":
      return retellRequest(`/get-agent-versions/${args.agent_id}`, "GET");

    // Chat Agent Management
    case "retell_create_chat_agent":
      return retellRequest("/create-chat-agent", "POST", args);
    case "retell_get_chat_agent":
      return retellRequest(`/get-chat-agent/${args.agent_id}`, "GET");
    case "retell_list_chat_agents":
      return retellRequest("/list-chat-agents", "GET");
    case "retell_update_chat_agent": {
      const { agent_id: chatAgentId, ...chatAgentUpdateData } = args;
      return retellRequest(`/update-chat-agent/${chatAgentId}`, "PATCH", chatAgentUpdateData as Record<string, unknown>);
    }
    case "retell_delete_chat_agent":
      return retellRequest(`/delete-chat-agent/${args.agent_id}`, "DELETE");

    // Retell LLM Management
    case "retell_create_llm":
      return retellRequest("/create-retell-llm", "POST", args);
    case "retell_get_llm":
      return retellRequest(`/get-retell-llm/${args.llm_id}`, "GET");
    case "retell_list_llms":
      return retellRequest("/list-retell-llms", "GET");
    case "retell_update_llm": {
      const { llm_id, ...llmUpdateData } = args;
      return retellRequest(`/update-retell-llm/${llm_id}`, "PATCH", llmUpdateData as Record<string, unknown>);
    }
    case "retell_delete_llm":
      return retellRequest(`/delete-retell-llm/${args.llm_id}`, "DELETE");

    // Conversation Flow Management
    case "retell_create_conversation_flow":
      return retellRequest("/create-conversation-flow", "POST", args);
    case "retell_get_conversation_flow":
      return retellRequest(`/get-conversation-flow/${args.conversation_flow_id}`, "GET");
    case "retell_list_conversation_flows":
      return retellRequest("/list-conversation-flows", "GET");
    case "retell_update_conversation_flow": {
      const { conversation_flow_id, ...flowUpdateData } = args;
      return retellRequest(`/update-conversation-flow/${conversation_flow_id}`, "PATCH", flowUpdateData as Record<string, unknown>);
    }
    case "retell_delete_conversation_flow":
      return retellRequest(`/delete-conversation-flow/${args.conversation_flow_id}`, "DELETE");

    // Knowledge Base Management
    case "retell_create_knowledge_base":
      return retellRequest("/create-knowledge-base", "POST", args);
    case "retell_get_knowledge_base":
      return retellRequest(`/get-knowledge-base/${args.knowledge_base_id}`, "GET");
    case "retell_list_knowledge_bases":
      return retellRequest("/list-knowledge-bases", "GET");
    case "retell_delete_knowledge_base":
      return retellRequest(`/delete-knowledge-base/${args.knowledge_base_id}`, "DELETE");
    case "retell_add_knowledge_base_sources": {
      const { knowledge_base_id, sources } = args;
      return retellRequest(`/add-knowledge-base-sources/${knowledge_base_id}`, "POST", { sources });
    }
    case "retell_delete_knowledge_base_source": {
      const { knowledge_base_id: kbId, source_id } = args;
      return retellRequest(`/delete-knowledge-base-source/${kbId}/${source_id}`, "DELETE");
    }

    // Voice Management
    case "retell_get_voice":
      return retellRequest(`/get-voice/${args.voice_id}`, "GET");
    case "retell_list_voices":
      return retellRequest("/list-voices", "GET");

    // Batch Operations
    case "retell_create_batch_call":
      return retellRequest("/create-batch-call", "POST", args);
    case "retell_create_batch_test":
      return retellRequest("/create-batch-test", "POST", args);

    // Account & Telephony
    case "retell_get_concurrency":
      return retellRequest("/get-concurrency", "GET");
    case "retell_register_phone_call":
      return retellRequest("/register-phone-call", "POST", args);

    default:
      throw new Error(`Unknown tool: ${name}`);
  }
}

// Create and configure the MCP server
const server = new Server(
  {
    name: "retell-ai-mcp",
    version: "1.0.0",
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

// Register tool listing handler
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return { tools };
});

// Register tool execution handler
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  try {
    const result = await executeTool(name, args as Record<string, unknown>);
    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(result, null, 2),
        },
      ],
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    return {
      content: [
        {
          type: "text",
          text: `Error: ${errorMessage}`,
        },
      ],
      isError: true,
    };
  }
});

// Start the server
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("Retell AI MCP server running on stdio");
}

main().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});
