const express = require('express');
const router = express.Router();

// OpenRouter API configuration
const OPENROUTER_API_URL = 'https://openrouter.ai/api/v1/chat/completions';

// System prompts for each AI feature
const SYSTEM_PROMPTS = {
  quote: `You are an expert catering quote generator. You help create accurate, detailed quotes for catering events.
When given event details (type, guest count, requirements), provide:
- Itemized cost breakdown
- Per-person pricing
- Service fees and tax estimates
- Package recommendations
- Any applicable discounts
Always be professional, helpful, and provide realistic pricing based on industry standards.`,

  menu: `You are an expert catering menu consultant. You help create perfect menus for events.
When recommending menus:
- Consider event type and formality
- Suggest appropriate courses (appetizers, mains, sides, desserts)
- Include variety and dietary considerations
- Provide portion guidance
- Suggest wine/beverage pairings when appropriate
Be creative but practical with your suggestions.`,

  dietary: `You are an expert dietary accommodation specialist for catering services.
When helping with dietary needs:
- Address all major restrictions (vegetarian, vegan, gluten-free, dairy-free, nut-free, kosher, halal)
- Suggest alternative dishes and substitutions
- Provide cross-contamination prevention tips
- Recommend labeling practices
- Ensure all guests feel included
Be thorough and safety-conscious with dietary advice.`,

  logistics: `You are an expert catering logistics coordinator.
When planning logistics:
- Create detailed timelines
- Optimize delivery routes
- Plan vehicle and equipment needs
- Coordinate setup and breakdown schedules
- Account for traffic and weather considerations
- Assign appropriate crew sizes
Be precise and practical with timing and resource allocation.`,

  staff: `You are an expert catering staffing coordinator.
When planning staffing:
- Calculate appropriate server-to-guest ratios
- Recommend kitchen staff needs
- Suggest bartender and setup crew requirements
- Estimate labor costs
- Consider event complexity and duration
- Match staff skills to event requirements
Be thorough with staffing recommendations.`,

  followup: `You are an expert at client communications for catering businesses.
When creating follow-up messages:
- Be warm and personalized
- Express genuine gratitude
- Request feedback professionally
- Offer future incentives when appropriate
- Maintain professional but friendly tone
- Include relevant details about the event
Create messages that strengthen client relationships.`,

  review: `You are an expert at generating review requests for catering businesses.
When creating review requests:
- Be appreciative and sincere
- Make the ask easy and clear
- Provide direct links to review platforms
- Offer incentives if appropriate
- Keep the message concise
- Personalize when possible
Create requests that encourage positive reviews.`,

  proposal: `You are an expert catering proposal writer.
When generating proposals:
- Include professional formatting
- Detail menu options and pricing
- Outline services included
- Specify terms and conditions
- Add payment schedules
- Include cancellation policies
- Highlight unique value propositions
Create compelling, professional proposals.`,

  inventory: `You are an expert catering inventory and recipe scaling specialist.
When calculating inventory:
- Scale recipes accurately for guest counts
- Account for buffer quantities (typically 10-15%)
- Group items by category
- Include unit conversions
- Suggest supplier quantities
- Consider prep waste factors
Be precise with calculations and practical with suggestions.`,

  timeline: `You are an expert catering event timeline and checklist specialist.
When creating timelines and checklists:
- Create detailed minute-by-minute schedules for event day
- Include setup, service, and breakdown phases
- Account for travel time and load-in requirements
- Include pre-event preparation tasks (days/weeks before)
- Create checklists for kitchen prep, packing, and setup
- Consider venue-specific requirements
- Include staff assignments and responsibilities
- Add buffer time for unexpected delays
- Format timelines clearly with times and responsible parties
Provide comprehensive, actionable timelines that leave nothing to chance.`
};

// Helper function to call OpenRouter API
async function callOpenRouter(systemPrompt, userMessage, context = {}) {
  const apiKey = process.env.OPENROUTER_API_KEY;
  const model = process.env.OPENROUTER_MODEL || 'anthropic/claude-3-haiku';

  if (!apiKey) {
    throw new Error('OpenRouter API key not configured');
  }

  // Build context string
  let contextStr = '';
  if (context.eventType) contextStr += `Event Type: ${context.eventType}\n`;
  if (context.guestCount) contextStr += `Guest Count: ${context.guestCount}\n`;
  if (context.budget) contextStr += `Budget Level: ${context.budget}\n`;
  if (context.date) contextStr += `Date: ${context.date}\n`;
  if (context.venue) contextStr += `Venue: ${context.venue}\n`;
  if (context.clientName) contextStr += `Client: ${context.clientName}\n`;

  const fullUserMessage = contextStr ? `Context:\n${contextStr}\n\nRequest: ${userMessage}` : userMessage;

  const response = await fetch(OPENROUTER_API_URL, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': 'http://localhost:3000',
      'X-Title': 'Catering Service AI Platform'
    },
    body: JSON.stringify({
      model: model,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: fullUserMessage }
      ],
      max_tokens: 2000,
      temperature: 0.7
    })
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error('OpenRouter API error:', errorText);
    throw new Error(`OpenRouter API error: ${response.status}`);
  }

  const data = await response.json();
  return data.choices[0]?.message?.content || 'I apologize, I could not generate a response.';
}

