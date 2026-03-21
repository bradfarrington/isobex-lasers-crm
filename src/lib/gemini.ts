/**
 * Gemini API integration for the Page Builder AI assistant.
 * Uses Gemini 2.0 Flash for fast, free-tier natural language → block operations.
 */

import type { PageBlock } from '@/types/database';

const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY;
const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_API_KEY}`;

const BLOCK_TYPES_DESCRIPTION = `Available block types:
- hero: Full-width banner. Config: { title, subtitle, imageUrl, ctaText, ctaLink, overlayOpacity }
- heading: Heading text. Config: { text, level (h1|h2|h3|h4), align (left|center|right) }
- text: Paragraph. Config: { text, align }
- image: Single image. Config: { url, alt, width, align }
- image_gallery: Image grid. Config: { images (string[]), columns (2-4), gap }
- button: CTA button. Config: { text, link, style (primary|secondary|ghost), size (sm|md|lg), align }
- product_grid: Products display. Config: { mode (auto|manual), productIds (string[]), columns (2-4), limit }
- collection_grid: Collections display. Config: { mode (auto|manual), collectionIds (string[]), columns (2-3) }
- featured_product: Single product spotlight. Config: { productId }
- spacer: Empty vertical space. Config: { height (number, px) }
- divider: Horizontal line. Config: { style (solid|dashed|dotted), color (hex), thickness }
- video: Embedded video. Config: { url, autoplay (boolean) }
- testimonials: Customer reviews. Config: { items: [{ name, text, rating (1-5) }] }
- faq: FAQ accordion. Config: { items: [{ question, answer }] }
- banner: Coloured banner strip. Config: { text, bgColor (hex), textColor (hex), align }
- custom_html: Raw HTML. Config: { html }`;

const SYSTEM_PROMPT = `You are an AI assistant that helps build online store pages for Isobex Lasers, a company selling consumable parts for industrial laser cutting and welding machines (lenses, nozzles, mirrors, ceramics, protection windows, etc).

You help by creating and modifying page blocks in JSON format. When the user asks you to do something, respond with a JSON object containing:
1. "action": one of "set_blocks" (replace all blocks), "add_block" (add a single block), "update_block" (modify existing block), "remove_block" (remove by index), "reorder" (move block)
2. "blocks": for "set_blocks", the full array of blocks
3. "block": for "add_block", the single block to append
4. "index": for "update_block"/"remove_block", the 0-based index
5. "config": for "update_block", the new config
6. "from"/"to": for "reorder", the indices
7. "message": A brief friendly message to the user about what you did

Each block has: { "id": "<random 8 char string>", "type": "<block_type>", "config": { ... } }

${BLOCK_TYPES_DESCRIPTION}

IMPORTANT RULES:
- Always generate realistic, professional content for a laser parts store (not placeholder text)
- Use specific product terminology: lenses, nozzles, mirrors, ceramics, protection windows, laser heads, fiber lasers, CO2 lasers
- When generating a full page, create 5-8 blocks that look like a real professional store
- For colours use a professional industrial palette: dark blues (#1a1a2e, #16213e), oranges (#e94560), whites
- Always respond with ONLY valid JSON, no markdown, no code fences
- Every block needs a unique "id" field (random 8 char alphanumeric string)`;

interface AIMessage {
  role: 'user' | 'model';
  parts: { text: string }[];
}

export interface AIResponse {
  action: 'set_blocks' | 'add_block' | 'update_block' | 'remove_block' | 'reorder';
  blocks?: PageBlock[];
  block?: PageBlock;
  index?: number;
  config?: Record<string, any>;
  from?: number;
  to?: number;
  message: string;
}

export async function sendToGemini(
  userMessage: string,
  currentBlocks: PageBlock[],
  conversationHistory: AIMessage[]
): Promise<AIResponse> {
  const contextMessage = `Current page blocks: ${JSON.stringify(currentBlocks)}
  
User request: ${userMessage}`;

  const contents = [
    { role: 'user' as const, parts: [{ text: SYSTEM_PROMPT }] },
    { role: 'model' as const, parts: [{ text: '{"message": "Ready to help build your store pages. What would you like me to do?"}' }] },
    ...conversationHistory,
    { role: 'user' as const, parts: [{ text: contextMessage }] },
  ];

  const response = await fetch(GEMINI_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents,
      generationConfig: {
        temperature: 0.7,
        maxOutputTokens: 4096,
        responseMimeType: 'application/json',
      },
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Gemini API error: ${response.status} — ${errorText}`);
  }

  const data = await response.json();
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text;

  if (!text) {
    throw new Error('No response from Gemini');
  }

  // Parse the JSON response
  const cleaned = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
  return JSON.parse(cleaned) as AIResponse;
}

/**
 * Apply an AI response action to the current blocks array.
 */
export function applyAIAction(currentBlocks: PageBlock[], response: AIResponse): PageBlock[] {
  switch (response.action) {
    case 'set_blocks':
      return response.blocks || [];

    case 'add_block':
      if (response.block) {
        return [...currentBlocks, response.block];
      }
      return currentBlocks;

    case 'update_block':
      if (response.index != null && response.config) {
        return currentBlocks.map((b, i) =>
          i === response.index ? { ...b, config: { ...b.config, ...response.config } } : b
        );
      }
      return currentBlocks;

    case 'remove_block':
      if (response.index != null) {
        return currentBlocks.filter((_, i) => i !== response.index);
      }
      return currentBlocks;

    case 'reorder':
      if (response.from != null && response.to != null) {
        const blocks = [...currentBlocks];
        const [moved] = blocks.splice(response.from, 1);
        blocks.splice(response.to, 0, moved);
        return blocks;
      }
      return currentBlocks;

    default:
      return currentBlocks;
  }
}
