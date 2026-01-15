import './style.css';
import { Tracker } from './tracker.js';
import { createIcons, Navigation, Signal, WifiOff } from 'lucide';

document.querySelector('#app').innerHTML = `
  <div class="container">
    <div class="header">
      <div id="status-icon" class="icon-box"></div>
      <div id="gps-status">Initializing...</div>
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

// Initialize Icons
createIcons({
  icons: {
    Navigation,
    Signal,
    WifiOff
  },
  attrs: {
    class: "icon"
  }
});

// Setup Unit Toggles
const updateActiveButton = () => {
  btnMph.classList.toggle('active', isMph);
  btnKmh.classList.toggle('active', !isMph);
};

btnMph.addEventListener('click', () => { isMph = true; updateActiveButton(); });
btnKmh.addEventListener('click', () => { isMph = false; updateActiveButton(); });

// Handle updates
tracker.onUpdate((data) => {
  if (data.error) {
    statusEl.textContent = data.error;
    statusIconEl.innerHTML = '<i data-lucide="wifi-off"></i>';
    createIcons({ icons: { WifiOff }, nameAttr: 'data-lucide' }); // Re-render icon
    return;
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

// Start
tracker.start();
