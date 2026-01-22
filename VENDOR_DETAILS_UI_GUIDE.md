# Vendor Details Page UI Structure Guide

## Page Layout (Before vs After)

### BEFORE
```
┌─────────────────────────────────────────────┐
│ Header                                      │
│ [Back] Vendor Name                          │
│ [Edit Metadata] [Approve] [Reject] [Archive]│
└─────────────────────────────────────────────┘
│ Vendor Summary Card                         │
├─────────────────────────────────────────────┤
│ Full Lifecycle Stepper (always visible)     │
│ - Large vertical step list                  │
│ - Takes up significant vertical space       │
└─────────────────────────────────────────────┘
│ Integration Status Panel                    │
└─────────────────────────────────────────────┘

[Profile] [Onboarding] [Access] [Configuration] 
[Risk & Compliance] [Compliance] [Users] [API Keys] [Activity] [Lifecycle]
                     ^^^^^^^^^^^^ ^^^^^^^^^^
                     Two separate tabs

┌─────────────────────────────────────────────┐
│ Profile Tab                                 │
│                                             │
│ Company Information (vertical stack)        │
│ - Company Name                              │
│ - Industry                                  │
│ - Region                                    │
│ - Website                                   │
│ - Address                                   │
│                                             │
│ Primary Contact (separate section)          │
│ - Contact Name                              │
│ - Email                                     │
└─────────────────────────────────────────────┘
```

### AFTER
```
┌─────────────────────────────────────────────┐
│ Header                                      │
│ [Back] Vendor Name                          │
│ [Edit Metadata] [Approve] [Reject] [⋮]     │
│                                    ^^^ Archive│
└─────────────────────────────────────────────┘
┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓
┃ ⚡ STATUS SUMMARY (elevated strip)         ┃
┃                                             ┃
┃ [APPROVED]  Blockers: Agreement expired,    ┃
┃             Security cert expired [View all]┃
┃             Impact: API access suspended    ┃
┃                      [Resume onboarding] ←  ┃
┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛
┌─────────────────────────────────────────────┐
│ 📊 Integration Summary                      │
│ ┌─────────┬────────────┬──────────┬────────┐│
│ │12 Active│Prod/Sandbox│2 hrs ago │15m ago ││
│ └─────────┴────────────┴──────────┴────────┘│
└─────────────────────────────────────────────┘
┌─────────────────────────────────────────────┐
│ 🔄 Vendor Lifecycle               [Expand ▼]│
│ Compliance Certification │ 5 of 7 completed │
│ [BLOCKED: Validation]                       │
└─────────────────────────────────────────────┘
  (Click to expand full stepper)

[Profile] [Onboarding] [Access] [Integration Configuration] 
[Risk & Compliance] [Users] [API Keys] [Activity] [Lifecycle]
 ^^^^^^^^^^^^^^^^^^^
 Now includes compliance content

┌─────────────────────────────────────────────┐
│ Profile Tab                                 │
│                                             │
│ Company Information (2-column layout)       │
│ ┌──────────────────┬───────────────────────┐│
│ │ Legal Name       │ Primary Business      ││
│ │ DBA (if exists)  │ Contact               ││
│ │ Industry         │ name@company.com      ││
│ │ Region           │                       ││
│ │ Website          │ Technical Contact     ││
│ │                  │ tech@company.com      ││
│ │                  │                       ││
│ │                  │ Support Email         ││
│ │                  │ support@company.com   ││
│ └──────────────────┴───────────────────────┘│
└─────────────────────────────────────────────┘
```

## Key Visual Improvements

### 1. Status Summary Strip
```
┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓
┃ [🔴 BLOCKED]                    [Take Action] ┃
┃                                                  ┃
┃ Blockers: Agreement expired, Certificate        ┃
┃           expired [View all (3)]                 ┃
┃                                                  ┃
┃ Impact: API access suspended                     ┃
┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛
```

**Features:**
- Visually elevated (shadow, border, background)
- Status badge with color coding
- Top 2 blockers shown inline
- "View all" link if more than 2 blockers
- Impact message explaining consequences
- Contextual action button

**Color States:**
- 🟢 Green: Approved (healthy)
- 🔵 Blue: Pending (awaiting action)
- 🔴 Red: Blocked/Rejected (critical)
- ⚪ Gray: Archived (inactive)

### 2. Company Information 2-Column Layout

**Desktop (> 768px):**
```
┌──────────────────────┬──────────────────────┐
│ COMPANY DETAILS      │ CONTACT INFORMATION  │
│                      │                      │
│ Legal Name           │ Primary Business     │
│ Acme Corporation     │ Contact              │
│                      │ John Smith           │
│ DBA                  │ john@acme.com        │
│ Acme Corp            │                      │
│                      │ Technical Contact    │
│ Industry             │ Alex Johnson         │
│ Technology Services  │ alex.j@acme.com      │
│                      │                      │
│ Region               │ Support Email        │
│ North America        │ support@acme.com     │
│                      │                      │
│ Website              │                      │
│ https://acme.com     │                      │
└──────────────────────┴──────────────────────┘
```

