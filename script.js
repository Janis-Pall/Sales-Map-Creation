// Global variables
let map;
let baseTileLayer = null;
let originMarker;
let deliveryMarkers = new Map();
let deliveryLines = new Map();
let countryLabels = new Map();
let countries = [];
let selectedCountries = new Set();
let filteredCountries = [];
let labelsVisible = false; // Labels hidden by default
let isFullscreen = false; // Fullscreen mode state
// Zoom level at which labels switch to full country names
let FULL_NAME_ZOOM_THRESHOLD = 4.25; // Full names from this zoom and above

function applyStoredZoomThreshold() {
  const stored = Number(localStorage.getItem('zoomThreshold'));
  if (Number.isFinite(stored) && stored >= 2 && stored <= 12) {
    FULL_NAME_ZOOM_THRESHOLD = stored;
    const input = document.getElementById('zoomThresholdInput');
    if (input) input.value = String(stored);
  }
}

// Allow changing the zoom threshold at runtime
function setFullNameZoomThreshold(level) {
    const parsed = Number(level);
    if (!Number.isFinite(parsed)) return;
    FULL_NAME_ZOOM_THRESHOLD = parsed;
    // Refresh labels immediately if visible
    if (labelsVisible) {
        updateAllCountryLabelTexts();
    }
}
// Expose for console/other callers
window.setFullNameZoomThreshold = setFullNameZoomThreshold;

// Zoom indicator UI (placed in header under Edit button)
let zoomIndicatorEl = null;
function ensureZoomIndicator() {
    if (zoomIndicatorEl) return zoomIndicatorEl;
    const headerEl = document.querySelector('.header');
    zoomIndicatorEl = document.createElement('div');
    zoomIndicatorEl.id = 'zoomIndicator';
    zoomIndicatorEl.className = 'zoom-indicator';
    zoomIndicatorEl.style.background = 'rgba(13,37,63,0.9)';
    zoomIndicatorEl.style.color = '#dbe9ff';
    zoomIndicatorEl.style.padding = '4px 8px';
    zoomIndicatorEl.style.borderRadius = '6px';
    zoomIndicatorEl.style.fontSize = '10px';
    zoomIndicatorEl.style.display = 'inline-block';
    if (headerEl) {
        headerEl.appendChild(zoomIndicatorEl);
    } else {
    document.body.appendChild(zoomIndicatorEl);
    }
    return zoomIndicatorEl;
}

function updateZoomIndicator() {
    if (!map) return;
    const el = ensureZoomIndicator();
    const currentZoom = map.getZoom();
    const useFullGeneric = currentZoom >= FULL_NAME_ZOOM_THRESHOLD;
    el.textContent = `Zoom: ${currentZoom.toFixed(2)} | Names: ${useFullGeneric ? 'Full' : 'Abbrev'} | Thr: ${FULL_NAME_ZOOM_THRESHOLD}`;
}

// Expose helper to show/hide zoom indicator
function showZoomIndicator(visible) {
    ensureZoomIndicator();
    zoomIndicatorEl.style.display = visible === false ? 'none' : 'block';
}
window.showZoomIndicator = showZoomIndicator;

// Global world-country datasets for origin selection (populated at runtime)
let WORLD_COUNTRY_COORDS = new Map(); // canonicalName -> [lat, lng]
let NAME_TO_CANONICAL = new Map();   // lowercase variant -> canonicalName
let ALL_WORLD_COUNTRIES = [];        // array of canonical names (sorted)

// Origin coordinates (must be selected by user)
let ORIGIN_COORDS = null; // No default - user must select
let ORIGIN_COUNTRY = null; // No default - user must select

// Comprehensive country list with coordinates
const COUNTRY_DATA = {
    'Afghanistan': [33.9391, 67.7100],
    'Albania': [41.1533, 20.1683],
    'Algeria': [28.0339, 1.6596],
    'Argentina': [-38.4161, -63.6167],
    'Armenia': [40.0691, 45.0382],
    'Australia': [-25.2744, 133.7751],
    'Austria': [47.5162, 14.5501],
    'Azerbaijan': [40.1431, 47.5769],
    'Bahrain': [25.9304, 50.6378],
    'Bangladesh': [23.6850, 90.3563],
    'Belgium': [50.5039, 4.4699],
    'Bolivia': [-16.2902, -63.5887],
    'Bosnia and Herzegovina': [43.9159, 17.6791],
    'Brazil': [-14.2350, -51.9253],
    'Bulgaria': [42.7339, 25.4858],
    'Cambodia': [12.5657, 104.9910],
    'Canada': [56.1304, -106.3468],
    'Chile': [-35.6751, -71.5430],
    'China': [35.8617, 104.1954],
    'Colombia': [4.5709, -74.2973],
    'Croatia': [45.1000, 15.2000],
    'Cyprus': [35.1264, 33.4299],
    'Czech Republic': [49.8175, 15.4730],
    'Denmark': [56.2639, 9.5018],
    'Ecuador': [-1.8312, -78.1834],
    'Egypt': [26.0975, 30.0444],
    'Estonia': [58.5953, 25.0136],
    'Finland': [61.9241, 25.7482],
    'France': [46.6034, 1.8883],
    'Georgia': [42.3154, 43.3569],
    'Germany': [51.1657, 10.4515],
    'Ghana': [7.9465, -1.0232],
    'Greece': [39.0742, 21.8243],
    'Hungary': [47.1625, 19.5033],
    'Iceland': [64.9631, -19.0208],
    'India': [20.5937, 78.9629],
    'Indonesia': [-0.7893, 113.9213],
    'Iran': [32.4279, 53.6880],
    'Iraq': [33.2232, 43.6793],
    'Ireland': [53.1424, -7.6921],
    'Israel': [31.0461, 34.8516],
    'Italy': [41.8719, 12.5674],
    'Japan': [36.2048, 138.2529],
    'Jordan': [30.5852, 36.2384],
    'Kazakhstan': [48.0196, 66.9237],
    'Kenya': [-0.0236, 37.9062],
    'Kuwait': [29.3117, 47.4818],
    'Kyrgyzstan': [41.2044, 74.7661],
    'Latvia': [56.8796, 24.6032],
    'Lebanon': [33.8547, 35.8623],
    'Liechtenstein': [47.1660, 9.5554],
    'Lithuania': [55.1694, 23.8813],
    'Luxembourg': [49.8153, 6.1296],
    'Malaysia': [4.2105, 101.9758],
    'Malta': [35.9375, 14.3754],
    'Mexico': [23.6345, -102.5528],
    'Moldova': [47.4116, 28.3699],
    'Monaco': [43.7384, 7.4246],
    'Mongolia': [46.8625, 103.8467],
    'Montenegro': [42.7087, 19.3744],
    'Morocco': [31.7917, -7.0926],
    'Netherlands': [52.1326, 5.2913],
    'New Zealand': [-40.9006, 174.8860],
    'Nigeria': [9.0820, 8.6753],
    'North Macedonia': [41.6086, 21.7453],
    'Norway': [60.4720, 8.4689],
    'Pakistan': [30.3753, 69.3451],
    'Peru': [-9.1900, -75.0152],
    'Philippines': [12.8797, 121.7740],
    'Poland': [51.9194, 19.1451],
    'Portugal': [39.3999, -8.2245],
    'Qatar': [25.3548, 51.1839],
    'Romania': [45.9432, 24.9668],
    'San Marino': [43.9424, 12.4578],
    'Saudi Arabia': [23.8859, 45.0792],
    'Serbia': [44.0165, 21.0059],
    'Singapore': [1.3521, 103.8198],
    'Slovakia': [48.6690, 19.6990],
    'Slovenia': [46.1512, 14.9955],
    'South Africa': [-30.5595, 22.9375],
    'South Korea': [35.9078, 127.7669],
    'Spain': [40.4637, -3.7492],
    'Sweden': [60.1282, 18.6435],
    'Switzerland': [46.8182, 8.2275],
    'Syria': [34.8021, 38.9968],
    'Taiwan': [23.6978, 120.9605],
    'Thailand': [15.8700, 100.9925],
    'Turkey': [38.9637, 35.2433],
    'Ukraine': [48.3794, 31.1656],
    'United Arab Emirates': [23.4241, 53.8478],
    'United Kingdom': [55.3781, -3.4360],
    'United States': [37.0902, -95.7129],
    'Uruguay': [-32.5228, -55.7658],
    'Uzbekistan': [41.3775, 64.5853],
    'Vatican City': [41.9029, 12.4534],
    'Venezuela': [6.4238, -66.5897],
    'Vietnam': [14.0583, 108.2772],
    'Yemen': [15.5527, 48.5164],
    // Russia at Moscow coordinates for origin/label anchoring
    'Russia': [55.7558, 37.6173],
    'Belarus': [53.7098, 27.9534],
    'Andorra': [42.5063, 1.5218]
};

// Initialize the application
document.addEventListener('DOMContentLoaded', function() {
    initializeMap();
    applyStoredZoomThreshold();
    // Load full world country list, then populate origin list
    loadWorldCountries().finally(async () => {
        populateOriginCountriesList();
        // Try to restore origin from storage
        const storedOrigin = localStorage.getItem('originCountry');
        if (storedOrigin) {
            await selectOriginCountry(storedOrigin);
        }
    });
    populateCountriesList();
    setupEventListeners();
    // Settings listeners
    const applyBtn = document.getElementById('applyZoomThresholdBtn');
    const resetBtn = document.getElementById('resetZoomThresholdBtn');
    const input = document.getElementById('zoomThresholdInput');
    if (applyBtn && input) {
        applyBtn.addEventListener('click', () => {
            const value = Number(input.value);
            if (Number.isFinite(value)) {
                FULL_NAME_ZOOM_THRESHOLD = value;
                try { localStorage.setItem('zoomThreshold', String(value)); } catch(_){}
                updateZoomIndicator();
                if (labelsVisible) updateAllCountryLabelTexts();
                showNotification(`✅ Zoom threshold set to ${value}`);
            }
        });
    }
    if (resetBtn && input) {
        resetBtn.addEventListener('click', () => {
            FULL_NAME_ZOOM_THRESHOLD = 4.25;
            input.value = '4.25';
            try { localStorage.removeItem('zoomThreshold'); } catch(_){}
            updateZoomIndicator();
            if (labelsVisible) updateAllCountryLabelTexts();
            showNotification('↩️ Zoom threshold reset to default (4.25)');
        });
    }
    
    initializeResizePanel();
    updateStats();
    updateOriginDisplay();
    
    // Show initial message about selecting origin
    setTimeout(() => {
        if (!ORIGIN_COUNTRY) {
            showNotification('👋 Welcome! Please select your origin country first.');
        }
    }, 1000);
});

// Load all world countries and coordinates from REST Countries
async function loadWorldCountries() {
    try {
        const response = await fetch('https://restcountries.com/v3.1/all?fields=name,latlng,altSpellings');
        const data = await response.json();
        const coordsMap = new Map();
        const variantMap = new Map();
        data.forEach(c => {
            const common = c?.name?.common;
            const official = c?.name?.official;
            const latlng = Array.isArray(c?.latlng) ? c.latlng : null;
            if (!common || !latlng || latlng.length < 2) return;
            coordsMap.set(common, [latlng[0], latlng[1]]);
            const variants = new Set([common, official, ...(c.altSpellings || [])]);
            variants.forEach(v => {
                if (v) variantMap.set(String(v).toLowerCase(), common);
            });
        });
        WORLD_COUNTRY_COORDS = coordsMap;
        NAME_TO_CANONICAL = variantMap;
        ALL_WORLD_COUNTRIES = Array.from(WORLD_COUNTRY_COORDS.keys()).sort((a, b) => a.localeCompare(b));
    } catch (err) {
        console.warn('Could not load world countries list; falling back to internal list.', err);
        // Fallback: build from COUNTRY_DATA only
        ALL_WORLD_COUNTRIES = Object.keys(COUNTRY_DATA).sort();
        WORLD_COUNTRY_COORDS = new Map(ALL_WORLD_COUNTRIES.map(name => [name, COUNTRY_DATA[name]]));
        NAME_TO_CANONICAL = new Map(ALL_WORLD_COUNTRIES.map(name => [name.toLowerCase(), name]));
    }
}

