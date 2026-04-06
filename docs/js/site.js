// Carga de datos desde JSON y lógica del hábitat (añadir/quitar, stats)
async function tryFetch(url) {
  try {
    const res = await fetch(url, { cache: 'no-cache' });
    if (!res.ok) throw new Error(`HTTP ${res.status} (${url})`);
    return await res.json();
  } catch (err) {
    return null;
  }
}

async function loadSpecies() {
  const candidates = [
    'data/pokemons.json',    // dentro de docs/
    '../data/pokemons.json', // posible ubicación fuera de docs
    '/data/pokemons.json'    // ruta absoluta desde la raíz del servidor
  ];

  for (const url of candidates) {
    const data = await tryFetch(url);
    if (data) {
      console.log('Cargado JSON desde:', url);
      return data;
    }
  }

  console.warn('No se encontró pokemons.json en rutas esperadas, usando fallback interno.');
  return [
    { name: 'Pikachu', image: 'https://via.placeholder.com/160?text=Pikachu', icon: 'https://via.placeholder.com/28?text=P', originalAreas: ['bosque'], preferredFood: 'Bayas', specialities: ['Descarga'], environment: 'Bosque', preferences: ['rapido'] },
    { name: 'Bulbasaur', image: 'https://via.placeholder.com/160?text=Bulbasaur', icon: 'https://via.placeholder.com/28?text=B', originalAreas: ['pradera'], preferredFood: 'Frutas', specialities: ['Fotosíntesis'], environment: 'Plantas', preferences: ['fuerte'] }
  ];
}

function normalizePath(s) {
  if (!s) return s;
  if (s.startsWith('../data/')) return s.replace('../data/', 'data/');
  if (s.startsWith('/data/')) return s.replace('/data/', 'data/');
  return s;
}

/* --------------------------
   Lógica del hábitat y UI
   -------------------------- */
