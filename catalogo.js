/* ================================================================
   DYNASTY 8 — catalogo.js
   Catálogo, ficha, favoritos, vistos recentemente e compartilhamento.
   ================================================================ */

let catalogData = [];
let allProperties = [];
let currentProperty = null;
let currentGallery = [];
let currentGalleryIndex = 0;
let toastTimer;

const CONFIG = window.DYNASTY8_CONFIG || window.VERTIGEM_CONFIG || { collections: {}, links: {} };
const $ = (selector) => document.querySelector(selector);

function readStoredList(...keys) {
  for (const key of keys) {
    try {
      const raw = localStorage.getItem(key);
      if (!raw) continue;
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed;
    } catch (error) {
      console.warn(`Não foi possível ler ${key}.`, error);
    }
  }
  return [];
}

const favorites = new Set(readStoredList("dynasty8_favorites", "vertigem_favorites"));
let recents = readStoredList("dynasty8_recents");

const params = new URLSearchParams(window.location.search);
let currentClass = (params.get("classe") || "b").toLowerCase();
if (!["a", "b", "c"].includes(currentClass)) currentClass = "b";

const collectionLabels = {
  a: CONFIG.collections?.a || { eyebrow: "CATÁLOGO RESIDENCIAL", name: "Residências Exclusivas", intro: "Residências desta seleção em San Andreas." },
  b: CONFIG.collections?.b || { eyebrow: "CATÁLOGO RESIDENCIAL", name: "Residências Selecionadas", intro: "Residências desta seleção em San Andreas." },
  c: CONFIG.collections?.c || { eyebrow: "CATÁLOGO RESIDENCIAL", name: "Residências Essenciais", intro: "Residências desta seleção em San Andreas." }
};

function slugify(value) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function displayCode(id) {
  return String(id || "").toUpperCase();
}

function mergeProperties(properties, controls) {
  return properties.map((property) => ({
    ...property,
    ...(controls?.[property.id] || {
      published: false,
      status: "Indisponível",
      price: null,
      showcase: false,
      new: false,
      development: false
    })
  }));
}

function propertyUrl(property) {
  return `catalogo.html?classe=${property.class}&imovel=${encodeURIComponent(property.id)}`;
}

function findProperty(reference) {
  const normalized = String(reference || "").toLowerCase();
  return catalogData.find((property) =>
    property.id.toLowerCase() === normalized || slugify(property.name) === normalized
  );
}

function isShowcase(property) {
  return property?.showcase === true;
}

function isNewProperty(property) {
  return property?.new === true;
}

function isDevelopment(property) {
  return property?.development === true;
}

function formatPrice(value) {
  if (value === null || value === undefined || value === "") return "Consultar";
  const numericValue = Number(value);
  if (Number.isNaN(numericValue)) return String(value);
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(numericValue);
}

function statusClass(status) {
  return status === "Disponível" ? "available" : "unavailable";
}

function isAvailableProperty(property) {
  return property?.status === "Disponível";
}

function showToast(message) {
  const toast = $("#toast");
  if (!toast) return;
  toast.textContent = message;
  toast.classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove("show"), 3200);
}

