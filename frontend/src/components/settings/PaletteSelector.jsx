import { useRef } from 'react';
import { RefreshCw } from 'lucide-react';
import { useColorPalette } from '../../contexts/ColorPaletteContext';
import { colorPalettes, defaultPalette } from '../../config/colorPalettes';

const HEX_RE = /^#?[0-9a-fA-F]{6}$/;
const normalizeHex = (v) => {
  const trimmed = (v || '').trim();
  return HEX_RE.test(trimmed)
    ? (trimmed.startsWith('#') ? trimmed : `#${trimmed}`).toLowerCase()
    : null;
};

function PaletteSelector({ selectedPalette, onSelect }) {
  const { colors, setPalette, updateColors } = useColorPalette();
  const debounceTimers = useRef({});

  const handlePaletteClick = (paletteKey) => {
    // Apply immediately for preview
    const palette = colorPalettes[paletteKey];
    setPalette(paletteKey);
    onSelect?.(palette);
  };

  // Color pickers always emit valid hex — apply immediately.
  const handleColorChange = (colorKey, value) => {
    const newPalette = { ...colors, [colorKey]: value };
    updateColors(newPalette);
    onSelect?.(newPalette);
  };

  // Free-text fields: debounce + only apply when the value is a real hex color,
  // so typing "#ff" mid-edit can't inject garbage into the CSS variables.
  const handleColorText = (colorKey, value) => {
    clearTimeout(debounceTimers.current[colorKey]);
    debounceTimers.current[colorKey] = setTimeout(() => {
      const hex = normalizeHex(value);
      if (hex) handleColorChange(colorKey, hex);
    }, 300);
  };

  const handleReset = () => {
    const defaultPaletteObj = colorPalettes[defaultPalette];
    setPalette(defaultPalette);
    onSelect?.(defaultPaletteObj);
  };

  return (
    <div className="space-y-6">
      {/* Quick Presets */}
      <div>
        <h3 className="text-sm font-medium text-[var(--color-text)] mb-3">Quick Presets</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {Object.entries(colorPalettes).map(([key, palette]) => (
            <button
              key={key}
              onClick={() => handlePaletteClick(key)}
              className={`relative p-4 rounded-lg border-2 transition-all ${
                (selectedPalette === key || (typeof selectedPalette === 'object' && selectedPalette?.name === palette.name))
                  ? 'border-primary ring-2 ring-[color-mix(in_srgb,var(--color-primary)_20%,transparent)]'
                  : 'border-[var(--color-border)] hover:border-[var(--color-border)]'
              }`}
              style={{ backgroundColor: palette.surface }}
            >
              <div className="space-y-2">
                <div className="flex space-x-2">
                  <div
                    className="w-8 h-8 rounded-full"
                    style={{ backgroundColor: palette.primary }}
                  />
                  <div
                    className="w-8 h-8 rounded-full"
                    style={{ backgroundColor: palette.secondary }}
                  />
                  <div
                    className="w-8 h-8 rounded-full"
                    style={{ backgroundColor: palette.accent }}
                  />
                </div>
                <p className="text-sm font-medium" style={{ color: palette.text }}>
                  {palette.name}
                </p>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Custom Color Editor */}
      <div className="bg-[var(--color-background)] rounded-lg p-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-medium text-[var(--color-text)]">Custom Colors</h3>
          <button
            onClick={handleReset}
            className="flex items-center text-xs text-[var(--color-textSecondary)] hover:text-[var(--color-text)]"
          >
            <RefreshCw className="h-3 w-3 mr-1" />
            Reset to Default
          </button>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium text-[var(--color-textSecondary)] mb-1">Primary Color</label>
            <div className="flex items-center space-x-2">
              <input
                type="color"
                value={colors.primary}
                onChange={(e) => handleColorChange('primary', e.target.value)}
                className="w-10 h-10 rounded cursor-pointer border-0"
              />
              <input
                type="text"
                defaultValue={colors.primary}
                key={`primary-${colors.primary}`}
                onChange={(e) => handleColorText('primary', e.target.value)}
                className="flex-1 px-3 py-2 text-sm border border-[var(--color-border)] rounded-lg bg-[var(--color-surface)] text-[var(--color-text)]"
              />
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-[var(--color-textSecondary)] mb-1">Secondary Color</label>
            <div className="flex items-center space-x-2">
              <input
                type="color"
                value={colors.secondary}
                onChange={(e) => handleColorChange('secondary', e.target.value)}
                className="w-10 h-10 rounded cursor-pointer border-0"
              />
              <input
                type="text"
                defaultValue={colors.secondary}
                key={`secondary-${colors.secondary}`}
                onChange={(e) => handleColorText('secondary', e.target.value)}
                className="flex-1 px-3 py-2 text-sm border border-[var(--color-border)] rounded-lg bg-[var(--color-surface)] text-[var(--color-text)]"
              />
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-[var(--color-textSecondary)] mb-1">Accent Color</label>
            <div className="flex items-center space-x-2">
              <input
                type="color"
                value={colors.accent}
                onChange={(e) => handleColorChange('accent', e.target.value)}
                className="w-10 h-10 rounded cursor-pointer border-0"
              />
              <input
                type="text"
                defaultValue={colors.accent}
                key={`accent-${colors.accent}`}
                onChange={(e) => handleColorText('accent', e.target.value)}
                className="flex-1 px-3 py-2 text-sm border border-[var(--color-border)] rounded-lg bg-[var(--color-surface)] text-[var(--color-text)]"
              />
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-[var(--color-textSecondary)] mb-1">Background Color</label>
            <div className="flex items-center space-x-2">
              <input
                type="color"
                value={colors.background}
                onChange={(e) => handleColorChange('background', e.target.value)}
                className="w-10 h-10 rounded cursor-pointer border-0"
              />
              <input
                type="text"
                defaultValue={colors.background}
                key={`background-${colors.background}`}
                onChange={(e) => handleColorText('background', e.target.value)}
                className="flex-1 px-3 py-2 text-sm border border-[var(--color-border)] rounded-lg bg-[var(--color-surface)] text-[var(--color-text)]"
              />
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-[var(--color-textSecondary)] mb-1">Surface Color</label>
            <div className="flex items-center space-x-2">
              <input
                type="color"
                value={colors.surface}
                onChange={(e) => handleColorChange('surface', e.target.value)}
                className="w-10 h-10 rounded cursor-pointer border-0"
              />
              <input
                type="text"
                defaultValue={colors.surface}
                key={`surface-${colors.surface}`}
                onChange={(e) => handleColorText('surface', e.target.value)}
                className="flex-1 px-3 py-2 text-sm border border-[var(--color-border)] rounded-lg bg-[var(--color-surface)] text-[var(--color-text)]"
              />
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-[var(--color-textSecondary)] mb-1">Text Color</label>
            <div className="flex items-center space-x-2">
              <input
                type="color"
                value={colors.text}
                onChange={(e) => handleColorChange('text', e.target.value)}
                className="w-10 h-10 rounded cursor-pointer border-0"
              />
              <input
                type="text"
                defaultValue={colors.text}
                key={`text-${colors.text}`}
                onChange={(e) => handleColorText('text', e.target.value)}
                className="flex-1 px-3 py-2 text-sm border border-[var(--color-border)] rounded-lg bg-[var(--color-surface)] text-[var(--color-text)]"
              />
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-[var(--color-textSecondary)] mb-1">Text Secondary Color</label>
            <div className="flex items-center space-x-2">
              <input
                type="color"
                value={colors.textSecondary}
                onChange={(e) => handleColorChange('textSecondary', e.target.value)}
                className="w-10 h-10 rounded cursor-pointer border-0"
              />
              <input
                type="text"
                defaultValue={colors.textSecondary}
                key={`textSecondary-${colors.textSecondary}`}
                onChange={(e) => handleColorText('textSecondary', e.target.value)}
                className="flex-1 px-3 py-2 text-sm border border-[var(--color-border)] rounded-lg bg-[var(--color-surface)] text-[var(--color-text)]"
              />
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-[var(--color-textSecondary)] mb-1">Border Color</label>
            <div className="flex items-center space-x-2">
              <input
                type="color"
                value={colors.border}
                onChange={(e) => handleColorChange('border', e.target.value)}
                className="w-10 h-10 rounded cursor-pointer border-0"
              />
              <input
                type="text"
                defaultValue={colors.border}
                key={`border-${colors.border}`}
                onChange={(e) => handleColorText('border', e.target.value)}
                className="flex-1 px-3 py-2 text-sm border border-[var(--color-border)] rounded-lg bg-[var(--color-surface)] text-[var(--color-text)]"
              />
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-[var(--color-textSecondary)] mb-1">Success Color</label>
            <div className="flex items-center space-x-2">
              <input
                type="color"
                value={colors.success}
                onChange={(e) => handleColorChange('success', e.target.value)}
                className="w-10 h-10 rounded cursor-pointer border-0"
              />
              <input
                type="text"
                defaultValue={colors.success}
                key={`success-${colors.success}`}
                onChange={(e) => handleColorText('success', e.target.value)}
                className="flex-1 px-3 py-2 text-sm border border-[var(--color-border)] rounded-lg bg-[var(--color-surface)] text-[var(--color-text)]"
              />
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-[var(--color-textSecondary)] mb-1">Warning Color</label>
            <div className="flex items-center space-x-2">
              <input
                type="color"
                value={colors.warning}
                onChange={(e) => handleColorChange('warning', e.target.value)}
                className="w-10 h-10 rounded cursor-pointer border-0"
              />
              <input
                type="text"
                defaultValue={colors.warning}
                key={`warning-${colors.warning}`}
                onChange={(e) => handleColorText('warning', e.target.value)}
                className="flex-1 px-3 py-2 text-sm border border-[var(--color-border)] rounded-lg bg-[var(--color-surface)] text-[var(--color-text)]"
              />
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-[var(--color-textSecondary)] mb-1">Error Color</label>
            <div className="flex items-center space-x-2">
              <input
                type="color"
                value={colors.error}
                onChange={(e) => handleColorChange('error', e.target.value)}
                className="w-10 h-10 rounded cursor-pointer border-0"
              />
              <input
                type="text"
                defaultValue={colors.error}
                key={`error-${colors.error}`}
                onChange={(e) => handleColorText('error', e.target.value)}
                className="flex-1 px-3 py-2 text-sm border border-[var(--color-border)] rounded-lg bg-[var(--color-surface)] text-[var(--color-text)]"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default PaletteSelector;