// Initialize the Leaflet map
function initializeMap() {
    // Create map centered on world view (no origin selected yet)
    map = L.map('map', {
        preferCanvas: true,
        center: [20, 0], // World center view
        zoom: 2,
        zoomControl: true,
        worldCopyJump: true,
        // Finer zoom steps for more precise control
        zoomSnap: 0.25,
        zoomDelta: 0.25,
        wheelDebounceTime: 20
    });

    // Add clean tile layer without city names or labels
    baseTileLayer = L.tileLayer('https://{s}.basemaps.cartocdn.com/light_nolabels/{z}/{x}/{y}{r}.png', {
        attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors © <a href="https://carto.com/attributions">CARTO</a>',
        maxZoom: 18,
        minZoom: 2,
        subdomains: 'abcd',
        crossOrigin: true
    }).addTo(map);

    // Update label texts dynamically based on zoom level
    map.on('zoomend', function() {
        if (labelsVisible) {
            updateAllCountryLabelTexts();
        }
        updateZoomIndicator();
    });

    // Initialize indicator
    updateZoomIndicator();

    // No origin marker initially - user must select origin
}

// Add origin marker
function addOriginMarker() {
    if (!ORIGIN_COORDS || !ORIGIN_COUNTRY) return;
    
    const originIcon = L.divIcon({
        className: 'origin-marker',
        iconSize: [12, 12],
        iconAnchor: [6, 6]
    });

    originMarker = L.marker(ORIGIN_COORDS, { 
        icon: originIcon,
        zIndexOffset: 1000
    }).addTo(map);

    originMarker.bindPopup(`
        <div class="popup-title">🏢 Company Headquarters</div>
        <div class="popup-subtitle">${ORIGIN_COUNTRY} - Origin Point</div>
    `, {
        className: 'origin-popup'
    });

    // Add origin label with same zoom logic as delivery countries
    if (labelsVisible) {
        addOriginLabel();
    }
}

// Region mapping for quick selection
const COUNTRY_REGIONS = {
    'Europe': [
        'Albania', 'Andorra', 'Austria', 'Belarus', 'Belgium', 'Bosnia and Herzegovina', 'Bulgaria', 'Croatia',
        'Cyprus', 'Czech Republic', 'Denmark', 'Estonia', 'Finland', 'France', 'Germany', 'Greece',
        'Hungary', 'Iceland', 'Ireland', 'Italy', 'Latvia', 'Liechtenstein', 'Lithuania', 'Luxembourg', 'Malta',
        'Moldova', 'Monaco', 'Montenegro', 'Netherlands', 'North Macedonia', 'Norway', 'Poland', 'Portugal',
        'Romania', 'Russia', 'San Marino', 'Serbia', 'Slovakia', 'Slovenia', 'Spain', 'Sweden', 'Switzerland',
        'Ukraine', 'United Kingdom', 'Vatican City'
    ],
    'Asia': [
        'Afghanistan','Armenia','Azerbaijan','Bahrain','Bangladesh','Bhutan','Brunei','Cambodia','China','Cyprus',
        'Georgia','India','Indonesia','Iran','Iraq','Israel','Japan','Jordan','Kazakhstan','Kuwait','Kyrgyzstan',
        'Laos','Lebanon','Malaysia','Maldives','Mongolia','Myanmar','Nepal','North Korea','Oman','Pakistan',
        'Philippines','Qatar','Saudi Arabia','Singapore','South Korea','Sri Lanka','Syria','Taiwan','Tajikistan',
        'Thailand','Timor-Leste','Turkey','Turkmenistan','United Arab Emirates','Uzbekistan','Vietnam','Yemen'
    ],
    'Americas': [
        'Argentina','Belize','Bolivia','Brazil','Canada','Chile','Colombia','Costa Rica','Cuba','Dominican Republic',
        'Ecuador','El Salvador','Guatemala','Haiti','Honduras','Jamaica','Mexico','Nicaragua','Panama','Paraguay',
        'Peru','Trinidad and Tobago','United States','Uruguay','Venezuela'
    ],
    'Africa': [
        'Algeria','Angola','Benin','Botswana','Burkina Faso','Burundi','Cameroon','Cape Verde','Central African Republic',
        'Chad','Comoros','Congo','DR Congo','Djibouti','Egypt','Equatorial Guinea','Eritrea','Eswatini','Ethiopia',
        'Gabon','Gambia','Ghana','Guinea','Guinea-Bissau','Ivory Coast','Kenya','Lesotho','Liberia','Libya','Madagascar',
        'Malawi','Mali','Mauritania','Mauritius','Morocco','Mozambique','Namibia','Niger','Nigeria','Rwanda','Sao Tome and Principe',
        'Senegal','Seychelles','Sierra Leone','Somalia','South Africa','South Sudan','Sudan','Tanzania','Togo','Tunisia','Uganda','Zambia','Zimbabwe'
    ],
    'Oceania': [
        'Australia','Fiji','Kiribati','Marshall Islands','Micronesia','Nauru','New Zealand','Palau','Papua New Guinea','Samoa','Solomon Islands','Tonga','Tuvalu','Vanuatu'
    ],
    'World': [] // computed at runtime
};

// Country name abbreviations for cleaner labels
const COUNTRY_ABBREVIATIONS = {
    // Europe (ISO-like)
    'Albania': 'AL',
    'Andorra': 'AD',
    'Austria': 'AT',
    'Belarus': 'BY',
    'Belgium': 'BE',
    'Bosnia and Herzegovina': 'BA',
    'Bulgaria': 'BG',
    'Croatia': 'HR',
    'Cyprus': 'CY',
    'Czech Republic': 'CZ',
    'Denmark': 'DK',
    'Estonia': 'EE',
    'Finland': 'FI',
    'France': 'FR',
    'Germany': 'DE',
    'Greece': 'GR',
    'Hungary': 'HU',
    'Iceland': 'IS',
    'Ireland': 'IE',
    'Italy': 'IT',
    'Latvia': 'LV',
    'Liechtenstein': 'LI',
    'Lithuania': 'LT',
    'Luxembourg': 'LU',
    'Malta': 'MT',
    'Moldova': 'MD',
    'Monaco': 'MC',
    'Montenegro': 'ME',
    'Netherlands': 'NL',
    'North Macedonia': 'MK',
    'Norway': 'NO',
    'Poland': 'PL',
    'Portugal': 'PT',
    'Romania': 'RO',
    'Russia': 'RU',
    'San Marino': 'SM',
    'Serbia': 'RS',
    'Slovakia': 'SK',
    'Slovenia': 'SI',
    'Spain': 'ES',
    'Sweden': 'SE',
    'Switzerland': 'CH',
    'Ukraine': 'UA',
    'United Kingdom': 'UK',
    'Vatican City': 'VA',

    // Middle East/Asia (selected)
    'Saudi Arabia': 'SA',
    'United Arab Emirates': 'UAE',
    'Israel': 'IL',
    'Turkey': 'TR',
    'Georgia': 'GE',
    'Armenia': 'AM',
    'Azerbaijan': 'AZ',
    'Kazakhstan': 'KZ',
    'Kyrgyzstan': 'KG',
    'Uzbekistan': 'UZ',
    'Bahrain': 'BH',
    'Qatar': 'QA',
    'Kuwait': 'KW',
    'Lebanon': 'LB',
    'Jordan': 'JO',
    'Iran': 'IR',
    'Iraq': 'IQ',
    'Syria': 'SY',
    'India': 'IN',
    'Pakistan': 'PK',
    'China': 'CN',
    'Japan': 'JP',
    'South Korea': 'KR',
    'North Korea': 'KP',
    'Philippines': 'PH',
    'Thailand': 'TH',
    'Vietnam': 'VN',
    'Singapore': 'SG',
    'Malaysia': 'MY',
    'Indonesia': 'ID',
    'Taiwan': 'TW',

    // Americas
    'Argentina': 'AR',
    'Bolivia': 'BO',
    'Brazil': 'BR',
    'Canada': 'CA',
    'Chile': 'CL',
    'Colombia': 'CO',
    'Ecuador': 'EC',
    'Mexico': 'MX',
    'Peru': 'PE',
    'United States': 'USA',
    'Uruguay': 'UY',
    'Venezuela': 'VE',

    // Africa & Oceania
    'Algeria': 'DZ',
    'Egypt': 'EG',
    'Ghana': 'GH',
    'Kenya': 'KE',
    'Morocco': 'MA',
    'Nigeria': 'NG',
    'South Africa': 'ZA',
    'Australia': 'AU',
    'New Zealand': 'NZ'
};

// Fallback abbreviation generator for any country not in the map
function abbreviateCountry(countryName) {
    if (COUNTRY_ABBREVIATIONS[countryName]) return COUNTRY_ABBREVIATIONS[countryName];
    const stopwords = new Set(['and','of','the','republic','federation','democratic','people','people\'s','arab','emirates','kingdom','state','states','north','south']);
    const words = String(countryName)
        .split(/[^A-Za-z]+/)
        .filter(Boolean)
        .map(w => w.toLowerCase())
        .filter(w => !stopwords.has(w));
    if (words.length >= 2) {
        return (words[0][0] + words[1][0]).toUpperCase();
    }
    const word = words[0] || countryName;
    return word.slice(0, 2).toUpperCase();
}

// Add country flags mapping
const COUNTRY_FLAGS = {
    'Afghanistan': '🇦🇫', 'Albania': '🇦🇱', 'Algeria': '🇩🇿', 'Argentina': '🇦🇷', 'Armenia': '🇦🇲',
    'Australia': '🇦🇺', 'Austria': '🇦🇹', 'Azerbaijan': '🇦🇿', 'Bahrain': '🇧🇭', 'Bangladesh': '🇧🇩',
    'Belgium': '🇧🇪', 'Bolivia': '🇧🇴', 'Bosnia and Herzegovina': '🇧🇦', 'Brazil': '🇧🇷',
    'Bulgaria': '🇧🇬', 'Cambodia': '🇰🇭', 'Canada': '🇨🇦', 'Chile': '🇨🇱', 'China': '🇨🇳',
    'Colombia': '🇨🇴', 'Croatia': '🇭🇷', 'Cyprus': '🇨🇾', 'Czech Republic': '🇨🇿', 'Denmark': '🇩🇰', 'Ecuador': '🇪🇨',
    'Egypt': '🇪🇬', 'Estonia': '🇪🇪', 'Finland': '🇫🇮', 'France': '🇫🇷', 'Georgia': '🇬🇪',
    'Germany': '🇩🇪', 'Ghana': '🇬🇭', 'Greece': '🇬🇷', 'Hungary': '🇭🇺', 'Iceland': '🇮🇸',
    'India': '🇮🇳', 'Indonesia': '🇮🇩', 'Iran': '🇮🇷', 'Iraq': '🇮🇶', 'Ireland': '🇮🇪',
    'Israel': '🇮🇱', 'Italy': '🇮🇹', 'Japan': '🇯🇵', 'Jordan': '🇯🇴', 'Kazakhstan': '🇰🇿',
    'Kenya': '🇰🇪', 'Kuwait': '🇰🇼', 'Kyrgyzstan': '🇰🇬', 'Latvia': '🇱🇻', 'Lebanon': '🇱🇧', 'Liechtenstein': '🇱🇮',
    'Lithuania': '🇱🇹', 'Luxembourg': '🇱🇺', 'Malaysia': '🇲🇾', 'Malta': '🇲🇹', 'Mexico': '🇲🇽', 'Moldova': '🇲🇩',
    'Monaco': '🇲🇨', 'Mongolia': '🇲🇳', 'Montenegro': '🇲🇪', 'Morocco': '🇲🇦', 'Netherlands': '🇳🇱', 'New Zealand': '🇳🇿',
    'Nigeria': '🇳🇬', 'North Macedonia': '🇲🇰', 'Norway': '🇳🇴', 'Pakistan': '🇵🇰', 'Peru': '🇵🇪', 'Philippines': '🇵🇭',
    'Poland': '🇵🇱', 'Portugal': '🇵🇹', 'Qatar': '🇶🇦', 'Romania': '🇷🇴', 'San Marino': '🇸🇲',
    'Saudi Arabia': '🇸🇦', 'Serbia': '🇷🇸', 'Singapore': '🇸🇬', 'Slovakia': '🇸🇰', 'Slovenia': '🇸🇮', 'South Africa': '🇿🇦',
    'South Korea': '🇰🇷', 'Spain': '🇪🇸', 'Sweden': '🇸🇪', 'Switzerland': '🇨🇭', 'Syria': '🇸🇾', 'Taiwan': '🇹🇼',
    'Thailand': '🇹🇭', 'Turkey': '🇹🇷', 'Ukraine': '🇺🇦', 'United Arab Emirates': '🇦🇪', 'United Kingdom': '🇬🇧',
    'United States': '🇺🇸', 'Uruguay': '🇺🇾', 'Uzbekistan': '🇺🇿', 'Vatican City': '🇻🇦', 'Venezuela': '🇻🇪', 'Vietnam': '🇻🇳', 'Yemen': '🇾🇪',
    'Russia': '🇷🇺', 'Belarus': '🇧🇾', 'Andorra': '🇦🇩'
};