function applyPageLabels() {
  document.body.classList.add(`collection-${currentClass}`);
  const pageLabel = collectionLabels[currentClass];
  $("#catalogEyebrow").textContent = pageLabel.eyebrow || "CATÁLOGO RESIDENCIAL";
  $("#catalogTitle").textContent = pageLabel.name || "Residências";
  $("#catalogIntro").textContent = pageLabel.intro || "Residências selecionadas em San Andreas.";
  const breadcrumb = $("#catalogBreadcrumb");
  if (breadcrumb) breadcrumb.textContent = pageLabel.name || "Residências";
  document.title = `${pageLabel.name || "Catálogo"} — Dynasty 8`;

  ["a", "b", "c"].forEach((key) => {
    const label = collectionLabels[key];
    const desktopNav = document.querySelector(`[data-catalog-nav="${key}"]`);
    const mobileNav = document.querySelector(`[data-catalog-nav-mobile="${key}"]`);

    if (desktopNav && label) {
      desktopNav.textContent = label.name;
      desktopNav.classList.toggle("active", key === currentClass);
      if (key === currentClass) desktopNav.setAttribute("aria-current", "page");
      else desktopNav.removeAttribute("aria-current");
    }

    if (mobileNav && label) {
      mobileNav.textContent = label.name.replace("Residências ", "");
      mobileNav.classList.toggle("active", key === currentClass);
      if (key === currentClass) mobileNav.setAttribute("aria-current", "page");
      else mobileNav.removeAttribute("aria-current");
    }
  });
}

function applySocialLinks() {
  document.querySelectorAll("[data-social-link]").forEach((link) => {
    const url = CONFIG.links?.[link.dataset.socialLink];
    if (url && /^https?:\/\//i.test(url)) {
      link.href = url;
    } else {
      link.href = "#";
      link.classList.add("is-disabled");
      link.addEventListener("click", (event) => event.preventDefault());
    }
  });
}

function configureTicketButton() {
  const button = $("#staffTicketButton");
  const warning = $("#ticketConfigWarning");
  const ticketUrl = CONFIG.links?.ticket || CONFIG.links?.discord;

  if (ticketUrl && /^https?:\/\//i.test(ticketUrl)) {
    button.href = ticketUrl;
    button.classList.remove("is-disabled");
    button.removeAttribute("aria-disabled");
    if (warning) warning.hidden = true;
  } else {
    button.href = "#";
    button.classList.add("is-disabled");
    button.setAttribute("aria-disabled", "true");
    if (warning) warning.hidden = false;
  }
}

function skylineMarkup() {
  return `<div class="skyline"><span></span><span></span><span></span><span></span><span></span><span></span></div>`;
}

function propertyVisual(property) {
  if (property.cover) {
    return `
      <img class="property-cover" src="${property.cover}" alt="${property.name}" loading="lazy" onerror="this.style.display='none'; this.nextElementSibling.style.display='block';">
      <div class="property-cover-fallback" style="display:none">${skylineMarkup()}</div>
    `;
  }
  return `<div class="property-cover-fallback">${skylineMarkup()}</div>`;
}

function renderProperties(items) {
  const grid = $("#propertyGrid");
  grid.classList.remove("is-loading");

  grid.innerHTML = items.map((property, index) => {
    const visualVariant = ["art-variant-a", "art-variant-b", "art-variant-c"][index % 3];
    const editorialIndex = String(index + 1).padStart(2, "0");
    const available = isAvailableProperty(property);
    const unavailableClass = available ? "" : " is-unavailable-property";
    const cardA11y = available
      ? `tabindex="0" role="button" aria-label="Abrir ${property.name}"`
      : `tabindex="0" role="button" aria-disabled="true" aria-label="${property.name} indisponível"`;

    return `
      <article class="property-card interactive-property-card ${visualVariant}${unavailableClass}" data-property-card="${property.id}" ${cardA11y}>
        <div class="card-visual">
          ${propertyVisual(property)}
          <span class="card-editorial-index" aria-hidden="true">${editorialIndex}</span>
          <span class="card-register-mark" aria-hidden="true"></span>
          <span class="card-diagonal-accent" aria-hidden="true"></span>

          <div class="card-status-stack">
            ${available && isNewProperty(property) ? '<span class="card-pill is-new">Novidade</span>' : ""}
            ${available && isShowcase(property) ? '<span class="card-pill is-showcase">Destaque</span>' : ""}
            <span class="card-status ${statusClass(property.status)}">${property.status}</span>
          </div>

          ${available ? `<button class="favorite ${favorites.has(property.id) ? "active" : ""}" data-favorite="${property.id}" aria-label="Salvar ${property.name}" type="button">♡</button>` : ""}
          ${available ? '<span class="card-hover-cta">Ver propriedade <b>↗</b></span>' : ""}
        </div>

        <div class="card-body">
          <p class="card-location">${property.location || "San Andreas"}</p>
          <h3 class="card-title">${property.name}</h3>
          ${property.locationDetail ? `<p class="card-location-detail">${property.locationDetail}</p>` : ""}

          ${available
            ? `<div class="card-price"><span>Valor de referência</span><strong>${formatPrice(property.price)}</strong></div>`
            : `<div class="unavailable-message"><span>Este ambiente está fora da disponibilidade atual.</span></div>`
          }

          <div class="card-footer clean-card-footer${available ? "" : " unavailable-footer"}">
            ${available
              ? '<span>Conhecer propriedade</span><span class="interactive-arrow"><b>↗</b></span>'
              : '<span>DYNASTY 8 · SAN ANDREAS</span>'
            }
          </div>
        </div>
      </article>
    `;
  }).join("");

  $("#resultCount").textContent = `${items.length} ${items.length === 1 ? "propriedade encontrada" : "propriedades encontradas"}`;
  $("#emptyState").hidden = items.length !== 0;
  grid.style.display = items.length ? "grid" : "none";
}

