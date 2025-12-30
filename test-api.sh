#!/bin/bash

# Test the AI Chat API
# Usage: ./test-api.sh

API_URL="${API_URL:-http://localhost:3000}"

echo "🧪 Testing AI Chat API at $API_URL"
echo "=================================="

# Test chat endpoint
echo -e "\n📨 POST /chat - Sending message..."

curl -X POST "$API_URL/chat" \
  -H "Content-Type: application/json" \
  -d '{
    "messages": [
      {"role": "user", "content": "Hola, responde en una sola línea: ¿cuánto es 2+2?"}
    ]
  }'

echo -e "\n\n✅ Test completed!"
