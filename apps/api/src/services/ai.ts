import OpenAI from 'openai';
import Anthropic from '@anthropic-ai/sdk';
import { v4 as uuidv4 } from 'uuid';

const openai = process.env.OPENAI_API_KEY ? new OpenAI({ apiKey: process.env.OPENAI_API_KEY }) : null;
const anthropic = process.env.ANTHROPIC_API_KEY ? new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY }) : null;

// ============================================================
// FLOW GENERATION WITH AI
// ============================================================

const FLOW_GENERATION_PROMPT = `You are an expert chatbot flow designer for WhatsApp, Instagram, and Facebook automation.
Generate a complete chatbot workflow as JSON based on the user's description.

The workflow must include:
1. A START node (trigger)
2. Message nodes with realistic, engaging content
3. CONDITION nodes for branching logic
4. BUTTON/QUICK_REPLY nodes for user choices
5. Lead capture via SET_VARIABLE nodes
6. CRM_UPDATE nodes to save lead data
7. TAG nodes for contact segmentation
8. An END node or multiple END nodes

Return ONLY valid JSON in this exact format:
{
  "name": "Flow name",
  "description": "Flow description",
  "triggerType": "KEYWORD",
  "triggerData": { "keywords": ["interested", "info"] },
  "nodes": [
    {
      "id": "node-1",
      "type": "START",
      "position": { "x": 100, "y": 100 },
      "data": { "label": "Start", "triggerType": "KEYWORD", "keywords": ["interested"] }
    },
    {
      "id": "node-2",
      "type": "MESSAGE",
      "position": { "x": 100, "y": 250 },
      "data": { "label": "Welcome", "message": "Hi! Welcome to our service. How can I help you today?" }
    }
  ],
  "edges": [
    {
      "id": "edge-1",
      "source": "node-1",
      "target": "node-2",
      "sourceHandle": "output",
      "targetHandle": "input"
    }
  ]
}

Use these node types: START, MESSAGE, CONDITION, BUTTON, QUICK_REPLY, SET_VARIABLE, CRM_UPDATE, TAG, DELAY, EMAIL, APPOINTMENT, WEBHOOK, END.
Space nodes vertically by 150px and horizontally by 300px for branching.
Make content realistic, professional, and conversion-focused.
Include at least 8-15 nodes for a complete flow.`;

export async function generateFlowWithAI(
  prompt: string,
  channelType: string,
  provider: string = 'openai'
): Promise<any> {
  const systemPrompt = `${FLOW_GENERATION_PROMPT}\n\nChannel: ${channelType}`;
  const userPrompt = `Create a chatbot flow for: ${prompt}`;

  let responseText = '';

  if (provider === 'anthropic' && anthropic) {
    const response = await anthropic.messages.create({
      model: 'claude-3-5-sonnet-20241022',
      max_tokens: 4000,
      system: systemPrompt,
      messages: [{ role: 'user', content: userPrompt }],
    });
    responseText = (response.content[0] as any).text;
  } else if (provider === 'gemini') {
    const geminiResponse = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-pro:generateContent?key=${process.env.GEMINI_API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: `${systemPrompt}\n\n${userPrompt}` }] }],
          generationConfig: { maxOutputTokens: 4000, temperature: 0.7 },
        }),
      }
    );
    const geminiData = (await geminiResponse.json()) as any;
    responseText = geminiData.candidates?.[0]?.content?.parts?.[0]?.text || '';
  } else if (openai) {
    const response = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      max_tokens: 4000,
      response_format: { type: 'json_object' },
    });
    responseText = response.choices[0]?.message?.content || '{}';
  } else {
    // Fallback: return a template flow
    return generateFallbackFlow(prompt, channelType);
  }

  // Extract JSON from response
  const jsonMatch = responseText.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    return generateFallbackFlow(prompt, channelType);
  }

  try {
    const parsed = JSON.parse(jsonMatch[0]);
    // Ensure all nodes have unique IDs
    if (parsed.nodes) {
      parsed.nodes = parsed.nodes.map((n: any) => ({
        ...n,
        id: n.id || `node-${uuidv4().substring(0, 8)}`,
      }));
    }
    return parsed;
  } catch {
    return generateFallbackFlow(prompt, channelType);
  }
}

