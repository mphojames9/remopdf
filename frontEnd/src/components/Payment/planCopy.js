// What each plan says about itself in the app.
//
// Prices are NOT here: they come from the server (GET /api/payments/status -> plans), so the price a person sees is
// always the price they are charged, and changing PLAN_*_AMOUNT in server/.env is all it takes to change it.
//
// The daily AI numbers below must match the AI service (backEnd/routers/ai_models.py, TIER_SPECS daily_credits, or
// AI_DAILY_* in Render). The words for the AI quality match what the service really does with each plan:
//   free  the small AI model, little thinking
//   plus  the large AI model, little thinking
//   pro   the large AI model, thinking things through
//   max   the large AI model, thinking hardest and with the most room

export const PLAN_ORDER = ['free', 'plus', 'pro', 'max'];

export const PLAN_COPY = {
  free: {
    name: 'Free',
    quality: 'Basic AI',
    aiPerDay: 6,
    features: ['Basic AI writing suggestions', '6 AI actions a day', '1 saved resume', 'PDF downloads carry a small RemoPDF label'],
  },
  plus: {
    name: 'Plus',
    quality: 'Better AI',
    aiPerDay: 25,
    features: [
      'Better AI writing: a larger, smarter model',
      '25 AI actions a day',
      'AI cover letters and job matching',
      'Clean PDFs, no RemoPDF label',
      'Up to 10 saved resumes',
    ],
  },
  pro: {
    name: 'Pro',
    quality: 'Great AI',
    aiPerDay: 40,
    popular: true,
    features: [
      'Great AI writing: the larger model thinks each answer through',
      '40 AI actions a day',
      'Everything in Plus',
    ],
  },
  max: {
    name: 'Max',
    quality: 'Excellent AI',
    aiPerDay: 60,
    features: [
      'Excellent AI writing: our strongest setting, with the most room to think',
      '60 AI actions a day',
      'Everything in Pro',
    ],
  },
};

export const planName = (tier) => (PLAN_COPY[tier] ? PLAN_COPY[tier].name : 'Premium');