function populateLocationFilter() {
  const locations = [...new Set(allProperties.map((property) => property.location).filter(Boolean))].sort();
  $("#locationFilter").innerHTML = '<option value="">Todas</option>' + locations.map((value) => `<option value="${value}">${value}</option>`).join("");
}

function applyFilters() {
  const search = $("#searchInput").value.trim().toLowerCase();
  const location = $("#locationFilter").value;
  const sort = $("#sortFilter").value;

  let items = allProperties.filter((property) => {
    const haystack = [property.name, property.location, property.locationDetail, property.description].filter(Boolean).join(" ").toLowerCase();
    if (search && !haystack.includes(search)) return false;
    if (location && property.location !== location) return false;
    return true;
  });

  items.sort((a, b) => {
    if (sort === "name") return a.name.localeCompare(b.name);
    if (sort === "location") return (a.location || "").localeCompare(b.location || "");
    return Number(isAvailableProperty(b)) - Number(isAvailableProperty(a)) || Number(isShowcase(b)) - Number(isShowcase(a)) || Number(isNewProperty(b)) - Number(isNewProperty(a)) || a.name.localeCompare(b.name);
  });

  renderProperties(items);
}

/* ----------------------------- FAVORITOS ----------------------------- */

function persistFavorites() {
  const values = [...favorites];
  localStorage.setItem("dynasty8_favorites", JSON.stringify(values));
  // mantém compatibilidade com quem já usou a versão anterior
  localStorage.setItem("vertigem_favorites", JSON.stringify(values));
}

function renderFavorites() {
  const list = $("#favoritesList");
  const empty = $("#favoritesEmpty");

  const values = [...favorites]
    .map((id) => catalogData.find((property) => property.id === id))
    .filter((property) => property && property.published === true && !isDevelopment(property));

  const availableValues = values.filter(isAvailableProperty);

  $("#favoritesCount").textContent = String(values.length);
  $("#copyFavorites").disabled = availableValues.length === 0;
  $("#clearFavorites").disabled = values.length === 0;
  empty.hidden = values.length !== 0;

  list.innerHTML = values.map((property) => {
    const available = isAvailableProperty(property);
    return `
      <article class="favorite-item${available ? "" : " is-unavailable"}">
        <button class="favorite-item-main" type="button" data-favorite-open="${property.id}">
          <img src="${property.cover || ""}" alt="" loading="lazy">
          <span><strong>${property.name}</strong><small>${property.location || "San Andreas"} · ${property.status}</small></span>
        </button>
        <button class="favorite-remove" type="button" data-favorite="${property.id}" aria-label="Remover ${property.name}">×</button>
      </article>
    `;
  }).join("");

  document.querySelectorAll("[data-favorite]").forEach((button) => {
    button.classList.toggle("active", favorites.has(button.dataset.favorite));
  });

  if (currentProperty) {
    const saved = favorites.has(currentProperty.id);
    $("#modalFavorite").classList.toggle("active", saved);
    $("#modalFavorite").textContent = saved ? "♥" : "♡";
  }
}