function generateFallbackFlow(prompt: string, channelType: string) {
  const id = () => `node-${uuidv4().substring(0, 8)}`;
  const n1 = id(), n2 = id(), n3 = id(), n4 = id(), n5 = id(), n6 = id(), n7 = id(), n8 = id();

  return {
    name: 'AI Generated Flow',
    description: `Generated for: ${prompt}`,
    triggerType: 'KEYWORD',
    triggerData: { keywords: ['interested', 'info', 'hello'] },
    nodes: [
      { id: n1, type: 'START', position: { x: 100, y: 100 }, data: { label: 'Start Trigger', keywords: ['interested'] } },
      { id: n2, type: 'MESSAGE', position: { x: 100, y: 250 }, data: { label: 'Welcome', message: '👋 Hi! Thanks for reaching out. We\'d love to help you!' } },
      { id: n3, type: 'QUICK_REPLY', position: { x: 100, y: 400 }, data: { label: 'Options', message: 'What are you interested in?', buttons: [{ id: 'btn1', text: 'Learn More', value: 'learn_more' }, { id: 'btn2', text: 'Get a Quote', value: 'quote' }, { id: 'btn3', text: 'Talk to Human', value: 'human' }] } },
      { id: n4, type: 'CONDITION', position: { x: 100, y: 550 }, data: { label: 'Check Choice', conditions: [{ field: 'last_button', operator: 'equals', value: 'learn_more' }] } },
      { id: n5, type: 'MESSAGE', position: { x: -200, y: 700 }, data: { label: 'Info Message', message: '📚 Here\'s what you need to know about our service...\n\nWe offer premium solutions tailored to your needs. Would you like to schedule a free consultation?' } },
      { id: n6, type: 'SET_VARIABLE', position: { x: 200, y: 700 }, data: { label: 'Capture Lead', variable: 'lead_stage', value: 'quote_requested', captureInput: true, inputPrompt: 'What\'s your name?' } },
      { id: n7, type: 'CRM_UPDATE', position: { x: 200, y: 850 }, data: { label: 'Save to CRM', action: 'create_lead', fields: { status: 'NEW', source: channelType } } },
      { id: n8, type: 'END', position: { x: 100, y: 1000 }, data: { label: 'End' } },
    ],
    edges: [
      { id: `e1`, source: n1, target: n2, sourceHandle: 'output', targetHandle: 'input' },
      { id: `e2`, source: n2, target: n3, sourceHandle: 'output', targetHandle: 'input' },
      { id: `e3`, source: n3, target: n4, sourceHandle: 'output', targetHandle: 'input' },
      { id: `e4`, source: n4, target: n5, sourceHandle: 'true', targetHandle: 'input', label: 'Learn More' },
      { id: `e5`, source: n4, target: n6, sourceHandle: 'false', targetHandle: 'input', label: 'Quote' },
      { id: `e6`, source: n5, target: n8, sourceHandle: 'output', targetHandle: 'input' },
      { id: `e7`, source: n6, target: n7, sourceHandle: 'output', targetHandle: 'input' },
      { id: `e8`, source: n7, target: n8, sourceHandle: 'output', targetHandle: 'input' },
    ],
  };
}

// ============================================================
// AI AGENT CHAT
// ============================================================

export async function chatWithAI(
  agent: any,
  userMessage: string,
  conversationHistory: Array<{ role: string; content: string }>,
  sessionId: string
): Promise<string> {
  const systemPrompt = buildAgentSystemPrompt(agent);

  // RAG: retrieve relevant knowledge
  let knowledgeContext = '';
  if (agent.knowledgeBase) {
    knowledgeContext = await retrieveRelevantKnowledge(agent.knowledgeBase.id, userMessage);
  }

  const fullSystem = knowledgeContext
    ? `${systemPrompt}\n\n--- KNOWLEDGE BASE ---\n${knowledgeContext}\n--- END KNOWLEDGE BASE ---`
    : systemPrompt;

  const messages = [
    ...conversationHistory.map(m => ({ role: m.role as any, content: m.content })),
    { role: 'user' as const, content: userMessage },
  ];

  if (agent.provider === 'ANTHROPIC' && anthropic) {
    const response = await anthropic.messages.create({
      model: agent.model || 'claude-3-5-sonnet-20241022',
      max_tokens: agent.maxTokens || 1000,
      system: fullSystem,
      messages,
    });
    return (response.content[0] as any).text;
  } else if (agent.provider === 'GEMINI') {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${agent.model || 'gemini-1.5-flash'}:generateContent?key=${process.env.GEMINI_API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [
            { role: 'user', parts: [{ text: fullSystem }] },
            ...messages.map(m => ({ role: m.role === 'assistant' ? 'model' : 'user', parts: [{ text: m.content }] })),
          ],
        }),
      }
    );
    const data = (await response.json()) as any;
    return data.candidates?.[0]?.content?.parts?.[0]?.text || agent.fallbackMessage || 'I\'m not sure about that.';
  } else if (openai) {
    const response = await openai.chat.completions.create({
      model: agent.model || 'gpt-4o',
      max_tokens: agent.maxTokens || 1000,
      temperature: agent.temperature || 0.7,
      messages: [{ role: 'system', content: fullSystem }, ...messages],
    });
    return response.choices[0]?.message?.content || agent.fallbackMessage || 'I\'m not sure about that.';
  }

  return agent.fallbackMessage || 'I\'m currently unable to respond. Please try again later.';
}

