import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { colorPalettes } from '../config/colorPalettes';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const sourceRoot = path.resolve(__dirname, '..');

const sourceFiles = [];
const collectFiles = (directory) => {
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    const fullPath = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      if (entry.name !== '__tests__') collectFiles(fullPath);
      continue;
    }
    if (/\.(jsx?|tsx?|css)$/.test(entry.name)) sourceFiles.push(fullPath);
  }
};
collectFiles(sourceRoot);

const tokenDefinitionFiles = new Set([
  path.join(sourceRoot, 'index.css'),
  path.join(sourceRoot, 'config', 'colorPalettes.js'),
  path.join(sourceRoot, 'config', 'churchColorPalette.js')
]);

const runtimeFiles = sourceFiles.filter((file) => !tokenDefinitionFiles.has(file));
const runtimeSource = runtimeFiles.map((file) => fs.readFileSync(file, 'utf8')).join('\n');
const indexCss = fs.readFileSync(path.join(sourceRoot, 'index.css'), 'utf8');

const bannedUtilityPattern = /\b(?:text|bg|border|divide|ring|from|via|to|placeholder)-(?:white|black|gray|slate|zinc|neutral|stone|red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose)-\d{2,3}\b|\b(?:text|bg|border|placeholder)-(?:white|black)\b/;
const literalColorPattern = /#[0-9a-fA-F]{3,8}|\b(?:rgb|rgba|hsl|hsla)\(/;

describe('Color palette system', () => {
  it('does not use hardcoded Tailwind color utilities in runtime source', () => {
    const offenders = runtimeFiles.filter((file) => bannedUtilityPattern.test(fs.readFileSync(file, 'utf8')));
    expect(offenders).toEqual([]);
  });

  it('does not use literal colors outside palette token definitions', () => {
    const offenders = runtimeFiles.filter((file) => literalColorPattern.test(fs.readFileSync(file, 'utf8')));
    expect(offenders).toEqual([]);
  });

  it('defines the semantic tokens used by runtime components', () => {
    const requiredTokens = [
      '--color-primary',
      '--color-primary-strong',
      '--color-primary-light',
      '--color-secondary',
      '--color-accent',
      '--color-success',
      '--color-warning',
      '--color-error',
      '--color-background',
      '--color-surface',
      '--color-surfaceHover',
      '--color-text',
      '--color-textSecondary',
      '--color-textTertiary',
      '--color-border',
      '--color-divider',
      '--color-overlay',
      '--color-media',
      '--color-on-solid',
      '--color-shadow'
    ];

    requiredTokens.forEach((token) => {
      expect(indexCss).toContain(`${token}:`);
    });
  });

  it('keeps every selectable palette on the same semantic shape', () => {
    const requiredProperties = [
      'primary',
      'secondary',
      'accent',
      'background',
      'surface',
      'text',
      'textSecondary',
      'border',
      'success',
      'warning',
      'error'
    ];

    Object.entries(colorPalettes).forEach(([name, palette]) => {
      requiredProperties.forEach((property) => {
        expect(palette[property], `${name}.${property}`).toMatch(/^#[0-9a-fA-F]{6}$/);
      });
    });
  });

  it('uses color-mix for alpha-modified palette values', () => {
    expect(runtimeSource).not.toMatch(/\[var\(--color-[^\]]+\)\]\/\d+/);
    expect(runtimeSource).toContain('color-mix(in_srgb,var(--color-');
  });
});
