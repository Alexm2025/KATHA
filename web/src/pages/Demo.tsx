import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Btn, Chip, LangToggle, Logo } from '@/components/ui'
import { setMeta } from '@/lib/db'
import { BASE, usePrefs, useSessions, useT } from '@/lib/store'

const DEMO = { classId: 'c1', lessonId: 'l-numbers', teacherId: 't1', studentId: 's1' }

interface Step {
  hi: string
  en: string
  doHi: string
  doEn: string
  teacher: string
  student: string
}

// The judges' walkthrough follows the user flow end to end. Each step puts both
// "devices" on the right screen and says what to do there.
const STEPS: Step[] = [
  {
    hi: 'शिक्षक पाठ चुनता है', en: 'Teacher selects a lesson',
    doHi: 'बाईं ओर: कक्षा 1, संथाली, गणित और "गिनती 1 से 10" पहले से चुने हैं। आप बदल सकते हैं।',
    doEn: 'Left: Class 1, Santali, Ganit and "Numbers 1 to 10" are preselected. Change them if you like.',
    teacher: '/teacher', student: '/student',
  },
  {
    hi: 'शिक्षक बोलता या वाक्य छूता है', en: 'Teacher speaks or taps a line',
    doHi: 'बाईं ओर "एक" या "दो" छुएँ। देरी का बैज देखें (लक्ष्य 3000 ms से कम)।',
    doEn: 'Left: tap "एक" or "दो". Watch the latency badge (target: under 3000 ms).',
    teacher: '/teacher/live', student: '/student/listen',
  },
  {
    hi: 'बच्चे को मातृभाषा में दिखता है', en: 'The child sees it in their mother tongue',
    doHi: 'दाईं ओर ओल चिकी में पाठ दिखता है। "कितने आम हैं?" छुएँ — अनुवाद नहीं है, इसलिए कुछ गढ़ा नहीं जाता। "अनुवाद सुधारें" से जोड़ें और आवाज़ रिकॉर्ड करें।',
    doEn: 'Right: the text appears in Ol Chiki. Tap "कितने आम हैं?" — there is no translation, so nothing is invented. Use "Correct this translation" to add one and record audio.',
    teacher: '/teacher/live', student: '/student/listen',
  },
  {
    hi: 'बच्चा सवाल पूछता है', en: 'The child asks a doubt',
    doHi: 'दाईं ओर माइक दबाकर बोलें, या कोई सवाल-कार्ड छुएँ।',
    doEn: 'Right: hold the mic and speak, or tap a doubt card.',
    teacher: '/teacher/doubts', student: '/student/ask',
  },
  {
    hi: 'शिक्षक जवाब देता है', en: 'The teacher answers',
    doHi: 'बाईं ओर हिंदी में जवाब भेजें — दाईं ओर बच्चे को जवाब मिलता है।',
    doEn: 'Left: send a reply in Hindi — it arrives on the right for the child.',
    teacher: '/teacher/doubts', student: '/student/ask',
  },
  {
    hi: 'झटपट क्विज़', en: 'Quick quiz',
    doHi: 'बाईं ओर "कक्षा के लिए क्विज़ शुरू करें" दबाएँ — दाईं ओर क्विज़ अपने-आप खुलता है। उसे पूरा करें।',
    doEn: 'Left: press "Start quiz for the class" — the quiz opens by itself on the right. Finish it.',
    teacher: '/teacher/evaluate', student: '/student',
  },
  {
    hi: 'समझा / नहीं समझा', en: 'Understood / not understood',
    doHi: 'बाईं ओर बिरसा के लिए "नहीं समझा" चुनें — दाईं ओर होम पर "फिर से सीखो" आता है। "समझ गया" चुनें — "अभ्यास" आता है।',
    doEn: 'Left: mark बिरसा "Not understood" — the right-hand home shows remedial. Mark "Understood" — it shows practice.',
    teacher: '/teacher/evaluate', student: '/student',
  },
  {
    hi: 'वर्कशीट PDF', en: 'Worksheet PDF',
    doHi: 'बाईं ओर द्विभाषी वर्कशीट की झलक देखें और "PDF डाउनलोड करें" दबाएँ।',
    doEn: 'Left: preview the bilingual worksheet and press "Download PDF".',
    teacher: '/teacher/materials', student: '/student/practice',
  },
  {
    hi: 'प्रगति रिपोर्ट', en: 'Progress report',
    doHi: 'बाईं ओर कक्षा की निपुण भारत FLN प्रगति; दाईं ओर बच्चे के तारे।',
    doEn: "Left: the class's NIPUN Bharat FLN progress; right: the child's stars.",
    teacher: '/teacher/reports', student: '/student/stars',
  },
]