(async () => {
  const species = await loadSpecies();

  // Normalizar rutas de imagen/icon en memoria
  species.forEach(p => {
    p._image = normalizePath(p.image);
    p._icon = normalizePath(p.icon);
  });

  // Estado del habitat (lista de species objetos)
  const habitat = [];

  // DOM references
  const grid = document.getElementById('pokemon-grid');
  const pins = Array.from(document.querySelectorAll('.pokemon-pin'));
  const habitatStats = document.querySelector('.habitat-stats');

  // Inicio: ocultar pins (habitat vacío)
  pins.forEach(pin => pin.style.display = 'none');

  // Render del grid (excluye especies que estén en el hábitat)
  function renderGrid(items) {
    grid.innerHTML = '';
    const inHabitatNames = new Set(habitat.map(s => s.name));
    items.forEach(p => {
      if (inHabitatNames.has(p.name)) return; // no mostrar si ya está en el hábitat
      const card = document.createElement('div');
      card.className = 'poke-card';
      card.tabIndex = 0;

      const img = document.createElement('img');
      img.src = p._image || 'https://via.placeholder.com/160?text=No+Img';
      img.alt = p.name;
      img.addEventListener('error', () => { img.src = 'https://via.placeholder.com/160?text=No+Img'; });

      const nameDiv = document.createElement('div');
      nameDiv.className = 'poke-name';
      nameDiv.textContent = p.name;

      const primaryArea = (p.originalAreas && p.originalAreas[0]) || '';
      const primaryPref = (p.preferences && p.preferences[0]) || '';
      const meta = document.createElement('div');
      meta.className = 'poke-meta';
      meta.textContent = `${primaryArea} • ${primaryPref}`;

      card.append(img, nameDiv, meta);

      // Click en la card: intentar añadir al hábitat
      card.addEventListener('click', () => {
        if (habitat.find(h => h.name === p.name)) return;
        if (habitat.length >= 4) {
          console.log('Máximo 4 pokémon en el hábitat');
          return;
        }
        addToHabitat(p);
      });

      grid.appendChild(card);
    });
  }

  // Añadir especie al hábitat: asignar al primer pin vacío
  function addToHabitat(specie) {
    if (habitat.length >= 4) return;
    const emptyIndex = pins.findIndex(pin => pin.style.display === 'none');
    if (emptyIndex === -1) return;
    const pin = pins[emptyIndex];
    const imgEl = pin.querySelector('img');
    const tooltip = pin.querySelector('.pokemon-tooltip');

    // Asignar datos visuales
    imgEl.src = specie._image || 'https://via.placeholder.com/96?text=No';
    imgEl.alt = specie.name;
    pin.setAttribute('data-name', specie.name);
    pin.setAttribute('data-id', specie.name);

    // Tooltip con la info requerida
    const environment = specie.environment || '';
    const preferences = (specie.preferences || []).join(', ');
    const food = specie.preferredFood || '';
    const specialities = (specie.specialities || []).join(', ');
    tooltip.innerHTML = `<strong>${specie.name}</strong><br>
      <small>Entorno: ${environment}</small><br>
      <small>Preferencias: ${preferences}</small><br>
      <small>Comida: ${food}</small><br>
      <small>Especialidades: ${specialities}</small>`;

    // Mostrar pin
    pin.style.display = '';
    // Click en pin elimina al pokemon
    const onClick = () => removeFromHabitat(specie.name);
    // remover handler previo si existe
    pin.replaceWith(pin.cloneNode(true)); // quick clean: replace element to remove old handlers
    const newPin = Array.from(document.querySelectorAll('.pokemon-pin'))[emptyIndex];
    // restore img and tooltip refs after clone
    const newImg = newPin.querySelector('img');
    const newTooltip = newPin.querySelector('.pokemon-tooltip');
    newImg.src = specie._image || 'https://via.placeholder.com/96?text=No';
    newImg.alt = specie.name;
    newTooltip.innerHTML = tooltip.innerHTML;
    newPin.setAttribute('data-name', specie.name);
    newPin.setAttribute('data-id', specie.name);
    newPin.style.display = '';
    newPin.addEventListener('click', onClick);
    newPin.addEventListener('keydown', (ev) => { if (ev.key === 'Enter' || ev.key === ' ') { ev.preventDefault(); onClick(); } });

    // update pins array (DOM changed)
    const pinNodes = Array.from(document.querySelectorAll('.pokemon-pin'));
    for (let i = 0; i < pins.length; i++) pins[i] = pinNodes[i];

    habitat.push(specie);
    updateHabitatStats();
    renderGrid(species);
  }

  // Quitar del hábitat por nombre
  function removeFromHabitat(name) {
    const idx = habitat.findIndex(h => h.name === name);
    if (idx === -1) return;
    habitat.splice(idx, 1);
    // ocultar primer pin cuyo data-name == name
    const pinToHide = pins.find(p => p.getAttribute('data-name') === name);
    if (pinToHide) {
      const imgEl = pinToHide.querySelector('img');
      const tooltip = pinToHide.querySelector('.pokemon-tooltip');
      imgEl.src = 'https://via.placeholder.com/96?text=+'; // placeholder
      imgEl.alt = '';
      tooltip.innerHTML = '';
      pinToHide.removeAttribute('data-name');
      pinToHide.removeAttribute('data-id');
      pinToHide.style.display = 'none';
      // remove click handlers by cloning
      pinToHide.replaceWith(pinToHide.cloneNode(true));
      // refresh pins array
      const pinNodes = Array.from(document.querySelectorAll('.pokemon-pin'));
      for (let i = 0; i < pins.length; i++) pins[i] = pinNodes[i];
    }
    updateHabitatStats();
    renderGrid(species);
  }

  // Construir un stat-badge DOM node {name, icons[]}
  function buildBadge(label, speciesList) {
    const badge = document.createElement('div');
    badge.className = 'stat-badge';
    const pokemonsDiv = document.createElement('div');
    pokemonsDiv.className = 'stat-pokemons';
    // imágenes a la izquierda (CSS ya organiza visual)
    speciesList.forEach(s => {
      const im = document.createElement('img');
      im.src = s._icon || 'https://via.placeholder.com/28?text=?';
      im.alt = s.name;
      im.addEventListener('error', () => { im.src = 'https://via.placeholder.com/28?text=?'; });
      pokemonsDiv.appendChild(im);
    });
    const nameSpan = document.createElement('span');
    nameSpan.className = 'stat-name';
    nameSpan.textContent = label;
    // order: name after images per CSS ordering
    badge.appendChild(pokemonsDiv);
    badge.appendChild(nameSpan);
    return badge;
  }

  // Actualizar habitat-stats según habitat[]
  function updateHabitatStats() {
    // limpiar todas las listas dentro de habitat-stats
    const categories = Array.from(habitatStats.querySelectorAll('.stats-category'));
    // map by h3 text (normalizado)
    const catMap = {};
    categories.forEach(cat => {
      const key = (cat.querySelector('h3') || {}).textContent || '';
      catMap[key.trim().toLowerCase()] = cat.querySelector('.stat-list');
      if (!catMap[key.trim().toLowerCase()]) {
        // si no tiene .stat-list, crear uno
        let list = document.createElement('div');
        list.className = 'stat-list';
        cat.appendChild(list);
        catMap[key.trim().toLowerCase()] = list;
      }
    });

    // vaciar listas
    Object.values(catMap).forEach(list => list.innerHTML = '');

    if (habitat.length === 0) return;

    // ---- Comunes: preferencias balanceadas ----
    // preferencias de cada pokemon -> array
    const prefsPer = habitat.map(h => h.preferences || []);
    // map pref -> indices of pokemon
    const prefMap = {};
    prefsPer.forEach((prefs, i) => prefs.forEach(pref => {
      if (!prefMap[pref]) prefMap[pref] = new Set();
      prefMap[pref].add(i);
    }));

    const allPrefs = Object.keys(prefMap);

    // coverage inicial: 0 por pokemon
    const coverage = new Array(habitat.length).fill(0);
    const selectedCommons = [];
    const maxCommons = 4;

    const availablePrefs = new Set(allPrefs);
    while (selectedCommons.length < maxCommons && availablePrefs.size > 0) {
      // encontrar pref que mejor cubre los pokemons con menor coverage
      let bestPref = null;
      let bestScore = -1;
      let bestTotal = 0;
      const minCov = Math.min(...coverage);
      availablePrefs.forEach(pref => {
        const indices = Array.from(prefMap[pref] || []);
        // score = cantidad de indices que tienen coverage == minCov (priorizar balance)
        const score = indices.filter(i => coverage[i] === minCov).length;
        const total = indices.length;
        if (score > bestScore || (score === bestScore && total > bestTotal)) {
          bestScore = score;
          bestPref = pref;
          bestTotal = total;
        }
      });
      if (!bestPref) break;
      selectedCommons.push(bestPref);
      // actualizar coverage
      (prefMap[bestPref] || []).forEach(i => coverage[i]++);
      availablePrefs.delete(bestPref);
    }

    // Render comunes
    const comunesList = catMap['comunes'];
    if (comunesList && selectedCommons.length > 0) {
      selectedCommons.forEach(pref => {
        const specieIndices = Array.from(prefMap[pref] || []).map(i => habitat[i]);
        const badge = buildBadge(pref, specieIndices);
        comunesList.appendChild(badge);
      });
    }

    // ---- Unicas: preferencias que solo un pokemon tenga ----
    const uniquePrefs = [];
    Object.keys(prefMap).forEach(pref => {
      const indices = Array.from(prefMap[pref] || []);
      if (indices.length === 1) uniquePrefs.push({ pref, owner: indices[0] });
    });
    // priorizar aquellos cuyo owner tenga menor coverage
    uniquePrefs.sort((a, b) => coverage[a.owner] - coverage[b.owner]);
    const maxUnicas = 4;
    const unicasList = catMap['únicas'] || catMap['unicas'];
    if (unicasList) {
      uniquePrefs.slice(0, maxUnicas).forEach(u => {
        const ownerSpecie = habitat[u.owner];
        const badge = buildBadge(u.pref, [ownerSpecie]);
        unicasList.appendChild(badge);
      });
    }

    // ---- Comida: agrupar por preferredFood ----
    const comidaMap = {};
    habitat.forEach(h => {
      const k = h.preferredFood || '—';
      if (!comidaMap[k]) comidaMap[k] = [];
      comidaMap[k].push(h);
    });
    const comidaList = catMap['comida'];
    if (comidaList) {
      Object.keys(comidaMap).forEach(k => {
        const badge = buildBadge(k, comidaMap[k]);
        comidaList.appendChild(badge);
      });
    }

    // ---- Entorno: agrupar por environment ----
    const entornoMap = {};
    habitat.forEach(h => {
      const k = h.environment || '—';
      if (!entornoMap[k]) entornoMap[k] = [];
      entornoMap[k].push(h);
    });
    const entornoList = catMap['entorno'];
    if (entornoList) {
      Object.keys(entornoMap).forEach(k => {
        const badge = buildBadge(k, entornoMap[k]);
        entornoList.appendChild(badge);
      });
    }

    // ---- Especialidades: agrupar por each speciality value ----
    const specMap = {};
    habitat.forEach(h => {
      (h.specialities || []).forEach(special => {
        const k = special || '—';
        if (!specMap[k]) specMap[k] = [];
        specMap[k].push(h);
      });
    });
    const specList = catMap['especialidades'];
    if (specList) {
      Object.keys(specMap).forEach(k => {
        const badge = buildBadge(k, specMap[k]);
        specList.appendChild(badge);
      });
    }
  }

  // Inicial render
  renderGrid(species);
  updateHabitatStats();

})();