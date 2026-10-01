# Timetable Card

A custom Home Assistant Lovelace card that displays calendar events in a weekly school-style timetable grid.

[![hacs_badge](https://img.shields.io/badge/HACS-Default-41BDF5.svg)](https://github.com/hacs/default)
[![GitHub release](https://img.shields.io/github/v/release/KingDando8430/HA-Timetable-Card)](https://github.com/KingDando8430/HA-Timetable-Card/releases)
[![Latest Release](https://img.shields.io/github/release-date/KingDando8430/HA-Timetable-Card?style=flat&label=Latest%20Release)](https://github.com/KingDando8430/HA-Timetable-Card/releases)
[![Open Issues](https://img.shields.io/github/issues/KingDando8430/HA-Timetable-Card?style=flat&label=Open%20Issues)](https://github.com/KingDando8430/HA-Timetable-Card/issues)
[![GitHub stars](https://img.shields.io/github/stars/KingDando8430/HA-Timetable-Card?style=flat&label=Stars)](https://github.com/KingDando8430/HA-Timetable-Card/stargazers)
[![Website](https://img.shields.io/badge/Website-OPEN_HERE-blue)](https://kingdando8430.github.io/HA-Timetable-Card/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

---

## Features

* 🗓️ **Weekly timetable view** — shows events from one or multiple calendar entities in a clear weekly layout
* 🎨 **Custom entity colors** — set a different color for each calendar entity
* 🔑 **Keyword-based rules** — change colors, hide events, or rename them based on keywords
* ✏️ **Partial renaming** — replace only the keyword or a custom text string within event titles
* 📅 **All-day events** — displayed separately above the regular timetable
* ↔️ **Week navigation** — switch between weeks using the arrows in the header
* 🏠 **Today button** — jump back to the current week with one tap
* 🔍 **Event detail popup** — tap any event to see all details like name, time, location,...
* ⏱️ **Flexible time grid** — choose between an event-based or fixed time interval layout
* 📏 **Adjustable event size** — customize the height of events with pixels-per-minute settings
* 🔀 **Overlap support** — overlapping events are shown side by side
* 📍 **Location and notes** — optionally display event locations and descriptions
* 📆 **Custom weekdays** — show only the days you want, such as Monday to Friday
* ⏺️ **Live "Now" indicator** — highlights the current time with a live indicator line
* 🎯 **Flexible keyword matching** — match against the event name, description, or location
* ✂️ **First/last day only** — collapse multi-day all-day events down to just their first or last day
* ⏭️ **Auto-switch week** — automatically jumps to the next week once the visible days are over
* 🔁 **Dynamic day view** — show a rolling window (e.g. today + the next 2 days) instead of a fixed week
* ➕ **Quick add-event button** — optionally add a floating button to create new calendar events without leaving the card
* 🗂️ **Calendar filter** — optionally show or hide single calendars from a button next to the title; the selection is remembered in the browser
* 🕓 **Custom time window** — show only a chosen time range (e.g. 08:00–16:00) and optionally get a small `+n` hint for events outside of it

---

## Installation

### HACS (recommended)

[![Open your Home Assistant instance and open a repository inside the Home Assistant Community Store.](https://my.home-assistant.io/badges/hacs_repository.svg)](https://my.home-assistant.io/redirect/hacs_repository/?owner=KingDando8430&repository=HA-Timetable-Card&category=plugin)

1. Open HACS in Home Assistant
2. Search for **Timetable Card** in HACS
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

Add the card via the visual editor or use the code editor.

### Code example:

```yaml
type: custom:timetable-card
title: My Timetable
entities:
  - id: calendar.school
    color: "#03a9f4"
  - id: calendar.sports
    color: "#4CAF50"
  - id: calendar.webuntis_max
    device_id: 088b5755644095d477f2de
weekdays:
  - Mon
  - Tue
  - Wed
  - Thu
  - Fri
show_location: true
show_notes: true
time_position: left
time_interval: event_based
px_per_min: 1.4
refresh_interval: auto
show_create_event_button: false
keywords:
  - keyword: Math
    color: "#1f76f7"
    exact_match: true
    color_mode: border
  - keyword: Cancelled
    color: "#ff0000"
    exact_match: false
    color_mode: block
  - match_mode: presence
    match_source: description
    presence: has
    color: "#9c27b0"
```

### Options

| Option | Default | Description |
|---|---|---|
| `entities` | `[]` | List of calendar entity IDs with optional `color` |
| `title` | `""` | Custom header text (empty = the built-in "Timetable" label) |
| `weekdays` | `[Mon,Tue,Wed,Thu,Fri,Sat,Sun]` | Visible weekdays: `Mon`…`Sun` |
| `dynamic_start` | `today` | Start of the rolling day view: `today` or `tomorrow` |
| `dynamic_count` | — | With `dynamic_start`: how many consecutive days to show — `dynamic_count: 1` alone means today, 1 day |
| `show_location` | `true` | Show event location below title |
| `show_notes` | `true` | Show event description as third line |
| `show_calendar` | `true` | Show the calendar name in the event popup |
| `show_now_line` | `true` | Show the moving current-time line |
| `time_position` | `left` | Time axis position: `left` or `right` |
| `time_interval` | `event_based` | Time labels and grid lines: `event_based` (at every event start/end) or a fixed `15`, `30`, `60` minute interval (labels only at these intervals) |
| `px_per_min` | `1.4` | Pixel height per minute (controls zoom level) |
| `refresh_interval` | `auto` | Reload interval: `auto`, `5`, `10`, `15`, `30`, `60`, `120`, `180`, `360` minutes |
| `first_day_only` | `false` | Show multi-day all-day events only on their first day |
| `last_day_only` | `false` | Show multi-day all-day events only on their last day |
| `show_description_indicator` | `false` | Show a small ⓘ on events that have a description |
| `auto_switch_week` | `false` | Automatically show next week once the selected weekdays have passed (Fixed weekdays only) |
| `show_create_event_button` | `false` | Show a floating button on the card for quickly adding a new calendar event |
| `show_calendar_filter` | `false` | Show a calendar-filter button next to the title to show or hide single calendars (needs at least two calendars). The selection is stored in the browser |
| `time_range` | — | Show only a time window: `start` and `end` as `HH:MM`. Events outside of it are left out, events crossing its edges are cut off. Not set = automatic |
| `show_out_of_range_hint` | `false` | With `time_range`: show a small `+n` badge at the top/bottom of a day for events before/after the window |
| `fontsize` | — | Text size in px per element (see below) |
| `keywords` | `[]` | Keyword rules (see below) 

### Font Size Options

`fontsize` is a list with one entry per element. Only the elements you want to change need to be listed:

```yaml
fontsize:
  - title: 16
  - event_title: 12
```

| Element | Default (px) |
|---|---|
| `title` | `14.5` |
| `timestamps` | `8.5` |
| `event_title` | `11` |
| `event_description` | `9` |
| `event_location` | `9.5` |

### Keyword Rule Options

| Option | Default | Description |
|---|---|---|
| `keyword` | — | Text to match against the selected source. In YAML this can also be a list — an event matches when any entry matches |
| `color` | — | Highlight color (hex) |
| `exact_match` | `true` | `true` = exact match, `false` = contains match |
| `color_mode` | `block` | `block` = filled background, `border` = left border only |
| `match_source` | event name | What to match against: event name, `description`, or `location` |
| `match_mode` | `keyword` | Set to `presence` to ignore `keyword` and just check whether `match_source` has a value |
| `presence` | `has` | With `match_mode: presence`: `has` = field must contain something, `none` = field must be empty |
| `hidden` | `false` | Hide matching events completely |
| `rename` | `""` | Override displayed label (empty = no rename) |
| `partial_rename_enabled` | `false` | Replace only a part of the label instead of the whole label |
| `partial_rename_mode` | `keyword` | `keyword` = replaces the keyword in the label, `text` = replaces a custom string |
| `partial_rename_text` | `""` | The specific text to replace when `partial_rename_mode` is `text` |

Several keywords can share one rule by listing them (YAML only):

```yaml
keywords:
  - keyword:
      - change
      - irregular
    color: "#21b15e"
    exact_match: false
    color_mode: block
  - keyword: cancelled
    color: "#ff0000"
```

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

[WebUntis Integration](https://github.com/JonasJoKuJonas/homeassistant-WebUntis) by [@JonasJoKuJonas](https://github.com/JonasJoKuJonas)

> This project is not affiliated with, endorsed, sponsored, or specifically approved by WebUntis.

Timetable Card natively recognizes WebUntis devices.
See the [WebUntis x Timetable Card Documentation](https://github.com/KingDando8430/HA-Timetable-Card/blob/main/documentation/WebUntis.md) for more information.

Examples with WebUntis Integration:

- Regular lessons displayed in the timetable
- Cancelled lessons highlighted in red
- Room changes highlighted in yellow

---

## License

MIT © [KingDando8430](https://github.com/KingDando8430)
