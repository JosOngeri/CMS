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

const Card = ({ children, className = '' }) => {
  return (
    <div
      className={`rounded-2xl shadow-lg p-6 hover:shadow-xl transition-shadow duration-300 bg-[var(--color-surface)] border border-[var(--color-border)] text-[var(--color-text)] ${className}`}
    >
      {children}
    </div>
  );
};

export default Card;
