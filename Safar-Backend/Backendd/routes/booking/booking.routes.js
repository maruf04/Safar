const express = require('express');
const app = express();
const pg = require('../../pg/database.js');

// All rows of the route table, with station names in travel order.
app.get('/', async (req, res) => {
  try {
    const result = await pg.client.query(`
      SELECT r.route_id, r.route_name,
             array_agg(s.station_name ORDER BY o.ord) AS stations
      FROM route r
      CROSS JOIN LATERAL unnest(string_to_array(r.order_of_stations, ' ')::int[]) WITH ORDINALITY AS o(station_id, ord)
      JOIN station s ON s.station_id = o.station_id
      GROUP BY r.route_id, r.route_name
      ORDER BY r.route_name, r.route_id`);
    res.json({ success: true, routes: result.rows });
  } catch (error) {
    console.error('Error fetching routes:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

module.exports = app;
