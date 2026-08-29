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
| `room_display` | `short` | `short` or `long` room names in lesson locations |

### Automatic Look-ahead

> [!Warning]
> To many lookups could result in an temporary login-error, where your WebUntis Account is blocked for a few hours.

The WebUntis calendar entity only covers the upcoming 30 days. Once you navigate past the last known lesson, Timetable Card automatically requests for additional timetable data.

While a lookup is running, an <img src="https://raw.githubusercontent.com/Templarian/MaterialDesign/master/svg/alpha-u-box.svg" width="15" height="15" alt="WebUntis lookup"> icon is shown in the header.



If a lookup fails or after two lookups without any lessons, automatic look-ahead stops. A <img src="https://raw.githubusercontent.com/Templarian/MaterialDesign/master/svg/cloud-cancel.svg" width="15" height="15" alt="No timetable data"> icon is shown instead. In both cases, the card falls back to the data already provided by the calendar entity.

A manual refresh resets the look-ahead stop.

## --- 

When you like the [Timetable Card](https://github.com/KingDando8430/HA-Timetable-Card) together with the [WebUntis integration](https://github.com/JonasJoKuJonas/homeassistant-WebUntis), please star *both* of our repositories.
