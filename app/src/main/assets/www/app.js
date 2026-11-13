(() => {
  "use strict";

  const categories = [
    { id: "playas", name: "Playas", icon: "🏖️", description: "Calas y rincones junto al mar" },
    { id: "mercadillos", name: "Mercadillos", icon: "🧺", description: "Mercados y tradición local" },
    { id: "pueblos", name: "Pueblos", icon: "🏘️", description: "Descubre localidades con encanto" },
    { id: "lugares", name: "Lugares", icon: "📍", description: "Sitios que merece la pena visitar" },
    { id: "imprescindibles", name: "Imprescindibles", icon: "⭐", description: "Experiencias para recordar" }
  ];

  const $ = (id) => document.getElementById(id);
  const DEFAULT_ORIGIN = { lat: 39.6953, lng: 3.0176, label: "Centro de Mallorca" };
  let selectedOrigin = loadOrigin() || { ...DEFAULT_ORIGIN };
  let draftOrigin = { ...selectedOrigin };
  let map = null;
  let marker = null;

  function loadOrigin() {
    try {
      const saved = localStorage.getItem("mly.origin");
      return saved ? JSON.parse(saved) : null;
    } catch (_) { return null; }
  }

  function renderCategories() {
    $("categories").innerHTML = categories.map(item => `
      <button class="category-card" data-category="${item.id}">
        <span class="category-icon">${item.icon}</span>
        <span class="category-name">${item.name}</span>
        <span class="category-description">${item.description}</span>
      </button>`).join("");
  }

  function updateOrigin() {
    $("origin-label").textContent = selectedOrigin.label || selectedOrigin.lat.toFixed(4) + ", " + selectedOrigin.lng.toFixed(4);
    $("welcome-location").textContent = selectedOrigin.label || "Punto de búsqueda personalizado";
  }

  function toast(message) {
    const el = $("toast");
    el.textContent = message;
    el.classList.add("visible");
    window.setTimeout(() => el.classList.remove("visible"), 2600);
  }

  function openDrawer() {
    $("drawer").classList.add("open");
    $("drawer-backdrop").classList.add("visible");
    $("drawer").setAttribute("aria-hidden", "false");
  }
  function closeDrawer() {
    $("drawer").classList.remove("open");
    $("drawer-backdrop").classList.remove("visible");
    $("drawer").setAttribute("aria-hidden", "true");
  }

  function openOrigin() {
    closeDrawer();
    draftOrigin = { ...selectedOrigin };
    $("origin-modal").classList.add("visible");
    $("origin-modal").setAttribute("aria-hidden", "false");
    if (!map && window.L) {
      map = L.map("origin-map").setView([draftOrigin.lat, draftOrigin.lng], 9);
      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        maxZoom: 19,
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
      }).addTo(map);
      marker = L.marker([draftOrigin.lat, draftOrigin.lng], { draggable: true }).addTo(map);
      marker.on("dragend", () => setDraft(marker.getLatLng()));
      map.on("click", event => {
        marker.setLatLng(event.latlng);
        setDraft(event.latlng);
      });
    }
    if (map) {
      window.setTimeout(() => {
        map.invalidateSize();
        map.setView([draftOrigin.lat, draftOrigin.lng], 9);
        marker.setLatLng([draftOrigin.lat, draftOrigin.lng]);
      }, 120);
    } else {
      $("map-status").textContent = "No se ha podido cargar el mapa. Comprueba tu conexión a Internet.";
    }
  }

  function setDraft(point) {
    draftOrigin.lat = point.lat;
    draftOrigin.lng = point.lng;
    draftOrigin.label = point.lat.toFixed(4) + ", " + point.lng.toFixed(4);
    $("map-status").textContent = "Punto seleccionado: " + draftOrigin.label;
  }

  function closeOrigin() {
    $("origin-modal").classList.remove("visible");
    $("origin-modal").setAttribute("aria-hidden", "true");
  }

  function useGps() {
    if (!navigator.geolocation) {
      toast("Este dispositivo no permite obtener la ubicación.");
      return;
    }
    $("map-status").textContent = "Obteniendo tu ubicación…";
    navigator.geolocation.getCurrentPosition(position => {
      const point = { lat: position.coords.latitude, lng: position.coords.longitude };
      setDraft(point);
      if (map) {
        marker.setLatLng([point.lat, point.lng]);
        map.setView([point.lat, point.lng], 13);
      }
      $("map-status").textContent = "Ubicación GPS obtenida. Puedes mover el marcador antes de confirmar.";
    }, error => {
      $("map-status").textContent = "No se pudo obtener la ubicación. Revisa los permisos del teléfono.";
      toast("No ha sido posible obtener tu GPS.");
    }, { enableHighAccuracy: true, timeout: 15000, maximumAge: 60000 });
  }

  function saveOrigin() {
    selectedOrigin = { ...draftOrigin };
    localStorage.setItem("mly.origin", JSON.stringify(selectedOrigin));
    updateOrigin();
    closeOrigin();
    toast("Punto de origen guardado en este dispositivo.");
  }

  $("menu-button").addEventListener("click", openDrawer);
  $("close-menu").addEventListener("click", closeDrawer);
  $("drawer-backdrop").addEventListener("click", closeDrawer);
  $("choose-origin").addEventListener("click", openOrigin);
  $("menu-origin").addEventListener("click", openOrigin);
  $("close-origin").addEventListener("click", closeOrigin);
  $("use-gps").addEventListener("click", useGps);
  $("save-origin").addEventListener("click", saveOrigin);
  $("menu-language").addEventListener("click", () => toast("La selección de idiomas se incorporará en la siguiente fase."));
  $("menu-legal").addEventListener("click", () => toast("El aviso legal se completará antes de publicar la aplicación."));
  $("categories").addEventListener("click", event => {
    const button = event.target.closest("[data-category]");
    if (button) toast("La sección " + button.dataset.category + " se conectará al catálogo de lugares.");
  });
  document.querySelectorAll(".nav-item").forEach(button => {
    button.addEventListener("click", () => {
      document.querySelectorAll(".nav-item").forEach(item => item.classList.remove("active"));
      button.classList.add("active");
      if (button.dataset.page !== "home") toast("Esta sección se desarrollará en la siguiente fase.");
    });
  });

  renderCategories();
  updateOrigin();
  $("weather-summary").textContent = "La información meteorológica se conectará al servicio de previsión en la siguiente fase.";
})();
