# Timetable Card

A custom Home Assistant Lovelace card that displays calendar events in a weekly school-style timetable grid.

[![hacs_badge](https://img.shields.io/badge/HACS-Custom-41BDF5.svg)](https://github.com/hacs/integration)
[![GitHub release](https://img.shields.io/github/v/release/KingDando8430/HA-Timetable-Card)](https://github.com/KingDando8430/HA-Timetable-Card/releases)
[![Latest Release](https://img.shields.io/github/release-date/KingDando8430/HA-Timetable-Card?style=flat&label=Latest%20Release)](https://github.com/KingDando8430/HA-Timetable-Card/releases)
[![Open Issues](https://img.shields.io/github/issues/KingDando8430/HA-Timetable-Card?style=flat&label=Open%20Issues)](https://github.com/KingDando8430/HA-Timetable-Card/issues)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

---

## Features

- 🗓️ **Weekly grid view** — displays events from one or more calendar entities in a clean day-column layout
- 🎨 **Per-entity colors** — assign individual colors to each calendar entity
- 🔑 **Keyword rules** — color, hide, or rename events by keyword
- 📅 **All-day event support** — all-day events are shown separately above the timed grid
- ↔️ **Week navigation** — browse forward and backward by week with the header arrows
- ⏱️ **Flexible time axis** — Event-based or fixed time interval grid
- 📏 **Custom size** - Configurable event size (pixels-per-minute)
- 🔀 **Overlap layout** — overlapping events are displayed side-by-side
- 📍 **Location & notes** — optionally show event location and description
- 📆 **Custom weekdays** — show only the days you need (e.g. Mon–Fri only)
- 🕐 **Time axis position** — place the time column on the left or right
- ⏺️ **Live indicator** - Live "now" indicator line with pulsing badge
- 🔄 **Auto refresh** — card updates automatically or whenever you prefer
- ⚙️ **Visual settings UI** — no YAML required
- 💬 **Multi-Language Support** - Available in English and German

---

## Installation

### HACS (recommended)

1. Open HACS → Frontend → **Custom repositories**
2. Add [`https://github.com/KingDando8430/timetable-card`](https://github.com/KingDando8430/HA-Timetable-Card) as type **Dashboard**
3. Install **Timetable Card**
4. Reload the Browser

### Manual

1. Copy `dist/timetable-card.js` and the `dist/translations/` folder to  
   `config/www/timetable-card/`
2. Add a resource in **Settings → Dashboards → Resources**:
   ```
   URL:  /local/timetable-card/timetable-card.js
   Type: JavaScript module
   ```
3. Reload the browser

---

## Configuration

Add the card via the visual editor or use YAML:

```yaml
type: custom:timetable-card
entities:
  - id: calendar.school
    color: "#03a9f4"
  - id: calendar.sports
    color: "#4CAF50"
weekdays:
  - 0
  - 1
  - 2
  - 3
  - 4
show_location: true
show_notes: true
time_position: left
time_interval: event_based
px_per_min: 1.4
refresh_interval: auto
keywords:
  - keyword: Math
    color: "#1f76f7"
    exact_match: true
    color_mode: border
  - keyword: Cancelled
    color: "#ff0000"
    exact_match: false
    color_mode: block
```

### Options

| Option | Default | Description |
|---|---|---|
| `entities` | `[]` | List of calendar entity IDs with optional `color` |
| `weekdays` | `[0,1,2,3,4,5,6]` | Visible day indices (0 = Monday, 1 = Tuesday, 6 = Sunday) |
| `show_location` | `true` | Show event location below title |
| `show_notes` | `true` | Show event description as third line |
| `time_position` | `left` | Time axis position: `left` or `right` |
| `time_interval` | `event_based` | Grid lines: `event_based`, `15`, `30`, `60` |
| `px_per_min` | `3.6` | Pixel height per minute (controls zoom level) |
| `refresh_interval` | `auto` | Reload interval: `auto`, `5`, `10`, `15`, `30`, `60`, `120`, `180`, `360` minutes |
| `keywords` | `[]` | Keyword rules (see below) |

### Keyword Rule Options

| Option | Default | Description |
|---|---|---|
| `keyword` | — | Text to match against event title |
| `color` | — | Highlight color (hex) |
| `exact_match` | `true` | `true` = exact title match, `false` = contains match |
| `color_mode` | `block` | `block` = filled background, `border` = left border only |
| `hidden` | `false` | Hide matching events completely |
| `rename` | `""` | Override displayed label (empty = no rename) |

---

## Screenshots

<img src="https://raw.githubusercontent.com/KingDando8430/HA-Timetable-Card/main/assets/card-light.jpeg">
<img src="https://raw.githubusercontent.com/KingDando8430/HA-Timetable-Card/main/assets/card-dark.jpeg">

> Timetable Card v1.1.0

---

## File Structure

```
timetable-card/
├── dist/
│   ├── timetable-card.js
│   └── translations/
│       ├── en.json
│       └── de.json
└── ...
```

---

## Works Great With

[WebUntis Integration](https://github.com/JonasJoKuJonas/homeassistant-WebUntis) by [`@JonasJoKuJonas`](https://github.com/JonasJoKuJonas)

> This project is not affiliated with, endorsed, sponsored, or specifically approved by WebUntis.

Examples with WebUntis Integration:

- Regular lessons displayed in the timetable
- Cancelled lessons highlighted in red
- Room changes highlighted in yellow

```
entities:
  - id: calendar.username
  - id: calendar.schulferien
    color: "#e292fe"
time_position: left
show_location: true
show_notes: true
time_interval: event_based
px_per_min: 1.4
keywords:
  - keyword: cancelled
    color: "#ff0000"
    exact_match: false
  - keyword: change
    color: "#f5ec00"
    exact_match: false
  - keyword: Ferien
    rename: Ferien
    exact_match: false
refresh_interval: auto
weekdays:
  - 0
  - 1
  - 2
  - 3
  - 4
type: custom:timetable-card
grid_options:
  rows: auto
  columns: full
```

---

## License

MIT © [KingDando8430](https://github.com/KingDando8430)
