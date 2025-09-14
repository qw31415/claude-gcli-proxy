interface Environment {
  GCLI2API_URL: string;
  GCLI2API_PASSWORD: string;
  CORS_ORIGIN?: string;
}

interface ClaudeRequest {
  model: string;
  messages: Array<{
    role: string;
    content: string | Array<{ type: string; text?: string; image_url?: { url: string } }>;
  }>;
  max_tokens?: number;
  temperature?: number;
  stream?: boolean;
  tools?: any[];
  tool_choice?: any;
}

interface GeminiRequest {
  model: string;
  messages: Array<{
    role: string;
    content: string | Array<{ type: string; text?: string; image_url?: { url: string } }>;
  }>;
  max_tokens?: number;
  temperature?: number;
  stream?: boolean;
  tools?: any[];
  tool_choice?: any;
}

const MODEL_MAPPING: Record<string, string> = {
  // Current Claude Code models
  'claude-sonnet-4-20250514': 'gemini-2.5-pro-preview-05-06-maxthinking', // Default (Sonnet 4) - 强推理
  'claude-opus-4.1': 'gemini-2.5-pro-preview-05-06-maxthinking', // Opus 4.1 - 复杂任务强推理
  'claude-opus-4.1-20250106': 'gemini-2.5-pro-preview-05-06-maxthinking', // Opus 4.1 specific version

  // Legacy Claude models
  'claude-3-5-sonnet-20241022': 'gemini-2.5-pro-preview-05-06-maxthinking',
  'claude-3-5-sonnet-20240620': 'gemini-2.5-pro-preview-05-06-maxthinking',
  'claude-3-5-haiku-20241022': 'gemini-2.5-flash',
  'claude-3-opus-20240229': 'gemini-2.5-pro-preview-05-06-maxthinking',
  'claude-3-sonnet-20240229': 'gemini-2.5-pro-preview-05-06-maxthinking',
  'claude-3-haiku-20240307': 'gemini-2.5-flash',

  // Generic model names
  'claude-3.5-sonnet': 'gemini-2.5-pro-preview-05-06-maxthinking', // 强推理
  'claude-3-haiku': 'gemini-2.5-flash', // 速度相对快
  'claude-3-opus': 'gemini-2.5-pro-preview-05-06-maxthinking', // 强推理
  'claude-opus': 'gemini-2.5-pro-preview-05-06-maxthinking', // 强推理

  // Fallback to standard model
  'default': 'gemini-2.5-pro'
};

function mapModel(claudeModel: string): string {
  return MODEL_MAPPING[claudeModel] || MODEL_MAPPING['default'];
}

function convertClaudeToGemini(request: ClaudeRequest): GeminiRequest {
  return {
    model: mapModel(request.model),
    messages: request.messages,
    max_tokens: request.max_tokens,
    temperature: request.temperature,
    stream: request.stream,
    tools: request.tools,
    tool_choice: request.tool_choice
  };
}

function createCorsHeaders(origin?: string): Record<string, string> {
  const headers: Record<string, string> = {
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, x-api-key, anthropic-version, anthropic-beta',
    'Access-Control-Max-Age': '86400',
  };

  if (origin) {
    headers['Access-Control-Allow-Origin'] = origin;
  } else {
    headers['Access-Control-Allow-Origin'] = '*';
  }

  return headers;
}

