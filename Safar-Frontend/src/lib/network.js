import { useEffect, useState } from 'react';
import { API_URL } from '../components/utils';

// Every train with its stops, from /booking/network. Cached for the session.
let cache = null;
let pending = null;

const load = () => {
  if (cache) return Promise.resolve(cache);
  if (!pending) {
    pending = fetch(`${API_URL}/booking/network`)
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(`HTTP ${r.status}`))))
      .then((d) => { cache = d.trains || []; return cache; })
      .finally(() => { pending = null; });
  }
  return pending;
};

export const useNetwork = () => {
  const [state, setState] = useState({ trains: cache, loading: !cache, error: '' });
  useEffect(() => {
    if (cache) return undefined;
    let alive = true;
    load()
      .then((trains) => alive && setState({ trains, loading: false, error: '' }))
      .catch((e) => alive && setState({ trains: null, loading: false, error: e.message }));
    return () => { alive = false; };
  }, []);
  return state;
};

const WEEKDAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

// Current weekday and minutes since midnight in Bangladesh time, whatever the viewer's timezone
export const dhakaNow = () => {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Asia/Dhaka', weekday: 'long', hour: '2-digit', minute: '2-digit', hourCycle: 'h23',
  }).formatToParts(new Date());
  const get = (type) => parts.find((p) => p.type === type)?.value;
  return { weekday: get('weekday') || WEEKDAYS[new Date().getDay()], minutes: Number(get('hour')) * 60 + Number(get('minute')) };
};

export const runsOn = (train, weekday) =>
  !train.off_day || String(train.off_day).toLowerCase() !== String(weekday).toLowerCase();

export const toMinutes = (t) => {
  const [h, m] = String(t || '').split(':').map(Number);
  return h * 60 + m;
};

// Trains that call at `from` and later at `to`
export const trainsBetween = (trains, from, to) =>
  (trains || []).flatMap((train) => {
    const i = train.stops.findIndex((s) => s.station === from);
    const j = train.stops.findIndex((s) => s.station === to);
    if (i === -1 || j === -1 || i >= j) return [];
    return [{ train, dep: train.stops[i].departure, arr: train.stops[j].arrival }];
  });

// Stations a train passes (without stopping) between two of its stops, taken from the
// train that stops most often on that stretch. Lets express trains follow the real track
// on the map instead of drawing a straight line across the country.
const between = (trains, a, b, depth) => {
  let best = [];
  for (const train of trains) {
    const i = train.stops.findIndex((s) => s.station === a);
    if (i === -1) continue;
    const j = train.stops.findIndex((s) => s.station === b);
    if (j === -1 || Math.abs(j - i) < 2) continue;
    const mid = i < j ? train.stops.slice(i + 1, j) : train.stops.slice(j + 1, i).reverse();
    if (mid.length > best.length) best = mid;
  }
  const names = best.map((s) => s.station);
  if (!names.length || depth >= 3) return names;
  return trackPath(trains, [a, ...names, b], depth + 1).slice(1, -1);
};

export const trackPath = (trains, stations, depth = 0) => {
  if (!trains?.length || stations.length < 2) return stations;
  const out = [stations[0]];
  for (let k = 1; k < stations.length; k++) {
    out.push(...between(trains, stations[k - 1], stations[k], depth), stations[k]);
  }
  return out;
};

// Routes from the database's route table (/booking/routes), shown once each in the home page dropdown.
// Rows with the same name that run on the same track are the same route (the one with most stations
// is kept); rows with the same name over a different track get a "via" station.
let routesCache = null;
export const useRoutes = () => {
  const [state, setState] = useState({ routes: routesCache, loading: !routesCache, error: '' });
  useEffect(() => {
    if (routesCache) return undefined;
    let alive = true;
    fetch(`${API_URL}/booking/routes`)
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(`HTTP ${r.status}`))))
      .then((d) => {
        routesCache = uniqueRoutes(d.routes || []);
        if (alive) setState({ routes: routesCache, loading: false, error: '' });
      })
      .catch((e) => alive && setState({ routes: null, loading: false, error: e.message }));
    return () => { alive = false; };
  }, []);
  return state;
};

const VIA_NAMES = ['Bhanga', 'Tangail', 'Ibrahimabad', 'Narail', 'Faridpur', 'Kushtia_Court', 'Ishwardi', 'Natore', 'Bogura', 'Mymensingh', 'Bhairab_Bazar', 'Cumilla', 'Feni'];

// Which big river crossing a line uses: lines over different bridges are different routes
const crossing = (stations) => {
  if (stations.some((st) => ['Bhanga', 'Padma', 'Mawa'].includes(st))) return 'padma';
  if (stations.some((st) => ['Ibrahimabad', 'Tangail', 'Shahid_M_Monsur_Ali', 'Jamtail', 'Ullapara'].includes(st))) return 'jamuna';
  return '';
};

export const uniqueRoutes = (rows) => {
  const byName = new Map();
  rows.forEach((r) => {
    if (!byName.has(r.route_name)) byName.set(r.route_name, []);
    byName.get(r.route_name).push(r);
  });
  const out = [];
  byName.forEach((list, name) => {
    list.sort((a, b) => b.stations.length - a.stations.length);
    const kept = [];
    list.forEach((r) => {
      const cr = crossing(r.stations);
      const same = kept.find((k) => (crossing(k.stations) === cr || !crossing(k.stations) || !cr)
        && r.stations.filter((st) => k.stations.includes(st)).length / r.stations.length >= 0.6);
      if (!same) kept.push(r);
    });
    kept.forEach((r) => {
      let via = null;
      if (kept.length > 1) {
        const own = r.stations.filter((st) => kept.every((o) => o === r || !o.stations.includes(st)));
        via = VIA_NAMES.find((st) => own.includes(st)) || own[Math.floor(own.length / 2)] || null;
      }
      out.push({ id: r.route_id, name, via, stations: r.stations });
    });
  });
  return out.sort((a, b) => a.name.localeCompare(b.name) || String(a.via).localeCompare(String(b.via)));
};