function toggleFavorite(id) {
  if (favorites.has(id)) favorites.delete(id);
  else favorites.add(id);
  persistFavorites();
  renderFavorites();
  showToast(favorites.has(id) ? "Imóvel salvo." : "Imóvel removido dos salvos.");
}

function openFavorites() {
  renderFavorites();
  $("#favoritesDrawer").classList.add("open");
  $("#favoritesDrawer").setAttribute("aria-hidden", "false");
  $("#favoritesBtn").setAttribute("aria-expanded", "true");
  document.body.classList.add("favorites-open");
}

function closeFavorites() {
  $("#favoritesDrawer").classList.remove("open");
  $("#favoritesDrawer").setAttribute("aria-hidden", "true");
  $("#favoritesBtn").setAttribute("aria-expanded", "false");
  document.body.classList.remove("favorites-open");
}

async function copyFavoritesSelection() {
  const codes = [...favorites]
    .map((id) => catalogData.find((property) => property.id === id))
    .filter((property) => property && property.published === true && !isDevelopment(property) && isAvailableProperty(property))
    .map((property) => displayCode(property.id));

  if (!codes.length) {
    showToast("Nenhuma propriedade disponível na seleção.");
    return;
  }

  const text = `Tenho interesse nestas propriedades: ${codes.join(", ")}.`;
  const copied = await copyText(text);
  showToast(copied ? "Seleção copiada para o atendimento." : "Não foi possível copiar a seleção.");
}

/* ----------------------- VISTOS RECENTEMENTE ------------------------ */

function persistRecents() {
  localStorage.setItem("dynasty8_recents", JSON.stringify(recents));
}

function addRecent(id) {
  recents = [id, ...recents.filter((item) => item !== id)].slice(0, 6);
  persistRecents();
  renderRecents();
}

function renderRecents() {
  const section = $("#recentSection");
  const grid = $("#recentGrid");

  const items = recents
    .map((id) => catalogData.find((property) => property.id === id))
    .filter((property) => property?.published === true && !isDevelopment(property))
    .slice(0, 4);

  section.hidden = items.length === 0;

  grid.innerHTML = items.map((property) => {
    const available = isAvailableProperty(property);
    return `
      <button class="recent-card${available ? "" : " is-unavailable"}" type="button" data-recent-open="${property.id}">
        <img src="${property.cover || ""}" alt="" loading="lazy">
        <span><small>${property.location || "San Andreas"}</small><strong>${property.name}</strong><em>${property.status}</em></span>
      </button>
    `;
  }).join("");
}


/* ---------------------------- GALERIA ------------------------------- */

function setGalleryImage(index) {
  if (!currentGallery.length) return;
  currentGalleryIndex = (index + currentGallery.length) % currentGallery.length;
  const src = currentGallery[currentGalleryIndex];
  const mainImage = $("#modalMainImage");
  const lightboxImage = $("#lightboxImage");

  mainImage.src = src;
  mainImage.alt = `${currentProperty?.name || "Imóvel"} — imagem ${currentGalleryIndex + 1}`;
  lightboxImage.src = src;
  lightboxImage.alt = mainImage.alt;

  document.querySelectorAll(".modal-thumb").forEach((button, imageIndex) => {
    button.classList.toggle("active", imageIndex === currentGalleryIndex);
  });

  const counter = $("#galleryCounter");
  if (counter) {
    counter.textContent = `${String(currentGalleryIndex + 1).padStart(2, "0")} / ${String(currentGallery.length).padStart(2, "0")}`;
  }
}

