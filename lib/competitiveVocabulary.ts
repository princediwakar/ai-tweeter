/**
 * Competitive Exam Vocabulary Database
 * Curated word lists for major English proficiency and competitive exams
 */

export interface ExamWordEntry {
  word: string;
  difficulty: 1 | 2 | 3 | 4 | 5; // 1 = basic, 5 = expert level
  frequency: 'high' | 'medium' | 'low'; // how often it appears in exams
  categories: string[];
  examRelevance: string[];
}

export interface VocabularyDatabase {
  [examType: string]: {
    description: string;
    targetLevel: string;
    wordPool: ExamWordEntry[];
  };
}

/**
 * Curated vocabulary for major competitive exams
 */
export const COMPETITIVE_VOCABULARY: VocabularyDatabase = {
  GRE: {
    description: "Graduate Record Examination - Advanced academic vocabulary",
    targetLevel: "Graduate school preparation",
    wordPool: [
      { word: "perspicacious", difficulty: 4, frequency: "medium", categories: ["analytical", "perceptive"], examRelevance: ["GRE", "academic"] },
      { word: "ubiquitous", difficulty: 3, frequency: "high", categories: ["descriptive", "common"], examRelevance: ["GRE", "GMAT", "academic"] },
      { word: "truculent", difficulty: 4, frequency: "medium", categories: ["personality", "aggressive"], examRelevance: ["GRE", "literary"] },
      { word: "sanguine", difficulty: 3, frequency: "medium", categories: ["optimistic", "confident"], examRelevance: ["GRE", "GMAT", "professional"] },
      { word: "perfunctory", difficulty: 3, frequency: "high", categories: ["careless", "routine"], examRelevance: ["GRE", "GMAT", "professional"] },
      { word: "recalcitrant", difficulty: 4, frequency: "medium", categories: ["stubborn", "resistant"], examRelevance: ["GRE", "academic"] },
      { word: "deleterious", difficulty: 4, frequency: "low", categories: ["harmful", "negative"], examRelevance: ["GRE", "medical", "academic"] },
      { word: "innocuous", difficulty: 3, frequency: "medium", categories: ["harmless", "benign"], examRelevance: ["GRE", "academic"] },
      { word: "mendacious", difficulty: 4, frequency: "low", categories: ["dishonest", "lying"], examRelevance: ["GRE", "literary"] },
      { word: "magnanimous", difficulty: 3, frequency: "medium", categories: ["generous", "noble"], examRelevance: ["GRE", "literary", "character"] }
    ]
  },
  
  GMAT: {
    description: "Graduate Management Admission Test - Business-focused vocabulary",
    targetLevel: "MBA preparation and business communication",
    wordPool: [
      { word: "comprehensive", difficulty: 2, frequency: "high", categories: ["thorough", "complete"], examRelevance: ["GMAT", "business", "academic"] },
      { word: "substantiate", difficulty: 3, frequency: "high", categories: ["prove", "support"], examRelevance: ["GMAT", "GRE", "academic"] },
      { word: "comprehensive", difficulty: 2, frequency: "high", categories: ["complete", "thorough"], examRelevance: ["GMAT", "business"] },
      { word: "mitigate", difficulty: 3, frequency: "high", categories: ["reduce", "lessen"], examRelevance: ["GMAT", "business", "risk"] },
      { word: "facilitate", difficulty: 2, frequency: "high", categories: ["enable", "assist"], examRelevance: ["GMAT", "business", "management"] },
      { word: "volatile", difficulty: 3, frequency: "high", categories: ["unstable", "changeable"], examRelevance: ["GMAT", "finance", "markets"] },
      { word: "implement", difficulty: 2, frequency: "high", categories: ["execute", "carry out"], examRelevance: ["GMAT", "business", "strategy"] },
      { word: "optimize", difficulty: 3, frequency: "high", categories: ["improve", "maximize"], examRelevance: ["GMAT", "business", "efficiency"] },
      { word: "paradigm", difficulty: 3, frequency: "medium", categories: ["model", "framework"], examRelevance: ["GMAT", "business", "strategy"] },
      { word: "leverage", difficulty: 3, frequency: "high", categories: ["utilize", "exploit"], examRelevance: ["GMAT", "business", "finance"] }
    ]
  },
  
  IELTS: {
    description: "International English Language Testing System - Academic and general vocabulary",
    targetLevel: "International English proficiency",
    wordPool: [
      { word: "contemporary", difficulty: 2, frequency: "high", categories: ["modern", "current"], examRelevance: ["IELTS", "academic", "general"] },
      { word: "predominant", difficulty: 3, frequency: "high", categories: ["main", "primary"], examRelevance: ["IELTS", "academic"] },
      { word: "significant", difficulty: 2, frequency: "high", categories: ["important", "notable"], examRelevance: ["IELTS", "academic", "general"] },
      { word: "considerable", difficulty: 2, frequency: "high", categories: ["substantial", "large"], examRelevance: ["IELTS", "academic"] },
      { word: "consequently", difficulty: 2, frequency: "high", categories: ["therefore", "result"], examRelevance: ["IELTS", "academic", "writing"] },
      { word: "furthermore", difficulty: 2, frequency: "high", categories: ["moreover", "additionally"], examRelevance: ["IELTS", "academic", "writing"] },
      { word: "nevertheless", difficulty: 3, frequency: "medium", categories: ["however", "despite"], examRelevance: ["IELTS", "academic", "writing"] },
      { word: "constitute", difficulty: 3, frequency: "medium", categories: ["form", "comprise"], examRelevance: ["IELTS", "academic"] },
      { word: "enhance", difficulty: 2, frequency: "high", categories: ["improve", "strengthen"], examRelevance: ["IELTS", "academic", "general"] },
      { word: "inevitable", difficulty: 3, frequency: "medium", categories: ["unavoidable", "certain"], examRelevance: ["IELTS", "academic"] }
    ]
  },
  
  TOEFL: {
    description: "Test of English as a Foreign Language - Academic English for US universities",
    targetLevel: "American university preparation",
    wordPool: [
      { word: "hypothesis", difficulty: 3, frequency: "high", categories: ["theory", "assumption"], examRelevance: ["TOEFL", "academic", "scientific"] },
      { word: "methodology", difficulty: 3, frequency: "high", categories: ["approach", "system"], examRelevance: ["TOEFL", "academic", "research"] },
      { word: "empirical", difficulty: 4, frequency: "medium", categories: ["evidence-based", "observable"], examRelevance: ["TOEFL", "academic", "scientific"] },
      { word: "correlation", difficulty: 3, frequency: "high", categories: ["relationship", "connection"], examRelevance: ["TOEFL", "academic", "statistical"] },
      { word: "phenomenon", difficulty: 3, frequency: "high", categories: ["occurrence", "event"], examRelevance: ["TOEFL", "academic", "scientific"] },
      { word: "predecessor", difficulty: 3, frequency: "medium", categories: ["forerunner", "earlier"], examRelevance: ["TOEFL", "academic", "historical"] },
      { word: "accumulate", difficulty: 2, frequency: "high", categories: ["gather", "collect"], examRelevance: ["TOEFL", "academic", "general"] },
      { word: "differentiate", difficulty: 3, frequency: "high", categories: ["distinguish", "separate"], examRelevance: ["TOEFL", "academic"] },
      { word: "simultaneous", difficulty: 3, frequency: "medium", categories: ["concurrent", "same time"], examRelevance: ["TOEFL", "academic"] },
      { word: "fundamental", difficulty: 2, frequency: "high", categories: ["basic", "essential"], examRelevance: ["TOEFL", "academic", "general"] }
    ]
  },
  
  UPSC: {
    description: "Union Public Service Commission - Governance and administrative vocabulary",
    targetLevel: "Civil services and public administration",
    wordPool: [
      { word: "bureaucracy", difficulty: 3, frequency: "high", categories: ["administration", "government"], examRelevance: ["UPSC", "governance"] },
      { word: "jurisdiction", difficulty: 3, frequency: "high", categories: ["authority", "legal"], examRelevance: ["UPSC", "legal", "administrative"] },
      { word: "precedent", difficulty: 3, frequency: "high", categories: ["example", "legal"], examRelevance: ["UPSC", "legal", "policy"] },
      { word: "ratify", difficulty: 3, frequency: "medium", categories: ["approve", "confirm"], examRelevance: ["UPSC", "legal", "constitutional"] },
      { word: "mandate", difficulty: 2, frequency: "high", categories: ["authority", "command"], examRelevance: ["UPSC", "governance", "legal"] },
      { word: "implement", difficulty: 2, frequency: "high", categories: ["execute", "carry out"], examRelevance: ["UPSC", "policy", "administration"] },
      { word: "constitutional", difficulty: 2, frequency: "high", categories: ["legal", "fundamental"], examRelevance: ["UPSC", "legal", "governance"] },
      { word: "allocate", difficulty: 2, frequency: "high", categories: ["distribute", "assign"], examRelevance: ["UPSC", "resources", "planning"] },
      { word: "transparency", difficulty: 2, frequency: "high", categories: ["openness", "clarity"], examRelevance: ["UPSC", "governance", "accountability"] },
      { word: "accountability", difficulty: 3, frequency: "high", categories: ["responsibility", "answerability"], examRelevance: ["UPSC", "governance", "administration"] }
    ]
  }
};

