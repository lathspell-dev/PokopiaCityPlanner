// Mock data (visual only)
const mockPokemons = Array.from({ length: 16 }).map((_, i) => ({
    id: i + 1,
    name: ['Pidgey', 'Rattata', 'Zubat', 'Eevee', 'Pikachu', 'Bulbasaur', 'Charmander', 'Squirtle'][i % 8] + ' ' + (i + 1),
    area: ['bosque', 'ciudad', 'montana'][i % 3],
    traits: ['rapido', 'fuerte', 'volador'][i % 3],
    img: `https://via.placeholder.com/160?text=P${i + 1}`
}));

// Render grid
const grid = document.getElementById('pokemon-grid');
function renderGrid(items) {
    grid.innerHTML = '';
    items.forEach(p => {
        const card = document.createElement('div');
        card.className = 'poke-card';
        card.tabIndex = 0;
        card.innerHTML = `
      <img src="${p.img}" alt="${p.name}">
      <div class="poke-name">${p.name}</div>
      <div class="poke-meta">${p.area} • ${p.traits}</div>
    `;
        // click triggers action (definir después)
        card.addEventListener('click', () => {
            console.log('Click Pokemon:', p.id, p.name);
            // aquí iremos integrando la acción real
        });
        grid.appendChild(card);
    });
}
renderGrid(mockPokemons);

// Handle clicks on pins in habitat display
document.querySelectorAll('.pokemon-pin').forEach(pin => {
    pin.addEventListener('click', () => {
        const id = pin.getAttribute('data-id');
        const name = pin.getAttribute('data-name');
        console.log('Habitat pin clicked:', id, name);
        // placeholder: lanzar acción futura
    });
    // keyboard accessible: Enter triggers click
    pin.addEventListener('keydown', (ev) => {
        if (ev.key === 'Enter' || ev.key === ' ') {
            ev.preventDefault(); pin.click();
        }
    });
});

// Filters (visual only, combinative)
const inputName = document.getElementById('filter-name');
const selectArea = document.getElementById('filter-area');
const selectTrait = document.getElementById('filter-trait');
const clearBtn = document.getElementById('clear-filters');

function applyFilters() {
    const name = inputName.value.trim().toLowerCase();
    const area = selectArea.value;
    const trait = selectTrait.value;
    const filtered = mockPokemons.filter(p => {
        if (name && !p.name.toLowerCase().includes(name)) return false;
        if (area && p.area !== area) return false;
        if (trait && p.traits !== trait) return false;
        return true;
    });
    renderGrid(filtered);
}

[inputName, selectArea, selectTrait].forEach(el => el.addEventListener('input', applyFilters));
clearBtn.addEventListener('click', () => {
    inputName.value = ''; selectArea.value = ''; selectTrait.value = ''; applyFilters();
});