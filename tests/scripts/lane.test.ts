import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const laneScript = readFileSync(new URL('../../scripts/lane.sh', import.meta.url), 'utf8');
const laneGuide = readFileSync(new URL('../../docs/agents/lane.md', import.meta.url), 'utf8');
const foremanGuide = readFileSync(new URL('../../docs/agents/foreman.md', import.meta.url), 'utf8');

describe('lane shell helpers', () => {
  it('enables silence monitoring and visual-silence on the lane window', () => {
    expect(laneScript).toContain('monitor-silence 60');
    expect(laneScript).toContain('visual-silence on');
  });

  it('labels idle lane windows in lane_status and mentions issue comments before stopping', () => {
    expect(laneScript).toContain('window_silence_flag');
    expect(laneScript).toMatch(/idle/i);
    expect(laneScript).toContain('comment on the issue');
    expect(laneGuide).toContain('comment on the issue');
    expect(foremanGuide).toContain('issue comments');
  });
});