// Populate origin countries dropdown
function populateOriginCountriesList() {
    const originSelect = document.getElementById('originCountrySelect');
    if (!originSelect) return;
    // Hide the original dropdown to avoid duplicate UI; we use the input+datalist instead
    originSelect.style.display = 'none';
    originSelect.setAttribute('aria-hidden', 'true');
    
    // Build list from ALL_WORLD_COUNTRIES (full world list when available)
    const allCountries = (ALL_WORLD_COUNTRIES && ALL_WORLD_COUNTRIES.length)
        ? ALL_WORLD_COUNTRIES
        : Object.keys(COUNTRY_DATA).sort();
    
    // Keep options in DOM if needed programmatically, though element is hidden
    originSelect.innerHTML = '<option value="">Select Origin Country...</option>';
    allCountries.forEach(country => {
        const option = document.createElement('option');
        option.value = country;
        option.textContent = country;
        originSelect.appendChild(option);
    });

    // Create a type-to-search input with datalist for origin selection (non-destructive to existing select)
    let originInput = document.getElementById('originCountryInput');
    if (!originInput) {
        originInput = document.createElement('input');
        originInput.type = 'text';
        originInput.id = 'originCountryInput';
        originInput.setAttribute('list', 'originCountriesDatalist');
        originInput.placeholder = 'Type to select origin country...';
        originInput.className = 'origin-country-input';
        // Insert the input just before the select for better UX
        if (originSelect.parentNode) {
            originSelect.parentNode.insertBefore(originInput, originSelect);
        }
    }

    let datalist = document.getElementById('originCountriesDatalist');
    if (!datalist) {
        datalist = document.createElement('datalist');
        datalist.id = 'originCountriesDatalist';
        document.body.appendChild(datalist);
    }
    // Populate datalist with all countries (full world list if available)
    datalist.innerHTML = '';
    allCountries.forEach(country => {
        const opt = document.createElement('option');
        opt.value = country;
        datalist.appendChild(opt);
    });
}

// Populate countries list with checkboxes
function populateCountriesList() {
    // Convert country data to array and sort alphabetically (include all countries if no origin set)
    countries = Object.keys(COUNTRY_DATA).filter(country => country !== ORIGIN_COUNTRY).sort();
    filteredCountries = [...countries];
    
    renderCountriesList();
}

// Render countries list
function renderCountriesList() {
    const container = document.getElementById('countriesList');
    container.innerHTML = '';
    
    filteredCountries.forEach(country => {
        const item = document.createElement('div');
        item.className = `country-item ${selectedCountries.has(country) ? 'selected' : ''}`;
        item.innerHTML = `
            <input type="checkbox" 
                   class="country-checkbox" 
                   id="country-${country}" 
                   ${selectedCountries.has(country) ? 'checked' : ''}
                   ${deliveryMarkers.has(country) ? 'disabled' : ''}>
            <label class="country-name-checkbox" for="country-${country}">
                ${country}
            </label>
            <span class="country-flag">${COUNTRY_FLAGS[country] || '🌍'}</span>
        `;
        
        // Add event listeners
        const checkbox = item.querySelector('.country-checkbox');
        const label = item.querySelector('.country-name-checkbox');
        
        [checkbox, label, item].forEach(element => {
            element.addEventListener('click', (e) => {
                if (deliveryMarkers.has(country)) return;
                
                e.stopPropagation();
                toggleCountrySelection(country);
            });
        });
        
        container.appendChild(item);
    });
    
    updateSelectedCount();
}

// Setup event listeners
function setupEventListeners() {
    const addSelectedBtn = document.getElementById('addSelectedBtn');
    const selectAllBtn = document.getElementById('selectAllBtn');
    const clearSelectionBtn = document.getElementById('clearSelectionBtn');
    const selectEuropeBtn = document.getElementById('selectEuropeBtn');
    const selectAsiaBtn = document.getElementById('selectAsiaBtn');
    const selectAmericasBtn = document.getElementById('selectAmericasBtn');
    const selectAfricaBtn = document.getElementById('selectAfricaBtn');
    const selectOceaniaBtn = document.getElementById('selectOceaniaBtn');
    const selectWorldBtn = document.getElementById('selectWorldBtn');
    const fullscreenBtn = document.getElementById('fullscreenBtn');
    const toggleLabelsBtn = document.getElementById('toggleLabelsBtn');
    const reorganizeBtn = document.getElementById('reorganizeBtn');
    const saveMapBtn = document.getElementById('saveMapBtn');
    const saveJpgBtn = document.getElementById('saveJpgBtn');
    const printMapBtn = document.getElementById('printMapBtn');
    const clearAllBtn = document.getElementById('clearAllBtn');
    const resetBtn = document.getElementById('resetViewBtn');
    const searchInput = document.getElementById('countrySearch');
    const changeOriginBtn = document.getElementById('changeOriginBtn');
    const originInput = document.getElementById('originCountryInput');

    addSelectedBtn.addEventListener('click', addSelectedCountries);
    selectAllBtn.addEventListener('click', selectAllCountries);
    clearSelectionBtn.addEventListener('click', clearSelection);
    selectEuropeBtn.addEventListener('click', () => selectRegion('Europe'));
    selectAsiaBtn.addEventListener('click', () => selectRegion('Asia'));
    selectAmericasBtn.addEventListener('click', () => selectRegion('Americas'));
    if (selectAfricaBtn) selectAfricaBtn.addEventListener('click', () => selectRegion('Africa'));
    if (selectOceaniaBtn) selectOceaniaBtn.addEventListener('click', () => selectRegion('Oceania'));
    if (selectWorldBtn) selectWorldBtn.addEventListener('click', () => selectRegion('World'));
    // Full screen button with error handling
    if (fullscreenBtn) {
        fullscreenBtn.addEventListener('click', toggleFullscreen);
        console.log('✅ Full screen button initialized successfully');
    } else {
        console.error('❌ Full screen button not found!');
    }
    toggleLabelsBtn.addEventListener('click', toggleCountryLabels);
    reorganizeBtn.addEventListener('click', () => {
        reorganizeLabels();
        showNotification('Country names reorganized for better visibility!');
    });
    saveMapBtn.addEventListener('click', saveMapAsPDF);
    saveJpgBtn.addEventListener('click', saveMapAsJPG);
    printMapBtn.addEventListener('click', printMap);
    
    // Dropdown functionality
    const saveDropdownBtn = document.getElementById('saveDropdownBtn');
    const saveDropdownMenu = document.getElementById('saveDropdownMenu');
    
    if (saveDropdownBtn && saveDropdownMenu) {
        saveDropdownBtn.addEventListener('click', function(e) {
            e.stopPropagation();
            const isOpen = saveDropdownMenu.classList.contains('show');
            if (isOpen) {
                saveDropdownMenu.classList.remove('show');
                saveDropdownBtn.classList.remove('active');
            } else {
                saveDropdownMenu.classList.add('show');
                saveDropdownBtn.classList.add('active');
            }
        });
        
        // Close dropdown when clicking outside
        document.addEventListener('click', function() {
            saveDropdownMenu.classList.remove('show');
            saveDropdownBtn.classList.remove('active');
        });
        
        // Prevent dropdown from closing when clicking inside
        saveDropdownMenu.addEventListener('click', function(e) {
            e.stopPropagation();
        });
    }
    clearAllBtn.addEventListener('click', clearAllDeliveryPoints);
    resetBtn.addEventListener('click', resetMapView);
    
    // Search functionality
    searchInput.addEventListener('input', function(e) {
        filterCountries(e.target.value);
    });
    
    // Add selected countries on Enter key press
    searchInput.addEventListener('keypress', function(e) {
        if (e.key === 'Enter' && selectedCountries.size > 0) {
            addSelectedCountries();
        }
    });
    
    // Origin country selection: button selects origin from input or dropdown
    if (changeOriginBtn) {
        changeOriginBtn.textContent = 'Select Origin Country';
        changeOriginBtn.addEventListener('click', async () => {
            const originSelect = document.getElementById('originCountrySelect');
            const input = document.getElementById('originCountryInput');
            const candidate = (input && input.value) ? input.value : (originSelect ? originSelect.value : '');
            await selectOriginCountry(candidate);
        });
    }

    // Allow Enter key in the origin input to select
    if (originInput) {
        originInput.addEventListener('keypress', async (e) => {
            if (e.key === 'Enter') {
                await selectOriginCountry(originInput.value);
            }
        });
    }
}

// Toggle country selection
function toggleCountrySelection(countryName) {
    if (deliveryMarkers.has(countryName)) return;
    
    if (selectedCountries.has(countryName)) {
        selectedCountries.delete(countryName);
    } else {
        selectedCountries.add(countryName);
    }
    
    renderCountriesList();
}

// Update selected count
function updateSelectedCount() {
    const count = selectedCountries.size;
    document.getElementById('selectedCount').textContent = count;
    document.getElementById('addSelectedBtn').disabled = count === 0;
}

// Filter countries based on search
function filterCountries(searchTerm) {
    const term = searchTerm.toLowerCase();
    filteredCountries = countries.filter(country => 
        country.toLowerCase().includes(term)
    );
    renderCountriesList();
}

// Select all visible countries
function selectAllCountries() {
    filteredCountries.forEach(country => {
        if (!deliveryMarkers.has(country)) {
            selectedCountries.add(country);
        }
    });
    renderCountriesList();
}

// Clear all selections
function clearSelection() {
    selectedCountries.clear();
    renderCountriesList();
}

// Select countries by region
function selectRegion(regionName) {
    let regionCountries = COUNTRY_REGIONS[regionName] || [];

    if (regionName === 'World') {
        // Build from COUNTRY_DATA keys to include everything
        regionCountries = Object.keys(COUNTRY_DATA);
    }
    
    // Clear current selection first
    selectedCountries.clear();
    
    // Add all available countries from the region (exclude origin)
    regionCountries.forEach(country => {
        if (country !== ORIGIN_COUNTRY && countries.includes(country) && !deliveryMarkers.has(country)) {
            selectedCountries.add(country);
        }
    });
    
    // Update the display
    renderCountriesList();
    
    // Show notification
    const availableCount = Array.from(selectedCountries).length;
    showNotification(`Selected ${availableCount} countries from ${regionName}!`);
}