function renderModalGallery(property) {
  currentGallery = property.gallery?.length ? property.gallery : property.cover ? [property.cover] : [];
  currentGalleryIndex = 0;

  $("#modalThumbs").innerHTML = currentGallery.map((src, index) => `
    <button class="modal-thumb ${index === 0 ? "active" : ""}" type="button" data-gallery-index="${index}" aria-label="Abrir imagem ${index + 1}">
      <img src="${src}" alt="${property.name} — imagem ${index + 1}">
    </button>
  `).join("");

  if (currentGallery.length) setGalleryImage(0);
}

function updatePropertyUrl(property) {
  const url = new URL(window.location.href);
  url.searchParams.set("classe", property.class);
  url.searchParams.set("imovel", property.id);
  history.replaceState(null, "", url);
}

function openModal(id, updateUrl = true) {
  const property = catalogData.find((item) => item.id === id);
  if (!property || property.published !== true || isDevelopment(property) || property.status !== "Disponível") return;
  currentProperty = property;

  $("#modalStatus").textContent = property.status;
  $("#modalStatus").className = `modal-status ${statusClass(property.status)}`;
  $("#propertyModal").classList.toggle("is-new-property", isNewProperty(property));
  $("#propertyModal").classList.toggle("is-showcase-property", isShowcase(property));
  $("#modalLocation").textContent = (property.location || "San Andreas").toUpperCase();
  $("#modalTitle").textContent = property.name;
  const modalCollection = $("#modalCollectionLabel");
  const modalBreadcrumbName = $("#modalBreadcrumbName");
  if (modalCollection) modalCollection.textContent = collectionLabels[property.class]?.name || "Residências";
  if (modalBreadcrumbName) modalBreadcrumbName.textContent = property.name;
  $("#modalLocationDetail").textContent = property.locationDetail || "";
  $("#modalDescription").textContent = property.description || "";
  $("#modalPrice").textContent = formatPrice(property.price);

  const copyButton = $("#copyReference");
  copyButton.disabled = property.status === "Indisponível";
  copyButton.textContent = property.status === "Indisponível" ? "Indisponível" : "Copiar para atendimento";

  renderModalGallery(property);
  configureTicketButton();
  renderFavorites();
  addRecent(property.id);

  $("#propertyModal").classList.add("open");
  $("#propertyModal").setAttribute("aria-hidden", "false");
  document.body.classList.add("modal-open");
  if (updateUrl) updatePropertyUrl(property);
}

function closeModal() {
  $("#propertyModal").classList.remove("open");
  $("#propertyModal").setAttribute("aria-hidden", "true");
  document.body.classList.remove("modal-open");

  if (currentProperty) {
    const url = new URL(window.location.href);
    url.searchParams.delete("imovel");
    history.replaceState(null, "", url);
  }
  currentProperty = null;
}

function openLightbox() {
  if (!currentGallery.length) return;
  $("#lightboxImage").src = currentGallery[currentGalleryIndex];
  $("#imageLightbox").classList.add("open");
  $("#imageLightbox").setAttribute("aria-hidden", "false");
}

function closeLightbox() {
  $("#imageLightbox").classList.remove("open");
  $("#imageLightbox").setAttribute("aria-hidden", "true");
}


async function copyText(text) {
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch (error) {
    console.warn("Clipboard API indisponível.", error);
  }

  try {
    const textarea = document.createElement("textarea");
    textarea.value = text;
    textarea.setAttribute("readonly", "");
    textarea.style.position = "fixed";
    textarea.style.opacity = "0";
    document.body.appendChild(textarea);
    textarea.select();
    const copied = document.execCommand("copy");
    textarea.remove();
    return copied;
  } catch (error) {
    console.warn("Fallback de cópia indisponível.", error);
    return false;
  }
}

