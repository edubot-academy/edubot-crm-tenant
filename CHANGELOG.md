# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).
Version bumps are classified by delivery scale; see `VERSIONING.md`.

## [3.0.1] - 2026-05-21

### Added
- Localization implementation plan covering tenant CRM, platform admin, CRM backend, and LMS backend alignment.
- Shared async helper for concurrency-limited AI enrichment requests.

### Changed
- Refined leads, deals, contacts, detail pages, pipeline, kanban, dialogs, cards, and table layouts for a more consistent release UI.
- Improved list loading behavior so lead/deal lists render before slower AI enrichment requests complete.
- Limited AI priority/risk enrichment concurrency and stopped follow-up requests after AI rate limits.
- Improved AI error handling with safer `unknown` error typing and clearer dialog descriptions.
- Updated ESLint React Refresh configuration to allow intentional shared exports used by existing UI/context modules.

### Fixed
- Fixed stale response handling for lead/deal list fetches.
- Fixed detail error actions so “back to list” actions are labeled accurately.
- Fixed `AuthContext` hook dependencies for token refresh bootstrap synchronization.
- Fixed unmatched WhatsApp queue cleanup so unmounted debounce flows do not update state.
- Removed lint warnings ahead of release.

## [3.0.0] - 2026-05-06

### Breaking Changes
- **Courses Module Removal**: Complete removal of courses functionality and `/courses` route
- **Permission System Simplification**: Removed `canViewLmsTechnicalFields` permission checks throughout the application
- **Pipeline Stage Changes**: Removed 'qualified' and 'trial' stages from deal pipeline
- **Lead Source Changes**: Removed 'other' option from lead sources
- **API Type System Overhaul**: Major changes to TypeScript interfaces affecting API contracts

### Removed
- Courses Page: Complete removal of `CoursesPage` component and `/courses` route
- LMS Technical Fields Permission: Removed `canViewLmsTechnicalFields` from role permission system
- Lead Source Option: Removed 'other' as a lead source option
- Deal Pipeline Stages: Removed 'qualified' and 'trial' stages
- Contact Source Types: Simplified contact source handling by removing enum constraints

### Added
- Enhanced Entity Relationships: Added embedded entity data in timeline events, tasks, and retention cases
- Lead Follow-up Tracking: Added `lastContactedAt` and `nextFollowUpAt` fields to Lead entity
- Tenant Support Email: Added `supportEmail` field to TenantConfig
- User Creation Response: Updated `CreatedUserResponse` with `userId` and `inviteLink` fields
- Write Payload Interfaces: Added `ContactWritePayload`, `TaskWritePayload`, `RetentionCaseWritePayload` for better API type safety
- Timeline Event Enhancements: Added creator information and embedded entity references
- Task Entity Relations: Added embedded contact information in Task entities
- Retention Case Relations: Added embedded contact and deal information
- Tenant Approval Rules: Added `TenantApprovalRuleResponse` interface and approval rules API endpoints
- Tenant Config Refresh: Added `refreshTenantConfig` function to TenantConfigProvider
- Enhanced Timeline Pagination: Added multi-page loading for scheduled timeline events
- Enrollment Enhancements: Added `dealId` and `notes` parameters to enrollment creation
- Payment Method Filtering: Added `includeDisabled` parameter to payment methods API

### Changed
- **API Type System**: Major overhaul of TypeScript interfaces for better type safety and flexibility
  - `PaymentMethod` changed from enum to string for dynamic payment methods
  - All entity relationship fields changed to nullable types (e.g., `leadId?: number | null`)
  - Enhanced write payload interfaces with proper typing
- **API Client Improvements**: 
  - Enhanced pagination support in enrollments API with limit/offset parameters
  - Improved type safety in payments API with flexible payment method handling
  - Better parameter handling in retention and tasks APIs
- **Permission System**: Simplified role-based access by removing LMS technical field checks
- **Navigation Updates**: Removed courses navigation from sidebar and route definitions
- **Timeline Enhancements**: Added creator user information and embedded entity data
- **Dashboard Query Parameters**: Updated `managerId` to `manager` and `courseId` to `course` for consistency
- **Tenant Config Provider**: Improved performance with useCallback and proper dependency management
- **Scheduled Timeline Events**: Enhanced to load all pages for complete event coverage
- **Enrollment Hooks**: Updated to support pagination parameters and enhanced mutation payload
- **WhatsApp Timeline Integration**: Updated to work with simplified permission system

### Fixed
- **Type Safety**: Improved null handling throughout the application with proper nullable types
- **API Consistency**: Standardized parameter naming across all API endpoints
- **Entity Relationships**: Fixed relationship handling between CRM entities with proper null checks

## [2.4.1] - 2026-05-06

### Removed
- WhatsApp Settings Panel: Removed `WhatsAppSettingsPanel` component from Settings page
- Settings Page: Removed WhatsApp integration section and feature flag checks

### Changed
- Settings.tsx: Simplified WhatsApp integration handling by removing settings panel references

## [2.4.0] - 2026-05-06

### Added
- WhatsApp Integration: Complete WhatsApp Business API integration for CRM communication
  - `whatsappApi` client with comprehensive endpoints for settings, conversations, messaging, and webhook management
  - WhatsApp settings management with account creation, connection testing, and configuration
  - Conversation management with status tracking (active, archived, closed) and user assignment
  - Real-time messaging capabilities with send, receive, and read status tracking
  - Webhook event handling with retry mechanisms for failed events
  - Conversation linking to CRM entities (contacts, leads, deals) for unified communication history
- WhatsApp Components: New UI components for WhatsApp functionality
  - `RecordWhatsAppTimelineCard` for viewing and managing WhatsApp conversations within entity timelines
  - `UnmatchedWhatsAppQueueCard` for handling conversations not yet linked to CRM entities
  - `WhatsAppSettingsPanel` for configuring WhatsApp Business account settings
  - WhatsApp utility functions for message formatting, direction handling, and event processing
- Enhanced Timeline: Improved timeline event type handling to support WhatsApp integration
- WhatsApp Types: Comprehensive TypeScript interfaces for WhatsApp entities
  - `WhatsAppSettings`, `WhatsAppConversationSummary`, `WhatsAppConversationDetail`
  - `WhatsAppMessageSummary`, `WhatsAppWebhookEventSummary`
  - `WhatsAppAccountStatus`, `WhatsAppConversationStatus` enums
  - `WhatsAppMatchedEntity` for CRM entity linking

### Changed
- Timeline event type `TimelineEventType` changed from strict union to string for better extensibility
- Updated detail pages (ContactDetail, DealDetail, LeadDetail) to support WhatsApp timeline integration
- Enhanced Settings page with WhatsApp configuration panel
- Timeline API integration with WhatsApp conversation data synchronization

## [2.3.3] - 2026-05-05

### Added
- Detail Pages: Added dropdown menu with MoreHorizontal icon for better action organization
- Detail Pages: Added mobile-optimized action button layout with back button on mobile only

