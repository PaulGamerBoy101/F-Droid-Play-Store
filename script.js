const FDROID_METADATA_URL = 'https://raw.githubusercontent.com/f-droid/fdroiddata/master/metadata/';
const FDROID_INDEX_URL = 'index-v2.json';
let allApps = [];
let currentPage = 1;
let itemsPerPage = 15; // Default to 15 apps per page
let displayMode = 'pagination'; // 'pagination' or 'infinite'
let displayedAppsCount = 0; // Track number of apps displayed in infinite scroll

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
        script.onerror = () => {
            setStatus('Failed to load YAML parser. Please check your internet connection.', 'error', true);
            reject(new Error('Failed to load js-yaml'));
        };
        document.head.appendChild(script);
    });
}

function setStatus(message, type, retry = false) {
    const statusDiv = document.getElementById('status-message') || createStatusDiv();
    statusDiv.innerHTML = message + (retry ? ' <button onclick="fetchApps()">Retry</button>' : '');
    statusDiv.className = `status-message ${type}`;
}

// Create status div if it doesn't exist
function createStatusDiv() {
    const statusDiv = document.createElement('div');
    statusDiv.id = 'status-message';
    document.querySelector('main').prepend(statusDiv);
    return statusDiv;
}

// Escape HTML to prevent XSS
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text || '';
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
        line = (line || '').trim();
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

// Custom sorting function: Alphabet, Numbers, Symbols, Emojis
function customSort(a, b) {
    const nameA = a.name.toLowerCase();
    const nameB = b.name.toLowerCase();

    // Categorize characters
    const getCategory = char => {
        if (/[a-z]/.test(char)) return 1; // Alphabet
        if (/[0-9]/.test(char)) return 2; // Numbers
        if (/[^\w\s]/.test(char) && !/\p{Emoji}/u.test(char)) return 3; // Symbols
        if (/\p{Emoji}/u.test(char)) return 4; // Emojis
        return 5; // Fallback
    };

    // Compare character by character
    for (let i = 0; i < Math.min(nameA.length, nameB.length); i++) {
        const catA = getCategory(nameA[i]);
        const catB = getCategory(nameB[i]);

        if (catA !== catB) {
            return catA - catB;
        }
        if (nameA[i] !== nameB[i]) {
            return nameA[i].localeCompare(nameB[i]);
        }
    }

    return nameA.length - nameB.length;
}

// Fetch the list of all app package IDs from index-v2.json
async function fetchAppList() {
    try {
        const response = await fetch(FDROID_INDEX_URL, { cache: 'no-cache' });
        if (!response.ok) throw new Error(`HTTP ${response.status}: Failed to fetch F-Droid index`);
        const indexData = await response.json();
        if (!indexData.packages) throw new Error('Invalid index data format');
        return Object.keys(indexData.packages);
    } catch (error) {
        console.error('Failed to fetch app list:', error);
        throw error;
    }
}

async function fetchApps() {
    setStatus('Loading apps...', 'loading');
    allApps = [];
    currentPage = 1;
    displayedAppsCount = 0;

    try {
        await loadJsYaml();
        const appIds = await fetchAppList();
        if (!appIds || appIds.length === 0) {
            throw new Error('No apps found in index');
        }
        setStatus(`Fetching metadata for ${appIds.length} apps...`, 'loading');

        const appPromises = appIds.map(async (appId) => {
            try {
                const response = await fetch(`${FDROID_METADATA_URL}${appId}.yml`, { cache: 'no-cache' });
                if (!response.ok) {
                    console.warn(`Failed to fetch ${appId}.yml: HTTP ${response.status}`);
                    return null;
                }
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
                console.warn(`Failed to fetch/parse ${appId}:`, error);
                return null;
            }
        });

        allApps = (await Promise.all(appPromises)).filter(app => app !== null);
        if (allApps.length === 0) {
            throw new Error('No valid app data loaded');
        }

        setStatus(`Loaded ${allApps.length} apps successfully`, 'success');
        setTimeout(() => setStatus('', ''), 3000);
        displayApps(allApps);
        generateCategories(allApps);
    } catch (error) {
        console.error('F-Droid metadata fetch failed:', error);
        setStatus(`Failed to load apps: ${error.message}`, 'error', true);
    }
}

