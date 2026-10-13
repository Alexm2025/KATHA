# KATHA: 3-minute judge walkthrough

Open the site on a laptop or tablet in landscape and press **डेमो देखें / Try the Demo**.
The screen splits: teacher's tablet on the left, a student's tablet (बिरसा, Class 1, Santali)
on the right. The bar at the top names each step; **आगे / Next** moves both tablets to the
right screens.

Before the judges arrive: open the demo once while online so everything is cached, and allow
the microphone when asked. If you want sound at step 3, do that step once beforehand so the
recording already exists.

| Time | Step | Do | Say |
|---|---|---|---|
| 0:00 | Landing | Show the hero, then press **Try the Demo**. | "A Santali-speaking child in Class 1 hears lessons in Hindi. Her teacher doesn't speak Santali. KATHA sits between them." |
| 0:20 | 1 · Lesson | Point at Class 1, Santali, Ganit, "गिनती 1 से 10". Press **Next**. | "The teacher picks class, mother tongue and lesson. It remembers the choice." |
| 0:35 | 2 · Teach | Tap **एक**, then **दो** on the left. | "She speaks Hindi, or taps a line when there's no internet. The child sees it in Ol Chiki. The badge shows the delay: milliseconds, against a 3-second target." |
| 1:00 | 3 · Honest translation | Tap **कितने आम हैं?**. Then **अनुवाद सुधारें**, type a translation, record it, save. | "We have no verified translation for this sentence, so KATHA shows the Hindi and says so. It never invents tribal text. A teacher or a community helper adds the translation and records it. It's live on the child's tablet immediately, marked community-verified, and saved for model training." |
| 1:35 | 4–5 · Doubt | **Next**. On the right tap the **❓** card, or hold the mic. **Next**. On the left tap a quick reply and **भेजें**. | "The child asks in her own language, with no typing. The teacher answers in Hindi and it comes back in Santali." |
| 2:00 | 6 · Quiz | **Next**. Left: **कक्षा के लिए क्विज़ शुरू करें**. Answer two or three on the right. | "One tap starts a picture quiz on every tablet. No reading needed, and wrong answers just get another try." |
| 2:20 | 7 · Branch | **Next**. Left: mark बिरसा **नहीं समझा**, then **समझ गया**. Watch the right-hand home tile change. | "If she didn't understand, she gets a simpler re-explanation with audio. If she did, she goes to practice, then a check, then the next lesson." |
| 2:35 | 8 · Worksheet | **Next**. Left: switch language to **हो**, press **PDF डाउनलोड करें**. | "Bilingual worksheets in Ol Chiki, Warang Citi or Devanagari, printable for classrooms with one tablet." |
| 2:50 | 9 · Progress | **Next**. | "Progress against NIPUN Bharat's foundational goals for the teacher. Stars for the child, never a score that shames." |

## If they ask

- **Does it really work offline?** Turn on aeroplane mode and reload. Tap a line; the student
  side still updates and recorded audio still plays. Speaking Hindi needs the internet (Chrome's
  recogniser); tapping does not.
- **Where do translations come from?** Today, a local glossary plus teacher corrections. Only
  "Johar" and the numbers 1–10 are filled in, as unverified drafts. Show Admin → भाषा पैक
  (PIN 0000) for the counts per language.
- **Why not just use IndicTrans2?** It covers Santali but not Ho or Mundari. For those two the
  plan is glossary + teacher corrections + LLM-assisted drafts, verified by native speakers.
  The corrections export on the same screen is that training set.
- **Two real devices?** Use the "teacher tab" and "student tab" links in the demo bar to open
  two tabs. Across separate tablets, doubts, results and corrections already sync through the
  server; relaying the live utterances between devices is the next piece to build.
- **What is sample data?** The progress charts include two lessons of seeded history, labelled
  on screen.

## Reset between runs

Admin (PIN 0000) → सिस्टम → **रीसेट करें** clears the tablet back to the seed data.
