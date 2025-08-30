// Center on Vizianagaram
const map = L.map('map').setView([18.1169, 83.4115], 13);

// OSM basemap
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '© OpenStreetMap contributors'
}).addTo(map);

let startPoint = null;
let endPoint = null;
let routeLayer = null;
const AQI_MARKERS = [];

// Simulated AQI data (lat, lng, AQI value)
const aqiData = [
    {lat: 18.1169, lng: 83.4115, aqi: 45},
    {lat: 18.1300, lng: 83.4200, aqi: 75},
    {lat: 18.1050, lng: 83.4000, aqi: 120},
    {lat: 18.1120, lng: 83.4300, aqi: 180}
];

// Color scale for AQI (simplified)
function getAQIColor(aqi) {
    if (aqi <= 50) return 'green';
    if (aqi <= 100) return 'yellow';
    if (aqi <= 150) return 'orange';
    return 'red';
}

// Overlay AQI markers
aqiData.forEach(point => {
    const marker = L.circleMarker([point.lat, point.lng], {
        radius: 8,
        fillColor: getAQIColor(point.aqi),
        color: '#000',
        weight: 1,
        fillOpacity: 0.8
    }).bindPopup(`AQI: ${point.aqi}`);
    marker.addTo(map);
    AQI_MARKERS.push(marker);
});

// Handle map click
map.on('click', (e) => {
    if (!startPoint) {
        startPoint = e.latlng;
        L.marker(startPoint).addTo(map).bindPopup("Start Point").openPopup();
    } else if (!endPoint) {
        endPoint = e.latlng;
        L.marker(endPoint).addTo(map).bindPopup("End Point").openPopup();
        getRoute();
    }
});

// Get selected mode
function getSelectedMode() {
    return document.getElementById('mode').value;
}

// Fetch route from OpenRouteService and color by AQI exposure
async function getRoute() {
    const mode = getSelectedMode();
    const apiKey = "YOUR_ORS_API_KEY"; // Replace with actual key

    const url = `https://api.openrouteservice.org/v2/directions/${mode}?api_key=${apiKey}&start=${startPoint.lng},${startPoint.lat}&end=${endPoint.lng},${endPoint.lat}`;

    const res = await fetch(url);
    const data = await res.json();

    const coords = data.features[0].geometry.coordinates.map(c => [c[1], c[0]]);
    
    // Split into segments and color based on nearest AQI
    const segments = [];
    for (let i = 0; i < coords.length - 1; i++) {
        const midLat = (coords[i][0] + coords[i+1][0]) / 2;
        const midLng = (coords[i][1] + coords[i+1][1]) / 2;
        const nearestAQI = getNearestAQI(midLat, midLng);
        segments.push(L.polyline([coords[i], coords[i+1]], {
            color: getAQIColor(nearestAQI),
            weight: 5,
            opacity: 0.9
        }));
    }

    // Clear previous route
    if (routeLayer) {
        map.removeLayer(routeLayer);
    }
    routeLayer = L.layerGroup(segments).addTo(map);
}

// Find nearest AQI point
function getNearestAQI(lat, lng) {
    let minDist = Infinity;
    let nearestValue = null;
    aqiData.forEach(point => {
        const d = Math.sqrt(Math.pow(lat - point.lat, 2) + Math.pow(lng - point.lng, 2));
        if (d < minDist) {
            minDist = d;
            nearestValue = point.aqi;
        }
    });
    return nearestValue;
}

// Clear route button
document.getElementById('clearRoute').addEventListener('click', () => {
    startPoint = null;
    endPoint = null;
    if (routeLayer) map.removeLayer(routeLayer);
    map.eachLayer(layer => {
        if (layer instanceof L.Marker && !AQI_MARKERS.includes(layer)) {
            map.removeLayer(layer);
        }
    });
});

