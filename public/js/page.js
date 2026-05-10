function isTrueMobile() {
    const userAgent = navigator.userAgent.toLowerCase();
    const platform = navigator.platform.toLowerCase();
    
    if (platform.indexOf('mac') > -1 || platform.indexOf('win') > -1) {
        return false;
    }
    
    if (platform.indexOf('linux') > -1 && !/android/.test(userAgent)) {
        return false;
    }
    
    const isMobileUA = /iphone|ipod|android/.test(userAgent);
    const isTablet = /ipad|android(?=.*mobile)/i.test(userAgent);
    
    if (!isMobileUA && !isTablet) return false;
    
    const hasTouch = 'ontouchstart' in window;
    const viewportRatio = window.innerHeight / window.innerWidth;
    const isMobileRatio = viewportRatio > 1.5 || viewportRatio < 0.6;
    
    return hasTouch && isMobileRatio;
}

// Inisialisasi state history
let pageHistory = [null]; // Mulai dengan state null untuk home
let currentIndex = 0;

function hideAll() {
  document.querySelector(".page_home").style.display = "none";
  document.querySelector(".page_playlist").style.display = "none";
  document.querySelector(".sticky-header").style.display = "none";
  document.querySelector(".page_search").style.display = "none";
  document.querySelector(".page_library").style.display = "none";
  document.querySelector(".page_lyric").style.display = "none";
  document.querySelector(".page_artist").style.display = "none";
  document.querySelector(".page_album").style.display = "none";
  document.querySelector(".page_fav_music").style.display = "none";
  document.querySelector(".page_music").style.display = "none";
  document.querySelector(".page_profile").style.display = "none";
  document.querySelector(".page_category").style.display = "none";
  document.querySelector(".page_mostplayed").style.display = "none";
  document.querySelector(".page_top50").style.display = "none";
  document.querySelector(".page_license").style.display = "none";
}

// Fungsi untuk mendapatkan state dari URL
function getStateFromPath(path) {
  if (path === "/") return { page: "home" };
  
  if (path.startsWith("/playlist/")) {
    return { page: "playlist", id: path.split("/").pop() };
  }
  if (path.startsWith("/custom/")) {
    return { page: "custom_playlist", id: path.split("/").pop() };
  }
  if (path.startsWith("/artist/")) {
    return { page: "artist", id: path.split("/").pop() };
  }
  if (path.startsWith("/album/")) {
    return { page: "album", id: path.split("/").pop() };
  }
  if (path.startsWith("/music/")) {
    return { page: "music", id: path.split("/").pop() };
  }
  if (path.startsWith("/category/")) {
    return { page: "category", id: decodeURIComponent(path.split("/").pop()) };
  }
  if (path.startsWith("/profile/")) {
    return { page: "profile", id: path.split("/").pop() };
  }
  if (path === "/favoritemusic") {
    return { page: "fav_music", id: "FAV999999" };
  }
  if (path === "/search") {
    return { page: "search" };
  }
  if (path === "/library") {
    return { page: "library" };
  }
  if (path === "/lyric") {
    return { page: "lyric" };
  }
  if (path === "/license") {
    return { page: "license" };
  }
  if (path === "/top50tracks") {
    return { page: "top50" };
  }
  if (path === "/mostplayed") {
    return { page: "mostplayed" };
  }
  
  return null;
}

// Fungsi untuk menangani popstate dengan benar
window.addEventListener('popstate', function(event) {
  console.log('Popstate triggered:', {
    state: event.state,
    path: window.location.pathname,
    currentIndex,
    pageHistoryLength: pageHistory.length
  });
  
  const state = event.state;
  const path = window.location.pathname;
  
  // Update currentIndex berdasarkan state yang diterima
  if (state) {
    // Cari index state di history
    const index = pageHistory.findIndex(s => 
      s && state.page === s.page && 
      (state.id ? state.id === s.id : true)
    );
    
    if (index !== -1) {
      currentIndex = index;
    }
  } else {
    // State null berarti home
    currentIndex = pageHistory.findIndex(s => s === null);
    if (currentIndex === -1) currentIndex = 0;
  }
  
  // Handle special cases
  if (openScreen) {
    slideDown();
    openScreen = false;
    return;
  }
  
  // Handle library search state
  if (state?.page === "searchlibrary") {
    if (!libraryState.isSearchActive) {
      const container = document.querySelector('.mobile-library-container');
      const searchContainer = document.getElementById('searchContainer');
      libraryState.isSearchActive = true;
      container.classList.add('search-active');
      searchContainer.style.display = 'flex';
    }
    resetSearchState();
    restoreLibraryState();
  } else {
    if (libraryState.isSearchActive) {
      const container = document.querySelector('.mobile-library-container');
      const searchContainer = document.getElementById('searchContainer');
      libraryState.isSearchActive = false;
      container.classList.remove('search-active');
      searchContainer.style.display = 'none';
      document.getElementById('librarySearchInput').value = '';
    }
  }
  
  // Navigasi berdasarkan state
  if (!state) {
    showHome(false);
  } else {
    switch (state.page) {
      case "playlist":
        showplaylist(state.id, false);
        break;
      case "custom_playlist":
        showCustomPlaylist(state.id, false);
        break;
      case "artist":
        viewArtist(state.id, false);
        break;
      case "album":
        showAlbumMobile(state.id, false);
        break;
      case "music":
        showMusicMobile(state.id, false);
        break;
      case "category":
        showCategory(state.id, false);
        break;
      case "fav_music":
        showLikeMusic(false);
        break;
      case "mostplayed":
        mostPlayed(false);
        break;
      case "top50":
        top50track(false);
        break;
      case "search":
        find(false);
        break;
      case "library":
        library(false);
        break;
      case "lyric":
        openLyric(false);
        break;
      case "license":
        openLicense(false);
        break;
      case "profile":
        showProfile(state.id, false);
        break;
      case "home":
        showHome(false);
        break;
    }
  }
  
  updateNavIcons();
  updateActiveNavButton();
});

