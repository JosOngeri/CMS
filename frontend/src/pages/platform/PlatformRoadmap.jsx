/**
 * PlatformRoadmap — the destination for every nav item whose feature
 * isn't built yet. Instead of a dead end, the platform admin sees what
 * the area is for and the planned checklist — the console doubles as a
 * build roadmap.
 *
 * Route: /platform/roadmap/:slug
 * Data:  PLATFORM_AREAS in constants/platformNav.js
 */
import { useParams, Link } from 'react-router-dom';
import { ClipboardList, ArrowLeft, CheckSquare } from 'lucide-react';
import { PLATFORM_AREAS } from '../../constants/platformNav';

const PlatformRoadmap = () => {
  const { slug } = useParams();
  const area = PLATFORM_AREAS[slug];

  if (!area) {
    return (
      <div className="max-w-2xl mx-auto text-center py-16">
        <ClipboardList className="h-12 w-12 mx-auto text-[var(--color-textSecondary)]" />
        <h1 className="mt-4 text-xl font-semibold text-[var(--color-text)]">Unknown area</h1>
        <p className="mt-2 text-sm text-[var(--color-textSecondary)]">
          No platform function area matches &ldquo;{slug}&rdquo;.
        </p>
        <Link to="/platform" className="mt-4 inline-flex items-center space-x-1 text-sm text-[var(--color-primary)] hover:underline">
          <ArrowLeft className="h-4 w-4" />
          <span>Back to dashboard</span>
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto">
      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-[var(--color-primary-light)] text-[var(--color-primary)]">
        Planned — not yet built
      </span>
      <h1 className="mt-3 text-2xl font-bold text-[var(--color-text)]">{area.title}</h1>
      <p className="mt-2 text-[var(--color-textSecondary)]">{area.description}</p>

      <div className="mt-6 bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl divide-y divide-[var(--color-border)]">
        <div className="px-5 py-3 text-xs font-semibold uppercase tracking-wide text-[var(--color-textSecondary)]">
          Planned functions
        </div>
        {area.functions.map((fn) => (
          <div key={fn} className="flex items-start space-x-3 px-5 py-3">
            <CheckSquare className="h-4 w-4 mt-0.5 shrink-0 text-[var(--color-primary)]" />
            <span className="text-sm text-[var(--color-text)]">{fn}</span>
          </div>
        ))}
      </div>

      <p className="mt-4 text-xs text-[var(--color-textSecondary)]">
        These areas are staged in the navigation so the console shows the
        full SaaS-management model. Pages appear here as they are built —
        see <code className="px-1 rounded bg-[var(--color-background)]">docs/plans/2026-10-04_01-13_platform-console-13-functions.md</code>.
      </p>
    </div>
  );
};

export default PlatformRoadmap;
