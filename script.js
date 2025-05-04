const FDROID_JSON = 'https://f-droid.org/repo/index-v1.json';
const FDROID_XML = 'https://f-droid.org/repo/index.xml';
const PROXY_JSON = 'https://cors-anywhere.herokuapp.com/https://f-droid.org/repo/index-v1.json';
const IZZY_JSON = 'https://apt.izzysoft.de/fdroid/repo/index-v1.json';
let allApps = [];

function setStatus(message, type, retry = false) {
    const statusDiv = document.getElementById('status-message');
    statusDiv.innerHTML = message + (retry ? ' <button onclick="fetchApps()">Retry</button>' : '');
    statusDiv.className = `status-message ${type}`;
}

async function fetchApps() {
    setStatus('Loading apps...', 'loading');
    
    // Try F-Droid JSON
    try {
        const response = await fetch(FDROID_JSON);
        const data = await response.json();
        allApps = Object.values(data.packages);
        setStatus('Apps loaded successfully', 'success');
        setTimeout(() => setStatus('', ''), 3000);
        displayApps(allApps);
        return;
    } catch (error) {
        console.error('F-Droid JSON fetch failed:', error);
    }

    // Try CORS proxy
    setStatus('Retrying with proxy...', 'loading');
    try {
        const proxyResponse = await fetch(PROXY_JSON);
        const proxyData = await proxyResponse.json();
        allApps = Object.values(proxyData.packages);
        setStatus('Apps loaded successfully', 'success');
        setTimeout(() => setStatus('', ''), 3000);
        displayApps(allApps);
        return;
    } catch (proxyError) {
        console.error('Proxy fetch failed:', proxyError);
    }

    // Try F-Droid XML
    setStatus('Retrying with XML index...', 'loading');
    try {
        const xmlResponse = await fetch(FDROID_XML);
        const xmlText = await xmlResponse.text();
        const parser = new DOMParser();
        const xmlDoc = parser.parseFromString(xmlText, 'text/xml');
        allApps = parseXmlToApps(xmlDoc);
        setStatus('Apps loaded successfully', 'success');
        setTimeout(() => setStatus('', ''), 3000);
        displayApps(allApps);
        return;
    } catch (xmlError) {
        console.error('XML fetch failed:', xmlError);
    }

    // Try IzzyOnDroid JSON
    setStatus('Retrying with IzzyOnDroid repo...', 'loading');
    try {
        const izzyResponse = await fetch(IZZY_JSON);
        const izzyData = await izzyResponse.json();
        allApps = Object.values(izzyData.packages);
        setStatus('Apps loaded successfully', 'success');
        setTimeout(() => setStatus('', ''), 3000);
        displayApps(allApps);
        return;
    } catch (izzyError) {
        console.error('IzzyOnDroid fetch failed:', izzyError);
        setStatus('Failed to load apps', 'error', true);
    }
}

function parseXmlToApps(xmlDoc) {
    const apps = [];
    const appNodes = xmlDoc.getElementsByTagName('application');
    for (let appNode of appNodes) {
        const packageName = appNode.getElementsByTagName('id')[0]?.textContent || '';
        const name = appNode.getElementsByTagName('name')[0]?.textContent || 'Unknown';
        const summary = appNode.getElementsByTagName('summary')[0]?.textContent || '';
        const description = appNode.getElementsByTagName('desc')[0]?.textContent || '';
        const sourceCode = appNode.getElementsByTagName('source')[0]?.textContent || '';
        apps.push({
            packageName,
            metadata: {
                name,
                summary,
                description,
                sourceCode
            }
        });
    }
    return apps;
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
