const CUSTOM_JSON = 'apps.json'; // Your local JSON file (keep this for other local apps)
const FDROID_API_BASE = 'https://f-droid.org/api/v1/packages/'; // F-Droid API base URL
const COMMON_APPS = [
    "org.fdroid.fdroid", "org.mozilla.firefox", "org.libreoffice.android", "org.videolan.vlc",
    "com.google.android.apps.maps", "org.telegram.messenger", "com.whatsapp", "com.snapchat.android",
    "com.instagram.android", "com.facebook.katana", "com.spotify.music", "com.spotify.android.client",
    "org.kde.kdeconnect_tp", "org.bitcoinj.android", "org.jitsi.meet", "org.kde.kdenlive", "org.f-droid.fdroid",
    "com.frostwire.android", "com.whatsapp.w4b", "org.aard2", "org.alfresco.android.app", "com.simplemobiletools.calculator.pro",
    "com.simplemobiletools.contacts.pro", "com.simplemobiletools.gallery.pro", "com.simplemobiletools.notepad.pro",
    "com.simplemobiletools.notes.pro", "com.simplemobiletools.recorder.pro", "com.simplemobiletools.smsmessages.pro",
    "org.antennapod.android", "com.vuze.android", "com.github.benoitdion.lottiecompose", "org.eclipse.jetty.websocket",
    "com.etrusted.android.camera", "com.ghostery.android", "com.igloo", "org.cyanogenmod.audiofx", "com.truecaller",
    "com.opera.browser", "com.google.android.gm", "org.nyonyo", "org.smc.android", "org.openstreetmap.android",
    "org.xbmc.kodi", "org.kanboard", "com.liberia.batterywidget", "com.brave.browser", "com.android.vending",
    "com.mailspring", "com.android.chrome", "org.apache.cordova.camera", "com.metallicode.android", "com.audiomack",
    "com.mega.android", "org.sonatype.nexus3", "org.gtk.gimp", "org.qtproject.qtandroid", "com.foss.amplitude",
    "com.deepak.abipost", "com.gotomeeting", "com.simplemobiletools.files", "com.venmo.android", "com.zoho.salesiq",
    "com.spotify.mobile.android.ui", "com.simplemobiletools.timer.pro", "com.simplemobiletools.weather.pro",
    "com.microsoft.teams", "com.cleartrip.android", "com.washingtonpost.android", "com.opera.lite", "com.calm.android",
    "org.martus.android", "org.gnome.evolution", "com.paranoidandroid.bionic", "com.alibaba.aliqin",
    "com.frostwire.android", "org.android.chess", "org.mozilla.thunderbird", "com.filebrowser.app",
    "org.libreoffice.draw", "org.libreoffice.writer", "com.citrix.zenapp", "org.wordpress.android", "org.rss.reader",
    "com.android.email", "com.simplemobiletools.camerapro", "com.evernote", "com.gitlab.ghisler.android", "com.couchbase.lite",
    "org.mozilla.firefoxfocus", "com.google.android.keep", "com.squirrel.android", "com.digiocean.android",
    "com.khanacademy.android", "com.reddit.frontpage", "org.freedesktop.libreoffice", "org.zotero.android",
    "com.stealthcopter", "com.openwhisk.android", "com.simplemobiletools.smsmessages.pro", "com.subsonic.android", 
    "org.androidaudiorecorder", "org.torproject.android", "org.newpipe.app", "com.simplemobiletools.books.pro",
    "com.adobe.reader", "com.baiko.android", "com.jellyfin.android", "com.frostwire", "com.podcasts.android",
    "com.gitlab.android", "com.snappea.android", "com.tomtom.amsterdam", "org.shadowari.bubblewrap", "com.xodo.reader",
    "org.rocket.chat.android", "com.pocketcasts.android", "com.docker.android", "com.simplemobiletools.videoeditor.pro",
    "org.classeur", "org.tinyscreen", "com.facebook.lite", "com.linecorp.line", "org.smc.android", "com.oss.ossdroid"
];

let allApps = [];

function setStatus(message, type, retry = false) {
    const statusDiv = document.getElementById('status-message');
    statusDiv.innerHTML = message + (retry ? ' <button onclick="fetchApps()">Retry</button>' : '');
    statusDiv.className = `status-message ${type}`;
}

async function fetchApps() {
    setStatus('Loading apps...', 'loading');
    allApps = [];

    // Fetch local apps.json
    try {
        const localResponse = await fetch(CUSTOM_JSON);
        const localData = await localResponse.json();
        allApps = allApps.concat(localData.apps || []);
        setStatus('Local apps loaded', 'success');
    } catch (error) {
        console.error('Local JSON fetch failed:', error);
        setStatus('Failed to load local apps', 'error', true);
    }

    // Fetch F-Droid apps from API
    try {
        for (const packageName of COMMON_APPS) {
            const response = await fetch(FDROID_API_BASE + packageName);
            const data = await response.json();
            if (data.error) {
                throw new Error(data.error);
            }

            // Transform F-Droid data to match our app structure
            const appData = transformFdroidData(data);
            allApps.push(appData);
        }
        setStatus('F-Droid apps loaded successfully', 'success');
    } catch (error) {
        console.error('F-Droid API fetch failed:', error);
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

function transformFdroidData(data) {
    const packageData = data.package; // F-Droid package data
    const versionData = Object.values(packageData.versions)[0]; // Using the latest version data

    return {
        name: packageData.name,
        package: packageData.packageName,
        version: versionData.versionName || 'N/A',
        icon: `https://f-droid.org/repo/${packageData.icon || 'icon.png'}`,
        categories: packageData.categories || [],
        permissions: versionData.permissions || [],
        download_url: `https://f-droid.org/repo/${versionData.apkName}`,
    };
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
fetchApps();
