import { initializeApp } from "https://www.gstatic.com/firebasejs/11.8.1/firebase-app.js";
import { getDatabase, ref, set, onValue, remove, get, child, onChildRemoved, onChildAdded } from "https://www.gstatic.com/firebasejs/11.8.1/firebase-database.js";
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

  return L.marker(latlng, {
    icon: icon,
    draggable: draggable
  });
}

// 初期読み込み
get(child(ref(db), '/')).then((snapshot) => {
  if (snapshot.exists()) {
    const 班一覧 = snapshot.val();
    const 班名リスト = Object.keys(班一覧).filter(name => /^班\d+$/.test(name)).sort((a, b) => {
      return parseInt(a.replace("班", "")) - parseInt(b.replace("班", ""));
    });
    現在の班数 = 現在の班数 < 班名リスト.length ? 現在の班数 : 現在の班数;
    班名リスト.forEach(班名 => {
      const { lat, lng, color } = 班一覧[班名];
      setup班(班名, [lat, lng], color);
    });
  }
});

// 追加された班の監視
function toMonitorChanges() {
  const rootRef = ref(db);
  onChildAdded(rootRef, (snapshot) => {
    const 班名 = snapshot.key;
    if (!班マーカー[班名] && /^班\d+$/.test(班名)) {
      const { lat, lng, color } = snapshot.val();
      setup班(班名, [lat, lng], color);
    }
  });

  onChildRemoved(rootRef, (snapshot) => {
    const 班名 = snapshot.key;
    if (班マーカー[班名]) {
      map.removeLayer(班マーカー[班名]);
      delete 班マーカー[班名];
    }
  });
}
toMonitorChanges();

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

  marker.on('dragend', function (e) {
    const pos = e.target.getLatLng();
    set(ref(db, 班名), {
      lat: pos.lat,
      lng: pos.lng,
      color: 現在の色
    });
  });

  marker.on('contextmenu', function (e) {
    e.originalEvent.preventDefault();

    const menu = document.createElement('div');
    menu.style.position = 'absolute';
    menu.style.left = `${e.originalEvent.pageX}px`;
    menu.style.top = `${e.originalEvent.pageY}px`;
    menu.style.zIndex = 10000;
    menu.style.background = 'white';
    menu.style.border = '1px solid #ccc';
    menu.style.padding = '4px';
    menu.style.display = 'flex';
    menu.style.gap = '4px';

    色リスト.forEach(color => {
      const colorBtn = document.createElement('div');
      colorBtn.style.width = '20px';
      colorBtn.style.height = '20px';
      colorBtn.style.backgroundColor = color;
      colorBtn.style.cursor = 'pointer';
      colorBtn.title = color;
      colorBtn.onclick = () => {
        現在の色 = color;
        const newIcon = createNumberedMarker(marker.getLatLng(), 班番号, true, color).options.icon;
        marker.setIcon(newIcon);
        const pos = marker.getLatLng();
        set(ref(db, 班名), {
          lat: pos.lat,
          lng: pos.lng,
          color: color
        });
        document.body.removeChild(menu);
      };
      menu.appendChild(colorBtn);
    });

    document.body.appendChild(menu);
    const removeMenu = () => { if (document.body.contains(menu)) document.body.removeChild(menu); };
    setTimeout(() => document.addEventListener('click', removeMenu, { once: true }), 0);
  });

  onValue(ref(db, 班名), (snapshot) => {
    const data = snapshot.val();
    if (data && typeof data.lat === 'number' && typeof data.lng === 'number') {
      marker.setLatLng([data.lat, data.lng]);
      if (data.color && data.color !== 現在の色) {
        現在の色 = data.color;
        const newIcon = createNumberedMarker([data.lat, data.lng], 班番号, true, data.color).options.icon;
        marker.setIcon(newIcon);
      }
    }
  });
}

// 必要なCSSを挿入
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
  }
`;
document.head.appendChild(style);
