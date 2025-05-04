const CUSTOM_JSON = 'apps.json'; // Or change to your actual file path
let allApps = [];

function setStatus(message, type, retry = false) {
    const statusDiv = document.getElementById('status-message');
    statusDiv.innerHTML = message + (retry ? ' <button onclick="fetchApps()">Retry</button>' : '');
    statusDiv.className = `status-message ${type}`;
}

async function fetchApps() {
    setStatus('Loading apps...', 'loading');

    try {
        const response = await fetch(CUSTOM_JSON);
        const data = await response.json();
        allApps = data.apps;
        setStatus('Apps loaded successfully', 'success');
        setTimeout(() => setStatus('', ''), 3000);
        displayApps(allApps);
        generateCategories(allApps); // 👈 Add this line to build categories
    } catch (error) {
        console.error('Custom JSON fetch failed:', error);
        setStatus('Failed to load apps', 'error', true);
    }
}

function displayApps(apps) {
    const appList = document.getElementById('app-list');
    appList.innerHTML = '';
    apps.forEach(app => {
        const iconPath = app.icon && app.icon.trim() !== '' ? app.icon : 'default-icon.png';
        const version = app.version || 'N/A';
        const card = document.createElement('div');
        card.className = 'app-card';
        card.innerHTML = `
            <img src="${iconPath}" alt="${app.name}" onerror="this.src='default-icon.png'">
            <h3>${app.name}</h3>
            <p>Version: ${version}</p>
        `;
        card.addEventListener('click', () => showAppDetails(app));
        appList.appendChild(card);
    });
}


function showAppDetails(app) {
    const details = document.getElementById('app-details');
    const iconPath = app.icon && app.icon.trim() !== '' ? app.icon : 'default-icon.png';
    details.innerHTML = `
        <button class="back-button" onclick="hideAppDetails()">← Back</button>
        <div class="app-details-header">
            <img src="${iconPath}" alt="${app.name}" onerror="this.src='default-icon.png'">
            <h2>${app.name}</h2>
        </div>
        <p><strong>Package:</strong> ${app.package}</p>
        <p><strong>Version:</strong> ${app.version || 'N/A'}</p>
        <p><strong>Categories:</strong> ${Array.isArray(app.categories) ? app.categories.join(', ') : app.categories}</p>
        <p><strong>Permissions:</strong><br>${app.permissions.join('<br>')}</p>
        ${app.download_url ? `<button class="install-button" onclick="window.open('${app.download_url}')">Download APK</button>` : '<em>Download not available</em>'}
    `;
    details.className = 'app-details visible';
    document.getElementById('app-list').className = 'app-grid hidden';
    document.getElementById('status-message').className = 'status-message hidden';
}

function hideAppDetails() {
    document.getElementById('app-details').className = 'app-details hidden';
    document.getElementById('app-list').className = 'app-grid';
    document.getElementById('status-message').className = 'status-message';
}

function searchApps(query) {
    const filteredApps = allApps.filter(app =>
        app.name.toLowerCase().includes(query.toLowerCase()) ||
        app.package.toLowerCase().includes(query.toLowerCase())
    );
    displayApps(filteredApps);
}

function generateCategories(apps) {
    const footer = document.querySelector('.categories-footer');
    footer.innerHTML = '<h4>Browse by Category</h4>';

    const uniqueCategories = new Set();
    apps.forEach(app => {
        const cats = Array.isArray(app.categories) ? app.categories : [app.categories];
        cats.forEach(cat => uniqueCategories.add(cat.trim()));
    });

    const categories = ['All', ...Array.from(uniqueCategories).sort()];

    categories.forEach(category => {
        const btn = document.createElement('button');
        btn.className = 'category-chip';
        btn.textContent = category;

        btn.addEventListener('click', () => {
            document.querySelectorAll('.category-chip').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');

            if (category === 'All') {
                displayApps(allApps);
            } else {
                const filtered = allApps.filter(app => {
                    const cats = Array.isArray(app.categories) ? app.categories : [app.categories];
                    return cats.map(c => c.trim()).includes(category);
                });
                displayApps(filtered);
            }
        });

        footer.appendChild(btn);
    });
}

document.getElementById('search-button').addEventListener('click', () => {
    const query = document.getElementById('search-bar').value;
    searchApps(query);
});

document.getElementById('search-bar').addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
        searchApps(e.target.value);
    }
});

fetchApps();