function buildAgentSystemPrompt(agent: any): string {
  return `You are ${agent.name}, an AI assistant.

${agent.personality || 'You are helpful, professional, and concise.'}

${agent.systemPrompt || ''}

Guidelines:
- Be helpful and focus on the user's needs
- Keep responses concise and actionable
- If asked about something outside your knowledge, say so honestly
- Never make up information
- Language: ${agent.language || 'English'}

${agent.handoffKeywords?.length ? `If the user says any of these words, indicate you're transferring to a human: ${agent.handoffKeywords.join(', ')}` : ''}`;
}

async function retrieveRelevantKnowledge(knowledgeBaseId: string, query: string): Promise<string> {
  try {
    // Simple keyword-based retrieval if embeddings not available
    const { default: prisma } = await import('@winkx/db/src/client');
    const chunks = await prisma.knowledgeChunk.findMany({
      where: {
        document: { knowledgeBaseId },
        content: { contains: query.split(' ').slice(0, 3).join(' '), mode: 'insensitive' },
      },
      take: 5,
    });

    return chunks.map((c: any) => c.content).join('\n\n');
  } catch {
    return '';
  }
}

// ============================================================
// CONTENT GENERATION
// ============================================================

export async function generateContent(params: {
  type: string;
  context: string;
  tone: string;
  length: string;
  provider: string;
}): Promise<string[]> {
  const lengthMap: Record<string, string> = {
    short: '1-2 sentences',
    medium: '3-5 sentences',
    long: '1-2 paragraphs',
  };

  const typePrompts: Record<string, string> = {
    dm_script: 'Write a personalized DM script that opens a conversation and builds rapport',
    sales_script: 'Write a persuasive sales message that highlights benefits and creates urgency',
    comment_reply: 'Write an engaging reply to a social media comment that encourages further interaction',
    lead_qualification: 'Write qualification questions to understand the prospect\'s needs and budget',
    follow_up: 'Write a follow-up message for a prospect who hasn\'t responded in 2 days',
    appointment: 'Write an appointment confirmation message with details and reminder',
    broadcast: 'Write a broadcast announcement message for a new product/offer',
    promotion: 'Write a promotional message with a compelling offer and call to action',
  };

  const prompt = `${typePrompts[params.type] || 'Write a marketing message'}.

Context: ${params.context}
Tone: ${params.tone}
Length: ${lengthMap[params.length]}

Generate 3 different variations. Return as JSON array: ["variation 1", "variation 2", "variation 3"]`;

  let text = '';

  if (params.provider === 'anthropic' && anthropic) {
    const response = await anthropic.messages.create({
      model: 'claude-3-haiku-20240307',
      max_tokens: 1000,
      messages: [{ role: 'user', content: prompt }],
    });
    text = (response.content[0] as any).text;
  } else if (openai) {
    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [{ role: 'user', content: prompt }],
      response_format: { type: 'json_object' },
    });
    text = response.choices[0]?.message?.content || '{"variations": []}';
  }

  try {
    const jsonMatch = text.match(/\[[\s\S]*\]/);
    if (jsonMatch) return JSON.parse(jsonMatch[0]);
    const parsed = JSON.parse(text);
    return parsed.variations || parsed.messages || [text];
  } catch {
    return [text];
  }
}
