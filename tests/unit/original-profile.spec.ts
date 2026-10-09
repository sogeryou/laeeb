import { readFileSync } from 'node:fs';
import { expect, it } from 'vitest';

it('keeps the original personal-home menu order without the added ranking panel', () => {
  const source = readFileSync('client/views/MeView.tsx', 'utf8');
  const content = source.slice(source.indexOf('/* User Info Card */'));
  const labels = ['Purchase History', 'Player Center', "label: 'Settings'", "label: 'New Users'", "label: 'Blacklist'", "label: 'Feedback'"];
  let previous = -1;
  for (const label of labels) {
    const position = content.indexOf(label);
    expect(position, label).toBeGreaterThan(previous);
    previous = position;
  }
  expect(content).not.toContain('ranking.viewTop10');
  expect(content).not.toContain('Sogeryou');
  expect(content).not.toContain('88886666');
});