async function copyCurrentReference() {
  if (!currentProperty || !isAvailableProperty(currentProperty)) return;
  const message = `Tenho interesse nesta propriedade: ${displayCode(currentProperty.id)} — ${currentProperty.name}.`;
  const copied = await copyText(message);
  showToast(copied ? "Referência copiada para o atendimento." : "Não foi possível copiar a referência.");
}

async function shareCurrentProperty() {
  if (!currentProperty) return;

  updatePropertyUrl(currentProperty);
  const url = window.location.href;
  const shareData = {
    title: `${currentProperty.name} — Dynasty 8`,
    text: `Veja ${currentProperty.name} no catálogo da Dynasty 8.`,
    url
  };

  if (navigator.share) {
    try {
      await navigator.share(shareData);
      return;
    } catch (error) {
      if (error?.name === "AbortError") return;
      console.warn("Compartilhamento nativo indisponível.", error);
    }
  }

  const copied = await copyText(url);
  showToast(copied ? "Link da propriedade copiado." : "Não foi possível copiar o link.");
}

/* ----------------------------- EVENTOS ------------------------------ */

applyPageLabels();
applySocialLinks();

["searchInput", "locationFilter", "sortFilter"].forEach((id) => {
  const element = document.getElementById(id);
  if (!element) return;
  const eventName = element.tagName === "INPUT" && element.type === "search" ? "input" : "change";
  element.addEventListener(eventName, applyFilters);
});

$("#resetFilters")?.addEventListener("click", () => {
  $("#searchInput").value = "";
  $("#locationFilter").value = "";
  $("#sortFilter").value = "showcase";
  applyFilters();
});

$("#favoritesBtn")?.addEventListener("click", openFavorites);
$("#copyFavorites")?.addEventListener("click", copyFavoritesSelection);
$("#clearFavorites")?.addEventListener("click", () => {
  favorites.clear();
  persistFavorites();
  renderFavorites();
  showToast("Lista de salvos limpa.");
});
$("#clearRecents")?.addEventListener("click", () => {
  recents = [];
  persistRecents();
  renderRecents();
});
$("#modalFavorite")?.addEventListener("click", () => currentProperty && toggleFavorite(currentProperty.id));
$("#copyReference")?.addEventListener("click", copyCurrentReference);
$("#shareProperty")?.addEventListener("click", shareCurrentProperty);

$("#staffTicketButton")?.addEventListener("click", (event) => {
  const ticketUrl = CONFIG.links?.ticket || CONFIG.links?.discord;
  if (!ticketUrl || !/^https?:\/\//i.test(ticketUrl)) {
    event.preventDefault();
    showToast("Configure o link do atendimento em config.js.");
  }
});

