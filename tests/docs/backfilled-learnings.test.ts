import { existsSync, readFileSync } from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'

const learnings = [
  {
    issue: '579',
    sentence:
      "Removing an unused build-time package leaves the built CSS and Next's statically traced standalone dependencies unchanged.",
    pr: '646',
  },
  {
    issue: '643',
    sentence:
      "The generator's formatting matters too: correcting only the shortcut URL still leaves builds rewriting the checked-in manifest.",
    pr: '653',
  },
  {
    issue: '647',
    sentence:
      "Zsh's tied `PATH`/`path` special parameter can be overwritten even by a variable introduced only as a `read` target.",
    pr: '654',
  },
  {
    issue: '584',
    sentence:
      'IP addresses must be masked in logs but kept unmodified for rate limiting and abuse controls.',
    pr: '657',
  },
]

describe('backfilled learnings files', () => {
  for (const { issue, sentence, pr } of learnings) {
    describe(`docs/ai/learnings/${issue}.md`, () => {
      const file = path.join(process.cwd(), 'docs/ai/learnings', `${issue}.md`)

      it('exists', () => {
        expect(existsSync(file)).toBe(true)
      })

      it('has a title, the learning sentence and the Task/PR line', () => {
        const text = existsSync(file) ? readFileSync(file, 'utf8') : ''
        expect(text).toMatch(/^# .+/m)
        expect(text).toContain(`**Learning:** ${sentence}`)
        expect(text).toContain(`**Task/PR:** #${issue}`)
        expect(text).toContain(`PR #${pr}`)
      })
    })
  }
})
