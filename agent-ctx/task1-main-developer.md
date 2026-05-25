# Task: Create LLM Service, MCP Protocol Server, and API Routes

## Agent: Main Developer
## Status: COMPLETED

## Files Created

### 1. `/home/z/my-project/src/lib/llm.ts` — LLM Service
- **LLMService** class with singleton pattern (`getInstance()`)
- Multi-model support with DB-backed SystemConfig persistence
- `chat()` — non-streaming chat completion
- `chatStream()` — streaming chat with native SDK streaming + fallback to non-streaming
- `generateMissionPlan()` — Hermes agent mission planning
- `diagnoseHardware()` — AI-powered hardware diagnosis
- `generateCode()` — AI code generation
- `runSafetyAnalysis()` — PicoClaw + AI insight safety check
- `switchModel()` / `getModelInfo()` — model switching with DB persistence
- Rate limiting (30 req/min per key)
- Conversation memory stored in AgentMessage DB table
- Dynamic system prompt builder with SystemContext injection
- 7 tool definitions (mavlink_command, telemetry_query, mission_generate, hardware_diagnostic, safety_assessment, code_generate, calibration_control)
- Full tool execution pipeline with error handling

### 2. `/home/z/my-project/src/lib/mcp.ts` — MCP Protocol Server
- **MCPServer** class with singleton pattern
- MCP protocol version `2024-11-05`
- JSON-RPC 2.0 message handling
- Tool registry with dynamic registration/unregistration
- Resource registry with template URI support (e.g., `telemetry://history/{metric}`)
- Resource subscription system
- 11 registered tools:
  - mavlink_command, telemetry_query, mission_generate, hardware_diagnostic, calibration_control, safety_assessment (from existing MCP route)
  - code_generate, firmware_flash, device_connect, test_run, extension_bridge (NEW)
- 6 registered resources:
  - telemetry://latest, telemetry://history/{metric}, hardware://devices, mission://active, system://status, system://config
- Methods: initialize, ping, tools/list, tools/call, resources/list, resources/read, resources/subscribe, resources/unsubscribe

### 3. `/home/z/my-project/src/app/api/mcp/transport/route.ts` — MCP SSE Transport
- **GET**: Opens SSE connection with heartbeat keep-alive
- **POST**: Handles JSON-RPC 2.0 requests, routes to MCPServer
- **OPTIONS**: CORS preflight support
- Session management with TTL-based expiry
- Batch request support (array of JSON-RPC requests)
- Proper MCP session headers (`Mcp-Session-Id`)

### 4. `/home/z/my-project/src/app/api/llm/chat/route.ts` — LLM Chat Stream API
- **POST**: Accepts `{ messages, model?, stream?, tools?, ... }`
- When `stream=true`: Returns SSE with token-by-token output
- When `stream=false`: Returns complete JSON response
- System context auto-injection from DB
- Conversation memory stored in AgentMessage table
- Rate limiting with 429 responses
- Input validation with clear error messages

## Test Results
- ✅ LLM non-streaming chat works (`/api/llm/chat` with `stream: false`)
- ✅ LLM streaming chat works (`/api/llm/chat` with `stream: true`)
- ✅ MCP initialize works (`/api/mcp/transport` with `method: "initialize"`)
- ✅ MCP tools/list returns all 11 tools
- ✅ MCP resources/list returns all 6 resources
- ✅ MCP tools/call works (tested safety_assessment, test_run, extension_bridge)
- ✅ MCP resources/read works (tested system://status, telemetry://history/battery_voltage)
- ✅ MCP ping works
- ✅ ESLint passes (0 errors)