// Fungsi untuk push state dengan benar
function pushPageToHistory(state) {
  // Happus semua state setelah currentIndex
  pageHistory = pageHistory.slice(0, currentIndex + 1);
  
  // Tambah state baru
  pageHistory.push(state);
  currentIndex = pageHistory.length - 1;
  
  console.log('Pushed state:', {
    state,
    currentIndex,
    history: pageHistory
  });
  
  updateNavIcons();
}

// Fungsi untuk sync history dengan URL saat ini
function syncHistoryWithUrl() {
  const path = window.location.pathname;
  const state = getStateFromPath(path);
  
  if (state) {
    // Periksa apakah state sudah ada di history
    const existingIndex = pageHistory.findIndex(s => 
      s && state.page === s.page && 
      (state.id ? state.id === s.id : true)
    );
    
    if (existingIndex !== -1) {
      currentIndex = existingIndex;
    } else {
      // Jika tidak ada, tambah ke history
      pageHistory.push(state);
      currentIndex = pageHistory.length - 1;
    }
  } else {
    currentIndex = 0; // Home
  }
  
  updateNavIcons();
}

// Inisialisasi saat load
window.addEventListener('load', () => {
  const path = window.location.pathname;
  const initialState = getStateFromPath(path);
  
  // Reset pageHistory
  pageHistory = [initialState || null];
  currentIndex = 0;
  
  // Simpan playback state
  const lastPlayedPlaylist = localStorage.getItem("lastPlayedPlaylist");
  const lastPlayedPage = localStorage.getItem("lastPlayedPage");
  const lastPlayedMusic = localStorage.getItem("lastPlayedMusic");
  
  console.log('Page load - Initial state:', {
    path,
    initialState,
    lastPlayedPlaylist,
    lastPlayedPage,
    lastPlayedMusic
  });
  
  // Navigasi ke halaman yang benar
  if (!initialState) {
    showHome(false);
  } else {
    switch (initialState.page) {
      case "playlist":
        showplaylist(initialState.id, false);
        break;
      case "custom_playlist":
        showCustomPlaylist(initialState.id, false);
        break;
      case "artist":
        viewArtist(initialState.id, false);
        break;
      case "album":
        showAlbumMobile(initialState.id, false);
        break;
      case "music":
        showMusicMobile(initialState.id, false);
        break;
      case "category":
        showCategory(initialState.id, false);
        break;
      case "fav_music":
        showLikeMusic(false);
        break;
      case "mostplayed":
        mostPlayed(false);
        break;
      case "top50":
        top50track(false);
        break;
      case "search":
        find(false);
        break;
      case "library":
        var isMobile = isTrueMobile();
        if (window.innerWidth > 768 && !isMobile) {
          history.replaceState({ page: "home" }, "", "/");
          showHome(false);
        } else {
          library(false);
        }
        break;
      case "lyric":
        openLyric(false);
        break;
      case "license":
        openLicense(false);
        break;
      case "profile":
        showProfile(initialState.id, false);
        break;
      case "home":
        showHome(false);
        break;
    }
  }
  
  // Update UI
  updateNavIcons();
  updateActiveNavItems();
  setActiveContent(initialState?.page === "home" ? "Home" : 
                  initialState?.page === "search" ? "Explore" : 
                  initialState?.page === "library" ? "Collection" : 
                  initialState?.page);
  

  loadPlaybackState();
});

