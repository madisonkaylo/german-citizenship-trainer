import { useEffect, useMemo, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import {
  ArrowLeft, ArrowRight, Award, BookOpen, Brain, Check, ChevronRight, Flame, GraduationCap,
  Home, Languages, Moon, RotateCcw, Settings, Sparkles, Sun, Target, Trophy, X,
} from 'lucide-react'
import questionsJson from './data/questions.json'
import { examQuestions, formatSection, loadUserData, localDay, saveUserData, updateProgress, weightedQuestions } from './lib'
import type { Question, UserData, VocabularyItem } from './types'

const questions = questionsJson as Question[]
type Screen = 'home' | 'learn' | 'practice' | 'exam' | 'vocabulary' | 'settings'

const assetUrl = (path: string) => `${import.meta.env.BASE_URL}${path.replace(/^\//, '')}`

function App() {
  const [screen, setScreen] = useState<Screen>('home')
  const [user, setUser] = useState<UserData>(loadUserData)
  const [filter, setFilter] = useState<'all' | 'general' | 'bavaria'>('bavaria')

  useEffect(() => { saveUserData(user); document.documentElement.classList.toggle('dark', user.darkMode) }, [user])
  const scoped = useMemo(() => questions.filter(q => filter === 'all' || (filter === 'general' ? !q.state : !q.state || q.state === 'Bayern')), [filter])

  const record = (question: Question, correct: boolean) => setUser(current => {
    const today = localDay()
    const yesterday = new Date(); yesterday.setDate(yesterday.getDate() - 1)
    let streak = current.streak
    if (current.lastStudyDate !== today) streak = current.lastStudyDate === localDay(yesterday) ? streak + 1 : 1
    return {
      ...current, streak, lastStudyDate: today,
      studiedDates: current.studiedDates.includes(today) ? current.studiedDates : [...current.studiedDates, today],
      progress: { ...current.progress, [question.id]: updateProgress(current.progress[question.id], correct) },
    }
  })

  const navigate = (next: Screen) => { setScreen(next); window.scrollTo({ top: 0, behavior: 'smooth' }) }
  return <div className="app-shell">
    <AnimatePresence mode="wait">
      <motion.main key={screen} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} transition={{ duration: .2 }}>
        {screen === 'home' && <Dashboard user={user} questions={questions} onNavigate={navigate} filter={filter} setFilter={setFilter} />}
        {(screen === 'learn' || screen === 'practice') && <StudySession mode={screen} questions={scoped} user={user} onRecord={record} onBack={() => navigate('home')} onWord={word => setUser(u => ({ ...u, difficultWords: [...new Set([...u.difficultWords, word])] }))} />}
        {screen === 'exam' && <Exam questions={questions} user={user} setUser={setUser} onBack={() => navigate('home')} />}
        {screen === 'vocabulary' && <Vocabulary user={user} questions={questions} onBack={() => navigate('home')} setUser={setUser} />}
        {screen === 'settings' && <SettingsScreen user={user} setUser={setUser} onBack={() => navigate('home')} />}
      </motion.main>
    </AnimatePresence>
    {screen === 'home' && <BottomNav screen={screen} onNavigate={navigate} />}
  </div>
}

function Brand({ compact = false }: { compact?: boolean }) {
  return <div className={`brand ${compact ? 'compact' : ''}`}><div className="brand-mark">DE</div><div><strong>Einfach</strong><span>Deutschland</span></div></div>
}

