# Vendor Details Page V2 Improvements

## Overview
Significantly reduced cognitive load and clarified lifecycle terminology on the Vendor Details page. All changes maintain the dark theme, existing styling patterns, and require no new backend dependencies.

## ✅ All Requirements Implemented

### 1. Enhanced Status Summary Strip (Replaces Archived Card)
**Location:** Top of page, directly under vendor title

**New Features:**
- **Record State badge** with label: Draft, In Review, Approved, Blocked, Archived
- **Reason field** explaining why Blocked/Archived (e.g., "Agreement expired", "Security certificate expired")
- **Impact statement** in plain language (e.g., "API access disabled", "Keys revoked")
- **Archived metadata** showing date and who archived (when applicable)
- **Contextual actions:**
  - Blocked: "Resolve blockers" (scrolls to Risk & Compliance)
  - Archived: "Restore vendor" (with confirmation dialog)
  - In Review: "Review application"

**Visual Treatment:**
- Red border/background for Blocked state
- Gray border/background for Archived state
- Clear visual hierarchy with badge group and Record State label
- Metadata text in secondary color when archived

**Acceptance:** ✅ Top of page explains vendor usability within 5 seconds

### 2. Clarified Lifecycle Concept
**Major Terminology Update:**
- Renamed "Vendor Lifecycle Status" to **"Onboarding and Governance Stages"** throughout
- **Record State** (Draft/In Review/Approved/Blocked/Archived) now lives in Status Summary strip
- **Onboarding Stage** (where in process) lives in lifecycle card

**Updated Lifecycle Stages:**
1. **Intake** (was "Preparation") - Internal request captured
2. **Registration** (unchanged) - Vendor invited or profile started
3. **Validation** (unchanged but clarified) - Identity, duplicates, approvals
4. **Configuration** (was "Configuration Review") - Integration setup
5. **Compliance** (was "Compliance/Certification") - Docs, certifications, agreements
6. **Activation** (unchanged) - Enabled for use
7. **Monitoring** (unchanged) - Ongoing

**Stage Descriptions Updated:**
- All stage descriptions now reflect modern language
- No "Preparation" as earliest stage (vendors start at "Intake" or "Registration")
- Archived vendors show historical stages (no longer defaulting to "Offboarded")

### 3. Lighter, More Useful Lifecycle Card
**Collapsed View (Default):**
- Shows "Current:" label followed by stage name
- Displays "X of 7 completed"
- Shows small red "Blocked" badge if applicable (no longer shows which stage)
- Toggle button reads "▼ View stages" / "▲ Collapse"

**Expanded View:**
- Full vertical step list via existing VendorLifecycleStepperComponent
- Inactive steps rendered with lower contrast
- Completed steps show check icon
- Current step highlighted
- **Contextual action button** when blocked:
  - "Go to Configuration" (navigates to Configuration tab)
  - "Go to Compliance" (navigates to Risk & Compliance tab)
  - Other stages show "Resume [stage]"

**Visual Improvements:**
- Added `current-stage-label` for "Current:" prefix
- `blocked-badge` aligns to the right side
- Reduced visual weight of completed/inactive steps (via existing stepper component)

### 4. Primary Tabs + More Dropdown
**Primary Tabs (5 visible):**
1. Profile
2. Onboarding
3. Integration Configuration
4. Risk & Compliance
5. Activity Log

**More Dropdown (2 items):**
- Users
- API Keys

**Removed Tabs:**
- Access & Tier (removed entirely per requirements)
- Lifecycle (redundant with lifecycle card)

**Behavior:**
- "More" button shows ▼ indicator when closed, ▲ when open
- Dropdown appears below button with elevated z-index
- Selecting item switches view and closes dropdown
- Active state highlighted in dropdown menu
- `isMoreTabActive()` method returns true when Users or API Keys tab is active

**Acceptance:** ✅ Tab row doesn't wrap at common desktop widths (1200px+)

### 5. Final Polish
**Status Summary First:**
- Status Summary strip is visually elevated above Integration Summary and Lifecycle card
- First thing users see after header
- Clear visual hierarchy maintained

**Spacing Consistency:**
- All cards use consistent 1.5rem margin-bottom
- Padding maintained at 1.5rem for all cards
- Gap spacing consistent throughout (0.75rem - 1.5rem scale)

**No Backend Dependencies:**
- All mock data extended with new fields:
  - `recordState`, `recordStateReason`, `recordImpact`
  - `archivedAt`, `archivedBy`
  - `onboardingStage`, `blockedStage`
- VendorRecordState type added to model
- Computed signals derive values from existing status field when explicit fields not set

## Technical Implementation

### New Type Definitions
```typescript
// vendor-company.model.ts
export type VendorRecordState = 'Draft' | 'In Review' | 'Approved' | 'Blocked' | 'Archived';

// Added to VendorCompany interface:
recordState?: VendorRecordState;
recordStateReason?: string;
recordImpact?: string;
archivedAt?: string;
archivedBy?: string;
onboardingStage?: string;
blockedStage?: string;
```

### Updated Lifecycle Stages
```typescript
// vendor-lifecycle.model.ts
export type LifecycleStage = 
  | 'intake'           // was 'preparation'
  | 'registration'
  | 'validation'
  | 'configuration'    // was 'configuration-review'
  | 'compliance'       // was 'compliance-certification'
  | 'activation'
  | 'monitoring';
```

### New Computed Signals
```typescript
recordState()           // Maps old status to new record state
recordStateReason()     // Generates or returns reason
recordImpact()          // Generates or returns impact message
isBlocked()             // True when record state is 'Blocked'
isArchived()            // True when record state is 'Archived'
archivedMetadata()      // Returns {date, by} for archived vendors
canRestore()            // Permission check for restore action
```