/**
 * Advanced vocabulary by academic domains
 */
export const ACADEMIC_DOMAINS = {
  "Philosophy & Ethics": [
    "ontological", "epistemological", "metaphysical", "pragmatic", "utilitarian",
    "deontological", "existential", "phenomenological", "dialectical", "hermeneutical"
  ],
  
  "Psychology & Cognition": [
    "metacognitive", "introspective", "psychological", "behavioral", "cognitive",
    "perceptual", "neurological", "psychoanalytic", "therapeutic", "diagnostic"
  ],
  
  "Economics & Finance": [
    "macroeconomic", "microeconomic", "monetary", "fiscal", "quantitative",
    "algorithmic", "statistical", "econometric", "financial", "actuarial"
  ],
  
  "Science & Technology": [
    "computational", "algorithmic", "systematic", "methodological", "analytical",
    "empirical", "quantitative", "experimental", "theoretical", "technological"
  ],
  
  "Literature & Arts": [
    "aesthetic", "literary", "rhetorical", "narrative", "poetic",
    "dramatic", "symbolic", "metaphorical", "allegorical", "stylistic"
  ],
  
  "Political Science": [
    "democratic", "republican", "federal", "constitutional", "legislative",
    "judicial", "executive", "diplomatic", "geopolitical", "international"
  ],
  
  "Sociology & Anthropology": [
    "sociological", "anthropological", "ethnographic", "cultural", "societal",
    "demographic", "ethnological", "archaeological", "linguistic", "ritualistic"
  ]
};

