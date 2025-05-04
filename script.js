const FDROID_API = 'https://f-droid.org/repo/index-v1.json';
let allApps = [];

async function fetchApps() {
    try {
        const response = await fetch(FDROID_API);
        const data = await response.json();
        allApps = Object.values(data.packages);
        displayApps(allApps);
    } catch (error) {
        console.error('Error fetching apps:', error);
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
}

function hideAppDetails() {
    document.getElementById('app-details').className = 'app-details hidden';
    document.getElementById('app-list').className = 'app-grid';
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
