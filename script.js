const FDROID_JSON = 'index-v2.json';
let allApps = [];

function getLocalizedValue(localizedObj) {
    if (typeof localizedObj === 'string') return localizedObj;
    if (typeof localizedObj === 'object' && localizedObj !== null) {
        const firstLang = Object.keys(localizedObj)[0];
        return localizedObj[firstLang] || 'Unknown';
    }
    return 'Unknown';
}

function setStatus(message, type, retry = false) {
    const statusDiv = document.getElementById('status-message');
    statusDiv.innerHTML = message + (retry ? ' <button onclick="fetchApps()">Retry</button>' : '');
    statusDiv.className = `status-message ${type}`;
}

async function fetchApps() {
    setStatus('Loading apps...', 'loading');
    allApps = [];

    try {
        console.log('Fetching:', FDROID_JSON);
        const response = await fetch(FDROID_JSON);
        console.log('Response:', response.status, response.ok);
        if (!response.ok) {
            throw new Error(`HTTP error: ${response.status}`);
        }
        const fdroidData = await response.json();
        console.log('Total packages:', Object.keys(fdroidData).length);

        let count = 0;
        let skipped = 0;
        Object.entries(fdroidData).forEach(([pkg, app]) => {
            // Remove count limit for now
            // if (count >= 100) return;

            const metadata = app.metadata || {};
            const versions = app.versions || {};
            const versionList = Object.values(versions);

            let latestVersion = {};
            let manifest = {};
            if (versionList.length > 0) {
                try {
                    latestVersion = versionList.reduce((latest, current) =>
                        (current.added || 0) > (latest.added || 0) ? current : latest
                    );
                    manifest = latestVersion.manifest || {};
                } catch (e) {
                    console.error(`Error processing versions for ${pkg}:`, e.message);
                    skipped++;
                    return;
                }
            } else {
                console.log(`No versions for ${pkg}, including with fallback`);
            }

            try {
                const appData = {
                    name: getLocalizedValue(metadata.name) || 'Unknown',
                    summary: getLocalizedValue(metadata.summary) || '',
                    description: getLocalizedValue(metadata.description) || '',
                    whatsNew: getLocalizedValue(latestVersion.whatsNew) || '',
                    package: pkg,
                    version: manifest.versionName || 'N/A',
                    categories: metadata.categories || [],
                    icon: null,
                    download_url: latestVersion.file?.name ? `https://f-droid.org/repo${latestVersion.file.name}` : '',
                    permissions: manifest.usesPermission?.map(p => p.name) || []
                };
                console.log(`Processed ${pkg}:`, appData.name, appData.version);
                allApps.push(appData);
                count++;
            } catch (e) {
                console.error(`Error processing ${pkg}:`, e.message);
                skipped++;
            }
        });
        console.log(`Processed ${count} apps, skipped ${skipped}`);
        setStatus(`Loaded ${count} apps`, 'success');
    } catch (error) {
        console.error('Fetch error:', error.message, error.stack);
        setStatus(`Failed to load apps: ${error.message}`, 'error', true);
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
    console.log('Displaying', apps.length, 'apps');
    const appList = document.getElementById('app-list');
    appList.innerHTML = '';

    const sortedApps = [...apps].sort((a, b) =>
        a.name.toLowerCase().localeCompare(b.name.toLowerCase())
    );

    sortedApps.forEach(app => {
        console.log('Rendering app:', app.name);
        const version = app.version || 'N/A';
        const card = document.createElement('div');
        card.className = 'app-card';
        card.innerHTML = `
            <h3 title="${app.name}">${app.name}</h3>
            <p title="${version}">Version: ${version}</p>
        `;
        card.addEventListener('click', () => showAppDetails(app));
        appList.appendChild(card);
    });
}

function showAppDetails(app) {
    const details = document.getElementById('app-details');
    details.innerHTML = `
        <button class="back-button" onclick="hideAppDetails()">← Back</button>
        <div class="app-details-header">
            <h2>${app.name}</h2>
        </div>
        <p><strong>Package:</strong> ${app.package}</p>
        <p><strong>Version:</strong> ${app.version}</p>
        <p><strong>Categories:</strong> ${Array.isArray(app.categories) ? app.categories.join(', ') : app.categories || 'N/A'}</p>
        <p><strong>Summary:</strong> ${app.summary || 'N/A'}</p>
        <p><strong>Description:</strong><br>${app.description || 'N/A'}</p>
        <p><strong>What’s New:</strong><br>${app.whatsNew || 'N/A'}</p>
        <p><strong>Permissions:</strong><br>${Array.isArray(app.permissions) && app.permissions.length ? app.permissions.join('<br>') : 'None'}</p>
        ${app.download_url 
            ? `<button class="install-button" onclick="window.open('${app.download_url}')">Download APK</button>` 
            : '<em>Download not available</em>'
        }
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
        const btn = document.createElement('div');
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

// Search functionality
document.getElementById('search-button').addEventListener('click', () => {
    const query = document.getElementById('search-bar').value;
    searchApps(query);
});

document.getElementById('search-bar').addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
        searchApps(e.target.value);
    }
});

// Initialize
window.addEventListener('DOMContentLoaded', () => {
    fetchApps();
});
