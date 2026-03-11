import { useState } from 'react'
import LandingPage from './components/LandingPage'
import LevelSelector from './components/LevelSelector'
import ControlPanel from './components/ControlPanel'
import PracticeSection from './components/PracticeSection'
import QuizEngine from './components/QuizEngine'
import ConversationPractice from './components/ConversationPractice'
import MockTest from './components/MockTest'
import { useProgress } from './hooks/useProgress'
import { useDailyTarget } from './hooks/useDailyTarget'

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
