export const TOPIC_GUIDELINES = {
  // --- Core Vocabulary & Nuance ---
  eng_vocab_word_meaning: {
    focus: 'Clarifying the precise meaning of a powerful word with a memorable example.',
    hook: 'You might know this word, but are you using it to its full potential?',
    scenarios: ['job interviews', 'academic writing', 'sounding more articulate'],
  },
  eng_vocab_confused_words: {
    focus: 'Clearly differentiating between two words that are often mixed up.',
    hook: 'Stop making this common mistake! Master the difference between these tricky words.',
    scenarios: ['professional emails', 'writing reports', 'avoiding embarrassing mix-ups'],
  },
  eng_vocab_formal_casual: {
    focus: 'Showing the difference between formal and casual ways to express the same idea.',
    hook: 'Sound more professional at work and more natural with friends. Here is how.',
    scenarios: ['adapting your language for different audiences', 'job interviews vs. texting', 'email etiquette'],
  },
  
  // --- Synonyms & Alternatives ---
  eng_vocab_synonyms_good: {
    focus: 'Moving beyond "good" to use more precise and impactful positive adjectives.',
    hook: 'Why say "good" when you could say "exceptional," "superb," or "marvelous"?',
    scenarios: ['giving feedback', 'writing reviews', 'expressing strong positive feelings'],
  },
  eng_vocab_synonyms_important: {
    focus: 'Replacing "important" with stronger, more specific alternatives.',
    hook: 'Make your point more powerful. Stop saying "important" and start using these words.',
    scenarios: ['making a business case', 'prioritizing tasks', 'academic arguments'],
  },
  eng_vocab_synonyms_said: {
    focus: 'Using descriptive verbs instead of the generic word "said."',
    hook: 'Bring your stories to life! Do not just say they "said" something.',
    scenarios: ['storytelling', 'creative writing', 'reporting conversations'],
  },

  // --- Practical English ---
  eng_vocab_business: {
    focus: 'Explaining a key term used in corporate environments to boost professional fluency.',
    hook: 'Want to sound like a pro in your next meeting? You need to know this business term.',
    scenarios: ['team meetings', 'client negotiations', 'understanding corporate jargon'],
  },
  eng_vocab_idiom: {
    focus: 'Defining a common English idiom and explaining how to use it naturally.',
    hook: 'Unlock the secrets of native speakers! What does this common idiom *really* mean?',
    scenarios: ['understanding movies and TV shows', 'casual conversations', 'sounding more fluent'],
  },
  eng_vocab_phrasal_verb: {
    focus: 'Breaking down a useful phrasal verb with a clear example.',
    hook: 'This is one phrasal verb you will use all the time. Let us master it.',
    scenarios: ['daily conversation', 'making plans', 'understanding context'],
  },
  
  // --- Word Types ---
  eng_vocab_adjective: {
    focus: 'Introducing a descriptive adjective to make your language more vivid.',
    hook: 'Add some color to your English! Here is a great adjective to do it.',
    scenarios: ['describing people, places, or experiences', 'storytelling', 'making your writing more engaging'],
  },
  eng_vocab_power_verb: {
    focus: 'Showcasing a strong, active verb to make sentences more dynamic.',
    hook: 'Make your sentences move! Replace weak verbs with this powerful alternative.',
    scenarios: ['resume writing', 'professional communication', 'clear and concise writing'],
  },
} as const;

export const VOCAB_APPROACHES = [
  'Focus on etymology and word origins',
  'Emphasize practical usage in professional settings', 
  'Highlight common mistakes and how to avoid them',
  'Show formal vs informal usage patterns',
  'Demonstrate usage in different contexts',
  'Focus on pronunciation and spelling patterns'
] as const;