// Toggle fullscreen mode
function toggleFullscreen() {
    const fullscreenBtn = document.getElementById('fullscreenBtn');
    const appContainer = document.querySelector('.app-container');
    
    if (!isFullscreen) {
        // Enter fullscreen mode
        isFullscreen = true;
        appContainer.classList.add('fullscreen-mode');
        document.body.classList.add('fullscreen-active');
        
        // Update button appearance
        fullscreenBtn.classList.add('active');
        fullscreenBtn.innerHTML = '<i class="fas fa-compress"></i> Exit Full Screen';
        
        // Create floating exit button
        createExitButton();
        
        // Invalidate map size after animation
        setTimeout(() => {
            map.invalidateSize();
        }, 300);
        
        // Notification removed - exit button and tooltip are sufficient
        
    } else {
        exitFullscreen();
    }
}

// Exit fullscreen mode
function exitFullscreen() {
    const fullscreenBtn = document.getElementById('fullscreenBtn');
    const appContainer = document.querySelector('.app-container');
    const exitBtn = document.querySelector('.fullscreen-exit-btn');
    // instructionDiv removed since we no longer create instruction text
    
    isFullscreen = false;
    appContainer.classList.remove('fullscreen-mode');
    document.body.classList.remove('fullscreen-active');
    
    // Update button appearance
    if (fullscreenBtn) {
        fullscreenBtn.classList.remove('active');
        fullscreenBtn.innerHTML = '<i class="fas fa-expand"></i> Full Screen';
    }
    
    // Remove exit button and instruction
    if (exitBtn) {
        exitBtn.remove();
    }
    // instructionDiv removal code removed since we no longer create it
    
    // Invalidate map size after animation
    setTimeout(() => {
        map.invalidateSize();
    }, 300);
    
    showNotification('↩️ Exited full screen mode - controls restored');
}

// Create floating exit button for fullscreen mode
function createExitButton() {
    // Remove any existing exit button first
    const existingBtn = document.querySelector('.fullscreen-exit-btn');
    if (existingBtn) {
        existingBtn.remove();
    }
    
    const exitBtn = document.createElement('button');
    exitBtn.className = 'fullscreen-exit-btn';
    exitBtn.innerHTML = '<i class="fas fa-times"></i>';
    exitBtn.title = 'Exit Full Screen (or press ESC)';
    
    exitBtn.addEventListener('click', exitFullscreen);
    
    // Also allow ESC key to exit
    const handleEscape = (e) => {
        if (e.key === 'Escape' && isFullscreen) {
            exitFullscreen();
            document.removeEventListener('keydown', handleEscape);
        }
    };
    document.addEventListener('keydown', handleEscape);
    
    // Instruction text removed - tooltip on button is sufficient
    
    document.body.appendChild(exitBtn);
    
    // Auto-hide removed since instruction text was removed
}

// Toggle country labels visibility
function toggleCountryLabels() {
    const toggleBtn = document.getElementById('toggleLabelsBtn');
    const reorganizeBtn = document.getElementById('reorganizeBtn');
    
    labelsVisible = !labelsVisible;
    
    if (labelsVisible) {
        // Show labels with smart organization
        reorganizeLabels();
        
        // Update button appearance
        toggleBtn.classList.add('active');
        toggleBtn.innerHTML = '<i class="fas fa-tag"></i> Hide Names';
        
        // Show reorganize button
        reorganizeBtn.style.display = 'block';
        
        // Also show origin label
        addOriginLabel();
        
        showNotification('Country names organized and visible');
        
    } else {
        // Hide labels - remove all existing labels
        countryLabels.forEach(label => {
            map.removeLayer(label);
        });
        countryLabels.clear();
        
        // Update button appearance
        toggleBtn.classList.remove('active');
        toggleBtn.innerHTML = '<i class="fas fa-tag"></i> Show Names';
        
        // Hide reorganize button
        reorganizeBtn.style.display = 'none';
        
        // Also hide origin label
        hideOriginLabel();
        
        showNotification('Country names are now hidden');
    }
}

// Add selected countries
function addSelectedCountries() {
    if (!ORIGIN_COUNTRY) {
        alert('Please select an origin country first.');
        return;
    }
    
    if (selectedCountries.size === 0) {
        alert('Please select at least one country first.');
        return;
    }

    const countriesToAdd = Array.from(selectedCountries);
    let addedCount = 0;

    countriesToAdd.forEach(countryName => {
        if (!deliveryMarkers.has(countryName)) {
            const coords = COUNTRY_DATA[countryName];
            if (coords) {
                addDeliveryPointByName(countryName, coords);
                addedCount++;
            }
        }
    });

    if (addedCount > 0) {
        // Clear selections
        selectedCountries.clear();
        renderCountriesList();
        
        // Reorganize labels if visible
        if (labelsVisible) {
            reorganizeLabels();
        }
        
        // Update stats and fit map
        updateStats();
        fitMapToPoints();
        
        // Show success message
        if (addedCount === 1) {
            showNotification(`Added ${addedCount} delivery point successfully!`);
        } else {
            showNotification(`Added ${addedCount} delivery points successfully!`);
        }
    } else {
        alert('No new countries were added. They may already be in your delivery network.');
    }
}

// Add delivery point by name and coordinates
function addDeliveryPointByName(countryName, coords) {
    if (deliveryMarkers.has(countryName)) {
        return false;
    }

    // Create delivery marker
    const deliveryIcon = L.divIcon({
        className: 'delivery-marker',
        iconSize: [8, 8],
        iconAnchor: [4, 4]
    });

    const marker = L.marker(coords, { 
        icon: deliveryIcon,
        zIndexOffset: 500
    }).addTo(map);

    marker.bindPopup(`
        <div class="popup-title">📦 ${countryName}</div>
        <div class="popup-subtitle">Delivery Point</div>
    `);

    // Store marker
    deliveryMarkers.set(countryName, marker);

    // Add country label only if labels are visible
    if (labelsVisible) {
        const label = addCountryLabel(countryName, coords);
        countryLabels.set(countryName, label);
    }

    // Create curved line from origin to delivery point
    createCurvedLine(ORIGIN_COORDS, coords, countryName);

    // Add to delivery list
    addToDeliveryList(countryName);

    return true;
}

// Show notification
function showNotification(message) {
    // Create notification element
    const notification = document.createElement('div');
    notification.className = 'notification';
    notification.innerHTML = `
        <i class="fas fa-check-circle"></i>
        <span>${message}</span>
    `;
    
    // Add to document
    document.body.appendChild(notification);
    
    // Animate in
    setTimeout(() => {
        notification.classList.add('show');
    }, 100);
    
    // Remove after 3 seconds
    setTimeout(() => {
        notification.classList.remove('show');
        setTimeout(() => {
            if (notification.parentNode) {
                notification.parentNode.removeChild(notification);
            }
        }, 300);
    }, 3000);
}

// Create curved dotted line between two points
function createCurvedLine(start, end, countryName) {
    // Calculate basic line properties
    const deltaLat = end[0] - start[0];
    const deltaLng = end[1] - start[1];
    const distance = Math.sqrt(deltaLat * deltaLat + deltaLng * deltaLng);
    
    // Create a hash from country name for consistent curve direction
    let hash = 0;
    for (let i = 0; i < countryName.length; i++) {
        hash = ((hash << 5) - hash) + countryName.charCodeAt(i);
        hash = hash & hash; // Convert to 32-bit integer
    }
    
    // Use hash to determine curve direction and characteristics
    const curveDirection = (hash % 2 === 0) ? 1 : -1; // Alternate curve sides
    const curveIntensity = 0.2 + ((Math.abs(hash) % 3) / 15); // Lighter curve intensity
    const heightVariation = (Math.abs(hash) % 20) + 10; // Smaller height variation
    
    // Calculate curve parameters
    const midLat = (start[0] + end[0]) / 2;
    const midLng = (start[1] + end[1]) / 2;
    
    // Base curve offset
    let curveOffset = Math.min(distance * curveIntensity, heightVariation);
    
    // Add subtle directional variation for different regions
    if (end[0] > start[0]) { // Northern countries
        curveOffset *= 1.1;
    }
    if (end[1] < start[1]) { // Western countries
        curveOffset *= 0.9;
    }
    
    // Calculate perpendicular offset with direction variation
    const perpLat = (-deltaLng / distance * curveOffset * curveDirection);
    const perpLng = (deltaLat / distance * curveOffset * curveDirection);
    
    // Add subtle randomness based on country position
    const randomOffset = ((Math.abs(hash) % 6) - 3) * 0.3;
    const controlPoint = [
        midLat + perpLat + randomOffset,
        midLng + perpLng + randomOffset
    ];

    // Create smooth quadratic curve points
    const curvePoints = [];
    for (let i = 0; i <= 60; i++) { // More points for smoother curves
        const t = i / 60;
        const lat = (1 - t) * (1 - t) * start[0] + 2 * (1 - t) * t * controlPoint[0] + t * t * end[0];
        const lng = (1 - t) * (1 - t) * start[1] + 2 * (1 - t) * t * controlPoint[1] + t * t * end[1];
        curvePoints.push([lat, lng]);
    }

    // Create polyline with light styling
    const line = L.polyline(curvePoints, {
        color: '#27ae60',
        weight: 1.5,
        opacity: 0.6,
        dashArray: '6, 3',
        className: 'delivery-line',
        lineCap: 'round',
        lineJoin: 'round'
    }).addTo(map);

    // Store line
    deliveryLines.set(countryName, line);
}

// Add country name label on map with improved positioning
function addCountryLabel(countryName, coords) {
    // Choose name based on zoom level: full name when zoomed in, abbreviation when zoomed out
    const useFull = map.getZoom() >= FULL_NAME_ZOOM_THRESHOLD;
    const displayName = useFull ? countryName : abbreviateCountry(countryName);
    
    // Positioning adjustments, with special handling for Russia to avoid mid-Siberia placement
    let offsetLat = 0.2; // Closer to the marker
    let offsetLng = 0.6; // Closer to the marker
    if (countryName === 'Russia') {
        // Place label just to the right of Moscow, closer to the anchor point
        offsetLat = 0.15;
        offsetLng = 0.8;
    }
    const offsetCoords = [coords[0] + offsetLat, coords[1] + offsetLng];
    
    const label = L.marker(offsetCoords, {
        icon: L.divIcon({
            className: 'country-label-improved',
            html: `<span class="country-label-text-improved">${displayName}</span>`,
            iconSize: [displayName.length * 6 + 8, 16],
            iconAnchor: [0, 8] // Left-center anchor, smaller height
        }),
        zIndexOffset: 100
    }).addTo(map);
    
    // Store for cleanup
    if (!window.countryLabels) {
        window.countryLabels = new Map();
    }
    window.countryLabels.set(countryName, label);
    
    return label;
}

// Update texts for all existing labels on zoom change
function updateAllCountryLabelTexts() {
    if (!window.countryLabels) return;
    const useFull = map.getZoom() >= FULL_NAME_ZOOM_THRESHOLD;
    for (const [countryName, marker] of window.countryLabels) {
        const displayName = useFull ? countryName : abbreviateCountry(countryName);
        const el = marker.getElement();
        if (el) {
            const span = el.querySelector('.country-label-text-improved');
            if (span && span.textContent !== displayName) {
                span.textContent = displayName;
            }
        }
    }
    
    // Also update origin label if it exists
    updateOriginLabelText();
}

