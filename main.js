import { initializeApp } from "https://www.gstatic.com/firebasejs/11.8.1/firebase-app.js";
import { getDatabase, ref, set, onValue, remove } from "https://www.gstatic.com/firebasejs/11.8.1/firebase-database.js";
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

// ピン付き番号マーカーを生成
function createNumberedMarker(latlng, number, draggable = true) {
  const icon = L.divIcon({
    className: 'numbered-marker',
    html: `<div class="pin-number">${number}</div>`,
    iconSize: [30, 42],
    iconAnchor: [15, 42]
  });

  return L.marker(latlng, {
    icon: icon,
    draggable: draggable
  });
}

// 初期表示：班1〜班6
for (let i = 1; i <= 現在の班数; i++) {
  setup班(`班${i}`);
}

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

function setup班(班名) {
  const 初期座標 = [35.316, 139.55];
  const 班番号 = parseInt(班名.replace("班", ""), 10);

  const marker = createNumberedMarker(初期座標, 班番号).addTo(map)
    .bindPopup(班名).openPopup();
  班マーカー[班名] = marker;

  set(ref(db, 班名), {
    lat: 初期座標[0],
    lng: 初期座標[1]
  });

  marker.on('dragend', function (e) {
    const pos = e.target.getLatLng();
    set(ref(db, 班名), {
      lat: pos.lat,
      lng: pos.lng
    });
  });

  onValue(ref(db, 班名), (snapshot) => {
    const data = snapshot.val();
    if (data && 班マーカー[班名]) {
      班マーカー[班名].setLatLng([data.lat, data.lng]);
    }
  });
}