function Dashboard({ user, questions, onNavigate, filter, setFilter }: { user: UserData; questions: Question[]; onNavigate: (s: Screen) => void; filter: string; setFilter: (f: 'all' | 'general' | 'bavaria') => void }) {
  const mastered = Object.values(user.progress).filter(p => p.status === 'mastered').length
  const learned = Object.keys(user.progress).length
  const due = Object.values(user.progress).filter(p => new Date(p.due) <= new Date()).length
  const progress = Math.round(mastered / 310 * 100)
  const weakest = Object.entries(user.progress).sort(([, a], [, b]) => (b.wrong - b.correct) - (a.wrong - a.correct)).slice(0, 3).map(([id]) => questions.find(q => q.id === id)?.section).filter(Boolean)
  return <div className="page dashboard">
    <header className="topbar"><Brand /><button className="icon-button" onClick={() => onNavigate('settings')} aria-label="Settings"><Settings size={20} /></button></header>
    <section className="hero">
      <div><span className="eyebrow">Guten Tag, Madison</span><h1>Ready for a little<br /><em>Deutsch?</em></h1><p>Small steps, strong memory. Your next review is ready.</p></div>
      <div className="hero-orbit" aria-hidden="true"><span>GUT</span><div>{progress}%</div><small>exam ready</small></div>
    </section>
    <div className="filter-row" aria-label="Question filter">
      {([['bavaria', 'Munich mix'], ['general', 'All Germany'], ['all', 'Full catalogue']] as const).map(([value, label]) => <button key={value} className={filter === value ? 'active' : ''} onClick={() => setFilter(value)}>{label}</button>)}
    </div>
    <section className="stats-grid">
      <Stat icon={<Target />} value={`${mastered}`} label="Mastered" tone="sage" />
      <Stat icon={<Flame />} value={`${user.streak}`} label="Day streak" tone="amber" />
      <Stat icon={<RotateCcw />} value={`${due || Math.max(0, 12 - learned)}`} label="Due today" tone="blue" />
    </section>
    <section className="section-heading"><div><span className="eyebrow">Choose your pace</span><h2>Study modes</h2></div><span className="quiet">{learned} seen</span></section>
    <div className="mode-grid">
      <ModeCard featured icon={<Sparkles />} title="Learn with context" subtitle="German + English" detail="Build meaning, not just memory." action="Start learning" onClick={() => onNavigate('learn')} />
      <ModeCard icon={<Brain />} title="German practice" subtitle="Hints when you need them" detail="Try first. Reveal help later." action="Practice" onClick={() => onNavigate('practice')} />
      <ModeCard icon={<GraduationCap />} title="Exam simulation" subtitle="33 questions · German only" detail="Real format, calm surroundings." action="Take an exam" onClick={() => onNavigate('exam')} />
      <ModeCard icon={<Languages />} title="Vocabulary deck" subtitle={`${user.difficultWords.length} saved words`} detail="Review the language behind the test." action="Open deck" onClick={() => onNavigate('vocabulary')} />
    </div>
    <section className="progress-panel">
      <div className="progress-copy"><span className="eyebrow">Your path</span><h2>{mastered ? `${mastered} questions truly learned` : 'Your first milestone is close'}</h2><p>{weakest.length ? `Focus next: ${[...new Set(weakest)].map(x => formatSection(x!)).join(', ')}.` : 'Answer a few questions and your weak topics will appear here.'}</p></div>
      <div className="progress-ring" style={{ '--progress': `${Math.max(progress, 2) * 3.6}deg` } as React.CSSProperties}><span>{progress}%</span></div>
    </section>
    <footer className="source-note">Based on the official BAMF catalogue · 460 questions · Updated 2025</footer>
  </div>
}

function Stat({ icon, value, label, tone }: { icon: React.ReactNode; value: string; label: string; tone: string }) {
  return <div className={`stat ${tone}`}><div className="stat-icon">{icon}</div><strong>{value}</strong><span>{label}</span></div>
}

function ModeCard({ icon, title, subtitle, detail, action, featured, onClick }: { icon: React.ReactNode; title: string; subtitle: string; detail: string; action: string; featured?: boolean; onClick: () => void }) {
  return <button className={`mode-card ${featured ? 'featured' : ''}`} onClick={onClick}><div className="mode-icon">{icon}</div><div className="mode-copy"><span>{subtitle}</span><h3>{title}</h3><p>{detail}</p></div><div className="mode-action">{action}<ChevronRight size={18} /></div></button>
}

