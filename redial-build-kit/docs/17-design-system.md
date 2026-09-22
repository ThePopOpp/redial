# 17 · Redial visual system and production UX

## Source identity to preserve
The prototypes use a dark graphite canvas, quiet panels, thin borders, large DM Serif Display headings, Inter body text, Roboto Mono metadata, off-white action surfaces, violet/deep-violet feature cards, pink accents and cyan status accents. The wide desktop sidebar is about 236px; content is spacious rather than densely packed. Preserve that personality instead of adopting Channel Cast's lime highlight or CTRL+P's brand.

Exact sampled source colors: background `#0f1011`; subtle panel `#1a1b1c`; panel `#2e2e2e`; text `#f5f5f7`; secondary `#9f9fa0`; dim `#6a6b6b`; off-white surface `#cacaca`; violet `#847dff`; deep violet `#4b49aa`; pink `#dd90d8`; cyan `#00b3dd`. These are references, not a guarantee of accessible contrast in every pairing.

## Semantic tokens
Use background, foreground, card, muted, border, primary, primary-foreground, accent and destructive semantic tokens mapped into shadcn/Tailwind conventions for the selected version. Avoid hundreds of inline hex declarations. `design/tokens.css` provides source-derived tokens and safer default text for bright violet buttons. Test final pairings rather than treating token adoption as an accessibility audit.

Use the serif for brand and section headings; use readable sans-serif for dense administrative tables, forms and warnings. Metadata may use monospace, but do not reproduce tiny 9–11px essential text from the prototypes. Body text and form labels need accessible sizing/contrast.

## Component inventory
AppShell, WorkspaceSwitcher, GroupedSidebar, MobileNavigation, PageHeader, StatCard, AttentionQueue, CallList, CallOutcomeBadge, CallDetail, TranscriptSegment, RecordingPlayer, ActionMenu, CallbackDialog, ScreeningModeCards, RuleSimulator, AgentEditor, ProviderCard, ConnectionWizard, RouteDiagram, UsageMeter, PlanCard, BillingSummary, ConsentControl, PermissionGrantDialog, Customer360, CampaignPreview, ApprovalCard, IncidentBanner and EmptyState.

Build shared primitives using reviewed shadcn components: Button, Input, Label, Select, Dialog, Sheet, Tabs, Table, DropdownMenu, Accordion, Tooltip, Alert, Toast and form-validation patterns. Do not implement a toggle as a clickable unlabeled `div`. Business tables need real headers and keyboard-accessible actions.

## Responsive behavior
Public navigation collapses on mobile. Desktop member/ops sidebar becomes a drawer or bottom navigation as appropriate. Card grids become one column; dialogs become mobile sheets; long phone numbers and transcript content wrap. Tables provide purposeful compact mobile rows or scrolling inside their own region, not page-wide overflow. Live-call controls stay reachable without blocking the transcript or OS safe areas.

Test widths 360, 390, 768, 1024 and 1440px, zoom, large text, keyboard-only navigation and reduced motion. Do not force 60px headings or 56px content padding onto a phone.

## Product states
Provider badges distinguish planned, needs setup, verifying, connected, limited, degraded, disconnected and disabled. Live/recording indicators use text/icons in addition to color. Paid features explain whether the limitation is plan, unsupported provider, missing consent or missing permission. Empty state copy helps a member take the next real step rather than showing mock completed calls.

## Core microcopy
- Routing limited: “Redial receives calls your carrier forwards. Your phone may ring before forwarding.”
- No route: “Your number is not connected yet. Complete a test call before enabling screening.”
- Payment pending: “We are confirming your payment. Your subscription is not active yet.”
- Quota reached: “AI screening has reached this month's limit. Your configured fallback is still in place.”
- Permission: “You manage this membership, but this person's call content is private.”
- Recording off: “Audio recordings are not saved. Your selected AI processing and transcript settings still apply.”
- Prototype/demo: “Illustrative call. No real caller or live service activity.”

## Brand and content governance
Public spelling defaults to Redial; official product names retain their own capitalization. Carrier/provider logos require appropriate usage rights and must not imply partnership. Use real approved support/sender addresses and verified download links. Preserve the supplied mockups under references and keep production content in the CMS/source files with a review trail.

## v1.1 · Named control components

Add LiveCallControlBar, InsiderListenButton, GavelTakeoverDialog, AudibleComposer, GuidanceDeliveryBadge, DirectoryTransferSheet, DirectoryDestinationForm, ParticipantList, CallHandlingStatus and TransferProgress. Preserve the source graphite/violet identity and plain-language labels. Use confirmation and pending states for destructive/routing changes, accessible status announcements without reading transcript content aloud, and touch-friendly targets. Icons are secondary: Headphones, Hand/Phone, MessageSquare and Contact/Route candidates may be drawn from the existing icon set. Do not rely on color or a gavel icon alone to explain speaking ownership.
