// @ts-ignore - hono types
import { Hono } from 'hono';
// @ts-ignore - hono types
import { cors } from 'hono/cors';
// @ts-ignore - hono types  
import { stream } from 'hono/streaming';
import type { ChatMessage } from './types';

type Env = {
  GROQ_API_KEY: string;
  CEREBRAS_API_KEY: string;
};

const app = new Hono<{ Bindings: Env }>();

app.use('*', cors());

// Health check
app.get('/', (c) => c.json({ status: 'ok', service: 'bun-ai-api' }));

// @ts-ignore - hono types
app.post('/chat', async (c) => {
  const { messages } = await c.req.json() as { messages: ChatMessage[] };
  const env = c.env;

  // Intentar Groq primero, luego Cerebras
  const services = [
    { name: 'groq', url: 'https://api.groq.com/openai/v1/chat/completions', key: env.GROQ_API_KEY, model: 'llama-3.3-70b-versatile' },
    { name: 'cerebras', url: 'https://api.cerebras.ai/v1/chat/completions', key: env.CEREBRAS_API_KEY, model: 'llama-3.3-70b' },
  ];

  for (const svc of services) {
    if (!svc.key) continue;
    
    try {
      const response = await fetch(svc.url, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${svc.key}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: svc.model,
          messages,
          stream: true,
        }),
      });

      if (!response.ok) continue;

      // @ts-ignore - hono streaming types
      return stream(c, async (s) => {
        const reader = response.body?.getReader();
        if (!reader) return;

        const decoder = new TextDecoder();
        
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const text = decoder.decode(value);
          const lines = text.split('\n').filter(line => line.startsWith('data: '));
          
          for (const line of lines) {
            const data = line.slice(6);
            if (data === '[DONE]') continue;
            
            try {
              const json = JSON.parse(data);
              const content = json.choices?.[0]?.delta?.content;
              if (content) {
                await s.write(content);
              }
            } catch {}
          }
        }
      });
    } catch (e) {
      console.error(`${svc.name} failed:`, e);
      continue;
    }
  }

  return c.json({ error: 'All services failed' }, 500);
});

export default app;
