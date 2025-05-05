const CUSTOM_JSON = 'apps.json'; // Your local JSON file
const FDROID_PROXY = 'http://localhost:5000/api/fdroid-apps'; // Update to your proxy URL
let allApps = [];

function setStatus(message, type, retry = false) {
    const statusDiv = document.getElementById('status-message');
    statusDiv.innerHTML = message + (retry ? ' <button onclick="fetchApps()">Retry</button>' : '');
    statusDiv.className = `status-message ${type}`;
}

async function fetchApps() {
    setStatus('Loading apps...', 'loading');
    allApps = [];

    try {
        // Fetch local apps.json
        const localResponse = await fetch(CUSTOM_JSON);
        const localData = await localResponse.json();
        allApps = allApps.concat(localData.apps || []);
        setStatus('Local apps loaded', 'success');
    } catch (error) {
        console.error('Local JSON fetch failed:', error);
        setStatus('Failed to load local apps', 'error', true);
    }

    try {
        // Fetch F-Droid apps from proxy
        const fdroidResponse = await fetch(FDROID_PROXY);
        const fdroidData = await fdroidResponse.json();
        if (fdroidData.error) {
            throw new Error(fdroidData.error);
        }
        allApps = allApps.concat(fdroidData.apps || []);
        setStatus('F-Droid apps loaded successfully', 'success');
    } catch (error) {
        console.error('F-Droid JSON fetch failed:', error);
        setStatus('Failed to load F-Droid apps', 'error', true);
    }

    if (allApps.length > 0) {
        setTimeout(() => setStatus('', ''), 3000);
        displayApps(allApps);
        generateCategories(allApps);
    } else {
        setStatus('No apps loaded', 'error', true);
    }
}

function displayApps(apps) {
    const appList = document.getElementById('app-list');
    appList.innerHTML = '';

    // Sort apps alphabetically by name (case-insensitive)
    const sortedApps = [...apps].sort((a, b) => 
        a.name.toLowerCase().localeCompare(b.name.toLowerCase())
    );

    sortedApps.forEach(app => {
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
        <p><strong>Categories:</strong> ${Array.isArray(app.categories) ? app.categories.join(', ') : app.categories || 'N/A'}</p>
        <p><strong>Permissions:</strong><br>${Array.isArray(app.permissions) ? app.permissions.join('<br>') : 'None'}</p>
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
        const cats = Array.isArray(app.categories) ? app.categories : [app.categories].filter(c => c);
        cats.forEach(cat => uniqueCategories.add(cat.trim()));
    });

    const categories = ['All', ...Array.from(uniqueCategories).sort()];

    categories.forEach(category => {
        const btn = document.createElement('div'); // Changed to div for better styling control
        btn.className = 'category-chip';
        btn.textContent = category;

        btn.addEventListener('click', () => {
            document.querySelectorAll('.category-chip').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');

            if (category === 'All') {
                displayApps(allApps);
            } else {
                const filtered = allApps.filter(app => {
                    const cats = Array.isArray(app.categories) ? app.categories : [app.categories].filter(c => c);
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
