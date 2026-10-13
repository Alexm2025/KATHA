// Phase 2+ checks. Starts where smoke.mjs leaves off: teacher on Live Teach (Numbers,
// Santali class), student बिरसा on Listen.
import { mkdirSync, readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

const content = JSON.parse(readFileSync(new URL('../../content/lessons.json', import.meta.url), 'utf8'))
const items = content.lessons.flatMap((l) => l.items)
const SHOTS = new URL('./shots/', import.meta.url)
mkdirSync(SHOTS, { recursive: true })
const shot = (page, name, opts = {}) => page.screenshot({ path: fileURLToPath(new URL(name, SHOTS)), ...opts })

/** Answers every question of an activity correctly, using the prompt's spoken label. */
async function finishActivity(page) {
  for (let guard = 0; guard < 30; guard++) {
    if (await page.getByText('🎉').count()) return true
    const next = page.getByRole('button', { name: 'आगे' })
    if (await next.count()) {
      await next.click()
      continue
    }
    const prompt = page.locator('button[aria-label^="सुनो: "]').first()
    if (!(await prompt.count())) {
      await page.waitForTimeout(200)
      continue
    }
    const hi = (await prompt.getAttribute('aria-label')).replace('सुनो: ', '')
    const item = items.find((i) => i.hi === hi)
    const counting = (await page.getByRole('img', { name: 'गिनो' }).count()) > 0
    const label = counting ? String(item.digit) : (item.en ?? item.hi)
    await page.getByRole('button', { name: label, exact: true }).first().click()
    await page.waitForTimeout(1100)
  }
  return false
}

export async function run({ ctx, teacher, student, check, watch, BASE }) {
  // --- Recorded audio: record a clip, then the student gets sound instead of "pending" ---
  await teacher.getByRole('button', { name: 'दो', exact: false }).first().click()
  await student.getByText('ᱵᱟᱨ').waitFor()
  check('no recording → "audio pending", not a wrong-language voice', await student.getByText('audio pending').isVisible())
  await teacher.getByRole('button', { name: /अनुवाद सुधारें/ }).first().click()
  const dlg = teacher.getByRole('dialog')
  await dlg.getByRole('button', { name: /बोलकर रिकॉर्ड करें/ }).click()
  await teacher.waitForTimeout(1200)
  await dlg.getByRole('button', { name: /रोकें/ }).click()
  await dlg.getByRole('button', { name: /सुनें/ }).waitFor({ timeout: 5000 })
  await dlg.getByRole('button', { name: /सहेजें/ }).click()
  await student.getByRole('button', { name: 'फिर सुनो' }).waitFor({ timeout: 5000 })
  check('recorded clip plays on the student tab', true)

  // --- Doubts: card + voice, teacher replies, student receives -------------------------
  await student.getByRole('link', { name: /घर/ }).first().click()
  await student.getByRole('link', { name: 'सवाल पूछो' }).click()
  await student.getByRole('button', { name: 'फिर से बताइए', exact: true }).click()
  const mic = student.getByRole('button', { name: /दबाकर बोलो/ })
  await mic.dispatchEvent('pointerdown', { pointerId: 1 })
  await student.waitForTimeout(1300)
  await mic.dispatchEvent('pointerup', { pointerId: 1 })
  await teacher.getByRole('link', { name: /सवाल/ }).click()
  await teacher.getByText('फिर से बताइए').first().waitFor()
  check('card doubt reaches the teacher with its Hindi meaning', true)
  await teacher.getByRole('button', { name: /बच्चे की आवाज़ सुनें/ }).first().waitFor({ timeout: 5000 })
  check('voice doubt reaches the teacher as a recording', true)
  const cardDoubt = teacher.locator('div.rounded-2xl', { hasText: 'सवाल-कार्ड से' }).first()
  await cardDoubt.getByRole('button', { name: 'फिर से सुनो।' }).click()
  await cardDoubt.getByRole('button', { name: 'भेजें' }).click()
  await student.getByText('फिर से सुनो।').waitFor({ timeout: 5000 })
  check('teacher reply reaches the student', true)

  // --- Quick quiz opens on the student tablet -------------------------------------------
  await teacher.getByRole('link', { name: /मूल्यांकन/ }).click()
  await teacher.getByRole('button', { name: /क्विज़ शुरू करें/ }).click()
  await student.waitForURL(/mode=quiz/, { timeout: 5000 })
  check('quiz launches on the student tablet', true)
  check('student completes the picture quiz', await finishActivity(student))
  await teacher.getByText('5/5').first().waitFor({ timeout: 5000 })
  check('quiz result reaches the teacher', true)

  // --- Understood / not-understood branching -------------------------------------------
  const row = teacher.locator('li', { hasText: 'बिरसा' })
  await row.getByRole('button', { name: /नहीं समझा/ }).click()
  await student.getByRole('link', { name: /घर/ }).first().click()
  await student.getByRole('link', { name: /फिर से सीखो/ }).waitFor({ timeout: 5000 })
  check('not understood → remedial', true)
  await row.getByRole('button', { name: /समझ गया/ }).click()
  await student.getByRole('link', { name: /अभ्यास करो/ }).waitFor({ timeout: 5000 })
  check('understood → practice', true)
  await student.getByRole('link', { name: /अभ्यास करो/ }).click()
  check('student completes practice (incl. matching)', await finishPractice(student))
  await student.getByRole('link', { name: /दिखाओ क्या सीखा/ }).click()
  check('student completes the exam', await finishActivity(student))
  await student.getByRole('link', { name: /⏭️/ }).waitFor({ timeout: 5000 })
  check('strong result → next lesson offered', true)
  await shot(student, 'student-result.png')

  // --- Worksheet: preview and PDF in all three scripts ---------------------------------
  await teacher.getByRole('link', { name: /वर्कशीट/ }).click()
  for (const [name, file] of [['संथाली', 'sat'], ['हो', 'hoc'], ['मुंडारी', 'unr']]) {
    await teacher.getByRole('group', { name: 'भाषा' }).getByRole('button', { name, exact: true }).click()
    await teacher.waitForTimeout(700)
    const img = teacher.getByRole('img', { name: /वर्कशीट पृष्ठ 1/ })
    await img.waitFor()
    await shot(img, `worksheet-${file}.png`)
    const [dl] = await Promise.all([teacher.waitForEvent('download'), teacher.getByRole('button', { name: /PDF डाउनलोड/ }).click()])
    const bytes = readFileSync(await dl.path())
    check(`worksheet PDF (${file})`, bytes.subarray(0, 5).toString() === '%PDF-' && bytes.length > 50_000, `${Math.round(bytes.length / 1024)} KB`)
  }

  // --- Reports ---------------------------------------------------------------------------
  await teacher.getByRole('link', { name: /प्रगति/ }).click()
  await teacher.locator('svg.recharts-surface').first().waitFor({ timeout: 10000 })
  check('teacher progress report renders charts', true)
  await teacher.getByRole('button', { name: /विवरण/ }).first().click()
  await teacher.getByLabel('अभिभावक').waitFor({ timeout: 5000 })
  check('student record decrypts after PIN login', (await teacher.getByLabel('अभिभावक').inputValue()).includes('बिरसा'))
  await shot(teacher, 'teacher-reports.png', { fullPage: true })

  // --- Offline: the service worker serves the app and Live Teach still works ------------
  await teacher.getByRole('link', { name: /लाइव पढ़ाएँ/ }).click()
  await student.getByRole('link', { name: /घर/ }).first().click()
  await teacher.evaluate(() => navigator.serviceWorker.ready)
  await ctx.setOffline(true)
  await teacher.reload()
  await student.reload()
  await student.getByRole('link', { name: 'शिक्षक को सुनो' }).click()
  await teacher.getByRole('button', { name: 'तीन', exact: false }).first().click()
  await student.getByText('ᱯᱮ').waitFor({ timeout: 5000 })
  check('OFFLINE: reload, tap a line, student sees tribal text', true)
  await teacher.getByRole('button', { name: 'दो', exact: false }).first().click()
  await student.getByRole('button', { name: 'फिर सुनो' }).waitFor({ timeout: 5000 })
  check('OFFLINE: recorded audio plays on the student tab', true)
  check('OFFLINE: indicator shows offline', await teacher.getByText('ऑफ़लाइन').first().isVisible())
  await shot(teacher, 'teacher-live.png')
  await shot(student, 'student-listen.png')
  await ctx.setOffline(false)

  // --- Admin -------------------------------------------------------------------------------
  const admin = await ctx.newPage()
  watch(admin, 'admin')
  await admin.goto(`${BASE}/login`)
  await admin.getByRole('button', { name: 'एडमिन' }).click()
  await admin.getByRole('button', { name: 'प्रधानाध्यापक' }).click()
  for (const d of '0000') await admin.getByRole('button', { name: d, exact: true }).click()
  await admin.waitForURL('**/admin')
  await admin.getByRole('button', { name: /अभी सिंक करें/ }).click()
  await admin.getByText(/भेजे/).waitFor({ timeout: 8000 })
  check('admin: sync queue pushes to the (mock) server', true)
  await admin.getByRole('link', { name: /भाषा पैक/ }).click()
  await admin.getByText(/IndicTrans2 में नहीं है/).first().waitFor()
  check('admin: language packs state Ho/Mundari are not covered by IndicTrans2', true)
  const [csv] = await Promise.all([admin.waitForEvent('download'), admin.getByRole('button', { name: '⬇ CSV', exact: true }).click()])
  const csvText = readFileSync(await csv.path(), 'utf8')
  check('admin: corrections export as CSV', csvText.includes('TEST') && csvText.includes('author'))
  await shot(admin, 'admin-packs.png', { fullPage: true })
  for (const name of [/उपयोगकर्ता/, /कक्षाएँ/, /पाठ सामग्री/, /रिपोर्ट/]) {
    await admin.getByRole('link', { name }).click()
    await admin.locator('h1').waitFor()
  }
  await admin.locator('svg.recharts-surface').first().waitFor({ timeout: 10000 })
  check('admin: users, classrooms, content and reports screens open', true)
  await admin.close()

  // --- Demo mode -------------------------------------------------------------------------------
  const fresh = await ctx.browser().newContext({ viewport: { width: 1280, height: 800 } })
  const demo = await fresh.newPage()
  watch(demo, 'demo')
  await demo.goto(BASE)
  await demo.getByRole('link', { name: /डेमो देखें/ }).click()
  await demo.frameLocator('iframe[title="teacher"]').getByText('सुनीता मैम').waitFor({ timeout: 15000 })
  await demo.frameLocator('iframe[title="student"]').getByText('बिरसा').waitFor({ timeout: 15000 })
  await demo.getByRole('button', { name: /आगे/ }).click()
  await demo.frameLocator('iframe[title="teacher"]').getByRole('button', { name: 'एक', exact: false }).first().click()
  await demo.frameLocator('iframe[title="student"]').getByText('ᱢᱤᱫ').waitFor({ timeout: 8000 })
  check('demo: no login, split screen, teacher → student works', true)
  await shot(demo, 'demo-split.png')
  await demo.goto(BASE)
  await shot(demo, 'landing.png')

  // --- Installable PWA: manifest, icons and a controlling service worker -----------------------
  const pwa = await demo.evaluate(async () => {
    const href = document.querySelector('link[rel=manifest]')?.getAttribute('href')
    const manifest = href ? await (await fetch(href)).json() : null
    const icons = manifest ? await Promise.all(manifest.icons.map(async (i) => (await fetch('/' + i.src)).ok)) : []
    await navigator.serviceWorker.ready
    return { name: manifest?.name, display: manifest?.display, sizes: manifest?.icons.map((i) => i.sizes), icons, sw: !!(await navigator.serviceWorker.getRegistration())?.active }
  })
  check('PWA: manifest, 192/512 icons and active service worker', pwa.display === 'standalone' && pwa.sizes.includes('192x192') && pwa.sizes.includes('512x512') && pwa.icons.every(Boolean) && pwa.sw, JSON.stringify(pwa.sizes))
  await fresh.close()
}

/** Practice ends with a matching round: pair each picture with its word. */
async function finishPractice(page) {
  for (let guard = 0; guard < 30; guard++) {
    if (await page.getByText('🎉').count()) return true
    const says = page.locator('button[aria-label^="सुनो: "]')
    if ((await says.count()) === 3) {
      // Matching round: word buttons sit beside their own speaker button.
      for (let i = 0; i < 3; i++) {
        const hi = (await says.nth(i).getAttribute('aria-label')).replace('सुनो: ', '')
        const item = items.find((it) => it.hi === hi)
        await page.getByRole('button', { name: item.en ?? item.hi, exact: true }).click()
        await says.nth(i).locator('xpath=preceding-sibling::button').click()
        await page.waitForTimeout(250)
      }
      await page.waitForTimeout(1000)
      continue
    }
    if (!(await finishOne(page))) await page.waitForTimeout(200)
  }
  return false
}

async function finishOne(page) {
  const prompt = page.locator('button[aria-label^="सुनो: "]').first()
  if (!(await prompt.count())) return false
  const hi = (await prompt.getAttribute('aria-label')).replace('सुनो: ', '')
  const item = items.find((i) => i.hi === hi)
  const counting = (await page.getByRole('img', { name: 'गिनो' }).count()) > 0
  await page.getByRole('button', { name: counting ? String(item.digit) : (item.en ?? item.hi), exact: true }).first().click()
  await page.waitForTimeout(1100)
  return true
}