### Changed
- LeadDetail: Refactored action buttons into dropdown menu with improved mobile layout
- ContactDetail: Refactored action buttons into dropdown menu with improved mobile layout  
- DealDetail: Refactored action buttons into dropdown menu with improved mobile layout
- Detail Pages: Improved responsive design with better mobile-first action organization

## [2.3.2] - 2026-05-05

### Fixed
- LeadDetail: Fixed text overflow in InfoRow component with `break-words` class
- LeadDetail: Improved responsive layout for action buttons with `w-full sm:w-auto` classes
- ContactDetail: Enhanced responsive button layout with proper flex wrapping
- DealDetail: Improved responsive design for dialog content and card layouts
- Detail Pages: Fixed min-width constraints and flex alignment for better mobile experience

### Changed
- LeadDetail: Added `min-w-0` containers to prevent layout collapse on small screens
- ContactDetail: Improved flex direction and gap handling for responsive layouts
- DealDetail: Enhanced dialog content sizing with better viewport handling
- UI Components: Consistent responsive button sizing across all detail pages
- Text Layout: Improved word breaking and text overflow handling in data displays

## [2.3.1] - 2026-05-05

### Fixed
- AI API: Fixed TypeScript error by adding proper typing for NextBestActionApiResponse interface
- AI API: Added `actionKey`, `actionText`, and `knownAction` fields to NextBestActionResult interface
- LeadDetail: Removed unnecessary try/catch wrapper in handleAiFeedback function
- LeadDetail: Added intelligence refresh mechanism for better data reloading

### Changed
- NextBestActionCard: Enhanced to handle unknown action types with fallback labels and descriptions
- NextBestActionCard: Added display of suggested action text from AI response
- ContactDetail: Added feedback controls for communication summaries with refresh functionality
- DealDetail: Added communication summary component with feedback controls
- Detail Pages: Improved AI feedback integration across all detail pages
- AI Components: Enhanced error handling and loading states for better user experience

## [2.3.0] - 2026-05-05

### Added
- AI Operational Intelligence: New AI components for enhanced CRM functionality
  - `AiFeedbackControls` component for collecting user feedback on AI suggestions with rating system and comment support
  - `CommunicationSummary` component for displaying AI-generated communication summaries with refresh capability
  - `NextBestActionCard` component for presenting AI-recommended actions with priority indicators and execution buttons
  - `PriorityIndicator` component for displaying lead priority scores and risk assessments with detailed breakdowns
  - `StructuredSuggestionReview` component for reviewing and applying AI-suggested field updates with confidence scores
- AI API Extensions: Extended AI API with new operational intelligence endpoints
  - Lead priority scoring with factor breakdown and tier classification
  - Next best action recommendations with AI reasoning and priority levels
  - Risk scoring for leads and deals with detailed reason codes
  - Timeline summary generation for communication history
  - Structured data extraction from text with confidence scoring
  - Feedback submission system for AI model improvement
- Enhanced AI Types: New interfaces for operational intelligence features
  - `LeadPriorityScoreResult` with scoring factors and tier classification
  - `NextBestActionResult` with action types and AI reasoning
  - `RiskScoreResult` with severity levels and detailed reasons
  - `TimelineSummaryResult` with AI metadata tracking
  - `ExtractionResult` for structured data extraction
  - `FeedbackRequest` and `FeedbackResponse` for model improvement

### Changed
- AI API: Added normalization functions for action types and priority mappings
- AI Draft Modal: Enhanced with next best action display and improved confidence visualization
- Feature Flag Provider: Extended to support new AI operational intelligence features
- Detail Pages: Updated to integrate new AI components and feedback systems
- Badge Component: Enhanced with additional styling options for AI-related indicators

## [2.2.1] - 2026-05-04

### Added
- AI Draft Modal: Display `suggestedAction` field from AI draft response alongside the generated message

### Changed
- AI API types: Added `suggestedAction: string` to `DraftFollowupResponse` interface

## [2.2.0] - 2026-05-04

### Added
- AI Assistant Integration: New AI feature flags `ai_assist_enabled` and `ai_followup_drafts_enabled` for controlling AI functionality
- AI Assistant Integration: AI draft followup API client (`aiApi`) with `draftFollowup` and `getUsageSummary` endpoints
- AI Assistant Integration: AI error message library (`ai-error-messages.ts`) with comprehensive Kyrgyz error mappings and user-friendly messages
- AI Assistant Integration: AI draft modal component (`AiDraftModal`) for generating AI-powered followup messages
- AI Assistant Integration: AI draft handoff card component (`AiDraftHandoffCard`) for displaying and using AI-generated drafts
- AI Assistant Integration: AI usage summary component (`AiUsageSummary`) for displaying AI service usage statistics
- AI Assistant Integration: AI draft functionality integrated into ContactDetail, DealDetail, and LeadDetail pages
- AI Assistant Integration: Environment variable support (`VITE_ENABLE_AI_ASSIST`, `VITE_ENABLE_AI_DRAFTS`) for AI feature flags
- AI Assistant Integration: Feature flag checks in detail pages to conditionally show AI functionality
- AI Assistant Integration: AI draft button with Sparkles icon in detail page action areas
- AI Assistant Integration: AI message state management for handling generated drafts
- AI Assistant Integration: Comprehensive error handling with recoverable error detection and retry delays

### Changed
- FeatureFlagProvider: Added AI feature flags to default flags and environment variable overrides
- Feature types: Extended `FeatureFlag` type and `FeatureFlags` interface with AI-related flags
- Detail pages: Added AI draft modal integration and state management
- Detail pages: Added AI feature flag checks before rendering AI functionality
- Detail pages: Imported Sparkles icon for AI-related UI elements

## [2.1.0] - 2026-05-02

### Added
- LMS Bridge Integration: Lead course interest tracking with `LeadLmsMapping` entity and `LeadCourseInterest` component
- LMS Bridge Integration: Deal course context fields (`LmsCourseContextFields` component) for associating deals with LMS courses/groups
- LMS Bridge Integration: Deal course mapping display (`DealCourseMapping` component) showing LMS course/group snapshots
- LMS Bridge Integration: Trial lesson course context support (courseId, groupId, courseType fields)
- LMS Bridge Integration: URL parameter passing for course context (courseId, groupId, courseType, courseName, groupName) from LeadDetail to Deals create form
- LMS Bridge Integration: Auto-fill course context from lead when creating deals or trial lessons
- LMS Bridge Integration: Dynamic course/group snapshot resolution in Deals create form using `useLmsCourses` and `useLmsGroups` hooks
- LMS Bridge Integration: Shared `DealCourseType` enum moved to `crm.enums.ts` for cross-module consistency
- LMS Bridge Integration: Backend database migrations for `lead_lms_mapping` table and trial lesson course context columns
- LMS Bridge Integration: Backend service layer support in `LeadService` for mapping operations
- LMS Bridge Integration: Backend service layer support in `DealService` for course context validation and sync
- LMS Bridge Integration: Backend service layer support in `TrialLessonService` for course context fields
- LMS Bridge Integration: Runtime validation in `normalizeCourseType` to prevent invalid course type values
- LMS Bridge Integration: Unit tests for `LeadService`, `DealService`, and `TrialLessonService` covering LMS bridge functionality
- LMS Bridge Integration: `lms-formatting.ts` utility library with course type labels and formatting helpers

