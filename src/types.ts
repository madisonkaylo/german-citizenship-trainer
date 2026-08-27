export type LearningStatus = 'new' | 'learning' | 'familiar' | 'mastered'

export interface VocabularyItem {
  german: string
  english: string
  example: string
  related: string[]
}

export interface Answer {
  german: string
  english: string
  correct: boolean
}

export interface Question {
  id: string
  number: number
  section: string
  state: string | null
  germanQuestion: string
  englishQuestion: string
  answers: Answer[]
  explanation: string
  image?: string | null
  vocabulary: VocabularyItem[]
}

export interface QuestionProgress {
  status: LearningStatus
  correct: number
  wrong: number
  interval: number
  ease: number
  due: string
  lastSeen?: string
}

export interface UserData {
  progress: Record<string, QuestionProgress>
  streak: number
  lastStudyDate?: string
  studiedDates: string[]
  difficultWords: string[]
  exams: { date: string; score: number; total: number }[]
  selectedState: string
  darkMode: boolean
}

