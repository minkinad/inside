# min.Inside visual system

Inside is an employee experience portal. Its first job is to help colleagues find people, understand the company, and take part in its stories and events. The interface combines an editorial reading rhythm with quick, reliable navigation. It does not use task-tracker grids or ornamental controls.

## Navigation and composition

The persistent desktop sidebar has been replaced by a single top bar: min.Inside brand, implemented sections, search, theme, upcoming events, settings or administration where permitted, and the employee profile. A compact dropdown beside the wordmark identifies min.Inside as the active product and lists min:Ecosys, min:Dev and min:Infra as upcoming. At tablet and phone widths the section links collapse into an accessible menu with the same destinations. The menu closes on route change and Escape. There is no separate bottom navigation. Knowledge and general services remain planned modules; no dead links are shown for them.

Home opens with a personal welcome, a working search trigger, and a restrained min.Inside graphic built in CSS. Directly below are links to People, Organization, Community, Events, Benefits, Brand and personal settings. Company publications form the main reading column; upcoming events, occasions and new colleagues use smaller supporting modules. Search currently covers people, publications, brand materials and benefits, matching the data that exists in the API.

Employee profiles use one large identity header with the photo or initials, name, role, team, location, manager, email action and immutable public ID. Below it, the person's own description, actual role and skills, career history, publications, contacts and interests have distinct hierarchy. The career timeline uses stored events and shows the joined date when no join event exists. No invented duties or clients are displayed: the data model has no separate responsibilities or client fields.

## Tokens and behavior

Tokens remain in `apps/web/src/app/redesign.css`, with top-navigation, Home and profile compositions in `apps/web/src/app/experience.css`. White and pale lavender surfaces support a violet primary, periwinkle and soft blue accents; the welcome area uses a deeper violet. Dark mode has deep neutral surfaces and lighter violet accents. Component accents use the shared `--primary` and `--primary-light` tokens in both themes; the organization diagram uses related connector and grid tokens. The supplied min symbol is used in a compact transparent WebP asset and a small favicon; the wordmark is always `min.Inside`. Iowan/Baskerville/Georgia supports editorial headlines; Inter/system sans is used for controls and the welcome greeting. Borders and spacing establish hierarchy, while focus rings, 44 px touch targets where practical, explicit labels, loading/error/empty states and reduced-motion behavior support everyday use.

Employees start with initials. Photos are shown only after the employee uploads one; the demo seed contains no portraits. Profile media keeps its own aspect treatment and has a readable initials state at desktop and phone widths.

## Browser review

The new Home, profile and navigation were inspected at 1440 × 900, 1024 × 844, 768 × 844, 390 × 844 and 375 × 844 in Chromium, including the dark theme and expanded phone menu. Both pages stayed within the viewport width. The review exposed a hidden mobile wordmark and an unfinished last quick-link row; both were corrected. Playwright covers top navigation, search, public employee links, mobile menu, directory, publishing, administration and personal photo upload. Local screenshots are temporary review artifacts under `/tmp/inside-*`, not seeded product assets.
