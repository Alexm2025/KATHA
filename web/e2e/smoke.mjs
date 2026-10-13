// End-to-end smoke test against a running build: `npm run build && npm run preview`,
// then `npm run e2e`. Uses the Chrome already installed on the machine.
import { chromium } from 'playwright-core'

const BASE = process.env.BASE_URL ?? 'http://localhost:4173'
const browser = await chromium.launch({
  channel: process.env.BROWSER ?? 'chrome',
  args: ['--use-fake-ui-for-media-stream', '--use-fake-device-for-media-stream'],
})
const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 }, acceptDownloads: true })
const errors = []
let failed = 0

const check = (name, ok, detail = '') => {
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? `  — ${detail}` : ''}`)
  if (!ok) failed++
}
const watch = (page, label) => {
  page.on('pageerror', (e) => errors.push(`${label}: ${e.message}`))
  page.on('console', (m) => m.type() === 'error' && errors.push(`${label}: ${m.text()}`))
}
const role = (page, name) => page.getByRole('button', { name, exact: false })

try {
  // --- Teacher logs in with a PIN and opens the Numbers lesson -------------------------
  const teacher = await ctx.newPage()
  watch(teacher, 'teacher')
  await teacher.goto(`${BASE}/login`)
  await role(teacher, 'शिक्षक').click()
  await role(teacher, 'सुनीता मैम').click()
  for (const d of '1234') await teacher.getByRole('button', { name: d, exact: true }).click()
  await teacher.waitForURL('**/teacher')
  check('teacher PIN login', true)
  await role(teacher, 'गणित').click()
  await role(teacher, 'गिनती 1 से 10').click()
  await teacher.getByRole('link', { name: /पढ़ाना शुरू करें/ }).click()
  await teacher.waitForURL('**/teacher/live')

  // --- Student picks class + avatar and opens Listen ------------------------------------
  const student = await ctx.newPage()
  watch(student, 'student')
  await student.goto(`${BASE}/login`)
  await role(student, 'विद्यार्थी').click()
  await role(student, 'कक्षा 1').click()
  await role(student, 'बिरसा').click()
  await student.waitForURL('**/student')
  await student.getByRole('link', { name: 'शिक्षक को सुनो' }).click()

  // --- Tap-to-translate reaches the student tab over BroadcastChannel -------------------
  await teacher.getByRole('button', { name: 'एक', exact: false }).first().click()
  await student.getByText('ᱢᱤᱫ').waitFor({ timeout: 5000 })
  check('student tab shows Ol Chiki translation', true)
  check('unverified text carries the tag', await student.getByText('जाँच बाकी').first().isVisible())
  const latency = await teacher.getByText(/\d+ ms/).first().textContent()
  check('latency badge under 3000 ms', parseInt(latency.replace(/\D/g, ''), 10) < 3000, latency.trim())

  // --- Unknown sentence: Hindi shown, nothing invented ---------------------------------
  await teacher.getByRole('button', { name: 'कितने आम हैं?' }).click()
  await teacher.getByText('अनुवाद ऑफ़लाइन उपलब्ध नहीं').first().waitFor()
  check('unknown sentence is not translated', true)

  // --- Correction changes the next translation -----------------------------------------
  await role(teacher, 'अनुवाद सुधारें').first().click()
  const dialog = teacher.getByRole('dialog')
  await dialog.locator('input').first().fill('TEST ᱑᱒᱓')
  await dialog.getByRole('button', { name: /सहेजें/ }).click()
  await student.getByText('TEST ᱑᱒᱓').waitFor({ timeout: 5000 })
  check('correction reaches the student at once', true)
  check('correction is community-verified', await teacher.getByText('समुदाय-सत्यापित').first().isVisible())
  await teacher.getByRole('button', { name: 'कितने आम हैं?' }).click()
  await teacher.waitForTimeout(400)
  check('future translation uses the correction', (await teacher.getByText('TEST ᱑᱒᱓').count()) >= 2)

  if (process.env.PHASE !== '1') {
    const more = await import('./flows.mjs')
    await more.run({ ctx, teacher, student, check, watch, role, BASE })
  }
} catch (e) {
  check('run completed', false, e.message.split('\n')[0])
} finally {
  check('no console errors', errors.length === 0, errors.slice(0, 5).join(' | '))
  await browser.close()
  console.log(failed ? `\n${failed} check(s) failed` : '\nAll checks passed')
  process.exit(failed ? 1 : 0)
}
