import React, { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { coordsOf } from '../data/stationCoords';
import { createBaseMap } from '../lib/baseMap';
import { useNetwork, trackPath } from '../lib/network';
import { formatTime, stationName } from '../lib/format';
import { useT } from '../i18n';

// Route colours: indigo to match the navbar, red for the passenger's own journey
const ROUTE = '#1E2A5A';
const TRIP = '#C8102E';
const OFF = '#7C86A8';

const escapeHtml = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

/**
 * Real map of a train route: a line through every stop, a pin on each station
 * and the station name beside it.
 *
 * stops: [{ name, arrival, departure }] in travel order
 * highlight: { from, to } (optional): the passenger's own journey is drawn bolder
 */
const RouteMap = ({ stops, highlight, height = 380 }) => {
  const { t, lang } = useT();
  const { trains } = useNetwork();
  const el = useRef(null);

  useEffect(() => {
    if (!el.current) return undefined;

    const points = stops
      .map((s, i) => ({ ...s, index: i, ll: coordsOf(s.name) }))
      .filter((s) => s.ll);
    if (points.length === 0) return undefined;

    const map = createBaseMap(el.current);

    // Which stops are inside the passenger's journey (for highlighting)
    const norm = (s) => String(s || '').toLowerCase();
    const fromIdx = highlight ? points.findIndex((p) => norm(p.name) === norm(highlight.from)) : -1;
    const toIdx = highlight ? points.findIndex((p) => norm(p.name) === norm(highlight.to)) : -1;
    const hasTrip = fromIdx !== -1 && toIdx !== -1 && fromIdx < toIdx;

    // Follow the real track: fill in stations the train passes without stopping
    const names = points.map((p) => p.name);
    const path = trackPath(trains, names).filter((n) => coordsOf(n));
    const lineFor = (a, b) => {
      const i = path.indexOf(a);
      const j = path.indexOf(b, i);
      return (i !== -1 && j !== -1 ? path.slice(i, j + 1) : [a, b]).map(coordsOf);
    };
    const latlngs = lineFor(names[0], names[names.length - 1]);
    // Route drawn as a trail of small dots (no solid line), with a white halo so it reads on the terrain
    const dotted = (pts, color) => {
      L.polyline(pts, { color: '#fff', opacity: 0.9, weight: 7, lineCap: 'round', dashArray: '0 10', interactive: false }).addTo(map);
      L.polyline(pts, { color, opacity: 1, weight: 4, lineCap: 'round', dashArray: '0 10', interactive: false }).addTo(map);
    };
    if (hasTrip) {
      dotted(latlngs, OFF);
      dotted(lineFor(names[fromIdx], names[toIdx]), TRIP);
    } else {
      dotted(latlngs, ROUTE);
    }

    // Station points. Only the train's first and last stations carry a name on the map;
    // every other station shows its name and times when its point is clicked.
    const last = points.length - 1;
    const startOnLeft = points[0].ll[1] <= points[last].ll[1];
    const START_SVG = '<svg viewBox="0 0 24 24" width="11" height="11" aria-hidden="true"><path d="M8 5v14l11-7z" fill="currentColor"/></svg>';
    const FINISH_SVG = '<svg viewBox="0 0 24 24" width="11" height="11" aria-hidden="true"><path d="M6 21V4m0 0h11l-2 4 2 4H6" fill="currentColor" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/></svg>';

    points.forEach((p, i) => {
      const isStart = i === 0;
      const isFinish = i === last;
      const isBoard = hasTrip && i === fromIdx;
      const isAlight = hasTrip && i === toIdx;
      const inTrip = !hasTrip || (i >= fromIdx && i <= toIdx);

      let kind = inTrip ? 'stop' : 'off';
      if (isBoard || isAlight) kind = 'trip';
      if (isStart) kind = 'start';
      if (isFinish) kind = 'finish';
      const big = kind === 'start' || kind === 'finish';
      const size = big ? 26 : kind === 'trip' ? 18 : 14;

      const icon = L.divIcon({
        className: 'rm-marker',
        html: `<span class="rm-pt rm-pt-${kind}">${kind === 'start' ? START_SVG : kind === 'finish' ? FINISH_SVG : ''}</span>`,
        iconSize: [size, size],
        iconAnchor: [size / 2, size / 2],
        popupAnchor: [0, -size / 2],
      });

      const name = escapeHtml(stationName(p.name));
      let times = '';
      if (isStart && p.departure) times = escapeHtml(t('Departs {time}', { time: formatTime(p.departure) }));
      else if (isFinish && p.arrival) times = escapeHtml(t('Arrives {time}', { time: formatTime(p.arrival) }));
      else if (p.arrival && p.departure) {
        times = escapeHtml(t('Arrives {arr} · departs {dep}', { arr: formatTime(p.arrival), dep: formatTime(p.departure) }));
      }
      const tag = isStart ? t('Start') : isFinish ? t('Finish') : t('Stop {n} of {total}', { n: i + 1, total: points.length });
      const trip = isBoard ? t('You board here') : isAlight ? t('You get off here') : '';
      const popup = `<div class="rm-pop"><small>${escapeHtml(tag)}</small><strong>${name}</strong>`
        + `${times ? `<span>${times}</span>` : ''}${trip ? `<em>${escapeHtml(trip)}</em>` : ''}</div>`;

      const marker = L.marker(p.ll, { icon, keyboard: true, title: stationName(p.name), riseOnHover: true, zIndexOffset: big ? 1000 : kind === 'trip' ? 500 : 0 })
        .bindPopup(popup, { className: 'rm-popup', closeButton: false, offset: [0, -2] })
        .addTo(map);

      if (big) {
        const time = isStart ? p.departure : p.arrival;
        const left = isStart ? startOnLeft : !startOnLeft;
        marker.bindTooltip(
          `<small>${escapeHtml(isStart ? t('Start') : t('Finish'))}</small><strong>${name}</strong>${time ? `<span>${escapeHtml(formatTime(time))}</span>` : ''}`,
          { permanent: true, direction: left ? 'left' : 'right', offset: [left ? -14 : 14, 0], className: `rm-end rm-end-${kind}` },
        );
      }
    });

    const bounds = L.latLngBounds(latlngs);
    const fit = () => {
      map.invalidateSize();
      map.fitBounds(bounds, { padding: [48, 48], maxZoom: 11 });
    };
    fit();
    // The container may still be animating in (e.g. inside a modal); refit once it has its final size
    const timer = setTimeout(fit, 220);

    return () => {
      clearTimeout(timer);
      map.remove();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stops, highlight, lang, trains]);

  const missing = stops.filter((s) => !coordsOf(s.name)).map((s) => stationName(s.name));

  return (
    <figure className="route-map" style={{ margin: 0 }}>
      <div ref={el} className="route-map-canvas" style={{ height }} role="img" aria-label={t('Map of the route through {stops}', { stops: stops.map((s) => stationName(s.name)).join(', ') })} />
      {missing.length > 0 && (
        <figcaption className="tiny muted" style={{ marginTop: 6 }}>
          {t('Not shown on the map: {stations}', { stations: missing.join(', ') })}
        </figcaption>
      )}
    </figure>
  );
};

export default RouteMap;
