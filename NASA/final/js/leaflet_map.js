// Leaflet‑based interactive map for climate anomalies and warfare
// This script replaces the original custom map with a Leaflet map and dynamic NASA overlays.

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

  // Initialize Leaflet map using the Web Mercator (EPSG:3857) projection,
  // which aligns with standard web mapping tiles (e.g., OpenStreetMap). We allow
  // the map to wrap around horizontally (worldCopyJump) and disable inertia for
  // smoother dragging on restricted environments.
  const map = L.map('map', {
    worldCopyJump: true,
    inertia: false,
    crs: L.CRS.EPSG3857,
    minZoom: 1,
    maxZoom: 9
  });
  // Use OpenStreetMap as the base layer. These tiles are fetched from
  // tile.openstreetmap.org and provide a global basemap. If connectivity
  // issues prevent loading, Leaflet will gracefully show a blank grid.
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '© OpenStreetMap contributors',
    maxZoom: 19
  }).addTo(map);

  // Center the map at the equator and prime meridian with an initial zoom
  map.setView([0, 0], 2);

  // Configuration for NASA GIBS layers for each instrument
  /**
   * Configuration of NASA GIBS layers. Each entry lists multiple candidate layers.
   * When loading an overlay, the script will iterate through these candidates
   * until it finds a layer with available tiles. The `tms` property indicates
   * which TileMatrixSet to use for the WMTS request, `maxZoom` sets the
   * maximum zoom level for the layer, and `ext` specifies the expected file
   * extension (png or jpg).
   */
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

  // Event markers and highlight
  let markerLayers = [];
  let highlightLayer = null;

  // Event data
  const events = [
    {
      id: 1,
      name: 'Распутиця у Східній Європі',
      date: '2022-03-15',
      category: 'mixed',
      country: 'Україна',
      location: { lat: 49.5, lon: 31.3 },
      description: 'Весняне бездоріжжя (распутиця) у Східній Європі у 2022 році суттєво вплинуло на логістику військових операцій.',
      source: 'https://war.obozrevatel.com/ukr/vid-voroga-zahischae-navit-ukrainska-zemlya-chotiri-tanki-okupantiv-na-sumschini-zastryagli-u-bagnyutsi-video.htm'
    },
    {
      id: 2,
      name: 'Спека на Близькому Сході',
      date: '2023-07-20',
      category: 'warm',
      country: 'Ірак',
      location: { lat: 32.5, lon: 44.4 },
      description: 'Тривала спека у липні 2023 року вплинула на бойові дії, спричинивши проблеми із забезпеченням водою та технікою.',
      source: 'https://zaborona.com/lypen-2023-roku-stane-najgaryachishym-za-45-rokiv-pro-shho-cze-nam-kazhe/'
    },
    {
      id: 3,
      name: 'Повені у Судані',
      date: '2021-09-05',
      category: 'mixed',
      country: 'Судан',
      location: { lat: 15.6, lon: 32.5 },
      description: 'У 2021 році сильні повені на території Судану зруйнували інфраструктуру та ускладнили проведення бойових дій.',
      source: 'https://day.kyiv.ua/news/271221-vnaslidok-poveney-i-sylnykh-zlyv-v-sudani-zahynulo-shchonaymenshe-60-osib'
    },
    {
      id: 4,
      name: 'Дефіцит води у Сахелі',
      date: '2024-04-10',
      category: 'cold',
      country: 'Малі',
      location: { lat: 17.5, lon: -3.0 },
      description: 'Посуха у регіоні Сахель у 2024 році призвела до нестачі води, що вплинуло на здатність здійснювати військові операції.',
      source: 'https://www.worldweatherattribution.org/extreme-sahel-heatwave-that-hit-highly-vulnerable-population-at-the-end-of-ramadan-would-not-have-occurred-without-climate-change/'
    },
    {
      id: 5,
      name: 'Снігові бурі в Кавказькому регіоні',
      date: '2025-01-12',
      category: 'cold',
      country: 'Грузія',
      location: { lat: 42.3, lon: 43.4 },
      description: 'На початку 2025 року сильні снігові бурі в горах Кавказу створили труднощі для руху військової техніки.',
      source: 'https://1tv.ge/lang/en/news/avalanche-hazard-forces-temporary-road-closure-on-gudauri-kobi-section/'
    },
    // Додані події в Україні та навколишніх регіонах для кращого висвітлення кліматичних аномалій.
    {
      id: 6,
      name: 'Осінні дощі та бруд',
      date: '2022-09-25',
      category: 'mixed',
      country: 'Україна',
      location: { lat: 48.7, lon: 31.3 },
      description: 'У вересні 2022 року дощі зробили ґрунт занадто брудним для танків, що обмежувало мобільність важкої техніки й ускладнювало український наступ.',
      source: 'https://www.abc.net.au/news/2022-09-25/winters-approach-sets-clock-ticking-for-ukraine-and-russia/101472766'
    },
    {
      id: 7,
      name: 'Підрив Каховської дамби та повені',
      date: '2023-06-06',
      category: 'mixed',
      country: 'Україна',
      location: { lat: 46.8, lon: 32.8 },
      description: '6 червня 2023 року зруйнування Каховської дамби спричинило потужну хвилю та повені, які затопили тисячі будинків, змусили людей до евакуації та порушили водо- та енергопостачання.',
      source: 'https://suspilne.media/kherson/647518-podia-2023-roku-pidriv-kahovskoi-ges-ta-jogo-naslidki-dla-hersonsini/'
    },
    {
      id: 8,
      name: 'Зимовий холод та інфраструктурні пошкодження',
      date: '2023-12-15',
      category: 'cold',
      country: 'Україна',
      location: { lat: 48.5, lon: 32.0 },
      description: 'У 2023–2024 роках сильні морози (нижче −10°C) у поєднанні з пошкодженими енергетичними мережами та інфраструктурою призвели до зростання ризиків для здоров’я та ускладнили логістику військових операцій.',
      source: 'https://suspilne.media/631008-minenergo-v-ukraini-znestrumleni-ponad-900-naselenih-punktiv/'
    },
    {
      id: 9,
      name: 'Дощі та бруд у Донецькій області',
      date: '2024-10-15',
      category: 'mixed',
      country: 'Україна',
      location: { lat: 48.0, lon: 37.8 },
      description: 'У вересні–жовтні 2024 року дощові умови створили занадто брудні дороги, що унеможливило ефективні наземні операції та обмежило використання аеророзвідки.',
      source: 'https://www.pravda.com.ua/eng/news/2024/10/10/7478983/'
    }
  ];

  // Compute date for a given slider value, based on selected time unit
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
    // Compute last day of the resulting month so events within the month appear
    const year = newDate.getUTCFullYear();
    const month = newDate.getUTCMonth();
    const lastDay = new Date(Date.UTC(year, month + 1, 0));
    return lastDay;
  }

  // Format a date as YYYY-MM-DD (use first day of month)
  function formatDateISO(date) {
    const y = date.getUTCFullYear();
    const m = String(date.getUTCMonth() + 1).padStart(2, '0');
    const d = '01';
    return `${y}-${m}-${d}`;
  }

  /**
   * Load a NASA overlay for the selected instrument and current date.
   * This function will attempt each candidate layer in sequence. If the first layer
   * triggers tile errors (indicating missing tiles), it will automatically switch
   * to the next candidate. If no candidates succeed, the overlay is hidden.
   * @param {string} instr - Instrument key from instrumentSelect (e.g. 'modis', 'precip').
   */
  function updateNasaLayer(instr) {
    // Remove current NASA overlay if present
    if (nasaLayer) {
      map.removeLayer(nasaLayer);
      nasaLayer = null;
    }
    // Do nothing if 'none' or invalid instrument
    if (!instr || instr === 'none') {
      return;
    }
    const config = nasaConfig[instr];
    if (!config || !config.candidates || config.candidates.length === 0) {
      return;
    }
    // Compute date string for WMTS (YYYY-MM-01)
    const sliderValue = parseInt(timeSlider.value, 10) || 0;
    const dateObj = computeDateFromSlider(sliderValue);
    const dateStr = formatDateISO(dateObj);
    // Candidate index to try
    let candidateIndex = 0;
    const tryCandidate = () => {
      if (candidateIndex >= config.candidates.length) {
        // Exhausted candidates; leave overlay off
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
      // If tiles fail to load, remove layer and try next candidate
      let tileErrorCount = 0;
      layer.on('tileerror', function () {
        tileErrorCount++;
        // After a certain number of tile errors, switch to next candidate
        if (tileErrorCount > 5) {
          if (map.hasLayer(layer)) {
            map.removeLayer(layer);
          }
          tryCandidate();
        }
      });
      layer.on('load', function () {
        // Once tiles load, we can keep this layer
        nasaLayer = layer;
      });
      layer.addTo(map);
    };
    // Start trying to load the first candidate
    tryCandidate();
  }

  // Clear event markers and highlight
  function clearEventMarkers() {
    markerLayers.forEach(layer => {
      map.removeLayer(layer);
    });
    markerLayers = [];
    if (highlightLayer) {
      map.removeLayer(highlightLayer);
      highlightLayer = null;
    }
  }

  // Update event markers and list based on current date and category
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
      // Create marker
      const marker = L.marker([ev.location.lat, ev.location.lon], {
        title: ev.name
      }).addTo(map);
      marker.bindPopup(
        `<strong>${ev.name}</strong><br>${ev.date}<br>${ev.description}<br><a href="${ev.source}" target="_blank">джерело</a>`
      );
      // Track whether the popup is pinned (clicked) or not
      marker._popupPinned = false;
      // On hover, show popup only if not pinned
      marker.on('mouseover', function () {
        if (!this._popupPinned) {
          this.openPopup();
        }
      });
      // On mouseout, hide popup if not pinned
      marker.on('mouseout', function () {
        if (!this._popupPinned) {
          this.closePopup();
        }
      });
      // On click, toggle pinned state and pan to event
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
      // Create event list item
      const item = document.createElement('div');
      item.className = 'event-item';
      item.textContent = `${ev.name} (${ev.date})`;
      item.addEventListener('click', function () {
        panToEvent(ev);
        // Pin popup when clicking from list and open it
        marker._popupPinned = true;
        marker.openPopup();
      });
      eventListEl.appendChild(item);
    });
  }

  // Pan map to event location and draw highlight rectangle
  function panToEvent(ev) {
    map.panTo([ev.location.lat, ev.location.lon]);
    // Remove previous highlight
    if (highlightLayer) {
      map.removeLayer(highlightLayer);
      highlightLayer = null;
    }
    // Draw rectangle around event (approximate area)
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

  // Update time label and refresh layers/events
  function updateTimeLabel() {
    const sliderValue = parseInt(timeSlider.value, 10);
    const currentDate = computeDateFromSlider(sliderValue);
    const year = currentDate.getUTCFullYear();
    const month = String(currentDate.getUTCMonth() + 1).padStart(2, '0');
    timeLabel.textContent = `${year}-${month}`;
    updateNasaLayer(instrumentSelect.value);
    updateEvents();
  }

  // Adjust slider range when switching time unit
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
    const oldUnit = parseFloat(timeSlider.getAttribute('data-unit')) || 1;
    const oldValue = parseInt(timeSlider.value, 10);
    // Compute current month index
    const currentMonths = oldValue * oldUnit;
    // Set new max and value
    timeSlider.max = Math.floor(monthsDiff / unitMultiplier).toString();
    const newValue = Math.floor(currentMonths / unitMultiplier);
    timeSlider.value = newValue.toString();
    timeSlider.setAttribute('data-unit', unitMultiplier.toString());
  }

  // Play/Pause functionality
  let playInterval = null;
  function togglePlayPause() {
    if (playInterval) {
      // Stop playing
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

  // Initialize slider range and unit metadata
  timeSlider.setAttribute('data-unit', '1');
  timeSlider.min = '0';
  timeSlider.max = monthsDiff.toString();
  timeSlider.value = '0';

  // Initial load
  updateTimeLabel();
});