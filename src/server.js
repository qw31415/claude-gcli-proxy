// Node.js server for Render deployment
import { createServer } from 'http';

const MODEL_MAPPING = {
  'claude-3-5-sonnet-20241022': 'gemini-2.5-pro-preview-05-06-maxthinking',
  'claude-3-5-sonnet-20240620': 'gemini-2.5-pro-preview-05-06-maxthinking',
  'claude-3-5-haiku-20241022': 'gemini-2.5-flash',
  'claude-3-opus-20240229': 'gemini-2.5-pro-preview-05-06-maxthinking',
  'claude-3-sonnet-20240229': 'gemini-2.5-pro-preview-05-06-maxthinking',
  'claude-3-haiku-20240307': 'gemini-2.5-flash',
  'claude-sonnet-4-20250514': 'gemini-2.5-pro-preview-05-06-maxthinking',
  'claude-3.5-sonnet': 'gemini-2.5-pro-preview-05-06-maxthinking',
  'claude-3-haiku': 'gemini-2.5-flash',
  'claude-3-opus': 'gemini-2.5-pro-preview-05-06-maxthinking',
  'default': 'gemini-2.5-pro'
};

function mapModel(claudeModel) {
  return MODEL_MAPPING[claudeModel] || MODEL_MAPPING['default'];
}

function convertClaudeToGemini(request) {
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

function createCorsHeaders(origin) {
  const headers = {
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, x-api-key, anthropic-version, anthropic-beta',
    'Access-Control-Max-Age': '86400',
    'Access-Control-Allow-Origin': origin || '*'
  };
  return headers;
}

async function handleRequest(req, res) {
  const url = new URL(req.url, `http://${req.headers.host}`);
  const path = url.pathname;

  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    res.writeHead(204, createCorsHeaders(process.env.CORS_ORIGIN));
    res.end();
    return;
  }

  // Validate environment variables
  if (!process.env.GCLI2API_URL || !process.env.GCLI2API_PASSWORD) {
    res.writeHead(500, { 'Content-Type': 'application/json', ...createCorsHeaders(process.env.CORS_ORIGIN) });
    res.end(JSON.stringify({
      error: 'Missing required environment variables: GCLI2API_URL and GCLI2API_PASSWORD'
    }));
    return;
  }

  try {
    // Route handling
    if (path === '/v1/messages' && req.method === 'POST') {
      await handleChatCompletion(req, res);
    } else if (path === '/v1/models' && req.method === 'GET') {
      await handleModels(req, res);
    } else if (path === '/health' || path === '/') {
      res.writeHead(200, { 'Content-Type': 'application/json', ...createCorsHeaders(process.env.CORS_ORIGIN) });
      res.end(JSON.stringify({
        status: 'ok',
        service: 'claude-gcli-proxy',
        gcli2api_url: process.env.GCLI2API_URL
      }));
    } else {
      res.writeHead(404, { 'Content-Type': 'application/json', ...createCorsHeaders(process.env.CORS_ORIGIN) });
      res.end(JSON.stringify({ error: 'Not found' }));
    }
  } catch (error) {
    console.error('Error handling request:', error);
    res.writeHead(500, { 'Content-Type': 'application/json', ...createCorsHeaders(process.env.CORS_ORIGIN) });
    res.end(JSON.stringify({ error: 'Internal server error' }));
  }
}

async function handleChatCompletion(req, res) {
  try {
    let body = '';
    req.on('data', chunk => {
      body += chunk.toString();
    });

    req.on('end', async () => {
      const claudeRequest = JSON.parse(body);
      const geminiRequest = convertClaudeToGemini(claudeRequest);

      // Get authorization header
      const authHeader = req.headers.authorization;
      if (!authHeader) {
        res.writeHead(401, { 'Content-Type': 'application/json', ...createCorsHeaders(process.env.CORS_ORIGIN) });
        res.end(JSON.stringify({ error: 'Missing authorization header' }));
        return;
      }

      // Forward request to gcli2api
      const response = await fetch(`${process.env.GCLI2API_URL}/v1/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.GCLI2API_PASSWORD}`,
        },
        body: JSON.stringify(geminiRequest)
      });

      if (!response.ok) {
        const errorText = await response.text();
        res.writeHead(response.status, { 'Content-Type': 'application/json', ...createCorsHeaders(process.env.CORS_ORIGIN) });
        res.end(JSON.stringify({
          error: `gcli2api error: ${response.status} ${errorText}`
        }));
        return;
      }

      // Handle streaming responses
      if (geminiRequest.stream) {
        res.writeHead(200, {
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache',
          'Connection': 'keep-alive',
          ...createCorsHeaders(process.env.CORS_ORIGIN)
        });
        response.body.pipe(res);
        return;
      }

      // Handle non-streaming responses
      const responseData = await response.json();
      res.writeHead(200, { 'Content-Type': 'application/json', ...createCorsHeaders(process.env.CORS_ORIGIN) });
      res.end(JSON.stringify(responseData));
    });

  } catch (error) {
    console.error('Error in handleChatCompletion:', error);
    res.writeHead(500, { 'Content-Type': 'application/json', ...createCorsHeaders(process.env.CORS_ORIGIN) });
    res.end(JSON.stringify({
      error: `Internal server error: ${error.message}`
    }));
  }
}

async function handleModels(req, res) {
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

    res.writeHead(200, { 'Content-Type': 'application/json', ...createCorsHeaders(process.env.CORS_ORIGIN) });
    res.end(JSON.stringify(models));
  } catch (error) {
    res.writeHead(500, { 'Content-Type': 'application/json', ...createCorsHeaders(process.env.CORS_ORIGIN) });
    res.end(JSON.stringify({ error: 'Failed to fetch models' }));
  }
}

const PORT = process.env.PORT || 3000;
const server = createServer(handleRequest);

server.listen(PORT, () => {
  console.log(`Claude-gcli proxy server running on port ${PORT}`);
});