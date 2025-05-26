import { initializeApp } from "https://www.gstatic.com/firebasejs/11.8.1/firebase-app.js";
import { getDatabase, ref, set, onValue, remove, get, child, onChildRemoved, onChildAdded } from "https://www.gstatic.com/firebasejs/11.8.1/firebase-database.js";
import { firebaseConfig } from './js/firebase-config.js';

const app = initializeApp(firebaseConfig);
const db = getDatabase(app);

const locationPresets = {
  "kamakura": { center: [35.316, 139.55], zoom: 14 },
  "ueno": { center: [35.7148, 139.7745], zoom: 16 }
};

let currentLocationKey = "kamakura";

// Firebaseから現在の位置キーを取得してからマップを初期化
get(ref(db, "mapLocation")).then(snapshot => {
  if (snapshot.exists()) {
    const savedKey = snapshot.val();
    if (locationPresets[savedKey]) {
      currentLocationKey = savedKey;
    }
  }

  const map = L.map('map').setView(locationPresets[currentLocationKey].center, locationPresets[currentLocationKey].zoom);
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; OpenStreetMap contributors'
  }).addTo(map);

  window.map = map; // 他の関数でも参照できるように

  // 以降、setup班など既存のコードを中に移動...

  const MAX班 = 12;
  const MIN班 = 1;
  const 班マーカー = {};
  const 色リスト = ['#007bff', '#dc3545', '#28a745', '#ffc107', '#6610f2', '#17a2b8'];

  function createNumberedMarker(latlng, number, draggable = true, color = '#007bff') {
    const icon = L.divIcon({
      className: 'numbered-marker',
      html: `
        <div class="pin-number" style="background-color: ${color};">
          <span class="pin-label" style="color: white; font-weight: bold; position: relative; z-index: 1;">${number}</span>
          <div class="pin-arrow" style="border-top: 8px solid ${color};"></div>
        </div>
      `,
      iconSize: [30, 42],
      iconAnchor: [15, 42]
    });
    return L.marker(latlng, { icon, draggable });
  }

  function setup班(班名, 初期座標, 初期色 = '#007bff') {
    const 班番号 = parseInt(班名.replace("班", ""), 10);
    if (isNaN(班番号)) return;
    let 現在の色 = 初期色;
    const marker = createNumberedMarker(初期座標, 班番号, true, 現在の色).addTo(map);
    班マーカー[班名] = marker;
    marker.bindPopup(班名);

    marker.on('dragend', e => {
      const pos = e.target.getLatLng();
      set(ref(db, 班名), { lat: pos.lat, lng: pos.lng, color: 現在の色 });
    });

    function showColorMenu(x, y) {
      const menu = document.createElement('div');
      menu.style.cssText = `position:absolute;left:${x}px;top:${y}px;z-index:10000;background:white;border:1px solid #ccc;padding:4px;display:flex;gap:4px;`;
      色リスト.forEach(color => {
        const colorBtn = document.createElement('div');
        colorBtn.style.cssText = `width:20px;height:20px;background:${color};cursor:pointer;`;
        colorBtn.onclick = () => {
          現在の色 = color;
          const newIcon = createNumberedMarker(marker.getLatLng(), 班番号, true, color).options.icon;
          marker.setIcon(newIcon);
          const pos = marker.getLatLng();
          set(ref(db, 班名), { lat: pos.lat, lng: pos.lng, color });
          document.body.removeChild(menu);
        };
        menu.appendChild(colorBtn);
      });
      document.body.appendChild(menu);
      setTimeout(() => document.addEventListener('click', () => menu.remove(), { once: true }), 0);
    }

    marker.on('contextmenu', e => {
      e.originalEvent.preventDefault();
      showColorMenu(e.originalEvent.pageX, e.originalEvent.pageY);
    });

    let touchTimer = null;
    marker.on('touchstart', e => {
      touchTimer = setTimeout(() => {
        const touch = e.originalEvent.touches[0];
        showColorMenu(touch.pageX, touch.pageY);
      }, 600);
    });
    marker.on('touchend', () => {
      if (touchTimer) clearTimeout(touchTimer);
    });

    onValue(ref(db, 班名), snapshot => {
      const data = snapshot.val();
      if (data?.lat && data?.lng) {
        marker.setLatLng([data.lat, data.lng]);
        if (data.color && data.color !== 現在の色) {
          現在の色 = data.color;
          marker.setIcon(createNumberedMarker([data.lat, data.lng], 班番号, true, data.color).options.icon);
        }
      }
    });
  }

  onChildAdded(ref(db), snapshot => {
    const 班名 = snapshot.key;
    if (!班マーカー[班名] && /^班\d+$/.test(班名)) {
      const { lat, lng, color } = snapshot.val();
      setup班(班名, [lat, lng], color);
    }
  });

  onChildRemoved(ref(db), snapshot => {
    const 班名 = snapshot.key;
    if (班マーカー[班名]) {
      map.removeLayer(班マーカー[班名]);
      delete 班マーカー[班名];
    }
  });

  const addBtn = document.getElementById("add-marker-btn");
  const removeBtn = document.getElementById("remove-marker-btn");
  const kamakuraBtn = document.getElementById("goto-kamakura-btn");
  const uenoBtn = document.getElementById("goto-ueno-btn");

  if (addBtn) addBtn.addEventListener("click", async () => {
    const snapshot = await get(child(ref(db), "/"));
    if (snapshot.exists()) {
      const 班一覧 = snapshot.val();
      const 班番号一覧 = Object.keys(班一覧)
        .filter(name => /^班\d+$/.test(name))
        .map(name => parseInt(name.replace("班", ""), 10))
        .sort((a, b) => a - b);
      const 使用済 = new Set(班番号一覧);
      let 次の番号 = 1;
      while (使用済.has(次の番号) && 次の番号 <= MAX班) 次の番号++;
      if (次の番号 <= MAX班) {
        const 班名 = `班${次の番号}`;
        const { center } = locationPresets[currentLocationKey];
        set(ref(db, 班名), {
          lat: center[0],
          lng: center[1],
          color: '#007bff'
        });
      }
    } else {
      const { center } = locationPresets[currentLocationKey];
      set(ref(db, "班1"), {
        lat: center[0],
        lng: center[1],
        color: '#007bff'
      });
    }
  });

  if (removeBtn) removeBtn.addEventListener("click", async () => {
    const snapshot = await get(child(ref(db), "/"));
    if (snapshot.exists()) {
      const 班一覧 = snapshot.val();
      const 班名リスト = Object.keys(班一覧)
        .filter(name => /^班\d+$/.test(name))
        .map(name => parseInt(name.replace("班", ""), 10))
        .sort((a, b) => b - a);
      const 班名 = `班${班名リスト[0]}`;
      await remove(ref(db, 班名));
    }
  });

  if (kamakuraBtn) kamakuraBtn.addEventListener("click", () => {
    currentLocationKey = "kamakura";
    const { center, zoom } = locationPresets[currentLocationKey];
    map.setView(center, zoom);
    set(ref(db, "mapLocation"), currentLocationKey);
  });

  if (uenoBtn) uenoBtn.addEventListener("click", () => {
    currentLocationKey = "ueno";
    const { center, zoom } = locationPresets[currentLocationKey];
    map.setView(center, zoom);
    set(ref(db, "mapLocation"), currentLocationKey);
  });

  const style = document.createElement('style');
  style.textContent = `
    .pin-number {
      position: relative;
      text-align: center;
    }
    .pin-arrow {
      position: absolute;
      bottom: -8px;
      left: 50%;
      transform: translateX(-50%);
      width: 0;
      height: 0;
      border-left: 6px solid transparent;
      border-right: 6px solid transparent;
      border-top: 8px solid black;
    }
  `;
  document.head.appendChild(style);
});
