/* ================================================================
   DYNASTY 8 — script.js (HOME)
   ================================================================ */

const CONFIG = window.DYNASTY8_CONFIG || window.VERTIGEM_CONFIG || { links: {}, collections: {} };

function slugify(value) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function mergeProperties(properties, controls) {
  return properties.map((property) => ({
    ...property,
    ...(controls?.[property.id] || {})
  }));
}

function isPublishedResidential(property) {
  return property?.published === true && property?.development !== true;
}

function isAvailableProperty(property) {
  return property?.status === "Disponível";
}

function isShowcase(property) {
  return property?.showcase === true;
}

function isNewProperty(property) {
  return property?.new === true;
}

function applyCollectionContent() {
  ["a", "b", "c"].forEach((key) => {
    const collection = CONFIG.collections?.[key];
    if (!collection) return;

    document.querySelector(`[data-collection-index="${key}"]`)?.replaceChildren(collection.index);
    document.querySelector(`[data-collection-eyebrow="${key}"]`)?.replaceChildren(collection.eyebrow);
    document.querySelector(`[data-collection-name="${key}"]`)?.replaceChildren(collection.name);
    document.querySelector(`[data-collection-intro="${key}"]`)?.replaceChildren(collection.intro);

    const card = document.querySelector(`[data-collection-card="${key}"]`);
    if (card && collection.image) {
      card.style.setProperty("--collection-image", `url("${collection.image}")`);
    }
  });
}

function applySocialLinks() {
  document.querySelectorAll("[data-social-link]").forEach((link) => {
    const url = CONFIG.links?.[link.dataset.socialLink];
    if (url && /^https?:\/\//i.test(url)) {
      link.href = url;
      link.classList.remove("is-disabled");
      return;
    }
    link.href = "#";
    link.classList.add("is-disabled");
    link.setAttribute("aria-disabled", "true");
    link.addEventListener("click", (event) => event.preventDefault());
  });
}

function propertyUrl(property) {
  return `catalogo.html?classe=${property.class}&imovel=${encodeURIComponent(property.id)}`;
}

function renderFeatured(properties) {
  const grid = document.getElementById("homeFeaturedGrid");
  if (!grid) return;

  const selected = properties
    .filter(isPublishedResidential)
    .filter(isAvailableProperty)
    .filter(isShowcase)
    .slice(0, 3);

  if (!selected.length) {
    grid.innerHTML = `
      <div class="home-featured-empty">
        <span>EM PREPARAÇÃO</span>
        <p>Os próximos imóveis em destaque aparecerão aqui.</p>
      </div>
    `;
    return;
  }

  grid.innerHTML = selected.map((property, index) => {
    const visualVariant = ["feature-variant-a", "feature-variant-b", "feature-variant-c"][index % 3];
    const editorialIndex = String(index + 1).padStart(2, "0");

    return `
      <a class="home-featured-card ${visualVariant}" href="${propertyUrl(property)}" aria-label="Abrir ${property.name}">
        <div class="home-featured-image" style="background-image:url('${property.cover || ""}')"></div>
        <div class="home-featured-overlay"></div>
        <span class="feature-editorial-index" aria-hidden="true">${editorialIndex}</span>
        <span class="feature-register-mark" aria-hidden="true"></span>
        <div class="home-featured-top">
          <div class="home-featured-badges">
            ${isNewProperty(property) ? '<span class="home-pill is-new">Novidade</span>' : ''}
            ${isShowcase(property) ? '<span class="home-pill is-showcase">Destaque</span>' : ''}
          </div>
          <span>${property.status || "Residência"}</span>
        </div>
        <div class="home-featured-copy">
          <p>${property.location || "San Andreas"}</p>
          <h3>${property.name || "Residência"}</h3>
          <span class="interactive-arrow">Ver propriedade <b>↗</b></span>
        </div>
      </a>
    `;
  }).join("");
}

function updateMetrics(properties) {
  const published = properties.filter(isPublishedResidential);
  const available = published.filter(isAvailableProperty);
  const showcase = available.filter(isShowcase).length;
  const novelties = available.filter(isNewProperty).length;
  const development = properties.filter((property) => property.development === true).length;

  document.getElementById("metricTotal")?.replaceChildren(String(published.length));
  document.getElementById("metricShowcase")?.replaceChildren(String(showcase).padStart(2, "0"));
  document.getElementById("metricNew")?.replaceChildren(String(novelties).padStart(2, "0"));
  document.getElementById("developmentInlineCount")?.replaceChildren(String(development).padStart(2, "0"));
  document.getElementById("showcaseInlineCount")?.replaceChildren(String(showcase).padStart(2, "0"));
}

applyCollectionContent();
applySocialLinks();

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
    const merged = mergeProperties(properties, controls);
    updateMetrics(merged);
    renderFeatured(merged);
  })
  .catch((error) => {
    console.error("Não foi possível carregar a Home:", error);
    const grid = document.getElementById("homeFeaturedGrid");
    if (grid) {
      grid.innerHTML = `
        <div class="home-featured-empty">
          <span>CATÁLOGO INDISPONÍVEL</span>
          <p>Ative o Go Live e confirme se imoveis.json e controle.json estão na pasta principal.</p>
        </div>
      `;
    }
  });
