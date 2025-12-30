// @ts-ignore - hono types
import { Hono } from 'hono';
// @ts-ignore - hono types
import { cors } from 'hono/cors';
// @ts-ignore - hono types  
import { stream } from 'hono/streaming';
import { groqService } from './services/groq';
import { cerebrasService } from './services/cerebras';
import type { AIService, ChatMessage } from './types';

const app = new Hono();

const services: AIService[] = [
  groqService,
  cerebrasService,
  // Google Gemini
  // OpenRouter
  // otro servicio incluso local
]
let currentServiceIndex = 0;

function getNextService() {
  const service = services[currentServiceIndex];
  currentServiceIndex = (currentServiceIndex + 1) % services.length;
  return service;
}

app.use('*', cors());

// @ts-ignore - hono types
app.post('/chat', async (c) => {
  const { messages } = await c.req.json() as { messages: ChatMessage[] };
  const service = getNextService();

  console.log(`Using ${service?.name} service`);
  const generator = await service?.chat(messages);

  // @ts-ignore - hono streaming types
  return stream(c, async (s) => {
    if (!generator) return;
    
    for await (const chunk of generator) {
      await s.write(chunk);
    }
  });
});

const port = process.env.PORT ?? 3000;

export default {
  port,
  fetch: app.fetch,
};

console.log(`Server running on http://localhost:${port}`);