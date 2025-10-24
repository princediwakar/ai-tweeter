// lib/contentSource/context/articleValidator.ts

export interface ValidatableArticle {
  headline: string;
  url: string;
  description?: string;
  sourceType: 'rss' | 'reddit' | 'twitter';
}

interface ScoredArticle extends ValidatableArticle {
  score: number;
  rejectionReason: string | null;
}

/**
 * A fast, code-based filter to pre-validate articles before they are
 * sent to the expensive enrichment or AI steps.
 *
 * It uses a multi-stage process:
 * 1. Hard Reject Gate: Instantly rejects unambiguous junk (stocks, listicles, events).
 * 2. Positive Gate: Instantly rejects articles that lack *any* operational signal.
 * 3. Scoring: Scores the remaining valid articles to find the best one.
 */
export class ArticleValidator {
  
  // --- 1. HARSH REJECTION RULES (Instant Disqualification) ---
  private static HARD_REJECT_PATTERNS = [
    // === Stock / Brokerage Reports ===
    /\bupper\s+circuit/i, /\blower\s+circuit/i,
    /\bshares\s+(hit|hittin|jump|soar|fall|tumble)/i,
    /brokerage\s+report/i, /analyst\s+rating/i,
    
    // === Listicles ===
    /\btop\s+\d+/i, /\d+\s+startups/i, /best\s+\d+/i,

    // === Known Event Coverage ===
    /\bconference/i, /\awards?\s+ceremony/i,
    /\bAIGNITE\b/i, /\bAI-thon\b/i, /\bAmalthea Tech Expo\b/i,
    /\bDevFest\b/i, /\bETAuto EV Conclave\b/i, /\bFounders Investors Fusion\b/i,
    /\bGlobal Fintech Fest\b/i, /\b(GFF)\b/i, /\bStartup Summit\b/i,
    /\bHindustan Times Leadership Summit\b/i, /\bD2C & Retail Summit\b/i,
    /\bGenAI Summit\b/i, /\bIndia DevOps Show\b/i,
    /\bInternational Edtech Expo\b/i, /\bInternational Startup Festival\b/i,
    /\b(ISF)\b/i, /\bMint AI Summit\b/i, /\bMint India @2047 Summit\b/i,
    /\bStartup Mahakumbh\b/i, /\bStrategic TechTrust Conclave\b/i,
    /\b(TNGSS)\b/i, /\bTechSparks\b/i, /\bTiEcon\b/i, /\bGCC Summit\b/i,

    // === Leadership / Fluff (Still junk) ===
    /\bappoints\b/i, /\b(ceo|cfo|cto|coo)\s+resigns/i,
    /\b(named|names)\s+(ceo|cfo|cto|coo)/i, /\bjoins\s+board/i,
    
    // === VC Fund News (Still junk - about the VC, not the startup) ===
    /\bvc\s+fund/i, /\bfund\s+launches/i,
    
    // === Personal Projects (Still junk) ===
    /\b(launches|self-funded|personal|founder's)\s+(fund|initiative|project)/i
  ];

  // --- 2. POSITIVE GATE KEYWORDS (Signal Finder) ---
  // An article MUST contain at least one of these to be considered.
  private static STRONG_POSITIVE_KEYWORDS: string[] = [
    // P&L & Finance
    'revenue', 'profit', 'loss', 'earnings', 'EBITDA', 'GMV', 'ARR', 'margins',
    
    // Cost Management
    'cost-cutting', 'costs', 'expenses', 'spend', 'layoffs',
    
    // Product & Strategy
    'pivot', 'shuts down', 'launches', 'product launch', 'new feature',
    'new service', 'platform launch', 'product update', 'new product',
    
    // Market & Competition
    'expands', 'expansion', 'market share', 'new market', 'tier-2', 'tier-3',
    'global launch', 'international expansion', 'vs', 'competitor', 'rival', 
    'rivalry', 'market leader', 'overtakes',
    
    // Diversification
    'diversifies', 'diversification', 'new vertical', 'new business line', 'enters new segment',
    
    // Operations & Supply Chain
    'automation', 'supply chain', 'logistics', 'manufacturing', 'inventory', 'warehouse',
    'partnership', 'acquires', 'acquisition', 'restructuring',
    
    // User Metrics
    'user growth', 'customer acquisition', 'churn', 'retention', 'pricing', 'price cut',
    
    // AI & Tech
    'AI', 'Artificial Intelligence', 'Machine Learning', 'ML', 'GenAI', 'Generative AI',
    'LLM', 'Large Language Model', 'AI model', 'AI platform', 'AI chatbot',

    // === NEW: Creator Economy ===
    'creator', 'creators', 'YouTuber', 'YouTubers', 'TikTok', 'Patreon',
    'MrBeast', 'influencer', 'views', 'subscribers', 'brand deal', 'sponsorship'
  ];

  // --- 3. SCORING KEYWORDS (Nuanced Scoring) ---
  private static SCORING_KEYWORDS: { [key: string]: number } = {
    // === Strong Positive Signals (+3) ===
    // This list mirrors the Positive Gate list
    'revenue': 3, 'profit': 3, 'loss': 3, 'earnings': 3, 'EBITDA': 3, 'GMV': 3, 'ARR': 3, 'margins': 3,
    'cost-cutting': 3, 'costs': 3, 'expenses': 3, 'spend': 3, 'layoffs': 3,
    'pivot': 3, 'shuts down': 3, 'launches': 3, 'product launch': 3, 'new feature': 3,
    'new service': 3, 'platform launch': 3, 'product update': 3, 'new product': 3,
    'expands': 3, 'expansion': 3, 'market share': 3, 'new market': 3, 'tier-2': 3, 'tier-3': 3,
    'global launch': 3, 'international expansion': 3, 'vs': 3, 'competitor': 3, 'rival': 3,
    'rivalry': 3, 'market leader': 3, 'overtakes': 3,
    'diversifies': 3, 'diversification': 3, 'new vertical': 3, 'new business line': 3, 'enters new segment': 3,
    'automation': 3, 'supply chain': 3, 'logistics': 3, 'manufacturing': 3, 'inventory': 3, 'warehouse': 3,
    'partnership': 3, 'acquires': 3, 'acquisition': 3, 'restructuring': 3,
    'user growth': 3, 'customer acquisition': 3, 'churn': 3, 'retention': 3, 'pricing': 3, 'price cut': 3,
    'AI': 3, 'Artificial Intelligence': 3, 'Machine Learning': 3, 'ML': 3, 'GenAI': 3, 'Generative AI': 3,
    'LLM': 3, 'Large Language Model': 3, 'AI model': 3, 'AI platform': 3, 'AI chatbot': 3,
    // === NEW: Creator Economy ===
    'creator': 3, 'creators': 3, 'YouTuber': 3, 'YouTubers': 3, 'TikTok': 3, 'Patreon': 3,
    'influencer': 3, 'views': 3, 'subscribers': 3, 'brand deal': 3, 'sponsorship': 3,
    'Indian Youtuber': 3, 'humor': 3, 'comedy': 3,


    // === Context Signals (+1) ===
    'inr': 1, 'crore': 1, 'lakh': 1,
    'bengaluru': 1, 'mumbai': 1, 'gurugram': 1, 'noida': 1, 'hyderabad': 1, 'pune': 1,
    'indian startup': 1, 'india-based': 1,
    
    // === Negative Signals (-3) ===
    // 'openai' is here because it's a global company, not because AI is bad.
    'meta': -3, 'facebook': -3, 'google': -3, 'alphabet': -3, 'amazon': -3,
    'microsoft': -3, 'apple': -3, 'netflix': -3, 'tesla': -3, 'openai': -3,
    'policy': -3, 'regulatory': -3, 'sebi': -3, 'government': -3, 'gst': -3,
  };

  // --- Compiled Regex for the Positive Gate ---
  private static STRONG_POSITIVE_PATTERNS = new RegExp(
    ArticleValidator.STRONG_POSITIVE_KEYWORDS
      .map(key => `\\b${key.replace(/ /g, '\\s+')}\\b`) // Add word boundaries
      .join('|'),
    'i' // Case-insensitive
  );

  public static filterAndScore(articles: ValidatableArticle[]): ValidatableArticle[] {
    const scoredArticles: ScoredArticle[] = articles.map(article => {
      const headline = article.headline;
      const content = `${headline} ${article.description || ''}`.toLowerCase();
      let score = 0;
      let rejectionReason: string | null = null;

      // === 1. Hard Reject Gate (Headline Only) ===
      for (const pattern of this.HARD_REJECT_PATTERNS) {
        if (pattern.test(headline)) {
          score = -100; // Instantly disqualify
          rejectionReason = `Hard reject: ${pattern.toString()}`;
          break; // Stop checking patterns
        }
      }

      // === 2. Positive Gate (Full Content) ===
      if (rejectionReason === null) { // Only check if not already rejected
        if (!this.STRONG_POSITIVE_PATTERNS.test(content)) {
          score = -100; // Instantly disqualify
          rejectionReason = `Positive gate fail: No operational keywords found.`;
        }
      }
      
      // === 3. Scoring (Full Content) ===
      if (rejectionReason === null) { // Only score if it passed both gates
        for (const [key, value] of Object.entries(this.SCORING_KEYWORDS)) {
          const regex = new RegExp(`\\b${key.replace(/ /g, '\\s+')}\\b`, 'gi');
          const matches = (content.match(regex) || []).length;
          score += matches * value;
        }

        // Give a small boost to RSS sources as they are higher signal
        if (article.sourceType === 'rss') {
          score += 1;
        }
        
        // If score is still 0 or less after scoring (e.g. only negative keywords found)
        if (score <= 0) {
            rejectionReason = `Scoring fail: Final score is ${score}.`;
        }
      }

      return { ...article, score, rejectionReason };
    });

    // === 4. Final Selection ===
    // Filter out all rejected or non-positive-score articles
    const validArticles = scoredArticles
      .filter(a => a.score > 0)
      .sort((a, b) => b.score - a.score); // Sort by highest score

    console.log(`[ArticleValidator] 🛡️ Validated ${articles.length} headlines. Found ${validArticles.length} valid candidates.`);
    
    if (validArticles.length > 0) {
      console.log(`[ArticleValidator] 🏆 Top candidate: "${validArticles[0].headline}" (Score: ${validArticles[0].score})`);
    } else {
      console.warn(`[ArticleValidator] ⚠️ No valid articles found after filtering.`);
    }

    return validArticles;
  }
}