**Mobile (< 768px):**
```
┌────────────────────────────┐
│ COMPANY DETAILS            │
│                            │
│ Legal Name                 │
│ Acme Corporation           │
│                            │
│ Industry                   │
│ Technology Services        │
│                            │
│ ...                        │
└────────────────────────────┘
┌────────────────────────────┐
│ CONTACT INFORMATION        │
│                            │
│ Primary Business Contact   │
│ John Smith                 │
│ john@acme.com              │
│                            │
│ ...                        │
└────────────────────────────┘
```

### 3. Collapsible Lifecycle Section

**Collapsed State (Default):**
```
┌──────────────────────────────────────────────┐
│ 🔄 Vendor Lifecycle              [Expand ▼] │
│                                              │
│ Current: Compliance Certification            │
│ Progress: 5 of 7 completed                   │
│ [⚠️ BLOCKED: Validation]                     │
└──────────────────────────────────────────────┘
```

**Expanded State:**
```
┌──────────────────────────────────────────────┐
│ 🔄 Vendor Lifecycle            [Collapse ▲] │
│                                              │
│ Current: Compliance Certification            │
│ Progress: 5 of 7 completed                   │
│ [⚠️ BLOCKED: Validation]                     │
├──────────────────────────────────────────────┤
│                                              │
│ ✓ 1. Preparation         [COMPLETE]         │
│ ✓ 2. Registration        [COMPLETE]         │
│ ⚠️ 3. Validation          [BLOCKED]          │
│ ○ 4. Config Review       [PENDING]          │
│ ○ 5. Compliance Cert     [PENDING]          │
│ ○ 6. Activation          [PENDING]          │
│ ○ 7. Monitoring          [PENDING]          │
│                                              │
│              [Resume Validation] ────────────┤
└──────────────────────────────────────────────┘
```

**Visual Weight:**
- Completed steps: Muted/lower contrast
- In-progress steps: Normal contrast
- Blocked steps: Red highlight
- Pending steps: Very low contrast

### 4. Tab Navigation Cleanup

**Before:**
```
[Profile] [Onboarding] [Access] [Configuration] 
[Risk & Compliance] [Compliance] [Users] [API Keys] [Activity] [Lifecycle]
                     └──────┬────────┘
                    Redundant tabs
```

**After:**
```
[Profile] [Onboarding] [Access] [Integration Configuration] 
[Risk & Compliance] [Users] [API Keys] [Activity] [Lifecycle]
 └─────────────────┘
 Now includes all compliance content
```

**Risk & Compliance Tab Contents:**
1. Risk Assessment section
2. Compliance Status section (with certification badge)
3. Compliance Checklist (with approval tracking)

### 5. Header Actions Hierarchy

**Before:**
```
[Edit Metadata] [Approve] [Reject] [Archive]
                                    ^^^^^^^^
                          Equal prominence
```

**After:**
```
[Edit Metadata] [Approve] [Reject] [⋮]
                                    ^
                               Archive hidden
                               in overflow menu
                               (reduced prominence)
```

### 6. Floating Chat/FAB Reduction

**Before:**
```
                    ┌────┐
                    │ AI │ ← Full size, 100% opacity
                    └────┘
```

**After (on vendor details page):**
```
                    ┌──┐
                    │AI│ ← 90% size, 60% opacity
                    └──┘
                       (hover restores to full)
```

## Responsive Breakpoints

### Desktop (> 768px)
- Company info: 2 columns
- Integration summary: 4 columns
- Full width status strip
- All tabs visible

### Tablet (768px - 1024px)
- Company info: 2 columns (narrower)
- Integration summary: 2x2 grid
- Status strip wraps action button below
- All tabs visible (may scroll)

### Mobile (< 768px)
- Company info: 1 column (stacked)
- Integration summary: 2x2 grid
- Status strip stacks vertically
- Tabs scroll horizontally

## Color Coding Reference

### Status Colors
- `green`: Approved, Active, Healthy, Complete
- `blue`: Pending, In Progress, Info
- `red`: Rejected, Blocked, Error, Critical
- `gray`: Archived, Disabled, N/A
- `magenta`: Medium risk, Warnings

### Semantic Usage
- **Blockers**: Red background tint, red border
- **Success**: Green tags
- **Warnings**: Magenta/yellow tags
- **Info**: Blue tags
- **Inactive**: Gray/muted

## Accessibility Notes

- All interactive elements have proper focus states
- Color is not the only indicator (icons + text labels)
- Proper heading hierarchy maintained
- ARIA labels on icon-only buttons
- Keyboard navigation supported
- Screen reader friendly structure

## Animation Notes

- Status strip: Subtle entrance fade (200ms)
- Lifecycle expand/collapse: Smooth transition (300ms)
- Tab switching: Content fade (200ms)
- FAB scale: Smooth transform (150ms)
- Hover states: Quick transition (150ms)

All animations use `ease` or `ease-in-out` timing functions for natural feel.

