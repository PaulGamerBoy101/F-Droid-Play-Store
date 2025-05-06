const FDROID_METADATA_URL = 'https://raw.githubusercontent.com/f-droid/fdroiddata/master/metadata/';
const FDROID_INDEX_URL = 'index-v2.json';
let allApps = [];
let currentPage = 1;
const ITEMS_PER_PAGE = 10;

// Load js-yaml dynamically
function loadJsYaml() {
    return new Promise((resolve, reject) => {
        if (typeof jsyaml !== 'undefined') {
            resolve();
            return;
        }
        const script = document.createElement('script');
        script.src = 'https://cdnjs.cloudflare.com/ajax/libs/js-yaml/4.1.0/js-yaml.min.js';
        script.onload = resolve;
        script.onerror = reject;
        document.head.appendChild(script);
    });
}

function setStatus(message, type, retry = false) {
    const statusDiv = document.getElementById('status-message');
    statusDiv.innerHTML = message + (retry ? ' <button onclick="fetchApps()">Retry</button>' : '');
    statusDiv.className = `status-message ${type}`;
}

// Escape HTML to prevent XSS
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Format description text
function formatDescription(description) {
    if (!description || (Array.isArray(description) && description.length === 0)) {
        return 'No description available';
    }

    let lines = Array.isArray(description) ? description : description.split('\n');
    let html = '';
    let inList = false;

    lines.forEach(line => {
        line = line.trim();
        if (!line) return;

        if (line.startsWith('- ') || line.startsWith('* ')) {
            if (!inList) {
                html += '<ul>';
                inList = true;
            }
            html += `<li>${escapeHtml(line.slice(2).trim())}</li>`;
        } else {
            if (inList) {
                html += '</ul>';
                inList = false;
            }
            html += `<p>${escapeHtml(line)}</p>`;
        }
    });

    if (inList) {
        html += '</ul>';
    }

    return html || 'No description available';
}

// Fetch the list of all app package IDs from index-v1.json
async function fetchAppList() {
    try {
        const response = await fetch(FDROID_INDEX_URL);
        if (!response.ok) throw new Error('Failed to fetch F-Droid index');
        const indexData = await response.json();
        // Extract package IDs from the 'packages' object
        return Object.keys(indexData.packages);
    } catch (error) {
        console.error('Failed to fetch app list:', error);
        throw error;
    }
}

async function fetchApps() {
    setStatus('Loading apps...', 'loading');
    allApps = [];

    try {
        await loadJsYaml();
        // Fetch all package IDs
        const appIds = await fetchAppList();
        setStatus(`Fetching metadata for ${appIds.length} apps...`, 'loading');

        const appPromises = appIds.map(async (appId) => {
            try {
                const response = await fetch(`${FDROID_METADATA_URL}${appId}.yml`);
                if (!response.ok) throw new Error(`Failed to fetch ${appId}.yml`);
                const yamlText = await response.text();
                const data = jsyaml.load(yamlText);
                const latestBuild = data.Builds && data.Builds.length > 0 ? data.Builds[data.Builds.length - 1] : {};
                return {
                    name: data.AutoName || data.Name || appId,
                    package: appId,
                    version: latestBuild.versionName || 'N/A',
                    categories: data.Categories || [],
                    permissions: latestBuild['uses-permission'] || [],
                    description: data.Description || '',
                    download_url: latestBuild.commit ? `https://f-droid.org/repo/${appId}_${latestBuild.versionCode}.apk` : ''
                };
            } catch (error) {
                console.error(`Failed to fetch/parse ${appId}:`, error);
                return null;
            }
        });

        allApps = (await Promise.all(appPromises)).filter(app => app !== null);
        if (allApps.length > 0) {
            setStatus('Apps loaded successfully', 'success');
            setTimeout(() => setStatus('', ''), 3000);
            displayApps(allApps);
            generateCategories(allApps);
        } else {
            setStatus('No apps loaded', 'error', true);
        }
    } catch (error) {
        console.error('F-Droid metadata fetch failed:', error);
        setStatus('Failed to load apps', 'error', true);
    }
}

function displayApps(apps) {
    const appList = document.getElementById('app-list');
    appList.innerHTML = '';

    const sortedApps = [...apps].sort((a, b) => 
        a.name.toLowerCase().localeCompare(b.name.toLowerCase())
    );

    const totalPages = Math.ceil(sortedApps.length / ITEMS_PER_PAGE);
    currentPage = Math.min(currentPage, totalPages);
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    const endIndex = startIndex + ITEMS_PER_PAGE;
    const paginatedApps = sortedApps.slice(startIndex, endIndex);

    paginatedApps.forEach(app => {
        const version = app.version || 'N/A';
        const card = document.createElement('div');
        card.className = 'app-card';
        card.innerHTML = `
            <h3>${app.name}</h3>
            <p>Version: ${version}</p>
        `;
        card.addEventListener('click', () => showAppDetails(app));
        appList.appendChild(card);
    });

    let paginationContainer = document.getElementById('pagination-container');
    if (!paginationContainer) {
        paginationContainer = document.createElement('div');
        paginationContainer.id = 'pagination-container';
        document.querySelector('main').insertBefore(paginationContainer, document.getElementById('app-details'));
    }
    paginationContainer.innerHTML = `
        <div class="pagination">
            <button class="pagination-button" ${currentPage === 1 ? 'disabled' : ''} onclick="changePage(${currentPage - 1})">Previous</button>
            <span>Page ${currentPage} of ${totalPages}</span>
            <button class="pagination-button" ${currentPage === totalPages ? 'disabled' : ''} onclick="changePage(${currentPage + 1})">Next</button>
        </div>
    `;
    paginationContainer.className = '';
    document.querySelector('.categories-footer').className = 'categories-footer';
}

function changePage(page) {
    currentPage = page;
    displayApps(allApps);
}

function showAppDetails(app) {
    const details = document.getElementById('app-details');
    details.innerHTML = `
        <button class="back-button" onclick="hideAppDetails()">← Back</button>
        <div class="app-details-header">
            <h2>${app.name}</h2>
        </div>
        <p><strong>Package:</strong> ${app.package}</p>
        <p><strong>Version:</strong> ${app.version || 'N/A'}</p>
        <p><strong>Categories:</strong> ${Array.isArray(app.categories) ? app.categories.join(', ') : app.categories || 'N/A'}</p>
        <p><strong>Permissions:</strong><br>${Array.isArray(app.permissions) ? app.permissions.join('<br>') : 'None'}</p>
        <div class="app-description"><strong>Description:</strong><br>${formatDescription(app.description)}</div>
        ${app.download_url ? `<button class="install-button" onclick="window.open('${app.download_url}')">Download APK</button>` : '<em>Download not available</em>'}
    `;
    details.className = 'app-details visible';
    document.getElementById('app-list').className = 'app-grid hidden';
    document.getElementById('status-message').className = 'status-message hidden';
    document.getElementById('pagination-container').className = 'hidden';
    document.querySelector('.categories-footer').className = 'categories-footer hidden';
}

function hideAppDetails() {
    document.getElementById('app-details').className = 'app-details hidden';
    document.getElementById('app-list').className = 'app-grid';
    document.getElementById('status-message').className = 'status-message';
    document.getElementById('pagination-container').className = '';
    document.querySelector('.categories-footer').className = 'categories-footer';
}

function searchApps(query) {
    currentPage = 1;
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
            currentPage = 1;

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
