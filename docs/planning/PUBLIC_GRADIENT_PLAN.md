# Public Gradient Refinement Plan

## Problem

The site uses a global utility class `.church-gradient` defined in
`frontend/src/index.css` as:

```css
background: linear-gradient(135deg, var(--color-background) 0%, var(--color-primary) 100%);
```

Because `--color-background` is a very light off-white (`#FEFDFB`) and
`--color-primary` is a medium blue (`#3B82F6`), the gradient shifts strongly
across the hero, header, auth layout, and dashboard accents. The screenshot
shows the hero starts nearly white on the left and ends blue on the right,
which makes the section look washed out and inconsistent.

## Goal

Make the brand background look more solid while keeping the product’s blue
identity. Options:

1. **Tighter gradient** (recommended): keep `.church-gradient` but change the
   definition to a subtle primary-to-darker-blue gradient that does not shift
   hues, e.g.:
   `linear-gradient(135deg, var(--color-primary) 0%, #2563EB 100%)`
2. **Solid primary**: replace with `background: var(--color-primary);`
   completely removes the gradient, but loses depth.
3. **Scoped hero only**: add a new `.church-hero` class in
   `frontend/src/components/public/HeroSection.jsx` that overrides the gradient,
   leaving `.church-gradient` for headers/dash.

## Recommended approach

Use option 1 (tight gradient) because it:
- Removes the large light-to-dark shift.
- Keeps the visual hierarchy (header vs hero) consistent.
- Works across every place `.church-gradient` is used without extra markup.

If a fully solid look is preferred later, we can swap the same rule to
`background: var(--color-primary);` in one line.

## Files to change

| File | Change |
|---|---|
| `frontend/src/index.css` | Update `.church-gradient` background rule |
| `frontend/src/components/public/HeroSection.jsx` | No change needed if `.church-gradient` is updated globally |

## Verification

1. `cd frontend && npm run build` on the VPS.
2. Open `https://msabato.co.ke/` — the hero background should be a consistent
   blue with only a subtle diagonal shift.
3. Open `/auth/login` and `/` on a narrow viewport — header and auth panel
   should still be readable.
4. Check `/downloads` and `/announcements` for consistent header/footer color.