### Changed
- LMS Bridge Integration: `LeadDetail.tsx` passes full course context (including snapshots) when creating deals
- LMS Bridge Integration: `Deals.tsx` auto-fills LMS course context from selected leads and trial lessons
- LMS Bridge Integration: `TrialLessons.tsx` auto-fills LMS course context from selected leads and deals
- LMS Bridge Integration: `DealCourseType` imports updated across backend modules to use shared `crm.enums.ts`
- LMS Bridge Integration: Backend lead DTOs now use shared `DealCourseType` enum instead of importing from deal DTO
- LMS Bridge Integration: Backend trial lesson DTOs and entity now use shared `DealCourseType` enum

### Fixed
- LMS Bridge Integration: React controlled input warning in `LeadDetail.tsx` by coalescing null lead fields to empty strings
- LMS Bridge Integration: Type safety in `Deals.tsx` course type handling with `normalizeCourseType` helper

## [2.0.1] - 2026-04-30

### Changed
- Package name changed from "edupro-crm" to "edubot-crm-tenant"
- Package manager version updated to npm@10.9.0
- Sidebar header height increased from h-14 to h-16 for better visual balance
- Sidebar icon width increased from 3rem to 4.25rem for improved touch targets
- Sidebar content padding increased from px-2 py-2 to px-3 py-4 for better spacing
- Sidebar footer padding increased from p-3 to p-4 for improved layout
- Removed tenant branding display (displayName and primaryDomain) from AppLayout header for cleaner UI

## [2.0.0] - 2026-04-30

### Breaking Changes
- **Major architectural shift**: Application is now a tenant-only CRM frontend, no longer a combined platform/tenant system
- Removed platform admin routes (`/platform`) and PlatformAdminPage component (platform operations moved to separate application)
- Removed legacy contact routes (`/legacy-contacts`, `/legacy-contacts/:id`) and related components
- Removed superadmin role from tenant CRM (platform-only role, managed in separate platform admin)
- Removed platform admin login mode toggle from Login page
- Companies API endpoint removed from tenant CRM (no longer used in tenant context)
- Legacy contacts API endpoint removed from tenant CRM
- Global feature flag management removed from tenant CRM (now managed in platform admin)
- This release requires operators to use the separate platform admin application for platform-level operations

### Added
- New backend feature flags: payments_enabled, whatsapp_integration_enabled, custom_roles_enabled, custom_domain_enabled to FeatureFlag type and FeatureFlags interface
- Route guard for /payments using ModuleGuard with payments_enabled feature flag
- Sidebar filter for payments navigation item based on payments_enabled flag
- Module mappings in tenant-bootstrap for new modules (payments, whatsapp, custom_roles, custom_domain)
- Kyrgyz translations for security error messages in Users.tsx (superadmin creation prevention, admin role permission)
- Kyrgyz translations for UI labels in Users.tsx (invite link label, warning message)
- Auth bootstrap API method (authApi.bootstrap) for authenticated tenant data loading
- Bootstrap data state in AuthContext with loadBootstrapData function called after login and token refresh
- use-tenant-branding hook for centralized tenant branding access
- tenant-bootstrap.ts library with normalizeTenantBootstrap function for safe tenant data merging
- Role permission hook for centralized CRM, LMS, admin, and retention visibility checks
- Workflow docs for sales, assistant, and manager daily operations
- LMS bridge enablement mechanism using React Context with `LmsBridgeProvider` and `useLmsBridge` hook
- Phase 4 feature flag system: `FeatureFlagProvider` with `useFeatureFlags` hook for module-level feature control
- Phase 4 feature flag types: `FeatureFlag` type and `FeatureFlags` interface with _enabled suffix (crm_enabled, lms_bridge_enabled, trial_lessons_enabled, retention_enabled, telegram_notifications_enabled, advanced_reports_enabled)
- Sync metadata fields to bridge types: `syncStatus` and `lastSyncedAt` to `LeadWithCourseInterest`, `ContactWithStudentMapping`, `DealWithCourseMapping`, and `DealPaymentSummaryWithBridge`
- Enrollment sync fields to `PaymentWithEnrollment`: `enrollmentRequestId`, `syncError`, `syncMetadata`
- Bridge type imports to API modules: `ContactWithStudentMapping`, `LeadWithCourseInterest`, `DealWithCourseMapping`, `PaymentWithEnrollment`
- Status API methods to tenant-config client: `getStatuses`, `createStatus`, `updateStatus`, `deleteStatus`
- `TenantStatusResponse` interface for status API responses
- `StatusConfig` interface to types for status configuration
- `leadStatuses` and `dealStatuses` to `TenantConfig` type
- Status loading in `TenantConfigProvider` on mount
- `leadStatusOptions` in Leads.tsx using tenant config with fallback to hardcoded i18n data
- `leadStatusOptions` in LeadDetail.tsx using tenant config with fallback to hardcoded i18n data
- `pipelineStageOptions` in Deals.tsx using tenant config with fallback to hardcoded i18n data
- Phase 4 environment variables: VITE_ENABLE_CRM, VITE_ENABLE_TRIAL_LESSONS, VITE_ENABLE_RETENTION, VITE_ENABLE_TELEGRAM, VITE_ENABLE_ADVANCED_REPORTS
- Phase 4 tenant configuration system: `TenantConfigProvider` with `useTenantConfig` hook for tenant-specific settings
- Phase 4 tenant configuration types: `TenantConfig`, `BrandingConfig`, `NotificationChannel`, `PipelineStageConfig`, `RoleConfig`, `TenantLeadSource` interfaces
- Phase 4 Settings UI: tenant configuration section with currency, timezone, and language selectors
- Phase 4 Settings UI: branding configuration section with company name and primary color picker
- Phase 4 Settings UI: lead sources display section showing configured lead sources with names
- Phase 4 Settings UI: payment methods display section showing configured payment methods
- Phase 4 Settings UI: feature flags section with toggle switches for all feature flags
- Phase 4 API client: `tenantConfigApi` for tenant configuration endpoints (config, roles, stages, lead sources, notification channels)
- Phase 4 API client: `featureFlagApi` for feature flag endpoints (tenant flags, global flags)
- Phase 4 backend integration: `FeatureFlagProvider` now loads flags from backend API on mount
- Phase 4 backend integration: `TenantConfigProvider` now loads config from backend API on mount
- Phase 4 backend integration: tenant config updates are persisted to backend API
- Phase 4 backend: `FeatureFlagController` with GET/POST /tenant and GET/PUT /global endpoints
- Phase 4 backend: `FeatureFlagService.getAllGlobalFlags()` method for retrieving all global flags
- Phase 4 backend: Fixed `TenantConfig` entity column mappings (company_name, logo_url, primary_color)
- Phase 4 backend: Fixed status filter contract in `TenantConfigController` (changed @Param to @Query)
- Phase 4 documentation: Phase 4 contract document defining tenant context, flag precedence, API contracts
- Phase 4 documentation: Phase 4 audit document identifying backend and frontend issues
- Phase 4 documentation: Phase 4 completion gates document defining acceptance criteria
- App.tsx: Integrated `FeatureFlagProvider` and `TenantConfigProvider` into the provider hierarchy
- App.tsx: `LmsBridgeProvider` now receives `enableLmsBridge` from feature flags instead of hardcoded value
- AppSidebar.tsx: Navigation items now filtered by feature flags (courses, enrollments, trial-lessons, retention, reports)
- AppSidebar.tsx: Added `useFeatureFlags` hook to check feature enablement before rendering navigation items
- Settings.tsx: Added feature flag toggle switches for all feature flags with backend persistence
- Settings.tsx: Added tenant configuration UI for currency, timezone, language, company name, and primary color
- Settings.tsx: Added lead sources and payment methods display sections from tenant config
- Settings.tsx: Integrated `useFeatureFlags` and `useTenantConfig` hooks for managing settings
- types/index.ts: Added `FeatureFlag` type and `FeatureFlags` interface for feature flag system
- types/index.ts: Added `TenantConfig`, `BrandingConfig`, `NotificationChannel`, `PipelineStageConfig`, `RoleConfig`, `TenantLeadSource` interfaces
- Bridge data presence requirement to ContactDetail.tsx integration history panel (requires bridgeData.lmsStudentId)
- Bridge data presence requirement to DealDetail.tsx integration history panel (requires contactBridgeData.lmsStudentId)
- types/index.ts: Added LMS bridge field documentation comments to Lead, Contact, Deal, and Payment types
- src/api/feature-flag.ts: New API client for feature flag management (getTenantFlags, setTenantFlag, getGlobalFlags, setGlobalFlag)
- src/api/tenant-config.ts: New API client for tenant configuration (config, roles, stages, lead sources, notification channels)
- src/components/core/FeatureFlagProvider.tsx: New provider for feature flag context with backend integration
- src/components/core/TenantConfigProvider.tsx: New provider for tenant configuration context with backend integration
- src/api/tenant-config.ts: New API client for tenant configuration with full CRUD for config, lead sources, roles, pipeline stages, statuses, notification channels, and payment methods, with x-company-id header support
- src/lib/jwt.ts: New JWT utility with decodeJwt and isTokenExpired functions, tenantId in JwtPayload interface
- src/lib/i18n.ts: Added educationLeadStatus and educationDealStatus for LMS bridge-specific statuses
- src/pages/Settings.tsx: Added comprehensive tenant configuration UI with currency, timezone, language, company name, and primary color selectors, feature flag toggle switches with backend persistence, lead sources and payment methods display sections
- src/pages/Leads.tsx: Added tenant-configured lead sources and lead statuses with fallback to hardcoded i18n data
- src/pages/LeadDetail.tsx: Added tenant-configured lead sources and lead statuses with fallback to hardcoded i18n data
- src/pages/Pipeline.tsx: Added tenant-configured pipeline stages with fallback to hardcoded stages, currency formatting using tenantConfig.currency
- src/pages/Payments.tsx: Added currency formatting using tenantConfig.currency
- PHASE_1_4_FINAL_COMPLETION_PLAN.md: Comprehensive completion plan for Phases 1-4 with blockers, exit criteria, and progress tracking
- FINAL_RECONCILED_BLOCKER_VERDICT.md: Reconciled audit verdict comparing two completion audits with final must-fix list
- PHASE_1_4_COMPLETION_BACKLOG.md: Task backlog for remaining Phase 1-4 completion work
- CURRENT_STATE_IMPLEMENTATION_REPORT_CODEX.md: Current state implementation report documenting platformization progress

