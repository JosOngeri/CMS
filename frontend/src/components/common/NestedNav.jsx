/**
 * WHAT THIS FILE DOES
 * -------------------
 * Renders sidebar navigation with collapsible sub-menus. A nav item may carry
 * `children`; a group expands automatically when one of its descendants is the
 * active route and its ancestors stay highlighted so the user can always see
 * where they are. Children render recursively, so nesting can go as deep as
 * the navigation data needs.
 *
 * Item shape: { path, icon, label, children?, roles? }
 * - `path` may be omitted for a label-only toggle group.
 * - `roles`/visibility filtering is the consumer's job — this component only
 *   renders what it is given.
 *
 * FILES IT TALKS TO
 * -----------------
 * - components/common/Sidebar.jsx  → main dashboard navigation
 * - shells/PlatformShell.jsx       → platform-console navigation (dense mode)
 */

import { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { ChevronRight } from 'lucide-react';

// True when the route is the item itself, a sub-page of it (detail pages like
// /tenants/123 count as "under" their parent), or any descendant route.
const pathActive = (pathname, item) =>
  (item.path && (pathname === item.path || pathname.startsWith(item.path + '/'))) ||
  (item.children?.some((child) => pathActive(pathname, child)) ?? false);

// Set of group keys (path, falling back to label) whose subtree contains the
// active route — used to auto-expand the trail to the current page.
const openGroupsFor = (items, pathname, acc = new Set()) => {
  for (const item of items) {
    if (!item.children?.length) continue;
    if (pathActive(pathname, item)) {
      acc.add(item.path || item.label);
      openGroupsFor(item.children, pathname, acc);
    }
  }
  return acc;
};

const flattenItems = (sections) => sections.flatMap((s) => s.items);

function NavEntry({ item, depth, dense, onNavigate, expanded, toggle, pathname }) {
  const hasChildren = item.children?.length > 0;
  const key = item.path || item.label;
  const isOpen = expanded.has(key);
  const selfActive = Boolean(item.path) && pathname === item.path;
  const descendantActive = hasChildren && !selfActive && pathActive(pathname, item);
  const Icon = item.icon;
  const pad = dense ? 'px-3 py-2' : 'px-4 py-2.5';

  const activeClasses = selfActive
    ? 'church-gradient text-[var(--color-on-solid)] shadow-md'
    : descendantActive
      ? 'text-[var(--color-primary)] bg-[color-mix(in_srgb,var(--color-primary)_10%,transparent)]'
      : 'text-[var(--color-text)] hover:bg-[color-mix(in_srgb,var(--color-primary)_10%,transparent)]';

  return (
    <li>
      <div className="relative">
        <Link
          to={item.path || '#'}
          className={`flex items-center ${pad} rounded-xl transition-all duration-200 ${activeClasses}`}
          onClick={(e) => {
            // Clicking the item itself expands/collapses its sub-sidebar —
            // no separate toggle control. Path-less groups only toggle.
            if (!item.path) e.preventDefault();
            if (hasChildren) toggle(key);
            onNavigate?.();
          }}
          aria-current={selfActive ? 'page' : undefined}
          aria-expanded={hasChildren ? isOpen : undefined}
        >
          {Icon && (
            dense
              ? <Icon className="h-4 w-4 mr-3" />
              : (
                <span className={`p-1.5 rounded-lg mr-3 ${
                  selfActive
                    ? 'bg-[color-mix(in_srgb,var(--color-surface)_20%,transparent)]'
                    : 'bg-[var(--color-background)]'
                }`}>
                  <Icon className="h-4 w-4" />
                </span>
              )
          )}
          <span className="flex-1 min-w-0 truncate">{item.label}</span>
          {hasChildren && (
            <ChevronRight
              aria-hidden="true"
              className={`h-4 w-4 ml-2 transition-transform duration-200 ${isOpen ? 'rotate-90' : ''} ${
                selfActive ? 'text-[var(--color-on-solid-80)]' : 'text-[var(--color-textSecondary)]'
              }`}
            />
          )}
        </Link>
      </div>
      {hasChildren && isOpen && (
        <ul className={`mt-1 space-y-1 border-l border-[var(--color-border)] ${dense ? 'ml-4 pl-2' : 'ml-6 pl-3'}`}>
          {item.children.map((child) => (
            <NavEntry
              key={child.path || child.label}
              item={child}
              depth={depth + 1}
              dense={dense}
              onNavigate={onNavigate}
              expanded={expanded}
              toggle={toggle}
              pathname={pathname}
            />
          ))}
        </ul>
      )}
    </li>
  );
}

function NestedNav({ sections, onNavigate, dense = false }) {
  const location = useLocation();
  const pathname = location.pathname;
  const [expanded, setExpanded] = useState(() =>
    openGroupsFor(flattenItems(sections), pathname)
  );

  // Navigate deeper → auto-open the ancestors of the new active route.
  useEffect(() => {
    setExpanded((prev) => {
      const next = new Set(prev);
      for (const key of openGroupsFor(flattenItems(sections), pathname)) {
        next.add(key);
      }
      return next;
    });
  }, [pathname, sections]);

  const toggle = (key) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key); else next.add(key);
      return next;
    });
  };

  return (
    <>
      {sections.map((section, si) => (
        <div key={section.title || si} className={si > 0 ? 'mt-5' : ''}>
          {section.title && (
            <p className={`${dense ? 'px-3' : 'px-4'} mb-2 text-xs font-semibold uppercase tracking-wider text-[var(--color-textSecondary)]`}>
              {section.title}
            </p>
          )}
          <ul className="space-y-1.5">
            {section.items.map((item) => (
              <NavEntry
                key={item.path || item.label}
                item={item}
                depth={0}
                dense={dense}
                onNavigate={onNavigate}
                expanded={expanded}
                toggle={toggle}
                pathname={pathname}
              />
            ))}
          </ul>
        </div>
      ))}
    </>
  );
}

export default NestedNav;