// Advanced label positioning with collision detection
function findOptimalLabelPosition(coords, displayName) {
    const textWidth = Math.max(displayName.length * 6, 40); // Estimate text width
    const textHeight = 16;
    const padding = 8;
    
    // Define possible positions (distance from point, angle in degrees)
    const candidatePositions = [
        { distance: 25, angle: 0,   priority: 1 },   // Right
        { distance: 25, angle: 180, priority: 2 },   // Left  
        { distance: 30, angle: 270, priority: 3 },   // Above
        { distance: 30, angle: 90,  priority: 4 },   // Below
        { distance: 35, angle: 315, priority: 5 },   // Top-right
        { distance: 35, angle: 225, priority: 6 },   // Bottom-left
        { distance: 35, angle: 45,  priority: 7 },   // Top-left
        { distance: 35, angle: 135, priority: 8 },   // Bottom-right
        { distance: 45, angle: 0,   priority: 9 },   // Far right
        { distance: 45, angle: 180, priority: 10 },  // Far left
        { distance: 50, angle: 270, priority: 11 },  // Far above
        { distance: 50, angle: 90,  priority: 12 }   // Far below
    ];
    
    // Sort by priority and check for collisions
    candidatePositions.sort((a, b) => a.priority - b.priority);
    
    for (const position of candidatePositions) {
        const offsetX = Math.cos(position.angle * Math.PI / 180) * position.distance;
        const offsetY = Math.sin(position.angle * Math.PI / 180) * position.distance;
        
        // More accurate conversion based on latitude
        const latScale = 111000; // meters per degree latitude
        const lngScale = 111000 * Math.cos(coords[0] * Math.PI / 180); // meters per degree longitude at this latitude
        
        const labelBounds = {
            left: coords[1] + (offsetX / lngScale),
            right: coords[1] + (offsetX / lngScale) + (textWidth * 10 / lngScale),
            top: coords[0] + (offsetY / latScale),
            bottom: coords[0] + (offsetY / latScale) - (textHeight * 10 / latScale)
        };
        
        // Check collision with existing labels
        if (!hasCollision(labelBounds)) {
            return {
                width: textWidth + padding,
                anchorX: (textWidth + padding) / 2 - offsetX,
                anchorY: 8 - offsetY,
                bounds: labelBounds
            };
        }
    }
    
    // If all positions have collisions, use fallback with extra distance
    const fallbackDistance = 60 + (Math.random() * 20); // Add some randomness
    const fallbackAngle = Math.random() * 360;
    const offsetX = Math.cos(fallbackAngle * Math.PI / 180) * fallbackDistance;
    const offsetY = Math.sin(fallbackAngle * Math.PI / 180) * fallbackDistance;
    
    // Use same accurate conversion for fallback
    const latScale = 111000;
    const lngScale = 111000 * Math.cos(coords[0] * Math.PI / 180);
    
    return {
        width: textWidth + padding,
        anchorX: (textWidth + padding) / 2 - offsetX,
        anchorY: 8 - offsetY,
        bounds: {
            left: coords[1] + (offsetX / lngScale),
            right: coords[1] + (offsetX / lngScale) + (textWidth * 10 / lngScale),
            top: coords[0] + (offsetY / latScale),
            bottom: coords[0] + (offsetY / latScale) - (textHeight * 10 / latScale)
        }
    };
}

// Check if label position collides with existing labels
function hasCollision(newBounds) {
    for (const [countryName, label] of countryLabels) {
        if (label._labelInfo && label._labelInfo.bounds) {
            const existingBounds = label._labelInfo.bounds;
            
            // Check if rectangles overlap
            if (!(newBounds.right < existingBounds.left || 
                  newBounds.left > existingBounds.right || 
                  newBounds.bottom > existingBounds.top || 
                  newBounds.top < existingBounds.bottom)) {
                return true; // Collision detected
            }
        }
    }
    return false; // No collision
}

// Reorganize all labels when new ones are added
function reorganizeLabels() {
    if (!labelsVisible) return;
    
    // Get all current delivery points
    const allPoints = Array.from(deliveryMarkers.keys());
    
    // Clear existing labels
    countryLabels.forEach(label => {
        map.removeLayer(label);
    });
    countryLabels.clear();
    
    // Re-add labels in order of importance (larger countries first, then by region)
    const sortedCountries = allPoints.sort((a, b) => {
        // Prioritize countries closer to origin
        const aCoords = COUNTRY_DATA[a];
        const bCoords = COUNTRY_DATA[b];
        
        if (!aCoords || !bCoords) return 0;
        
        const aDistanceToOrigin = Math.abs(aCoords[0] - ORIGIN_COORDS[0]) + Math.abs(aCoords[1] - ORIGIN_COORDS[1]);
        const bDistanceToOrigin = Math.abs(bCoords[0] - ORIGIN_COORDS[0]) + Math.abs(bCoords[1] - ORIGIN_COORDS[1]);
        
        return aDistanceToOrigin - bDistanceToOrigin;
    });
    
    // Add labels one by one with collision detection
    sortedCountries.forEach(countryName => {
        const coords = COUNTRY_DATA[countryName];
        if (coords) {
            const label = addCountryLabel(countryName, coords);
            countryLabels.set(countryName, label);
        }
    });
}

// Add country to delivery list
function addToDeliveryList(countryName) {
    const list = document.getElementById('deliveryList');
    
    // Remove "no deliveries" message if it exists
    const noDeliveries = list.querySelector('.no-deliveries');
    if (noDeliveries) {
        noDeliveries.remove();
    }

    // Create delivery item
    const item = document.createElement('div');
    item.className = 'delivery-item';
    item.innerHTML = `
        <span class="country-name">📦 ${countryName}</span>
        <button class="remove-btn" onclick="removeDeliveryPoint('${countryName}')">
            <i class="fas fa-times"></i>
        </button>
    `;

    list.appendChild(item);
}

// Remove delivery point
function removeDeliveryPoint(countryName) {
    // Remove marker
    if (deliveryMarkers.has(countryName)) {
        map.removeLayer(deliveryMarkers.get(countryName));
        deliveryMarkers.delete(countryName);
    }

    // Remove line
    if (deliveryLines.has(countryName)) {
        map.removeLayer(deliveryLines.get(countryName));
        deliveryLines.delete(countryName);
    }

    // Remove country label (if it exists)
    if (countryLabels.has(countryName)) {
        map.removeLayer(countryLabels.get(countryName));
        countryLabels.delete(countryName);
    }
    
    // Remove improved country label (if it exists)
    if (window.countryLabels && window.countryLabels.has(countryName)) {
        map.removeLayer(window.countryLabels.get(countryName));
        window.countryLabels.delete(countryName);
    }

    // Remove from delivery list
    const list = document.getElementById('deliveryList');
    const items = list.querySelectorAll('.delivery-item');
    items.forEach(item => {
        if (item.querySelector('.country-name').textContent.includes(countryName)) {
            item.remove();
        }
    });

    // Add "no deliveries" message if list is empty
    if (deliveryMarkers.size === 0) {
        list.innerHTML = '<p class="no-deliveries">No delivery points added yet</p>';
    }

    // Re-render countries list to enable checkbox
    renderCountriesList();
    
    // Reorganize remaining labels if visible
    if (labelsVisible) {
        reorganizeLabels();
    }

    // Update stats
    updateStats();
}

// Clear all delivery points
function clearAllDeliveryPoints() {
    if (deliveryMarkers.size === 0) {
        return;
    }

    if (!ORIGIN_COUNTRY || confirm('Are you sure you want to remove all delivery points?')) {
        clearAllDeliveryPointsSilently();
    }
}

// Clear all delivery points without confirmation (for AI presentation)
function clearAllDeliveryPointsSilently() {
    // Remove all markers
    deliveryMarkers.forEach(marker => {
        map.removeLayer(marker);
    });
    deliveryMarkers.clear();

    // Remove all lines
    deliveryLines.forEach(line => {
        map.removeLayer(line);
    });
    deliveryLines.clear();

    // Remove all country labels
    countryLabels.forEach(label => {
        map.removeLayer(label);
    });
    countryLabels.clear();
    
    // Remove all improved country labels
    if (window.countryLabels) {
        window.countryLabels.forEach(label => {
            map.removeLayer(label);
        });
        window.countryLabels.clear();
    }

    // Clear delivery list
    const list = document.getElementById('deliveryList');
    list.innerHTML = '<p class="no-deliveries">No delivery points added yet</p>';

    // Clear selections and re-render countries list
    selectedCountries.clear();
    renderCountriesList();

    // Update stats
    updateStats();

    // Reset map view
    resetMapView();
}

// Reset map view to origin country
function resetMapView() {
    if (ORIGIN_COORDS) {
        map.setView(ORIGIN_COORDS, 4);
    } else {
        map.setView([20, 0], 2); // World view if no origin set
    }
}

// Fit map to show all points
function fitMapToPoints() {
    if (deliveryMarkers.size === 0) {
        resetMapView();
        return;
    }

    const group = new L.featureGroup();
    group.addLayer(originMarker);
    deliveryMarkers.forEach(marker => {
        group.addLayer(marker);
    });

    // Add padding and ensure minimum zoom level for better visibility
    const bounds = group.getBounds().pad(0.15);
    map.fitBounds(bounds, {
        maxZoom: 5, // Don't zoom in too much
        padding: [20, 20] // Extra padding for labels
    });
}

// Update statistics
function updateStats() {
    const deliveryCount = deliveryMarkers.size;
    const totalCountries = ORIGIN_COUNTRY ? deliveryCount + 1 : deliveryCount; // +1 for origin country if set

    document.getElementById('deliveryCount').textContent = deliveryCount;
    document.getElementById('coverageArea').textContent = 
        totalCountries === 0 ? '0 countries' : 
        totalCountries === 1 ? '1 country' : `${totalCountries} countries`;
    
    // Update origin display
    updateOriginDisplay();
}