### Changed
- ModuleGuard now displays Kyrgyz message "Бул мүмкүнчүлүк сиздин тарифиңизде жеткиликтүү эмес" instead of redirecting when feature is disabled
- ModuleGuard now waits for both feature flags and permissions to load before showing content
- AuthContext loadBootstrapData now accepts optional tenantIdOverride parameter for platform admin bootstrap data loading
- AuthContext now passes tenantIdOverride to bootstrap API during token refresh and login for platform admin support
- Role permissions hook now checks custom_roles_enabled feature flag before using tenant-configured permissions
- Role permissions hook now preserves legacy hardcoded permissions when custom_roles_enabled is false
- Role permissions hook now exposes isLoading and isUsingTenantPermissions states
- FeatureFlagProvider refactored with getEnvironmentFeatureFlags and buildFallbackFeatureFlags helper functions
- FeatureFlagProvider now resets to fallback flags when user is not authenticated
- FeatureFlagProvider error message changed from "conservative fallback" to "fail-closed fallback"
- FeatureFlagProvider now depends on tenantId in addition to isAuthenticated for loading flags
- TenantConfigProvider now uses useMemo for initialTenantConfig to prevent unnecessary recalculations
- TenantConfigProvider now resets to initial config when user is not authenticated
- TenantConfigProvider now depends on tenantId in addition to isAuthenticated for loading config
- IntegrationHistoryPanel moved permission check after data fetch to avoid premature null returns
- StudentSummaryPanel added getApiErrorDetails helper function for safer error extraction
- StudentSummaryPanel improved error handling with type-safe error message and requestId extraction
- Command component removed CommandDialogProps interface, now uses DialogProps directly
- Textarea component type definition changed from interface to type alias
- Tailwind config now uses ES module import for tailwindcss-animate instead of CommonJS require
- App.tsx added Suspense wrapper around Routes with RouteLoadingState fallback for lazy-loaded routes
- Auth API bootstrap method now accepts optional tenantId parameter for platform admin support
- Auth API login method tenantId parameter changed from `string | null` to `string`
- Feature flag API added isApiError type guard for safer error type checking
- Feature flag API setTenantFlag error handling improved with proper type checking and details extraction
- Feature flag API error types changed from `any` to `unknown` for type safety
- Tenant config API added TenantConfigUpdatePayload interface with branding support
- Tenant config API role permissions type changed from `Record<string, any>` to `Record<string, boolean>`
- Tenant config API config types changed from `Record<string, any>` to `Record<string, unknown>`
- Leads page header actions now align items to end instead of center
- Leads page added custom date range inputs to header actions when custom date filter is selected
- Error messages library: Changed "Request ID" to "Сурам коду" in Kyrgyz
- Error messages library: Improved error descriptions for LMS group, deal, and lead selection errors
- Contacts page: Added loadError state with error handling and toast notifications
- Contacts page: Changed "Деталдар" button to "Карточканы ачуу"
- Deals page: Added loadError state with error handling and toast notifications
- Leads page: Changed fallback lead status labels from English to Kyrgyz (Жаңы, Байланыш түзүлдү, Кызыкты, Жооп жок, Жабылды)
- Login page: Changed "Тенант" to "Уюм" in error messages for better localization
- Login page: Improved error descriptions for missing tenant context
- NotFound page: Changed English text to Kyrgyz (404 page)
- Reports page: Changed "Утулган келишимдер" to "Ийгиликтүү келишимдер"
- Reports page: Changed "CSV Экспорт" to "CSV жүктөп алуу"
- Reports page: Changed "Сыноо сабак конверсиясы" to "Сыноо сабагынын конверсиясы"
- Settings page: Changed "Тенант конфигурациясы" to "Уюм жөндөөлөрү"
- Settings page: Changed currency names to Kyrgyz (АКШ доллары, Евро, Орус рубли)
- Settings page: Changed language names to Kyrgyz (Орусча, Англисче)
- Tasks page: Added loadError state with error handling and toast notifications
- Tasks page: Changed search placeholder to "Тапшырманы издөө..."
- TrialLessons page: Added loadError state with error handling and toast notifications
- TrialLessons page: Changed "Сыноо сабак" to "Сыноо сабагы" in various labels
- Users page: Simplified superadmin creation error message
- Users page: Simplified admin role permission error message
- Users page: Changed invite link labels to Kyrgyz
- TenantResolveResponse type now only includes pre-login branding fields (removed supportEmail, supportPhone, planCode, features, modules)
- TenantContext now prioritizes bootstrap data over public tenant resolve for authenticated users
- TenantContext only calls public tenant resolve when user is not authenticated
- AuthContext now loads bootstrap data after login and token refresh
- AuthContext clears bootstrap data on logout
- API client now uses separate providers for auth tenant ID and resolved tenant ID with fallback logic
- API client now throws Kyrgyz error when tenant-scoped API is called without tenant ID
- API client LMS requests now use conditional X-Company-Id header instead of default company ID
- AppLayout now uses useTenantBranding hook for consistent tenant branding access
- ContactDetail.tsx fixed integration history data access (historyData.items → historyData.data)
- ForgotPassword.tsx now imports ky i18n for localization
- Login.tsx now uses useTenantBranding hook for consistent branding access
- Login.tsx removed hidden tenant ID input for dev mode
- Login.tsx now shows local development warning when VITE_DEV_TENANT_ID is not set
- Login.tsx login button disabled when local development tenant ID is missing
- Settings.tsx feature flag source checks updated from 'platform' to 'global' or 'plan'
- Kyrgyz login title changed from "EduPro CRM" to "Аккаунтка кирүү"
- Kyrgyz login subtitle updated to "CRM системаңызга кирүү үчүн маалыматтарыңызды жазыңыз"
- Kyrgyz tenant domain error updated to "Уюм табылган жок. Доменди текшерип, кайра аракет кылыңыз."
- LmsBridgeProvider now uses feature flags internally instead of accepting enableLmsBridge prop
- App.tsx removed enableLmsBridge prop from LmsBridgeProvider
- src/api/modules.ts removed explicit /api/ prefixes from endpoints for consistent API prefix handling
- src/api/client.ts now uses centralized validateAndSanitizeTenantId function for X-Company-Id header sanitization
- src/api/auth.ts login function accepts optional tenantId parameter
- src/contexts/AuthContext.tsx login function accepts optional tenantId parameter
- src/pages/Login.tsx uses i18n keys for forgot password and help instead of hardcoded Kyrgyz text
- src/pages/Login.tsx added hidden tenant ID input field for localhost/dev mode (functional via dev tools)
- src/components/AppSidebar.tsx: Branding now uses tenant-resolve endpoint data with fallback chain (brandingName → name → 'Edubot CRM')
- src/components/AppSidebar.tsx: Sidebar icon character now dynamic based on branding name with empty string guard
- src/pages/Login.tsx: Branding now uses tenant-resolve endpoint data with fallback chain (brandingName → name → 'Edubot CRM')
- src/pages/Login.tsx: Desktop and mobile login icons now dynamic based on branding name with empty string guard
- Phase 2.3 CRM-LMS decoupling: bridge components (LeadCourseInterest, ContactStudentMapping, DealCourseMapping) now check LMS bridge flag in addition to permissions
- Phase 2.3 CRM-LMS decoupling: removed unused LMS course/group hooks from Leads.tsx
- Phase 2.3 CRM-LMS decoupling: LMS enrollment buttons in Leads and Deals tables now conditional on LMS bridge flag
- Phase 2.3 CRM-LMS decoupling: removed LMS field IDs from enrollment navigation params (courseId, groupId, studentId)
- Phase 2.4 CRM-LMS decoupling: removed @deprecated annotations from type definitions, replaced with clear documentation that these are LMS bridge fields
- LMS bridge enablement is now controlled by `VITE_ENABLE_LMS_BRIDGE` instead of a hardcoded app-level flag
- Deal creation no longer sends contact IDs as fake `leadId` values
- Phase 4 modularization: navigation items now filtered by feature flags in addition to permissions
- Phase 4 modularization: courses, enrollments, trial-lessons, retention, and reports pages now respect feature flags
- Phase 4 modularization: Settings page now displays current feature flag status (read-only, controlled by environment variables)
- Bridge types documentation: Updated to reflect that types represent bridge-only enrichment payloads from dedicated bridge endpoints, not extensions of CRM types
- Bridge types structure: Removed inheritance from CRM types (`Lead`, `Contact`, `Deal`, `Payment`) to align with explicit bridge boundary model
- Bridge API client methods: Updated to use formal bridge types instead of inline type definitions
- `bridgeApi.getContactBridgeData`: Now returns `ContactWithStudentMapping` type
- `bridgeApi.getLeadBridgeData`: Now returns `LeadWithCourseInterest` type
- `bridgeApi.getDealBridgeData`: Now returns `DealWithCourseMapping` type
- `bridgeApi.updateDealLmsMapping`: Now returns `DealWithCourseMapping` type
- `bridgeApi.getPaymentBridgeData`: Now returns `PaymentWithEnrollment` type
- Leads.tsx: Status dropdown now uses tenant-configured statuses instead of hardcoded i18n data
- LeadDetail.tsx: Status dropdown now uses tenant-configured statuses instead of hardcoded i18n data
- Deals.tsx: Pipeline stage dropdown now uses tenant-configured stages instead of hardcoded i18n data
- Deals.tsx: Mobile board columns now use tenant-configured pipeline stages
- Reports.tsx: Currency formatting now uses `tenantConfig.currency` instead of hardcoded "сом"
- Deals.tsx: Currency formatting now uses `tenantConfig.currency` instead of hardcoded "сом"
- Pipeline.tsx: Currency formatting now uses `tenantConfig.currency` instead of hardcoded "сом"
- Payments.tsx: Currency formatting now uses `tenantConfig.currency` instead of hardcoded "сом"

