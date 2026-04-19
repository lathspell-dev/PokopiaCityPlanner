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
        'data/pokemons.json',        // dentro de docs/
        '../data/pokemons.json', // posible ubicación fuera de docs
        '/data/pokemons.json'        // ruta absoluta desde la raíz del servidor
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
    //    { name: 'Pikachu', image: 'https://via.placeholder.com/160?text=Pikachu', icon: 'https://via.placeholder.com/28?text=P', originalAreas: ['bosque'], preferredFood: 'Bayas', specialities: ['Descarga'], environment: 'Bosque', preferences: ['rapido'] },
    //    { name: 'Bulbasaur', image: 'https://via.placeholder.com/160?text=Bulbasaur', icon: 'https://via.placeholder.com/28?text=B', originalAreas: ['pradera'], preferredFood: 'Frutas', specialities: ['Fotosíntesis'], environment: 'Plantas', preferences: ['fuerte'] }
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
    const specialitySet = new Set();

    // Normalizar rutas de imagen/icon en memoria
    species.forEach(p => {
        p._image = normalizePath(p.image);
        p._icon = normalizePath(p.icon);
        // Normalizar originalAreas a array para trabajar consistentemente
        if (!p.originalAreas) p._areas = [];
        else if (Array.isArray(p.originalAreas)) p._areas = p.originalAreas.map(a => String(a).trim());
        else p._areas = [String(p.originalAreas).trim()];
        // trim name to avoid mismatches por espacios
        p._name = String(p.name || '').trim();
        p._displayName = String(p.displayName || '').trim();
        for (const specality of (p.specialities || [])) {
            console.log(p._name, ": ", specality);
            if (specality.startsWith("Producir")) {
                specialitySet.add("Producir");
            }
            else {
                specialitySet.add(specality);
            }
        }
    });

    // Estado del habitat (lista de species objetos)
    const habitat = [];

    // DOM references
    const grid = document.getElementById('pokemon-grid');
    const pins = Array.from(document.querySelectorAll('.pokemon-pin'));
    const habitatStats = document.querySelector('.habitat-stats');

    // filtros DOM
    const inputName = document.getElementById('filter-name');
    const selectArea = document.getElementById('filter-area');
    for (const area of Array.from(specialitySet)) {

    }
    const selectSpeciality = document.getElementById('filter-speciality');
    for (const speciality of Array.from(specialitySet).sort()) {
        const option = document.createElement("option");
        option.value = speciality;
        option.textContent = speciality;
        selectSpeciality.appendChild(option);
    }
    //const selectTrait = null; // deshabilitado por ahora, no hay traits en el JSON
    const excludeEspecialDiv = document.getElementById('exclude-especial-div');
    const excludeEspecialCheckbox = document.getElementById("exclude-especial");
    const btnClear = document.getElementById('clear-filters');

    // Inicio: ocultar pins (habitat vacío)
    pins.forEach(pin => pin.style.display = 'none');

    // Util: comprobar si specie tiene area (case-insensitive)
    function hasArea(specie, area) {
        if (!area) return true;
        const needle = String(area).trim().toLowerCase();
        for (const a of (specie._areas || [])) {
            if (String(a).trim().toLowerCase() === needle) return true;
        }
        return false;
    }

    // Aplicar filtros y devolver lista
    function getFilteredSpecies() {
        const nameFilter = (inputName && inputName.value || '').trim().toLowerCase();
        const areaFilter = (selectArea && selectArea.value || '').trim(); // exact values like "Estepa Esteril"
        const specialityFilter = (selectSpeciality && selectSpeciality.value || '').trim();
        const excludeEspecial = excludeEspecialCheckbox && excludeEspecialCheckbox.checked;

        return species.filter(p => {
            // Excluir species ya en habitat (comparar por _name normalizado)
            const inHabitat = habitat.some(h => (h._name || '').toLowerCase() === (p._name || '').toLowerCase());
            if (inHabitat) return false;

            // Nombre
            if (nameFilter) {
                    let found = false;
                    for (const name of (p.searchNames || [])) {
                            if (String(name || '').toLowerCase().includes(nameFilter)) {
                                    found = true;
                                    break;
                            }
                    }
                    if (!found) return false;
                    //if (!String(p._name || '').toLowerCase().includes(nameFilter)) return false;
            }

            // Área: if areaFilter set, include if specie has the area OR has "Especial" in its areas
            if (areaFilter) {
                if (!excludeEspecial) {
                    const isEspecial = (p._areas || []).some(a => String(a).trim().toLowerCase() === 'especial');
                    if (isEspecial) return true;
                }
                if (!hasArea(p, areaFilter)) return false;
            }

            if (specialityFilter) {
                const specialities = (p.specialities || []).map(x => String(x).toLowerCase());
                if (specialityFilter === "Producir") {
                    return specialities.some(s => s.startsWith("producir"));
                }
                if (!specialities.includes(specialityFilter.toLowerCase())) return false;
            }
            return true;
        });
    }

    // Render del grid (excluye especies que estén en el hábitat)
    function renderGrid(items) {
        grid.innerHTML = '';
        // items assumed already filtered in getFilteredSpecies
        items.forEach(p => {
            const card = document.createElement('div');
            card.className = 'poke-card';
            card.tabIndex = 0;

            // marcar si es "Especial" para destacar
            const areaFilter = (selectArea && selectArea.value || '').trim();
            if (areaFilter && !hasArea(p, areaFilter)) {
                card.classList.add('special-area');
            }
            else {
                card.classList.remove('special-area');
            }
            const img = document.createElement('img');
            img.src = p._image;
            img.alt = p._name || p.name;

            const nameDiv = document.createElement('div');
            nameDiv.className = 'poke-name';
            nameDiv.textContent = p._displayName || p.displayName;

            // Only image and name per request (no meta)
            card.append(img, nameDiv);

            // Click en la card: intentar añadir al hábitat
            card.addEventListener('click', () => {
                // compare normalized trimmed names to avoid invisible mismatch
                const already = habitat.find(h => (String(h._name || '').trim().toLowerCase()) === (String(p._name || '').trim().toLowerCase()));
                if (already) return;
                if (habitat.length >= 4) {
                    console.log('Máximo 4 pokémon en el hábitat');
                    return;
                }
                addToHabitat(p);
            });

            // keyboard support
            card.addEventListener('keydown', (ev) => {
                if (ev.key === 'Enter' || ev.key === ' ') {
                    ev.preventDefault();
                    card.click();
                }
            });

            grid.appendChild(card);
        });
    }

    // Añadir especie al hábitat: asignar al primer pin vacío
    function addToHabitat(specie) {
        if (habitat.length >= 4) return;
        const emptyIndex = pins.findIndex(pin => pin.style.display === 'none' || pin.getAttribute('data-name') === null);
        if (emptyIndex === -1) return;
        const pin = pins[emptyIndex];
        const imgEl = pin.querySelector('img');
        const tooltip = pin.querySelector('.pokemon-tooltip');

        const displayName = String(specie._name || specie.name || '').trim();

        // Asignar datos visuales
        imgEl.src = specie._image || '';
        imgEl.alt = displayName;
        pin.setAttribute('data-name', displayName);
        pin.setAttribute('data-id', displayName);

        // Tooltip simplified (kept, but doesn't affect searchbar)
        const environment = specie.environment || '';
        const preferences = (specie.preferences || []).join(', ');
        const food = specie.preferredFood || '';
        const specialities = (specie.specialities || []).join(', ');
        tooltip.innerHTML = `<strong>${displayName}</strong><br>
            <small>Entorno: ${environment}</small><br>
            <small>Preferencias: ${preferences}</small><br>
            <small>Comida: ${food}</small><br>
            <small>Especialidades: ${specialities}</small>`;

        // Mostrar pin
        pin.style.display = '';
        // Click en pin elimina al pokemon
        const onClick = () => removeFromHabitat(displayName);
        // remover handler previo si existe
        pin.replaceWith(pin.cloneNode(true)); // quick clean: replace element to remove old handlers
        const newPin = Array.from(document.querySelectorAll('.pokemon-pin'))[emptyIndex];
        // restore img and tooltip refs after clone
        const newImg = newPin.querySelector('img');
        const newTooltip = newPin.querySelector('.pokemon-tooltip');
        newImg.src = specie._image || '';
        newImg.alt = displayName;
        newTooltip.innerHTML = tooltip.innerHTML;
        newPin.setAttribute('data-name', displayName);
        newPin.setAttribute('data-id', displayName);
        newPin.style.display = '';
        newPin.addEventListener('click', onClick);
        newPin.addEventListener('keydown', (ev) => { if (ev.key === 'Enter' || ev.key === ' ') { ev.preventDefault(); onClick(); } });

        // update pins array (DOM changed)
        const pinNodes = Array.from(document.querySelectorAll('.pokemon-pin'));
        for (let i = 0; i < pins.length; i++) pins[i] = pinNodes[i];

        // push the original species object (keeping _name/_areas normalized)
        habitat.push(specie);
        updateHabitatStats();
        renderGrid(getFilteredSpecies());
    }

    // Quitar del hábitat por nombre
    function removeFromHabitat(name) {
        const normalized = String(name || '').trim().toLowerCase();
        const idx = habitat.findIndex(h => String(h._name || h.name || '').trim().toLowerCase() === normalized);
        if (idx === -1) return;
        const removed = habitat.splice(idx, 1)[0];
        // ocultar primer pin cuyo data-name == name
        const pinToHide = pins.find(p => (p.getAttribute('data-name') || '').trim().toLowerCase() === normalized);
        if (pinToHide) {
            const imgEl = pinToHide.querySelector('img');
            const tooltip = pinToHide.querySelector('.pokemon-tooltip');
            //imgEl.src = 'https://via.placeholder.com/96?text=+'; // placeholder
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
        renderGrid(getFilteredSpecies());
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
            im.src = s._icon || '';
            im.alt = s._name || s.name;
            //im.addEventListener('error', () => { im.src = 'https://via.placeholder.com/28?text=?'; });
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
        const maxUnicas = 4;
        const chosenPrefs = [];
        const unicasList = catMap['únicas'] || catMap['unicas'];
        if (unicasList) {
        for (let i = 0; i < maxUnicas; i++) {
                const uniquePrefs = [];
                Object.keys(prefMap).forEach(pref => {
                        if (selectedCommons.includes(pref) || chosenPrefs.includes(pref)) return; // skip already chosen commons
                        const indices = Array.from(prefMap[pref] || []);
                        if (indices.length === 1) uniquePrefs.push({ pref, owner: indices[0] });
                });
                if (uniquePrefs.length === 0) break;
                uniquePrefs.sort((a, b) => coverage[a.owner] - coverage[b.owner]);
                const chosenPref = uniquePrefs[0];
                const ownerSpecie = habitat[chosenPref.owner];
                const badge = buildBadge(chosenPref.pref, [ownerSpecie]);
                unicasList.appendChild(badge);
                coverage[chosenPref.owner]++;
                chosenPrefs.push(chosenPref.pref);// marcar como cubierto para balancear siguientes
            }
        }
        //const uniquePrefs = [];
        //Object.keys(prefMap).forEach(pref => {
        //    const indices = Array.from(prefMap[pref] || []);
        //    if (indices.length === 1) uniquePrefs.push({ pref, owner: indices[0] });
        //});
        //// priorizar aquellos cuyo owner tenga menor coverage
        //uniquePrefs.sort((a, b) => coverage[a.owner] - coverage[b.owner]);
        
        //const unicasList = catMap['únicas'] || catMap['unicas'];
        //if (unicasList) {
        //    uniquePrefs.slice(0, maxUnicas).forEach(u => {
        //        const ownerSpecie = habitat[u.owner];
        //        const badge = buildBadge(u.pref, [ownerSpecie]);
        //        unicasList.appendChild(badge);
        //    });
        //}

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

    // Hook filtros: actualizar vista al cambiar filtros
    function refreshView() {
        const filtered = getFilteredSpecies();
        renderGrid(filtered);
    }

    function inputNameChanged() {
        refreshView();
    }

    function selectAreaChanged() {
        if (selectArea.value === "") {
            excludeEspecialDiv.style.display = 'none';
        } else {
            excludeEspecialDiv.style.display = 'block';
        }
        refreshView();
    }

    function selectSpecialityChanged() {
        refreshView();
    }

    function excludeNeutralsChanged() {
        refreshView();
    }

    if (inputName) inputName.addEventListener('input', inputNameChanged);
    if (excludeEspecialCheckbox) excludeEspecialCheckbox.addEventListener('change', excludeNeutralsChanged);
    if (selectArea) {
        selectArea.addEventListener('change', selectAreaChanged);
        if (excludeEspecialDiv) excludeEspecialDiv.style.display = selectArea.value === "" ? 'none' : 'block';
    }
    if (selectSpeciality) selectSpeciality.addEventListener('change', selectSpecialityChanged);
    if (btnClear) btnClear.addEventListener('click', () => {
        if (inputName) inputName.value = '';
        if (selectArea) selectArea.value = '';
        if (selectTrait) selectTrait.value = '';
        if (selectSpeciality) selectSpeciality.value = '';
        if (excludeEspecialCheckbox) excludeEspecialCheckbox.checked = false;
        refreshView();
    });

    // Inicial render
    refreshView();
    updateHabitatStats();

})();