// Utility function to calculate distance between two points
function calculateDistance(lat1, lng1, lat2, lng2) {
    const R = 6371; // Earth's radius in km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLng = (lng2 - lng1) * Math.PI / 180;
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
              Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
              Math.sin(dLng/2) * Math.sin(dLng/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
}

// Save map as PDF (unified with JPG approach)
async function saveMapAsPDF() {
    // Show loading notification
    showNotification('🔄 Generating PDF...');
    
    try {
        // Load jsPDF library
        const script = document.createElement('script');
        script.src = 'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js';
        
        const loadJsPDF = new Promise((resolve, reject) => {
            script.onload = resolve;
            script.onerror = reject;
        });
        
        document.head.appendChild(script);
        await loadJsPDF;
        
        const { jsPDF } = window.jspdf;
        
        // Create PDF in landscape format
        const pdf = new jsPDF('landscape', 'mm', 'a4');
        
        // Add title and metadata
        const mainTitle = document.getElementById('mainTitle').textContent || 'Company Delivery Map Creation';
        pdf.setFontSize(16);
        pdf.setFont('helvetica', 'bold');
        pdf.text(mainTitle, 20, 20);
        
        pdf.setFontSize(10);
        pdf.setFont('helvetica', 'normal');
        pdf.text(`Generated: ${new Date().toLocaleDateString()}`, 20, 30);
        
        if (ORIGIN_COUNTRY) {
            pdf.text(`Origin: ${ORIGIN_COUNTRY}`, 20, 35);
            pdf.text(`Delivery Points: ${deliveryMarkers.size}`, 20, 40);
        }
        
        // Capture map image (unified method with JPG)
        await captureMapImageForPDF(pdf);
        
    } catch (error) {
        console.error('PDF generation error:', error);
        showNotification('❌ Error creating PDF. Try JPG instead.');
    }
}

// Export helper functions
const exportStyle = { color: '#27ae60', weight: 4, opacity: 1, dashArray: '8,4' };
const normalStyle = { color: '#27ae60', weight: 1.5, opacity: 0.6, dashArray: '6, 3' };

function styleForExport() {
  if (!window.deliveryLines) return;
  deliveryLines.forEach(line => {
    if (line?.setStyle) line.setStyle(exportStyle);
    else if (line?.getElement) {
      const el = line.getElement();
      if (el) {
        el.style.opacity = '1';
        el.style.stroke = exportStyle.color;
        el.style.strokeWidth = String(exportStyle.weight);
        el.style.strokeDasharray = exportStyle.dashArray;
      }
    }
  });
}

function restoreNormalStyle() {
  if (!window.deliveryLines) return;
  deliveryLines.forEach(line => {
    if (line?.setStyle) line.setStyle(normalStyle);
    else if (line?.getElement) {
      const el = line.getElement();
      if (el) {
        el.style.opacity = String(normalStyle.opacity);
        el.style.stroke = normalStyle.color;
        el.style.strokeWidth = String(normalStyle.weight);
        el.style.strokeDasharray = normalStyle.dashArray;
      }
    }
  });
}

async function waitForStable(ms = 600) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Capture map image for PDF (using unified approach with JPG)
async function captureMapImageForPDF(pdf) {
    const mapElement = document.getElementById('map');
    const controlPanel = document.querySelector('.control-panel');
    const statsPanel = document.querySelector('.stats-panel');
    const header = document.querySelector('.header');
    
    // Hide UI elements temporarily
    if (controlPanel) controlPanel.style.visibility = 'hidden';
    if (statsPanel) statsPanel.style.visibility = 'hidden';
    if (header) header.style.visibility = 'hidden';
    
    // Hide map controls
    const zoomControls = document.querySelectorAll('.leaflet-control-zoom');
    const attributions = document.querySelectorAll('.leaflet-control-attribution');
    zoomControls.forEach(control => control.style.visibility = 'hidden');
    attributions.forEach(attr => attr.style.visibility = 'hidden');
    
    // Remember original style but don't change layout
    const originalStyle = mapElement.style.cssText;
    
    // Wait for map to stabilize after resize
    map.invalidateSize();
    await waitForStable();
    
    // Use on-screen geometry with export styling
    styleForExport();
    
    showNotification('🔄 Capturing map with existing line geometry...');
    
    try {
        // Load html2canvas and capture
        const script = document.createElement('script');
        script.src = 'https://html2canvas.hertzen.com/dist/html2canvas.min.js';
        
        const capturePromise = new Promise((resolve, reject) => {
            script.onload = function() {
                html2canvas(mapElement, {
                    useCORS: true,
                    backgroundColor: '#ffffff',
                    scale: 1.5,
                    logging: false,
                    allowTaint: false,
                    foreignObjectRendering: false,
                    imageTimeout: 15000,
                    removeContainer: true
                }).then(canvas => {
                    const imgData = canvas.toDataURL('image/jpeg', 0.8);
                    
                    // Add map image to PDF
                    pdf.addImage(imgData, 'JPEG', 15, 50, 270, 150);
                    
                    // Save PDF
                    const mainTitle = document.getElementById('mainTitle').textContent || 'Delivery_Map_Company';
                    function toLvSafeFilename(text) {
                        return text
                            .replace(/ā/g, 'a').replace(/Ā/g, 'A')
                            .replace(/č/g, 'c').replace(/Č/g, 'C')
                            .replace(/ē/g, 'e').replace(/Ē/g, 'E')
                            .replace(/ģ/g, 'g').replace(/Ģ/g, 'G')
                            .replace(/ī/g, 'i').replace(/Ī/g, 'I')
                            .replace(/ķ/g, 'k').replace(/Ķ/g, 'K')
                            .replace(/ļ/g, 'l').replace(/Ļ/g, 'L')
                            .replace(/ņ/g, 'n').replace(/Ņ/g, 'N')
                            .replace(/š/g, 's').replace(/Š/g, 'S')
                            .replace(/ū/g, 'u').replace(/Ū/g, 'U')
                            .replace(/ž/g, 'z').replace(/Ž/g, 'Z')
                            .replace(/[^\w\s-]/g, '')
                            .replace(/\s+/g, '_');
                    }
                    const cleanTitle = toLvSafeFilename(mainTitle);
                    pdf.save(`${cleanTitle}_${new Date().toISOString().split('T')[0]}.pdf`);
                    
                    resolve();
                }).catch(reject);
            };
            script.onerror = reject;
        });
        
        document.head.appendChild(script);
        await capturePromise;
        
        showNotification('✅ PDF saved successfully!');
        
    } catch (err) {
        console.error('PDF capture error:', err);
        showNotification('❌ Could not capture map. Try JPG instead.');
    } finally {
        // Always restore everything
    try {
        restoreMapLayout(mapElement, originalStyle, controlPanel, statsPanel, header, zoomControls, attributions);
    } finally {
        restoreNormalStyle();
    }
    }
}

// Save map as JPG (unified with PDF approach)
async function saveMapAsJPG() {
    const mapElement = document.getElementById('map');
    const controlPanel = document.querySelector('.control-panel');
    const statsPanel = document.querySelector('.stats-panel');
    const header = document.querySelector('.header');
    // Keep current layout exactly as-is; do not toggle fullscreen or move DOM
    
    // Show progress notification
    showNotification('🔄 Preparing clean JPG for download...');

    // Hide Leaflet chrome only
    const zoomControls = document.querySelectorAll('.leaflet-control-zoom');
    const attributions = document.querySelectorAll('.leaflet-control-attribution');
    zoomControls.forEach(control => control.style.visibility = 'hidden');
    attributions.forEach(attr => attr.style.visibility = 'hidden');
    
    // Remember original style (we won't change layout sizing anymore)
    const originalStyle = mapElement.style.cssText;
    
    try {
        // Wait for map to stabilize after resize
        map.invalidateSize();
        // Ensure tiles are loaded
        await waitForTilesLoaded();
        
        // Use on-screen geometry with export styling
        styleForExport();
        
        // Use html2canvas directly - simple and reliable
        await exportJpgWithHtml2Canvas(mapElement);

        showNotification('✅ JPG saved!');

    } catch (err) {
        console.error('JPG capture error:', err);
        showNotification('❌ Error saving JPG. Please try the PDF option instead.');
    } finally {
        // Always restore everything
        restoreMapLayout(mapElement, originalStyle, controlPanel, statsPanel, header, zoomControls, attributions);
        restoreNormalStyle();
    }
}
// Load dom-to-image-more and export element
async function exportJpgWithDomToImage(mapElement) {
    await ensureDomToImageMore();
    const blob = await window.domtoimage.toBlob(mapElement, {
        bgcolor: '#ffffff',
        quality: 0.95,
        cacheBust: true
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    const mainTitle = document.getElementById('mainTitle').textContent || 'Delivery_Map_Company';
    const date = new Date().toISOString().split('T')[0];
    link.download = `${mainTitle.replace(/[^\w\s-]/g, '').replace(/\s+/g, '_')}_${date}.jpg`;
    link.href = url;
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 2000);
    return true;
}

async function ensureDomToImageMore() {
    if (window.domtoimage) return;
    await new Promise((resolve, reject) => {
        const s = document.createElement('script');
        s.src = 'https://cdnjs.cloudflare.com/ajax/libs/dom-to-image-more/3.3.0/dom-to-image-more.min.js';
        s.onload = resolve;
        s.onerror = reject;
        document.head.appendChild(s);
    });
}
// Wait until base tiles are fully loaded (or timeout)
async function waitForTilesLoaded(timeoutMs = 8000) {
    if (!baseTileLayer) return;
    if (baseTileLayer._tiles && Object.keys(baseTileLayer._tiles).length > 0 && baseTileLayer._loading === false) {
        return; // already loaded
    }
    await new Promise((resolve) => {
        let done = false;
        const finish = () => { if (!done) { done = true; resolve(); } };
        const t = setTimeout(finish, timeoutMs);
        baseTileLayer.once('load', () => { clearTimeout(t); finish(); });
    });
}

// Load html2canvas (once) and capture entire map element
async function exportJpgWithHtml2Canvas(mapElement) {
    await ensureHtml2Canvas();
    const canvas = await html2canvas(mapElement, {
                    useCORS: true,
                    backgroundColor: '#ffffff',
        scale: 2,
                    logging: false,
                    allowTaint: false,
                    foreignObjectRendering: false,
                    imageTimeout: 15000,
                    removeContainer: true
    });
    downloadCanvasAsJpg(canvas);
}

async function ensureHtml2Canvas() {
    if (window.html2canvas) return;
    await new Promise((resolve, reject) => {
        const script = document.createElement('script');
        script.src = 'https://html2canvas.hertzen.com/dist/html2canvas.min.js';
        script.onload = resolve;
        script.onerror = reject;
        document.head.appendChild(script);
    });
}

function downloadCanvasAsJpg(canvas) {
    const link = document.createElement('a');
                    const mainTitle = document.getElementById('mainTitle').textContent || 'Delivery_Map_Company';
                    function toLvSafeFilename(text) {
                        return text
                            .replace(/ā/g, 'a').replace(/Ā/g, 'A')
                            .replace(/č/g, 'c').replace(/Č/g, 'C')
                            .replace(/ē/g, 'e').replace(/Ē/g, 'E')
                            .replace(/ģ/g, 'g').replace(/Ģ/g, 'G')
                            .replace(/ī/g, 'i').replace(/Ī/g, 'I')
                            .replace(/ķ/g, 'k').replace(/Ķ/g, 'K')
                            .replace(/ļ/g, 'l').replace(/Ļ/g, 'L')
                            .replace(/ņ/g, 'n').replace(/Ņ/g, 'N')
                            .replace(/š/g, 's').replace(/Š/g, 'S')
                            .replace(/ū/g, 'u').replace(/Ū/g, 'U')
                            .replace(/ž/g, 'z').replace(/Ž/g, 'Z')
                            .replace(/[^\w\s-]/g, '')
                            .replace(/\s+/g, '_');
                    }
                    const cleanTitle = toLvSafeFilename(mainTitle);
    const filename = `${cleanTitle}_${new Date().toISOString().split('T')[0]}.jpg`;
    const dataUrl = canvas.toDataURL('image/jpeg', 0.95);
    
    // Force download with multiple methods
    link.download = filename;
    link.href = dataUrl;
    link.style.display = 'none';
    document.body.appendChild(link);
    
    // Create a click event manually
    const clickEvent = new MouseEvent('click', {
        view: window,
        bubbles: true,
        cancelable: true
    });
    
    link.dispatchEvent(clickEvent);
    
    // Clean up after small delay
    setTimeout(() => {
        if (link.parentNode) {
            document.body.removeChild(link);
        }
    }, 100);
    
    console.log('Download triggered for:', filename);
}

// Try to export with leaflet-image; returns true if used successfully
async function exportJpgWithLeafletImage() {
    try {
        if (!window.leafletImage) {
            await new Promise((resolve, reject) => {
                const s = document.createElement('script');
                s.src = 'https://unpkg.com/leaflet-image/leaflet-image.js';
                s.onload = resolve;
                s.onerror = reject;
                document.head.appendChild(s);
            });
        }
        const canvas = await new Promise((resolve, reject) => {
            window.leafletImage(map, function(err, c) {
                if (err || !c) return reject(err || new Error('leaflet-image canvas missing'));
                resolve(c);
            });
        });

        downloadCanvasAsJpg(canvas);
        return true;
    } catch (e) {
        console.warn('leaflet-image export failed, will fallback to html2canvas', e);
        return false;
    }
}
// Helper function to restore map layout
function restoreMapLayout(mapElement, originalStyle, controlPanel, statsPanel, header, zoomControls, attributions) {
    // Restore Leaflet chrome visibility (we didn't change panel layout now)
    mapElement.style.cssText = originalStyle;
    if (controlPanel) controlPanel.style.visibility = '';
    if (statsPanel) statsPanel.style.visibility = '';
    if (header) header.style.visibility = '';
    zoomControls.forEach(control => {
        control.style.visibility = '';
        control.style.display = '';
    });
    attributions.forEach(attr => {
        attr.style.visibility = '';
        attr.style.display = '';
    });
    
    // Force map to recalculate size
    setTimeout(() => map.invalidateSize(), 100);
}

// Print map
function printMap() {
    const originalTitle = document.title;
    
    // Create print styles
    const printStyle = document.createElement('style');
    printStyle.media = 'print';
    printStyle.innerHTML = `
        @media print {
            body * { visibility: hidden; }
            .app-container, .app-container * { visibility: visible; }
            .control-panel { display: none !important; }
            .stats-panel { display: none !important; }
            .header { 
                position: fixed !important;
                top: 0 !important;
                left: 0 !important;
                right: 0 !important;
                z-index: 1000 !important;
                background: white !important;
                box-shadow: 0 2px 4px rgba(0,0,0,0.1) !important;
            }
            .map-container { 
                position: fixed !important;
                top: 80px !important;
                left: 0 !important;
                right: 0 !important;
                bottom: 0 !important;
                height: calc(100vh - 80px) !important;
                width: 100vw !important;
            }
            .app-container {
                display: block !important;
                height: 100vh !important;
                padding: 0 !important;
                margin: 0 !important;
            }
        }
    `;
    document.head.appendChild(printStyle);
    
    // Trigger print
    setTimeout(() => {
        window.print();
        document.title = originalTitle;
        document.head.removeChild(printStyle);
    }, 500);
}

// Select origin country (direct selection, not a toggle/change)
async function selectOriginCountry(inputCountry) {
    const country = (inputCountry || '').trim();
    if (!country) return;
    // Try to resolve input against the full world-country alias map first
    let canonical = NAME_TO_CANONICAL.get(country.toLowerCase()) || country;
    // If still not resolvable, fallback to strict check
    if (!WORLD_COUNTRY_COORDS.has(canonical) && !COUNTRY_DATA[canonical]) {
        showNotification('❌ Country not recognized. Please pick from the list.');
        return;
    }

    // If changing while deliveries exist, clear silently (as per request: select origin, not change)
    if (deliveryMarkers.size > 0) {
        clearAllDeliveryPoints();
    }

    if (country === ORIGIN_COUNTRY && ORIGIN_COORDS) {
        // Already set; just ensure marker/view
        resetMapView();
        return;
    }

    // Prefer internal dataset coordinates if available, else use world dataset
    ORIGIN_COUNTRY = canonical;
    ORIGIN_COORDS = COUNTRY_DATA[canonical] || WORLD_COUNTRY_COORDS.get(canonical);

    if (originMarker) {
        map.removeLayer(originMarker);
    }
    // Remove old origin label if it exists
    hideOriginLabel();
    
    addOriginMarker();

    // Persist origin
    try { localStorage.setItem('originCountry', ORIGIN_COUNTRY); } catch (_) {}

    // Sync select and input UI
    const originSelect = document.getElementById('originCountrySelect');
    if (originSelect) originSelect.value = country;
    const originInput = document.getElementById('originCountryInput');
    if (originInput) originInput.value = country;

    populateCountriesList();
    updateOriginDisplay();
    resetMapView();
    showNotification(`✅ Origin set to ${country}`);
}

// Update origin display in stats panel
function updateOriginDisplay() {
    const originDisplay = document.getElementById('originCountryDisplay');
    if (originDisplay) {
        if (ORIGIN_COUNTRY) {
            const flag = COUNTRY_FLAGS[ORIGIN_COUNTRY] || '🌍';
            originDisplay.innerHTML = `${ORIGIN_COUNTRY} ${flag}`;
        } else {
            originDisplay.innerHTML = 'Select Origin';
        }
    }
}

// Panel Resize Functionality
function initializeResizePanel() {
    const resizeHandle = document.querySelector('.resize-handle');
    const controlPanel = document.querySelector('.control-panel');
    const appContainer = document.querySelector('.app-container');
    
    if (!resizeHandle || !controlPanel || !appContainer) return;
    
    let isResizing = false;
    let startX = 0;
    let startWidth = 0;
    
    // Set initial panel width
    const initialWidth = 260;
    appContainer.style.setProperty('--panel-width', initialWidth + 'px');
    
    resizeHandle.addEventListener('mousedown', function(e) {
        isResizing = true;
        startX = e.clientX;
        startWidth = controlPanel.offsetWidth;
        
        controlPanel.classList.add('resizing');
        document.body.style.cursor = 'col-resize';
        document.body.style.userSelect = 'none';
        
        e.preventDefault();
    });
    
    document.addEventListener('mousemove', function(e) {
        if (!isResizing) return;
        
        const deltaX = e.clientX - startX;
        let newWidth = startWidth + deltaX;
        
        // Constrain width between min and max
        const minWidth = 200;
        const maxWidth = 500;
        newWidth = Math.max(minWidth, Math.min(maxWidth, newWidth));
        
        // Update CSS custom property
        appContainer.style.setProperty('--panel-width', newWidth + 'px');
        
        // Invalidate map size to adjust to new layout
        if (map) {
            setTimeout(() => map.invalidateSize(), 0);
        }
    });
    
    document.addEventListener('mouseup', function() {
        if (isResizing) {
            isResizing = false;
            controlPanel.classList.remove('resizing');
            document.body.style.cursor = '';
            document.body.style.userSelect = '';
            
            // Save the panel width to localStorage
            const currentWidth = getComputedStyle(appContainer).getPropertyValue('--panel-width');
            localStorage.setItem('panelWidth', currentWidth);
            
            // Final map size adjustment
            if (map) {
                setTimeout(() => map.invalidateSize(), 100);
            }
            
            showNotification('📏 Panel width adjusted and saved!');
        }
    });
    
    // Touch support for mobile devices
    resizeHandle.addEventListener('touchstart', function(e) {
        isResizing = true;
        startX = e.touches[0].clientX;
        startWidth = controlPanel.offsetWidth;
        
        controlPanel.classList.add('resizing');
        e.preventDefault();
    });
    
    document.addEventListener('touchmove', function(e) {
        if (!isResizing) return;
        
        const deltaX = e.touches[0].clientX - startX;
        let newWidth = startWidth + deltaX;
        
        // Constrain width between min and max
        const minWidth = 200;
        const maxWidth = 500;
        newWidth = Math.max(minWidth, Math.min(maxWidth, newWidth));
        
        // Update CSS custom property
        appContainer.style.setProperty('--panel-width', newWidth + 'px');
        
        // Invalidate map size to adjust to new layout
        if (map) {
            setTimeout(() => map.invalidateSize(), 0);
        }
        
        e.preventDefault();
    });
    
    document.addEventListener('touchend', function() {
        if (isResizing) {
            isResizing = false;
            controlPanel.classList.remove('resizing');
            
            // Save the panel width to localStorage
            const currentWidth = getComputedStyle(appContainer).getPropertyValue('--panel-width');
            localStorage.setItem('panelWidth', currentWidth);
            
            // Final map size adjustment
            if (map) {
                setTimeout(() => map.invalidateSize(), 100);
            }
            
            showNotification('📏 Panel width adjusted and saved!');
        }
    });
    
    // Load saved panel width
    const savedWidth = localStorage.getItem('panelWidth');
    if (savedWidth) {
        appContainer.style.setProperty('--panel-width', savedWidth);
    }
}

// Origin label management
let originLabel = null;

function addOriginLabel() {
    if (!ORIGIN_COUNTRY || !ORIGIN_COORDS) return;
    
    // Remove existing label first
    hideOriginLabel();
    
    const useFull = map.getZoom() >= FULL_NAME_ZOOM_THRESHOLD;
    const displayName = useFull ? ORIGIN_COUNTRY : abbreviateCountry(ORIGIN_COUNTRY);
    
    // Position label right next to origin marker (slightly to the right and above)
    let offsetLat = 0.3; // Above the marker
    let offsetLng = 0.8; // To the right
    if (ORIGIN_COUNTRY === 'Russia') {
        offsetLat = 0.2;
        offsetLng = 1.0;
    }
    const offsetCoords = [ORIGIN_COORDS[0] + offsetLat, ORIGIN_COORDS[1] + offsetLng];
    
    originLabel = L.marker(offsetCoords, {
        icon: L.divIcon({
            className: 'country-label-improved origin-label',
            html: `<span class="country-label-text-improved origin-label-text">${displayName}</span>`,
            iconSize: [displayName.length * 6 + 8, 16],
            iconAnchor: [0, 8]
        }),
        zIndexOffset: 999 // Just below origin marker
    }).addTo(map);
    
    console.log('Origin label added:', displayName, 'at zoom:', map.getZoom());
}

function hideOriginLabel() {
    if (originLabel) {
        map.removeLayer(originLabel);
        originLabel = null;
    }
}

function updateOriginLabelText() {
    if (!originLabel || !ORIGIN_COUNTRY) return;
    
    const useFull = map.getZoom() >= FULL_NAME_ZOOM_THRESHOLD;
    const displayName = useFull ? ORIGIN_COUNTRY : abbreviateCountry(ORIGIN_COUNTRY);
    
    const el = originLabel.getElement();
    if (el) {
        const span = el.querySelector('.origin-label-text');
        if (span && span.textContent !== displayName) {
            span.textContent = displayName;
            console.log('Origin label updated:', displayName, 'at zoom:', map.getZoom());
        }
    }
}

// Export functions for global access
window.removeDeliveryPoint = removeDeliveryPoint;

// Title Editing System
function initializeTitleEditing() {
    const editTitlesBtn = document.getElementById('editTitlesBtn');
    const titleEditModal = document.getElementById('titleEditModal');
    const closeTitleModal = document.getElementById('closeTitleModal');
    const saveTitlesBtn = document.getElementById('saveTitlesBtn');
    const cancelTitlesBtn = document.getElementById('cancelTitlesBtn');
    const mainTitleInput = document.getElementById('mainTitleInput');
    const subtitleInput = document.getElementById('subtitleInput');
    const mainTitle = document.getElementById('mainTitle');
    const subtitle = document.getElementById('subtitle');

    // Open modal
    if (editTitlesBtn) {
        editTitlesBtn.addEventListener('click', function() {
            // Populate inputs with current values
            mainTitleInput.value = mainTitle.textContent;
            subtitleInput.value = subtitle.textContent;
            
            titleEditModal.style.display = 'flex';
            
            // Focus first input
            setTimeout(() => {
                mainTitleInput.focus();
                mainTitleInput.select();
            }, 100);
        });
    }

    // Close modal functions
    function closeModal() {
        titleEditModal.style.display = 'none';
    }

    // Close modal event listeners
    if (closeTitleModal) {
        closeTitleModal.addEventListener('click', closeModal);
    }
    
    if (cancelTitlesBtn) {
        cancelTitlesBtn.addEventListener('click', closeModal);
    }

    // Close on overlay click
    titleEditModal.addEventListener('click', function(e) {
        if (e.target === titleEditModal) {
            closeModal();
        }
    });

    // Close on Escape key
    document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape' && titleEditModal.style.display === 'flex') {
            closeModal();
        }
    });

    // Save titles
    if (saveTitlesBtn) {
        saveTitlesBtn.addEventListener('click', function() {
            const newMainTitle = mainTitleInput.value.trim();
            const newSubtitle = subtitleInput.value.trim();

            if (newMainTitle) {
                mainTitle.textContent = newMainTitle;
                updateDocumentTitle();
            }

            if (newSubtitle) {
                subtitle.textContent = newSubtitle;
            }

            // Show success notification
            showNotification('✅ Titles updated successfully!');
            
            closeModal();
        });
    }

    // Enter key to save
    [mainTitleInput, subtitleInput].forEach(input => {
        if (input) {
            input.addEventListener('keydown', function(e) {
                if (e.key === 'Enter') {
                    saveTitlesBtn.click();
                }
            });
        }
    });
}

