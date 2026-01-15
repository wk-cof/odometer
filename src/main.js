import './style.css';
import { Tracker } from './tracker.js';
import { createIcons, Navigation, Signal, WifiOff, MapPin, RefreshCw } from 'lucide';

// Detect iOS
const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);

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
        <strong style="color: var(--error-color);">Location Access Blocked</strong>
        <p>Your browser blocked the location request. To fix this on <strong>${isIOS ? 'iPhone (iOS)' : 'this device'}</strong>:</p>
        
        ${isIOS ? `
        <ol>
          <li>Open iPhone <strong>Settings</strong> app.</li>
          <li>Go to <strong>Privacy & Security > Location Services</strong>.</li>
          <li>Ensure Location Services is <strong>ON</strong>.</li>
          <li>Find <strong>Safari Websites</strong> (or Chrome) in the list.</li>
          <li>Set it to <strong>"While Using the App"</strong>.</li>
        </ol>
        ` : `
        <ol>
          <li>Look for a <strong>blocked location icon</strong> in your address bar.</li>
          <li>Click it and select <strong>"Allow"</strong> or <strong>"Clear settings"</strong>.</li>
          <li>If no icon appears, check your browser's Site Settings.</li>
        </ol>
        `}
        
        <button id="btn-reload" style="margin-top: 1rem; width: 100%; background: #333; color: white; padding: 0.75rem; border-radius: 8px; border: 1px solid #555;">
          <i data-lucide="refresh-cw" style="width: 14px; display: inline-block; vertical-align: middle;"></i> 
          Reload Page
        </button>
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
const btnReload = document.getElementById('btn-reload');

// Initialize Icons
createIcons({ icons: { Navigation, Signal, WifiOff, MapPin, RefreshCw } });

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

btnReload.addEventListener('click', () => {
  window.location.reload();
});

// Check permissions on load
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
    createIcons({ icons: { WifiOff }, nameAttr: 'data-lucide' });

    if (data.error === 'Permission denied') {
      overlayEl.classList.remove('hidden');
      btnStart.style.display = 'none';
      deniedHelpEl.style.display = 'block';
      overlayMsg.textContent = "Location access is required.";
      createIcons({ icons: { RefreshCw }, nameAttr: 'data-lucide' }); // Re-render reload icon
    }
    return;
  }

  if (data.status === 'active') {
    overlayEl.classList.add('hidden');
  }

  // Update Status
  statusEl.textContent = 'GPS Active';
  statusIconEl.innerHTML = '<i data-lucide="signal"></i>';
  createIcons({ icons: { Signal }, nameAttr: 'data-lucide' });

  const mps = data.speed;
  let displaySpeed = 0;

  if (isMph) {
    displaySpeed = mps * 2.23694;
  } else {
    displaySpeed = mps * 3.6;
  }

  speedEl.textContent = Math.round(displaySpeed);
  accuracyEl.textContent = `± ${Math.round(data.accuracy)}m`;
});
