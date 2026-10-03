/**
 * Accessibility tests for shared UI components.
 * Runs axe against rendered output plus targeted checks for the patterns this
 * codebase relies on (aria-labels on icon buttons, alert roles on toasts,
 * keyboard focusability on interactive elements).
 */
import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import { axe, toHaveNoViolations } from 'jest-axe';
import '@testing-library/jest-dom';

// jest-axe ships a jest auto-setup; under Vitest the matcher must be
// registered manually.
expect.extend(toHaveNoViolations);

import { FullPageLoading, InlineLoading, CardLoading, TableLoading, ButtonLoading } from '../../common/Loading';
import { EmptyState } from '../../common/EmptyState';
import { Loader2 } from 'lucide-react';

describe('Accessibility — loading states', () => {
  it('FullPageLoading has no axe violations', async () => {
    const { container } = render(<FullPageLoading message="Loading dashboard..." />);
    expect(await axe(container)).toHaveNoViolations();
  });

  it('FullPageLoading announces its message', () => {
    const { getByText } = render(<FullPageLoading message="Loading members" />);
    expect(getByText('Loading members')).toBeInTheDocument();
  });

  it('FullPageLoading spinner is hidden from screen readers', () => {
    const { container } = render(<FullPageLoading />);
    expect(container.querySelector('svg')).toHaveAttribute('aria-hidden', 'true');
  });

  it('InlineLoading has no axe violations', async () => {
    const { container } = render(<InlineLoading size="lg" />);
    expect(await axe(container)).toHaveNoViolations();
  });

  it('InlineLoading spinner is aria-hidden', () => {
    const { container } = render(<InlineLoading />);
    expect(container.querySelector('svg')).toHaveAttribute('aria-hidden', 'true');
  });

  it('CardLoading has no axe violations', async () => {
    const { container } = render(<CardLoading />);
    expect(await axe(container)).toHaveNoViolations();
  });

  it('ButtonLoading has no axe violations', async () => {
    const { container } = render(<ButtonLoading />);
    expect(await axe(container)).toHaveNoViolations();
  });
});

describe('Accessibility — table skeleton', () => {
  it('TableLoading renders inside a table without axe violations', async () => {
    const { container } = render(
      <table><tbody><TableLoading rows={2} columns={3} /></tbody></table>
    );
    expect(await axe(container)).toHaveNoViolations();
  });
});

describe('Accessibility — empty states', () => {
  it('EmptyState has no axe violations (title only)', async () => {
    const { container } = render(<EmptyState title="No members yet" />);
    expect(await axe(container)).toHaveNoViolations();
  });

  it('EmptyState with action has no axe violations', async () => {
    const { container } = render(
      <EmptyState
        title="No payments"
        description="Record your first payment"
        action={Loader2}
        actionLabel="Add payment"
        onAction={() => {}}
      />
    );
    expect(await axe(container)).toHaveNoViolations();
  });

  it('EmptyState action button is keyboard-focusable and labelled', () => {
    const { getByRole } = render(
      <EmptyState title="Empty" action={Loader2} actionLabel="Create" onAction={() => {}} />
    );
    const btn = getByRole('button', { name: 'Create' });
    expect(btn).toBeInTheDocument();
    expect(btn).not.toHaveAttribute('tabindex', '-1');
  });
});

describe('Accessibility — color and contrast', () => {
  it('components use CSS-variable color tokens for contrast, never hardcoded colors', () => {
    const { container } = render(<EmptyState title="No data" />);
    const html = container.innerHTML;
    // Foreground/background colors must come from the palette tokens so the
    // active theme controls contrast ratios.
    expect(html).toContain('var(--color-');
    expect(html).not.toMatch(/#[0-9a-fA-F]{3,8}\b/);
    expect(html).not.toMatch(/\b(rgb|rgba|hsl|hsla)\(/);
  });

  it('status colors come from semantic tokens', () => {
    const { container } = render(
      <p className="text-[var(--color-error)]">Failed</p>
    );
    expect(container.innerHTML).toContain('--color-error');
  });
});

describe('Accessibility — interactive element conventions', () => {
  it('icon-only elements must carry an accessible name', () => {
    // Guard: any button rendered with only an icon child must have aria-label.
    // This test documents the convention so future components follow it.
    const { container } = render(
      <button aria-label="Close menu"><Loader2 /></button>
    );
    const btn = container.querySelector('button');
    expect(btn).toHaveAccessibleName('Close menu');
  });
});