/** Split-screen demo: teacher device on the left, student device on the right. */
export default function Demo() {
  const t = useT()
  const [ready, setReady] = useState(false)
  const [i, setI] = useState(0)
  const step = STEPS[i]

  useEffect(() => {
    const s = useSessions.getState()
    s.login({ userId: DEMO.teacherId, role: 'teacher' })
    s.login({ userId: DEMO.studentId, role: 'student' })
    s.setDemo(true)
    usePrefs.getState().setTeach({ classId: DEMO.classId, subject: 'ganit', lessonId: DEMO.lessonId })
    void setMeta(`current:${DEMO.classId}`, DEMO.lessonId).then(() => setReady(true))
  }, [])

  if (!ready) return null

  return (
    <div className="flex h-dvh flex-col">
      <header className="border-b border-cream-deep bg-white px-3 py-2">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
          <Link to="/" aria-label="KATHA home"><Logo small /></Link>
          <Chip tone="warn">{t('डेमो', 'Demo')} · {i + 1}/{STEPS.length}</Chip>
          <strong className="text-lg">{t(step.hi, step.en)}</strong>
          <span className="ml-auto flex items-center gap-2">
            <Btn variant="soft" disabled={i === 0} onClick={() => setI(i - 1)}>← {t('पीछे', 'Back')}</Btn>
            <Btn disabled={i === STEPS.length - 1} onClick={() => setI(i + 1)}>{t('आगे', 'Next')} →</Btn>
            <LangToggle />
          </span>
        </div>
        <p className="mt-1 text-ink" aria-live="polite">👉 {t(step.doHi, step.doEn)}</p>
        <p className="mt-1 text-sm text-ink-soft">
          {t('दो असली टैब में आज़माएँ', 'Try it in two real tabs')}:{' '}
          <a className="font-bold text-terra-dark underline" href={`${BASE}/teacher/live`} target="_blank" rel="noreferrer">{t('शिक्षक टैब', 'teacher tab')}</a>
          {' · '}
          <a className="font-bold text-terra-dark underline" href={`${BASE}/student/listen`} target="_blank" rel="noreferrer">{t('विद्यार्थी टैब', 'student tab')}</a>
        </p>
      </header>
      <div className="grid min-h-0 flex-1 grid-rows-2 gap-1 bg-cream-deep landscape:grid-cols-2 landscape:grid-rows-1">
        {(['teacher', 'student'] as const).map((who) => (
          <section key={who} className="flex min-h-0 flex-col bg-cream" aria-label={who === 'teacher' ? t('शिक्षक का टैबलेट', "Teacher's tablet") : t('विद्यार्थी का टैबलेट', "Student's tablet")}>
            <h2 className={`px-3 py-1 text-sm font-bold text-white ${who === 'teacher' ? 'bg-terra' : 'bg-leaf'}`}>
              {who === 'teacher' ? `👩‍🏫 ${t('शिक्षक का टैबलेट', "Teacher's tablet")}` : `🧒 ${t('विद्यार्थी का टैबलेट', "Student's tablet")}`}
            </h2>
            <iframe
              // A new key per step reloads the frame on the right screen for that step.
              key={`${who}-${step[who]}`}
              src={BASE + step[who]}
              title={who}
              allow="microphone"
              className="min-h-0 w-full flex-1 border-0"
            />
          </section>
        ))}
      </div>
    </div>
  )
}