// Fungsi navigasi back
function backLeft() {
  if (currentIndex > 0) {
    currentIndex--;
    
    // Ambil state sebelumnya
    const prevState = pageHistory[currentIndex];
    
    // Update URL berdasarkan state
    if (!prevState) {
      history.pushState(null, "", "/");
      showHome(false);
    } else {
      let url = "/";
      switch (prevState.page) {
        case "playlist":
          url = `/playlist/${prevState.id}`;
          break;
        case "custom_playlist":
          url = `/custom/${prevState.id}`;
          break;
        case "artist":
          url = `/artist/${prevState.id}`;
          break;
        case "album":
          url = `/album/${prevState.id}`;
          break;
        case "music":
          url = `/music/${prevState.id}`;
          break;
        case "category":
          url = `/category/${encodeURIComponent(prevState.id)}`;
          break;
        case "profile":
          url = `/profile/${prevState.id}`;
          break;
        case "fav_music":
          url = "/favoritemusic";
          break;
        case "search":
          url = "/search";
          break;
        case "library":
          url = "/library";
          break;
        case "lyric":
          url = "/lyric";
          break;
        case "license":
          url = "/license";
          break;
        case "top50":
          url = "/top50tracks";
          break;
        case "mostplayed":
          url = "/mostplayed";
          break;
      }
      
      history.pushState(prevState, "", url);
      
      // Navigasi ke halaman
      switch (prevState.page) {
        case "playlist":
          showplaylist(prevState.id, false);
          break;
        case "custom_playlist":
          showCustomPlaylist(prevState.id, false);
          break;
        case "artist":
          viewArtist(prevState.id, false);
          break;
        case "album":
          showAlbumMobile(prevState.id, false);
          break;
        case "music":
          showMusicMobile(prevState.id, false);
          break;
        case "category":
          showCategory(prevState.id, false);
          break;
        case "fav_music":
          showLikeMusic(false);
          break;
        case "mostplayed":
          mostPlayed(false);
          break;
        case "top50":
          top50track(false);
          break;
        case "search":
          find(false);
          break;
        case "library":
          library(false);
          break;
        case "lyric":
          openLyric(false);
          break;
        case "license":
          openLicense(false);
          break;
        case "profile":
          showProfile(prevState.id, false);
          break;
        case "home":
          showHome(false);
          break;
      }
    }
    
    updateNavIcons();
  }
}

// Fungsi navigasi forward
function backRight() {
  if (currentIndex < pageHistory.length - 1) {
    currentIndex++;
    
    const nextState = pageHistory[currentIndex];
    
    // Update URL berdasarkan state
    if (!nextState) {
      history.pushState(null, "", "/");
      showHome(false);
    } else {
      let url = "/";
      switch (nextState.page) {
        case "playlist":
          url = `/playlist/${nextState.id}`;
          break;
        case "custom_playlist":
          url = `/custom/${nextState.id}`;
          break;
        case "artist":
          url = `/artist/${nextState.id}`;
          break;
        case "album":
          url = `/album/${nextState.id}`;
          break;
        case "music":
          url = `/music/${nextState.id}`;
          break;
        case "category":
          url = `/category/${encodeURIComponent(nextState.id)}`;
          break;
        case "profile":
          url = `/profile/${nextState.id}`;
          break;
        case "fav_music":
          url = "/favoritemusic";
          break;
        case "search":
          url = "/search";
          break;
        case "library":
          url = "/library";
          break;
        case "lyric":
          url = "/lyric";
          break;
        case "license":
          url = "/license";
          break;
        case "top50":
          url = "/top50tracks";
          break;
        case "mostplayed":
          url = "/mostplayed";
          break;
      }
      
      history.pushState(nextState, "", url);
      
      // Navigasi ke halaman
      switch (nextState.page) {
        case "playlist":
          showplaylist(nextState.id, false);
          break;
        case "custom_playlist":
          showCustomPlaylist(nextState.id, false);
          break;
        case "artist":
          viewArtist(nextState.id, false);
          break;
        case "album":
          showAlbumMobile(nextState.id, false);
          break;
        case "music":
          showMusicMobile(nextState.id, false);
          break;
        case "category":
          showCategory(nextState.id, false);
          break;
        case "fav_music":
          showLikeMusic(false);
          break;
        case "mostplayed":
          mostPlayed(false);
          break;
        case "top50":
          top50track(false);
          break;
        case "search":
          find(false);
          break;
        case "library":
          library(false);
          break;
        case "lyric":
          openLyric(false);
          break;
        case "license":
          openLicense(false);
          break;
        case "profile":
          showProfile(nextState.id, false);
          break;
        case "home":
          showHome(false);
          break;
      }
    }
    
    updateNavIcons();
  }
}

// Update navigation icons
function updateNavIcons() {
  const backIcons = document.querySelectorAll(".fa-circle-chevron-left");
  const forwardIcons = document.querySelectorAll(".fa-circle-chevron-right");
  
  backIcons.forEach(icon => {
    icon.classList.toggle("disabled", currentIndex <= 0);
  });
  
  forwardIcons.forEach(icon => {
    icon.classList.toggle("disabled", currentIndex >= pageHistory.length - 1);
  });
}