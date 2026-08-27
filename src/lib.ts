import type { Question, QuestionProgress, UserData } from './types'

export const DEFAULT_DATA: UserData = {
  progress: {}, streak: 0, studiedDates: [], difficultWords: [], exams: [], selectedState: 'Bayern', darkMode: false,
}

export function loadUserData(): UserData {
  try {
    const value = localStorage.getItem('einfach-user-v1')
    return value ? { ...DEFAULT_DATA, ...JSON.parse(value) } : DEFAULT_DATA
  } catch { return DEFAULT_DATA }
}

export function saveUserData(data: UserData) {
  localStorage.setItem('einfach-user-v1', JSON.stringify(data))
}

export function localDay(date = new Date()) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}

export function updateProgress(current: QuestionProgress | undefined, correct: boolean): QuestionProgress {
  const now = new Date()
  const base: QuestionProgress = current ?? { status: 'new', correct: 0, wrong: 0, interval: 0, ease: 2.3, due: now.toISOString() }
  const totalCorrect = base.correct + (correct ? 1 : 0)
  const totalWrong = base.wrong + (correct ? 0 : 1)
  const interval = correct ? (base.interval === 0 ? 1 : Math.max(2, Math.round(base.interval * base.ease))) : 0
  const ease = Math.min(2.8, Math.max(1.3, base.ease + (correct ? 0.08 : -0.22)))
  const status = !correct ? 'learning' : totalCorrect >= 5 && totalWrong <= 1 ? 'mastered' : totalCorrect >= 3 ? 'familiar' : 'learning'
  now.setDate(now.getDate() + interval)
  return { status, correct: totalCorrect, wrong: totalWrong, interval, ease, due: now.toISOString(), lastSeen: new Date().toISOString() }
}

export function weightedQuestions(questions: Question[], progress: UserData['progress']): Question[] {
  const now = Date.now()
  return [...questions].sort((a, b) => {
    const pa = progress[a.id], pb = progress[b.id]
    const score = (p?: QuestionProgress) => !p ? 100 : (new Date(p.due).getTime() <= now ? 60 : 0) + p.wrong * 12 - p.correct * 3 + Math.random() * 15
    return score(pb) - score(pa)
  })
}

export function examQuestions(questions: Question[], state: string) {
  const shuffle = <T,>(items: T[]) => [...items].sort(() => Math.random() - .5)
  const general = shuffle(questions.filter(q => !q.state)).slice(0, 30)
  const regional = shuffle(questions.filter(q => q.state === state)).slice(0, 3)
  return shuffle([...general, ...regional])
}

export function formatSection(value: string) {
  const labels: Record<string, string> = {
    'Law & Governance': 'Law & democracy', 'History & Geography': 'History & geography', Elections: 'Elections',
    'Education & Religion': 'Society & religion', 'Federal System': 'Federal system', 'Social System': 'Everyday life',
  }
  return labels[value] ?? value
}

