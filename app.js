import { initializeApp } from "https://www.gstatic.com/firebasejs/10.9.0/firebase-app.js";
import { getAuth, signInWithEmailAndPassword, createUserWithEmailAndPassword, onAuthStateChanged, signOut, updateProfile, sendPasswordResetEmail } from "https://www.gstatic.com/firebasejs/10.9.0/firebase-auth.js";
import { getFirestore, doc, getDoc, setDoc, addDoc, collection, getDocs } from "https://www.gstatic.com/firebasejs/10.9.0/firebase-firestore.js";
import { getStorage, ref, uploadBytes, getDownloadURL } from "https://www.gstatic.com/firebasejs/10.9.0/firebase-storage.js";

// User Firebase config
const firebaseConfig = {
  apiKey: "AIzaSyCyLY_0IZ-PkoUkDCCDHWI4_j4Yf8HRR2E",
  authDomain: "chikoomusic.firebaseapp.com",
  projectId: "chikoomusic",
  storageBucket: "chikoomusic.firebasestorage.app",
  messagingSenderId: "1097087388966",
  appId: "1:1097087388966:web:6aef6d6c2d47d021fb85e7",
  measurementId: "G-ZZRSJ14Z2L"
};

let app, auth, db, storage;
try {
    app = initializeApp(firebaseConfig);
    auth = getAuth(app);
    db = getFirestore(app);
    storage = getStorage(app);
} catch (e) {
    console.warn("Firebase not configured properly:", e);
}

/**
 * Chikoo Music - app.js
 */
const GLOBAL_ARTISTS = [
    { name: 'Arijit Singh', query: 'best of arijit singh', image: 'https://i.scdn.co/image/ab6761610000e5eb0261696c5df3be99da6ed3f3' },
    { name: 'Shreya Ghoshal', query: 'best of shreya ghoshal', image: 'https://i.scdn.co/image/ab6761610000e5eb662d08a54d3dfde830f3c0ce' },
    { name: 'The Weeknd', query: 'the weeknd top tracks', image: 'https://i.scdn.co/image/ab6761610000e5eb214f3cf1cbe7139c1e26ffbb' },
    { name: 'Taylor Swift', query: 'taylor swift popular', image: 'https://i.scdn.co/image/ab6761610000e5eb5a00969a4698c3132a15fbb0' },
    { name: 'Badshah', query: 'badshah hit songs', image: 'https://i.scdn.co/image/ab6761610000e5ebffcbac78c47146522bd51b03' },
    { name: 'Ed Sheeran', query: 'ed sheeran hits', image: 'https://i.scdn.co/image/ab6761610000e5eb12a2ef08d00dd7451a6dbed6' },
    { name: 'Justin Bieber', query: 'justin bieber hits', image: 'https://i.scdn.co/image/ab6761610000e5eb8ae7f2aaa9817a704a87ea36' },
    { name: 'Pritam', query: 'best of pritam', image: 'https://i.scdn.co/image/ab6761610000e5ebcb6926f44f620555ba444fca' },
    { name: 'Atif Aslam', query: 'atif aslam hits', image: 'https://i.scdn.co/image/ab6761610000e5ebc40600e02356f90fc528e19b' },
    { name: 'Darshan Raval', query: 'darshan raval popular', image: 'https://i.scdn.co/image/ab6761610000e5ebbf37fb64d1f4ba40e01764df' },
    { name: 'A.R. Rahman', query: 'best of ar rahman', image: 'https://i.scdn.co/image/ab6761610000e5ebb19af0ea736c6228d6eb539c' },
    { name: 'Dua Lipa', query: 'dua lipa hits', image: 'https://i.scdn.co/image/ab6761610000e5eb4f391515bb5649984b4231b0' },
    { name: 'Sidhu Moose Wala', query: 'sidhu moose wala top', image: 'https://i.scdn.co/image/ab6761610000e5ebd1521a083377755ba0c6396e' },
    { name: 'Billie Eilish', query: 'billie eilish top tracks', image: 'https://i.scdn.co/image/ab6761610000e5ebd8b9980db67272cb4d2c3daf' },
    { name: 'Anirudh Ravichander', query: 'anirudh ravichander hits', image: 'https://i.scdn.co/image/ab6761610000e5eb5df2b6b026ccabfbc417070f' },
    { name: 'Diljit Dosanjh', query: 'diljit dosanjh popular', image: 'https://i.scdn.co/image/ab6761610000e5eb262077e60b135bb47e62a8ef' },
    { name: 'Drake', query: 'drake hits', image: 'https://i.scdn.co/image/ab6761610000e5eb4293385d324db8558179afd9' },
    { name: 'Sonu Nigam', query: 'best of sonu nigam', image: 'https://i.scdn.co/image/ab6761610000e5eb5d5b7858c8959f6d4d126fcb' }
];