### Removed
- docs/PHASE_2_ARCHITECTURE.md: Superseded by PHASE_1_4_FINAL_COMPLETION_PLAN.md
- docs/PHASE_2_MIGRATION.md: Superseded by PHASE_1_4_FINAL_COMPLETION_PLAN.md
- Platform admin routes: Removed /platform route and PlatformAdminPage component (platform operations moved to separate application)
- Legacy contact routes: Removed /legacy-contacts and /legacy-contacts/:id routes and related components (LegacyContactsPage, LegacyContactDetailPage)
- src/api/modules.ts: Removed companiesApi (companies endpoint no longer used in tenant CRM)
- src/api/modules.ts: Removed legacyContactsApi (legacy contacts endpoint no longer used in tenant CRM)
- src/api/feature-flag.ts: Removed getGlobalFlags and setGlobalFlag methods (global flags managed in platform admin)
- src/pages/Login.tsx: Removed platform admin login mode toggle (tenant-only CRM)
- src/lib/i18n.ts: Removed superadmin translation key (superadmin is platform-only role)
- src/components/AppSidebar.tsx: Removed legacy navigation section and Database icon import
- src/components/AppLayout.tsx: Removed legacy-contacts from breadcrumb label map

### Fixed
- Type mismatch in feature-flag.ts warning comments (removed flags not in FeatureFlagKey type: payments_enabled, whatsapp_integration_enabled, custom_roles_enabled, custom_domain_enabled)
- Inconsistent /api/ prefix on approve endpoint in modules.ts (line 87)
- Dashboard now uses split `getCrmStats` and `getEducationStats` endpoints instead of legacy combined `getStats`, properly decoupling CRM from LMS data
- Reports page now uses the original `reportsApi.getStats` endpoint instead of dashboard endpoints to preserve report-specific backend behavior
- Reports course filter now ignores URL params when LMS bridge is disabled, preventing hidden filters from bookmarked URLs
- Reports CSV export now conditionally includes LMS-only data (trial conversion, course rows) based on LMS bridge flag
- Reports trial conversion KPI card is hidden when LMS bridge is disabled
- LMS bridge is now truly optional - CRM UI keeps working with empty LMS stats when education endpoint fails, instead of failing the entire page
- Bridge type synchronization: Frontend bridge types now include all sync metadata fields present in backend DTOs, eliminating need for inline type workarounds in components
- LMS-only fields, IDs, history panels, and enrollment actions are now hidden from non-admin roles across list and detail views
- Tenant-config endpoint route shadowing: Moved `/statuses`, `/sources`, and `/pipeline-stages` routes before `/:id` routes in lead and deal controllers (backend)
- Bridge API security: Added role-based access control to all bridge endpoints, restricting access to MANAGER, ADMIN, and SUPERADMIN roles (backend)
- Manager lead assignment flow no longer regresses after permission centralization
- Legacy migration navigation is again restricted to superadmin only
- Deal enrollment navigation now points to the reachable `/enrollments` route
- Payment warnings and deal labels no longer expose LMS-only context to unauthorized roles
- ContactDetail.tsx now uses canViewStudentSummary() instead of canViewLmsTechnicalFields() for student summary, allowing managers to see student summary data as intended
- DealCourseMapping.tsx enrollment navigation now uses crmDealId query param instead of dealId, matching EnrollmentForm expectations
- EnrollmentsPage now seeds initialHistoryFilters with crmDealId for deal context, enabling proper prefiltering from deal detail "Толук тарых" navigation
- Removed references to setManagersLoading in Leads.tsx (removed with LMS hooks)
- LMS integration history panels now only render when bridge data is present, preventing empty UI sections in CRM-only mode
- Removed references to courses variable in Leads.tsx (removed with LMS hooks)
- FeatureFlagProvider now uses conservative defaults (trial_lessons_enabled, telegram_notifications_enabled, advanced_reports_enabled default to false)
- FeatureFlagProvider environment variable override logic now only applies when explicitly set (using conditional spread instead of direct assignment)
- IntegrationHistoryPanel now correctly accesses `data?.data` instead of `data?.items` for integration history items
- LmsIntegrationHistoryResponse interface changed `items` property to `data` to match actual API response structure
- RetentionCase interface now includes LMS fields (lmsStudentId, lmsEnrollmentId, lmsCourseId, lmsGroupId) extracted from metrics by backend
- Frontend retention API contract no longer leaks LMS fields (lmsCourseId, lmsGroupId) for CRM-only mode
- Dashboard backend now zeroes retention stats when LMS bridge is off (openRetentionCases conditional on lms_bridge_enabled)
- Dashboard page conditionalized the retention priority item/stat based on isLmsBridgeEnabled flag
- Reports page retention stat card now conditional on isLmsBridgeEnabled flag
- Reports page retention tab trigger now conditional on isLmsBridgeEnabled flag
- Reports page retention tab content now conditional on isLmsBridgeEnabled flag
- Payment config authority improved: DTO method is now string, entity method is now string, runtime validates against tenant config
- Feature flags and tenant config loading: Fixed JSON parse errors by making providers only load data when user is authenticated
- React context error: Fixed "useAuth must be used within AuthProvider" error in AppContent by adding proper useAuth hook usage
- API client header injection: Removed localStorage dependency from tenant-config and feature-flag API clients, now using automatic X-Company-Id header from AuthContext
- Tenant config type fixes: Fixed type mismatches in TenantConfigProvider for mapped data structures (leadSources, pipelineStages, statuses, paymentMethods)
- Frontend feature gating: Updated Reports.tsx to gate retention tab by retention_enabled feature flag instead of lms_bridge_enabled
- Frontend feature gating: Updated Dashboard.tsx to gate retention priority item and stat card by retention_enabled feature flag
- Frontend feature gating: Updated Settings.tsx to remove telegram_notifications_enabled toggle and notification settings card section
- Frontend cleanup: Removed misleading CRM_ONLY_MODE_FLAGS and CRM_LMS_BUNDLE_MODE_FLAGS from FeatureFlagProvider.tsx
- TenantConfigProvider defaults: Changed default tenantId from 'default' to '' and companyName from 'EduPro CRM' to '' for proper tenant resolution
- Login auto-detect: Changed loginTenantId from undefined to '' for proper auto-detect flow
- docs/backend/DEPRECATED_ENDPOINTS.md: New documentation tracking deprecated API endpoints and migration status
- src/api/client.ts: Added 30-second request timeout with AbortController to prevent hanging requests
- src/api/client.ts: Added X-Company-Id header sanitization to prevent injection attacks (alphanumeric, hyphens, underscores only, max 50 chars)
- src/api/feature-flag.ts: Added temporary fallback to legacy endpoint /feature-flag/tenant when new /feature-flags/tenant fails
- src/api/feature-flag.ts: Added TODO comments for removing legacy endpoint fallback after staging verification
- src/api/feature-flag.ts: Added development-mode console.warn when fallback is triggered
- src/pages/Login.tsx: Added tenant ID validation (alphanumeric, hyphens, underscores only, max 50 chars)
- src/pages/Users.tsx: Added client-side role validation to prevent superadmin creation
- src/pages/Users.tsx: Added permission check: only admins can create other admin users

