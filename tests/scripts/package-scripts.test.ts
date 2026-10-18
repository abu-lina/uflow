import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

const pkg = JSON.parse(readFileSync(join(process.cwd(), 'package.json'), 'utf8'))

describe('package.json scripts', () => {
  it('has no test:ui script (@vitest/ui is not installed)', () => {
    expect(pkg.scripts['test:ui']).toBeUndefined()
  })
})