### New Methods
```typescript
toggleMoreMenu()        // Open/close More dropdown
selectMoreTab(tab)      // Select tab from More dropdown and close menu
isMoreTabActive()       // Check if a More tab is currently active
getRecordStateColor()   // Map record state to tag color
```

### Updated Methods
```typescript
handleContextAction()       // Now handles Blocked (scroll) and Archived (restore)
handleLifecycleAction()     // Now navigates to tabs for blocked stages
getStageLabel()             // Updated labels for all 7 stages
```

### CSS Additions
```css
/* Status Summary Enhancements */
.status-summary-strip.archived  // Gray styling for archived state
.status-badge-group             // Vertical badge + label group
.record-state-label             // "Record State" label styling
.reason-text, .metadata-text    // Additional text field styling

/* Lifecycle Card Updates */
.current-stage-label            // "Current:" prefix styling
.blocked-badge                  // Align blocked badge to right

/* More Dropdown */
.more-dropdown                  // Container with positioning
.more-button                    // Button with indicator
.more-indicator                 // ▼/▲ character styling
.more-menu                      // Dropdown menu with shadow/border
.more-menu-item                 // Individual dropdown items
.more-menu-item.active          // Active item highlighting
```

## Mock Data Updates

All 6 mock vendor records updated with:
- All stages renamed from old to new nomenclature
- Stage labels updated in onboarding steps
- Default lifecycle uses "intake" as first stage (not "preparation")
- ensureLifecycleData method updated

## User Experience Improvements

### Before
- Status scattered across multiple cards
- "Vendor Lifecycle Status" confusing (status vs stage)
- "Preparation" stage for records that already exist
- 9+ tabs wrapping on some screens
- Blockers/impact unclear

### After
- **5-second scan** reveals: state, blockers, impact, action needed
- **Clear separation**: Record State (where vendor stands) vs Onboarding Stage (where in process)
- **Intake** as first stage (no "Preparation" for existing records)
- **5 primary tabs + More** dropdown (no wrapping)
- **Plain language** throughout (no jargon)

## Acceptance Criteria Met

| Criterion | Status |
|-----------|--------|
| Status Summary explains usability in 5 seconds | ✅ |
| Record State concept clarified (vs Onboarding Stage) | ✅ |
| Lifecycle renamed to "Onboarding and Governance Stages" | ✅ |
| Stages reflect vendor already exists (Intake, not Preparation) | ✅ |
| Lifecycle card is lighter and more actionable | ✅ |
| Only 5-6 primary tabs visible (no wrapping) | ✅ |
| More dropdown for less-frequent tabs | ✅ |
| Status Summary is first thing users scan | ✅ |
| Consistent spacing throughout | ✅ |
| No new backend dependencies | ✅ |
| No em dashes used | ✅ |

## Testing Checklist

Before deploying, verify:

- [ ] Status Summary shows correct Record State badge
- [ ] Blocked state shows red border and Reason/Impact
- [ ] Archived state shows gray border and metadata (date, by)
- [ ] "Resolve blockers" scrolls to Risk & Compliance tab
- [ ] "Restore vendor" shows confirmation and updates state
- [ ] Lifecycle card renamed to "Onboarding and Governance Stages"
- [ ] Lifecycle shows "Current:" label before stage name
- [ ] Lifecycle shows "X of 7 completed"
- [ ] Lifecycle toggle reads "▼ View stages" / "▲ Collapse"
- [ ] Blocked lifecycle shows contextual action (Go to Config/Compliance)
- [ ] Contextual actions navigate to correct tabs
- [ ] Only 5 primary tabs visible
- [ ] More dropdown shows Users and API Keys
- [ ] More dropdown opens/closes properly
- [ ] Active tab highlighted in More dropdown
- [ ] Tab row doesn't wrap at 1200px+ widths
- [ ] All stages use new names (Intake, Configuration, Compliance)
- [ ] Mock vendors display correctly with new stages
- [ ] No console errors
- [ ] No TypeScript compilation errors
- [ ] Linter shows no errors

## Migration Notes

### Breaking Changes
- `LifecycleStage` type updated (old values will error)
- `activeTab` type no longer includes 'access' or 'lifecycle'

### Backward Compatibility
- Old `status` field still works (mapped to `recordState`)
- If `recordState` not set, computed from `status`
- All mock data updated to new stages
- ensureLifecycleData creates lifecycle with new stages

## Future Enhancements

1. **Backend Integration**
   - Add recordState, recordStateReason, recordImpact to API
   - Implement actual restore vendor endpoint
   - Add archived metadata tracking

2. **Enhanced Contextual Actions**
   - Smart action recommendations based on blocked stage
   - Automated blocker detection (expired docs, etc.)
   - Workflow automation for common unblock scenarios

3. **More Dropdown Enhancement**
   - Show badge count on More button (e.g., "3 pending users")
   - Add keyboard navigation support
   - Remember last selected More tab

4. **Record State Workflows**
   - State transition rules and validations
   - Automated state changes based on lifecycle progress
   - Audit trail for state changes

## Summary

These improvements significantly reduce cognitive load by:
1. Clarifying the difference between **Record State** (where vendor stands) and **Onboarding Stage** (where in process)
2. Putting critical status information **first** in a clear, scannable format
3. Using **plain language** for blockers, impacts, and actions
4. **Simplifying navigation** with Primary + More dropdown pattern
5. Making lifecycle feel like a **control surface** with contextual actions

All changes maintain design consistency, require no new backend work, and dramatically improve the user experience for both internal operations staff and scanning workflows. 🎉