function displayApps(apps) {
    const appList = document.getElementById('app-list') || createAppList();
    const sortedApps = [...apps].sort(customSort);

    if (displayMode === 'pagination') {
        // Pagination mode
        const totalPages = Math.ceil(sortedApps.length / itemsPerPage);
        currentPage = Math.min(currentPage, totalPages) || 1;
        const startIndex = (currentPage - 1) * itemsPerPage;
        const endIndex = startIndex + itemsPerPage;
        const paginatedApps = sortedApps.slice(startIndex, endIndex);

        appList.innerHTML = '';
        paginatedApps.forEach(app => {
            const version = app.version || 'N/A';
            const card = document.createElement('div');
            card.className = 'app-card';
            card.innerHTML = `
                <h3>${escapeHtml(app.name)}</h3>
                <p>Version: ${escapeHtml(version)}</p>
            `;
            card.addEventListener('click', () => showAppDetails(app));
            appList.appendChild(card);
        });

        updatePaginationControls(sortedApps.length, totalPages);
    } else {
        // Infinite scroll mode
        const loadMoreCount = itemsPerPage;
        const endIndex = Math.min(displayedAppsCount + loadMoreCount, sortedApps.length);
        const newApps = sortedApps.slice(displayedAppsCount, endIndex);

        newApps.forEach(app => {
            const version = app.version || 'N/A';
            const card = document.createElement('div');
            card.className = 'app-card';
            card.innerHTML = `
                <h3>${escapeHtml(app.name)}</h3>
                <p>Version: ${escapeHtml(version)}</p>
            `;
            card.addEventListener('click', () => showAppDetails(app));
            appList.appendChild(card);
        });

        displayedAppsCount = endIndex;
        updatePaginationControls(sortedApps.length, 1);
    }
}

// Create app list container if it doesn't exist
function createAppList() {
    const appList = document.createElement('div');
    appList.id = 'app-list';
    appList.className = 'app-grid';
    document.querySelector('main').appendChild(appList);
    return appList;
}

function updatePaginationControls(totalApps, totalPages) {
    let paginationContainer = document.getElementById('pagination-container') || createPaginationContainer();
    
    const options = [
        { value: '7', label: '7 per page' },
        { value: '10', label: '10 per page' },
        { value: '15', label: '15 per page' },
        { value: '20', label: '20 per page' },
        { value: '40', label: '40 per page' },
        { value: '100', label: '100 per page' },
        { value: 'infinite', label: 'Infinite Scroll' }
    ];

    const dropdown = `
        <select id="items-per-page" onchange="changeItemsPerPage(this.value)">
            ${options.map(opt => `<option value="${opt.value}" ${opt.value === (displayMode === 'infinite' ? 'infinite' : itemsPerPage.toString()) ? 'selected' : ''}>${opt.label}</option>`).join('')}
        </select>
    `;

    if (displayMode === 'pagination') {
        paginationContainer.innerHTML = `
            <div class="pagination">
                <button class="pagination-button" ${currentPage === 1 ? 'disabled' : ''} onclick="changePage(${currentPage - 1})">Previous</button>
                <span>Page ${currentPage} of ${totalPages}</span>
                <button class="pagination-button" ${currentPage === totalPages ? 'disabled' : ''} onclick="changePage(${currentPage + 1})">Next</button>
                ${dropdown}
            </div>
        `;
    } else {
        const hasMore = displayedAppsCount < totalApps;
        paginationContainer.innerHTML = `
            <div class="pagination">
                ${hasMore ? `<button class="load-more-button" onclick="loadMoreApps()">Load More</button>` : '<span>All apps loaded</span>'}
                ${dropdown}
            </div>
        `;
    }
    paginationContainer.className = '';
    const footer = document.querySelector('.categories-footer');
    if (footer) footer.className = 'categories-footer';
}

// Create pagination container if it doesn't exist
function createPaginationContainer() {
    const paginationContainer = document.createElement('div');
    paginationContainer.id = 'pagination-container';
    document.querySelector('main').insertBefore(paginationContainer, document.getElementById('app-details') || document.querySelector('main').lastChild);
    return paginationContainer;
}

function changePage(page) {
    currentPage = Math.max(1, page);
    displayApps(allApps);
}

function changeItemsPerPage(value) {
    currentPage = 1;
    displayedAppsCount = 0;
    if (value === 'infinite') {
        displayMode = 'infinite';
        itemsPerPage = 15;
    } else {
        displayMode = 'pagination';
        itemsPerPage = parseInt(value, 10);
    }
    displayApps(allApps);
    if (displayMode === 'infinite') {
        addScrollListener();
    } else {
        removeScrollListener();
    }
}