function StudySession({ mode, questions, user, onRecord, onBack, onWord }: { mode: 'learn' | 'practice'; questions: Question[]; user: UserData; onRecord: (q: Question, c: boolean) => void; onBack: () => void; onWord: (word: string) => void }) {
  const [queue] = useState(() => weightedQuestions(questions, user.progress).slice(0, 20))
  const [index, setIndex] = useState(0), [selected, setSelected] = useState<number | null>(null)
  const [english, setEnglish] = useState(mode === 'learn'), [showVocab, setShowVocab] = useState(mode === 'learn'), [vocabOpen, setVocabOpen] = useState<VocabularyItem | null>(null)
  const question = queue[index % queue.length]
  const answered = selected !== null, isCorrect = answered && question.answers[selected!].correct
  const choose = (answer: number) => { if (answered) return; setSelected(answer); onRecord(question, question.answers[answer].correct) }
  const next = () => { setSelected(null); setEnglish(mode === 'learn'); setShowVocab(mode === 'learn'); setIndex(i => i + 1); window.scrollTo({ top: 0, behavior: 'smooth' }) }

  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      if (!answered && ['1', '2', '3', '4'].includes(event.key)) choose(Number(event.key) - 1)
      if (answered && (event.key === 'Enter' || event.key === 'ArrowRight')) next()
    }
    window.addEventListener('keydown', handler); return () => window.removeEventListener('keydown', handler)
  })
  if (!question) return null
  return <div className="study-page page">
    <SessionHeader onBack={onBack} label={mode === 'learn' ? 'Learn mode' : 'German practice'} progress={(index % 20 + 1) / 20} count={`${index % 20 + 1} / 20`} />
    <article className="question-card">
      <div className="question-meta"><span>{question.state ? `${question.state} · ` : ''}{formatSection(question.section)}</span><span>#{question.number}</span></div>
      <h1 lang="de">{question.germanQuestion}</h1>
      {english && <p className="translation">{question.englishQuestion}</p>}
      {question.image && <img className="question-image" src={assetUrl(question.image)} alt="Visual options for this question" />}
      <div className="answers">
        {question.answers.map((answer, i) => {
          const state = answered ? answer.correct ? 'correct' : selected === i ? 'wrong' : 'muted' : ''
          return <button className={`answer ${state}`} key={i} onClick={() => choose(i)} disabled={answered}><span className="answer-key">{String.fromCharCode(65 + i)}</span><span className="answer-copy"><strong lang="de">{answer.german}</strong>{english && <small>{answer.english}</small>}</span>{state === 'correct' && <Check />}{state === 'wrong' && <X />}</button>
        })}
      </div>
      {!answered && mode === 'practice' && <div className="reveal-row"><button onClick={() => setEnglish(v => !v)}><Languages size={16} />{english ? 'Hide English' : 'Reveal English'}</button><button onClick={() => setShowVocab(v => !v)}><BookOpen size={16} />Vocabulary</button></div>}
    </article>
    <AnimatePresence>{answered && <motion.section className={`feedback ${isCorrect ? 'success' : 'retry'}`} initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }}>
      <div className="feedback-title"><div>{isCorrect ? <Check /> : <RotateCcw />}</div><div><span>{isCorrect ? 'Richtig!' : 'Not quite'}</span><h2>{isCorrect ? 'Nicely read.' : 'Let’s make it stick.'}</h2></div></div>
      <p>{question.explanation}</p>
      {question.vocabulary.length > 0 && <div className="vocab-chips">{question.vocabulary.map(word => <button key={word.german} onClick={() => { setVocabOpen(word); onWord(word.german) }}><strong>{word.german}</strong><span>{word.english}</span></button>)}</div>}
      <button className="primary-button" onClick={next}>Continue <ArrowRight size={18} /></button>
    </motion.section>}</AnimatePresence>
    {showVocab && !answered && question.vocabulary.length > 0 && <section className="word-preview"><span className="eyebrow">Words to notice</span>{question.vocabulary.map(word => <button key={word.german} onClick={() => setVocabOpen(word)}>{word.german}<span>{word.english}</span></button>)}</section>}
    <VocabModal word={vocabOpen} onClose={() => setVocabOpen(null)} />
  </div>
}

function SessionHeader({ onBack, label, progress, count }: { onBack: () => void; label: string; progress: number; count: string }) {
  return <header className="session-header"><button className="icon-button" onClick={onBack} aria-label="Back"><ArrowLeft /></button><div><span>{label}</span><div className="session-progress"><i style={{ width: `${progress * 100}%` }} /></div></div><strong>{count}</strong></header>
}