// Chat endpoint for all AI features
router.post('/chat', async (req, res) => {
  try {
    const { feature, message, context, userId } = req.body;

    const systemPrompt = SYSTEM_PROMPTS[feature];
    if (!systemPrompt) {
      return res.status(400).json({ error: 'Invalid AI feature' });
    }

    const response = await callOpenRouter(systemPrompt, message, context || {});

    // Save chat history
    if (userId) {
      try {
        const existingChat = await req.prisma.aIChat.findFirst({
          where: { userId, feature },
          orderBy: { updatedAt: 'desc' }
        });

        if (existingChat && Date.now() - new Date(existingChat.updatedAt).getTime() < 3600000) {
          const messages = [...existingChat.messages, { role: 'user', content: message }, { role: 'assistant', content: response }];
          await req.prisma.aIChat.update({
            where: { id: existingChat.id },
            data: { messages }
          });
        } else {
          await req.prisma.aIChat.create({
            data: {
              userId,
              feature,
              messages: [{ role: 'user', content: message }, { role: 'assistant', content: response }]
            }
          });
        }
      } catch (dbError) {
        console.error('Failed to save chat history:', dbError);
      }
    }

    res.json({ response, feature });
  } catch (error) {
    console.error('AI Chat error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get chat history
router.get('/history', async (req, res) => {
  try {
    const { userId, feature } = req.query;
    const where = {};
    if (userId) where.userId = userId;
    if (feature) where.feature = feature;

    const chats = await req.prisma.aIChat.findMany({
      where,
      orderBy: { updatedAt: 'desc' },
      take: 20
    });
    res.json(chats);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Quick quote generator
router.post('/quick-quote', async (req, res) => {
  try {
    const { eventType, guestCount, menuPackageId } = req.body;

    let pricePerPerson = 50;
    if (menuPackageId) {
      const pkg = await req.prisma.menuPackage.findUnique({
        where: { id: menuPackageId }
      });
      if (pkg) pricePerPerson = pkg.pricePerPerson;
    }

    const multipliers = {
      WEDDING: 1.5,
      CORPORATE: 1.2,
      BIRTHDAY: 1.0,
      ANNIVERSARY: 1.3,
      GRADUATION: 0.9,
      HOLIDAY: 1.1,
      FUNDRAISER: 1.1,
      OTHER: 1.0
    };

    const adjustedPrice = pricePerPerson * (multipliers[eventType] || 1.0);
    const subtotal = adjustedPrice * guestCount;
    const serviceFee = subtotal * 0.20;
    const estimatedTax = subtotal * 0.08;
    const total = subtotal + serviceFee + estimatedTax;

    res.json({
      pricePerPerson: adjustedPrice,
      subtotal,
      serviceFee,
      estimatedTax,
      total,
      breakdown: {
        food: subtotal,
        service: serviceFee,
        tax: estimatedTax
      }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get AI features list
router.get('/features', async (req, res) => {
  res.json([
    { value: 'quote', label: 'AI Quote Generator', description: 'Generate instant event quotes' },
    { value: 'menu', label: 'AI Menu Suggester', description: 'Get menu recommendations' },
    { value: 'dietary', label: 'AI Dietary Planner', description: 'Accommodate restrictions' },
    { value: 'logistics', label: 'AI Logistics Optimizer', description: 'Plan routes & schedules' },
    { value: 'staff', label: 'AI Staff Matcher', description: 'Assign staff to events' },
    { value: 'followup', label: 'AI Follow-up Generator', description: 'Create post-event messages' },
    { value: 'review', label: 'AI Review Request', description: 'Collect testimonials' },
    { value: 'proposal', label: 'AI Proposal Writer', description: 'Generate proposals' },
    { value: 'inventory', label: 'AI Inventory Calculator', description: 'Scale ingredients' },
    { value: 'timeline', label: 'AI Timeline Generator', description: 'Create event checklists' }
  ]);
});

module.exports = router;
