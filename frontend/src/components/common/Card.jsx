/**
 * WHAT THIS FILE DOES
 * -------------------
 * A simple container with the app's standard card look: rounded corners, a
 * light shadow, and the current church colours applied to the border and text.
 *
 * Use it anywhere you want a panel that visually matches the rest of the app.
 *
 * FILES IT TALKS TO
 * -----------------
 * - ColorPaletteContext.jsx → reads current surface/border/text colours
 */

import { useColorPalette } from '../../contexts/ColorPaletteContext';

const Card = ({ children, className = '' }) => {
  const { colors } = useColorPalette();

  return (
    <div
      className={`rounded-2xl shadow-lg p-6 hover:shadow-xl transition-shadow duration-300 ${className}`}
      style={{
        backgroundColor: colors.surface,
        borderColor: colors.border,
        borderWidth: '1px',
        borderStyle: 'solid',
        color: colors.text
      }}
    >
      {children}
    </div>
  );
};

export default Card;