## [1.7.0] - 2026-04-24

### Added
- **Login page redesign** with split-screen layout
  - Left side displays EduPro CRM branding with gradient background
  - Right side contains the login form
  - Added support contact information (email, phone) on login screen
  - Added help button for user assistance
  - Responsive design hides branding on mobile screens
- **Dashboard priority cards** showing actionable items
  - New leads requiring attention
  - Pending payments awaiting confirmation
  - Open retention cases needing follow-up
  - Recently won deals for celebration
  - Each card includes count, description, and navigation action
- **Dashboard stats badges** displaying key metrics
  - Total lead count
  - Overall conversion rate
  - Top performing manager
  - Top performing course
- **Deals page pipeline stage quick actions**
  - Inline Select dropdown for changing deal pipeline stages
  - Context-aware quick action suggestions based on current stage
  - Loading state during stage updates
  - Toast notifications on successful stage changes
- **Deals page mobile board columns** with swipeable pipeline stages
  - Horizontal scrolling columns for each pipeline stage
  - Mobile card rendering for deal information
  - Stage count badges on column headers
- **AppLayout breadcrumbs** showing navigation path
  - Dynamic breadcrumb generation based on current route
  - Localized labels for all navigation items
  - ID-based routes show contextual labels (e.g., "Лид маалыматы")
  - BreadcrumbItem, BreadcrumbLink, BreadcrumbSeparator components
