const FDROID_API = 'https://f-droid.org/repo/index-v1.json';
const PROXY_API = 'https://cors-anywhere.herokuapp.com/https://f-droid.org/repo/index-v1.json';
let allApps = [];

function setStatus(message, type) {
    const statusDiv = document.getElementById('status-message');
    statusDiv.textContent = message;
    statusDiv.className = `status-message ${type}`;
}

async function fetchApps() {
    setStatus('Loading apps...', 'loading');
    
    try {
        // Try direct fetch first
        const response = await fetch(FDROID_API);
        const data = await response.json();
        allApps = Object.values(data.packages);
        setStatus('Apps loaded successfully', 'success');
        setTimeout(() => setStatus('', ''), 3000); // Clear success message after 3s
        displayApps(allApps);
    } catch (error) {
        console.error('Direct fetch failed:', error);
        // Try proxy as fallback
        setStatus('Retrying with proxy...', 'loading');
        try {
            const proxyResponse = await fetch(PROXY_API);
            const proxyData = await proxyResponse.json();
            allApps = Object.values(proxyData.packages);
            setStatus('Apps loaded successfully', 'success');
            setTimeout(() => setStatus('', ''), 3000); // Clear success message after 3s
            displayApps(allApps);
        } catch (proxyError) {
            console.error('Proxy fetch failed:', proxyError);
            setStatus('Failed to load apps', 'error');
        }
    }
}

function displayApps(apps) {
    const appList = document.getElementById('app-list');
    appList.innerHTML = '';
    apps.forEach(app => {
        const card = document.createElement('div');
        card.className = 'app-card';
        card.innerHTML = `
            <img src="https://f-droid.org/repo/icons/${app.packageName}.png" alt="${app.metadata.name}">
            <h3>${app.metadata.name}</h3>
            <p>${app.metadata.summary || 'No description'}</p>
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
            <img src="https://f-droid.org/repo/icons/${app.packageName}.png" alt="${app.metadata.name}">
            <h2>${app.metadata.name}</h2>
        </div>
        <p>${app.metadata.description || 'No description available'}</p>
        <a href="${app.metadata.sourceCode || '#'}" target="_blank">Source Code</a>
        <br>
        <button class="install-button" onclick="window.open('https://f-droid.org/repo/${app.packageName}.apk')">Install</button>
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
        app.metadata.name.toLowerCase().includes(query.toLowerCase()) ||
        app.metadata.summary?.toLowerCase().includes(query.toLowerCase())
    );
    displayApps(filteredApps);
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
