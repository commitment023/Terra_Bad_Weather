// Leaflet‑based interactive map for climate anomalies and warfare — English version
// This script provides an English translation of all text used on the map page.
// It mirrors the functionality of leaflet_map.js, including dynamic NASA overlays,
// timeline navigation, event filtering, and sticky popups. Event names and
// descriptions are translated into English, and the 'source' link label is
// updated accordingly.

document.addEventListener('DOMContentLoaded', function () {
  // Date range for the timeline (UTC to avoid timezone shifts)
  const startDate = new Date(Date.UTC(2021, 0, 1));
  const endDate = new Date(Date.UTC(2025, 11, 31));
  const monthsDiff = (endDate.getUTCFullYear() - startDate.getUTCFullYear()) * 12 + (endDate.getUTCMonth() - startDate.getUTCMonth());

  // DOM elements
  const timeSlider = document.getElementById('timeSlider');
  const timeLabel = document.getElementById('timeLabel');
  const timeUnitSelect = document.getElementById('timeUnit');
  const categorySelect = document.getElementById('categorySelect');
  const instrumentSelect = document.getElementById('instrumentSelect');
  const eventListEl = document.getElementById('eventList');
  const playPauseBtn = document.getElementById('playPauseBtn');
  const stepBackwardBtn = document.getElementById('stepBackwardBtn');
  const stepForwardBtn = document.getElementById('stepForwardBtn');

  // Initialize Leaflet map using Web Mercator projection (EPSG:3857)
  const map = L.map('map', {
    worldCopyJump: true,
    inertia: false,
    crs: L.CRS.EPSG3857,
    minZoom: 1,
    maxZoom: 9
  });
  // Base map layer: OpenStreetMap
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '© OpenStreetMap contributors',
    maxZoom: 19
  }).addTo(map);
  map.setView([0, 0], 2);

  // NASA GIBS layer configuration with multiple candidates for each instrument
  const nasaConfig = {
    modis: {
      candidates: [
        { layer: 'MODIS_Terra_CorrectedReflectance_TrueColor', tms: 'GoogleMapsCompatible_Level9', maxZoom: 9, ext: 'jpg' },
        { layer: 'MODIS_Aqua_CorrectedReflectance_TrueColor',  tms: 'GoogleMapsCompatible_Level9', maxZoom: 9, ext: 'jpg' }
      ]
    },
    ceres: {
      candidates: [
        { layer: 'CERES_NETFLUX_Monthly', tms: 'GoogleMapsCompatible_Level6', maxZoom: 6, ext: 'png' },
        { layer: 'CERES_Combined_Surface_Shortwave_Flux_Direct_All_Sky_Monthly', tms: 'GoogleMapsCompatible_Level6', maxZoom: 6, ext: 'png' }
      ]
    },
    mopitt: {
      candidates: [
        { layer: 'MOPITT_CO_Daily_Total_Column_Day', tms: 'GoogleMapsCompatible_Level6', maxZoom: 6, ext: 'png' },
        { layer: 'MOP_CO_Monthly', tms: 'GoogleMapsCompatible_Level6', maxZoom: 6, ext: 'png' }
      ]
    },
    misr: {
      candidates: [
        { layer: 'MISR_Combined_Aerosol_Dark_Target_Optical_Depth_Monthly', tms: 'GoogleMapsCompatible_Level6', maxZoom: 6, ext: 'png' },
        { layer: 'MISR_Aerosol_Optical_Depth_Avg_Green_Monthly', tms: 'GoogleMapsCompatible_Level6', maxZoom: 6, ext: 'png' }
      ]
    },
    aster: {
      candidates: [
        { layer: 'ASTER_GDEM_Greyscale_Shaded_Relief', tms: 'GoogleMapsCompatible_Level12', maxZoom: 12, ext: 'jpg' },
        { layer: 'ASTER_GDEM_Color_Index',             tms: 'GoogleMapsCompatible_Level12', maxZoom: 12, ext: 'png' }
      ]
    },
    precip: {
      candidates: [
        { layer: 'IMERG_Precipitation_Rate_30min', tms: 'GoogleMapsCompatible_Level6', maxZoom: 6, ext: 'png' },
        { layer: 'IMERG_Precipitation_Rate',        tms: 'GoogleMapsCompatible_Level6', maxZoom: 6, ext: 'png' },
        { layer: 'IMERG_Precipitation_Rate_Day',    tms: 'GoogleMapsCompatible_Level6', maxZoom: 6, ext: 'png' }
      ]
    },
    temperature: {
      candidates: [
        { layer: 'MODIS_Terra_Land_Surface_Temp_Day', tms: 'GoogleMapsCompatible_Level7', maxZoom: 7, ext: 'png' },
        { layer: 'MODIS_Aqua_Land_Surface_Temp_Day',  tms: 'GoogleMapsCompatible_Level7', maxZoom: 7, ext: 'png' },
        { layer: 'MOD_LSTD_Day_1km',                  tms: 'GoogleMapsCompatible_Level9', maxZoom: 9, ext: 'jpg' }
      ]
    },
    snow: {
      candidates: [
        { layer: 'MODIS_Terra_NDSI_Snow_Cover', tms: 'GoogleMapsCompatible_Level6', maxZoom: 6, ext: 'png' },
        { layer: 'MODIS_Aqua_NDSI_Snow_Cover',  tms: 'GoogleMapsCompatible_Level6', maxZoom: 6, ext: 'png' }
      ]
    },
    cloud: {
      candidates: [
        { layer: 'MODIS_Terra_Cloud_Optical_Thickness', tms: 'GoogleMapsCompatible_Level7', maxZoom: 7, ext: 'png' },
        { layer: 'MODIS_Aqua_Cloud_Optical_Thickness',  tms: 'GoogleMapsCompatible_Level7', maxZoom: 7, ext: 'png' }
      ]
    }
  };

  // Active NASA overlay layer
  let nasaLayer = null;
  // Arrays to track markers and highlights
  let markerLayers = [];
  let highlightLayer = null;

  // Event data translated into English
  const events = [
    {
      id: 1,
      name: 'Rasputitsa in Eastern Europe',
      date: '2022-03-15',
      category: 'mixed',
      country: 'Ukraine',
      location: { lat: 49.5, lon: 31.3 },
      description: 'The spring mud season (rasputitsa) in Eastern Europe in 2022 significantly affected the logistics of military operations.',
      source: 'https://cliffmass.blogspot.com/2022/03/mud-season-in-ukraine.html'
    },
    {
      id: 2,
      name: 'Heatwave in the Middle East',
      date: '2023-07-20',
      category: 'warm',
      country: 'Iraq',
      location: { lat: 32.5, lon: 44.4 },
      description: 'Prolonged heat in July 2023 affected combat operations, causing problems with water supply and equipment.',
      source: 'https://www.reuters.com/business/environment/july-2023-set-be-worlds-hottest-month-record-scientists-2023-07-27/'
    },
    {
      id: 3,
      name: 'Floods in Sudan',
      date: '2021-09-05',
      category: 'mixed',
      country: 'Sudan',
      location: { lat: 15.6, lon: 32.5 },
      description: 'In 2021, severe floods across Sudan destroyed infrastructure and complicated the conduct of hostilities.',
      source: 'https://reliefweb.int/report/sudan/sudan-floods-flash-update-no-05-9-august-2021-enar'
    },
    {
      id: 4,
      name: 'Water scarcity in the Sahel',
      date: '2024-04-10',
      category: 'cold',
      country: 'Mali',
      location: { lat: 17.5, lon: -3.0 },
      description: 'A drought in the Sahel region in 2024 led to water shortages, affecting the ability to carry out military operations.',
      source: 'https://www.worldweatherattribution.org/extreme-sahel-heatwave-that-hit-highly-vulnerable-population-at-the-end-of-ramadan-would-not-have-occurred-without-climate-change/'
    },
    {
      id: 5,
      name: 'Snowstorms in the Caucasus region',
      date: '2025-01-12',
      category: 'cold',
      country: 'Georgia',
      location: { lat: 42.3, lon: 43.4 },
      description: 'At the beginning of 2025, heavy snowstorms in the Caucasus mountains created difficulties for the movement of military equipment.',
      source: 'https://1tv.ge/lang/en/news/avalanche-hazard-forces-temporary-road-closure-on-gudauri-kobi-section/'
    },
    {
      id: 6,
      name: 'Autumn rains and mud',
      date: '2022-09-25',
      category: 'mixed',
      country: 'Ukraine',
      location: { lat: 48.7, lon: 31.3 },
      description: 'In September 2022, rains turned the ground too muddy for tanks, limiting the mobility of heavy vehicles and hindering the Ukrainian advance.',
      source: 'https://www.abc.net.au/news/2022-09-25/winters-approach-sets-clock-ticking-for-ukraine-and-russia/101472766'
    },
    {
      id: 7,
      name: 'Kakhovka Dam breach and floods',
      date: '2023-06-06',
      category: 'mixed',
      country: 'Ukraine',
      location: { lat: 46.8, lon: 32.8 },
      description: 'On June 6 2023, the destruction of the Kakhovka dam triggered a powerful wave and floods that flooded thousands of homes, forced people to evacuate and disrupted water and energy supplies.',
      source: 'https://www.reuters.com/world/europe/ukraine-says-russia-blows-up-major-nova-kakhovka-dam-southern-ukraine-2023-06-06/'
    },
    {
      id: 8,
      name: 'Winter cold and infrastructure damage',
      date: '2023-12-15',
      category: 'cold',
      country: 'Ukraine',
      location: { lat: 48.5, lon: 32.0 },
      description: 'In 2023–2024, severe frosts (below –10 °C) combined with damaged energy networks and infrastructure increased health risks and complicated the logistics of military operations.',
      source: 'https://www.unicef.org/press-releases/escalation-attacks-infrastructure-leaves-ukraines-children-without-sustained-access'
    },
    {
      id: 9,
      name: 'Rains and mud in Donetsk region',
      date: '2024-10-15',
      category: 'mixed',
      country: 'Ukraine',
      location: { lat: 48.0, lon: 37.8 },
      description: 'In September–October 2024, rainy conditions created roads too muddy for effective ground operations and limited the use of aerial reconnaissance.',
      source: 'https://www.criticalthreats.org/analysis/russian-offensive-campaign-assessment-october-9-2024'
    }
  ];

  // Compute the last day of a month for a given slider value and unit
  function computeDateFromSlider(sliderValue) {
    let monthsToAdd;
    if (timeUnitSelect.value === 'month') {
      monthsToAdd = sliderValue;
    } else if (timeUnitSelect.value === 'season') {
      monthsToAdd = sliderValue * 3;
    } else {
      monthsToAdd = sliderValue * 12;
    }
    const newDate = new Date(startDate);
    newDate.setUTCMonth(startDate.getUTCMonth() + monthsToAdd);
    const year = newDate.getUTCFullYear();
    const month = newDate.getUTCMonth();
    return new Date(Date.UTC(year, month + 1, 0));
  }

  // Format a date into YYYY-MM-01
  function formatDateISO(date) {
    const y = date.getUTCFullYear();
    const m = String(date.getUTCMonth() + 1).padStart(2, '0');
    return `${y}-${m}-01`;
  }

  /**
   * Load a NASA overlay for the selected instrument and date. This function tries
   * each candidate layer for the instrument. If a candidate fails to load
   * (too many tile errors), it switches to the next candidate. If none succeed
   * the overlay remains off.
   * @param {string} instr - Instrument key (e.g. 'modis', 'precip').
   */
  function updateNasaLayer(instr) {
    // Remove current overlay
    if (nasaLayer) {
      map.removeLayer(nasaLayer);
      nasaLayer = null;
    }
    if (!instr || instr === 'none') {
      return;
    }
    const config = nasaConfig[instr];
    if (!config || !config.candidates || config.candidates.length === 0) {
      return;
    }
    const sliderValue = parseInt(timeSlider.value, 10) || 0;
    const currentDate = computeDateFromSlider(sliderValue);
    const dateStr = formatDateISO(currentDate);
    let candidateIndex = 0;
    const tryCandidate = () => {
      if (candidateIndex >= config.candidates.length) {
        return;
      }
      const cand = config.candidates[candidateIndex];
      candidateIndex += 1;
      const url = `https://gibs.earthdata.nasa.gov/wmts/epsg3857/best/${cand.layer}/default/${dateStr}/${cand.tms}/{z}/{y}/{x}.${cand.ext}`;
      const layer = L.tileLayer(url, {
        maxZoom: cand.maxZoom,
        attribution: 'NASA GIBS',
        crossOrigin: true
      });
      let errorCount = 0;
      layer.on('tileerror', function () {
        errorCount++;
        if (errorCount > 5) {
          if (map.hasLayer(layer)) {
            map.removeLayer(layer);
          }
          tryCandidate();
        }
      });
      layer.on('load', function () {
        nasaLayer = layer;
      });
      layer.addTo(map);
    };
    tryCandidate();
  }

  // Clear existing markers and highlights
  function clearEventMarkers() {
    markerLayers.forEach(m => map.removeLayer(m));
    markerLayers = [];
    if (highlightLayer) {
      map.removeLayer(highlightLayer);
      highlightLayer = null;
    }
  }

  // Pan to event and draw highlight
  function panToEvent(ev) {
    map.panTo([ev.location.lat, ev.location.lon]);
    if (highlightLayer) {
      map.removeLayer(highlightLayer);
      highlightLayer = null;
    }
    const bounds = [
      [ev.location.lat - 1.0, ev.location.lon - 1.5],
      [ev.location.lat + 1.0, ev.location.lon + 1.5]
    ];
    highlightLayer = L.rectangle(bounds, {
      color: '#e74c3c',
      weight: 2,
      dashArray: '4,4',
      fill: false
    }).addTo(map);
  }

  // Update events list and markers based on current time and selected category
  function updateEvents() {
    clearEventMarkers();
    eventListEl.innerHTML = '';
    const sliderValue = parseInt(timeSlider.value, 10);
    const currentDate = computeDateFromSlider(sliderValue);
    const category = categorySelect.value;
    const visibleEvents = events.filter(ev => {
      const evDate = new Date(ev.date);
      const dateMatch = evDate <= currentDate;
      const categoryMatch = (category === 'all') || (ev.category === category);
      return dateMatch && categoryMatch;
    });
    visibleEvents.forEach(ev => {
      const marker = L.marker([ev.location.lat, ev.location.lon], {
        title: ev.name
      }).addTo(map);
      marker.bindPopup(
        `<strong>${ev.name}</strong><br>${ev.date}<br>${ev.description}<br><a href="${ev.source}" target="_blank">source</a>`
      );
      marker._popupPinned = false;
      marker.on('mouseover', function () {
        if (!this._popupPinned) {
          this.openPopup();
        }
      });
      marker.on('mouseout', function () {
        if (!this._popupPinned) {
          this.closePopup();
        }
      });
      marker.on('click', function () {
        if (this._popupPinned) {
          this.closePopup();
          this._popupPinned = false;
        } else {
          this.openPopup();
          this._popupPinned = true;
        }
        panToEvent(ev);
      });
      markerLayers.push(marker);
      const item = document.createElement('div');
      item.className = 'event-item';
      item.textContent = `${ev.name} (${ev.date})`;
      item.addEventListener('click', function () {
        panToEvent(ev);
        marker._popupPinned = true;
        marker.openPopup();
      });
      eventListEl.appendChild(item);
    });
  }

  // Update time label and refresh overlays/events
  function updateTimeLabel() {
    const sliderValue = parseInt(timeSlider.value, 10);
    const currentDate = computeDateFromSlider(sliderValue);
    const year = currentDate.getUTCFullYear();
    const month = String(currentDate.getUTCMonth() + 1).padStart(2, '0');
    timeLabel.textContent = `${year}-${month}`;
    updateNasaLayer(instrumentSelect.value);
    updateEvents();
  }

  // Adjust slider range when time unit changes
  function adjustSliderRange() {
    const unit = timeUnitSelect.value;
    let unitMultiplier;
    if (unit === 'month') {
      unitMultiplier = 1;
    } else if (unit === 'season') {
      unitMultiplier = 3;
    } else {
      unitMultiplier = 12;
    }
    const oldMultiplier = parseFloat(timeSlider.getAttribute('data-unit')) || 1;
    const oldValue = parseInt(timeSlider.value, 10);
    const currentMonths = oldValue * oldMultiplier;
    timeSlider.max = Math.floor(monthsDiff / unitMultiplier).toString();
    const newValue = Math.floor(currentMonths / unitMultiplier);
    timeSlider.value = newValue.toString();
    timeSlider.setAttribute('data-unit', unitMultiplier.toString());
  }

  // Play/pause timeline
  let playInterval = null;
  function togglePlayPause() {
    if (playInterval) {
      clearInterval(playInterval);
      playInterval = null;
      playPauseBtn.textContent = '▶';
    } else {
      playPauseBtn.textContent = '⏸';
      playInterval = setInterval(() => {
        const val = parseInt(timeSlider.value, 10);
        const maxVal = parseInt(timeSlider.max, 10);
        if (val < maxVal) {
          timeSlider.value = (val + 1).toString();
          updateTimeLabel();
        } else {
          clearInterval(playInterval);
          playInterval = null;
          playPauseBtn.textContent = '▶';
        }
      }, 1000);
    }
  }

  // Step backward and forward
  function stepBackward() {
    const val = parseInt(timeSlider.value, 10);
    if (val > 0) {
      timeSlider.value = (val - 1).toString();
      updateTimeLabel();
    }
  }
  function stepForward() {
    const val = parseInt(timeSlider.value, 10);
    const maxVal = parseInt(timeSlider.max, 10);
    if (val < maxVal) {
      timeSlider.value = (val + 1).toString();
      updateTimeLabel();
    }
  }

  // Event listeners
  timeSlider.addEventListener('input', updateTimeLabel);
  timeUnitSelect.addEventListener('change', function () {
    adjustSliderRange();
    updateTimeLabel();
  });
  categorySelect.addEventListener('change', updateEvents);
  instrumentSelect.addEventListener('change', function () {
    updateNasaLayer(this.value);
  });
  playPauseBtn.addEventListener('click', togglePlayPause);
  stepBackwardBtn.addEventListener('click', stepBackward);
  stepForwardBtn.addEventListener('click', stepForward);

  // Initialize slider metadata and values
  timeSlider.setAttribute('data-unit', '1');
  timeSlider.min = '0';
  timeSlider.max = monthsDiff.toString();
  timeSlider.value = '0';

  // Initial load
  updateTimeLabel();
});