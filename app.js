import { initializeApp } from "https://www.gstatic.com/firebasejs/10.9.0/firebase-app.js";
import { getAuth, signInWithEmailAndPassword, createUserWithEmailAndPassword, onAuthStateChanged, signOut, updateProfile } from "https://www.gstatic.com/firebasejs/10.9.0/firebase-auth.js";
import { getFirestore, doc, getDoc, setDoc } from "https://www.gstatic.com/firebasejs/10.9.0/firebase-firestore.js";

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

let app, auth, db;
try {
    app = initializeApp(firebaseConfig);
    auth = getAuth(app);
    db = getFirestore(app);
} catch (e) {
    console.warn("Firebase not configured properly:", e);
}

/**
 * Chikoo Music - app.js
 */
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
        user: JSON.parse(localStorage.getItem('chikoo_user') || 'null')
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

        // Actions
        btnFullscreen: document.getElementById('btn-fullscreen'),
        btnDownload: document.getElementById('btn-download'),

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
        tabLogin: document.getElementById('tab-login'),
        tabRegister: document.getElementById('tab-register'),
        formLogin: document.getElementById('form-login'),
        formRegister: document.getElementById('form-register'),
        navAdmin: document.getElementById('nav-admin')
    };

    // =============================================
    // INITIALIZATION
    // =============================================
    init();

    async function init() {
        loadPersistedState();
        
        if (auth) {
            onAuthStateChanged(auth, async (user) => {
                if (user) {
                    state.token = user.uid;
                    state.user = { username: user.displayName || 'User', email: user.email, role: 'user' };
                    // Fetch data from Firestore
                    if (db) {
                        try {
                            const userRef = doc(db, 'users', user.uid);
                            const userSnap = await getDoc(userRef);
                            if (userSnap.exists()) {
                                const data = userSnap.data();
                                if (data.likedSongs) state.likedSongs = data.likedSongs;
                                if (data.customPlaylists) state.customPlaylists = data.customPlaylists;
                                saveState();
                            }
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

        // Load trending songs
        const trending = await AirbeatsAPI.getTrendingSongs();
        renderSongs(trending, elements.trendingGrid);

        loadDownloads();
        
        // Check for shared playlist links in URL
        const urlParams = new URLSearchParams(window.location.search);
        if (urlParams.has('pname') && urlParams.has('psongs')) {
            await handleImportPlaylist(urlParams.get('pname'), urlParams.get('psongs'));
            // Remove params from URL so it doesn't re-import on refresh
            window.history.replaceState({}, document.title, window.location.pathname);
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
            'video1.mp4', 'video2.mp4', 'video3.mp4',
            'video4.mp4', 'video5.mp4', 'video6.mp4', 'video7.mp4'
        ];

        let videoData = { index: 0, date: '' };
        try {
            const stored = localStorage.getItem('chikooBannerVideo');
            if (stored) videoData = JSON.parse(stored);
        } catch (e) { }

        const today = new Date().toDateString();
        if (videoData.date !== today) {
            let newIndex = Math.floor(Math.random() * videoList.length);
            // If there's an existing video, ensure the new one is different
            if (videoData.date !== '' && newIndex === videoData.index && videoList.length > 1) {
                newIndex = (newIndex + 1) % videoList.length;
            }
            videoData.index = newIndex;
            videoData.date = today;
            try {
                localStorage.setItem('chikooBannerVideo', JSON.stringify(videoData));
            } catch (e) { }
        }

        elements.bannerVideo.addEventListener('error', () => {
            if (!elements.bannerVideo.src.endsWith('video1.mp4')) {
                console.warn('Video not found, falling back to video1.mp4');
                elements.bannerVideo.src = 'videos/video1.mp4';
                elements.bannerVideo.load();
                elements.bannerVideo.play().catch(() => { });
            }
        });

        // Video starts MUTED in HTML (required for autoplay in all browsers)
        elements.bannerVideo.src = `videos/${videoList[videoData.index]}`;
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

    function renderSongs(songs, container, isHistory = false, append = false) {
        if (!container) return;
        
        if (!append) {
            container.innerHTML = '';
        }

        if (!songs || songs.length === 0) {
            if (!append) {
                container.innerHTML = `<div class="placeholder-text">${isHistory ? "You haven't downloaded any songs yet." : "No songs found."}</div>`;
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
            card.className = 'song-card';
            
            let buttonsHtml = `
                <button class="play-overlay-btn btn-play-card" title="Play"><i class="fa-solid fa-play"></i></button>
                <button class="play-overlay-btn btn-queue-card" title="Add to Queue" style="width: 36px; height: 36px; font-size: 14px;"><i class="fa-solid fa-indent"></i></button>
            `;
            
            if (isCustomPlaylist) {
                buttonsHtml += `<button class="play-overlay-btn btn-remove-card" title="Remove from Playlist" style="width: 36px; height: 36px; font-size: 14px;"><i class="fa-solid fa-trash"></i></button>`;
            } else {
                buttonsHtml += `<button class="play-overlay-btn btn-add-card" title="Add to Playlist" style="width: 36px; height: 36px; font-size: 14px;"><i class="fa-solid fa-folder-plus"></i></button>`;
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
            if(removeBtn) removeBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                const pl = state.customPlaylists.find(p => p.id === playlistId);
                if (pl) {
                    pl.songs = pl.songs.filter(s => s.id !== song.id);
                    saveState();
                    showToast('Removed from playlist');
                    openCustomPlaylistView(pl); // re-render
                }
            });

            const queueBtn = card.querySelector('.btn-queue-card');
            if(queueBtn) queueBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                addToQueue(song);
            });

            card.addEventListener('click', () => setQueue(songs, song));
            container.appendChild(card);
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

    function playNext() {
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
        if (elements.repeatBtn) {
            elements.repeatBtn.classList.remove('active');
            if (state.repeatMode === 'all') {
                elements.repeatBtn.classList.add('active');
                elements.repeatBtn.innerHTML = '<i class="fa-solid fa-repeat"></i>';
            } else if (state.repeatMode === 'one') {
                elements.repeatBtn.classList.add('active');
                elements.repeatBtn.innerHTML = '<i class="fa-solid fa-repeat"></i><span style="position:absolute;font-size:8px;font-weight:700;color:var(--accent-purple);">1</span>';
            } else {
                elements.repeatBtn.innerHTML = '<i class="fa-solid fa-repeat"></i>';
            }
        }
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

        // --- Theme ---
        if (elements.themeToggle) {
            elements.themeToggle.addEventListener('click', toggleTheme);
        }

        // --- Navigation ---
        elements.navLinks.forEach(link => {
            link.addEventListener('click', (e) => {
                switchView(e.currentTarget.dataset.page);
            });
        });

        // --- Auth Modals ---
        if (elements.authBtn) {
            elements.authBtn.addEventListener('click', () => {
                if (state.token) {
                    if (auth) {
                        signOut(auth).then(() => {
                            showToast('Logged out');
                        });
                    } else {
                        state.token = null;
                        state.user = null;
                        updateAuthUI();
                    }
                } else {
                    elements.authModal.classList.add('open');
                }
            });
        }
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
        
        document.querySelectorAll('.btn-maybe-later').forEach(btn => {
            btn.addEventListener('click', () => {
                elements.authModal.classList.remove('open');
            });
        });
        
        // Admin View Logic
        const adminBtn = document.getElementById('btn-refresh-admin');
        if (adminBtn) adminBtn.addEventListener('click', loadAdminData);

        // --- Trending Filters ---
        const filterBtns = document.querySelectorAll('#trending-filters .filter-btn');
        filterBtns.forEach(btn => {
            btn.addEventListener('click', async (e) => {
                filterBtns.forEach(b => b.classList.remove('active'));
                e.target.classList.add('active');

                showSkeletons(elements.trendingGrid, 10);
                const query = e.target.getAttribute('data-query');
                let songs;
                if (query === 'hindi romantic songs') {
                    songs = await AirbeatsAPI.getTrendingSongs();
                } else {
                    songs = await AirbeatsAPI.searchSongs(query, 20);
                }
                
                renderSongs(songs, elements.trendingGrid);
            });
        });

        // --- Fullscreen Player ---
        if (elements.btnFullscreen) {
            elements.btnFullscreen.addEventListener('click', () => {
                if (state.currentSong && elements.fsPlayer) {
                    elements.fsPlayer.classList.add('open');
                }
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

        // --- SOUND TOGGLE (Profile Video) using Event Delegation ---
        document.body.addEventListener('click', (e) => {
            const soundToggleBtn = e.target.closest('#sound-toggle-btn');
            if (soundToggleBtn && elements.bannerVideo) {
                e.stopPropagation();
                e.preventDefault();

                // Toggle the independent state
                isProfileVideoMuted = !isProfileVideoMuted;
                elements.bannerVideo.muted = isProfileVideoMuted;

                // Update UI to reflect the NEW state
                const icon = soundToggleBtn.querySelector('i');
                const text = soundToggleBtn.querySelector('span');
                
                if (isProfileVideoMuted) {
                    icon.className = 'fa-solid fa-volume-xmark';
                    text.textContent = 'Sound off';
                    showToast('Video muted');
                } else {
                    icon.className = 'fa-solid fa-volume-high';
                    text.textContent = 'Sound on';
                    showToast('Video unmuted');
                }
            }
        });

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

            elements.searchInput.addEventListener('keydown', (e) => {
                if (e.key === 'Enter') {
                    e.preventDefault();
                    clearTimeout(searchTimeout);
                    const query = e.target.value.trim();
                    if (query.length > 0) switchView('search');
                    executeSearch(query);
                }
            });

            elements.searchInput.addEventListener('input', (e) => {
                const query = e.target.value.trim();
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
                downloadCurrentSong();
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
            elements.fsLyricsBtn.addEventListener('click', () => {
                showToast('Lyrics feature is coming soon!');
            });
        }

        // --- Player Controls ---
        elements.playBtn.addEventListener('click', togglePlay);
        if (elements.fsPlayBtn) elements.fsPlayBtn.addEventListener('click', togglePlay);

        elements.nextBtn.addEventListener('click', playNext);
        if (elements.fsNextBtn) elements.fsNextBtn.addEventListener('click', playNext);

        elements.prevBtn.addEventListener('click', playPrev);
        if (elements.fsPrevBtn) elements.fsPrevBtn.addEventListener('click', playPrev);

        if (elements.shuffleBtn) elements.shuffleBtn.addEventListener('click', toggleShuffle);
        if (elements.repeatBtn) elements.repeatBtn.addEventListener('click', toggleRepeat);

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
        if (state.token && state.user) {
            elements.authBtn.innerHTML = `<i class="fa-solid fa-user"></i> ${state.user.username}`;
            if (state.user.role === 'owner' && elements.navAdmin) {
                elements.navAdmin.style.display = 'block';
            }
            if (elements.authModal) {
                elements.authModal.classList.remove('open');
            }
        } else {
            elements.authBtn.innerHTML = `<i class="fa-solid fa-right-to-bracket"></i> Login / Register`;
            if (elements.navAdmin) elements.navAdmin.style.display = 'none';
            
            // Auto prompt login if not logged in
            if (!state.token) {
                setTimeout(() => {
                    if (elements.authModal && !document.querySelector('.auth-modal.open')) {
                        elements.authModal.classList.add('open');
                    }
                }, 500);
            }
        }
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
            showToast('Registered successfully!');
        } catch (error) {
            showToast('Registration failed: ' + error.message);
        }
    }

    async function loadAdminData() {
        if (!state.token || state.user?.role !== 'owner') return;
        
        const container = document.getElementById('admin-content');
        container.innerHTML = '<div class="placeholder-text">Loading data...</div>';
        
        try {
            const res = await fetch('/api/admin/data', {
                headers: { 'Authorization': `Bearer ${state.token}` }
            });
            const data = await res.json();
            
            if (data.success) {
                container.innerHTML = '';
                data.users.forEach(user => {
                    const card = document.createElement('div');
                    card.className = 'admin-card';
                    card.innerHTML = `
                        <div class="user-info">
                            <div class="user-avatar">${user.username.charAt(0).toUpperCase()}</div>
                            <div>
                                <strong>${user.username}</strong> (${user.role})<br>
                                <small>${user.email}</small>
                            </div>
                        </div>
                        <p><strong>Custom Playlists:</strong> ${user.customPlaylists?.length || 0}</p>
                    `;
                    container.appendChild(card);
                });
            } else {
                container.innerHTML = `<div class="placeholder-text">Failed to load: ${data.message}</div>`;
            }
        } catch (error) {
            container.innerHTML = '<div class="placeholder-text">Server error</div>';
        }
    }

    // =============================================
    // BOOTSTRAP — called at bottom after all functions defined
    // =============================================
    setupEventListeners();
});
