// Shared severity keyword arrays used across IntelPanel, NewsBriefing,
// portfolio news, and signals. Single source of truth.

export const HIGH_KW: string[] = [
  'war', 'attack', 'strike', 'sanction', 'blockade', 'invasion', 'missile', 'drone',
  'crisis', 'crash', 'collapse', 'emergency', 'default', 'coup', 'explosion', 'seized',
  'airstrike', 'ceasefire', 'nuclear', 'opec cut', 'opec+',
  'shutdown', 'pandemic', 'downgrade', 'bank run', 'assassination', 'plunge',
  'capitulation', 'martial law',
]

export const MED_KW: string[] = [
  'tariff', 'trade', 'regulation', 'election', 'gdp', 'inflation', 'rate hike', 'rate cut',
  'deficit', 'devaluation', 'recession', 'unemployment', 'fomc', 'opec', 'earnings',
  'output cut', 'supply cut',
  'stagflation', 'supply shock', 'debt crisis', 'selloff', 'correction',
  'escalation', 'retaliation', 'probe', 'investigation', 'warning',
]

export function classifySeverity(text: string): 'HIGH' | 'MED' | 'LOW' {
  const l = text.toLowerCase()
  if (HIGH_KW.some(k => l.includes(k))) return 'HIGH'
  if (MED_KW.some(k => l.includes(k))) return 'MED'
  return 'LOW'
}
