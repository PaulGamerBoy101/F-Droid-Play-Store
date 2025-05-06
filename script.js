const FDROID_APPS = [
    'org.fdroid.fdroid',
    'org.mozilla.fennec_fdroid',
    'org.videolan.vlc',
    'org.telegram.messenger',
    'com.termux',
    'com.owncloud.music',
    'org.vanilla.music',
    'org.musicplayer.audioplayer.metro',
    'com.martinmimigames.simpleweather',
    'org.breezyweather',
    'com.arcticons.day',
    'com.arcticons.night',
    'org.mullvad.mull',
    'org.fossbrowser',
    'org.schabi.newpipe',
    'com.justplayer',
    'com.vincentengelsoftware.vimusics',
    'com.infinity.reddit',
    'org.ya.reddit',
    'org.kde.kdeconnect_tp',
    'com.looker.droidify',
    'ch.protonmail.android',
    'ch.protonvpn.android',
    'ch.protonpass',
    'org.oxycast',
    'com.kyant.music',
    'org.pulseaudio.pulseaudio',
    'org.gateshipone.malp',
    'com.github.ashutoshgngwp.tidal_music',
    'org.deepsymmetry.beatlink',
    'org.fossify.weather',
    'de.kaffeemitkoffein.tinyweatherforecastgermany',
    'org.metotrans.apps.weather',
    'com.joshuacerdenia.android.niceweather',
    'com.donnnno.arcticons',
    'com.thomaslowe.iconer',
    'com.blueheart.icons',
    'com.rahulvij.icons',
    'org.torproject.torbrowser',
    'com.duckduckgo.privacy.browser',
    'org.privacybrowser',
    'at.mono.privacybrowser',
    'org.freebrowser',
    'org.mpv',
    'com.github.videolan.vlc_remote',
    'org.jellyfin.androidtv',
    'com.unnamed.videoplayer',
    'org.libretube',
    'com.github.spotiflyer',
    'org.strawberry',
    'com.lemmy',
    'org.mastodon.android',
    'org.twidere',
    'org.joplin',
    'org.fossify.notes',
    'org.tasks',
    'org.fossify.calendar',
    'at.bitfire.davdroid',
    'org.koreader',
    'org.documentfoundation.libreoffice',
    'org.qownnotes',
    'org.ankidroid',
    'org.orgzly',
    'org.adaway',
    'com.beemdevelopment.aegis',
    'org.bitwarden',
    'org.personal.dnsfilter',
    'org.mollyim.android',
    'org.twinhelix.signal',
    'org.tutanota',
    'org.vigilante',
    'org.trackercontrol',
    'org.island',
    'com.mixplorer',
    'org.fossify.filemanager',
    'com.wa2c.android.cifsdocumentsprovider',
    'org.rcx',
    'org.materialfiles',
    'com.fsck.k9',
    'org.fairemail',
    'org.simpleemail',
    'org.kde.ktrip',
    'org.kde.maui.station',
    'org.kde.maui.calculator',
    'org.kde.maui.note',
    'org.osmand',
    'org.openstreetcomplete',
    'org.organicmaps',
    'org.connectbot',
    'org.gadgetbridge',
    'org.antennapod',
    'org.florisboard',
    'org.simplegallery',
    'org.pdfconverter'
];
const FDROID_METADATA_URL = 'https://raw.githubusercontent.com/f-droid/fdroiddata/master/metadata/';
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

async function fetchApps() {
    setStatus('Loading apps...', 'loading');
    allApps = [];

    try {
        await loadJsYaml();
        const appPromises = FDROID_APPS.map(async (appId) => {
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
                    icon: 'default-icon.png',
                    categories: data.Categories || [],
                    permissions: latestBuild['uses-permission'] || [],
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

    // Sort apps alphabetically
    const sortedApps = [...apps].sort((a, b) => 
        a.name.toLowerCase().localeCompare(b.name.toLowerCase())
    );

    // Calculate pagination
    const totalPages = Math.ceil(sortedApps.length / ITEMS_PER_PAGE);
    currentPage = Math.min(currentPage, totalPages);
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    const endIndex = startIndex + ITEMS_PER_PAGE;
    const paginatedApps = sortedApps.slice(startIndex, endIndex);

    // Display paginated apps
    paginatedApps.forEach(app => {
        const iconPath = app.icon;
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

    // Add pagination controls
    const paginationDiv = document.createElement('div');
    paginationDiv.className = 'pagination';
    paginationDiv.innerHTML = `
        <button class="pagination-button" ${currentPage === 1 ? 'disabled' : ''} onclick="changePage(${currentPage - 1})">Previous</button>
        <span>Page ${currentPage} of ${totalPages}</span>
        <button class="pagination-button" ${currentPage === totalPages ? 'disabled' : ''} onclick="changePage(${currentPage + 1})">Next</button>
    `;
    appList.appendChild(paginationDiv);
}

function changePage(page) {
    currentPage = page;
    displayApps(allApps);
}

function showAppDetails(app) {
    const details = document.getElementById('app-details');
    const iconPath = app.icon;
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
    currentPage = 1; // Reset to first page on search
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
            currentPage = 1; // Reset to first page on category change

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