// Set dynamic document title
function updateDocumentTitle() {
    const mainTitle = document.getElementById('mainTitle').textContent || 'Company Delivery Map Creation';
    document.title = mainTitle;
}

// Track initialization to prevent double initialization
let systemsInitialized = false;

function initializeAllSystems() {
    if (systemsInitialized) {
        console.log('Systems already initialized, skipping...');
        return;
    }
    
    console.log('Initializing all systems...');
    updateDocumentTitle();
    initializeTitleEditing();
    initializePresentationSystem();
    systemsInitialized = true;
}

// Initialize title system when DOM is ready
document.addEventListener('DOMContentLoaded', initializeAllSystems);

// Also initialize if DOM is already ready
if (document.readyState !== 'loading') {
    initializeAllSystems();
}

// ===== Simplified Presentation Mode (replaces old AI presentation) =====
let simplePresentation = {
  running: false,
  paused: false,
  index: 0,
    countries: [],
  speedMs: 1500
};

// Track whether we programmatically entered fullscreen for presentation
let presentationFullscreenEntered = false;
let presentationFsListener = null;
let presentationEscListener = null;
let presentationClassObserver = null;

function initializePresentationSystem() {
    const presentationBtn = document.getElementById('presentationBtn');
  const pauseBtn = document.getElementById('pausePresentationBtn');
  const stopBtn = document.getElementById('stopPresentationBtn');

    const presentationModal = document.getElementById('presentationModal');
  const startBtn = document.getElementById('startPresentationBtn');
  const closeBtn = document.getElementById('closePresentationModal');

    if (presentationBtn) {
    presentationBtn.innerHTML = '<i class="fas fa-play-circle"></i> Presentation Mode';
    presentationBtn.addEventListener('click', () => {
      // Open settings modal first
      if (presentationModal) {
            presentationModal.style.display = 'flex';
                    } else {
        // Fallback: start immediately with defaults
        startPresentationMode({ speed: 'medium', showCountryNames: true });
            }
        });
    }

  // Wire modal buttons
  if (startBtn && presentationModal) {
    startBtn.addEventListener('click', () => {
      const settings = readPresentationSettingsFromModal();
        presentationModal.style.display = 'none';
      startPresentationMode(settings);
    });
  }
  if (closeBtn && presentationModal) {
    closeBtn.addEventListener('click', () => presentationModal.style.display = 'none');
  }

  if (pauseBtn) pauseBtn.onclick = () => togglePausePresentationMode();
  if (stopBtn) stopBtn.onclick = () => stopPresentationMode();
}

