import type { Attempt, Evaluation, Lesson } from './types'

/** A child has "got it" at 60% — used for every branch decision. */
export const PASS = 0.6

export const pct = (a: Pick<Attempt, 'correct' | 'total'>) => (a.total ? a.correct / a.total : 0)

export type Step = 'learn' | 'practice' | 'remedial' | 'exam' | 'next'

/**
 * The user-flow branching for one student and one lesson:
 *   teacher marks Understood     → Practice → Exam → next step
 *   teacher marks Not understood → Remedial → Practice → Exam → next step
 * Personalised next step: weak → back to remedial; strong → next lesson.
 */
export function nextStep(ev: Evaluation | undefined, attempts: Attempt[]): Step {
  if (!ev) return 'learn'
  const last = attempts
    .filter((a) => a.kind !== 'quiz' && a.at >= ev.at)
    .sort((a, b) => b.at - a.at)[0]
  if (!last) return ev.understood ? 'practice' : 'remedial'
  const passed = pct(last) >= PASS
  if (last.kind === 'remedial') return passed ? 'practice' : 'remedial'
  if (last.kind === 'practice') return passed ? 'exam' : 'remedial'
  return passed ? 'next' : 'remedial'
}

export const STEP_LABEL: Record<Step, { hi: string; en: string; emoji: string }> = {
  learn: { hi: 'पाठ सीखना है', en: 'Learning the lesson', emoji: '📖' },
  practice: { hi: 'अभ्यास', en: 'Practice', emoji: '✏️' },
  remedial: { hi: 'दोबारा समझाना', en: 'Remedial support', emoji: '🤝' },
  exam: { hi: 'जाँच', en: 'Check', emoji: '📝' },
  next: { hi: 'अगला पाठ', en: 'Next lesson', emoji: '⏭️' },
}

/** Stars are only ever earned, never lost: one per correct answer. */
export const stars = (attempts: Attempt[]) => attempts.reduce((n, a) => n + a.correct, 0)

/** Best score per lesson (0..1), from exams and class quizzes. */
export function mastery(attempts: Attempt[]): Map<string, number> {
  const best = new Map<string, number>()
  for (const a of attempts) {
    if (a.kind !== 'exam' && a.kind !== 'quiz') continue
    best.set(a.lessonId, Math.max(best.get(a.lessonId) ?? 0, pct(a)))
  }
  return best
}

/** Lessons for a class, in teaching order; the one after `lessonId` is "next". */
export function lessonAfter(lessons: Lesson[], lessonId: string): Lesson | undefined {
  const i = lessons.findIndex((l) => l.id === lessonId)
  return i >= 0 ? lessons[i + 1] : undefined
}
