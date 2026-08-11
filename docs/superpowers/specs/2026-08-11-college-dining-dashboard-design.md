# Cambridge College Dining Dashboard Design

## Purpose

Build a public, GitHub-hosted webpage that checks official University of Cambridge college dining sources whenever the page loads. The first release covers Churchill College and St Edmund's College and answers, for a user-selected date, whether breakfast, brunch, lunch, and dinner are available.

The page must always show the selected weekday and date, availability, serving time, menu, notes or restrictions, the time the source was checked, and a visible link to the official source. Missing information must be identified explicitly rather than represented by a blank field.

## Authoritative Sources

### Churchill College

- Public page: <https://www.chu.cam.ac.uk/about/campus/dining-at-college/lunch-and-dinner-menu/>
- WordPress REST representation: <https://www.chu.cam.ac.uk/wp-json/wp/v2/pages/1305>

The REST response contains the week commencing date, one table per published day, Dining Hall hours, lunch and dinner menu cells, and notes embedded in the page content.

### St Edmund's College

- Weekly menu archive: <https://my.st-edmunds.cam.ac.uk/category/menus/>
- Weekly menu REST posts: <https://my.st-edmunds.cam.ac.uk/wp-json/wp/v2/posts?categories=69>
- Recurring catering schedule: <https://my-cr.st-edmunds.cam.ac.uk/facilities/catering/>
- Catering schedule REST page: <https://my-cr.st-edmunds.cam.ac.uk/wp-json/wp/v2/pages/18>

The newest applicable weekly post supplies the week commencing date, dated service changes or restrictions, and official lunch and dinner PDF links. The catering page supplies the recurring breakfast, brunch, lunch, and dinner schedule.

## Selected Architecture

The application will be a static TypeScript site built with Vite and deployed to GitHub Pages from a public GitHub repository. It has no application server and no central database.

On every page load and explicit refresh, the browser requests all official WordPress REST endpoints with browser caching disabled. The site therefore displays the newest response currently served by each college. It cannot make the result fresher than a college's own web server or CDN cache.

The official REST endpoints were verified to allow cross-origin requests from a GitHub Pages-style origin. St Edmund's PDF files do not provide the same cross-origin access, so version one embeds or links those PDFs without attempting client-side text extraction.

The browser stores the last successful normalized result for each college in local storage. This data is used only as a clearly marked fallback when a live request fails. The public repository stores application code, source configuration, and public test fixtures; it does not store a history of live meal data.

## Components

### Source clients

Small source clients own endpoint URLs and HTTP behavior. They return source response text or JSON plus retrieval metadata. A failure in one client does not prevent the other college from loading.

### Churchill adapter

The Churchill adapter parses the REST page's rendered HTML with `DOMParser`. It identifies the published week and day tables, then extracts each date, meal time, menu items, and notes. It never injects source HTML into the application DOM.

### St Edmund's adapter

The St Edmund's adapter combines two sources:

1. It parses the recurring timetable from the catering REST page.
2. It selects the newest weekly menu post whose week covers the selected date, then extracts dated timing changes, closures, restrictions, and the official lunch and dinner PDF URLs.

Dated weekly changes override the recurring timetable. If a weekly post cannot be matched confidently to the selected date, the adapter returns unknown rather than applying a possibly incorrect menu.

### Normalizer

Both adapters return the same domain model. A daily record contains:

- college identifier and display name;
- selected ISO date and localized weekday;
- Cambridge timezone;
- one record for breakfast, brunch, lunch, and dinner;
- sanitized college-wide and selected-day notices that cannot be assigned to one meal;
- source URLs;
- source modification time when published;
- live retrieval time;
- freshness state: live or stale fallback.

Each meal record contains:

- meal type;
- availability state: `available`, `closed`, or `unknown`;
- serving time or the explicit value `Time not published`;
- menu representation: structured items, official embedded PDF, or an explicit missing-state message;
- notes or restrictions, including the explicit value `No special notes published`;
- direct official source and menu links when applicable.

Blank menu cells do not prove that a meal is closed. Availability is derived from an explicit dated schedule or a valid recurring schedule. Ambiguous evidence produces `unknown`.

### Cache

The cache stores a schema version, college identifier, normalized records, source URLs, and retrieval timestamp. Cache entries are replaced only after a complete, valid parse for that college. Cached content is never labeled as live.

### User interface

The page defaults to today's date in `Europe/London`. It provides a date picker, previous-day and next-day controls, a Today shortcut, and a manual refresh control.

Churchill and St Edmund's appear side by side on wider screens and stack on smaller screens. Each college card always displays:

- college name;
- selected weekday and full date;
- source freshness and last-checked time;
- breakfast, brunch, lunch, and dinner sections;
- availability for every meal;
- serving time for every meal;
- menu content, embedded PDF, or an explicit menu status;
- notes and restrictions for every meal;
- a prominent notices area for published college-wide or selected-day information;
- a visible `View official source` link.

