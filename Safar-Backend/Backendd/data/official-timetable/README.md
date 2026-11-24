# Official Bangladesh Railway timetable import

Source: Bangladesh Railway "Time Table No. 54" (effective 10 March 2025), east and west zone
intercity PDFs published on railway.gov.bd (সকল ট্রেনের সময়সূচি). The PDFs are scanned images,
so the stop-by-stop times were transcribed by hand into `trains.json` and checked against the
official start/end times in the same PDFs.

- `trains.json`: 120 intercity trains, every stop with arrival/departure (HHMM).
- `coords.json`: station coordinates, mostly from OpenStreetMap (© OpenStreetMap contributors, ODbL).
  Estimated by hand, not from OSM: Brahmanbaria, Chapainawabganj, Rajbari, Talora, Ullapara, Mobarakganj,
  Boral Bridge, Chandradighalia, Khatra, Manikkhali, Biddyaganj, Jafarshahi, Kendua Bazar.
- `build_sql.py`: turns the two files into `official_timetable.sql` (+ the frontend's stationCoords.js).
- `official_timetable.sql`: replaces stations, routes, trains, timetable and fare distances.

Not included: mail/commuter/local trains (the PDFs only list their end points), the
international trains (Maitree, Bandhan, Mitali) and trains marked "to be introduced in phases".
Fares are approximate: distance units are 40 km of estimated rail distance.

`../../schema.sql` already includes this import; a fresh install only needs `schema.sql`.
To apply it to a database created from the older schema: `psql -d safar -v ON_ERROR_STOP=1 -f official_timetable.sql`
