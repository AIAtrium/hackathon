import asyncio
import os
from typing import List, Dict, Any, Tuple
from anthropic import Anthropic
from langfuse.decorators import observe, langfuse_context
from mcp.types import TextResourceContents, BlobResourceContents, Tool
from mcp_client import MCPClient
from whatsapp_client import WhatsappMCPClient
from exa_client import ExaMCPClient
from airbnb_client import AirbnbMCPClient


ENABLED_CLIENTS = [
    "Whatsapp",
    "Exa",
    "Airbnb"
]


class MCPHost:
    def __init__(
        self,
        enabled_clients: List[str] = ENABLED_CLIENTS,
    ):
        self.anthropic = Anthropic()

        # Initialize all client instances but don't use them unless enabled
        self._all_clients = {
            "Whatsapp": WhatsappMCPClient(),
            "Exa": ExaMCPClient(),
            "Airbnb": AirbnbMCPClient(),
        }

        # Use either user-specified clients or all clients by default
        self.enabled_clients = enabled_clients

        # Only include enabled clients in the active clients dict
        self.mcp_clients = {
            name: client
            for name, client in self._all_clients.items()
            if name in self.enabled_clients
        }

        # Only include paths for enabled clients
        self.mcp_client_paths = {
            "Whatsapp": os.getenv("WHATSAPP_MCP_SERVER_PATH"),
            "Exa": os.getenv("EXA_MCP_SERVER_PATH"),
            "Airbnb": os.getenv("AIRBNB_MCP_SERVER_PATH"),
        }
        self.mcp_client_paths = {
            name: path
            for name, path in self.mcp_client_paths.items()
            if name in self.enabled_clients
        }


        # Map of tool names to client names
        self.tool_to_client_map: Dict[str, str] = {}

        # Add a tool reference capability that allows the LLM to reference previous tool outputs
        self.reference_tool_output = {
            "name": "reference_tool_output",
            "description": "Reference the output of a previously called tool",
            "input_schema": {
                "type": "object",
                "properties": {
                    "tool_id": {
                        "type": "string",
                        "description": "The ID of the previously called tool",
                    },
                    "extract_path": {
                        "type": "string",
                        "description": "Optional JSON path to extract specific data from the tool result",
                    },
                },
                "required": ["tool_id"],
            },
        }

    async def initialize_mcp_clients(self):
        for client_name, client_path in self.mcp_client_paths.items():
            print(f"Initializing {client_name} with path {client_path}")
            await self.mcp_clients[client_name].connect_to_server(client_path)

    async def get_all_tools(self, client_list: List[str] = None) -> List[Dict[str, Any]]:
        tools, _ = await self.get_tools_from_servers(client_list)
        server_tools = [
            {
                "name": tool.name,
                "description": tool.description,
                "input_schema": tool.inputSchema,
            }
            for tool in tools
        ]

        # Add custom resource access tool
        available_tools = server_tools + [
            self.reference_tool_output,
        ]
        return available_tools
    
    async def get_tools_from_servers(self, client_list: List[str] = None) -> Tuple[List[Tool], Dict[str, str]]:
        """Get all tools from all servers and map tool names to client names"""
        tools: List[Tool] = []
        tool_to_client_map: Dict[str, str] = {}

        for client_name, client in self.mcp_clients.items():
            if client_list and client_name not in client_list:
                continue

            response = await client.session.list_tools()
            if response.tools:
                for tool in response.tools:
                    tools.append(tool)
                    # Map this tool name to the client that provides it
                    tool_to_client_map[tool.name] = client_name

        # Store the map in the class for later use
        self.tool_to_client_map = tool_to_client_map
        return tools, tool_to_client_map

    @observe()
    async def process_input_with_agent_loop(
        self,
        input_action: str,
        system_prompt: str,
        client_list: List[str] = None,
        langfuse_session_id: str = None,
        state: Dict = None,
    ):
        # Use provided system prompt or fall back to the instance variable
        current_system_prompt = (
            system_prompt
        )

        # Set the observation name to include the current step if available
        if state and "current_plan" in state and state["current_plan"]:
            current_step = state["current_plan"][0]
            langfuse_context.update_current_observation(name=f"{current_step}")

        # Prepare query with available resources information
        print(f"Running the following input action: {input_action}")

        # Initialize conversation context
        tool_results_context = {}
        messages = [{"role": "user", "content": input_action}]

        # Get available tools
        await self.get_tools_from_servers(client_list)
        available_tools = await self.get_all_tools(client_list)

        # Initial Claude API call
        print("Initial Claude API call")
        response = await self._create_claude_message(
            messages, available_tools, current_system_prompt, langfuse_session_id
        )

        # Process response and handle tool calls
        final_text = []

        # Continue processing until we have a complete response
        while True:
            assistant_message_content = []
            has_tool_calls = False

            print(f"Parsing claude response")
            for content in response.content:
                if content.type == "text":
                    final_text.append(content.text)
                    assistant_message_content.append(content)
                elif content.type == "tool_use":
                    has_tool_calls = True
                    tool_name = content.name
                    tool_args = content.input
                    tool_id = content.id

                    # Process the specific tool call
                    print(f"Processing tool call: {tool_name}")
                    updated_messages, result_content = await self._process_tool_call(
                        tool_name,
                        tool_args,
                        tool_id,
                        content,
                        assistant_message_content,
                        messages,
                        tool_results_context,
                        final_text,
                        langfuse_session_id,
                    )

                    # Update conversation context
                    messages = updated_messages
                    if result_content:
                        tool_results_context[tool_id] = result_content

                    # Get next response from Claude after a tool call
                    response = await self._create_claude_message(
                        messages,
                        available_tools,
                        current_system_prompt,
                        langfuse_session_id,
                    )

                    # Break the content loop to process the new response
                    break

            # If there are no more tool calls, add the final text and break the loop
            if not has_tool_calls:
                if len(response.content) > 0 and response.content[0].type == "text":
                    final_text.append(response.content[0].text)
                break

        # Add a line at the end, before returning the result
        if state is not None and "tool_results" in state:
            state["tool_results"].update(tool_results_context)

        return final_text

    @observe(as_type="generation")
    async def _create_claude_message(
        self, messages, available_tools, system_prompt=None, langfuse_session_id=None
    ):
        """Create a message using Claude API with the given messages and tools."""
        system = system_prompt

        # Add langfuse input tracking
        langfuse_context.update_current_observation(
            input=messages,
            model="claude-3-5-sonnet-20241022",
            session_id=langfuse_session_id,
        )

        response = self.anthropic.messages.create(
            model="claude-3-5-sonnet-20241022",
            max_tokens=4096,
            system=system,
            messages=messages,
            tools=available_tools,
        )

        # if no session id is provided, doesn't flush to langfuse
        if langfuse_session_id:
            langfuse_context.update_current_trace(session_id=langfuse_session_id)
            langfuse_context.flush()

            # Add cost tracking
            langfuse_context.update_current_observation(
                usage_details={
                    "input": response.usage.input_tokens,
                    "output": response.usage.output_tokens,
                    "cache_read_input_tokens": response.usage.cache_read_input_tokens,
                }
            )

        return response

    @observe(as_type="tool")
    async def _process_tool_call(
        self,
        tool_name,
        tool_args,
        tool_id,
        content,
        assistant_message_content,
        messages,
        tool_results_context,
        final_text,
        langfuse_session_id,
    ):
        """Process a specific tool call and return updated messages and result content."""

        # Add langfuse tracking
        if langfuse_session_id:
            langfuse_context.update_current_observation(name=tool_name)
            langfuse_context.update_current_trace(session_id=langfuse_session_id)
            langfuse_context.flush()

        if tool_name == "reference_tool_output":
            return await self._handle_reference_tool(
                tool_id,
                tool_args,
                content,
                assistant_message_content,
                messages,
                tool_results_context,
            )
        elif tool_name == "access_resource":
            return await self._handle_resource_access(
                tool_id,
                tool_args,
                content,
                assistant_message_content,
                messages,
                final_text,
            )
        else:
            return await self._handle_standard_tool(
                tool_name,
                tool_args,
                tool_id,
                content,
                assistant_message_content,
                messages,
                final_text,
            )

    async def _handle_reference_tool(
        self,
        tool_id,
        tool_args,
        content,
        assistant_message_content,
        messages,
        tool_results_context,
    ):
        """Handle reference_tool_output tool."""
        referenced_tool_id = tool_args["tool_id"]
        extract_path = tool_args.get("extract_path", None)
        result_content = None

        if referenced_tool_id in tool_results_context:
            result_content = self._extract_reference_data(
                tool_results_context[referenced_tool_id], extract_path
            )
        else:
            result_content = (
                f"Error: No tool result found with ID '{referenced_tool_id}'"
            )

        # Add tool usage to message
        assistant_message_content.append(content)
        updated_messages = messages.copy()
        updated_messages.append(
            {"role": "assistant", "content": assistant_message_content}
        )

        # Add tool result to message
        updated_messages.append(
            {
                "role": "user",
                "content": [
                    {
                        "type": "tool_result",
                        "tool_use_id": tool_id,
                        "content": result_content,
                    }
                ],
            }
        )

        return updated_messages, None

    def _extract_reference_data(self, result_content, extract_path):
        """Extract data from a result using the given path."""
        if not extract_path or not result_content:
            return result_content

        import json

        try:
            data = json.loads(result_content)
            # Simple path extraction
            parts = extract_path.split(".")
            for part in parts:
                if part in data:
                    data = data[part]
                else:
                    data = None
                    break
            return json.dumps(data) if data else "Path not found in data"
        except json.JSONDecodeError:
            return "Cannot extract path: result is not valid JSON"

    async def _handle_resource_access(
        self,
        tool_id,
        tool_args,
        content,
        assistant_message_content,
        messages,
        final_text,
    ):
        """Handle access_resource tool."""
        uri = tool_args["uri"]
        client_name = tool_args["client"]

        # Get resource from MCP server
        resource_result = await self.mcp_clients[client_name].session.read_resource(uri)
        final_text.append(f"[Accessing resource {uri}]")

        # Format the resource result
        result_content = self._format_resource_content(resource_result)

        # Add tool usage to message
        assistant_message_content.append(content)
        updated_messages = messages.copy()
        updated_messages.append(
            {"role": "assistant", "content": assistant_message_content}
        )

        # Add tool result to message
        updated_messages.append(
            {
                "role": "user",
                "content": [
                    {
                        "type": "tool_result",
                        "tool_use_id": tool_id,
                        "content": result_content,
                    }
                ],
            }
        )

        return updated_messages, result_content

    def _format_resource_content(self, resource_result):
        """Format resource result into a string."""
        resource_result_content = []
        for resource_content in resource_result.contents:
            if isinstance(resource_content, TextResourceContents):
                resource_result_content.append(resource_content.text)
            elif isinstance(resource_content, BlobResourceContents):
                resource_result_content.append(str(resource_content.blob))

        return "\n".join(resource_result_content)

    async def _handle_standard_tool(
        self,
        tool_name,
        tool_args,
        tool_id,
        content,
        assistant_message_content,
        messages,
        final_text,
    ):
        """Handle standard tools that are provided by MCP clients."""
        result_content = None
        updated_messages = messages.copy()

        # Look up which client this tool belongs to
        if tool_name in self.tool_to_client_map:
            client_name = self.tool_to_client_map[tool_name]
            client: MCPClient = self.mcp_clients[client_name]

            # Call the tool through the appropriate client
            print(
                f"Calling tool {tool_name} with args {tool_args} via client {client_name}"
            )
            result = await client.session.call_tool(tool_name, tool_args)
            final_text.append(
                f"[Calling tool {tool_name} with args {tool_args} via client {client_name}]"
            )

            result_content = result.content
        else:
            error_message = f"Error: Tool '{tool_name}' not found in any client"
            print(error_message)
            final_text.append(error_message)
            result_content = f"Error: Tool '{tool_name}' is not available."

        # Add tool usage to message
        assistant_message_content.append(content)
        updated_messages.append(
            {"role": "assistant", "content": assistant_message_content}
        )

        # Add tool result to message
        updated_messages.append(
            {
                "role": "user",
                "content": [
                    {
                        "type": "tool_result",
                        "tool_use_id": tool_id,
                        "content": result_content,
                    }
                ],
            }
        )

        return updated_messages, result_content

    async def cleanup(self):
        cleanup_tasks = []

        # Create separate tasks for each client cleanup
        for client_name, client in self.mcp_clients.items():
            cleanup_tasks.append(
                asyncio.create_task(self._cleanup_client(client_name, client))
            )

        # Wait for all cleanup tasks to complete
        if cleanup_tasks:
            await asyncio.gather(*cleanup_tasks, return_exceptions=True)

    async def _cleanup_client(self, client_name, client):
        """Helper method to clean up a single client"""
        try:
            await client.cleanup()
        except Exception as e:
            print(f"Warning: Error during cleanup of {client_name}: {e}")

    def _log_claude_response(self, response):
        """Log detailed analysis of Claude's response including text outputs and tool calls."""
        print("\n=== Initial Claude Response Analysis ===")
        text_outputs = [c for c in response.content if c.type == "text"]
        tool_calls = [c for c in response.content if c.type == "tool_use"]

        # Log text outputs
        if text_outputs:
            print(f"\n📝 Text Outputs ({len(text_outputs)}):")
            for i, text in enumerate(text_outputs, 1):
                print(f"  Output {i}: {text.text}")

        # Log tool calls
        if tool_calls:
            print(f"\n🔧 Tool Calls ({len(tool_calls)}):")
            for i, tool in enumerate(tool_calls, 1):
                print(f"\n  Tool {i}:")
                print(f"    Name: {tool.name}")
                print(f"    ID: {tool.id}")
                print("    Input Arguments:")
                for key, value in tool.input.items():
                    print(f"      {key}: {value}")

        print("\n" + "=" * 40 + "\n")

