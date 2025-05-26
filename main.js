import { initializeApp } from "https://www.gstatic.com/firebasejs/11.8.1/firebase-app.js";
import { getDatabase, ref, set, onValue, remove, get, child } from "https://www.gstatic.com/firebasejs/11.8.1/firebase-database.js";
import { firebaseConfig } from './js/firebase-config.js';

const app = initializeApp(firebaseConfig);
const db = getDatabase(app);
const map = L.map('map').setView([35.316, 139.55], 14);
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
  attribution: '&copy; OpenStreetMap contributors'
}).addTo(map);

const MAX班 = 12;
const MIN班 = 1;
let 現在の班数 = 6;
const 班マーカー = {}; // 班名 → marker のマップ

function createNumberedMarker(latlng, number, draggable = true, color = '#007bff') {
  const icon = L.divIcon({
    className: 'numbered-marker',
    html: `<div class="pin-number" style="background-color: ${color};">${number}</div>`,
    iconSize: [30, 42],
    iconAnchor: [15, 42]
  });

  return L.marker(latlng, {
    icon: icon,
    draggable: draggable
  });
}

// Firebaseから班データを読み込む
get(child(ref(db), '/')).then((snapshot) => {
  if (snapshot.exists()) {
    const 班一覧 = snapshot.val();
    const 班名リスト = Object.keys(班一覧).filter(name => /^班\d+$/.test(name)).sort((a, b) => {
      return parseInt(a.replace("班", "")) - parseInt(b.replace("班", ""));
    });

    現在の班数 = 班名リスト.length;

    班名リスト.forEach(班名 => {
      const { lat, lng, color } = 班一覧[班名];
      setup班(班名, [lat, lng], color);
    });
  } else {
    for (let i = 1; i <= 現在の班数; i++) {
      setup班(`班${i}`);
    }
  }
});

// ＋班を追加
document.getElementById("add-marker-btn").addEventListener("click", () => {
  if (現在の班数 >= MAX班) return;
  現在の班数++;
  setup班(`班${現在の班数}`);
});

// −班を削除
document.getElementById("remove-marker-btn").addEventListener("click", () => {
  if (現在の班数 <= MIN班) return;
  const 班名 = `班${現在の班数}`;
  if (班マーカー[班名]) {
    map.removeLayer(班マーカー[班名]);
    delete 班マーカー[班名];
  }
  remove(ref(db, 班名));
  現在の班数--;
});

function setup班(班名, 初期座標 = [35.316, 139.55], 初期色 = '#007bff') {
  const 班番号 = parseInt(班名.replace("班", ""), 10);
  if (isNaN(班番号)) return;

  let 現在の色 = 初期色;
  const marker = createNumberedMarker(初期座標, 班番号, true, 現在の色).addTo(map);
  班マーカー[班名] = marker;

  marker.bindPopup(班名);

  set(ref(db, 班名), {
    lat: 初期座標[0],
    lng: 初期座標[1],
    color: 現在の色
  });

  marker.on('dragend', function (e) {
    const pos = e.target.getLatLng();
    set(ref(db, 班名), {
      lat: pos.lat,
      lng: pos.lng,
      color: 現在の色
    });
  });

  marker.on('contextmenu', function (e) {
    const colors = ['#007bff', '#dc3545', '#28a745', '#ffc107', '#6610f2'];
    const currentColorIndex = colors.indexOf(現在の色);
    const nextColorIndex = (currentColorIndex + 1) % colors.length;
    現在の色 = colors[nextColorIndex];

    const 班番号 = parseInt(班名.replace("班", ""));
    const newIcon = L.divIcon({
      className: 'numbered-marker',
      html: `<div class="pin-number" style="background-color: ${現在の色};">${班番号}</div>`,
      iconSize: [30, 42],
      iconAnchor: [15, 42]
    });
    marker.setIcon(newIcon);

    const pos = marker.getLatLng();
    set(ref(db, 班名), {
      lat: pos.lat,
      lng: pos.lng,
      color: 現在の色
    });
  });

  onValue(ref(db, 班名), (snapshot) => {
    const data = snapshot.val();
    if (data && typeof data.lat === 'number' && typeof data.lng === 'number') {
      班マーカー[班名].setLatLng([data.lat, data.lng]);
    }
  });
}
