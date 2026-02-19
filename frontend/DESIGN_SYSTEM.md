# SplitDot Design System

## Style: Neo-Glass (Glassmorphism + Flat Design hybrid)

Modern fintech meets crypto. Trustworthy but approachable. Light-primary with glass card accents.

## Color Palette

| Token | Hex | Usage |
|-------|-----|-------|
| primary | #10B981 (Emerald 500) | Primary actions, positive balance, money/growth |
| primary-dark | #059669 (Emerald 600) | Hover states |
| secondary | #8B5CF6 (Violet 500) | Crypto accent, secondary actions |
| secondary-dark | #7C3AED (Violet 600) | Hover states |
| accent | #F59E0B (Amber 500) | Attention, warnings, pending states |
| bg-page | #F8FAFC (Slate 50) | Page background |
| bg-card | #FFFFFF | Card background |
| bg-glass | rgba(255,255,255,0.8) | Glass card overlay |
| text-primary | #0F172A (Slate 900) | Headings, primary text |
| text-secondary | #475569 (Slate 600) | Body text, descriptions |
| text-muted | #94A3B8 (Slate 400) | Captions, timestamps |
| border | #E2E8F0 (Slate 200) | Card borders, dividers |
| positive | #10B981 | Owed to you |
| negative | #F43F5E (Rose 500) | You owe |
| surface-dark | #0F172A | Dark sections (hero, footer) |

## Typography

Font: **Plus Jakarta Sans** (friendly, modern, SaaS-native)

| Level | Weight | Size | Line Height |
|-------|--------|------|-------------|
| H1 | 700 | 2rem (32px) | 1.2 |
| H2 | 600 | 1.5rem (24px) | 1.3 |
| H3 | 600 | 1.25rem (20px) | 1.4 |
| Body | 400 | 1rem (16px) | 1.5 |
| Small | 400 | 0.875rem (14px) | 1.5 |
| Caption | 500 | 0.75rem (12px) | 1.5 |

## Glass Effect

```css
backdrop-filter: blur(12px);
background: rgba(255, 255, 255, 0.8);
border: 1px solid rgba(255, 255, 255, 0.2);
border-radius: 16px;
```

## Component Patterns

### Cards
- White bg, rounded-2xl, shadow-sm, border border-slate-200
- Glass variant for overlays: bg-white/80 backdrop-blur-md
- Hover: shadow-md transition-shadow duration-200

### Balance Display
- Positive: text-emerald-500, prefix "+"
- Negative: text-rose-500, prefix "-"
- Zero: text-slate-400
- Large balance number: text-3xl font-bold tabular-nums

### Member Avatars
- Circular, 40px, gradient bg from address hash
- Stack overlapping for group display (negative margin)
- Fallback: first 2 chars of address

### Transaction/Expense List
- Card per expense, left: category icon + description, right: amount
- Payer badge, timestamp, split indicator
- Sorted newest first

### Forms
- Input: rounded-xl, border-slate-200, focus:ring-2 focus:ring-emerald-500
- Labels above inputs, required marker
- Error: red border + text below

### Buttons
- Primary: bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl px-6 py-3
- Secondary: bg-white border border-slate-200 hover:bg-slate-50 rounded-xl
- Danger: bg-rose-500 hover:bg-rose-600 text-white rounded-xl
- All: cursor-pointer transition-colors duration-200

## Z-Index Scale
- Base: 0
- Cards: 10
- Sticky nav: 20
- Dropdown: 30
- Modal overlay: 40
- Modal: 50
- Toast: 60

## Responsive Breakpoints
- Mobile: 320px - 767px (default, mobile-first)
- Tablet: 768px (md:)
- Desktop: 1024px (lg:)
- Wide: 1280px (xl:)
- Max content: max-w-6xl mx-auto

## UX Flow

1. **Dashboard** (/) - Group list cards, total balance summary, "Create Group" CTA, wallet connection in nav
2. **Create Group** (/groups/new) - Name field, add members by address, create button
3. **Group Detail** (/groups/:id) - Balance summary per member, expense list, "Add Expense" + "Settle" buttons
4. **Add Expense** (/groups/:id/expense) - Amount, description, category picker, split mode (equal/custom), AI receipt scanner toggle
5. **Settlement** (/groups/:id/settle) - Net settlement view (who pays whom), approve USDC, confirm on-chain tx

## Interaction Patterns

### Loading
- Skeleton screens (animate-pulse) for initial data
- Spinner for on-chain transactions
- Never frozen UI

### Empty States
- Friendly illustration + descriptive text + primary action button
- "No groups yet. Create your first group to start splitting!"
- "No expenses yet. Add your first expense."

### On-chain Transaction Flow
1. Button click -> show "Confirming..." state with spinner
2. Wallet popup (MetaMask/RainbowKit handles)
3. Pending: "Transaction submitted" with explorer link
4. Success: green checkmark + "Settlement complete!"
5. Error: red alert + retry button + error description

### Toast Notifications
- Bottom-right, auto-dismiss 5s
- Success: green left border
- Error: red left border, no auto-dismiss
- Info: blue left border
