# QSmart System Requirements

## Client Dashboard Requirements

### 1. Personalized Client Dashboard After Login
- On successful client login, route the user to the Client Dashboard.
- The dashboard must display the logged-in client's identity using backend profile data.
- The dashboard header must include:
  - Client display name
  - Client type (for example: Hospital, Clinic, Diagnostic)
  - Client logo (from backend logo URL when available, with fallback logo)

### 2. Branch Management
- Clients must be able to create their own branches from the dashboard.
- Branch creation form must support at minimum:
  - Branch name (required)
  - City/location (optional)
  - Status (ACTIVE/INACTIVE)
- After creation, the new branch must appear immediately in the branch list/overview.

### 3. Counter Management
- Clients must be able to create counters under a selected branch.
- Counter creation form must include:
  - Branch selection (required)
  - Preset service selection (required)
  - Counter name (optional, defaults to selected service)
  - Counter type (Service/Billing/Support)
- After creation, the new counter must be available in Counter Control.

### 4. Preset Services by Client Type
- Service options must be preconfigured and mapped by client type.
- The UI must show only the preset service set relevant to the logged-in client's type.
- If client type has no specific mapping, fallback to a default preset service list.

### 5. Counter Control
- Clients must be able to select a counter and manage queue actions.
- Supported actions:
  - Call next token
  - Complete current token
- Queue data must refresh after each action.

### 6. All Branches Overview
- Clients must have a branch overview page that shows all branches.
- Minimum overview fields:
  - Branch name
  - City/location
  - Status
  - Counter count
- Counter count should reflect branch-specific counters whenever available.

### 7. UX and Feedback
- The dashboard must provide clear loading, success, and error messages.
- Forms should validate required fields before submission.
- Layout should remain responsive and usable on desktop and mobile.

## Client UX Flow
1. Client logs in and lands on a personalized dashboard.
2. Client sees branding (name, type, logo) for their organization.
3. Client creates branches as needed.
4. Client creates counters using preset services for their client type.
5. Client controls live queue from selected counter.
6. Client checks all branch performance/status in Branch Overview.