- **AppLayout quick create functionality**
  - Context-aware create button that routes to appropriate create form
  - Supports leads, contacts, deals, and tasks
  - Default fallback to leads create form
- **DataTable mobile board support**
  - New `mobileBoardColumns` prop for defining board columns
  - New `getMobileBoardColumnId` prop for grouping items into columns
  - New `mobileBoardEmptyMessage` prop for empty column states
  - Snap scrolling for mobile board columns
  - Flattened column headers with muted background
  - Tighter card spacing for better content density
- **DataTable row selection** with checkbox support
  - New `enableRowSelection` prop for enabling selection
  - New `selectedIds` prop for controlled selection state
  - New `onSelectionChange` prop for selection callbacks
  - Select all checkbox in table header
  - Individual row checkboxes with proper state management
- **DataTable active filters** display
  - New `activeFilters` prop for filter chip rendering
  - Removable Badge components with X buttons
  - Aria labels for accessibility
- **DataTable sticky header** support
  - New `stickyHeader` prop for fixed table headers on scroll
  - Sticky header stays visible during vertical scrolling
- **DataTable error and retry** handling
  - New `errorMessage` prop for custom error messages
  - New `onRetry` prop for retry action callbacks
  - StatePanel component for consistent error/loading/empty states
- **PageShell StatePanel component** for consistent state display
  - Unified loading, error, and empty state rendering
  - Optional icon display
  - Compact mode for smaller footprints
  - Action button with custom labels
  - Consistent styling across all pages
- **DateRangeFilter component** for reusable date filtering
  - Preset options: all, today, week, month, custom
  - Conditional custom date range inputs
  - Optional clear custom callback
  - Localized labels via i18n
- **Kyrgyz translations** expanded
  - Added `enrollments` navigation label
  - Added `legacyData` navigation label
  - Added common placeholders (fullNamePlaceholder, emailPlaceholder, notesPlaceholder)
  - Added contact-related keys (infoTitle, editTitle, lmsId, noLmsId, externalId, lmsInfoTitle, newLmsLink, lmsEnrollment)

### Changed
- **Login page** completely redesigned with modern split-screen layout
- **Dashboard page** enhanced with priority cards and stats badges
- **Deals page** now supports pipeline stage updates directly from the list
- **AppLayout** now displays breadcrumbs for navigation context
- **DataTable** significantly enhanced with mobile board support, row selection, active filters, and sticky headers
- **PageShell** refactored with new StatePanel component for consistent state rendering
- **Mobile Leads page** redesigned with grouped filter section
  - Search bar moved above filters for better mobile priority
  - Status and date dropdowns in horizontal row to save vertical space
  - Custom date fields only appear when "Өзүңүз тандаңыз" is selected
  - Active filters display as removable Badge chips
  - Clear all filters button as icon-only action
  - Page header description hidden on mobile
  - ~40% reduction in scroll-to-content distance
- **Mobile lead cards** compacted with improved hierarchy
  - Phone as tappable `tel:` link for direct dialing
  - Email as `mailto:` link (hidden on small screens)
  - Course tag in header row
  - Tags inline with assigned manager
  - Delete moved to end of action row
  - Unified action row with quick actions, LMS, delete

### Fixed
- Active filter chip for custom date range now shows "Күн: өзүңүз тандаңыз" when dates are empty

## [1.6.0] - 2026-04-23

### Added
- New lead qualification status `no_response` (Жооп жок) for leads that have not been responded to
- Date range filtering to Leads page with preset options (today, week, month) and custom date range picker
- Date range filtering to Dashboard page with preset options (today, week, month) and custom date range picker
- Refresh button to Dashboard page with loading spinner
- Error handling to Dashboard page with toast notifications and error card UI
- Data freshness indicator to Dashboard page showing when data was last updated
- Conversion rate line chart overlay to manager performance chart on Dashboard
- Kyrgyz translations for date range filters (Баары, Бүгүн, Бул жума, Бул ай, Өзүңүз тандаңыз, Башталган күн, Аяктаган күн)

### Changed
- Lead qualification status type now includes 'no_response' option
- Status badge component now displays warning variant for 'no_response' status
- CRM status mapping now handles 'no_response' status by mapping to legacy 'new' status
- Dashboard now uses date range parameters (from/to) when fetching stats


## [1.5.0] - 2026-04-01

### Added
- Admin notification system with approval workflow
  - New "Бекитүү күтүү" (Pending Approvals) tab in Notifications page for admin users
  - Visual distinction for approval notifications with amber styling and icons
  - Payment approval notifications display with CreditCard icon
  - Enrollment approval notifications display with GraduationCap icon
  - Notification count badges on tabs showing total vs approval counts
- New "Төлөмдөр" (Payments) analytics tab on Reports page with comprehensive payment metrics
- Revenue trend line chart showing daily payment amounts over time
- Payment status distribution pie chart (confirmed/submitted/failed)
- Payment methods bar chart with count and amount breakdowns
- Revenue by course horizontal bar chart showing top performing courses
- Manager performance table with payment counts and revenue totals
- New API methods: `reportsApi.getPaymentReports()` and `reportsApi.getRevenueReports()`
- Payment summary stat cards showing total payments, total amount, confirmed count, and pending count

## [1.4.4] - 2026-04-01