document.addEventListener('DOMContentLoaded', () => {

    // =============================================
    // STATE
    // =============================================
    const state = {
        currentSong: null,
        isPlaying: false,
        theme: 'dark',
        queue: [],
        currentIndex: -1,
        volume: 1,
        previousVolume: 1,  // For mute/unmute restore
        isMuted: false,
        isShuffled: false,
        repeatMode: 'none', // 'none' | 'all' | 'one'
        likedSongs: [],     // Array of song IDs
        customPlaylists: [],// Array of {id, name, songs: []}
        downloadedSongs: [], // Array of downloaded song objects
        localSongs: [],
        token: localStorage.getItem('chikoo_token') || null,
        user: JSON.parse(localStorage.getItem('chikoo_user') || 'null'),
        dashboardPage: 1,
        searchPage: 1,
        currentDashboardQuery: 'trending'
    };

    // =============================================
    // DOM ELEMENTS
    // =============================================
    const elements = {
        // Layout
        sidebar: document.querySelector('.sidebar'),
        navLinks: document.querySelectorAll('.nav-links li'),
        views: document.querySelectorAll('.view'),
        themeToggle: document.getElementById('theme-btn'),
        themeIcon: document.querySelector('#theme-btn i'),
        loader: document.getElementById('main-loader'),

        // Player
        audio: document.getElementById('audio-player'),
        playBtn: document.getElementById('play-btn'),
        prevBtn: document.getElementById('prev-btn'),
        nextBtn: document.getElementById('next-btn'),
        shuffleBtn: document.getElementById('shuffle-btn'),
        repeatBtn: document.getElementById('repeat-btn'),
        seekBwBtn: document.getElementById('seek-bw-btn'),
        seekFwBtn: document.getElementById('seek-fw-btn'),
        progressBg: document.getElementById('progress-bg'),
        progressFill: document.getElementById('progress-fill'),
        timeCurrent: document.getElementById('time-current'),
        timeTotal: document.getElementById('time-total'),
        npImage: document.getElementById('np-image'),
        npTitle: document.getElementById('np-title'),
        npArtist: document.getElementById('np-artist'),
        npLikeBtn: document.getElementById('np-like-btn'),
        npAddPlaylistBtn: document.getElementById('np-add-playlist-btn'),

        // Volume
        volumeSlider: document.getElementById('volume-slider'),
        volumeIcon: document.getElementById('volume-icon'),

        // Fullscreen Player
        fsPlayer: document.getElementById('fullscreen-player'),
        btnCloseFs: document.getElementById('btn-close-fs'),
        fsImage: document.getElementById('fs-image'),
        fsTitle: document.getElementById('fs-title'),
        fsArtist: document.getElementById('fs-artist'),
        fsPlayBtn: document.getElementById('fs-btn-play'),
        fsPrevBtn: document.getElementById('fs-btn-prev'),
        fsNextBtn: document.getElementById('fs-btn-next'),
        fsSeekBwBtn: document.getElementById('fs-seek-bw-btn'),
        fsSeekFwBtn: document.getElementById('fs-seek-fw-btn'),
        fsProgressBg: document.getElementById('fs-progress-bg'),
        fsProgressFill: document.getElementById('fs-progress-fill'),
        fsTimeCurrent: document.getElementById('fs-time-current'),
        fsTimeTotal: document.getElementById('fs-time-total'),
        fsBgBlur: document.getElementById('fs-bg-blur'),
        fsLikeBtn: document.getElementById('fs-like-btn'),
        fsAddPlaylistBtn: document.getElementById('fs-add-playlist-btn'),
        fsLyricsBtn: document.getElementById('fs-lyrics-btn'),
        fsShuffleBtn: document.getElementById('fs-shuffle-btn'),
        fsRepeatBtn: document.getElementById('fs-repeat-btn'),
        fsAutoDjBtn: document.getElementById('fs-auto-dj-btn'),

        // Lyrics & Queue Modals
        lyricsModal: document.getElementById('lyrics-modal'),
        closeLyricsModal: document.getElementById('close-lyrics-modal'),
        lyricsTitle: document.getElementById('lyrics-title'),
        lyricsArtist: document.getElementById('lyrics-artist'),
        lyricsContent: document.getElementById('lyrics-content'),
        queueModal: document.getElementById('queue-modal'),
        closeQueueModal: document.getElementById('close-queue-modal'),
        queueList: document.getElementById('queue-list'),

        // Actions
        btnFullscreen: document.getElementById('btn-fullscreen'),
        btnClosePlayer: document.getElementById('btn-close-player'),
        btnDownload: document.getElementById('btn-download'),
        btnQueue: document.getElementById('btn-queue'),
        fsQueueBtn: document.getElementById('fs-queue-btn'),
        fsShareBtn: document.getElementById('fs-share-btn'),

        // Profile
        profileFabBtn: document.getElementById('profile-fab-btn'),
        profileModal: document.getElementById('profile-modal'),
        closeProfileBtn: document.getElementById('close-profile'),
        bannerVideo: document.getElementById('banner-video'),
        soundToggleBtn: document.getElementById('sound-toggle-btn'),
        soundIcon: document.getElementById('sound-icon'),
        soundText: document.getElementById('sound-text'),

        // Content
        trendingGrid: document.getElementById('trending-grid'),
        searchInput: document.getElementById('search-input'),
        searchResults: document.getElementById('search-grid'),
        likedSongsList: document.getElementById('liked-songs-list'),
        likedCount: document.getElementById('liked-count'),
        localFilesGrid: document.getElementById('local-files-grid'),
        localFileUpload: document.getElementById('local-file-upload'),
        downloadsGrid: document.getElementById('downloads-grid'),
        
        // Playlists
        myPlaylistsGrid: document.getElementById('my-playlists-grid'),
        createPlaylistBtn: document.getElementById('create-playlist-btn'),
        playlistSelectionModal: document.getElementById('playlist-selection-modal'),
        closePlaylistModal: document.getElementById('close-playlist-modal'),
        playlistOptionsList: document.getElementById('playlist-options-list'),

        // Auth
        authBtn: document.getElementById('auth-btn'),
        authModal: document.getElementById('auth-modal'),
        closeAuthModal: document.getElementById('close-auth'),
        tabLogin: document.getElementById('tab-login'),
        tabRegister: document.getElementById('tab-register'),
        formLogin: document.getElementById('form-login'),
        formRegister: document.getElementById('form-register'),
        navAdmin: document.getElementById('nav-admin'),
        reportForm: document.getElementById('report-form'),
        autoDjBtn: document.getElementById('auto-dj-btn'),
        genreModal: document.getElementById('genre-modal'),
        closeGenreModal: document.getElementById('close-genre-modal'),
        genreBtns: document.querySelectorAll('.genre-btn'),
        
        // Hero Banner
        heroBanner: document.getElementById('hero-banner'),
        heroBgBlur: document.getElementById('hero-bg-blur'),
        heroImg: document.getElementById('hero-img'),
        heroTitle: document.getElementById('hero-title'),
        heroArtist: document.getElementById('hero-artist'),
        heroPlayBtn: document.getElementById('hero-play-btn'),
        quickOptionBtns: document.querySelectorAll('.quick-option-btn')
    };

    // =============================================
    // INITIALIZATION
    // =============================================
    
    // Setup Scroll Reveal Observer
    const revealObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('visible');
                revealObserver.unobserve(entry.target);
            }
        });
    }, { threshold: 0.1, rootMargin: "0px 0px -30px 0px" });

    // Pagination Grid Renderer
    async function fetchAndRenderDashboardGrid() {
        showSkeletons(elements.trendingGrid, 10);
        const query = state.currentDashboardQuery;
        let songs = [];
        const lang = window.currentLanguage || 'global';

        if (query === 'best of arijit singh') { // Dev's Favs
            document.getElementById('dashboard-pagination').style.display = 'none'; // No pagination for manual list
            try {
                const { doc, getDoc } = await import("https://www.gstatic.com/firebasejs/10.9.0/firebase-firestore.js");
                const docSnap = await getDoc(doc(db, 'global_state', 'devs_favs'));
                if (docSnap.exists() && docSnap.data().songs && docSnap.data().songs.length > 0) {
                    songs = docSnap.data().songs;
                } else {
                    songs = []; 
                }
            } catch (err) {
                console.error("Failed fetching dev favs from Firebase", err);
                songs = []; 
            }
        } else if (query === 'top artists') {
            document.getElementById('dashboard-pagination').style.display = 'flex';
            const artistsPerPage = 10;
            const startIndex = (state.dashboardPage - 1) * artistsPerPage;
            const paginatedArtists = GLOBAL_ARTISTS.slice(startIndex, startIndex + artistsPerPage);
            renderArtistGrid(paginatedArtists, elements.trendingGrid);
            
            const nextBtn = document.getElementById('page-next-btn');
            if (nextBtn) nextBtn.disabled = (startIndex + artistsPerPage) >= GLOBAL_ARTISTS.length;
            return;
        } else {
            document.getElementById('dashboard-pagination').style.display = 'flex';
            if (query === 'hindi romantic songs' || query === 'trending') {
                songs = await AirbeatsAPI.getTrendingSongs(lang, state.dashboardPage);
            } else if (query === 'new releases') {
                songs = await AirbeatsAPI.searchSongs(lang === 'global' ? 'latest' : lang, 20, state.dashboardPage);
            } else if (query === 'popular hits') {
                songs = await AirbeatsAPI.searchSongs(lang === 'global' ? 'popular hits' : lang, 20, state.dashboardPage);
            } else {
                songs = await AirbeatsAPI.searchSongs(lang === 'global' ? query : `${lang} ${query}`, 20, state.dashboardPage);
            }
        }
        
        renderSongs(songs, elements.trendingGrid);
        
        const nextBtn = document.getElementById('page-next-btn');
        if (nextBtn) {
            nextBtn.disabled = (!songs || songs.length === 0);
        }
        
        if (state.dashboardPage === 1) updateHeroBanner(songs);
    }

    function updateDashboardPaginationUI() {
        const pageNum = document.querySelector('#page-numbers-container .current-page');
        if (pageNum) pageNum.textContent = state.dashboardPage;
        const prevBtn = document.getElementById('page-prev-btn');
        if (prevBtn) prevBtn.disabled = state.dashboardPage <= 1;
    }

    init();

    async function init() {
        loadPersistedState();
        fetchGlobalBroadcast();
        
        if (auth) {
            onAuthStateChanged(auth, async (user) => {
                if (user) {
                    state.token = user.uid;
                    let role = 'user';
                    const uName = user.displayName || 'User';
                    
                    if (user.email === 'mrchikoo31@gmail.com' || uName.toLowerCase() === 'nox_shadowx') {
                        role = 'owner';
                    }
                    
                    state.user = { username: uName, email: user.email, role: role };
                    // Fetch data from Firestore
                    if (db) {
                        try {
                            const userRef = doc(db, 'users', user.uid);
                            const userSnap = await getDoc(userRef);
                            if (userSnap.exists()) {
                                const data = userSnap.data();
                                if (data.likedSongs) state.likedSongs = data.likedSongs;
                                if (data.customPlaylists) state.customPlaylists = data.customPlaylists;
                                if (data.role === 'owner') role = 'owner';
                            }
                            
                            // Save updated role and state
                            await setDoc(userRef, {
                                username: uName,
                                email: user.email,
                                role: role,
                                likedSongs: state.likedSongs,
                                customPlaylists: state.customPlaylists
                            }, { merge: true });
                            
                            state.user.role = role;
                        } catch(e) {
                            console.warn("Failed to fetch from Firestore", e);
                        }
                    }
                } else {
                    state.token = null;
                    state.user = null;
                }
                updateAuthUI();
            });
        } else {
            updateAuthUI();
        }

        setupEventListeners();
        loadTheme();
        initBannerVideo();
        syncVolumeUI();
        syncShuffleRepeatUI();

        // Show skeleton loaders while fetching
        showSkeletons(elements.trendingGrid, 10);

        // Load initial grid with pagination
        document.getElementById('dashboard-pagination').style.display = 'flex';
        state.dashboardPage = 1;
        state.currentDashboardQuery = 'trending';
        await fetchAndRenderDashboardGrid();

        // Observe static elements
        if (typeof revealObserver !== 'undefined') {
            document.querySelectorAll('.reveal').forEach(el => revealObserver.observe(el));
        }

        loadDownloads();
        
        // Check for shared playlist links in URL
        const urlParams = new URLSearchParams(window.location.search);
        if (urlParams.has('pname') && urlParams.has('psongs')) {
            await handleImportPlaylist(urlParams.get('pname'), urlParams.get('psongs'));
            // Remove params from URL so it doesn't re-import on refresh
            window.history.replaceState({}, document.title, window.location.pathname);
        }
    }
    
    function updateHeroBanner(songs) {
        if (!elements.heroBanner) return;
        if (!songs || songs.length === 0) {
            elements.heroBanner.style.display = 'none';
            return;
        }
        
        // Pick a top song
        const song = songs[0];
        
        const imgObj = song.image?.find(img => img.quality === '500x500') || song.image?.[song.image.length - 1];
        const imgUrl = imgObj?.url || imgObj?.link || 'MARINE LOGO FINAL.png';
        const artist = song.artists?.primary?.map(a => a.name).join(', ') || 'Unknown Artist';
        
        elements.heroImg.src = imgUrl;
        elements.heroBgBlur.style.backgroundImage = `url('${imgUrl}')`;
        elements.heroTitle.textContent = song.name;
        elements.heroArtist.innerHTML = `${artist} <i class="fa-solid fa-heart" style="color:var(--accent-purple); font-size: 12px; margin-left: 5px;"></i>`;
        
        // Setup play button
        elements.heroPlayBtn.onclick = () => {
            state.queue = [song];
            state.currentIndex = 0;
            playSong(song);
        };
        
        elements.heroBanner.style.display = 'flex';
    }

    async function fetchGlobalBroadcast() {
        if (!db) return;
        try {
            const configRef = doc(db, 'global', 'config');
            const snap = await getDoc(configRef);
            if (snap.exists()) {
                const data = snap.data();
                if (data.broadcastMessage && localStorage.getItem('closedBroadcast') !== data.broadcastMessage) {
                    const banner = document.getElementById('broadcast-banner');
                    const text = document.getElementById('broadcast-message-text');
                    const closeBtn = document.getElementById('close-broadcast-btn');
                    if (banner && text) {
                        text.textContent = data.broadcastMessage;
                        banner.style.display = 'flex';
                        if (closeBtn) {
                            closeBtn.onclick = () => {
                                banner.style.display = 'none';
                                localStorage.setItem('closedBroadcast', data.broadcastMessage);
                            };
                        }
                    }
                }
            }
        } catch (e) {
            console.warn("Could not fetch broadcast", e);
        }
    }

    async function handleImportPlaylist(pname, psongsStr) {
        showToast(`Importing playlist: ${pname}...`);
        const songIds = psongsStr.split(',').filter(id => id);
        
        let importedSongs = [];
        for (const id of songIds) {
            const songInfo = await AirbeatsAPI.getSongDetails(id);
            if (songInfo && songInfo.length > 0) {
                importedSongs.push(songInfo[0]);
            }
        }
        
        if (importedSongs.length > 0) {
            state.customPlaylists.push({
                id: `playlist-${Date.now()}`,
                name: pname,
                songs: importedSongs
            });
            saveState();
            renderMyPlaylists();
            showToast(`Successfully imported playlist: ${pname}`);
            openCustomPlaylistView(state.customPlaylists[state.customPlaylists.length - 1]);
        } else {
            showToast('Failed to import playlist or no valid songs found.');
        }
    }

    async function shortenUrl(longUrl) {
        try {
            const response = await fetch(`https://is.gd/create.php?format=json&url=${encodeURIComponent(longUrl)}`);
            const data = await response.json();
            return data.shorturl || longUrl;
        } catch (e) {
            console.warn('URL shortener failed, returning long URL.', e);
            return longUrl;
        }
    }

    // =============================================
    // STATE PERSISTENCE
    // =============================================
    async function syncToFirestore() {
        if (!auth || !auth.currentUser || !db) return;
        try {
            const userRef = doc(db, 'users', auth.currentUser.uid);
            await setDoc(userRef, {
                likedSongs: state.likedSongs,
                customPlaylists: state.customPlaylists
            }, { merge: true });
        } catch (e) {
            console.warn('Failed to sync to Firestore:', e);
        }
    }

    function saveState() {
        try {
            const data = {
                currentSong: state.currentSong,
                queue: state.queue,
                currentIndex: state.currentIndex,
                volume: state.volume,
                isMuted: state.isMuted,
                isShuffled: state.isShuffled,
                repeatMode: state.repeatMode,
                likedSongs: state.likedSongs,
                customPlaylists: state.customPlaylists,
                downloadedSongs: state.downloadedSongs
            };
            localStorage.setItem('chikooMusicState', JSON.stringify(data));
            syncToFirestore();
        } catch (e) {
            console.warn('Failed to save state:', e);
        }
    }

    function loadPersistedState() {
        try {
            const stored = localStorage.getItem('chikooMusicState');
            if (stored) {
                const data = JSON.parse(stored);

                // Restore volume
                if (typeof data.volume === 'number') {
                    state.volume = data.volume;
                    state.previousVolume = data.volume > 0 ? data.volume : 1;
                    elements.audio.volume = data.volume;
                    elements.volumeSlider.value = data.volume;
                }

                // Restore mute
                if (typeof data.isMuted === 'boolean') {
                    state.isMuted = data.isMuted;
                    elements.audio.muted = data.isMuted;
                    if (data.isMuted) {
                        elements.volumeSlider.value = 0;
                    }
                }

                // Restore shuffle/repeat
                if (typeof data.isShuffled === 'boolean') state.isShuffled = data.isShuffled;
                if (data.repeatMode) state.repeatMode = data.repeatMode;

                // Restore liked songs & playlists
                if (Array.isArray(data.likedSongs)) state.likedSongs = data.likedSongs;
                if (Array.isArray(data.customPlaylists)) state.customPlaylists = data.customPlaylists;
                if (Array.isArray(data.downloadedSongs)) state.downloadedSongs = data.downloadedSongs;

                // Restore current song (without autoplay)
                if (data.currentSong && data.queue && data.queue.length > 0) {
                    state.queue = data.queue;
                    state.currentIndex = data.currentIndex || 0;
                    playSong(data.currentSong, false);
                }
            }
        } catch (e) {
            console.warn('Failed to restore state:', e);
        }
    }

    // =============================================
    // BANNER VIDEO
    // =============================================
    function initBannerVideo() {
        if (!elements.bannerVideo) return;

        const videoList = [
            'video1.mp4', 'video2.mp4', 'video3.mp4', 'video4.mp4', 'video5.mp4', 'video6.mp4', 'video7.mp4', 'video8.mp4'
        ];

        // Ensure global synchronization across all clients
        function getGlobalVideoIndex() {
            const now = Date.now();
            const currentHour = Math.floor(now / 3600000);
            return currentHour % videoList.length;
        }

        let currentIndex = getGlobalVideoIndex();

        // Optional Firebase sync if owner forces a change
        if (db) {
            import("https://www.gstatic.com/firebasejs/10.9.0/firebase-firestore.js").then(({ doc, onSnapshot }) => {
                onSnapshot(doc(db, 'global_state', 'banner'), (docSnap) => {
                    if (docSnap.exists()) {
                        const data = docSnap.data();
                        if (data.index !== undefined && data.index < videoList.length) {
                            currentIndex = data.index;
                            elements.bannerVideo.src = `videos/${videoList[currentIndex]}`;
                            elements.bannerVideo.load();
                            if (document.getElementById('profile-modal')?.classList.contains('open')) {
                                elements.bannerVideo.play().catch(() => {});
                            }
                        }
                    }
                });
            }).catch(() => {});
        }

        // Calculate time until next hour to sync the update automatically
        const now = Date.now();
        const msUntilNextHour = 3600000 - (now % 3600000);

        if (window.bannerVideoTimer) clearTimeout(window.bannerVideoTimer);
        window.bannerVideoTimer = setTimeout(() => {
            initBannerVideo();
        }, msUntilNextHour);

        let errorCount = 0;
        elements.bannerVideo.onerror = () => {
            console.warn('Video not found, skipping to next');
            errorCount++;
            if (errorCount >= videoList.length) {
                console.error('All banner videos failed to load.');
                return;
            }
            currentIndex = (currentIndex + 1) % videoList.length;
            elements.bannerVideo.src = `videos/${videoList[currentIndex]}`;
            elements.bannerVideo.load();
            if (document.getElementById('profile-modal')?.classList.contains('open')) {
                elements.bannerVideo.play().catch(() => { });
            }
        };

        elements.bannerVideo.onloadeddata = () => {
            errorCount = 0; // Reset on success
        };

        elements.bannerVideo.src = `videos/${videoList[currentIndex]}`;
        elements.bannerVideo.load();
    }

    // =============================================
    // THEME
    // =============================================
    function toggleTheme() {
        state.theme = state.theme === 'dark' ? 'light' : 'dark';
        document.documentElement.setAttribute('data-theme', state.theme);
        updateThemeIcon();
    }

    function loadTheme() {
        document.documentElement.setAttribute('data-theme', state.theme);
        updateThemeIcon();
    }

    function updateThemeIcon() {
        if (elements.themeIcon) {
            elements.themeIcon.className = state.theme === 'dark'
                ? 'fa-solid fa-sun'
                : 'fa-solid fa-moon';
        }
        const mobileThemeIcon = document.querySelector('#mobile-theme-btn i');
        if (mobileThemeIcon) {
            mobileThemeIcon.className = state.theme === 'dark'
                ? 'fa-solid fa-sun'
                : 'fa-solid fa-moon';
        }
    }

    // =============================================
    // NAVIGATION
    // =============================================
    function switchView(viewId) {
        elements.navLinks.forEach(link => {
            link.classList.toggle('active', link.dataset.page === viewId);
        });
        elements.views.forEach(view => {
            view.classList.toggle('active', view.id === `view-${viewId}`);
        });

        if (viewId === 'playlists') {
            document.querySelector('#view-playlists .playlist-title').textContent = 'Liked Songs';
            document.querySelector('#view-playlists .playlist-cover i').className = 'fa-solid fa-heart';
            renderLikedSongs();
        } else if (viewId === 'my-playlists') {
            renderMyPlaylists();
        } 
        
        // Hide share button when navigating away from a custom playlist
        const shareBtn = document.getElementById('share-playlist-btn');
        if (shareBtn && viewId !== 'playlists') {
            shareBtn.style.display = 'none';
        } else if (shareBtn && viewId === 'playlists') {
            // It might be the liked songs view, so check if title is "Liked Songs"
            const title = document.querySelector('#view-playlists .playlist-title').textContent;
            if (title === 'Liked Songs') {
                shareBtn.style.display = 'none';
            }
        } else if (viewId === 'admin') {
            loadAdminData();
        } else if (viewId === 'downloads') {
            // ...
        }
    }

    // =============================================
    // SKELETON LOADERS
    // =============================================
    function showSkeletons(container, count = 8) {
        if (!container) return;
        container.innerHTML = '';
        for (let i = 0; i < count; i++) {
            const skeleton = document.createElement('div');
            skeleton.className = 'skeleton-card';
            skeleton.innerHTML = `
                <div class="skeleton-img"></div>
                <div class="skeleton-title"></div>
                <div class="skeleton-artist"></div>
            `;
            container.appendChild(skeleton);
        }
    }

    function showLoader() {
        if (elements.loader) elements.loader.style.display = 'flex';
    }

    function hideLoader() {
        if (elements.loader) elements.loader.style.display = 'none';
    }

    function showToast(message) {
        let toast = document.getElementById('toast-notification');
        if (!toast) {
            toast = document.createElement('div');
            toast.id = 'toast-notification';
            toast.style.cssText = `
                position: fixed; bottom: 120px; left: 50%; transform: translateX(-50%);
                background: var(--accent-purple); color: white; padding: 12px 24px;
                border-radius: 8px; font-size: 14px; font-weight: 600;
                box-shadow: 0 4px 16px rgba(183, 33, 255, 0.4); z-index: 1000;
                opacity: 0; transition: opacity 0.3s ease; pointer-events: none;
            `;
            document.body.appendChild(toast);
        }
        toast.textContent = message;
        toast.style.opacity = '1';
        
        if (toast.timeoutId) clearTimeout(toast.timeoutId);
        toast.timeoutId = setTimeout(() => {
            toast.style.opacity = '0';
        }, 3000);
    }

    // =============================================
    // RENDERING
    // =============================================
    function formatDuration(seconds) {
        if (!seconds || isNaN(seconds)) return '';
        const mins = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
    }

    function renderArtistGrid(artists, container) {
        if (!container) return;
        container.innerHTML = '';
        if (!artists || artists.length === 0) {
            container.innerHTML = `<div class="placeholder-text">No artists found.</div>`;
            return;
        }

        artists.forEach(artist => {
            const card = document.createElement('button');
            card.className = 'artist-card reveal';
            card.innerHTML = `
                <div class="artist-img-wrapper">
                    <img src="${artist.image}" alt="${artist.name}" class="artist-img" loading="lazy" onerror="this.onerror=null; this.src='https://ui-avatars.com/api/?name=${encodeURIComponent(artist.name)}&background=212121&color=fff&size=200';">
                </div>
                <h3 class="artist-title">${artist.name}</h3>
            `;
            card.addEventListener('click', () => {
                openArtistView(artist);
            });
            container.appendChild(card);
            
            if (typeof revealObserver !== 'undefined') {
                revealObserver.observe(card);
            }
        });
    }

    async function openArtistView(artist) {
        switchView('artist');
        document.getElementById('artist-title').textContent = artist.name;
        document.getElementById('artist-image').src = artist.image;
        document.getElementById('artist-meta').textContent = 'Top Tracks';
        
        const listContainer = document.getElementById('artist-songs-list');
        listContainer.innerHTML = '<div class="loading-spinner"><div class="loading-dots"><span></span><span></span><span></span></div></div>';
        
        try {
            // Fetch multiple pages to ensure we get 100+ songs for the artist
            const fetchPromises = [
                AirbeatsAPI.searchSongs(artist.query, 50, 1),
                AirbeatsAPI.searchSongs(artist.query, 50, 2),
                AirbeatsAPI.searchSongs(artist.query, 50, 3)
            ];
            
            const results = await Promise.all(fetchPromises);
            let rawSongs = [];
            results.forEach(res => {
                if (res && res.length > 0) {
                    rawSongs = rawSongs.concat(res);
                }
            });
            
            // Filter strictly by artist name to ensure only their songs show up
            const artistNameLower = artist.name.toLowerCase();
            let songs = rawSongs.filter(song => {
                const artistsStr = (song.artists?.primary?.map(a => a.name).join(', ') || '').toLowerCase();
                return artistsStr.includes(artistNameLower);
            });
            
            // If filtering removes everything, fallback to raw (maybe it's an alias or group)
            if (songs.length === 0 && rawSongs.length > 0) {
                songs = rawSongs;
            }

            // Cap to 120 to keep UI clean
            songs = songs.slice(0, 120);

            listContainer.innerHTML = '';
            
            if (!songs || songs.length === 0) {
                listContainer.innerHTML = '<div class="placeholder-text">No tracks found.</div>';
                return;
            }
            
            songs.forEach((song, index) => {
                const item = document.createElement('div');
                item.className = 'track-item reveal';
                item.style.animationDelay = `${index * 0.05}s`;
                
                const imgObj = song.image?.find(img => img.quality === '150x150') || song.image?.[0];
                const imgUrl = imgObj?.url || imgObj?.link || 'MARINE LOGO FINAL.png';
                const artists = song.artists?.primary?.map(a => a.name).join(', ') || 'Unknown Artist';
                
                item.innerHTML = `
                    <div class="track-number">${index + 1}</div>
                    <img src="${imgUrl}" alt="${song.name}" class="track-img" loading="lazy">
                    <div class="track-info">
                        <div class="track-name">${song.name}</div>
                        <div class="track-artist">${artists}</div>
                    </div>
                    <button class="track-play-btn"><i class="fa-solid fa-play"></i></button>
                    <button class="track-like-btn ${state.likedSongs.includes(song.id) ? 'liked' : ''}" data-id="${song.id}">
                        <i class="${state.likedSongs.includes(song.id) ? 'fa-solid' : 'fa-regular'} fa-heart"></i>
                    </button>
                `;
                
                item.querySelector('.track-play-btn').addEventListener('click', () => playSong(song, songs, index));
                item.querySelector('.track-like-btn').addEventListener('click', (e) => {
                    e.stopPropagation();
                    toggleLike(song.id, item.querySelector('.track-like-btn'));
                });
                
                listContainer.appendChild(item);

                if (typeof revealObserver !== 'undefined') {
                    revealObserver.observe(item);
                }
            });
        } catch (e) {
            console.error(e);
            listContainer.innerHTML = '<div class="placeholder-text">Failed to load tracks.</div>';
        }
    }

    function renderSongs(songs, container, isHistory = false, append = false) {
        if (!container) return;
        
        if (!append) {
            container.innerHTML = '';
        }

        if (!songs || songs.length === 0) {
            if (!append) {
                let msg = isHistory ? "You haven't downloaded any songs yet." : "No songs found for this category.";
                if (state.dashboardPage > 1 && !isHistory) msg = "No more songs found.";
                container.innerHTML = `<div class="placeholder-text">${msg}</div>`;
            }
            return;
        }

        songs.forEach(song => {
            const artists = song.artists?.primary?.map(a => a.name).join(', ') || 'Unknown Artist';
            const imgObj = song.image?.find(img => img.quality === '500x500') || song.image?.[song.image.length - 1];
            const imgUrl = imgObj?.url || imgObj?.link || 'MARINE LOGO FINAL.png';
            const duration = song.duration ? formatDuration(song.duration) : '';
            
            // Check if we are inside a custom playlist (by checking if context was passed)
            const isCustomPlaylist = typeof isHistory === 'string' && isHistory.startsWith('playlist:');
            const playlistId = isCustomPlaylist ? isHistory.split(':')[1] : null;

            const card = document.createElement('div');
            card.className = 'song-card reveal';
            
            let buttonsHtml = `
                <button class="play-overlay-btn btn-play-card" title="Play"><i class="fa-solid fa-play"></i></button>
                <button class="play-overlay-btn btn-queue-card" title="Add to Queue" style="width: 36px; height: 36px; font-size: 14px;"><i class="fa-solid fa-indent"></i></button>
            `;
            
            if (isCustomPlaylist) {
                buttonsHtml += `<button class="play-overlay-btn btn-remove-card" title="Remove from Playlist" style="width: 36px; height: 36px; font-size: 14px;"><i class="fa-solid fa-trash"></i></button>`;
            } else {
                buttonsHtml += `<button class="play-overlay-btn btn-add-card" title="Add to Playlist" style="width: 36px; height: 36px; font-size: 14px;"><i class="fa-solid fa-folder-plus"></i></button>`;
            }
            
            if (state.user && state.user.role === 'owner') {
                buttonsHtml += `<button class="play-overlay-btn btn-devs-fav-card" title="Add to Devs Favs" style="width: 36px; height: 36px; font-size: 14px; color: gold;"><i class="fa-solid fa-star"></i></button>`;
            }

            card.innerHTML = `
                <div class="card-img-wrapper">
                    <img src="${imgUrl}" alt="${song.name}" class="card-img" loading="lazy">
                    <div class="play-overlay">
                        ${buttonsHtml}
                    </div>
                </div>
                <div class="card-content">
                    <h3 class="card-title">${song.name}</h3>
                    <p class="card-artist">${artists}</p>
                    <p class="card-duration">${duration}</p>
                </div>
            `;

            const playBtn = card.querySelector('.btn-play-card');
            if(playBtn) playBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                setQueue(songs, song);
            });

            const addBtn = card.querySelector('.btn-add-card');
            if(addBtn) addBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                openPlaylistSelectionModal(song);
            });
            
            const removeBtn = card.querySelector('.btn-remove-card');
            if(removeBtn) removeBtn.addEventListener('click', async (e) => {
                e.stopPropagation();
                const pl = state.customPlaylists.find(p => p.id === playlistId);
                if (pl) {
                    pl.songs = pl.songs.filter(s => s.id !== song.id);
                    saveState();
                    showToast('Removed from playlist');
                    openCustomPlaylistView(pl); // re-render
                }
            });

            const qBtn = card.querySelector('.btn-queue-card');
            if(qBtn) qBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                addToQueue(song);
                showToast('Added to queue');
            });

            const devBtn = card.querySelector('.btn-devs-fav-card');
            if(devBtn) devBtn.addEventListener('click', async (e) => {
                e.stopPropagation();
                try {
                    const { doc, getDoc, setDoc } = await import("https://www.gstatic.com/firebasejs/10.9.0/firebase-firestore.js");
                    const snap = await getDoc(doc(db, 'global_state', 'devs_favs'));
                    const existingSongs = snap.exists() ? (snap.data().songs || []) : [];
                    if (!existingSongs.find(s => s.id === song.id)) {
                        const cleanSong = JSON.parse(JSON.stringify(song));
                        existingSongs.unshift(cleanSong);
                        await setDoc(doc(db, 'global_state', 'devs_favs'), { songs: existingSongs }, { merge: true });
                        showToast('Song added to Devs Favs!');
                        if (typeof loadCurrentDevsFavs === 'function') loadCurrentDevsFavs();
                    } else {
                        showToast('Song already exists in Devs Favs');
                    }
                } catch (err) {
                    console.error('Failed to add to devs favs:', err);
                    showToast('Failed: Check Firestore Rules');
                }
            });

            card.addEventListener('click', () => setQueue(songs, song));
            container.appendChild(card);
            if (typeof revealObserver !== 'undefined') {
                revealObserver.observe(card);
            }
        });
    }

    async function renderLikedSongs() {
        const fullSongs = [];
        for (const id of state.likedSongs) {
            const songInfo = await AirbeatsAPI.getSongDetails(id);
            if (songInfo && songInfo.length > 0) {
                fullSongs.push(songInfo[0]);
            }
        }
        
        elements.likedCount.textContent = `${fullSongs.length} songs`;
        
        if (fullSongs.length === 0) {
            elements.likedSongsList.innerHTML = `<div class="placeholder-text">You haven't liked any songs yet.</div>`;
            return;
        }

        renderSongs(fullSongs, elements.likedSongsList, true);
    }

    // =============================================
    // CUSTOM PLAYLISTS
    // =============================================
    function renderMyPlaylists() {
        if (!elements.myPlaylistsGrid) return;
        
        if (state.customPlaylists.length === 0) {
            elements.myPlaylistsGrid.innerHTML = `<div class="placeholder-text">You haven't created any playlists yet.</div>`;
            return;
        }

        elements.myPlaylistsGrid.innerHTML = '';
        state.customPlaylists.forEach((playlist, index) => {
            const card = document.createElement('div');
            card.className = 'song-card';
            
            const colors = ['#8A2BE2', '#4169E1', '#FF69B4', '#00CED1', '#FF7F50'];
            const color = colors[index % colors.length];

            card.innerHTML = `
                <div class="card-img-wrapper" style="background: linear-gradient(135deg, ${color}, #121212);">
                    <div style="position: absolute; top: 0; left: 0; width: 100%; height: 100%; display: flex; align-items: center; justify-content: center; font-size: 48px; color: white; opacity: 0.8;">
                        <i class="fa-solid fa-list-ul"></i>
                    </div>
                </div>
                <div class="card-content">
                    <h3 class="card-title">${playlist.name}</h3>
                    <p class="card-artist">${playlist.songs.length} songs</p>
                </div>
            `;

            card.addEventListener('click', () => {
                openCustomPlaylistView(playlist);
            });

            elements.myPlaylistsGrid.appendChild(card);
        });
    }

    function openCustomPlaylistView(playlist) {
        switchView('playlists');
        document.querySelector('#view-playlists .playlist-title').textContent = playlist.name;
        document.querySelector('#view-playlists .playlist-cover i').className = 'fa-solid fa-list-ul';
        elements.likedCount.textContent = `${playlist.songs.length} songs`;
        
        const shareBtn = document.getElementById('share-playlist-btn');
        if (shareBtn) {
            shareBtn.style.display = 'inline-block';
            shareBtn.onclick = async () => {
                const originalText = shareBtn.innerHTML;
                shareBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Generating...';
                
                const songIds = playlist.songs.map(s => s.id).join(',');
                const longUrl = `${window.location.origin}${window.location.pathname}?pname=${encodeURIComponent(playlist.name)}&psongs=${songIds}`;
                
                const shortUrl = await shortenUrl(longUrl);
                
                navigator.clipboard.writeText(shortUrl).then(() => {
                    showToast('Shareable link copied to clipboard!');
                }).catch(() => {
                    alert('Copy this link to share: ' + shortUrl);
                });
                
                shareBtn.innerHTML = originalText;
            };
        }
        const deleteBtn = document.getElementById('delete-playlist-btn');
        if (deleteBtn) {
            deleteBtn.style.display = 'inline-block';
            deleteBtn.onclick = () => {
                if(confirm('Are you sure you want to delete this playlist?')) {
                    state.customPlaylists = state.customPlaylists.filter(p => p.id !== playlist.id);
                    saveState();
                    showToast('Playlist deleted');
                    switchView('my-playlists');
                }
            };
        }
        
        if (playlist.songs.length === 0) {
            elements.likedSongsList.innerHTML = `<div class="placeholder-text">This playlist is empty.</div>`;
            return;
        }
        
        renderSongs(playlist.songs, elements.likedSongsList, `playlist:${playlist.id}`);
    }

    function openPlaylistSelectionModal(song) {
        if (!elements.playlistSelectionModal || !elements.playlistOptionsList) return;
        
        elements.playlistOptionsList.innerHTML = '';
        
        if (state.customPlaylists.length === 0) {
            elements.playlistOptionsList.innerHTML = `<p style="color: #aaa; text-align: center; margin-top: 20px;">No playlists found.</p>`;
        } else {
            state.customPlaylists.forEach(playlist => {
                const btn = document.createElement('button');
                btn.className = 'filter-btn';
                btn.style.width = '100%';
                btn.style.textAlign = 'left';
                btn.textContent = playlist.name;
                
                btn.addEventListener('click', () => {
                    if (!playlist.songs.some(s => s.id === song.id)) {
                        playlist.songs.push(song);
                        saveState();
                    }
                    elements.playlistSelectionModal.classList.remove('open');
                });
                
                elements.playlistOptionsList.appendChild(btn);
            });
        }
        
        elements.playlistSelectionModal.classList.add('open');
    }

    function addToQueue(song) {
        if (!state.queue) state.queue = [];
        state.queue.push(song);
        showToast(`Added to queue: ${song.name}`);
    }

    function setQueue(songs, currentSong) {
        state.queue = [...songs];
        state.currentIndex = state.queue.findIndex(s => s.id === currentSong.id);
        playSong(currentSong);
    }

    // =============================================
    // AUDIO PLAYER — CORE
    // =============================================
    function playSong(song, autoPlay = true) {
        if (!song) return;
        state.currentSong = song;
        
        const pb = document.getElementById('player-bar');
        if (pb) pb.classList.remove('hidden');
        document.body.classList.add('player-active');

        const streamUrlObj = song.downloadUrl?.find(u => u.quality === '320kbps')
            || song.downloadUrl?.[song.downloadUrl.length - 1];
        const streamUrl = streamUrlObj?.url || streamUrlObj?.link;

        if (!streamUrl) {
            console.warn('No audio stream available for:', song.name);
            alert("Sorry, audio stream not available for this track.");
            return;
        }

        const artists = song.artists?.primary?.map(a => a.name).join(', ') || 'Unknown Artist';
        const imgObj = song.image?.find(img => img.quality === '500x500') || song.image?.[song.image.length - 1];
        const imgUrl = imgObj?.url || imgObj?.link || 'MARINE LOGO FINAL.png';

        // Update mini player UI
        elements.npImage.src = imgUrl;
        elements.npTitle.innerHTML = song.name;
        elements.npArtist.textContent = artists;

        // Update fullscreen player UI
        if (elements.fsImage) elements.fsImage.src = imgUrl;
        if (elements.fsTitle) elements.fsTitle.innerHTML = song.name;
        if (elements.fsArtist) elements.fsArtist.textContent = artists;

        // Set fullscreen background blur
        if (elements.fsBgBlur) {
            elements.fsBgBlur.style.backgroundImage = `url(${imgUrl})`;
        }

        // Update like button state
        updateLikeUI();

        // Set audio source (preserves volume/mute state automatically)
        elements.audio.src = streamUrl;
        setupMediaSession(song, artists, imgUrl);
        saveState();

        if (autoPlay) {
            elements.audio.play()
                .then(() => {
                    state.isPlaying = true;
                    updatePlayBtnUI();
                    updateCoverAnimation();
                })
                .catch(err => {
                    console.warn('Playback blocked by browser:', err.message);
                    state.isPlaying = false;
                    updatePlayBtnUI();
                    updateCoverAnimation();
                });
        } else {
            state.isPlaying = false;
            updatePlayBtnUI();
            updateCoverAnimation();
        }
    }

    function togglePlay() {
        if (!state.currentSong) return;

        if (state.isPlaying) {
            elements.audio.pause();
            state.isPlaying = false;
        } else {
            elements.audio.play()
                .then(() => {
                    state.isPlaying = true;
                    updatePlayBtnUI();
                    updateCoverAnimation();
                })
                .catch(err => {
                    console.warn('Play failed:', err.message);
                });
            return; // UI update happens in .then()
        }
        updatePlayBtnUI();
        updateCoverAnimation();
    }

    async function playNext() {
        if (state.queue.length === 0) return;

        if (state.isShuffled) {
            // Random next, but not the same song
            let nextIndex;
            do {
                nextIndex = Math.floor(Math.random() * state.queue.length);
            } while (nextIndex === state.currentIndex && state.queue.length > 1);
            state.currentIndex = nextIndex;
        } else if (state.currentIndex < state.queue.length - 1) {
            state.currentIndex++;
        } else if (state.repeatMode === 'all') {
            state.currentIndex = 0;
        } else {
            // Autoplay Similar Songs based on last played artist
            const currentSong = state.queue[state.currentIndex];
            const artistName = currentSong?.artists?.primary?.[0]?.name || '';
            if (artistName) {
                showToast(`Autoplaying similar songs...`);
                try {
                    const similarSongs = await AirbeatsAPI.searchSongs(`${artistName} songs`, 10);
                    // Filter out songs that are already in the queue
                    const newSongs = similarSongs.filter(s => !state.queue.some(qs => qs.id === s.id));
                    if (newSongs.length > 0) {
                        state.queue.push(...newSongs);
                        state.currentIndex++;
                        renderQueue();
                        playSong(state.queue[state.currentIndex]);
                        return;
                    }
                } catch (e) {
                    console.error("Autoplay failed:", e);
                }
            }
            return; // End of queue, no repeat
        }
        playSong(state.queue[state.currentIndex]);
    }

    function playPrev() {
        if (state.queue.length === 0 && !state.currentSong) return;

        // If more than 3 seconds in, restart current track
        if (elements.audio.currentTime > 3) {
            elements.audio.currentTime = 0;
            return;
        }

        if (state.currentIndex > 0) {
            state.currentIndex--;
            playSong(state.queue[state.currentIndex]);
        } else if (state.repeatMode === 'all') {
            state.currentIndex = state.queue.length - 1;
            playSong(state.queue[state.currentIndex]);
        } else if (state.currentSong) {
            elements.audio.currentTime = 0;
        }
    }

    // =============================================
    // UI SYNC HELPERS
    // =============================================
    function updatePlayBtnUI() {
        const iconClass = state.isPlaying ? 'fa-pause' : 'fa-play';
        if (elements.playBtn) elements.playBtn.innerHTML = `<i class="fa-solid ${iconClass}"></i>`;
        if (elements.fsPlayBtn) elements.fsPlayBtn.innerHTML = `<i class="fa-solid ${iconClass}"></i>`;
    }

    function updateCoverAnimation() {
        if (state.isPlaying) {
            elements.npImage.classList.add('playing');
            if (elements.fsImage) elements.fsImage.classList.add('playing');
        } else {
            elements.npImage.classList.remove('playing');
            if (elements.fsImage) elements.fsImage.classList.remove('playing');
        }
    }

    function formatTime(seconds) {
        if (isNaN(seconds)) return "0:00";
        const mins = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
    }

    // =============================================
    // VOLUME CONTROL — PROPERLY SYNCED
    // =============================================
    function setVolume(val) {
        val = Math.max(0, Math.min(1, val));
        state.volume = val;
        elements.audio.volume = val;

        if (val === 0) {
            state.isMuted = true;
            elements.audio.muted = true;
        } else {
            state.isMuted = false;
            elements.audio.muted = false;
            state.previousVolume = val;
        }

        syncVolumeUI();
        saveState();
    }

    function toggleMute() {
        if (state.isMuted) {
            // Unmute — restore previous volume
            const restoreVol = state.previousVolume > 0 ? state.previousVolume : 1;
            state.isMuted = false;
            elements.audio.muted = false;
            elements.audio.volume = restoreVol;
            state.volume = restoreVol;
            elements.volumeSlider.value = restoreVol;
        } else {
            // Mute — save current volume then mute
            state.previousVolume = state.volume > 0 ? state.volume : 1;
            state.isMuted = true;
            elements.audio.muted = true;
            elements.volumeSlider.value = 0;
        }
        syncVolumeUI();
        saveState();
    }

    function syncVolumeUI() {
        const vol = state.isMuted ? 0 : state.volume;
        let iconClass;

        if (state.isMuted || vol === 0) {
            iconClass = 'fa-solid fa-volume-xmark';
        } else if (vol < 0.5) {
            iconClass = 'fa-solid fa-volume-low';
        } else {
            iconClass = 'fa-solid fa-volume-high';
        }

        if (elements.volumeIcon) elements.volumeIcon.className = iconClass;
        if (!state.isMuted) {
            elements.volumeSlider.value = state.volume;
        }
    }

    // =============================================
    // SHUFFLE & REPEAT
    // =============================================
    function toggleShuffle() {
        state.isShuffled = !state.isShuffled;
        syncShuffleRepeatUI();
        saveState();
    }

    function toggleRepeat() {
        // Cycle: none -> all -> one -> none
        if (state.repeatMode === 'none') {
            state.repeatMode = 'all';
        } else if (state.repeatMode === 'all') {
            state.repeatMode = 'one';
        } else {
            state.repeatMode = 'none';
        }
        syncShuffleRepeatUI();
        saveState();
    }

    function syncShuffleRepeatUI() {
        if (elements.shuffleBtn) {
            elements.shuffleBtn.classList.toggle('active', state.isShuffled);
        }
        if (elements.fsShuffleBtn) {
            elements.fsShuffleBtn.classList.toggle('active', state.isShuffled);
        }
        
        const setRepeatIcon = (btn, mode) => {
            if (!btn) return;
            btn.classList.remove('active');
            if (mode === 'all') {
                btn.classList.add('active');
                btn.innerHTML = '<i class="fa-solid fa-repeat"></i>';
            } else if (mode === 'one') {
                btn.classList.add('active');
                btn.innerHTML = '<i class="fa-solid fa-repeat"></i><span style="position:absolute;font-size:8px;font-weight:700;color:var(--accent-purple);">1</span>';
            } else {
                btn.innerHTML = '<i class="fa-solid fa-repeat"></i>';
            }
        };

        setRepeatIcon(elements.repeatBtn, state.repeatMode);
        setRepeatIcon(elements.fsRepeatBtn, state.repeatMode);
    }

    function renderQueueUI() {
        if (!elements.queueList) return;
        elements.queueList.innerHTML = '';
        if (!state.queue || state.queue.length === 0) {
            elements.queueList.innerHTML = '<div class="placeholder-text">Your queue is empty.</div>';
            return;
        }

        state.queue.forEach((song, index) => {
            const item = document.createElement('div');
            item.className = 'queue-item';
            if (index === state.currentIndex) {
                item.classList.add('active');
            }
            
            const image = song.image?.[song.image.length - 1]?.url || 'default-cover.jpg';
            const artist = song.artists?.primary?.[0]?.name || 'Unknown Artist';
            
            item.innerHTML = `
                <img src="${image}" alt="Cover">
                <div class="queue-item-info">
                    <div class="queue-item-title">${song.name}</div>
                    <div class="queue-item-artist">${artist}</div>
                </div>
                ${index === state.currentIndex ? '<div class="queue-item-icon"><i class="fa-solid fa-volume-high"></i></div>' : ''}
                <button class="queue-item-delete" style="background: none; border: none; color: var(--text-secondary); cursor: pointer; padding: 5px; margin-left: auto;">
                    <i class="fa-solid fa-xmark"></i>
                </button>
            `;
            
            const deleteBtn = item.querySelector('.queue-item-delete');
            if (deleteBtn) {
                deleteBtn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    state.queue.splice(index, 1);
                    if (state.currentIndex === index) {
                        if (state.queue.length > 0) {
                            if (state.currentIndex >= state.queue.length) state.currentIndex = 0;
                            playSong(state.queue[state.currentIndex]);
                        } else {
                            state.currentSong = null;
                            state.currentIndex = -1;
                            elements.audio.pause();
                            state.isPlaying = false;
                            updatePlayBtnUI();
                            if (elements.npTitle) elements.npTitle.innerHTML = "No track selected";
                            if (elements.npArtist) elements.npArtist.textContent = "-";
                            if (elements.npImage) elements.npImage.src = "MARINE LOGO FINAL.png";
                            if (elements.fsTitle) elements.fsTitle.innerHTML = "No track selected";
                            if (elements.fsArtist) elements.fsArtist.textContent = "-";
                            if (elements.fsImage) elements.fsImage.src = "MARINE LOGO FINAL.png";
                            elements.audio.src = "";
                        }
                    } else if (state.currentIndex > index) {
                        state.currentIndex--;
                    }
                    saveState();
                    renderQueueUI();
                });
            }
            
            item.addEventListener('click', () => {
                state.currentIndex = index;
                playSong(song);
                elements.queueModal.classList.remove('open');
            });
            
            elements.queueList.appendChild(item);
        });
        
        // Scroll to active item
        setTimeout(() => {
            const activeItem = elements.queueList.querySelector('.queue-item.active');
            if (activeItem) {
                activeItem.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }
        }, 50);
    }

    // =============================================
    // LIKE / FAVORITE
    // =============================================
    function toggleLike() {
        if (!state.currentSong) return;
        const id = state.currentSong.id;
        const idx = state.likedSongs.indexOf(id);
        if (idx === -1) {
            state.likedSongs.push(id);
        } else {
            state.likedSongs.splice(idx, 1);
        }
        updateLikeUI();
        saveState();
    }

    function updateLikeUI() {
        if (!state.currentSong) return;
        const isLiked = state.likedSongs.includes(state.currentSong.id);

        if (elements.npLikeBtn) {
            elements.npLikeBtn.innerHTML = isLiked
                ? '<i class="fa-solid fa-heart"></i>'
                : '<i class="fa-regular fa-heart"></i>';
            elements.npLikeBtn.classList.toggle('liked', isLiked);
        }
        if (elements.fsLikeBtn) {
            elements.fsLikeBtn.innerHTML = isLiked
                ? '<i class="fa-solid fa-heart"></i>'
                : '<i class="fa-regular fa-heart"></i>';
            elements.fsLikeBtn.classList.toggle('liked', isLiked);
        }
    }

    // =============================================
    // DOWNLOAD — PROPER BLOB DOWNLOAD
    // =============================================
    async function downloadCurrentSong() {
        if (!state.currentSong) return;

        // Save to downloaded state
        if (!state.downloadedSongs.some(s => s.id === state.currentSong.id)) {
            state.downloadedSongs.push(state.currentSong);
            saveState();
            // If we are currently on the downloads tab, reload it
            if (document.getElementById('view-downloads').classList.contains('active')) {
                loadDownloads();
            }
        }

        const streamUrlObj = state.currentSong.downloadUrl?.find(u => u.quality === '320kbps')
            || state.currentSong.downloadUrl?.[state.currentSong.downloadUrl.length - 1];
        const streamUrl = streamUrlObj?.url || streamUrlObj?.link;

        if (!streamUrl) {
            alert('Download not available for this track.');
            return;
        }

        const originalHTML = elements.btnDownload.innerHTML;
        elements.btnDownload.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i>';
        elements.btnDownload.disabled = true;

        try {
            const response = await fetch(streamUrl);
            if (!response.ok) throw new Error(`HTTP ${response.status}`);

            const blob = await response.blob();
            const blobUrl = URL.createObjectURL(blob);

            const a = document.createElement('a');
            a.href = blobUrl;
            const cleanName = state.currentSong.name
                .replace(/&quot;/g, '')
                .replace(/&amp;/g, '&')
                .replace(/[<>:"/\\|?*]+/g, '');
            a.download = `${cleanName}.m4a`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);

            setTimeout(() => URL.revokeObjectURL(blobUrl), 1000);
        } catch (err) {
            console.error('Direct download failed:', err);
            window.open(streamUrl, '_blank');
        } finally {
            elements.btnDownload.innerHTML = originalHTML;
            elements.btnDownload.disabled = false;
        }
    }

    // =============================================
    // SEEK
    // =============================================
    function handleSeek(e, bgElement) {
        if (!state.currentSong || !elements.audio.duration) return;
        const rect = bgElement.getBoundingClientRect();
        const clickX = e.clientX - rect.left;
        const percent = Math.max(0, Math.min(1, clickX / rect.width));
        elements.audio.currentTime = percent * elements.audio.duration;
    }

    // =============================================
    // MEDIA SESSION
    // =============================================
    function setupMediaSession(song, artist, coverUrl) {
        if ('mediaSession' in navigator) {
            navigator.mediaSession.metadata = new MediaMetadata({
                title: song.name,
                artist: artist,
                artwork: [{ src: coverUrl, sizes: '500x500', type: 'image/jpeg' }]
            });
            navigator.mediaSession.setActionHandler('play', togglePlay);
            navigator.mediaSession.setActionHandler('pause', togglePlay);
            navigator.mediaSession.setActionHandler('nexttrack', playNext);
            navigator.mediaSession.setActionHandler('previoustrack', playPrev);
        }
    }

    // =============================================
    // LOCAL FILES
    // =============================================
    function handleLocalFiles(e) {
        const files = Array.from(e.target.files).filter(file => file.type.startsWith('audio/'));
        if (files.length === 0) return;

        const localSongs = files.map((file, index) => {
            const url = URL.createObjectURL(file);
            return {
                id: `local-${Date.now()}-${index}`,
                name: file.name.replace(/\.[^/.]+$/, ""),
                artists: { primary: [{ name: 'Local File' }] },
                image: [{ url: 'MARINE LOGO FINAL.png', quality: '500x500' }],
                downloadUrl: [{ url: url, quality: '320kbps' }]
            };
        });

        const existingSongs = state.localSongs || [];
        state.localSongs = [...existingSongs, ...localSongs];

        if (elements.localFilesGrid) {
            renderSongs(state.localSongs, elements.localFilesGrid);
        }
    }

    function loadDownloads() {
        if (!elements.downloadsGrid) return;
        
        if (state.downloadedSongs.length === 0) {
            elements.downloadsGrid.innerHTML = `<div class="placeholder-text">No downloaded songs yet.</div>`;
            return;
        }

        renderSongs(state.downloadedSongs, elements.downloadsGrid, true);
    }

    // =============================================
    // EVENT LISTENERS — SET UP ONCE
    // =============================================
    function setupEventListeners() {
        let isProfileVideoMuted = false;

        // --- Owner Video Controls ---
        const nextBgBtn = document.getElementById('next-bg-video-btn');
        if (nextBgBtn) {
            nextBgBtn.addEventListener('click', async () => {
                if (!elements.bannerVideo) return;
                const videoList = [
                    'video1.mp4', 'video2.mp4', 'video3.mp4', 'video4.mp4', 'video5.mp4', 'video6.mp4', 'video7.mp4', 'video8.mp4'
                ];
                
                // Get current URL to figure out next index
                const currentSrc = elements.bannerVideo.src;
                let currentIndex = 0;
                for (let i = 0; i < videoList.length; i++) {
                    if (currentSrc.includes(videoList[i])) {
                        currentIndex = i;
                        break;
                    }
                }
                
                const nextIndex = (currentIndex + 1) % videoList.length;

                // Sync to Firebase if owner
                if (db) {
                    try {
                        const { doc, setDoc } = await import("https://www.gstatic.com/firebasejs/10.9.0/firebase-firestore.js");
                        await setDoc(doc(db, 'global_state', 'banner'), { index: nextIndex }, { merge: true });
                        showToast(`Switched to Video ${nextIndex + 1} for everyone!`);
                    } catch (e) {
                        showToast('Failed to sync video globally');
                        // Fallback local
                        elements.bannerVideo.src = `videos/${videoList[nextIndex]}`;
                        elements.bannerVideo.load();
                        elements.bannerVideo.play().catch(()=>{});
                    }
                }
            });
        }

        // --- Theme ---
        const themeBtns = [elements.themeToggle, document.getElementById('mobile-theme-btn')];
        themeBtns.forEach(btn => {
            if (btn) {
                btn.addEventListener('click', () => {
                    toggleTheme();
                    const mobileOverlayMenu = document.getElementById('mobile-overlay-menu');
                    if (window.innerWidth <= 900 && mobileOverlayMenu) {
                        mobileOverlayMenu.style.display = 'none';
                    }
                });
            }
        });

        // --- Language Selector ---
        const langSelector = document.getElementById('custom-lang-selector');
        const langText = document.getElementById('custom-lang-text');
        const langOptions = document.querySelectorAll('.lang-option');

        if (langSelector) {
            langSelector.addEventListener('click', (e) => {
                e.stopPropagation();
                langSelector.classList.toggle('open');
            });
        }
        
        if (langOptions) {
            langOptions.forEach(opt => {
                opt.addEventListener('click', (e) => {
                    e.stopPropagation();
                    const val = opt.getAttribute('data-value');
                    const text = opt.textContent;
                    
                    langOptions.forEach(o => o.classList.remove('active'));
                    opt.classList.add('active');
                    
                    if (langText) langText.textContent = text;
                    window.currentLanguage = val;
                    if (langSelector) langSelector.classList.remove('open');
                    
                    // Trigger a re-search with the new language
                    const activeBtn = document.querySelector('.quick-option-btn.active');
                    if (activeBtn) activeBtn.click();
                    
                    showToast(`Language set to ${text}`);
                });
            });
        }

        document.addEventListener('click', (e) => {
            if (langSelector && langSelector.classList.contains('open') && !langSelector.contains(e.target)) {
                langSelector.classList.remove('open');
            }
        });

        // --- Navigation ---
        elements.navLinks.forEach(link => {
            link.addEventListener('click', (e) => {
                switchView(e.currentTarget.dataset.page);
            });
        });

        // --- Auth Modals ---
        const authBtns = [elements.authBtn, document.getElementById('mobile-auth-btn')];
        authBtns.forEach(btn => {
            if (btn) {
                btn.addEventListener('click', () => {
                    if (state.token) {
                        if (auth) {
                            signOut(auth).then(() => {
                                state.currentSong = null;
                                state.queue = [];
                                state.currentIndex = -1;
                                elements.audio.pause();
                                const pb = document.getElementById('player-bar');
                                if (pb) pb.classList.add('hidden');
                                document.body.classList.remove('player-active');
                                saveState();
                                showToast('Logged out');
                            });
                        } else {
                            state.token = null;
                            state.user = null;
                            state.currentSong = null;
                            state.queue = [];
                            state.currentIndex = -1;
                            elements.audio.pause();
                            const pb = document.getElementById('player-bar');
                            if (pb) pb.classList.add('hidden');
                            document.body.classList.remove('player-active');
                            saveState();
                            updateAuthUI();
                        }
                    } else {
                        elements.authModal.classList.add('open');
                    }
                    const mobileOverlayMenu = document.getElementById('mobile-overlay-menu');
                    if (window.innerWidth <= 900 && mobileOverlayMenu) {
                        mobileOverlayMenu.style.display = 'none';
                    }
                });
            }
        });
        if (elements.tabLogin && elements.tabRegister) {
            elements.tabLogin.addEventListener('click', () => {
                elements.tabLogin.classList.add('active');
                elements.tabRegister.classList.remove('active');
                elements.formLogin.classList.add('active');
                elements.formRegister.classList.remove('active');
            });
            elements.tabRegister.addEventListener('click', () => {
                elements.tabRegister.classList.add('active');
                elements.tabLogin.classList.remove('active');
                elements.formRegister.classList.add('active');
                elements.formLogin.classList.remove('active');
            });
        }
        if (elements.formLogin) elements.formLogin.addEventListener('submit', handleLogin);
        if (elements.formRegister) elements.formRegister.addEventListener('submit', handleRegister);
        
        const btnForgotPassword = document.getElementById('btn-forgot-password');
        if (btnForgotPassword) {
            btnForgotPassword.addEventListener('click', async (e) => {
                e.preventDefault();
                const email = document.getElementById('login-identifier').value;
                if (!email || !email.includes('@')) {
                    showToast('Please enter your email address in the field first.');
                    return;
                }
                try {
                    await sendPasswordResetEmail(auth, email);
                    showToast('Password reset email sent! Check your inbox.');
                } catch (error) {
                    showToast('Error: ' + error.message);
                }
            });
        }
        
        document.querySelectorAll('.btn-maybe-later').forEach(btn => {
            btn.addEventListener('click', () => {
                if (elements.authModal) elements.authModal.classList.remove('open');
            });
        });
        
        if (elements.closeAuthModal) {
            elements.closeAuthModal.addEventListener('click', () => {
                if (elements.authModal) elements.authModal.classList.remove('open');
            });
        }
        
        // Admin View Logic
        // Admin Controls
        const btnRefreshAdmin = document.getElementById('btn-refresh-admin');
        if (btnRefreshAdmin) {
            btnRefreshAdmin.addEventListener('click', loadAdminData);
        }

        const btnBackArtist = document.getElementById('btn-back-artist');
        if (btnBackArtist) {
            btnBackArtist.addEventListener('click', () => {
                switchView('home');
            });
        }

        const btnSendBroadcast = document.getElementById('btn-send-broadcast');
        if (btnSendBroadcast) {
            btnSendBroadcast.addEventListener('click', async () => {
                const input = document.getElementById('broadcast-input');
                if (!input.value) return;
                try {
                    const { doc, setDoc } = await import("https://www.gstatic.com/firebasejs/10.9.0/firebase-firestore.js");
                    await setDoc(doc(db, 'global', 'config'), { broadcastMessage: input.value }, { merge: true });
                    showToast('Broadcast sent successfully!');
                    input.value = '';
                } catch (e) {
                    showToast('Failed to send broadcast');
                }
            });
        }

        initAdminDevsFavs();
        
        async function initAdminDevsFavs() {
            const btnSearch = document.getElementById('btn-search-devs-favs');
            const searchInput = document.getElementById('devs-favs-search-input');
            const searchResults = document.getElementById('devs-favs-search-results');
            const currentList = document.getElementById('devs-favs-current-list');
            
            if (!btnSearch || !currentList) return;

            const loadCurrentDevsFavs = async () => {
                if (!db) return;
                try {
                    const { doc, getDoc } = await import("https://www.gstatic.com/firebasejs/10.9.0/firebase-firestore.js");
                    const snap = await getDoc(doc(db, 'global_state', 'devs_favs'));
                    const songs = snap.exists() ? (snap.data().songs || []) : [];
                    currentList.innerHTML = '';
                    if (songs.length === 0) {
                        currentList.innerHTML = '<span class="placeholder-text" style="font-size: 13px;">No songs in Devs Favs yet.</span>';
                        return;
                    }
                    songs.forEach(song => {
                        const div = document.createElement('div');
                        div.className = 'admin-list-item';
                        const img = song.image?.find(img => img.quality === '150x150') || song.image?.[0];
                        div.innerHTML = `
                            <img src="${img?.url || img?.link || 'MARINE LOGO FINAL.png'}">
                            <div class="admin-list-info">
                                <h4 class="admin-list-title">${song.name}</h4>
                                <p class="admin-list-artist">${song.artists?.primary?.map(a=>a.name).join(', ') || ''}</p>
                            </div>
                            <button class="action-btn" title="Remove" style="color: #ff4757;"><i class="fa-solid fa-trash"></i></button>
                        `;
                        div.querySelector('button').addEventListener('click', async () => {
                            const updatedSongs = songs.filter(s => s.id !== song.id);
                            const { setDoc } = await import("https://www.gstatic.com/firebasejs/10.9.0/firebase-firestore.js");
                            await setDoc(doc(db, 'global_state', 'devs_favs'), { songs: updatedSongs }, { merge: true });
                            showToast('Song removed from Devs Favs!');
                            loadCurrentDevsFavs();
                        });
                        currentList.appendChild(div);
                    });
                } catch (e) {
                    console.error("Error loading devs favs admin", e);
                }
            };
              const devsFavsClearBtn = document.getElementById('devs-favs-clear-btn');
            
            searchInput.addEventListener('input', (e) => {
                if (devsFavsClearBtn) devsFavsClearBtn.style.display = e.target.value.length > 0 ? 'block' : 'none';
            });
            
            searchInput.addEventListener('keydown', (e) => {
                if (e.key === 'Enter') {
                    e.preventDefault();
                    e.target.blur(); // Stop blinking cursor
                    btnSearch.click();
                }
            });

            if (devsFavsClearBtn) {
                devsFavsClearBtn.addEventListener('click', () => {
                    searchInput.value = '';
                    devsFavsClearBtn.style.display = 'none';
                    searchResults.innerHTML = '';
                });
            }

            btnSearch.addEventListener('click', async () => {
                const query = searchInput.value.trim();
                if (!query) return;
                searchResults.innerHTML = '<span style="color: white; font-size: 13px;">Searching...</span>';
                try {
                    const songs = await AirbeatsAPI.searchSongs(query, 5);
                    searchResults.innerHTML = '';
                    if (!songs || songs.length === 0) {
                        searchResults.innerHTML = '<span style="color: white; font-size: 13px;">No results found.</span>';
                        return;
                    }
                    songs.forEach(song => {
                        const div = document.createElement('div');
                        div.className = 'admin-list-item';
                        const img = song.image?.find(img => img.quality === '150x150') || song.image?.[0];
                        div.innerHTML = `
                            <img src="${img?.url || img?.link || 'MARINE LOGO FINAL.png'}">
                            <div class="admin-list-info">
                                <h4 class="admin-list-title">${song.name}</h4>
                                <p class="admin-list-artist">${song.artists?.primary?.map(a=>a.name).join(', ') || ''}</p>
                            </div>
                            <button class="action-btn primary" title="Add"><i class="fa-solid fa-plus"></i></button>
                        `;
                        div.querySelector('button').addEventListener('click', async () => {
                            try {
                                const { doc, getDoc, setDoc } = await import("https://www.gstatic.com/firebasejs/10.9.0/firebase-firestore.js");
                                const snap = await getDoc(doc(db, 'global_state', 'devs_favs'));
                                const existingSongs = snap.exists() ? (snap.data().songs || []) : [];
                                if (!existingSongs.find(s => s.id === song.id)) {
                                    const cleanSong = JSON.parse(JSON.stringify(song));
                                    existingSongs.unshift(cleanSong); // Add to the top so it becomes the Hero Banner!
                                    await setDoc(doc(db, 'global_state', 'devs_favs'), { songs: existingSongs }, { merge: true });
                                    showToast('Song added to Devs Favs!');
                                    loadCurrentDevsFavs();
                                } else {
                                    showToast('Song already exists in Devs Favs');
                                }
                            } catch (e) {
                                console.error('Failed to add to devs favs:', e);
                                showToast('Failed: Check Firestore Rules');
                            }
                        });
                        searchResults.appendChild(div);
                    });
                } catch (e) {
                    searchResults.innerHTML = '<span style="color: #ff4757; font-size: 13px;">Search failed.</span>';
                }
            });
            
            // Re-load when admin tab is opened
            const navAdmin = document.getElementById('nav-admin');
            if (navAdmin) {
                navAdmin.addEventListener('click', loadCurrentDevsFavs);
            }

            // Custom Song Upload Logic
            const btnUploadCustom = document.getElementById('btn-upload-custom-song');
            if (btnUploadCustom) {
                btnUploadCustom.addEventListener('click', async () => {
                    const title = document.getElementById('custom-song-title').value.trim();
                    const artist = document.getElementById('custom-song-artist').value.trim();
                    const audioInput = document.getElementById('custom-song-audio');
                    const imageInput = document.getElementById('custom-song-image');

                    if (!title || !artist || !audioInput.files[0]) {
                        showToast("Title, Artist, and Audio File are required!");
                        return;
                    }

                    if (!storage) {
                        showToast("Storage is not configured.");
                        return;
                    }

                    const audioFile = audioInput.files[0];
                    const imageFile = imageInput.files && imageInput.files[0];
                    
                    btnUploadCustom.disabled = true;
                    const originalText = btnUploadCustom.innerHTML;
                    btnUploadCustom.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i> Uploading...`;

                    try {
                        const { ref, uploadBytes, getDownloadURL } = await import("https://www.gstatic.com/firebasejs/10.9.0/firebase-storage.js");
                        
                        // 1. Upload Audio
                        const audioRef = ref(storage, `custom_songs/audio/${Date.now()}_${audioFile.name}`);
                        await uploadBytes(audioRef, audioFile);
                        const audioUrl = await getDownloadURL(audioRef);

                        // 2. Upload Image (if provided)
                        let imageUrl = 'MARINE LOGO FINAL.png';
                        if (imageFile) {
                            const imageRef = ref(storage, `custom_songs/images/${Date.now()}_${imageFile.name}`);
                            await uploadBytes(imageRef, imageFile);
                            imageUrl = await getDownloadURL(imageRef);
                        }

                        // 3. Create Song Object
                        const customId = 'custom_' + Date.now();
                        const newSong = {
                            id: customId,
                            name: title,
                            type: "song",
                            year: new Date().getFullYear().toString(),
                            duration: 0,
                            language: "custom",
                            hasLyrics: "false",
                            url: "",
                            image: [
                                { quality: "50x50", url: imageUrl },
                                { quality: "150x150", url: imageUrl },
                                { quality: "500x500", url: imageUrl }
                            ],
                            downloadUrl: [
                                { quality: "12kbps", url: audioUrl },
                                { quality: "48kbps", url: audioUrl },
                                { quality: "96kbps", url: audioUrl },
                                { quality: "160kbps", url: audioUrl },
                                { quality: "320kbps", url: audioUrl }
                            ],
                            artists: {
                                primary: [
                                    {
                                        id: "custom_artist",
                                        name: artist,
                                        role: "primary_artists",
                                        image: [],
                                        type: "artist",
                                        url: ""
                                    }
                                ],
                                featured: [],
                                all: [
                                    {
                                        id: "custom_artist",
                                        name: artist,
                                        role: "primary_artists",
                                        image: [],
                                        type: "artist",
                                        url: ""
                                    }
                                ]
                            }
                        };

                        // 4. Save to Devs Favs
                        const { doc, getDoc, setDoc } = await import("https://www.gstatic.com/firebasejs/10.9.0/firebase-firestore.js");
                        const snap = await getDoc(doc(db, 'global_state', 'devs_favs'));
                        const existingSongs = snap.exists() ? (snap.data().songs || []) : [];
                        
                        existingSongs.unshift(newSong);
                        await setDoc(doc(db, 'global_state', 'devs_favs'), { songs: existingSongs }, { merge: true });
                        
                        showToast('Custom song uploaded and added to Devs Favs!');
                        
                        // Clear form
                        document.getElementById('custom-song-title').value = '';
                        document.getElementById('custom-song-artist').value = '';
                        document.getElementById('custom-song-audio').value = '';
                        document.getElementById('custom-song-image').value = '';
                        
                        loadCurrentDevsFavs();
                        
                    } catch (err) {
                        console.error("Upload failed:", err);
                        showToast('Failed: ' + err.message);
                    } finally {
                        btnUploadCustom.disabled = false;
                        btnUploadCustom.innerHTML = originalText;
                    }
                });
            }
        }

        // --- Mobile Options Toggle ---
        const mobileToggleBtn = document.getElementById('mobile-options-toggle');
        const mobileOverlayMenu = document.getElementById('mobile-overlay-menu');
        if (mobileToggleBtn && mobileOverlayMenu) {
            mobileToggleBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                const isShowing = mobileOverlayMenu.style.display === 'flex';
                mobileOverlayMenu.style.display = isShowing ? 'none' : 'flex';
            });
            // Close menu when clicking outside
            document.addEventListener('click', (e) => {
                if (mobileOverlayMenu.style.display === 'flex' && !mobileOverlayMenu.contains(e.target) && !mobileToggleBtn.contains(e.target)) {
                    mobileOverlayMenu.style.display = 'none';
                }
            });
        }
        // --- Quick Options ---
        if (elements.quickOptionBtns) {
            elements.quickOptionBtns.forEach(btn => {
                btn.addEventListener('click', async (e) => {
                    elements.quickOptionBtns.forEach(b => b.classList.remove('active'));
                    e.currentTarget.classList.add('active');

                    // If on mobile, hide the menu after selection
                    const mobileOverlayMenu = document.getElementById('mobile-overlay-menu');
                    if (window.innerWidth <= 900 && mobileOverlayMenu) {
                        mobileOverlayMenu.style.display = 'none';
                    }

                    showSkeletons(elements.trendingGrid, 10);
                    let query = e.currentTarget.getAttribute('data-query');
                    const label = e.currentTarget.textContent.trim();
                    
                    // Reset pagination for dashboard queries
                    state.dashboardPage = 1;
                    state.currentDashboardQuery = query;
                    updateDashboardPaginationUI();

                    const sectionTitle = document.getElementById('section-title');
                    if (sectionTitle) {
                        sectionTitle.textContent = label;
                        sectionTitle.classList.remove('title-enter');
                        void sectionTitle.offsetWidth; // trigger reflow
                        sectionTitle.classList.add('title-enter');
                    }

                    fetchAndRenderDashboardGrid();
                });
            });
        }
        const pagePrevBtn = document.getElementById('page-prev-btn');
        const pageNextBtn = document.getElementById('page-next-btn');
        if (pagePrevBtn) {
            pagePrevBtn.addEventListener('click', () => {
                if (state.dashboardPage > 1) {
                    state.dashboardPage--;
                    updateDashboardPaginationUI();
                    fetchAndRenderDashboardGrid();
                    document.getElementById('trending-grid').scrollIntoView({ behavior: 'smooth' });
                }
            });
        }
        if (pageNextBtn) {
            pageNextBtn.addEventListener('click', () => {
                state.dashboardPage++;
                updateDashboardPaginationUI();
                fetchAndRenderDashboardGrid();
                document.getElementById('trending-grid').scrollIntoView({ behavior: 'smooth' });
            });
        }
        
        // Initialize language state
        window.currentLanguage = window.currentLanguage || 'global';

        // --- Fullscreen Player ---
        if (elements.btnFullscreen) {
            elements.btnFullscreen.addEventListener('click', () => {
                if (state.currentSong && elements.fsPlayer) {
                    elements.fsPlayer.classList.add('open');
                }
            });
        }
        
        if (elements.btnClosePlayer) {
            elements.btnClosePlayer.addEventListener('click', () => {
                if (state.isPlaying) {
                    elements.audio.pause();
                    state.isPlaying = false;
                    updatePlayBtnUI();
                    updateCoverAnimation();
                }
                if (elements.playerBar) elements.playerBar.classList.add('hidden');
                document.body.classList.remove('player-active');
            });
        }
        if (elements.btnCloseFs && elements.fsPlayer) {
            elements.btnCloseFs.addEventListener('click', () => {
                elements.fsPlayer.classList.remove('open');
            });
        }

        // --- Profile Modal ---
        if (elements.profileFabBtn && elements.profileModal) {
            elements.profileFabBtn.addEventListener('click', () => {
                elements.profileModal.classList.add('open');
                if (elements.bannerVideo) {
                    elements.bannerVideo.currentTime = 0;
                    elements.bannerVideo.muted = false; // ensure it starts unmuted
                    if (typeof isProfileVideoMuted !== 'undefined') isProfileVideoMuted = false;
                    const soundBtn = document.getElementById('sound-toggle-btn');
                    if (soundBtn) {
                        soundBtn.querySelector('i').className = 'fa-solid fa-volume-high';
                        soundBtn.querySelector('span').textContent = 'Sound on';
                    }
                    elements.bannerVideo.play().catch(() => { });
                }
            });
        }
        if (elements.closeProfileBtn && elements.profileModal) {
            elements.closeProfileBtn.addEventListener('click', () => {
                elements.profileModal.classList.remove('open');
                if (elements.bannerVideo) {
                    elements.bannerVideo.pause();
                    elements.bannerVideo.currentTime = 0;
                }
            });
        }
        // Close modal by clicking outside the card
        if (elements.profileModal) {
            elements.profileModal.addEventListener('click', (e) => {
                if (e.target === elements.profileModal) {
                    elements.profileModal.classList.remove('open');
                    if (elements.bannerVideo) {
                        elements.bannerVideo.pause();
                        elements.bannerVideo.currentTime = 0;
                    }
                }
            });
        }

        // --- SOUND TOGGLE (Profile Video) ---
        if (elements.soundToggleBtn && elements.bannerVideo) {
            elements.soundToggleBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                e.preventDefault();

                // Toggle the independent state
                isProfileVideoMuted = !isProfileVideoMuted;
                elements.bannerVideo.muted = isProfileVideoMuted;

                // Update UI to reflect the NEW state
                const icon = elements.soundToggleBtn.querySelector('i');
                const text = elements.soundToggleBtn.querySelector('span');
                
                if (isProfileVideoMuted) {
                    icon.className = 'fa-solid fa-volume-xmark';
                    text.textContent = 'Sound off';
                    showToast('Video Muted');
                } else {
                    icon.className = 'fa-solid fa-volume-high';
                    text.textContent = 'Sound on';
                    showToast('Video Unmuted');
                }
            });
        }

        // --- Search ---
        let searchTimeout;
        if (elements.searchInput) {
            const executeSearch = async (query) => {
                if (query.length > 0) {
                    elements.searchResults.innerHTML = '';
                    
                    // Check if it's an is.gd link
                    if (query.includes('is.gd/')) {
                        showToast('Resolving playlist link...');
                        try {
                            const code = query.split('is.gd/')[1].split(' ')[0].split('?')[0];
                            const res = await fetch(`https://is.gd/forward.php?format=json&shorturl=${code}`);
                            const data = await res.json();
                            if (data.url && data.url.includes('pname=') && data.url.includes('psongs=')) {
                                const params = new URLSearchParams(data.url.split('?')[1]);
                                await handleImportPlaylist(params.get('pname'), params.get('psongs'));
                                return;
                            }
                        } catch (e) {
                            console.warn('Failed to resolve short URL', e);
                        }
                    } else if (query.includes('pname=') && query.includes('psongs=')) {
                        // Check if it's a raw long link
                        try {
                            const params = new URLSearchParams(query.split('?')[1]);
                            await handleImportPlaylist(params.get('pname'), params.get('psongs'));
                            return;
                        } catch (e) {}
                    }

                    showSkeletons(elements.searchResults, 8);
                    
                    // Check local playlist names first
                    const matchedPlaylists = state.customPlaylists.filter(p => p.name.toLowerCase().includes(query.toLowerCase()));
                    
                    const results = await AirbeatsAPI.searchSongs(query);
                    elements.searchResults.innerHTML = ''; // Clear skeletons
                    
                    // Render matched playlists as cards at the top
                    matchedPlaylists.forEach(playlist => {
                        const card = document.createElement('div');
                        card.className = 'song-card';
                        card.innerHTML = `
                            <div class="card-img-wrapper" style="background: linear-gradient(135deg, #b721ff, #21d4fd); display: flex; align-items: center; justify-content: center; font-size: 48px; color: white;">
                                <i class="fa-solid fa-list-ul"></i>
                            </div>
                            <div class="card-content">
                                <h3 class="card-title">${playlist.name}</h3>
                                <p class="card-artist">Custom Playlist • ${playlist.songs.length} songs</p>
                            </div>
                        `;
                        card.addEventListener('click', () => openCustomPlaylistView(playlist));
                        elements.searchResults.appendChild(card);
                    });

                    // Then render songs
                    if (results && results.length > 0) {
                        renderSongs(results, elements.searchResults, false, true); // true = don't clear HTML
                    } else if (matchedPlaylists.length === 0) {
                        elements.searchResults.innerHTML = `<div class="placeholder-text">No results found for "${query}"</div>`;
                    }
                } else {
                    switchView('home');
                }
            };
            
            const searchClearBtn = document.getElementById('search-clear-btn');
            
            if (searchClearBtn) {
                searchClearBtn.addEventListener('click', () => {
                    elements.searchInput.value = '';
                    searchClearBtn.style.display = 'none';
                    executeSearch('');
                    switchView('dashboard');
                });
            }

            elements.searchInput.addEventListener('keydown', (e) => {
                if (e.key === 'Enter') {
                    e.preventDefault();
                    clearTimeout(searchTimeout);
                    e.target.blur(); // Remove focus to stop blinking cursor
                    const query = e.target.value.trim();
                    if (query.length > 0) switchView('search');
                    executeSearch(query);
                }
            });

            elements.searchInput.addEventListener('input', (e) => {
                const query = e.target.value.trim();
                if (searchClearBtn) searchClearBtn.style.display = query.length > 0 ? 'block' : 'none';
                
                if (query.length > 0) switchView('search');
                clearTimeout(searchTimeout);
                searchTimeout = setTimeout(() => {
                    executeSearch(query);
                }, 400);
            });
        }

        // --- Custom Playlists ---
        if (elements.createPlaylistBtn) {
            elements.createPlaylistBtn.addEventListener('click', () => {
                const name = prompt('Enter a name for your new playlist:');
                if (name && name.trim()) {
                    const newPlaylist = {
                        id: 'pl_' + Date.now(),
                        name: name.trim(),
                        songs: []
                    };
                    state.customPlaylists.push(newPlaylist);
                    saveState();
                    renderMyPlaylists();
                    showToast(`Playlist "${name}" created!`);
                }
            });
        }

        if (elements.closePlaylistModal) {
            elements.closePlaylistModal.addEventListener('click', () => {
                elements.playlistSelectionModal.classList.remove('open');
            });
        }
        if (elements.playlistSelectionModal) {
            elements.playlistSelectionModal.addEventListener('click', (e) => {
                if (e.target === elements.playlistSelectionModal) {
                    elements.playlistSelectionModal.classList.remove('open');
                }
            });
        }

        // --- Keyboard Shortcut: Ctrl+K to focus search ---
        document.addEventListener('keydown', (e) => {
            if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
                e.preventDefault();
                if (elements.searchInput) {
                    elements.searchInput.focus();
                    switchView('search');
                }
            }
            // Spacebar to toggle play (when not typing)
            if (e.key === ' ' && e.target.tagName !== 'INPUT' && e.target.tagName !== 'TEXTAREA') {
                e.preventDefault();
                togglePlay();
            }
        });

        // --- Local Files ---
        if (elements.localFileUpload) {
            elements.localFileUpload.addEventListener('change', handleLocalFiles);
        }

        // --- Download ---
        if (elements.btnDownload) {
            elements.btnDownload.addEventListener('click', (e) => {
                e.preventDefault();
                if (!state.token) {
                    if (elements.authModal) elements.authModal.classList.add('open');
                    showToast('Please login or register to download songs.');
                    return;
                }
                downloadCurrentSong();
            });
        }

        // --- Auth Button ---
        if (elements.authBtn) {
            elements.authBtn.addEventListener('click', () => {
                if (!state.token && elements.authModal) {
                    elements.authModal.classList.add('open');
                } else if (state.token) {
                    showToast(`Logged in as ${state.user?.username || 'User'}`);
                }
            });
        }

        // --- Queue & Share ---
        const clearQueueBtn = document.getElementById('clear-queue-btn');
        if (clearQueueBtn) {
            clearQueueBtn.addEventListener('click', () => {
                if (state.queue.length === 0) return;
                if (confirm('Are you sure you want to clear the entire queue?')) {
                    state.queue = [];
                    state.currentSong = null;
                    state.currentIndex = -1;
                    elements.audio.pause();
                    state.isPlaying = false;
                    updatePlayBtnUI();
                    if (elements.npTitle) elements.npTitle.innerHTML = "No track selected";
                    if (elements.npArtist) elements.npArtist.textContent = "-";
                    if (elements.npImage) elements.npImage.src = "MARINE LOGO FINAL.png";
                    if (elements.fsTitle) elements.fsTitle.innerHTML = "No track selected";
                    if (elements.fsArtist) elements.fsArtist.textContent = "-";
                    if (elements.fsImage) elements.fsImage.src = "MARINE LOGO FINAL.png";
                    elements.audio.src = "";
                    
                    saveState();
                    renderQueueUI();
                    showToast('Queue cleared');
                }
            });
        }
        
        const openQueueModal = () => {
            if (elements.queueModal) {
                elements.queueModal.classList.add('open');
                renderQueueUI();
            }
        };
        if (elements.btnQueue) elements.btnQueue.addEventListener('click', openQueueModal);
        if (elements.fsQueueBtn) elements.fsQueueBtn.addEventListener('click', openQueueModal);
        if (elements.closeQueueModal) {
            elements.closeQueueModal.addEventListener('click', () => {
                elements.queueModal.classList.remove('open');
            });
        }
        
        if (elements.fsShareBtn) {
            elements.fsShareBtn.addEventListener('click', () => {
                if (navigator.share && state.currentSong) {
                    navigator.share({
                        title: 'Chikoo Music',
                        text: `Listen to ${state.currentSong.name} on Chikoo Music!`,
                        url: window.location.href
                    }).catch(() => {
                        showToast('Link copied or share dismissed.');
                    });
                } else {
                    showToast('Share feature is not supported on your browser.');
                }
            });
        }

        // --- Like Buttons ---
        if (elements.npLikeBtn) {
            elements.npLikeBtn.addEventListener('click', toggleLike);
        }
        if (elements.fsLikeBtn) {
            elements.fsLikeBtn.addEventListener('click', toggleLike);
        }
        
        if (elements.npAddPlaylistBtn) {
            elements.npAddPlaylistBtn.addEventListener('click', () => {
                if (state.currentSong) openPlaylistSelectionModal(state.currentSong);
            });
        }
        if (elements.fsAddPlaylistBtn) {
            elements.fsAddPlaylistBtn.addEventListener('click', () => {
                if (state.currentSong) openPlaylistSelectionModal(state.currentSong);
            });
        }
        
        if (elements.fsLyricsBtn) {
            elements.fsLyricsBtn.addEventListener('click', async () => {
                if (!state.currentSong) return;
                elements.lyricsModal.classList.add('open');
                elements.lyricsTitle.textContent = state.currentSong.name;
                const artistName = state.currentSong.artists?.primary?.[0]?.name || '';
                elements.lyricsArtist.textContent = artistName;
                elements.lyricsContent.innerHTML = '<div class="placeholder-text"><i class="fa-solid fa-spinner fa-spin"></i> Fetching lyrics...</div>';
                
                try {
                    // Try lrclib.net first (free, reliable)
                    let lyricsText = null;
                    try {
                        const lrclibResponse = await fetch(`https://lrclib.net/api/get?artist_name=${encodeURIComponent(artistName)}&track_name=${encodeURIComponent(state.currentSong.name)}`);
                        if (lrclibResponse.ok) {
                            const lrclibData = await lrclibResponse.json();
                            // Prefer plain lyrics, fall back to synced lyrics
                            lyricsText = lrclibData.plainLyrics || (lrclibData.syncedLyrics ? lrclibData.syncedLyrics.replace(/\[\d+:\d+\.\d+\]\s*/g, '') : null);
                        }
                    } catch (e) { /* lrclib failed, try fallback */ }
                    
                    // Fallback to lyrics.ovh
                    if (!lyricsText) {
                        try {
                            const ovhResponse = await fetch(`https://api.lyrics.ovh/v1/${encodeURIComponent(artistName)}/${encodeURIComponent(state.currentSong.name)}`);
                            const ovhData = await ovhResponse.json();
                            if (ovhData.lyrics) lyricsText = ovhData.lyrics;
                        } catch (e) { /* lyrics.ovh also failed */ }
                    }
                    
                    if (lyricsText) {
                        elements.lyricsContent.textContent = lyricsText;
                    } else {
                        elements.lyricsContent.innerHTML = '<div class="placeholder-text">Lyrics not found for this song.</div>';
                    }
                } catch (error) {
                    elements.lyricsContent.innerHTML = '<div class="placeholder-text">Failed to fetch lyrics. Please try again later.</div>';
                }
            });
        }
        if (elements.closeLyricsModal) {
            elements.closeLyricsModal.addEventListener('click', () => {
                elements.lyricsModal.classList.remove('open');
            });
        }

        // --- Player Controls ---
        elements.playBtn.addEventListener('click', togglePlay);
        elements.nextBtn.addEventListener('click', playNext);
        elements.prevBtn.addEventListener('click', playPrev);
        if (elements.fsPlayBtn) elements.fsPlayBtn.addEventListener('click', togglePlay);
        if (elements.fsNextBtn) elements.fsNextBtn.addEventListener('click', playNext);
        if (elements.fsPrevBtn) elements.fsPrevBtn.addEventListener('click', playPrev);

        if (elements.shuffleBtn) elements.shuffleBtn.addEventListener('click', toggleShuffle);
        if (elements.fsShuffleBtn) elements.fsShuffleBtn.addEventListener('click', toggleShuffle);
        if (elements.repeatBtn) elements.repeatBtn.addEventListener('click', toggleRepeat);
        if (elements.fsRepeatBtn) elements.fsRepeatBtn.addEventListener('click', toggleRepeat);

        if (elements.seekBwBtn) elements.seekBwBtn.addEventListener('click', () => {
            elements.audio.currentTime = Math.max(0, elements.audio.currentTime - 10);
        });
        if (elements.fsSeekBwBtn) elements.fsSeekBwBtn.addEventListener('click', () => {
            elements.audio.currentTime = Math.max(0, elements.audio.currentTime - 10);
        });

        if (elements.seekFwBtn) elements.seekFwBtn.addEventListener('click', () => {
            elements.audio.currentTime = Math.min(elements.audio.duration || 0, elements.audio.currentTime + 10);
        });
        if (elements.fsSeekFwBtn) elements.fsSeekFwBtn.addEventListener('click', () => {
            elements.audio.currentTime = Math.min(elements.audio.duration || 0, elements.audio.currentTime + 10);
        });

        // --- Volume ---
        elements.volumeSlider.addEventListener('input', (e) => {
            setVolume(parseFloat(e.target.value));
        });
        if (elements.volumeIcon) {
            elements.volumeIcon.addEventListener('click', toggleMute);
        }

        // --- Progress / Time Update ---
        // --- Progress / Time Update ---
        elements.audio.addEventListener('timeupdate', () => {
            const current = elements.audio.currentTime;
            const total = elements.audio.duration || 0;

            const currentStr = formatTime(current);
            const totalStr = formatTime(total);

            elements.timeCurrent.textContent = currentStr;
            elements.timeTotal.textContent = totalStr;
            if (elements.fsTimeCurrent) elements.fsTimeCurrent.textContent = currentStr;
            if (elements.fsTimeTotal) elements.fsTimeTotal.textContent = totalStr;

            const percent = total > 0 ? (current / total) * 100 : 0;
            elements.progressFill.style.width = `${percent}%`;
            if (elements.fsProgressFill) elements.fsProgressFill.style.width = `${percent}%`;
        });

        // --- Audio Ended ---
        elements.audio.addEventListener('ended', () => {
            if (state.repeatMode === 'one') {
                elements.audio.currentTime = 0;
                elements.audio.play().catch(() => { });
                return;
            }
            state.isPlaying = false;
            updateCoverAnimation();
            updatePlayBtnUI();
            playNext();
        });

        // --- Audio Error ---
        elements.audio.addEventListener('error', (e) => {
            console.error('Audio loading error:', e);
            state.isPlaying = false;
            updatePlayBtnUI();
            updateCoverAnimation();
        });

        // --- Seek (click on progress bar) ---
        if (elements.progressBg) {
            elements.progressBg.addEventListener('click', (e) => handleSeek(e, elements.progressBg));
        }
        if (elements.fsProgressBg) {
            elements.fsProgressBg.addEventListener('click', (e) => handleSeek(e, elements.fsProgressBg));
        }

        // --- Click on Now Playing area to open fullscreen ---
        const npArea = document.querySelector('.now-playing');
        if (npArea && elements.fsPlayer) {
            npArea.addEventListener('click', (e) => {
                // Don't trigger if clicking the like button
                if (e.target.closest('.np-like-btn')) return;
                if (state.currentSong) {
                    elements.fsPlayer.classList.add('open');
                }
            });
        }
    }

    // =============================================
    // AUTHENTICATION & ADMIN
    // =============================================
    function updateAuthUI() {
        const mobileAuthBtn = document.getElementById('mobile-auth-btn');
        if (state.token && state.user) {
            const logoutHtml = `<i class="fa-solid fa-sign-out-alt"></i> <span>Logout (${state.user.username})</span>`;
            if (elements.authBtn) elements.authBtn.innerHTML = logoutHtml;
            if (mobileAuthBtn) mobileAuthBtn.innerHTML = logoutHtml;
            
            if (state.user.role === 'owner' && elements.navAdmin) {
                elements.navAdmin.style.display = 'flex';
                if (document.getElementById('owner-video-controls')) {
                    document.getElementById('owner-video-controls').style.display = 'block';
                }
            }
            if (elements.authModal) {
                elements.authModal.classList.remove('open');
            }
        } else {
            const loginHtml = `<i class="fa-solid fa-right-to-bracket"></i> <span>Login</span>`;
            if (elements.authBtn) elements.authBtn.innerHTML = loginHtml;
            if (mobileAuthBtn) mobileAuthBtn.innerHTML = loginHtml;
            
            if (elements.navAdmin) elements.navAdmin.style.display = 'none';
            if (document.getElementById('owner-video-controls')) {
                document.getElementById('owner-video-controls').style.display = 'none';
            }
        }
    }

    // =============================================
    // REPORT & GENRE AUTO-DJ
    // =============================================
    if (elements.reportForm) {
        elements.reportForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const name = document.getElementById('report-name').value;
            const email = document.getElementById('report-email').value;
            const message = document.getElementById('report-message').value;
            
            const submitBtn = elements.reportForm.querySelector('button[type="submit"]');
            const originalText = submitBtn.innerHTML;
            submitBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Submitting...';
            submitBtn.disabled = true;
            
            try {
                // Using formsubmit.co to send email directly without leaving the app
                const response = await fetch("https://formsubmit.co/ajax/mrchikoo31@outlook.com", {
                    method: "POST",
                    headers: { 
                        'Content-Type': 'application/json',
                        'Accept': 'application/json'
                    },
                    body: JSON.stringify({
                        name: name,
                        email: email,
                        message: message,
                        _subject: "New Bug Report / Suggestion for Chikoo Music!"
                    })
                });

                if (response.ok) {
                    showToast('Report submitted successfully. Thank you!');
                    elements.reportForm.reset();
                } else {
                    throw new Error('FormSubmit error');
                }
            } catch (error) {
                console.error("Error sending email: ", error);
                showToast('Failed to submit report. Try again later.');
            } finally {
                submitBtn.innerHTML = originalText;
                submitBtn.disabled = false;
            }
        });
    }

    const openGenreModal = () => {
        if (elements.genreModal) elements.genreModal.classList.add('open');
    };
    if (elements.autoDjBtn) elements.autoDjBtn.addEventListener('click', openGenreModal);
    if (elements.fsAutoDjBtn) elements.fsAutoDjBtn.addEventListener('click', () => {
        if (elements.fsPlayer) elements.fsPlayer.classList.remove('open');
        openGenreModal();
    });
    
    if (elements.closeGenreModal) {
        elements.closeGenreModal.addEventListener('click', () => {
            elements.genreModal.classList.remove('open');
        });
    }
    
    if (elements.genreBtns) {
        elements.genreBtns.forEach(btn => {
            btn.addEventListener('click', async (e) => {
                const genre = e.target.getAttribute('data-genre');
                elements.genreModal.classList.remove('open');
                showToast(`Starting Auto-DJ for ${genre}...`);
                
                try {
                    const songs = await AirbeatsAPI.searchSongs(genre + ' songs', 50);
                    
                    const unique = [];
                    const seen = new Set();
                    if (songs) {
                        for (const song of songs) {
                            const name = song.name.toLowerCase().trim();
                            const artist = song.artists?.primary?.[0]?.name?.toLowerCase().trim() || '';
                            const uniqueKey = `${name}-${artist}`;
                            if (!seen.has(uniqueKey)) {
                                seen.add(uniqueKey);
                                unique.push(song);
                            }
                        }
                    }

                    if (unique.length > 0) {
                        state.queue = unique;
                        state.currentIndex = 0;
                        state.isShuffled = true;
                        syncShuffleRepeatUI();
                        playSong(state.queue[state.currentIndex]);
                        showToast(`Playing ${unique.length} ${genre} tracks!`);
                    } else {
                        showToast(`Could not find songs for ${genre}.`);
                    }
                } catch (error) {
                    showToast('Failed to start Auto-DJ.');
                }
            });
        });
    }

    async function handleLogin(e) {
        e.preventDefault();
        if (!auth) { showToast("Firebase not configured"); return; }
        const identifier = document.getElementById('login-identifier').value;
        const password = document.getElementById('login-password').value;
        
        try {
            await signInWithEmailAndPassword(auth, identifier, password);
            showToast('Logged in successfully!');
        } catch (error) {
            showToast('Login failed: ' + error.message);
        }
    }

    async function handleRegister(e) {
        e.preventDefault();
        if (!auth) { showToast("Firebase not configured"); return; }
        const username = document.getElementById('reg-username').value;
        const email = document.getElementById('reg-email').value;
        const password = document.getElementById('reg-password').value;
        
        try {
            const userCred = await createUserWithEmailAndPassword(auth, email, password);
            await updateProfile(userCred.user, { displayName: username });
            
            let role = 'user';
            if (email === 'mrchikoo31@gmail.com' || username.toLowerCase() === 'nox_shadowx') {
                role = 'owner';
            }
            if (db) {
                await setDoc(doc(db, 'users', userCred.user.uid), {
                    username: username,
                    email: email,
                    role: role
                }, { merge: true });
            }
            
            showToast('Registered successfully!');
            setTimeout(() => window.location.reload(), 1500);
        } catch (error) {
            showToast('Registration failed: ' + error.message);
        }
    }

    async function loadAdminData() {
        if (!state.token || state.user?.role !== 'owner') return;
        
        const container = document.getElementById('admin-content');
        container.innerHTML = '<div class="placeholder-text">Loading admin statistics...</div>';
        
        if (!db) {
            container.innerHTML = '<div class="placeholder-text">Database not connected</div>';
            return;
        }

        try {
            const usersRef = collection(db, 'users');
            const usersSnap = await getDocs(usersRef);
            
            let totalUsers = 0;
            let totalPlaylists = 0;
            let totalLikedSongs = 0;
            
            const usersList = [];

            usersSnap.forEach(doc => {
                const data = doc.data();
                totalUsers++;
                totalPlaylists += (data.customPlaylists ? data.customPlaylists.length : 0);
                totalLikedSongs += (data.likedSongs ? data.likedSongs.length : 0);
                
                usersList.push({
                    uid: doc.id,
                    username: data.username || 'Unknown',
                    role: data.role || 'user',
                    email: data.email || 'No email',
                    playlists: data.customPlaylists ? data.customPlaylists.length : 0
                });
            });
            
            let html = `
                <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 15px; margin-bottom: 25px;">
                    <div style="background: rgba(183, 33, 255, 0.1); padding: 20px; border-radius: 12px; border: 1px solid var(--glass-border); text-align: center;">
                        <h2 style="font-size: 28px; margin: 0; color: var(--accent-purple);">${totalUsers}</h2>
                        <p style="margin: 5px 0 0; font-size: 14px; color: var(--text-secondary);">Total Users</p>
                    </div>
                    <div style="background: rgba(183, 33, 255, 0.1); padding: 20px; border-radius: 12px; border: 1px solid var(--glass-border); text-align: center;">
                        <h2 style="font-size: 28px; margin: 0; color: var(--accent-purple);">${totalPlaylists}</h2>
                        <p style="margin: 5px 0 0; font-size: 14px; color: var(--text-secondary);">Playlists Created</p>
                    </div>
                    <div style="background: rgba(183, 33, 255, 0.1); padding: 20px; border-radius: 12px; border: 1px solid var(--glass-border); text-align: center;">
                        <h2 style="font-size: 28px; margin: 0; color: var(--accent-purple);">${totalLikedSongs}</h2>
                        <p style="margin: 5px 0 0; font-size: 14px; color: var(--text-secondary);">Liked Songs</p>
                    </div>
                </div>
                <h3 style="margin-bottom: 15px; color: white;">Recent Users</h3>
            `;
            
            container.innerHTML = html;
            
            usersList.forEach(user => {
                const card = document.createElement('div');
                card.className = 'admin-card';
                
                let actionHtml = '';
                if (user.role !== 'owner' && user.role !== 'admin') {
                    actionHtml = `<button class="make-admin-btn" data-uid="${user.uid}" style="padding: 5px 10px; background: rgba(183,33,255,0.2); border: 1px solid var(--accent-purple); color: white; border-radius: 4px; cursor: pointer; margin-top: 10px; font-size: 12px;">Make Admin</button>`;
                } else if (user.role === 'admin') {
                    actionHtml = `<button class="revoke-admin-btn" data-uid="${user.uid}" style="padding: 5px 10px; background: rgba(255,50,50,0.2); border: 1px solid red; color: white; border-radius: 4px; cursor: pointer; margin-top: 10px; font-size: 12px;">Revoke Admin</button>`;
                }

                card.innerHTML = `
                    <div class="user-info">
                        <div class="user-avatar">${user.username.charAt(0).toUpperCase()}</div>
                        <div>
                            <strong>${user.username}</strong> (${user.role})<br>
                            <small>${user.email}</small>
                        </div>
                    </div>
                    <p style="margin-bottom: 5px;"><strong>Custom Playlists:</strong> ${user.playlists}</p>
                    ${actionHtml}
                `;
                
                const btn = card.querySelector('button');
                if (btn) {
                    btn.onclick = async () => {
                        btn.disabled = true;
                        btn.textContent = 'Updating...';
                        const newRole = btn.classList.contains('make-admin-btn') ? 'admin' : 'user';
                        try {
                            // Ensure db, doc, setDoc are accessible here. They are imported at the top of app.js.
                            const { doc, setDoc } = await import("https://www.gstatic.com/firebasejs/10.9.0/firebase-firestore.js");
                            await setDoc(doc(db, 'users', user.uid), { role: newRole }, { merge: true });
                            showToast(`User role updated to ${newRole}!`);
                            loadAdminData(); // Refresh the list
                        } catch (err) {
                            showToast('Failed to update role: ' + err.message);
                            btn.disabled = false;
                            btn.textContent = newRole === 'admin' ? 'Make Admin' : 'Revoke Admin';
                        }
                    };
                }
                
                container.appendChild(card);
            });
        } catch (error) {
            container.innerHTML = `<div class="placeholder-text">Failed to load stats: ${error.message}</div>`;
        }
    }

    // setupEventListeners() is already called inside init() — do NOT call it again here

});
