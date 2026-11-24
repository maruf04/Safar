const express = require('express');
const app = express();
const pg = require('../../pg/database.js');

// Every train with its stops in travel order.
// Used by the home page (popular routes, departure board, network map).
app.get('/', async (req, res) => {
  try {
    const result = await pg.client.query(`
      SELECT t.train_code, t.name, t.off_day, s.station_name,
             tt.arrival_time, tt.departure_time, o.ord
      FROM train t
      JOIN route r ON r.route_id = t.route_id
      CROSS JOIN LATERAL unnest(string_to_array(r.order_of_stations, ' ')::int[]) WITH ORDINALITY AS o(station_id, ord)
      JOIN time_table tt ON tt.train_code = t.train_code AND tt.station_id = o.station_id
      JOIN station s ON s.station_id = o.station_id
      ORDER BY t.train_code, o.ord`);

    const trains = [];
    let current = null;
    for (const row of result.rows) {
      if (!current || current.train_code !== row.train_code) {
        current = { train_code: row.train_code, name: row.name, off_day: row.off_day, stops: [] };
        trains.push(current);
      }
      current.stops.push({ station: row.station_name, arrival: row.arrival_time, departure: row.departure_time });
    }
    res.json({ success: true, trains });
  } catch (error) {
    console.error('Error fetching network:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

module.exports = app;
