import { useState, Component } from 'react'
import LandingPage from './components/LandingPage'
import LevelSelector from './components/LevelSelector'
import ControlPanel from './components/ControlPanel'
import PracticeSection from './components/PracticeSection'
import QuizEngine from './components/QuizEngine'
import ConversationPractice from './components/ConversationPractice'
import MockTest from './components/MockTest'
import { useProgress } from './hooks/useProgress'
import { useDailyTarget } from './hooks/useDailyTarget'

export class ErrorBoundary extends Component {
  constructor(props) { super(props); this.state = { error: null, stack: null } }
  static getDerivedStateFromError(error) { return { error } }
  componentDidCatch(error, info) {
    console.error('[VocabPro] Crash:', error?.message, info?.componentStack)
    this.setState({ stack: info?.componentStack ?? null })
  }
  render() {
    if (this.state.error) {
      return (
        <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#08081a', color: 'white', flexDirection: 'column', gap: '20px', padding: '32px', textAlign: 'center' }}>
          <div style={{ fontSize: '56px' }}>🌟</div>
          <div style={{ fontSize: '22px', fontWeight: 'bold', letterSpacing: '-0.01em' }}>
            Oops! Something went on a little break.
          </div>
          <div style={{ color: 'rgba(255,255,255,0.55)', fontSize: '15px', maxWidth: '340px', lineHeight: '1.7', fontFamily: 'sans-serif' }}>
            Don&apos;t worry — just tap the button below and you&apos;ll be back to practising in seconds! 😊
          </div>
          <button
            onClick={() => window.location.reload()}
            style={{ marginTop: '4px', padding: '14px 40px', borderRadius: '16px', background: 'linear-gradient(135deg,#6366f1,#8b5cf6)', color: 'white', border: 'none', cursor: 'pointer', fontSize: '16px', fontWeight: 'bold', boxShadow: '0 0 32px rgba(99,102,241,0.4)' }}
          >
            ↺ Take me back!
          </button>
        </div>
      )
    }
    return this.props.children
  }
}

// views: 'landing' | 'levels' | 'controls' | 'practice' | 'quiz' | 'conversation' | 'mocktest'

export default function App() {
  const [view, setView] = useState('landing')
  const [selectedLevel, setSelectedLevel] = useState('beginners')
  const [sessionConfig, setSessionConfig] = useState(null)

  const { progress, markWordCompleted, recordQuizScore, resetLevel } = useProgress()
  const { markStudied } = useDailyTarget('advanced')

  function handleStart() {
    localStorage.setItem('vocab-visited', '1')
    setView('levels')
  }

  function handleLevelSelect(levelId) {
    setSelectedLevel(levelId)
    setView('controls')
  }

  function handleStartPractice(config) {
    // Keep selectedLevel in sync so ControlPanel restores the right level on back
    const levelKeyMap = { easy: 'beginners', medium: 'intermediate', hard: 'advanced' }
    const normalized = levelKeyMap[config.level] ?? config.level
    if (normalized && ['beginners', 'intermediate', 'advanced'].includes(normalized)) {
      setSelectedLevel(normalized)
    }
    setSessionConfig(config)
    if (config.mode === 'quiz') setView('quiz')
    else if (config.mode === 'conversation') setView('conversation')
    else if (config.mode === 'mocktest') setView('mocktest')
    else setView('practice')
  }

  function handleSessionEnd({ level, format, score, total, wordsAnswered }) {
    if (format) recordQuizScore(level, format, score, total)
    if (wordsAnswered) {
      wordsAnswered.forEach(w => markWordCompleted(level, w))
      if (level === 'advanced') markStudied(wordsAnswered)
    }
  }

  // Landing page is full-width, no container constraints
  if (view === 'landing') {
    return <LandingPage onStart={handleStart} />
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-sky-50 to-white">
      <div className="max-w-2xl mx-auto px-4 py-6">
        {view === 'levels' && (
          <LevelSelector
            progress={progress}
            initialLevel={selectedLevel}
            onSelect={handleLevelSelect}
            onResetLevel={resetLevel}
          />
        )}

        {view === 'controls' && (
          <ControlPanel
            defaultLevel={selectedLevel}
            onStartPractice={handleStartPractice}
            onBack={() => setView('levels')}
            onLevelChange={setSelectedLevel}
          />
        )}

        {view === 'practice' && (
          <PracticeSection
            config={sessionConfig}
            onBack={() => setView('controls')}
            onSessionEnd={handleSessionEnd}
          />
        )}

        {view === 'quiz' && (
          <QuizEngine
            config={sessionConfig}
            onBack={() => setView('controls')}
            onSessionEnd={handleSessionEnd}
          />
        )}

        {view === 'conversation' && (
          <ConversationPractice
            config={sessionConfig}
            onBack={() => setView('controls')}
          />
        )}

        {view === 'mocktest' && (
          <MockTest
            onBack={() => setView('controls')}
            onComplete={({ wordsAnswered }) => {
              markStudied(wordsAnswered ?? [])
              markWordCompleted && wordsAnswered?.forEach(w => markWordCompleted('advanced', w))
            }}
          />
        )}
      </div>
    </div>
  )
}
