import { describe, expect, it } from 'vitest'
import { examQuestions, updateProgress } from './lib'
import questions from './data/questions.json'
import type { Question } from './types'

describe('learning scheduler', () => {
  it('moves repeated correct answers toward mastery', () => {
    let progress
    for (let i = 0; i < 5; i++) progress = updateProgress(progress, true)
    expect(progress?.status).toBe('mastered')
    expect(progress?.interval).toBeGreaterThan(1)
  })

  it('resets the interval after an incorrect answer', () => {
    const learned = updateProgress(updateProgress(undefined, true), true)
    const missed = updateProgress(learned, false)
    expect(missed.interval).toBe(0)
    expect(missed.status).toBe('learning')
  })
})

describe('exam composition', () => {
  it('contains 30 general and 3 Bavaria questions', () => {
    const exam = examQuestions(questions as Question[], 'Bayern')
    expect(exam).toHaveLength(33)
    expect(exam.filter(q => !q.state)).toHaveLength(30)
    expect(exam.filter(q => q.state === 'Bayern')).toHaveLength(3)
  })
})

describe('release dataset', () => {
  const catalogue = questions as Question[]

  it('contains the complete BAMF catalogue', () => {
    expect(catalogue).toHaveLength(460)
    expect(catalogue.filter(q => !q.state)).toHaveLength(300)
    expect(catalogue.filter(q => q.state === 'Bayern')).toHaveLength(10)
  })

  it('has exactly one correct, translated answer per question', () => {
    for (const question of catalogue) {
      expect(question.answers).toHaveLength(4)
      expect(question.answers.filter(answer => answer.correct)).toHaveLength(1)
      expect(question.englishQuestion.trim().length).toBeGreaterThan(3)
      expect(question.answers.every(answer => answer.english.trim().length > 0)).toBe(true)
    }
  })

  it('uses clean state labels', () => {
    expect(catalogue.some(question => question.state === 'Bremen')).toBe(true)
    expect(catalogue.some(question => question.state?.includes('BremenBremen'))).toBe(false)
  })
})

