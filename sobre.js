const CONFIG = window.DYNASTY8_CONFIG || window.VERTIGEM_CONFIG || { links: {} };

function activateTab(name) {
  document.querySelectorAll("[data-about-tab]").forEach((button) => {
    const active = button.dataset.aboutTab === name;
    button.classList.toggle("active", active);
    button.setAttribute("aria-selected", String(active));
  });

  document.querySelectorAll("[data-about-panel]").forEach((panel) => {
    panel.classList.toggle("active", panel.dataset.aboutPanel === name);
  });

  if (history.replaceState) history.replaceState(null, "", `#${name}`);
}

document.addEventListener("click", (event) => {
  const tab = event.target.closest("[data-about-tab]");
  if (tab) activateTab(tab.dataset.aboutTab);
});

const requestedTab = location.hash.replace("#", "");
if (["imobiliaria", "casas-cidade", "experiencia-rp", "vertigem"].includes(requestedTab)) {
  activateTab(requestedTab);
}

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