function Exam({ questions, user, setUser, onBack }: { questions: Question[]; user: UserData; setUser: React.Dispatch<React.SetStateAction<UserData>>; onBack: () => void }) {
  const [started, setStarted] = useState(false), [queue, setQueue] = useState<Question[]>([]), [index, setIndex] = useState(0)
  const [answers, setAnswers] = useState<Record<string, number>>({}), [finished, setFinished] = useState(false)
  const start = () => { setQueue(examQuestions(questions, user.selectedState)); setStarted(true); setIndex(0); setAnswers({}); setFinished(false) }
  const finish = () => {
    const score = queue.filter(q => q.answers[answers[q.id]]?.correct).length
    setUser(u => ({ ...u, exams: [...u.exams, { date: new Date().toISOString(), score, total: 33 }].slice(-20) })); setFinished(true)
  }
  if (!started) return <div className="page exam-intro"><header className="simple-header"><button className="icon-button" onClick={onBack}><ArrowLeft /></button><Brand compact /></header><div className="exam-badge"><GraduationCap /></div><span className="eyebrow">Simulation</span><h1>Ready when you are.</h1><p>33 random questions: 30 general and 3 for {user.selectedState}. German only, just like the real test.</p><div className="exam-facts"><div><strong>33</strong><span>questions</span></div><div><strong>60</strong><span>minutes</span></div><div><strong>17</strong><span>to pass</span></div></div><button className="primary-button" onClick={start}>Begin exam <ArrowRight /></button><small>Your progress is saved only when you finish.</small></div>
  if (finished) {
    const score = queue.filter(q => q.answers[answers[q.id]]?.correct).length, passed = score >= 17
    return <div className="page exam-results"><header className="simple-header"><button className="icon-button" onClick={onBack}><X /></button><Brand compact /></header><div className={`result-medal ${passed ? 'passed' : ''}`}>{passed ? <Trophy /> : <Brain />}</div><span className="eyebrow">Exam complete</span><h1>{score} / 33</h1><h2>{passed ? 'You passed this round.' : 'Keep building. You’re getting there.'}</h2><p>{passed ? 'A calm, confident result. Review the misses once more to make it durable.' : `You need ${17 - score} more correct answers to reach the passing score.`}</p><div className="review-list">{queue.filter(q => !q.answers[answers[q.id]]?.correct).map(q => <div key={q.id}><span>#{q.number}</span><div><strong>{q.germanQuestion}</strong><small>{q.answers.find(a => a.correct)?.german}</small></div></div>)}</div><button className="primary-button" onClick={start}>Try another exam <RotateCcw /></button></div>
  }
  const question = queue[index]
  return <div className="page study-page exam-page"><SessionHeader onBack={onBack} label="Exam mode" progress={(index + 1) / 33} count={`${index + 1} / 33`} /><article className="question-card"><div className="question-meta"><span>{question.state || formatSection(question.section)}</span><span>#{question.number}</span></div><h1 lang="de">{question.germanQuestion}</h1>{question.image && <img className="question-image" src={assetUrl(question.image)} alt="Bild zur Prüfungsfrage" />}<div className="answers">{question.answers.map((a, i) => <button className={`answer ${answers[question.id] === i ? 'selected' : ''}`} onClick={() => setAnswers(v => ({ ...v, [question.id]: i }))} key={i}><span className="answer-key">{String.fromCharCode(65 + i)}</span><span className="answer-copy"><strong>{a.german}</strong></span></button>)}</div></article><div className="exam-navigation"><button disabled={index === 0} onClick={() => setIndex(i => i - 1)}><ArrowLeft /> Back</button>{index === 32 ? <button className="primary-button" disabled={answers[question.id] === undefined} onClick={finish}>Finish exam <Check /></button> : <button className="primary-button" disabled={answers[question.id] === undefined} onClick={() => setIndex(i => i + 1)}>Next <ArrowRight /></button>}</div></div>
}

function Vocabulary({ user, questions, onBack, setUser }: { user: UserData; questions: Question[]; onBack: () => void; setUser: React.Dispatch<React.SetStateAction<UserData>> }) {
  const words = useMemo(() => {
    const map = new Map<string, VocabularyItem>()
    questions.flatMap(q => q.vocabulary).forEach(w => map.set(w.german, w))
    return [...map.values()].sort((a, b) => Number(user.difficultWords.includes(b.german)) - Number(user.difficultWords.includes(a.german)))
  }, [questions, user.difficultWords])
  const [index, setIndex] = useState(0), [flipped, setFlipped] = useState(false)
  const word = words[index % words.length]
  return <div className="page vocabulary-page"><header className="simple-header"><button className="icon-button" onClick={onBack}><ArrowLeft /></button><Brand compact /><span className="quiet">{words.length} words</span></header><div className="vocab-heading"><span className="eyebrow">Language deck</span><h1>Words worth knowing</h1><p>Tap the card to turn it over.</p></div><button className={`flashcard ${flipped ? 'flipped' : ''}`} onClick={() => setFlipped(v => !v)}><span>{flipped ? 'English' : 'Deutsch'}</span><h2>{flipped ? word.english : word.german}</h2><p>{flipped ? word.example : 'Tap to reveal meaning'}</p>{flipped && <div>{word.related.map(r => <i key={r}>{r}</i>)}</div>}</button><div className="flash-actions"><button onClick={() => { setUser(u => ({ ...u, difficultWords: [...new Set([...u.difficultWords, word.german])] })); setIndex(i => i + 1); setFlipped(false) }}><RotateCcw />Still learning</button><button className="primary-button" onClick={() => { setUser(u => ({ ...u, difficultWords: u.difficultWords.filter(w => w !== word.german) })); setIndex(i => i + 1); setFlipped(false) }}><Check />Got it</button></div></div>
}

function VocabModal({ word, onClose }: { word: VocabularyItem | null; onClose: () => void }) {
  return <AnimatePresence>{word && <motion.div className="modal-backdrop" onClick={onClose} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}><motion.div className="vocab-modal" onClick={e => e.stopPropagation()} initial={{ y: 80 }} animate={{ y: 0 }} exit={{ y: 80 }}><button className="icon-button modal-close" onClick={onClose}><X /></button><span className="eyebrow">Wortschatz</span><h2>{word.german}</h2><h3>{word.english}</h3><blockquote>{word.example}</blockquote><div>{word.related.map(r => <span key={r}>{r}</span>)}</div></motion.div></motion.div>}</AnimatePresence>
}

function SettingsScreen({ user, setUser, onBack }: { user: UserData; setUser: React.Dispatch<React.SetStateAction<UserData>>; onBack: () => void }) {
  return <div className="page settings-page"><header className="simple-header"><button className="icon-button" onClick={onBack}><ArrowLeft /></button><Brand compact /></header><span className="eyebrow">Preferences</span><h1>Make it yours</h1><section className="settings-card"><label><div><strong>Dark mode</strong><span>Gentler studying at night</span></div><button className={`toggle ${user.darkMode ? 'on' : ''}`} onClick={() => setUser(u => ({ ...u, darkMode: !u.darkMode }))}>{user.darkMode ? <Moon /> : <Sun />}</button></label><label><div><strong>Regional questions</strong><span>Used in exam simulations</span></div><select value={user.selectedState} onChange={e => setUser(u => ({ ...u, selectedState: e.target.value }))}>{['Bayern','Baden-Württemberg','Berlin','Brandenburg','Bremen','Hamburg','Hessen','Mecklenburg-Vorpommern','Niedersachsen','Nordrhein-Westfalen','Rheinland-Pfalz','Saarland','Sachsen','Sachsen-Anhalt','Schleswig-Holstein','Thüringen'].map(state => <option key={state}>{state}</option>)}</select></label></section><section className="install-card"><Award /><div><strong>Install on iPhone</strong><p>In Safari, tap Share, then “Add to Home Screen” for the full offline app experience.</p></div></section><button className="danger-link" onClick={() => { if (confirm('Reset all learning progress?')) setUser({ ...user, progress: {}, streak: 0, studiedDates: [], difficultWords: [], exams: [] }) }}>Reset learning progress</button></div>
}

function BottomNav({ screen, onNavigate }: { screen: Screen; onNavigate: (s: Screen) => void }) {
  return <nav className="bottom-nav"><button className={screen === 'home' ? 'active' : ''} onClick={() => onNavigate('home')}><Home /><span>Home</span></button><button onClick={() => onNavigate('learn')}><BookOpen /><span>Learn</span></button><button onClick={() => onNavigate('vocabulary')}><Languages /><span>Words</span></button><button onClick={() => onNavigate('exam')}><Trophy /><span>Exam</span></button></nav>
}

export default App
