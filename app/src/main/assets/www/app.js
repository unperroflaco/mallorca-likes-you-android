(() => {
  "use strict";

  const $ = id => document.getElementById(id);
  const API = window.MLY_CONFIG || {};
  const DEFAULT_ORIGIN = { lat: 39.6953, lng: 3.0176, label: "Centro de Mallorca" };
  const ICONS = {
    "Playa": "🏖️", "Playas": "🏖️",
    "Mercadillo": "🧺", "Mercadillos": "🧺",
    "Pueblo": "🏘️", "Pueblos": "🏘️",
    "Lugar": "📍", "Lugares": "📍",
    "Imprescindibles": "⭐"
  };
  const DESCRIPTIONS = {
    "Playa": "Calas y rincones junto al mar",
    "Mercadillo": "Mercados y tradición local",
    "Pueblo": "Localidades con encanto",
    "Lugar": "Sitios que merece la pena visitar",
    "Imprescindibles": "Experiencias para recordar"
  };

  let selectedOrigin = loadOrigin() || { ...DEFAULT_ORIGIN };
  let draftOrigin = { ...selectedOrigin };
  let map = null, marker = null;
  let categories = [], subcategories = [], selectedCategories = [], selectedSubcategories = [];
  let language = loadLanguage();

  function loadOrigin() {
    try { const value = localStorage.getItem("mly.origin"); return value ? JSON.parse(value) : null; }
    catch (_) { return null; }
  }
  function loadLanguage() {
    const saved = localStorage.getItem("mly.language");
    if (["es", "ib", "en", "de"].includes(saved)) return saved;
    const browser = (navigator.language || "es").toLowerCase();
    if (browser.startsWith("de")) return "de";
    if (browser.startsWith("en")) return "en";
    if (browser.startsWith("ca")) return "ib";
    return "es";
  }
  function escapeHtml(value) {
    return String(value == null ? "" : value).replace(/[&<>"']/g, char => ({
      "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
    }[char]));
  }
  function apiUrl(endpoint, params) {
    const base = String(API.API_BASE || "").replace(/\/?$/, "/");
    const url = new URL(endpoint, base);
    Object.keys(params || {}).forEach(key => {
      const value = params[key];
      if (Array.isArray(value)) value.forEach(item => url.searchParams.append(key + "[]", item));
      else if (value !== undefined && value !== null && value !== "") url.searchParams.set(key, value);
    });
    return url.toString();
  }
  async function apiGet(endpoint, params) {
    if (!API.API_BASE || API.API_BASE.indexOf("TU-DOMINIO") >= 0) {
      throw new Error("Falta configurar API_BASE en config.js.");
    }
    // GET sencillo sin cabeceras personalizadas: no requiere preflight CORS.
    const response = await fetch(apiUrl(endpoint, params), {
      method: "GET"
    });
    const data = await response.json();
    if (!response.ok || !data.ok) throw new Error(data.message || data.error || "Error consultando el servicio.");
    return data;
  }
  function toast(message) {
    const el = $("toast"); el.textContent = message; el.classList.add("visible");
    window.setTimeout(() => el.classList.remove("visible"), 3000);
  }
  function updateOrigin() {
    $("origin-label").textContent = selectedOrigin.label || selectedOrigin.lat.toFixed(4) + ", " + selectedOrigin.lng.toFixed(4);
    $("welcome-location").textContent = selectedOrigin.label || "Punto de búsqueda personalizado";
  }
  function closeDrawer() {
    $("drawer").classList.remove("open"); $("drawer-backdrop").classList.remove("visible");
    $("drawer").setAttribute("aria-hidden", "true");
  }
  function openDrawer() {
    $("drawer").classList.add("open"); $("drawer-backdrop").classList.add("visible");
    $("drawer").setAttribute("aria-hidden", "false");
  }
  function renderCategories() {
    $("categories").innerHTML = categories.map(name => {
      const active = selectedCategories.includes(name);
      return '<button class="category-card ' + (active ? "selected" : "") + '" data-category="' + escapeHtml(name) + '">' +
        '<span class="category-icon">' + (ICONS[name] || "📌") + '</span>' +
        '<span class="category-name">' + escapeHtml(name) + '</span>' +
        '<span class="category-description">' + escapeHtml(DESCRIPTIONS[name] || "Descubre Mallorca") + '</span></button>';
    }).join("");
    renderSubcategories();
  }
  function renderSubcategories() {
    const box = $("subcategories");
    if (!selectedCategories.includes("Imprescindibles")) {
      box.hidden = true; box.innerHTML = ""; selectedSubcategories = []; return;
    }
    box.hidden = false;
    box.innerHTML = '<p class="selection-hint">Filtra los imprescindibles (opcional):</p>' +
      subcategories.map(name => '<label class="subcategory-chip"><input type="checkbox" data-subcategory="' +
      escapeHtml(name) + '" ' + (selectedSubcategories.includes(name) ? "checked" : "") + '> ' +
      escapeHtml(name) + '</label>').join("");
  }
  async function loadCategories() {
    try {
      const data = await apiGet("categorias.php");
      categories = data.categorias || [];
      subcategories = data.subcategorias_imprescindibles || [];
      renderCategories();
    } catch (error) {
      $("categories").innerHTML = '<div class="empty-results">' + escapeHtml(error.message) + '</div>';
    }
  }
  function openOrigin() {
    closeDrawer(); draftOrigin = { ...selectedOrigin };
    $("origin-modal").classList.add("visible"); $("origin-modal").setAttribute("aria-hidden", "false");
    if (!map && window.L) {
      map = L.map("origin-map").setView([draftOrigin.lat, draftOrigin.lng], 9);
      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        maxZoom: 19,
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
      }).addTo(map);
      marker = L.marker([draftOrigin.lat, draftOrigin.lng], { draggable: true }).addTo(map);
      marker.on("dragend", () => setDraft(marker.getLatLng()));
      map.on("click", event => { marker.setLatLng(event.latlng); setDraft(event.latlng); });
    }
    if (map) window.setTimeout(() => {
      map.invalidateSize(); map.setView([draftOrigin.lat, draftOrigin.lng], 9);
      marker.setLatLng([draftOrigin.lat, draftOrigin.lng]);
    }, 120);
    else $("map-status").textContent = "No se ha podido cargar el mapa. Comprueba tu conexión.";
  }
  function setDraft(point) {
    draftOrigin.lat = point.lat; draftOrigin.lng = point.lng;
    draftOrigin.label = point.lat.toFixed(4) + ", " + point.lng.toFixed(4);
    $("map-status").textContent = "Punto seleccionado: " + draftOrigin.label;
  }
  function closeOrigin() {
    $("origin-modal").classList.remove("visible"); $("origin-modal").setAttribute("aria-hidden", "true");
  }
  function useGps() {
    if (!navigator.geolocation) { toast("Este dispositivo no permite obtener la ubicación."); return; }
    $("map-status").textContent = "Obteniendo tu ubicación…";
    navigator.geolocation.getCurrentPosition(position => {
      const point = { lat: position.coords.latitude, lng: position.coords.longitude };
      setDraft(point);
      if (map) { marker.setLatLng([point.lat, point.lng]); map.setView([point.lat, point.lng], 13); }
      $("map-status").textContent = "GPS obtenido. Puedes mover el marcador antes de confirmar.";
    }, () => {
      $("map-status").textContent = "No se pudo obtener la ubicación. Revisa los permisos.";
      toast("No ha sido posible obtener tu GPS.");
    }, { enableHighAccuracy: true, timeout: 15000, maximumAge: 60000 });
  }
  function saveOrigin() {
    selectedOrigin = { ...draftOrigin };
    localStorage.setItem("mly.origin", JSON.stringify(selectedOrigin));
    updateOrigin(); closeOrigin(); toast("Punto de origen guardado en este dispositivo.");
  }
  function renderResults(items) {
    $("results-section").hidden = false;
    $("results-title").textContent = items.length + (items.length === 1 ? " lugar encontrado" : " lugares encontrados");
    if (!items.length) {
      $("results").innerHTML = '<div class="empty-results">No se han encontrado lugares para esa selección.</div>';
      return;
    }
    $("results").innerHTML = items.map(item => {
      const photo = item.fotos && item.fotos.length ? item.fotos[0] : null;
      const image = photo ? '<img src="' + escapeHtml(photo.url) + '" alt="' + escapeHtml(item.lugar) + '" loading="lazy">' :
        '<div class="result-placeholder">📍</div>';
      return '<article class="result-card">' + image + '<div><div class="result-meta">' +
        escapeHtml(item.categoria) + (item.municipio ? " · " + escapeHtml(item.municipio) : "") +
        (item.distancia_km !== undefined ? " · " + escapeHtml(item.distancia_km) + " km" : "") +
        '</div><h3>' + escapeHtml(item.lugar) + '</h3><p>' + escapeHtml(item.desc_corta || "") +
        '</p>' + (photo && photo.autor ? '<p>Foto: ' + escapeHtml(photo.autor) + '</p>' : '') +
        '<button class="result-open" data-detail="' + Number(item.id) + '">Ver ficha completa →</button></div></article>';
    }).join("");
  }
  async function searchPlaces() {
    if (!selectedCategories.length) { toast("Selecciona al menos una categoría."); return; }
    $("search-button").disabled = true; $("search-button").textContent = "Buscando…";
    try {
      const data = await apiGet("buscar.php", {
        lat: selectedOrigin.lat, lng: selectedOrigin.lng, idioma: language,
        categorias: selectedCategories, subcategorias: selectedSubcategories, limite: 400
      });
      renderResults(data.resultados || []);
      $("results-section").scrollIntoView({ behavior: "smooth", block: "start" });
    } catch (error) {
      toast(error.message);
    } finally {
      $("search-button").disabled = false; $("search-button").textContent = "Buscar lugares cercanos";
    }
  }
  async function openDetail(id) {
    $("detail-modal").classList.add("visible");
    $("detail-modal").setAttribute("aria-hidden", "false");
    $("detail-title").textContent = "Cargando…";
    $("detail-content").innerHTML = '<p class="muted">Consultando la ficha del lugar…</p>';
    try {
      const data = await apiGet("detalle.php", { id: id, idioma: language });
      const place = data.lugar;
      $("detail-title").textContent = place.lugar;
      const photos = (place.fotos || []).map(photo =>
        '<img class="detail-photo" src="' + escapeHtml(photo.url) + '" alt="' + escapeHtml(place.lugar) + '">' +
        '<p class="detail-author">Fotografía: ' + escapeHtml(photo.autor || "") + '</p>'
      ).join("");
      const mapsUrl = "https://www.google.com/maps/dir/?api=1&destination=" +
        encodeURIComponent(place.lat + "," + place.lng);
      $("detail-content").innerHTML = photos +
        '<p class="detail-description">' + escapeHtml(place.desc_larga || place.desc_corta || "") + '</p>' +
        (place.municipio ? '<p class="muted">' + escapeHtml(place.municipio) + '</p>' : '') +
        '<div class="detail-actions"><button class="primary-button" id="open-google-maps">Cómo llegar con Google Maps</button></div>';
      $("open-google-maps").addEventListener("click", () => window.open(mapsUrl, "_blank"));
    } catch (error) {
      $("detail-content").innerHTML = '<p class="muted">' + escapeHtml(error.message) + '</p>';
    }
  }
  function cycleLanguage() {
    const languages = ["es", "ib", "en", "de"];
    language = languages[(languages.indexOf(language) + 1) % languages.length];
    localStorage.setItem("mly.language", language);
    $("menu-language").textContent = "Idioma: " + language.toUpperCase();
    closeDrawer(); toast("Idioma seleccionado: " + language.toUpperCase() + ". Vuelve a buscar para aplicar el cambio.");
  }

  $("menu-button").addEventListener("click", openDrawer);
  $("close-menu").addEventListener("click", closeDrawer);
  $("drawer-backdrop").addEventListener("click", closeDrawer);
  $("choose-origin").addEventListener("click", openOrigin);
  $("menu-origin").addEventListener("click", openOrigin);
  $("close-origin").addEventListener("click", closeOrigin);
  $("use-gps").addEventListener("click", useGps);
  $("save-origin").addEventListener("click", saveOrigin);
  $("search-button").addEventListener("click", searchPlaces);
  $("menu-language").addEventListener("click", cycleLanguage);
  $("menu-legal").addEventListener("click", () => toast("El aviso legal se completará antes de publicar la aplicación."));
  $("categories").addEventListener("click", event => {
    const button = event.target.closest("[data-category]");
    if (!button) return;
    const name = button.dataset.category;
    selectedCategories = selectedCategories.includes(name) ?
      selectedCategories.filter(item => item !== name) : selectedCategories.concat([name]);
    renderCategories();
  });
  $("subcategories").addEventListener("change", event => {
    const input = event.target.closest("[data-subcategory]");
    if (!input) return;
    const name = input.dataset.subcategory;
    selectedSubcategories = input.checked ?
      selectedSubcategories.concat([name]) : selectedSubcategories.filter(item => item !== name);
  });
  $("results").addEventListener("click", event => {
    const button = event.target.closest("[data-detail]");
    if (button) openDetail(button.dataset.detail);
  });
  $("close-detail").addEventListener("click", () => {
    $("detail-modal").classList.remove("visible"); $("detail-modal").setAttribute("aria-hidden", "true");
  });
  document.querySelectorAll(".nav-item").forEach(button => button.addEventListener("click", () => {
    document.querySelectorAll(".nav-item").forEach(item => item.classList.remove("active"));
    button.classList.add("active");
    if (button.dataset.page !== "home") toast("Esta sección se desarrollará en la siguiente fase.");
  }));

  updateOrigin();
  $("menu-language").textContent = "Idioma: " + language.toUpperCase();
  $("weather-summary").textContent = "La información meteorológica se conectará a su servicio de previsión.";
  loadCategories();
})();
