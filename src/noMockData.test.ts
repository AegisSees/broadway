import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { describe, expect, it } from 'vitest';

/**
 * Guard: the site must never show made-up numbers. Saved API responses (api-samples/) and test helpers (src/test/)
 * exist so tests can run without the network; this test fails if any file that ships to visitors imports them, or
 * brings back a sample generator or seeded random number source.
 */
const SRC = join(__dirname);
const isTest = (file: string) => /\.test\.tsx?$/.test(file) || file.startsWith(join(SRC, 'test'));

function sourceFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const full = join(dir, name);
    if (statSync(full).isDirectory()) return sourceFiles(full);
    return /\.tsx?$/.test(name) ? [full] : [];
  });
}

// What a shipped file may not contain, and why.
const BANNED: { pattern: RegExp; why: string }[] = [
  { pattern: /from\s+['"][^'"]*api-samples\//, why: 'imports a saved API response' },
  { pattern: /from\s+['"][^'"]*\/test\//, why: 'imports a test helper' },
  { pattern: /from\s+['"][^'"]*(fixtures?|mocks?|prng|sample[A-Z][A-Za-z]*)['"]/, why: 'imports a fixture, mock or sample module' },
  { pattern: /\b(mulberry32|seedrandom|faker)\b/, why: 'uses a seeded random or fake-data generator' },
  { pattern: /\billustrative\b\s*[:?]/, why: 'declares an "illustrative" data flag' },
];

describe('no mock data in the shipped site', () => {
  const files = sourceFiles(SRC).filter((f) => !isTest(f));

  it('finds the source files', () => { expect(files.length).toBeGreaterThan(50); });

  it('has no shipped file that imports fixtures, samples or fake-data generators', () => {
    const problems: string[] = [];
    for (const file of files) {
      const text = readFileSync(file, 'utf8');
      for (const { pattern, why } of BANNED) if (pattern.test(text)) problems.push(`${relative(SRC, file)}: ${why}`);
    }
    expect(problems).toEqual([]);
  });
});