function readPresentationSettingsFromModal() {
  const speed = (document.querySelector('input[name="speed"]:checked')?.value) || 'medium';
  const order = (document.querySelector('input[name="order"]:checked')?.value) || 'alphabetical';
  const showCountryNames = !!document.getElementById('showCountryNames')?.checked;
  const animateLines = !!document.getElementById('animateLines')?.checked;
  const showStats = !!document.getElementById('showStats')?.checked;
  const pulseEffect = !!document.getElementById('pulseEffect')?.checked;
  return { speed, order, showCountryNames, animateLines, showStats, pulseEffect };
}

function speedMsFromSetting(speed) {
  const map = { slow: 3000, medium: 1500, fast: 800 };
  return map[speed] || 1500;
}

async function startPresentationMode(options = {}) {
  if (!ORIGIN_COUNTRY || !ORIGIN_COORDS) {
    showNotification('❌ Please select an origin country first.');
        return;
    }
  // Prefer explicit selections; if none, use current network on map
  let countries = Array.from(selectedCountries);
  if (!countries.length && deliveryMarkers && deliveryMarkers.size > 0) {
    countries = Array.from(deliveryMarkers.keys());
  }
  if (!countries.length) {
    showNotification('❌ Please select countries (or add some to the map) first.');
        return;
    }
    
  // Apply label visibility preference from settings
  if (options.showCountryNames === true && !labelsVisible) {
    labelsVisible = true;
    reorganizeLabels();
  } else if (options.showCountryNames === false && labelsVisible) {
    // turn off labels for presentation
    labelsVisible = false;
    countryLabels.forEach(l => map.removeLayer(l));
    countryLabels.clear();
  }

  console.log('🎬 Starting presentation with fullscreen');

  // Enter fullscreen
  try {
    await document.documentElement.requestFullscreen();
    console.log('🎬 Entered fullscreen successfully');
  } catch (e) {
    console.log('🎬 Could not enter fullscreen:', e.message);
  }

  // Compute order and coordinates (with fallback to WORLD_COUNTRY_COORDS)
  // Simple alphabetical ordering
  const ordered = countries.sort();
  const coordsMap = new Map();
  const unknown = [];
  ordered.forEach(c => {
    const coords = COUNTRY_DATA[c] || WORLD_COUNTRY_COORDS.get(c);
    if (coords && Array.isArray(coords) && coords.length === 2) {
      coordsMap.set(c, coords);
    } else {
      unknown.push(c);
    }
  });
  if (unknown.length) {
    console.warn('No coordinates for:', unknown);
  }
  const finalList = ordered.filter(c => coordsMap.has(c));
  if (!finalList.length) {
    showNotification('❌ None of the selected countries have coordinates available.');
        return;
    }

  // Prepare state
  simplePresentation = {
    running: true,
    paused: false,
    index: 0,
    countries: finalList,
    speedMs: speedMsFromSetting(options.speed)
  };

  // Clear existing map state
  console.log('🎬 Clearing all delivery points before presentation');
  clearAllDeliveryPointsSilently();
  console.log('🎬 Map cleared, delivery markers count:', deliveryMarkers.size);

  // Show overlay and hide ALL UI elements for full map view
  const overlay = document.getElementById('presentationOverlay');
  const controlPanel = document.querySelector('.control-panel');
  const statsPanel = document.querySelector('.stats-panel');
  const header = document.querySelector('.header');
  
  if (overlay) overlay.style.display = 'flex';
  if (controlPanel) controlPanel.style.display = 'none';
  if (statsPanel) statsPanel.style.display = 'none';
  if (header) header.style.display = 'none';
  
  // Make map container fill entire screen
  const mapContainer = document.getElementById('map');
  if (mapContainer) {
    mapContainer.style.position = 'fixed';
    mapContainer.style.top = '0';
    mapContainer.style.left = '0';
    mapContainer.style.width = '100vw';
    mapContainer.style.height = '100vh';
    mapContainer.style.zIndex = '9999';
  }
  const statusEl = document.getElementById('presentationStatus');
  if (statusEl) statusEl.textContent = `Starting presentation with ${simplePresentation.countries.length} countries...`;
  const currentEl = document.getElementById('currentCountry');
  if (currentEl) currentEl.textContent = ORIGIN_COUNTRY;
  updatePresentationStatsSimple();

  // Set up fullscreen exit detection
  const handleFullscreenChange = () => {
    if (!document.fullscreenElement && simplePresentation.running) {
      console.log('🎬 User exited fullscreen, stopping presentation');
      stopPresentationMode();
    }
  };
  document.addEventListener('fullscreenchange', handleFullscreenChange);
  document.addEventListener('webkitfullscreenchange', handleFullscreenChange);
  
  // Store cleanup function for later
  simplePresentation._cleanupFs = () => {
    document.removeEventListener('fullscreenchange', handleFullscreenChange);
    document.removeEventListener('webkitfullscreenchange', handleFullscreenChange);
  };

  // Ensure map is sized correctly in full screen before animating
  try { map.invalidateSize(); } catch(_){}
  await waitForStable(250);
  
  console.log('🎬 About to start presentation with countries:', simplePresentation.countries);
  console.log('🎬 Speed setting:', simplePresentation.speedMs, 'ms');

  // Stash coords map for run loop
  simplePresentation._coordsMap = coordsMap;

  await runPresentationSequence();
}

async function runPresentationSequence() {
  console.log('🎬 Starting presentation sequence with', simplePresentation.countries.length, 'countries');
  console.log('🎬 Speed:', simplePresentation.speedMs, 'ms between steps');
  
  // Timer-based scheduler to avoid tight loops
  const doStep = () => {
    console.log('🎬 doStep called - running:', simplePresentation.running, 'index:', simplePresentation.index);
    
    if (!simplePresentation.running) {
      console.log('🎬 Presentation stopped, exiting doStep');
      return;
    }

    if (simplePresentation.paused) {
      console.log('🎬 Presentation paused, scheduling next check');
      simplePresentation._timer = setTimeout(doStep, 200);
      return;
    }

    if (simplePresentation.index >= simplePresentation.countries.length) {
      console.log('🎬 All countries added, finishing presentation');
      finishPresentationMode();
      return;
    }

    const country = simplePresentation.countries[simplePresentation.index];
    const coords = simplePresentation._coordsMap?.get(country);
    
    console.log(`🎬 Step ${simplePresentation.index + 1}: Adding ${country}`, coords);

    const statusEl = document.getElementById('presentationStatus');
    const currentEl = document.getElementById('currentCountry');
    if (statusEl) statusEl.textContent = `Adding ${country}...`;
    if (currentEl) currentEl.textContent = country;

    if (coords) {
      addDeliveryPointByName(country, coords);
      if (labelsVisible) reorganizeLabels();
      console.log(`🎬 Successfully added ${country} to map`);
    } else {
      console.log(`🎬 No coordinates for ${country}, skipping`);
    }

    simplePresentation.index += 1;
    updatePresentationStatsSimple();

    console.log(`🎬 Scheduling next step in ${simplePresentation.speedMs}ms`);
    simplePresentation._timer = setTimeout(doStep, simplePresentation.speedMs);
  };

  // Start the first step immediately
  console.log('🎬 Starting first step immediately');
  doStep();
}

function updatePresentationStatsSimple() {
  const total = simplePresentation.countries.length;
  const added = Math.min(simplePresentation.index, total);
  const coverage = total > 0 ? Math.round((added / total) * 100) : 0;
  const addedEl = document.getElementById('countriesAdded');
  const covEl = document.getElementById('coveragePercent');
  if (addedEl) addedEl.textContent = String(added);
  if (covEl) covEl.textContent = coverage + '%';
}

function togglePausePresentationMode() {
  simplePresentation.paused = !simplePresentation.paused;
    const pauseBtn = document.getElementById('pausePresentationBtn');
  const statusEl = document.getElementById('presentationStatus');
  if (pauseBtn) pauseBtn.innerHTML = simplePresentation.paused ? '<i class="fas fa-play"></i>' : '<i class="fas fa-pause"></i>';
  if (statusEl) statusEl.textContent = simplePresentation.paused ? 'Presentation paused' : 'Presentation running...';
}

function stopPresentationMode() {
  simplePresentation.running = false;
  if (simplePresentation._timer) {
    clearTimeout(simplePresentation._timer);
    simplePresentation._timer = null;
  }
  cleanupPresentationUI();
  showNotification('🛑 Presentation stopped');
}

function finishPresentationMode() {
  if (simplePresentation._timer) {
    clearTimeout(simplePresentation._timer);
    simplePresentation._timer = null;
  }
  cleanupPresentationUI();
  showNotification('🎉 Presentation finished');
}

async function cleanupPresentationUI() {
  const overlay = document.getElementById('presentationOverlay');
  const controlPanel = document.querySelector('.control-panel');
  const statsPanel = document.querySelector('.stats-panel');
  const header = document.querySelector('.header');
  const mapContainer = document.getElementById('map');
  
  // Hide overlay
  if (overlay) overlay.style.display = 'none';
  
  // Restore all UI elements
  if (controlPanel) controlPanel.style.display = 'block';
  if (statsPanel) statsPanel.style.display = 'block';
  if (header) header.style.display = 'block';
  
  // Restore map container to normal layout
  if (mapContainer) {
    mapContainer.style.position = '';
    mapContainer.style.top = '';
    mapContainer.style.left = '';
    mapContainer.style.width = '';
    mapContainer.style.height = '';
    mapContainer.style.zIndex = '';
  }
  
  const currentEl = document.getElementById('currentCountry');
  if (currentEl) currentEl.textContent = ORIGIN_COUNTRY || 'Origin';
  setTimeout(() => map && map.invalidateSize(), 100);

  // Remove fullscreen listeners
  if (simplePresentation._cleanupFs) {
    simplePresentation._cleanupFs();
    simplePresentation._cleanupFs = null;
  }

  // Exit fullscreen when presentation ends
  try {
    if (document.fullscreenElement) {
      await document.exitFullscreen();
      console.log('🎬 Exited fullscreen');
    }
  } catch (e) {
    console.log('🎬 Could not exit fullscreen:', e.message);
  }
  
  console.log('🎬 Presentation cleanup completed');
}