St Edmund's also displays `Open official lunch menu PDF` and `Open official dinner menu PDF` links when published. All external links open in a new tab with safe opener isolation. The PDF embed includes a link fallback for browsers that cannot display it.

Dates outside a confidently published period remain selectable, but the affected fields display unknown or not-published messages. The application does not invent or extrapolate menus.

## Data Flow

1. Determine the selected date in the Cambridge timezone.
2. Render independent loading states for both colleges.
3. Fetch the official REST sources in parallel with caching disabled.
4. Parse each college through its own adapter.
5. Validate and normalize the result.
6. Save each valid college result to its own last-successful cache entry.
7. Render all mandatory fields and official verification links.
8. If a college fails, render its failure state and, when present, its visibly stale cached result without affecting the other college.

Changing the selected date reuses the most recently fetched source payload during the current page session. A manual refresh or full reload fetches the official sources again.

## Failure Handling and Claim Boundaries

- A network, CORS, HTTP, or parse failure is shown by college and never becomes a global blank page.
- A stale fallback shows its original retrieval time and a prominent stale-data warning.
- A source week/date mismatch produces unknown availability and `Menu not published for this date`.
- A missing menu does not change an otherwise explicit meal schedule to closed.
- An explicit closure overrides the recurring schedule and menu.
- Dated timing notes override recurring hours for the affected date and meal.
- A published notice that cannot be mapped safely to one meal remains visible as a college-wide or selected-day notice; it is not discarded.
- Source modification time and live retrieval time are kept distinct.
- Users can always open the official source to verify the interpretation.
- Source markup is parsed as data and never injected as executable HTML.

## Testing Strategy

### Unit tests

- Churchill fixture parsing for week dates, all day tables, meal times, menu items, empty cells, and notes.
- St Edmund's recurring timetable parsing.
- St Edmund's weekly post selection, PDF link extraction, dated time overrides, closures, and restrictions.
- British ordinal dates, week boundaries, leap days, and `Europe/London` daylight-saving transitions.
- Normalization rules for available, closed, unknown, and all explicit missing-field values.
- Cache schema validation and stale labeling.

### Component and integration tests

- Every college/day view renders weekday, full date, four meal types, availability, time, menu, meal notes, general notices, official source link, and last-checked time.
- Structured Churchill menus and embedded/linked St Edmund's PDFs render through the shared model.
- A failure in one college does not hide the other.
- A stale fallback cannot be mistaken for live data.
- Date controls and manual refresh trigger the intended data flow.
- External links use safe new-tab attributes.

### Build and live smoke checks

- Type checking, automated tests, and the production Vite build pass.
- The built site works at a GitHub Pages project subpath.
- Live official endpoints respond to a GitHub Pages-style cross-origin request.
- Desktop and mobile layouts are manually inspected.
- A current date is compared with all official source pages and PDFs before release.

## Deployment and Repository

The repository will use a `main` branch and a GitHub Actions workflow that builds the static application and deploys the output to GitHub Pages. Pulling dining data is a browser runtime operation, not a scheduled workflow.

No secrets are required. The README will explain local development, testing, deployment, the authoritative sources, freshness semantics, and the limitation that college website changes can require adapter updates.

## Version One Scope

Version one includes:

- Churchill College and St Edmund's College;
- live retrieval on page load and manual refresh;
- date navigation;
- mandatory date, weekday, availability, time, menu, notes/restrictions, freshness, and official links;
- structured Churchill menus;
- embedded and directly linked St Edmund's menu PDFs;
- independent failure states and last-successful browser fallback;
- automated tests and GitHub Pages deployment configuration.

Version one does not include user accounts, a server, a database, notifications, historical change tracking, automated PDF text extraction, or colleges beyond the initial two.

## Acceptance Criteria

The version-one implementation is complete only when:

1. A reload requests current official data for both colleges.
2. A user can select a date and see Churchill and St Edmund's separately.
3. Every college/day view visibly includes the weekday and date, all four meal categories, availability, serving time, menu status or content, meal notes/restrictions, any published college-wide or selected-day notices, last-checked time, and an official source link.
4. Churchill's published daily menu items appear as structured text.
5. St Edmund's applicable weekly post is selected by date; its exceptions are applied and its official lunch and dinner PDFs are embedded or directly linked.
6. Missing or ambiguous data is labeled unknown or not published and is never silently inferred.
7. A single-source failure leaves the other college usable and labels any cached fallback as stale.
8. Automated parser, model, UI, and failure-state tests pass.
9. The production build works from the configured GitHub Pages base path.
10. A manual comparison against current official pages confirms the displayed dates, times, menus, notes, and links.
