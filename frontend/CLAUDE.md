@AGENTS.md

# StandByDev frontend

- Read [project/Rules.md](project/Rules.md) before writing any page, component or hook. It is a contract.
- Read [DESIGN.md](DESIGN.md) before writing any UI. Colours, radii and spacing come from its tokens, exposed as Tailwind utilities in `src/app/globals.css` (`bg-canvas`, `text-ink`, `border-hairline`, `rounded-lg`, `py-section`, …). Never hardcode a hex or reach for a Tailwind palette colour like `zinc-50`.
- Dark mode is a user setting (`src/lib/theme.ts`), not an OS sniff. Every colour token has a light and a dark value, so a component that only uses tokens is dark-mode-correct with no `dark:` prefixes. See "Dark Mode" in DESIGN.md.
- Product context: [project/Context.md](project/Context.md).
