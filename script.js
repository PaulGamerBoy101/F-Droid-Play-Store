let appsData = [];
const appGrid = document.querySelector('.app-grid');
const categoriesFooter = document.querySelector('.categories-footer');
const categoriesContainer = document.createElement('div');
categoriesContainer.classList.add('category-container');
categoriesFooter.appendChild(categoriesContainer);

// Fetch and render apps
fetch('apps.json')
  .then(response => response.json())
  .then(data => {
    appsData = data;
    renderApps(appsData);
    generateCategories(appsData);
  });

// Render apps to the grid
function renderApps(appList) {
  appGrid.innerHTML = '';
  appList.forEach(app => {
    const card = document.createElement('div');
    card.className = 'app-card';
    card.innerHTML = `
      <img src="${app.icon}" alt="${app.name}">
      <h3>${app.name}</h3>
      <p>${app.description}</p>
    `;
    card.addEventListener('click', () => showAppDetails(app));
    appGrid.appendChild(card);
  });
}

// Generate unique categories
function generateCategories(apps) {
  const categorySet = new Set();

  apps.forEach(app => {
    const catField = Array.isArray(app.category) ? app.category : [app.category];
    catField.forEach(cat => categorySet.add(cat.trim()));
  });

  // Add "All" category
  const allButton = createCategoryChip('All');
  allButton.classList.add('active');
  categoriesContainer.appendChild(allButton);

  // Add dynamic categories
  Array.from(categorySet).sort().forEach(cat => {
    categoriesContainer.appendChild(createCategoryChip(cat));
  });
}

// Create category button
function createCategoryChip(categoryName) {
  const chip = document.createElement('div');
  chip.className = 'category-chip';
  chip.textContent = categoryName;

  chip.addEventListener('click', () => {
    document.querySelectorAll('.category-chip').forEach(c => c.classList.remove('active'));
    chip.classList.add('active');

    if (categoryName === 'All') {
      renderApps(appsData);
    } else {
      const filtered = appsData.filter(app => {
        const cats = Array.isArray(app.category) ? app.category : [app.category];
        return cats.map(c => c.trim()).includes(categoryName);
      });
      renderApps(filtered);
    }
  });

  return chip;
}

// Show app details logic (assumes you already have this function)
function showAppDetails(app) {
  const detailsScreen = document.querySelector('.app-details');
  detailsScreen.innerHTML = `
    <button class="back-button" onclick="hideAppDetails()">← Back</button>
    <div class="app-details-header">
      <img src="${app.icon}" alt="${app.name}">
      <h2>${app.name}</h2>
      <p>${app.description}</p>
    </div>
    <p><strong>Category:</strong> ${Array.isArray(app.category) ? app.category.join(', ') : app.category}</p>
    <button class="install-button">Install</button>
  `;
  detailsScreen.classList.add('visible');
}

function hideAppDetails() {
  document.querySelector('.app-details').classList.remove('visible');
}
