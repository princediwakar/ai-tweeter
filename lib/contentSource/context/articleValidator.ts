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
     * Defines a hard rejection rule with a human-readable category.
     */
    interface RejectRule {
      pattern: RegExp;
      category: string;
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
      private static HARD_REJECT_RULES: RejectRule[] = [
        // === Stock / Brokerage Reports ===
        // NOTE: We are NOT adding 'surge' here, because your logs show 'surge'
        // can be tied to 'Q2 Show', which is a good signal.
        { pattern: /\bupper\s+circuit/i, category: 'Stock/Brokerage Report' },
        { pattern: /\blower\s+circuit/i, category: 'Stock/Brokerage Report' },
        { pattern: /\bshares\s+(hit|hittin|jump|soar|fall|tumble)/i, category: 'Stock/Brokerage Report' },
        { pattern: /brokerage\s+report/i, category: 'Stock/Brokerage Report' },
        { pattern: /analyst\s+rating/i, category: 'Stock/Brokerage Report' },
        
        // === Listicles ===
        { pattern: /\btop\s+\d+/i, category: 'Listicle' },
        { pattern: /\d+\s+startups/i, category: 'Listicle' },
        { pattern: /best\s+\d+/i, category: 'Listicle' },
        { pattern: /\d+\s+ways\s+to/i, category: 'Listicle' },
        { pattern: /\d+\s+reasons\s+why/i, category: 'Listicle' },
    
        // === Known Event Coverage ===
        { pattern: /\bconference/i, category: 'Event Coverage' },
        { pattern: /\awards?\s+ceremony/i, category: 'Event Coverage' },
        { pattern: /\bAIGNITE\b/i, category: 'Event Coverage' },
        { pattern: /\bAI-thon\b/i, category: 'Event Coverage' },
        { pattern: /\bAmalthea Tech Expo\b/i, category: 'Event Coverage' },
        { pattern: /\bDevFest\b/i, category: 'Event Coverage' },
        { pattern: /\bETAuto EV Conclave\b/i, category: 'Event Coverage' },
        { pattern: /\bFounders Investors Fusion\b/i, category: 'Event Coverage' },
        { pattern: /\bGlobal Fintech Fest\b/i, category: 'Event Coverage' },
        { pattern: /\b(GFF)\b/i, category: 'Event Coverage' },
        { pattern: /\bStartup Summit\b/i, category: 'Event Coverage' },
        { pattern: /\bHindustan Times Leadership Summit\b/i, category: 'Event Coverage' },
        { pattern: /\bD2C & Retail Summit\b/i, category: 'Event Coverage' },
        { pattern: /\bGenAI Summit\b/i, category: 'Event Coverage' },
        { pattern: /\bIndia DevOps Show\b/i, category: 'Event Coverage' },
        { pattern: /\bInternational Edtech Expo\b/i, category: 'Event Coverage' },
        { pattern: /\bInternational Startup Festival\b/i, category: 'Event Coverage' },
        { pattern: /\b(ISF)\b/i, category: 'Event Coverage' },
        { pattern: /\bMint AI Summit\b/i, category: 'Event Coverage' },
        { pattern: /\bMint India @2047 Summit\b/i, category: 'Event Coverage' },
        { pattern: /\bStartup Mahakumbh\b/i, category: 'Event Coverage' },
        { pattern: /\bStrategic TechTrust Conclave\b/i, category: 'Event Coverage' },
        { pattern: /\b(TNGSS)\b/i, category: 'Event Coverage' },
        { pattern: /\bTechSparks\b/i, category: 'Event Coverage' },
        { pattern: /\bTiEcon\b/i, category: 'Event Coverage' },
        { pattern: /\bGCC Summit\b/i, category: 'Event Coverage' },
        { pattern: /\bET Startup Awards\b/i, category: 'Event Coverage' },
    
        // === Leadership / Fluff (Still junk) ===
        { pattern: /\bappoints\b/i, category: 'Leadership/Fluff' },
        { pattern: /\b(ceo|cfo|cto|coo)\s+resigns/i, category: 'Leadership/Fluff' },
        { pattern: /\b(named|names)\s+(ceo|cfo|cto|coo)/i, category: 'Leadership/Fluff' },
        { pattern: /\bjoins\s+board/i, category: 'Leadership/Fluff' },
        { pattern: /\bwebinar/i, category: 'Fluff/PR' },
        { pattern: /\b(survey|report)\s+(finds|reveals|says)/i, category: 'Fluff/PR' },
        { pattern: /\banniversary/i, category: 'Fluff/PR' },
        { pattern: /\b(wins|awarded)\s+an\s+award/i, category: 'Fluff/PR' },
        // === NEW: Weekly summary junk ===
        { pattern: /(updates|developments)\s+(of\s+the|this)\s+week/i, category: 'Fluff/PR' },
        { pattern: /daily\s+roundup\b/i, category: 'Daily/Roundup' },
        { pattern: /latest\s+news\b/i, category: 'Latest/News' },
        { pattern: /other\s+news\b/i, category: 'Other/News' },
        { pattern: /funding\s+news\b/i, category: 'Roundup' },
        { pattern: /Startup\s+news\s+and\s+updates\b/i, category: 'Startup News' },
        { pattern: /\bStartup news and updates\b/i, category: 'Startup News' },
        { pattern: /\bdaily roundup\b/i, category: 'Daily Roundup' },
        { pattern: /\bfunding news\b/i, category: 'Funding News' },
        { pattern: /\bother news\b/i, category: 'Other News' },

    
        // === VC Fund News (Still junk - about the VC, not the startup) ===
        { pattern: /\bvc\s+fund/i, category: 'VC Fund News' },
        { pattern: /\bfund\s+launches/i, category: 'VC Fund News' },
        
        // === Personal Projects (Still junk) ===
        { pattern: /\b(launches|self-funded|personal|founder's)\s+(fund|initiative|project)/i, category: 'Personal Project' }
      ];
    
      // --- 2. POSITIVE GATE KEYWORDS (Signal Finder) ---
      // An article MUST contain at least one of these to be considered.
      private static STRONG_POSITIVE_KEYWORDS: string[] = [
        // P&L & Finance
        'revenue', 'profit', 'loss', 'earnings', 'EBITDA', 'GMV', 'ARR', 'margins',
        // === NEW: Quarterly Results (from "Q2 Show") ===
        'Q1', 'Q2', 'Q3', 'Q4', 'quarterly results', 'financial results',
        
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
        // === NEW: Corporate Governance (from "OYO withdraws") ===
        'withdraws', 'investor pushback',
        
        // User Metrics
        'user growth', 'customer acquisition', 'churn', 'retention', 'pricing', 'price cut',
        
        // AI & Tech
        'AI', 'Artificial Intelligence', 'Machine Learning', 'ML', 'GenAI', 'Generative AI',
        'LLM', 'Large Language Model', 'AI model', 'AI platform', 'AI chatbot',
    
        // Creator Economy
        'creator', 'creators', 'YouTuber', 'YouTubers', 'TikTok', 'Patreon',
        'MrBeast', 'influencer', 'views', 'subscribers', 'brand deal', 'sponsorship',
    
        // Funding & Investment
        'raises $', 'secures $', 'funding round', 'seed funding', 'pre-seed', 
        'Series A', 'Series B', 'Series C', 'Series D', 'investment from', 
        'angel investment', 'venture capital', 'capital infusion', 'undisclosed amount',
        // === NEW: IPO Keywords (from "Lenskart IPO", "Groww IPO") ===
        'IPO', 'subscribed', 'oversubscribed', 'subscription',
    
        // Growth & Hiring
        'to hire', 'hiring', 'team expansion', 'doubles workforce',
    
        // Legal & IP
        'patent', 'acquires patent',
      ];
    
      // --- 3. SCORING KEYWORDS (Nuanced Scoring) ---
      private static SCORING_KEYWORDS: { [key: string]: number } = {
        // === Strong Positive Signals (+3) ===
        'revenue': 3, 'profit': 3, 'loss': 3, 'earnings': 3, 'EBITDA': 3, 'GMV': 3, 'ARR': 3, 'margins': 3,
        // === NEW: Quarterly Results (+3) ===
        'Q1': 3, 'Q2': 3, 'Q3': 3, 'Q4': 3, 'quarterly results': 3, 'financial results': 3,
        'cost-cutting': 3, 'costs': 3, 'expenses': 3, 'spend': 3, 'layoffs': 3,
        'pivot': 3, 'shuts down': 3, 'launches': 3, 'product launch': 3, 'new feature': 3,
        'new service': 3, 'platform launch': 3, 'product update': 3, 'new product': 3,
        'expands': 3, 'expansion': 3, 'market share': 3, 'new market': 3, 'tier-2': 3, 'tier-3': 3,
        'global launch': 3, 'international expansion': 3, 'vs': 3, 'competitor': 3, 'rival': 3,
        'rivalry': 3, 'market leader': 3, 'overtakes': 3,
        'diversifies': 3, 'diversification': 3, 'new vertical': 3, 'new business line': 3, 'enters new segment': 3,
        'automation': 3, 'supply chain': 3, 'logistics': 3, 'manufacturing': 3, 'inventory': 3, 'warehouse': 3,
        'partnership': 3, 'acquires': 3, 'acquisition': 3, 'restructuring': 3,
        // === NEW: Corporate Governance (+3) ===
        'withdraws': 3, 'investor pushback': 3,
        'user growth': 3, 'customer acquisition': 3, 'churn': 3, 'retention': 3, 'pricing': 3, 'price cut': 3,
        'AI': 3, 'Artificial Intelligence': 3, 'Machine Learning': 3, 'ML': 3, 'GenAI': 3, 'Generative AI': 3,
        'LLM': 3, 'Large Language Model': 3, 'AI model': 3, 'AI platform': 3, 'AI chatbot': 3,
        'creator': 3, 'creators': 3, 'YouTuber': 3, 'YouTubers': 3, 'TikTok': 3, 'Patreon': 3,
        'influencer': 3, 'views': 3, 'subscribers': 3, 'brand deal': 3, 'sponsorship': 3,
        'Indian Youtuber': 3, 'humor': 3, 'comedy': 3,
        'raises $': 3, 'secures $': 3, 'funding round': 3, 'seed funding': 3, 'pre-seed': 3,
        'Series A': 3, 'Series B': 3, 'Series C': 3, 'Series D': 3, 'investment from': 3,
        'angel investment': 3, 'venture capital': 3, 'capital infusion': 3, 'undisclosed amount': 3,
        // === NEW: IPO Keywords (+3) ===
        'IPO': 3, 'subscribed': 3, 'oversubscribed': 3, 'subscription': 3,
        'to hire': 3, 'hiring': 3, 'team expansion': 3, 'doubles workforce': 3,
        'patent': 3, 'acquires patent': 3,
    
        // === Context Signals (+1) ===
        'inr': 1, 'crore': 1, 'lakh': 1,
        'bengaluru': 1, 'mumbai': 1, 'gurugram': 1, 'noida': 1, 'hyderabad': 1, 'pune': 1,
        'indian startup': 1, 'india-based': 1,
        
        // === Negative Signals (-3) ===
        'meta': -3, 'facebook': -3, 'google': -3, 'alphabet': -3, 'amazon': -3,
        'microsoft': -3, 'apple': -3, 'netflix': -3, 'tesla': -3, 'openai': -3,
        'policy': -3, 'regulatory': -3, 'sebi': -3, 'government': -3, 'gst': -3,
        'Nvidia': -3, 'Salesforce': -3, 'Oracle': -3, 'SAP': -3, 'Tencent': -3, 
        'Alibaba': -3, 'ByteDance': -3, 'Spotify': -3,
        'RBI': -3, 'investigation': -3, 'probe': -3, 'audit': -3, 'lawsuit': -3, 
        'compliance': -3, 'regulation': -3,
      };
    
      // --- Compiled Regex for the Positive Gate ---
      private static STRONG_POSITIVE_PATTERNS = new RegExp(
        ArticleValidator.STRONG_POSITIVE_KEYWORDS
          .map(key => key.replace(/[$]/g, '\\$')) // Escape special chars like $
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
          for (const rule of this.HARD_REJECT_RULES) {
            if (rule.pattern.test(headline)) {
              score = -100; // Instantly disqualify
              rejectionReason = `Hard reject: ${rule.category}`; // Use the category
              break; // Stop checking rules
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
              // Escape special chars for regex in the loop
              const escapedKey = key.replace(/[$]/g, '\\$').replace(/ /g, '\\s+');
              const regex = new RegExp(`\\b${escapedKey}\\b`, 'gi');
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
        const validArticles = scoredArticles
          .filter(a => a.score > 0)
          .sort((a, b) => b.score - a.score); // Sort by highest score
    
        const rejectedArticles = scoredArticles.filter(a => a.score <= 0);
    
        // --- Aggregated Logging Block ---
        if (rejectedArticles.length > 0) {
          console.warn(`[ArticleValidator] 🗑️ Rejected ${rejectedArticles.length} articles. Reason breakdown:`);
          
          const rejectionCounts = new Map<string, number>();
          const rejectionExamples = new Map<string, string[]>(); // Map to hold examples
    
          for (const article of rejectedArticles) {
           const reason = article.rejectionReason || 'Unknown Reason';
            const count = rejectionCounts.get(reason) || 0;
            rejectionCounts.set(reason, count + 1);
    
            // Store the first few examples for each reason
            const examples = rejectionExamples.get(reason) || [];
            if (examples.length < 3) { // Store up to 3 examples
              examples.push(article.headline);
              rejectionExamples.set(reason, examples);
            }
          }
    
          const sortedReasons = Array.from(rejectionCounts.entries())
            .sort((a, b) => b[1] - a[1]);
    
          for (const [reason, count] of sortedReasons) {
            console.log(`  - [${count}x] ${reason}`);
             // Log the examples
            const examples = rejectionExamples.get(reason) || [];
            for (const headline of examples) {
              console.log(`     L Example: "${headline}"`);
            }
          }
        }
        // --- End Logging Block ---
    
       console.log(`[ArticleValidator] 🛡️ Validated ${articles.length} headlines. Found ${validArticles.length} valid candidates.`);
        
        if (validArticles.length > 0) {
          console.log(`[ArticleValidator] 🏆 Top candidate: "${validArticles[0].headline}" (Score: ${validArticles[0].score})`);
        } else {
          console.warn(`[ArticleValidator] ⚠️ No valid articles found after filtering.`);
        }
    
        return validArticles;
      }
    }