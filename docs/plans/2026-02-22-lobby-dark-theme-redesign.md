# Lobby Dark Theme Redesign — Evolution Gaming Style

## Context
The lobby table cards currently use white backgrounds with separated dealer avatars. After removing dealer avatars, the cards need a visual upgrade to match the dark theme of the game pages and look like a professional casino lobby (Evolution Gaming reference).

## Design

### Table Card Structure
- **Header**: Dark gradient (`#1a2332` → `#0d1825`), game type + table number + player count + round count + banker/player/tie stats
- **Body**: Full-width dark roadmap area (`#1e2433` background), no dealer avatar
- **Bottom overlay**: Dealer name badge (bottom-left) + countdown timer (bottom-right)
- **Card frame**: Dark background `#161b26`, rounded corners, subtle border `#2a3040`

### Color Palette
| Element | Color |
|---------|-------|
| Card background | `#161b26` |
| Header gradient | `#1a2332` → `#0d1825` |
| Roadmap background | `#1e2433` |
| Grid lines | `#2a3040` |
| Banker (red) | `#ef4444` with glow |
| Player (blue) | `#3b82f6` with glow |
| Tie (green) | `#22c55e` with glow |
| Hover border | `#d4af37` gold glow |

### Roadmap Dark Theme
- **Bead Road**: Solid circles with glow shadow on dark background
- **Big Road**: Outlined circles with glow on dark background
- **Derived Roads**: Same dots/lines, naturally visible on dark bg
- Grid lines changed from `#d4d4d4` → `#2a3040`
- Cell backgrounds from `#fff` → `#1e2433`

### Hover Effect
- Remove black overlay + orange button
- Add: gold border glow (`box-shadow: 0 0 12px rgba(212,175,55,0.3)`)
- Small "enter" badge at bottom-right

### Files to Modify
- `src/pages/Lobby.tsx` — Card wrapper colors, hover effect
- `src/components/lobby/LobbyRoadmap.tsx` — Dark theme colors for all road types

### Verification
1. `npx tsc --noEmit` passes
2. `npx vite build` succeeds
3. All table cards display with dark theme
4. Roadmap dots clearly visible on dark background
5. Hover shows gold glow border
6. Responsive: mobile/tablet/desktop all correct
