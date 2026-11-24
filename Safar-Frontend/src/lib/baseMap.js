import L from 'leaflet';

// Clean base map for Safar: white background, Bangladesh district borders,
// no third-party map tiles (so no place names other than our own station labels).
// District boundaries: geoBoundaries BGD ADM2 (CC BY 4.0), simplified -> public/bd-districts.json

let districts = null;
const loadDistricts = () => {
  if (!districts) {
    districts = fetch(`${process.env.PUBLIC_URL}/bd-districts.json`)
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(`HTTP ${r.status}`))))
      .catch((e) => { districts = null; throw e; });
  }
  return districts;
};

const ATTRIBUTION = 'Districts &copy; <a href="https://www.geoboundaries.org">geoBoundaries</a> · Stations &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>';

export const createBaseMap = (el, options = {}) => {
  const map = L.map(el, { scrollWheelZoom: false, zoomSnap: 0.25, minZoom: 6, maxZoom: 13, ...options });
  map.attributionControl.setPrefix(false);
  map.attributionControl.addAttribution(ATTRIBUTION);

  let alive = true;
  map.on('unload', () => { alive = false; });
  loadDistricts()
    .then((geo) => {
      if (!alive) return;
      L.geoJSON(geo, {
        interactive: false,
        style: { color: '#C3CBD6', weight: 1, fillColor: '#F6F8FA', fillOpacity: 1 },
      }).addTo(map).bringToBack();
    })
    .catch(() => { /* map still works without the borders */ });

  return map;
};
