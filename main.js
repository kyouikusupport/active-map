import { initializeApp } from "https://www.gstatic.com/firebasejs/11.8.1/firebase-app.js";
import { getDatabase, ref, set, onValue } from "https://www.gstatic.com/firebasejs/11.8.1/firebase-database.js";
import { firebaseConfig } from './js/firebase-config.js'; // ←自分のFirebase設定を書く

// Firebase初期化
const app = initializeApp(firebaseConfig);
const db = getDatabase(app);

// 地図初期化（鎌倉あたりを中心に）
const map = L.map('map').setView([35.316, 139.55], 14);

// タイル表示
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
  attribution: '&copy; OpenStreetMap contributors'
}).addTo(map);

// ピンを作成（例：班A）
const marker = L.marker([35.316, 139.55], { draggable: true }).addTo(map)
  .bindPopup('班A').openPopup();

// ピンを動かしたらFirebaseに反映
marker.on('dragend', function (e) {
  const pos = e.target.getLatLng();
  set(ref(db, '班A'), {
    lat: pos.lat,
    lng: pos.lng
  });
});

// Firebaseから位置を受信し反映（他の人が動かした場合）
onValue(ref(db, '班A'), (snapshot) => {
  const data = snapshot.val();
  if (data) {
    marker.setLatLng([data.lat, data.lng]);
  }
});