document.addEventListener("click", (event) => {
  const favorite = event.target.closest("[data-favorite]");
  if (favorite) {
    event.preventDefault();
    event.stopPropagation();
    toggleFavorite(favorite.dataset.favorite);
    return;
  }

  const card = event.target.closest("[data-property-card]");
  if (card) {
    if (card.classList.contains("is-unavailable-property")) {
      showToast("Este ambiente não está disponível no momento.");
      return;
    }
    openModal(card.dataset.propertyCard);
    return;
  }

  const favoriteOpen = event.target.closest("[data-favorite-open]");
  if (favoriteOpen) {
    const property = catalogData.find((item) => item.id === favoriteOpen.dataset.favoriteOpen);
    if (!property) return;
    if (!isAvailableProperty(property)) {
      showToast("Este ambiente não está disponível no momento.");
      return;
    }
    closeFavorites();
    if (property.class === currentClass) openModal(property.id);
    else window.location.href = propertyUrl(property);
    return;
  }

  const recentOpen = event.target.closest("[data-recent-open]");
  if (recentOpen) {
    const property = catalogData.find((item) => item.id === recentOpen.dataset.recentOpen);
    if (!property) return;
    if (!isAvailableProperty(property)) {
      showToast("Este ambiente não está disponível no momento.");
      return;
    }
    if (property.class === currentClass) openModal(property.id);
    else window.location.href = propertyUrl(property);
    return;
  }

  if (event.target.closest("[data-close-modal]")) closeModal();
  if (event.target.closest("[data-close-favorites]")) closeFavorites();
  if (event.target.closest("[data-close-lightbox]")) closeLightbox();

  const modalOpen = $("#propertyModal")?.classList.contains("open");
  const lightboxOpen = $("#imageLightbox")?.classList.contains("open");

  const thumb = event.target.closest("[data-gallery-index]");
  if (thumb && modalOpen) setGalleryImage(Number(thumb.dataset.galleryIndex));
  if (event.target.closest("[data-gallery-prev]") && (modalOpen || lightboxOpen)) setGalleryImage(currentGalleryIndex - 1);
  if (event.target.closest("[data-gallery-next]") && (modalOpen || lightboxOpen)) setGalleryImage(currentGalleryIndex + 1);
  if (event.target.closest("[data-gallery-expand]") && modalOpen) openLightbox();
});

document.addEventListener("keydown", (event) => {
  const focusedCard = event.target.closest?.("[data-property-card]");
  if (focusedCard && (event.key === "Enter" || event.key === " ")) {
    event.preventDefault();
    if (focusedCard.classList.contains("is-unavailable-property")) {
      showToast("Este ambiente não está disponível no momento.");
      return;
    }
    openModal(focusedCard.dataset.propertyCard);
    return;
  }

  if (event.key === "Escape") {
    if ($("#imageLightbox")?.classList.contains("open")) closeLightbox();
    else if ($("#favoritesDrawer")?.classList.contains("open")) closeFavorites();
    else closeModal();
  }

  if ($("#propertyModal")?.classList.contains("open")) {
    if (event.key === "ArrowLeft") setGalleryImage(currentGalleryIndex - 1);
    if (event.key === "ArrowRight") setGalleryImage(currentGalleryIndex + 1);
  }
});

/* --------------------------- CARREGAMENTO --------------------------- */

Promise.all([
  fetch("imoveis.json", { cache: "no-store" }).then((response) => {
    if (!response.ok) throw new Error("imoveis.json indisponível");
    return response.json();
  }),
  fetch("controle.json", { cache: "no-store" }).then((response) => {
    if (!response.ok) throw new Error("controle.json indisponível");
    return response.json();
  })
])
  .then(([properties, controls]) => {
    catalogData = mergeProperties(properties, controls);
    allProperties = catalogData.filter((property) => property.published === true && property.class === currentClass && !isDevelopment(property));

    populateLocationFilter();
    renderFavorites();
    renderRecents();
    applyFilters();

    const requested = new URLSearchParams(window.location.search).get("imovel");
    const property = findProperty(requested);

    if (property && property.published === true && !isDevelopment(property)) {
      if (property.class !== currentClass) {
        window.location.replace(propertyUrl(property));
        return;
      }

      if (isAvailableProperty(property)) {
        openModal(property.id, false);
      } else {
        requestAnimationFrame(() => {
          const card = document.querySelector(`[data-property-card="${property.id}"]`);
          if (!card) return;
          card.scrollIntoView({ behavior: "smooth", block: "center" });
          card.classList.add("requested-unavailable");
          setTimeout(() => card.classList.remove("requested-unavailable"), 2200);
          showToast("Este ambiente não está disponível no momento.");
        });
      }
    }
  })
  .catch((error) => {
    console.error("Não foi possível carregar o catálogo:", error);
    $("#propertyGrid").classList.remove("is-loading");
    $("#propertyGrid").innerHTML = "<p style='padding:30px'>Não foi possível carregar o catálogo. Verifique imoveis.json e controle.json.</p>";
  });
