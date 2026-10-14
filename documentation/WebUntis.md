# WebUntis x Timetable Card

Timetable Card has native support for the [WebUntis Home Assistant integration](https://github.com/JonasJoKuJonas/homeassistant-WebUntis) developed by [@JonasJoKuJonas](https://github.com/JonasJoKuJonas).

> This project is not affiliated with, endorsed, sponsored, or specifically approved by WebUntis.

### Setup

### Card Picker from Entity

Select the `Timetable Card - WebUntis` in the entity-based Card picker or select an Entity from the WebUntis Integration in the Visual Editor.
> When adding a WebUntis calendar with the entity-based card picker, you'll see `Timetable Card` and `Timetable Card - WebUntis`. Both the same card — one treats it as normal entity and one as WebUntis entity. 

### WebUntis Entities

| Entity Option | Default | Description |
|---|---|---|
| `device_id` | — | Set automatically when adding a WebUntis device |
| `subject_display` | `short` | `short` or `long` subject names in lesson titles |
| `teacher_display` | `hide` | `short`, `long` or `hide` names of your teachers (see [Teacher names](#teacher-names)) |
| `room_display` | `short` | `short`, `long` or `hide` room names in lesson locations |

> The subject is the lesson title, so `subject_display` has no `hide` option.

### Advanced WebUntis Features

In the visual editor, every WebUntis device has an *Advanced WebUntis Features* page with the display options above. You can deactivate these, by using the red button at the very bottom of the page. The calendar then behaves like any other calendar, without Advanced WebUntis Features (for example: teacher names and without look-ahead). To use the WebUntis features again, remove the entity and add it again.

### Teacher names

Teacher names are read from the calendar description. In the WebUntis integration settings, set the calendar description to **JSON**. The card then shows the teachers of every lesson the calendar entity provides, and of the look-ahead lessons.

The description is only used for the names and the lesson's info text. The raw JSON is never displayed.

When you open *Advanced WebUntis Features* of a WebUntis device in the visual editor, the card checks up to three existing calendar events for the JSON description. If none has it, the teacher setting is switched off and teacher names stay hidden. The check does not use the look-ahead and does not run on the dashboard.

> [!Note]
> `teacher_display` now defaults to `hide`. If you used the previous default, set `short` or `long` again.

### Automatic Look-ahead

> [!Warning]
> To many lookups could result in an temporary login-error, where your WebUntis Account is blocked for a few hours.

The WebUntis calendar entity's own background sync usually only covers a few weeks ahead. Timetable Card checks how far that native sync actually reaches. Only when the week you are looking at has an empty day beyond that range, it requests the missing WebUntis lessons directly — starting exactly at the first day without data and reaching up to 12 weeks from now. A free day inside the range of the calendar entity (a day off, a weekend) never causes a lookup, and neither does simply opening the card. Days already covered by the calendar entity itself are never queried again. A short pause with no lessons (e.g. a school holiday) followed by more lessons later is recognized correctly and does **not** trigger a lookup, since that data is already known.

While a lookup is running, an <img src="https://raw.githubusercontent.com/Templarian/MaterialDesign/master/svg/alpha-u-box.svg" width="15" height="15" alt="WebUntis lookup"> icon is shown in the header.

If a lookup fails, or a full look-ahead finds no lessons, further automatic lookups pause. A <img src="https://raw.githubusercontent.com/Templarian/MaterialDesign/master/svg/cloud-cancel.svg" width="15" height="15" alt="No timetable data"> icon is shown instead. In both cases, the card falls back to the data already provided by the calendar entity.

A manual refresh resets the look-ahead stop.

## ⭐️

When you like the [Timetable Card](https://github.com/KingDando8430/HA-Timetable-Card) together with the [WebUntis integration](https://github.com/JonasJoKuJonas/homeassistant-WebUntis), please star *both* of our repositories.