function loadMoreApps() {
    displayApps(allApps);
}

function addScrollListener() {
    window.addEventListener('scroll', handleScroll);
}

function removeScrollListener() {
    window.removeEventListener('scroll', handleScroll);
}

function handleScroll() {
    const appList = document.getElementById('app-list');
    if (!appList) return;
    const rect = appList.getBoundingClientRect();
    const windowHeight = window.innerHeight;
    if (rect.bottom <= windowHeight + 200 && displayedAppsCount < allApps.length) {
        loadMoreApps();
    }
}

function showAppDetails(app) {
    const details = document.getElementById('app-details') || createAppDetails();
    details.innerHTML = `
        <button class="back-button" onclick="hideAppDetails()">← Back</button>
        <div class="app-details-header">
            <h2>${escapeHtml(app.name)}</h2>
        </div>
        <p><strong>Package:</strong> ${escapeHtml(app.package)}</p>
        <p><strong>Version:</strong> ${escapeHtml(app.version || 'N/A')}</p>
        <p><strong>Categories:</strong> ${Array.isArray(app.categories) ? escapeHtml(app.categories.join(', ')) : escapeHtml(app.categories || 'N/A')}</p>
        <p><strong>Permissions:</strong><br>${Array.isArray(app.permissions) ? escapeHtml(app.permissions.join('<br>')) : 'None'}</p>
        <div class="app-description"><strong>Description:</strong><br>${formatDescription(app.description)}</div>
        ${app.download_url ? `<button class="install-button" onclick="window.open('${escapeHtml(app.download_url)}')">Download APK</button>` : '<em>Download not available</em>'}
    `;
    details.className = 'app-details visible';
    document.getElementById('app-list').className = 'app-grid hidden';
    document.getElementById('status-message').className = 'status-message hidden';
    document.getElementById('pagination-container').className = 'hidden';
    const footer = document.querySelector('.categories-footer');
    if (footer) footer.className = 'categories-footer hidden';
}

// Create app details container if it doesn't exist
function createAppDetails() {
    const details = document.createElement('div');
    details.id = 'app-details';
    details.className = 'app-details';
    document.querySelector('main').appendChild(details);
    return details;
}

function hideAppDetails() {
    const details = document.getElementById('app-details');
    if (details) details.className = 'app-details hidden';
    const appList = document.getElementById('app-list');
    if (appList) appList.className = 'app-grid';
    const status = document.getElementById('status-message');
    if (status) status.className = 'status-message';
    const pagination = document.getElementById('pagination-container');
    if (pagination) pagination.className = '';
    const footer = document.querySelector('.categories-footer');
    if (footer) footer.className = 'categories-footer';
}

function searchApps(query) {
    currentPage = 1;
    displayedAppsCount = 0;
    const filteredApps = allApps.filter(app =>
        (app.name || '').toLowerCase().includes(query.toLowerCase()) ||
        (app.package || '').toLowerCase().includes(query.toLowerCase())
    );
    displayApps(filteredApps);
}

function generateCategories(apps) {
    const footer = document.querySelector('.categories-footer') || createCategoriesFooter();
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
            displayedAppsCount = 0;

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

// Create categories footer if it doesn't exist
function createCategoriesFooter() {
    const footer = document.createElement('footer');
    footer.className = 'categories-footer';
    document.querySelector('main').appendChild(footer);
    return footer;
}

// Initialize event listeners with existence checks
function initializeEventListeners() {
    const searchButton = document.getElementById('search-button');
    if (searchButton) {
        searchButton.addEventListener('click', () => {
            const searchBar = document.getElementById('search-bar');
            if (searchBar) searchApps(searchBar.value);
        });
    }

    const searchBar = document.getElementById('search-bar');
    if (searchBar) {
        searchBar.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                searchApps(e.target.value);
            }
        });
    }
}

// Retry mechanism for failed fetches
async function fetchWithRetry(url, options = {}, retries = 3, delay = 1000) {
    for (let i = 0; i < retries; i++) {
        try {
            const response = await fetch(url, options);
            if (response.ok) return response;
            throw new Error(`HTTP ${response.status}`);
        } catch (error) {
            if (i < retries - 1) {
                await new Promise(resolve => setTimeout(resolve, delay));
                continue;
            }
            throw error;
        }
    }
}

initializeEventListeners();
fetchApps();