async function handleChatCompletion(request: Request, env: Environment): Promise<Response> {
  try {
    const claudeRequest: ClaudeRequest = await request.json();
    const geminiRequest = convertClaudeToGemini(claudeRequest);

    // Get authorization header
    const authHeader = request.headers.get('authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Missing authorization header' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json', ...createCorsHeaders(env.CORS_ORIGIN) }
      });
    }

    // Forward request to gcli2api
    const gcliResponse = await fetch(`${env.GCLI2API_URL}/v1/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${env.GCLI2API_PASSWORD}`,
      },
      body: JSON.stringify(geminiRequest)
    });

    if (!gcliResponse.ok) {
      const errorText = await gcliResponse.text();
      return new Response(JSON.stringify({
        error: `gcli2api error: ${gcliResponse.status} ${errorText}`
      }), {
        status: gcliResponse.status,
        headers: { 'Content-Type': 'application/json', ...createCorsHeaders(env.CORS_ORIGIN) }
      });
    }

    // Handle streaming responses
    if (geminiRequest.stream) {
      return new Response(gcliResponse.body, {
        status: gcliResponse.status,
        headers: {
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache',
          'Connection': 'keep-alive',
          ...createCorsHeaders(env.CORS_ORIGIN)
        }
      });
    }

    // Handle non-streaming responses
    const responseData = await gcliResponse.json();

    // Convert Gemini response format back to Claude format if needed
    // The gcli2api already provides OpenAI-compatible responses, so we might not need conversion

    return new Response(JSON.stringify(responseData), {
      status: 200,
      headers: { 'Content-Type': 'application/json', ...createCorsHeaders(env.CORS_ORIGIN) }
    });

  } catch (error) {
    console.error('Error in handleChatCompletion:', error);
    return new Response(JSON.stringify({
      error: `Internal server error: ${error instanceof Error ? error.message : 'Unknown error'}`
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json', ...createCorsHeaders(env.CORS_ORIGIN) }
    });
  }
}

async function handleModels(request: Request, env: Environment): Promise<Response> {
  try {
    const models = {
      object: 'list',
      data: [
        {
          id: 'claude-sonnet-4-20250514',
          object: 'model',
          created: Date.now(),
          owned_by: 'anthropic',
          permission: [],
          root: 'claude-sonnet-4-20250514',
          parent: null
        },
        {
          id: 'claude-opus-4.1',
          object: 'model',
          created: Date.now(),
          owned_by: 'anthropic',
          permission: [],
          root: 'claude-opus-4.1',
          parent: null
        },
        {
          id: 'claude-3-5-sonnet-20241022',
          object: 'model',
          created: Date.now(),
          owned_by: 'anthropic',
          permission: [],
          root: 'claude-3-5-sonnet-20241022',
          parent: null
        },
        {
          id: 'claude-3-5-haiku-20241022',
          object: 'model',
          created: Date.now(),
          owned_by: 'anthropic',
          permission: [],
          root: 'claude-3-5-haiku-20241022',
          parent: null
        },
        {
          id: 'claude-3-opus-20240229',
          object: 'model',
          created: Date.now(),
          owned_by: 'anthropic',
          permission: [],
          root: 'claude-3-opus-20240229',
          parent: null
        }
      ]
    };

    return new Response(JSON.stringify(models), {
      headers: { 'Content-Type': 'application/json', ...createCorsHeaders(env.CORS_ORIGIN) }
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: 'Failed to fetch models' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json', ...createCorsHeaders(env.CORS_ORIGIN) }
    });
  }
}

export default {
  async fetch(request: Request, env: Environment): Promise<Response> {
    const url = new URL(request.url);
    const path = url.pathname;

    // Handle CORS preflight
    if (request.method === 'OPTIONS') {
      return new Response(null, {
        status: 204,
        headers: createCorsHeaders(env.CORS_ORIGIN)
      });
    }

    // Validate environment variables
    if (!env.GCLI2API_URL || !env.GCLI2API_PASSWORD) {
      return new Response(JSON.stringify({
        error: 'Missing required environment variables: GCLI2API_URL and GCLI2API_PASSWORD'
      }), {
        status: 500,
        headers: { 'Content-Type': 'application/json', ...createCorsHeaders(env.CORS_ORIGIN) }
      });
    }

    // Route handling
    if (path === '/v1/messages' && request.method === 'POST') {
      return handleChatCompletion(request, env);
    }

    if (path === '/v1/models' && request.method === 'GET') {
      return handleModels(request, env);
    }

    // Health check
    if (path === '/health' || path === '/') {
      return new Response(JSON.stringify({
        status: 'ok',
        service: 'claude-gcli-proxy',
        gcli2api_url: env.GCLI2API_URL
      }), {
        headers: { 'Content-Type': 'application/json', ...createCorsHeaders(env.CORS_ORIGIN) }
      });
    }

    return new Response(JSON.stringify({ error: 'Not found' }), {
      status: 404,
      headers: { 'Content-Type': 'application/json', ...createCorsHeaders(env.CORS_ORIGIN) }
    });
  }
};