### Fixed
- Enrollment history status filter now uses correct API enum values (`activated`, `pending_approval`, `failed`) instead of invalid values (`success`, `pending`, `error`)
- `getFriendlyError` now properly handles API error messages that are arrays instead of strings, preventing "trim is not a function" runtime errors
- Error messages from backend validation failures now display correctly in UI notifications

## [1.4.3] - 2026-03-31

### Fixed
- Admin LMS approval queue now shows already-approved direct enrollments that still need activation instead of hiding them from the Enrollments page
- Enrollments page approval actions now adapt their labels for already-approved rows, making stalled activations explicit
- Contact and LMS navigation flows recover more reliably once backend enrollment records already contain an LMS student mapping

## [1.4.2] - 2026-03-31

### Added
- Admin recovery action on the LMS enrollment form for recreating placeholder-email LMS accounts with the real CRM contact email

### Fixed
- Managed enrollment flow can now request placeholder-account recreation instead of only returning the existing enrollment when LMS email is stuck on `@placeholder.local`
- Frontend enrollment API and hooks now support the placeholder-account recovery flag
- Admins can immediately generate a fresh onboarding link after recreating a placeholder LMS account

## [1.4.1] - 2026-03-31

### Added
- Deal detail now includes an LMS edit dialog for correcting the sold LMS course/group directly on the deal before payment confirmation

### Fixed
- Payment confirmation now blocks more clearly when an offline or online-live deal is missing its LMS group and routes the operator to the deal that needs correction
- Payment-related frontend typings now include `deal.lmsGroupId`, matching the actual data used by the confirmation guard
- Deal-side LMS edit flow now fills the workflow gap where payment confirmation depended on deal LMS data but the UI had no way to update it

## [1.4.0] - 2026-03-31

### Added
- Canonical LMS enrollment hooks and API client coverage for:
  - `POST /api/enrollments`
  - `GET /api/enrollments/pending`
  - `GET /api/enrollments/history`
  - `POST /api/enrollments/:id/approve`
- Admin enrollment regression specs for:
  - pending approval
  - immediate activation
  - onboarding-link generation after auto-activation
- LMS shortcuts from lead, deal, and contact list pages into the canonical Enrollments page
- Inline history detail dialog on the Enrollments page for admin review

### Changed
- The Enrollments page is now the single CRM workflow for manual LMS requests and admin approval
- Enrollment approval/history UI now uses the canonical backend enrollment API instead of lead-shaped compatibility routes
- LMS enrollment form now blocks requests until the selected lead is converted to a contact or a contact-linked deal is selected
- Frontend build now uses basic manual chunk splitting for React, Radix, and TanStack Query

### Fixed
- Admin approval UI on the Enrollments page is now wired into the reachable `/enrollments` workspace instead of a disconnected screen
- LMS course/group resolution in the managed enrollment flow now uses the selected enrollment context consistently
- Enrollment form submission no longer relies on duplicated lead-level enrollment UI
- Enrollment tests no longer emit React Router future-flag noise during normal runs

## [1.3.1] - 2026-03-29

### Fixed
- Sales users no longer call assignable-user endpoints on lead pages where assignment is not editable for their role
- Payment confirmation dialogs now resolve the student name safely instead of showing `undefined`
- Contact detail LMS action buttons now wrap correctly on narrower layouts
- LMS enrollment screens now warn when the student already appears to be enrolled in the selected course/group

## [1.3.0] - 2026-03-29

### Changed
- LMS enrollment forms now prefill student identity data more reliably from the selected CRM lead, deal, and contact context
- Payment and LMS enrollment screens now explain LMS email requirements and onboarding state directly in the interface
- Contact detail and LMS student summary panels now keep generated onboarding links visible with dedicated copy buttons

## [1.2.3] - 2026-03-29

### Fixed
- Modal forms now reset correctly when closed via `Cancel`, the header `X` button, or backdrop click
- Lead, contact, legacy contact, schedule, payment, task, trial lesson, and user create/edit dialogs no longer keep stale unsaved input after close
- Lead create dialog duplicate-check state now also clears on close, so old duplicate warnings do not remain when reopening the modal

### Notes
- This is a frontend-only patch release on top of `1.2.2`

## [1.2.2] - 2026-03-28

### Changed
- CRM pages now show empty states instead of fabricated sample records when backend requests fail
- Dashboard, reports, and pipeline views now fall back to empty datasets instead of mock metrics

### Removed
- All frontend mock data fallbacks across leads, contacts, deals, tasks, trial lessons, users, retention, dashboard, reports, pipeline, and legacy pages

### Fixed
- Legacy contact list and detail typings now support legacy source values without conflicting with CRM `ContactSource`
- Legacy contact import action now accepts the correct legacy row shape for type-safe lead import

### Notes
- This is a frontend-only patch release on top of `1.2.1`

## [1.2.1] - 2026-03-28

### Changed
- Table pagination now shows clickable page numbers for lead and legacy data lists
- Mobile pagination for lead and legacy data views now also shows page numbers for faster navigation

### Fixed
- Lead search no longer crashes when backend records contain `null` values in searchable text fields
- Legacy data table now shows the record creation date in both desktop and mobile views

### Notes
- This is a frontend-only patch release on top of `1.2.0`

## [1.2.0] - 2026-03-28

### Added
- In-app CRM notifications UI with unread count in the main layout
- Notifications page support for viewing, marking individual notifications as read, and marking all as read
- Inline schedule dialog for planned `call` and `meeting` events from lead and contact detail pages
- Scheduled communication cards on lead and contact detail pages
- Status color indicators for scheduled communications
- Shared frontend helpers for friendly API error messages and datetime normalization

### Changed
- Lead creation now supports self-assignment by default and role-based assignment to sales users for `admin`, `manager`, and `superadmin`
- Lead detail editing now supports updating interested course and related group fields
- Payments table now uses nested `payment.deal.contact.fullName` and deal snapshot data when available
- Call and meeting scheduling now happens inline in the current detail page instead of navigating to the Timeline page
- Scheduling actions on lead and contact detail pages were simplified into a single `Пландоо` action
- Timeline scheduling flow now requires a planned time for `call` and `meeting` events and sends normalized ISO datetimes to the backend

### Fixed
- Payments page no longer falls back to mock data when the backend returns an error or empty result
- Payment-related validation and backend errors now surface as friendly user-facing messages
- Contact detail edit action now opens a working edit flow and refreshes displayed data after save
- Lead and legacy data tables now support pagination for large result sets
- Timeline schedule lists on lead and contact detail pages refresh after creating a new planned event

### Notes
- This frontend release depends on the backend `1.2.0` timeline and in-app notifications changes
- No frontend database migration is required
- Deploy the backend migration for in-app notifications before releasing this frontend version

---

## [1.1.0] - Previous Release

### Added
- Initial CRM frontend functionality
- Core CRM pages and navigation
- Authentication and role-based UI
- Dashboard and operational modules

---

## [1.0.0] - Initial Release

### Added
- Project initialization
- Base React application structure
- Shared UI and routing setup
