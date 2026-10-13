import { Fragment, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { LangToggle, Logo } from '@/components/ui'
import { useT } from '@/lib/store'

const linkBtn =
  'inline-flex min-h-14 items-center justify-center gap-2 rounded-2xl px-6 text-lg font-bold transition-colors'

function Section({ id, title, children, tint }: { id: string; title: string; children: ReactNode; tint?: boolean }) {
  return (
    <section id={id} className={tint ? 'bg-cream-deep/50' : undefined}>
      <div className="mx-auto max-w-5xl px-4 py-12">
        <h2 className="mb-6 text-3xl font-bold text-terra-dark">{title}</h2>
        {children}
      </div>
    </section>
  )
}

const PIPELINE = [
  { icon: '🎙', hi: 'शिक्षक की आवाज़', en: 'Teacher speaks Hindi' },
  { icon: '📝', hi: 'ASR', en: 'ASR' },
  { icon: '🔁', hi: 'अनुवाद', en: 'Translation' },
  { icon: '📚', hi: 'पाठ्यक्रम इंजन', en: 'Curriculum engine' },
  { icon: '🔊', hi: 'TTS', en: 'TTS' },
  { icon: '🧒', hi: 'विद्यार्थी', en: 'Student' },
]

const FEATURES = [
  { icon: '⚡', hi: 'लाइव कक्षा अनुवाद', en: 'Live classroom translation', dhi: 'हिंदी बोलें, 3 सेकंड से कम में मातृभाषा का पाठ और आवाज़।', den: 'Speak Hindi; mother-tongue text and audio in under 3 seconds.' },
  { icon: '🙋', hi: 'मातृभाषा में सवाल', en: 'Doubts in the mother tongue', dhi: 'बच्चा अपनी भाषा में पूछता है, शिक्षक को हिंदी में मिलता है।', den: 'A child asks in their language; the teacher receives it in Hindi.' },
  { icon: '🧾', hi: 'द्विभाषी वर्कशीट', en: 'Bilingual worksheets', dhi: 'हिंदी + मातृभाषा वर्कशीट, फ़्लैशकार्ड और क्विज़ — PDF में।', den: 'Hindi + mother-tongue worksheets, flashcards and quizzes, as PDF.' },
  { icon: '📴', hi: 'ऑफ़लाइन चलता है', en: 'Works offline', dhi: 'एक बार सिंक के बाद बिना इंटरनेट, 2 GB टैबलेट पर।', den: 'After one sync it runs with no internet, on a 2 GB tablet.' },
  { icon: '🤝', hi: 'समुदाय से सीखता है', en: 'Learns from the community', dhi: 'शिक्षक के सुधार तुरंत लागू होते हैं और मॉडल को बेहतर बनाते हैं।', den: 'Teacher corrections apply at once and feed model retraining.' },
  { icon: '📊', hi: 'निपुण भारत प्रगति', en: 'NIPUN Bharat progress', dhi: 'हर बच्चे की FLN प्रगति, बिना शर्मिंदा करने वाले अंकों के।', den: 'FLN progress for every child, without scores that shame.' },
]

const REFERENCES = [
  { name: 'National Education Policy 2020', org: 'Ministry of Education', url: 'https://www.education.gov.in/' },
  { name: 'PALASH multilingual education programme', org: 'Language and Learning Foundation', url: 'https://languageandlearningfoundation.org/' },
  { name: 'IndicTrans2, IndicWav2Vec and Indic TTS', org: 'AI4Bharat, IIT Madras', url: 'https://ai4bharat.iitm.ac.in/' },
  { name: 'DIKSHA', org: 'Ministry of Education', url: 'https://diksha.gov.in/' },
  { name: 'NISHTHA', org: 'NCERT · CIET', url: 'https://ciet.ncert.gov.in/nishtha' },
]
const REFERENCES_UNLINKED = [
  'Jharkhand Language Mapping Report 2025',
  'Tata Trusts — multilingual education landscaping',
]

const TEAM = ['Alex Mathew', 'Anannya Khadakkar', 'Nihal Nainan', 'Philson Philip', 'Shrea Shetty', 'Tanishq Kabir']

export default function Landing() {
  const t = useT()
  return (
    <div>
      <header className="mx-auto flex max-w-5xl items-center justify-between gap-3 px-4 py-3">
        <Logo />
        <span className="flex items-center gap-2">
          <LangToggle />
          <Link to="/login" className="inline-flex min-h-12 items-center rounded-xl px-4 font-bold text-terra-dark hover:bg-cream-deep">
            {t('लॉगिन', 'Login')}
          </Link>
        </span>
      </header>

      <main>
        <section className="sohrai-dots">
          <div className="mx-auto max-w-5xl px-4 pb-14 pt-10 text-center">
            <p className="mb-3 font-bold text-leaf">
              Smart India Hackathon 2026 · SIH26042 · Smart Education
            </p>
            <h1 className="text-5xl font-bold leading-tight text-terra-dark sm:text-6xl">
              KATHA — <span className="text-leaf-dark">समझो, सीखो</span>
            </h1>
            <p className="mx-auto mt-5 max-w-3xl text-xl text-ink">
              {t(
                'झारखंड के हो, मुंडारी और संथाली भाषी बच्चे उस भाषा में पढ़ाई शुरू करते हैं जो वे समझते नहीं। KATHA शिक्षक की हिंदी को बच्चे की मातृभाषा में बदलता है — पाठ और आवाज़ दोनों में, बिना इंटरनेट के भी।',
                "Ho, Mundari and Santali-speaking children in Jharkhand start school in a language they don't understand. KATHA turns the teacher's Hindi into the child's mother tongue — text and audio, even offline.",
              )}
            </p>
            <div className="mt-8 flex flex-wrap justify-center gap-3">
              <Link to="/demo" className={`${linkBtn} bg-terra text-white hover:bg-terra-dark`}>
                ▶ {t('डेमो देखें', 'Try the Demo')}
              </Link>
              <Link to="/login" className={`${linkBtn} border-2 border-leaf bg-white text-leaf-dark hover:bg-leaf-soft`}>
                {t('लॉगिन', 'Login')}
              </Link>
            </div>
          </div>
          <div className="sohrai-band" aria-hidden />
        </section>

        <Section id="problem" title={t('समस्या', 'The Problem')}>
          <div className="grid gap-4 sm:grid-cols-3">
            {[
              { icon: '🗣', hi: 'घर की भाषा अलग, स्कूल की अलग', en: 'One language at home, another at school', dhi: 'कक्षा 1 का बच्चा हो, मुंडारी या संथाली बोलता है, पर पढ़ाई हिंदी में शुरू होती है।', den: 'A Class 1 child speaks Ho, Mundari or Santali, but lessons begin in Hindi.' },
              { icon: '👩‍🏫', hi: 'शिक्षक मातृभाषा नहीं जानते', en: "Teachers don't speak the mother tongue", dhi: 'अधिकतर शिक्षक हिंदी माध्यम के हैं और बच्चे की भाषा नहीं बोलते।', den: "Most teachers are Hindi-medium and don't speak the child's language." },
              { icon: '📜', hi: 'NEP 2020 का लक्ष्य', en: 'What NEP 2020 asks for', dhi: 'कम से कम कक्षा 5 तक पढ़ाई का माध्यम घर की भाषा हो।', den: 'The medium of instruction should be the home language until at least Grade 5.' },
            ].map((c) => (
              <div key={c.en} className="rounded-2xl border border-cream-deep bg-white p-5">
                <div className="text-4xl" aria-hidden>{c.icon}</div>
                <h3 className="mt-2 text-xl font-bold">{t(c.hi, c.en)}</h3>
                <p className="mt-1 text-ink-soft">{t(c.dhi, c.den)}</p>
              </div>
            ))}
          </div>
        </Section>

        <Section id="how" title={t('यह कैसे काम करता है', 'How It Works')} tint>
          <ol className="flex flex-wrap items-stretch justify-center gap-2" aria-label="Pipeline">
            {PIPELINE.map((p, i) => (
              <Fragment key={p.en}>
                <li className="flex w-32 flex-col items-center justify-center rounded-2xl border-2 border-terra/30 bg-white p-3 text-center">
                  <span className="text-3xl" aria-hidden>{p.icon}</span>
                  <span className="mt-1 font-bold">{t(p.hi, p.en)}</span>
                </li>
                {i < PIPELINE.length - 1 && (
                  <li aria-hidden className="flex items-center text-2xl font-bold text-saffron">→</li>
                )}
              </Fragment>
            ))}
          </ol>
          <p className="mx-auto mt-6 max-w-3xl text-center text-ink-soft">
            {t(
              'हर चरण एक बदलने योग्य "प्रोवाइडर" है। आज: ऑफ़लाइन शब्दकोश + पहले से रिकॉर्ड की गई आवाज़। आगे: IndicTrans2 (संथाली) और हो/मुंडारी के लिए शिक्षक-सुधार डेटा से बने मॉडल।',
              'Every stage is a swappable provider. Today: an offline glossary with pre-recorded audio. Next: IndicTrans2 for Santali, and models for Ho and Mundari built from teacher-correction data.',
            )}
          </p>
        </Section>

        <Section id="features" title={t('मुख्य विशेषताएँ', 'Key Features')}>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {FEATURES.map((f) => (
              <div key={f.en} className="rounded-2xl border border-cream-deep bg-white p-5">
                <div className="text-3xl" aria-hidden>{f.icon}</div>
                <h3 className="mt-2 text-lg font-bold">{t(f.hi, f.en)}</h3>
                <p className="mt-1 text-ink-soft">{t(f.dhi, f.den)}</p>
              </div>
            ))}
          </div>
        </Section>

        <Section id="impact" title={t('प्रभाव', 'Impact')} tint>
          <ul className="grid gap-3 text-lg sm:grid-cols-2">
            {[
              ['बच्चा पहले दिन से कक्षा को समझता है।', 'Children understand the classroom from day one.'],
              ['शिक्षक को नई भाषा सीखे बिना हर बच्चे तक पहुँच मिलती है।', 'Teachers reach every child without first learning a new language.'],
              ['हर सुधार से हो, मुंडारी और संथाली का खुला भाषा-डेटा बनता है।', 'Every correction builds open language data for Ho, Mundari and Santali.'],
              ['सस्ते टैबलेट और बिना इंटरनेट वाले स्कूलों के लिए बना।', 'Built for cheap tablets and schools with no connectivity.'],
            ].map(([hi, en]) => (
              <li key={en} className="flex gap-3 rounded-2xl bg-white p-4">
                <span aria-hidden className="text-leaf">✔</span>
                {t(hi, en)}
              </li>
            ))}
          </ul>
        </Section>

        <Section id="research" title={t('शोध और संदर्भ', 'Research & References')}>
          <ul className="grid gap-3 sm:grid-cols-2">
            {REFERENCES.map((r) => (
              <li key={r.url}>
                <a
                  href={r.url}
                  target="_blank"
                  rel="noreferrer"
                  className="block rounded-2xl border border-cream-deep bg-white p-4 hover:border-terra"
                >
                  <span className="font-bold text-terra-dark underline">{r.name}</span>
                  <span className="block text-sm text-ink-soft">{r.org}</span>
                </a>
              </li>
            ))}
            {REFERENCES_UNLINKED.map((r) => (
              <li key={r} className="rounded-2xl border border-cream-deep bg-white p-4 font-bold">
                {r}
              </li>
            ))}
          </ul>
        </Section>

        <Section id="team" title={t('टीम', 'Team')} tint>
          <p className="mb-4 text-lg">
            <strong>JustWeMet</strong> · Team ID 119072
          </p>
          <ul className="flex flex-wrap gap-2">
            {TEAM.map((m) => (
              <li key={m} className="rounded-full bg-white px-4 py-2 font-bold">
                {m}
              </li>
            ))}
          </ul>
        </Section>

        <Section id="sih" title={t('SIH विवरण', 'SIH Details')}>
          <dl className="grid gap-x-6 gap-y-3 sm:grid-cols-[auto_1fr]">
            {[
              ['Problem Statement ID', 'SIH26042'],
              ['Title', 'AI-Powered Vernacular Pedagogy and Real-Time Translation Tool for Mother Tongue-Based Primary Education'],
              ['Theme', 'Smart Education'],
              ['Category', 'Software'],
            ].map(([k, v]) => (
              <Fragment key={k}>
                <dt className="font-bold text-ink-soft">{k}</dt>
                <dd>{v}</dd>
              </Fragment>
            ))}
            <dt className="font-bold text-ink-soft">{t('प्रोटोटाइप', 'Earlier prototype')}</dt>
            <dd>
              <a className="text-terra-dark underline" href="https://katha-samajh-seekho.lovable.app" target="_blank" rel="noreferrer">
                katha-samajh-seekho.lovable.app
              </a>
            </dd>
            <dt className="font-bold text-ink-soft">{t('डेमो वीडियो', 'Demo video')}</dt>
            <dd>
              <a className="text-terra-dark underline" href="https://www.youtube.com/watch?v=3uoY6-flY20" target="_blank" rel="noreferrer">
                youtube.com/watch?v=3uoY6-flY20
              </a>
            </dd>
          </dl>
        </Section>
      </main>

      <footer>
        <div className="sohrai-band" aria-hidden />
        <p className="px-4 py-6 text-center text-sm text-ink-soft">
          KATHA · Team JustWeMet · Smart India Hackathon 2026
        </p>
      </footer>
    </div>
  )
}
