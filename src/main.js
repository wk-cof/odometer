import './style.css';
import { Tracker } from './tracker.js';
import { createIcons, Navigation, Signal, WifiOff, MapPin } from 'lucide';

// Main App HTML
document.querySelector('#app').innerHTML = `
  <div class="container">
    <div class="header">
      <div id="status-icon" class="icon-box"></div>
      <div id="gps-status">Waiting to start...</div>
    </div>
    
    <div class="speed-display">
      <h1 id="speed-value">0</h1>
      <div class="unit-toggle">
        <button id="btn-mph" class="active">MPH</button>
        <button id="btn-kmh">KM/H</button>
      </div>
    </div>

    <div class="footer">
      <div class="stat">
        <span class="label">ACCURACY</span>
        <span id="accuracy-value">--</span>
      </div>
    </div>
  </div>

  <!-- Start Overlay -->
  <div id="overlay" class="overlay">
    <div class="overlay-content">
      <div class="icon-box" style="color: var(--accent-color);">
        <i data-lucide="map-pin" width="48" height="48"></i>
      </div>
      <h2>Speed Tracker</h2>
      <p id="overlay-msg">To track your speed, this app needs access to your location.</p>
      
      <button id="btn-start" class="btn-start">Start Tracking</button>
      
      <div id="denied-help" class="instruction-box" style="display: none;">
        <strong>Access Denied</strong>
        <p>Please enable location services:</p>
        <ol>
          <li>Tap the 'aA' or Lock icon in the address bar.</li>
          <li>Select "Website Settings" or "Permissions".</li>
          <li>Set Location to "Allow".</li>
          <li>Refresh the page.</li>
        </ol>
      </div>
    </div>
  </div>
`;

// Initialize UI State
let isMph = true;
const tracker = new Tracker();

const speedEl = document.getElementById('speed-value');
const accuracyEl = document.getElementById('accuracy-value');
const statusEl = document.getElementById('gps-status');
const statusIconEl = document.getElementById('status-icon');
const btnMph = document.getElementById('btn-mph');
const btnKmh = document.getElementById('btn-kmh');
const overlayEl = document.getElementById('overlay');
const btnStart = document.getElementById('btn-start');
const overlayMsg = document.getElementById('overlay-msg');
const deniedHelpEl = document.getElementById('denied-help');

// Initialize Icons (Initial Render)
createIcons({ icons: { Navigation, Signal, WifiOff, MapPin } });

// Setup Unit Toggles
const updateActiveButton = () => {
  btnMph.classList.toggle('active', isMph);
  btnKmh.classList.toggle('active', !isMph);
};

btnMph.addEventListener('click', () => { isMph = true; updateActiveButton(); });
btnKmh.addEventListener('click', () => { isMph = false; updateActiveButton(); });

// Handle Start Flow
btnStart.addEventListener('click', async () => {
  btnStart.textContent = "Requesting...";
  await tracker.start();
});

// Check permissions on load to possibly auto-hide commands
tracker.checkPermission().then(state => {
  if (state === 'granted') {
    overlayEl.classList.add('hidden');
    tracker.start();
  }
});

// Handle updates
tracker.onUpdate((data) => {
  if (data.error) {
    statusEl.textContent = data.error;
    statusIconEl.innerHTML = '<i data-lucide="wifi-off"></i>';
    createIcons({ icons: { WifiOff }, nameAttr: 'data-lucide' }); // Re-render icon

    // Explicit handling for Permission Denied to show help
    if (data.error === 'Permission denied') {
      overlayEl.classList.remove('hidden');
      btnStart.style.display = 'none';
      deniedHelpEl.style.display = 'block';
      overlayMsg.textContent = "Location access is required.";
    }
    return;
  }

  // If we get valid data, hide overlay (sanity check)
  if (data.status === 'active') {
    overlayEl.classList.add('hidden');
  }

  // Update Status
  statusEl.textContent = 'GPS Active';
  statusIconEl.innerHTML = '<i data-lucide="signal"></i>';
  createIcons({ icons: { Signal }, nameAttr: 'data-lucide' });

  // Update Speed
  const mps = data.speed;
  let displaySpeed = 0;

  if (isMph) {
    displaySpeed = mps * 2.23694;
  } else {
    displaySpeed = mps * 3.6;
  }

  speedEl.textContent = Math.round(displaySpeed);

  // Update Accuracy
  accuracyEl.textContent = `± ${Math.round(data.accuracy)}m`;
});
