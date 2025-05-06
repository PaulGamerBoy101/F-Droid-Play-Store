const CUSTOM_JSON = 'apps.json'; // Your local JSON file
const FDROID_API = 'https://f-droid.org/api/v1/packages/'; // F-Droid Package Metadata API
let allApps = [];

function setStatus(message, type, retry = false) {
    const statusDiv = document.getElementById('status-message');
    statusDiv.innerHTML = message + (retry ? ' <button onclick="fetchApps()">Retry</button>' : '');
    statusDiv.className = `status-message ${type}`;
}

async function fetchApps() {
    setStatus('Loading apps...', 'loading');
    allApps = [];

    let localApps = [];

    // 1. Load from local apps.json
    try {
        const localResponse = await fetch(CUSTOM_JSON);
        const localData = await localResponse.json();
        localApps = localData.apps || [];
        setStatus('Local apps loaded', 'success');
    } catch (error) {
        console.error('Local JSON fetch failed:', error);
        setStatus('Failed to load local apps', 'error', true);
    }

    // 2. Fetch metadata from F-Droid API for each app
    try {
        const enrichedApps = await Promise.all(
            localApps.map(async (app) => {
                const pkg = app.package;
                if (!pkg) return app;

                try {
                    const response = await fetch(`${FDROID_API}${pkg}`);
                    if (!response.ok) throw new Error(`Failed for ${pkg}`);
                    const fdroidData = await response.json();

                    return {
                        ...app,
                        name: fdroidData.name || app.name,
                        icon: fdroidData.icon ? `https://f-droid.org${fdroidData.icon}` : app.icon,
                        version: fdroidData.suggestedVersionName || app.version,
                        download_url: fdroidData.suggestedApkUrl ? `https://f-droid.org${fdroidData.suggestedApkUrl}` : app.download_url,
                        categories: fdroidData.categories || app.categories,
                        permissions: fdroidData.permissions || app.permissions
                    };
                } catch (error) {
                    console.warn(`Could not fetch data for ${pkg}:`, error);
                    return app;
                }
            })
        );

        allApps = enrichedApps;
        setStatus('App data loaded', 'success');
    } catch (error) {
        console.error('F-Droid API fetch failed:', error);
        setStatus('Failed to load app data', 'error', true);
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
       
::contentReference[oaicite:18]{index=18}
 
