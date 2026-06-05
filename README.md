# Timetable Card — Home Assistant Lovelace Card

A fully customizable Home Assistant Lovelace card that displays calendar events as a weekly timetable grid. Supports multiple calendar entities, keyword-based coloring, event hiding/renaming, overlap layout, and week navigation — with a polished settings UI.

## Features

- 🗓️ **Weekly grid view** — displays events from one or more calendar entities in a clean day-column layout
- 🎨 **Per-entity colors** — assign individual colors to each calendar entity
- 🔑 **Keyword rules** — color, hide, or rename events by keyword (exact or partial match, block or border mode)
- 📅 **All-day event support** — all-day events are shown separately above the timed grid
- ↔️ **Week navigation** — browse forward and backward by week with the header arrows
- ⏱️ **Flexible time axis** — event-based or fixed intervals (15, 30, 60 min); configurable pixels-per-minute
- 🔀 **Overlap layout** — overlapping events are displayed side-by-side without clipping
- 📍 **Location & notes** — optionally show event location and description
- 📆 **Custom weekdays** — show only the days you need (e.g. Mon–Fri only)
- 🕐 **Time axis position** — place the time column on the left or right
- 🔄 **Auto refresh** — card updates automatically; configurable refresh interval
- ⚙️ **Visual settings UI** — Apple/HA-style editor with live preview, no YAML required

## Installation

### HACS (Recommended)

1. Add the repository to HACS as a **Frontend** resource

2. Download the card via HACS and restart Home Assistant if prompted
3. Add the card to your dashboard via the card picker or manually

### Manual

1. Download `timetable-card.js` from the [latest release](https://github.com/KingDando8430/timetable-card/releases)
2. Copy it to `/config/www/`
3. Add it as a resource in your dashboard settings:
- **URL:** `/local/timetable-card.js`
- **Type:** JavaScript module
4. Add the card to your dashboard

## Configuration

All options are available via the visual editor. YAML configuration is also supported.

### Minimal example

```yaml
type: custom:timetable-card
entities:
  - calendar.my_calendar
```

### Full example

```yaml
type: custom:timetable-card
entities:
  - id: calendar.school
    color: "#03a9f4"
  - id: calendar.work
    color: "#e91e63"
time_position: left
show_location: true
show_notes: false
time_interval: "30"
px_per_min: 3.6
weekdays: [0, 1, 2, 3, 4]
refresh_interval: auto
keywords:
  - keyword: Sport
    color: "#4CAF50"
    color_mode: border
    exact_match: false
    hidden: false
  - keyword: Holiday
    color: "#FF9800"
    color_mode: block
    exact_match: true
    hidden: false
    rename: "🏖️ Holiday"
  - keyword: Cancelled
    hidden: true
```

## Options

|Option            |Type                              |Default      |Description                                                                                           |
|------------------|----------------------------------|-------------|------------------------------------------------------------------------------------------------------|
|`entities`        |list                              |`[]`         |Calendar entities. Each entry can be a string (entity ID) or an object with `id` and optional `color`.|
|`time_position`   |`left` / `right`                  |`left`       |Position of the time axis column                                                                      |
|`show_location`   |boolean                           |`true`       |Show the event location below the title                                                               |
|`show_notes`      |boolean                           |`true`       |Show the event description/notes                                                                      |
|`time_interval`   |`event_based` / `15` / `30` / `60`|`event_based`|Time grid lines; `event_based` only shows lines at event boundaries                                   |
|`px_per_min`      |number                            |`3.6`        |Pixel height per minute — controls the vertical scale of the grid                                     |
|`weekdays`        |list of integers                  |`[0–6]`      |Which days to show (0 = Monday … 6 = Sunday)                                                          |
|`refresh_interval`|`auto` / number (seconds)         |`auto`       |How often the card polls for updated events                                                           |
|`keywords`        |list                              |`[]`         |Keyword rules — see [Keyword Rules](#keyword-rules)                                                   |

## Keyword Rules

Each entry in `keywords` supports the following fields:

|Field        |Type              |Default  |Description                                                                                          |
|-------------|------------------|---------|-----------------------------------------------------------------------------------------------------|
|`keyword`    |string            |—        |The keyword to match against the event title (and description if `exact_match: false`)               |
|`color`      |hex string        |`#4CAF50`|Color applied to matching events                                                                     |
|`color_mode` |`block` / `border`|`block`  |`block` fills the event background; `border` adds a colored left border only                         |
|`exact_match`|boolean           |`true`   |If `true`, only exact title matches are colored. If `false`, matches anywhere in title or description|
|`hidden`     |boolean           |`false`  |If `true`, matching events are hidden entirely                                                       |
|`rename`     |string            |`""`     |If set, the event title is replaced with this text in the card                                       |

Rules are evaluated top-to-bottom; the first match wins.

## Folder structure

```
/config/
  www/
    timetable-card.js    ← card resource
```

## License

MIT License – see <LICENSE>