/**
 * Professional vocabulary by industry
 */
export const PROFESSIONAL_VOCABULARY = {
  "Management & Leadership": [
    "strategic", "tactical", "operational", "organizational", "managerial",
    "executive", "administrative", "supervisory", "directorial", "collaborative"
  ],
  
  "Finance & Banking": [
    "financial", "monetary", "fiscal", "capital", "investment",
    "portfolio", "securities", "derivatives", "commodities", "assets"
  ],
  
  "Technology & Innovation": [
    "technological", "digital", "computational", "algorithmic", "systematic",
    "automated", "integrated", "scalable", "optimized", "innovative"
  ],
  
  "Healthcare & Medicine": [
    "medical", "clinical", "therapeutic", "diagnostic", "pharmaceutical",
    "epidemiological", "pathological", "physiological", "anatomical", "surgical"
  ],
  
  "Legal & Compliance": [
    "legal", "judicial", "statutory", "regulatory", "constitutional",
    "legislative", "contractual", "litigious", "jurisprudential", "procedural"
  ],
  
  "Education & Research": [
    "educational", "academic", "pedagogical", "curricular", "methodological",
    "research", "scholarly", "intellectual", "analytical", "theoretical"
  ]
};

/**
 * Gets vocabulary suggestions based on exam type and difficulty level
 */
export function getExamVocabulary(
  examType: keyof typeof COMPETITIVE_VOCABULARY,
  difficulty: 1 | 2 | 3 | 4 | 5,
  count: number = 10
): ExamWordEntry[] {
  const examData = COMPETITIVE_VOCABULARY[examType];
  if (!examData) return [];
  
  return examData.wordPool
    .filter(entry => entry.difficulty === difficulty)
    .sort(() => Math.random() - 0.5) // Shuffle
    .slice(0, count);
}

/**
 * Gets cross-exam vocabulary that appears in multiple exams
 */
export function getCrossExamVocabulary(
  examTypes: string[],
  minExamCount: number = 2
): ExamWordEntry[] {
  const allWords: ExamWordEntry[] = [];
  
  Object.values(COMPETITIVE_VOCABULARY).forEach(exam => {
    allWords.push(...exam.wordPool);
  });
  
  // Find words that appear in multiple exams
  return allWords.filter(word => {
    const examMatches = word.examRelevance.filter(exam => 
      examTypes.some(target => exam.toLowerCase().includes(target.toLowerCase()))
    );
    return examMatches.length >= minExamCount;
  });
}

/**
 * Gets domain-specific vocabulary for advanced learners
 */
export function getDomainVocabulary(domain: keyof typeof ACADEMIC_DOMAINS): string[] {
  return ACADEMIC_DOMAINS[domain] || [];
}

/**
 * Gets professional vocabulary by industry
 */
export function getProfessionalVocabulary(industry: keyof typeof PROFESSIONAL_VOCABULARY): string[] {
  return PROFESSIONAL_VOCABULARY[industry] || [];
}

/**
 * Generates a smart vocabulary suggestion based on recent words and target exam
 */
export function getSmartVocabularySuggestion(
  recentWords: string[],
  targetExam?: keyof typeof COMPETITIVE_VOCABULARY,
  targetDifficulty: 1 | 2 | 3 | 4 | 5 = 3
): string {
  let availableWords: string[] = [];
  
  if (targetExam) {
    const examWords = getExamVocabulary(targetExam, targetDifficulty, 50);
    availableWords = examWords.map(entry => entry.word);
  } else {
    // Combine words from all exams
    Object.values(COMPETITIVE_VOCABULARY).forEach(exam => {
      availableWords.push(...exam.wordPool.map(entry => entry.word));
    });
  }
  
  // Filter out recently used words
  const filteredWords = availableWords.filter(word => 
    !recentWords.some(recent => recent.toLowerCase() === word.toLowerCase())
  );
  
  // Return a random suggestion
  return filteredWords[Math.floor(Math.random() * filteredWords.length)] || "sophisticated";
}