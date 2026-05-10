let popupContent = null;
let isDragging = false;
let startY = 0;
let currentY = 0;

document.addEventListener("DOMContentLoaded", function () {
  $(".sticky-header").show();
  
function isTrueMobile() {
    const userAgent = navigator.userAgent.toLowerCase();
    const platform = navigator.platform.toLowerCase();
    
    // Jika ini desktop platform, langsung return false
    if (platform.indexOf('mac') > -1 || platform.indexOf('win') > -1) {
        return false;
    }
    
    // Jika Linux, pastikan bukan Android
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
  
  var isMobile = isTrueMobile();
  var root = document.documentElement;
  
  if (isMobile) {
    root.style.setProperty("--device", "mobile");
    $(".logo").show();
    $(".bottom-navbar").show();
    // Tambahkan class ke body
    document.body.classList.add('true-mobile');
  } else {
    root.style.setProperty("--device", "desktop");
    $(".sidebar").show();
    document.body.classList.remove('true-mobile');
  }

  initializeCarousels();

  audioPlayer.addEventListener("ended", function () {
    if (isRepeatMode) {
      audioPlayer.currentTime = 0;
      audioPlayer.play();
      showInfo('Repeating Music');
    } else {
      playNextMusic();
    }
  });
});





let homeScrollPosition = 0;

function getScrollContainer() {
  // Untuk desktop, scroll container adalah #active-content
  // Untuk mobile, scroll container adalah window
  return window.innerWidth >= 769 ? 
    document.querySelector('#active-content') : 
    window;
}

function saveScrollPosition() {
  const container = getScrollContainer();
  homeScrollPosition = container === window ? 
    window.scrollY || document.documentElement.scrollTop : 
    container.scrollTop;
}

function restoreScrollPosition() {
  const container = getScrollContainer();
  if (container) {
      if (container === window) {
        window.scrollTo(0, homeScrollPosition);
      } else {
        container.scrollTop = homeScrollPosition;
      }
  }
}  

function showplaylist(hashid, push = true) {
  saveScrollPosition();
  hideAll();

  const startTime = Date.now();
  const container = document.querySelector(".main-content");
  const playlistPage = container.querySelector(".page_playlist");
  const header = document.querySelector(".sticky-header");

  const currentPlaylistId = playlistPage.getAttribute("data-current-playlist");

  if (currentPlaylistId === `playlist:${hashid}`) {
    $(".loader").hide();
    playlistPage.style.display = "block";
    header.style.display = "none";

    // Reset header state
    const playlistHeader = document.querySelector('.playlist-header');
    if (playlistHeader) {
      playlistHeader.classList.remove('visible');
    }

    // PERBAIKAN: Update icon berdasarkan kondisi musik saat ini
    updatePlaylistIconState(hashid);



    if (push) {
      history.pushState({ page: "playlist", id: hashid }, "", `/playlist/${hashid}`);
      pushPageToHistory({ page: "playlist", id: hashid });
    }

    updateNavIcons();
    return;
  }
  else{
    if (canShowLoader()) {
     $(".loader").show();
    }
  }

  $.ajax({
    url: `/playlist/${hashid}`,
    method: "GET",
    success: function (response) {
      playlistPage.innerHTML = response;
      playlistPage.style.display = "block";
      header.style.display = "none";

      // Pastikan header dalam state hidden awal
      const playlistHeader = playlistPage.querySelector('.playlist-header');
      if (playlistHeader) {
        playlistHeader.classList.remove('visible');
      }

      playlistPage.setAttribute("data-current-playlist", `playlist:${hashid}`);

      const oldScript = document.querySelector('script[src="/js/playlist.js"]');
      if (oldScript) oldScript.remove();

      const script = document.createElement("script");
      script.src = "/js/playlist.js";
      script.defer = true;
      document.body.appendChild(script);

      // PERBAIKAN: Update icon berdasarkan kondisi musik saat ini
      updatePlaylistIconState(hashid);

      const lastPlayedMusic = localStorage.getItem("lastPlayedMusic");
      const lastPlayedPlaylist = localStorage.getItem("lastPlayedPlaylist");

      document.querySelectorAll(".listmusic").forEach(track => {
        const trackId = track.getAttribute("data-src");
        const trackPlaylist = track.getAttribute("data-playlist");
        track.classList.toggle("playing", trackId === lastPlayedMusic && trackPlaylist === lastPlayedPlaylist);
      });

      const img = document.querySelector(".banner-img");
      if (img) {
        img.crossOrigin = "anonymous";
        img.onload = () => extractColorPlaylist(img);
      }


      if (push) {
        history.pushState({ page: "playlist", id: hashid }, "", `/playlist/${hashid}`);
        pushPageToHistory({ page: "playlist", id: hashid });
      }

      updateNavIcons();
    },
    complete: function () {
      const elapsed = Date.now() - startTime;
      const remaining = Math.max(0, 600 - elapsed);
      setTimeout(() => $(".loader").hide(), remaining);
    },
    error: function () {
      $(".loader").hide();
      alert("Gagal memuat playlist.");
    }
  });
}


// Fungsi untuk update state icon playlist berdasarkan kondisi musik saat ini
function updatePlaylistIconState(playlistId) {
  const lastPlayedPlaylist = localStorage.getItem("lastPlayedPlaylist");
  const isSamePlaylist = playlistId === lastPlayedPlaylist;
  const isPlaying = !audioPlayer.paused;
  
  console.log('updatePlaylistIconState:', {
    playlistId,
    lastPlayedPlaylist,
    isSamePlaylist,
    isPlaying
  });

  // PERBAIKAN: Update icon berdasarkan kondisi aktual
  if (isSamePlaylist && isPlaying) {
    // Jika playlist ini sedang diputar DAN musik sedang playing
    document.querySelectorAll(".page_playlist .svg-icon.playlist-play").forEach((icon) => {
      icon.innerHTML = pauseIcon;
    });
  } else {
    // Jika playlist ini tidak diputar ATAU musik sedang pause
    document.querySelectorAll(".page_playlist .svg-icon.playlist-play").forEach((icon) => {
      icon.innerHTML = playIcon;
    });
  }
}

function showCustomPlaylist(hashid, push = true, forceReload = false) {
  // Pastikan hashid memiliki prefix 'C'
  if (!hashid.startsWith('C')) {
    hashid = 'C' + hashid;
  }
  if (canShowLoader()) {
  $(".loader").show();
  }
  hideAll();

  const startTime = Date.now();
  const container = document.querySelector(".main-content");
  const playlistPage = container.querySelector(".page_playlist");
  const header = document.querySelector(".sticky-header");

  const currentPlaylistId = playlistPage.getAttribute("data-current-playlist");

  if (currentPlaylistId === `custom:${hashid}` && !forceReload) {
    $(".loader").hide();
    playlistPage.style.display = "block";
    header.style.display = "none";

    // PERBAIKAN: Update icon berdasarkan kondisi musik saat ini
    updateCustomPlaylistIconState(hashid);


    if (push) {
      history.pushState({ page: "custom_playlist", id: hashid }, "", `/custom/${hashid}`);
      pushPageToHistory({ page: "custom_playlist", id: hashid });
    }

    updateNavIcons();
    return;
  }

  $.ajax({
    url: `/custom/${hashid}`,
    method: "GET",
    success: function (response) {
      $(window).scrollTop(0);
      playlistPage.innerHTML = response;
      playlistPage.style.display = "block";
      header.style.display = "none";

      playlistPage.setAttribute("data-current-playlist", `custom:${hashid}`);

      const oldScript = document.querySelector('script[src="/js/playlist.js"]');
      if (oldScript) oldScript.remove();

      const script = document.createElement("script");
      script.src = "/js/playlist.js";
      script.defer = true;
      document.body.appendChild(script);

      // PERBAIKAN: Update icon berdasarkan kondisi musik saat ini
      updateCustomPlaylistIconState(hashid);

      // Ekstrak warna dari gambar pertama pada kolase atau gambar biasa
      const colorSource = document.querySelector(".color-thief-source") || 
                         document.querySelector(".playlistImage");
      
      if (colorSource) {
        if (colorSource.complete) {
          extractColorPlaylist(colorSource);
        } else {
          colorSource.onload = function() {
            extractColorPlaylist(colorSource);
          };
        }
      }

      const lastPlayedMusic = localStorage.getItem("lastPlayedMusic");
      const lastPlayedPlaylist = localStorage.getItem("lastPlayedPlaylist");

      document.querySelectorAll(".listmusic").forEach(track => {
        const trackId = track.getAttribute("data-src");
        const trackPlaylist = track.getAttribute("data-playlist");
        track.classList.toggle("playing", trackId === lastPlayedMusic && trackPlaylist === lastPlayedPlaylist);
      });

      if (push) {
        history.pushState({ page: "custom_playlist", id: hashid }, "", `/custom/${hashid}`);
        pushPageToHistory({ page: "custom_playlist", id: hashid });
      }

      updateNavIcons();
    },
    complete: function () {
      const elapsed = Date.now() - startTime;
      const remaining = Math.max(0, 600 - elapsed);
      setTimeout(() => $(".loader").hide(), remaining);
    },
    error: function (xhr, status, error) {
      $(".loader").hide();
      
      // Tampilkan error yang lebih spesifik
      let errorMessage = "Gagal memuat custom playlist.";
      
      if (xhr.status === 404) {
        errorMessage = "Playlist tidak ditemukan.";
      } else if (xhr.status === 500) {
        errorMessage = "Terjadi kesalahan server.";
      } else if (xhr.responseText) {
        try {
          const errorResponse = JSON.parse(xhr.responseText);
          errorMessage = errorResponse.message || errorMessage;
        } catch (e) {
          errorMessage = xhr.responseText;
        }
      }
      
      alert(errorMessage);
      console.error("Error loading custom playlist:", error);
    }
  });
}

// Fungsi untuk update state icon custom playlist
function updateCustomPlaylistIconState(playlistId) {
  const lastPlayedPlaylist = localStorage.getItem("lastPlayedPlaylist");
  const isSamePlaylist = playlistId === lastPlayedPlaylist;
  const isPlaying = !audioPlayer.paused;
  
  console.log('updateCustomPlaylistIconState:', {
    playlistId,
    lastPlayedPlaylist,
    isSamePlaylist,
    isPlaying
  });

  // PERBAIKAN: Update icon berdasarkan kondisi aktual
  if (isSamePlaylist && isPlaying) {
    document.querySelectorAll(".page_playlist .svg-icon.playlist-play").forEach((icon) => {
      icon.innerHTML = pauseIcon;
    });
  } else {
    document.querySelectorAll(".page_playlist .svg-icon.playlist-play").forEach((icon) => {
      icon.innerHTML = playIcon;
    });
  }
}



function showAlbum(hashid) {
  var isMobile = isTrueMobile();

  if (isMobile) {
    return;
  }
  
  if (event) {
    event.preventDefault();
    event.stopPropagation();
  }

  saveScrollPosition();
  hideAll();

  const startTime = Date.now();
  const container = document.querySelector(".main-content");
  const albumPage = container.querySelector(".page_album");
  const header = document.querySelector(".sticky-header");

  const currentAlbumId = albumPage.getAttribute("data-current-album");

  if (currentAlbumId === `album:${hashid}`) {
    $(".loader").hide();
    albumPage.style.display = "block";
    header.style.display = "none";

    // PERBAIKAN: Update icon berdasarkan kondisi musik saat ini
    updateAlbumIconState(hashid);


      if (push) {
        history.pushState({ page: "album", id: hashid }, "", `/album/${hashid}`);
        pushPageToHistory({ page: "album", id: hashid });
      }

    updateNavIcons();
    return;
  } else {
    if (canShowLoader()) {
    $(".loader").show();
    }
  }

  $.ajax({
    url: `/album/${hashid}`,
    method: "GET",
    success: function (response) {
      albumPage.innerHTML = response;
      albumPage.style.display = "block";
      header.style.display = "none";

      albumPage.setAttribute("data-current-album", `album:${hashid}`);

      const oldScript = document.querySelector('script[src="/js/playlist.js"]');
      if (oldScript) oldScript.remove();

      const script = document.createElement("script");
      script.src = "/js/playlist.js";
      script.defer = true;
      document.body.appendChild(script);

      // PERBAIKAN: Update icon berdasarkan kondisi musik saat ini
      updateAlbumIconState(hashid);

      const lastPlayedMusic = localStorage.getItem("lastPlayedMusic");
      const lastPlayedPlaylist = localStorage.getItem("lastPlayedPlaylist");

      document.querySelectorAll(".listmusic").forEach(track => {
        const trackId = track.getAttribute("data-src");
        const trackPlaylist = track.getAttribute("data-playlist");
        track.classList.toggle("playing", trackId === lastPlayedMusic && trackPlaylist === lastPlayedPlaylist);
      });

      const img = document.querySelector(".album-img");
      if (img) {
        img.crossOrigin = "anonymous";
        img.onload = () => extractColorAlbum(img);
      }

      // PERBAIKAN: Simpan page type untuk album
      localStorage.setItem("lastPlayedPage", "album");

      if (push) {
        history.pushState({ page: "album", id: hashid }, "", `/album/${hashid}`);
        pushPageToHistory({ page: "album", id: hashid });
      }

      updateNavIcons();
    },
    complete: function () {
      const elapsed = Date.now() - startTime;
      const remaining = Math.max(0, 600 - elapsed);
      setTimeout(() => $(".loader").hide(), remaining);
    },
    error: function (xhr, status, error) {
      $(".loader").hide();
      console.error('Error loading album:', error);
      alert("Gagal memuat album: " + (xhr.responseText || 'Terjadi kesalahan'));
    }
  });
}

// Fungsi yang sama untuk showAlbumMobile
function showAlbumMobile(hashid) {
  saveScrollPosition();
  hideAll();

  const startTime = Date.now();
  const container = document.querySelector(".main-content");
  const albumPage = container.querySelector(".page_album");
  const header = document.querySelector(".sticky-header");

  const currentAlbumId = albumPage.getAttribute("data-current-album");

  if (currentAlbumId === `album:${hashid}`) {
    $(".loader").hide();
    albumPage.style.display = "block";
    header.style.display = "none";

    // PERBAIKAN: Update icon berdasarkan kondisi musik saat ini
    updateAlbumIconState(hashid);

    if (push) {
      history.pushState({ page: "album", id: hashid }, "", `/album/${hashid}`);
      pushPageToHistory({ page: "album", id: hashid });
    }

    updateNavIcons();
    return;
  } else {
    if (canShowLoader()) {
    $(".loader").show();
    }
  }

  $.ajax({
    url: `/album/${hashid}`,
    method: "GET",
    success: function (response) {
      albumPage.innerHTML = response;
      albumPage.style.display = "block";
      header.style.display = "none";

      albumPage.setAttribute("data-current-album", `album:${hashid}`);

      const oldScript = document.querySelector('script[src="/js/playlist.js"]');
      if (oldScript) oldScript.remove();

      const script = document.createElement("script");
      script.src = "/js/playlist.js";
      script.defer = true;
      document.body.appendChild(script);

      // PERBAIKAN: Update icon berdasarkan kondisi musik saat ini
      updateAlbumIconState(hashid);

      const lastPlayedMusic = localStorage.getItem("lastPlayedMusic");
      const lastPlayedPlaylist = localStorage.getItem("lastPlayedPlaylist");

      document.querySelectorAll(".listmusic").forEach(track => {
        const trackId = track.getAttribute("data-src");
        const trackPlaylist = track.getAttribute("data-playlist");
        track.classList.toggle("playing", trackId === lastPlayedMusic && trackPlaylist === lastPlayedPlaylist);
      });

      const img = document.querySelector(".album-img");
      if (img) {
        img.crossOrigin = "anonymous";
        img.onload = () => extractColorAlbum(img);
      }

      // PERBAIKAN: Simpan page type untuk album
      localStorage.setItem("lastPlayedPage", "album");


      if (push) {
        history.pushState({ page: "album", id: hashid }, "", `/album/${hashid}`);
        pushPageToHistory({ page: "album", id: hashid });
      }

      updateNavIcons();
    },
    complete: function () {
      const elapsed = Date.now() - startTime;
      const remaining = Math.max(0, 600 - elapsed);
      setTimeout(() => $(".loader").hide(), remaining);
    },
    error: function (xhr, status, error) {
      $(".loader").hide();
      console.error('Error loading album:', error);
      alert("Gagal memuat album: " + (xhr.responseText || 'Terjadi kesalahan'));
    }
  });
}

// Fungsi untuk update state icon album
function updateAlbumIconState(albumId) {
  const lastPlayedPlaylist = localStorage.getItem("lastPlayedPlaylist");
  const isSameAlbum = albumId === lastPlayedPlaylist;
  const isPlaying = !audioPlayer.paused;
  
  console.log('updateAlbumIconState:', {
    albumId,
    lastPlayedPlaylist,
    isSameAlbum,
    isPlaying
  });

  // PERBAIKAN: Update icon berdasarkan kondisi aktual
  if (isSameAlbum && isPlaying) {
    document.querySelectorAll(".page_album .svg-icon.playlist-play").forEach((icon) => {
      icon.innerHTML = pauseIcon;
    });
  } else {
    document.querySelectorAll(".page_album .svg-icon.playlist-play").forEach((icon) => {
      icon.innerHTML = playIcon;
    });
  }
}

function showCategory(categoryName, push = true) {
  hideAll();
  
  let startTime = Date.now();
  
  document.querySelector(".sticky-header").style.display = "block";
  
  // Perbaikan: Gunakan container yang sudah ada di index.ejs
  const pageCategory = document.querySelector(".page_category");
  if (!pageCategory) {
    console.error("page_category container not found!");
    // Buat fallback container
    const fallbackDiv = document.createElement('div');
    fallbackDiv.className = 'page_category';
    fallbackDiv.style.display = 'none';
    document.querySelector('.main-content').appendChild(fallbackDiv);
  }
  
  const targetPage = document.querySelector(".page_category");
  targetPage.style.display = "block";
  
  // Encode untuk data attribute
  const encodedName = encodeURIComponent(categoryName).replace(/%/g, '_');

if (canShowLoader()) {
    $(".loader").show();
}
    
    $.ajax({
      url: `/partial/category/${encodeURIComponent(categoryName)}`,
      method: "GET",
      success: function(html) {
        targetPage.innerHTML = html;
        targetPage.setAttribute(`data-loaded-${encodedName}`, "true");
        
        // Tambahkan event listener untuk playlist
        setTimeout(() => {
          document.querySelectorAll('.visual-card').forEach(card => {
            card.addEventListener('click', function(e) {
              if (!e.target.closest('.svg-circle-wrapper')) {
                const hashid = card.getAttribute('data-playlist-id') || 
                               card.closest('[data-playlist-id]')?.getAttribute('data-playlist-id');
                if (hashid) {
                  showplaylist(hashid);
                }
              }
            });
          });
        }, 100);
        
        // Inisialisasi carousel jika ada
        if (typeof initializeCarousels === 'function') {
          initializeCarousels();
        }
      },
      error: function(err) {
        console.error("Gagal mengambil halaman kategori:", err);
        targetPage.innerHTML = `
          <div class="error-message" style="padding: 40px; text-align: center;">
            <h3>Gagal memuat kategori "${categoryName}"</h3>
            <p>Silakan coba lagi atau pilih kategori lain.</p>
            <button onclick="showHome()" style="margin-top: 20px; padding: 10px 20px; background: var(--primary-color); color: white; border: none; border-radius: 5px; cursor: pointer;">
              Kembali ke Home
            </button>
          </div>
        `;
      },
      complete: function() {
        const elapsed = Date.now() - startTime;
        const remaining = Math.max(0, 600 - elapsed);
        setTimeout(() => {
          $(".loader").hide();
        }, remaining);
      }
    });
  
  
  if (push) {
    history.pushState({ page: "category", id: categoryName }, "", `/category/${encodeURIComponent(categoryName)}`);
    pushPageToHistory({ page: "category", id: categoryName });
  }
  
  updateNavIcons();
  setActiveContent(categoryName);
}

// Update semua fungsi kategori
function EditorChoice() { 
    showCategory('Editor\'s Choice'); 
}

function TopPlaylist() { 
    showCategory('Top Playlist'); 
}

function kategori1() { showCategory('Focus & Study'); }
function kategori2() { showCategory('Relax & Chill'); }
function kategori3() { showCategory('Cinematic & Storytelling'); }
function kategori4() { showCategory('Upbeat & Positive'); }
function kategori5() { showCategory('Energy & Action'); }
function kategori6() { showCategory('Urban & Beat'); }
function kategori7() { showCategory('Ambient & Atmosphere'); }
function kategori8() { showCategory('Creative & Experimental'); }
function kategori9() { showCategory('Corporate & Commercial'); }
function kategori10() { showCategory('Romantic & Emotional'); }


function showHome(push = true) {
  hideAll();

  let startTime = Date.now();

  document.querySelector(".sticky-header").style.display = "block";
  const pageHome = document.querySelector(".page_home");
  pageHome.style.display = "block";


  const isLoaded = pageHome.getAttribute("data-loaded") === "true";

  if (!isLoaded) {
    $.ajax({
      url: "/partial/home",
      method: "GET",
      success: function(html) {
        restoreScrollPosition();
        pageHome.innerHTML = html;
        pageHome.setAttribute("data-loaded", "true");
         updateHome();
        initializeCarousels();
      },
      error: function(err) {
        console.error("Gagal mengambil halaman home:", err);
        restoreScroll();
      },
      complete: function() {
        restoreScrollPosition();
        const elapsed = Date.now() - startTime;
        const remaining = Math.max(0, 0 - elapsed);
        setTimeout(() => {
          $(".loader").hide();
        }, remaining);
      }
    });
  } else {
    restoreScrollPosition();
    initializeCarousels();
    const elapsed = Date.now() - startTime;
    const remaining = Math.max(0, 600 - elapsed);
     setTimeout(() => {
      $(".loader").hide();
    }, remaining);
  }

  if (push) {
    history.pushState({ page: "home" }, "", "/");
    pushPageToHistory({ page: "home" });
  }

  updateNavIcons();
  setActiveContent('Home');
}



function showLikeMusic(pushHistory = true) {

  if (userId) {

  saveScrollPosition();
  hideAll();

  const startTime = Date.now();
  const container = document.querySelector(".main-content");
  const favMusicPage = container.querySelector(".page_fav_music");
  const header = document.querySelector(".sticky-header");
if (canShowLoader()) {
  $(".loader").show();
}

  $.ajax({
    url: '/favoritemusic',
    method: "GET",
    headers: {
      "X-Requested-With": "XMLHttpRequest"
    },
    success: function (response) {
      favMusicPage.innerHTML = response;
      favMusicPage.style.display = "block";
      header.style.display = "none";

      const oldScript = document.querySelector('script[src="/js/playlist.js"]');
      if (oldScript) oldScript.remove();

      const script = document.createElement("script");
      script.src = "/js/playlist.js";
      script.defer = true;
      document.body.appendChild(script);

      const lastPlayedMusic = localStorage.getItem("lastPlayedMusic");
      const lastPlayedPlaylist = localStorage.getItem("lastPlayedPlaylist");
      const lastPlayedPage = localStorage.getItem("lastPlayedPage");

      const firstTrack = favMusicPage.querySelector('.listmusic');
      const favMusicHashid = firstTrack ? firstTrack.getAttribute('data-playlist') : 'FAV999999';

      const img = document.querySelector(".fav-music-img");
      if (img) {
        img.crossOrigin = "anonymous";
        img.onload = () => extractColorFav(img);
      }

      // PERBAIKAN: Jangan timpa lastPlayedPage jika sedang memutar dari playlist lain
      if (lastPlayedPlaylist === favMusicHashid || !lastPlayedPlaylist) {
        localStorage.setItem("lastPlayedPage", "fav_music");
      } else {
        console.log('Keeping lastPlayedPage as:', lastPlayedPage, 'because playing from different playlist');
      }

        if (pushHistory) {
        history.pushState({ page: "fav_music", id: "FAV999999" }, "", '/favoritemusic');
        pushPageToHistory({ page: "fav_music", id: "FAV999999" });
      }

      updateNavIcons();
    },
    complete: function () {
      const elapsed = Date.now() - startTime;
      const remaining = Math.max(0, 600 - elapsed);
      setTimeout(() => $(".loader").hide(), remaining);
    },
    error: function (xhr, status, error) {
      $(".loader").hide();
      console.error('Error loading favorite music:', error);
      alert("Gagal memuat musik favorit: " + (xhr.responseText || 'Terjadi kesalahan'));
    }
  });
  }
  else {
    showLogin();
  }

  setActiveContent('Favorite');

}



function openLicense(push = true) {
  const startTime = Date.now();
  hideAll();
  const pageLicense = document.querySelector(".page_license");
  pageLicense.style.display = "block";

  const isMobile = isTrueMobile();
  if (!isMobile) {
    $(".sticky-header").show();
  }

  const isLoaded = pageLicense.getAttribute("data-loaded") === "true";

  if (!isLoaded) {
    if (canShowLoader()) {
      $(".loader").show();
    }
    $.ajax({
      url: "/partial/license",
      method: "GET",
      success: function (html) {
        pageLicense.innerHTML = html;
        pageLicense.setAttribute("data-loaded", "true");
      },
      error: function (err) {
        console.error("Gagal mengambil halaman license:", err);
      },
      complete: function () {
        const elapsed = Date.now() - startTime;
        const remaining = Math.max(0, 600 - elapsed);
        setTimeout(() => $(".loader").hide(), remaining);
      }
    });
  } else {
    $(".loader").hide();
  }

  if (push) {
    history.pushState({ page: "license" }, "", "/license");
    pushPageToHistory({ page: "license" });
  }

  updateNavIcons();
  setActiveContent('License');
}


function openLyric(push = true) {
  const startTime = Date.now();
  hideAll();
  const pageLyric = document.querySelector(".page_lyric");
  pageLyric.style.display = "block";

  // Ganti dengan displayLyricsScreen()
  if (currentPlayingItem) {
    displayLyricsScreen();

    if (audioPlayer.paused) {
      document.querySelectorAll('.music-wave.animate').forEach(wave => {
        wave.classList.add('paused');
      });
    }
  }

  var isMobile = isTrueMobile();
  if (!isMobile) {
    $(".sticky-header").show();
  }

  const isLoaded = pageLyric.getAttribute("data-loaded") === "true";

  if (!isLoaded) {
    if (canShowLoader()) {
      $(".loader").show();
    }
    $.ajax({
      url: "/partial/lyric",
      method: "GET",
      success: function (html) {
        pageLyric.innerHTML = html;
        pageLyric.setAttribute("data-loaded", "true");
        
        // Panggil displayLyricsScreen() setelah load
        if (currentPlayingItem) {
          displayLyricsScreen();
        }
      },
      error: function (err) {
        console.error("Gagal mengambil halaman lyric:", err);
      },
      complete: function () {
        const elapsed = Date.now() - startTime;
        const remaining = Math.max(0, 600 - elapsed);
        setTimeout(() => $(".loader").hide(), remaining);
      }
    });
  } else {
    $(".loader").hide();
  }

  if (push) {
    history.pushState({ page: "lyric" }, "", "/lyric");
    pushPageToHistory({ page: "lyric" });
  }
  updateNavIcons();
}

let startTimes = [];
let lastLyricIndex2 = -1;
let reachedFinalLyric = false;

function displayLyricsScreen() {
  const lyricDiv = document.getElementById('lyricScreen');
  if (!lyricDiv) return;

  if (!currentPlayingItem) {
    lyricDiv.innerHTML = '<p class="empty-lyric">No track selected</p>';
    return;
  }

  // PERBAIKAN: Ambil lyric dengan berbagai cara
  let lyricText = '';
  
  // Coba dari dataset terlebih dahulu
  if (currentPlayingItem.dataset.lyric) {
    lyricText = currentPlayingItem.dataset.lyric;
  } 
  // Coba dari attribute data-lyric
  else if (currentPlayingItem.getAttribute('data-lyric')) {
    lyricText = currentPlayingItem.getAttribute('data-lyric');
  }
  // Coba dari localStorage jika ada
  else {
    const lastMusicId = localStorage.getItem('lastMusicId');
    if (lastMusicId) {
      const savedTracks = localStorage.getItem(`playlistTracks_SE`);
      if (savedTracks) {
        try {
          const parsed = JSON.parse(savedTracks);
          const track = parsed.tracks.find(t => t.id === lastMusicId);
          if (track && track.lyric) {
            lyricText = track.lyric;
          }
        } catch (e) {
          console.error('Error parsing localStorage:', e);
        }
      }
    }
  }

  console.log('Lyric data:', {
    hasLyric: !!lyricText,
    lyricLength: lyricText ? lyricText.length : 0,
    lyricPreview: lyricText ? lyricText.substring(0, 100) + '...' : 'empty',
    source: currentPlayingItem.dataset.lyric ? 'dataset' : 
            currentPlayingItem.getAttribute('data-lyric') ? 'attribute' : 'localStorage'
  });

  // PERBAIKAN: Decode escaped newlines
  if (lyricText) {
    lyricText = lyricText.replace(/\\n/g, '\n');
  }

  const lyricLines = lyricText ? lyricText.split('\n') : [];
  
  // PERBAIKAN: Cek jika benar-benar kosong
  const isEmptyLyric = lyricLines.length === 0 || 
                      (lyricLines.length === 1 && lyricLines[0].trim() === '');

  if (isEmptyLyric) {
    lyricDiv.innerHTML = '<p class="empty-lyric">No lyrics available</p>';
    return;
  }

  // Ambil line_durations
  const lineDurationsAttr = currentPlayingItem.dataset.lineDurations || 
                          currentPlayingItem.dataset['line-durations'] ||
                          currentPlayingItem.getAttribute('data-line-durations') || 
                          currentPlayingItem.getAttribute('data-lineDurations') || '';

  console.log('Line durations:', {
    hasLineDurations: !!lineDurationsAttr,
    value: lineDurationsAttr,
    length: lineDurationsAttr ? lineDurationsAttr.length : 0
  });

  // Jika line_durations kosong/null, tampilkan lirik biasa tanpa timing
  if (!lineDurationsAttr || lineDurationsAttr.trim() === '' || lineDurationsAttr === 'null') {
    // Kosongkan kontainer
    lyricDiv.innerHTML = '';
    
    // Tampilkan semua baris lirik tanpa timing
    lyricLines.forEach((line, index) => {
      if (line.trim() === '') return; // Skip baris kosong
      
      const p = document.createElement('p');
      p.classList.add('lyric-line');
      p.textContent = line;
      p.style.opacity = '0.7';
      p.style.color = '#b2b2b2';
      
      // Tambahkan class statis
      p.classList.add('no-timing');
      
      lyricDiv.appendChild(p);
    });
    
    // Tambahkan pesan info jika ada lirik
    if (lyricLines.length > 0) {
      const infoP = document.createElement('p');
      infoP.classList.add('lyric-info');
      infoP.textContent = 'Lyrics displayed without sync timing';
      infoP.style.fontSize = '1.5rem';
      infoP.style.color = '#888';
      infoP.style.textAlign = 'center';
      infoP.style.marginTop = '30px';
      infoP.style.fontStyle = 'italic';
      lyricDiv.appendChild(infoP);
    }
    
    return;
  }

  // Jika ada line_durations, gunakan logika normal
  const lineDurationsRaw = lineDurationsAttr.split(',');

  lyricDiv.innerHTML = '';
  startTimes = [];
  lastLyricIndex2 = -1;
  reachedFinalLyric = false;

  let currentTime = 0;
  let lyricLineIndex = 0;

  lineDurationsRaw.forEach((durationRaw) => {
    const p = document.createElement('p');
    p.classList.add('lyric-line');

    startTimes.push(currentTime);
    p.setAttribute('data-time', currentTime / 1000);

    p.addEventListener('click', function() {
      const time = parseFloat(this.getAttribute('data-time'));
      audioPlayer.currentTime = time;
      if (audioPlayer.paused) audioPlayer.play();
      updateLyricsScreen();
    });

    if (durationRaw.startsWith('d-')) {
      const delay = parseInt(durationRaw.split('-')[1]);
      p.classList.add('music-icon-line');
      
      const wave = document.createElement('div');
      wave.className = 'music-wave static';
      wave.innerHTML = '<span></span><span></span><span></span>';
      p.appendChild(wave);
      
      currentTime += delay;
    } else {
      const lineText = lyricLines[lyricLineIndex] || '';
      p.textContent = lineText;
      lyricLineIndex++;
      currentTime += parseInt(durationRaw);
    }

    lyricDiv.appendChild(p);
  });

  // Update lirik yang ada timing
  updateLyricsScreen();
}

function updateLyricsScreen() {
  const lyricDiv = document.getElementById('lyricScreen');
  if (!lyricDiv) return;
  
  // Cek jika ada class no-timing (lirik tanpa sync)
  const hasNoTiming = lyricDiv.querySelector('.no-timing');
  if (hasNoTiming) {
    return; // Tidak perlu update untuk lirik tanpa timing
  }
  
  const elapsedTime = audioPlayer.currentTime * 1000;

  // Tangani jika sudah mencapai akhir lagu
  if (elapsedTime >= startTimes[startTimes.length - 1]) {
    if (reachedFinalLyric) return; // jangan update ulang
    reachedFinalLyric = true;
    highlightLyric(startTimes.length - 1);
    return;
  }

  let currentLyricIndex = -1;
  for (let i = 0; i < startTimes.length; i++) {
    if (elapsedTime < startTimes[i]) {
      currentLyricIndex = i - 1;
      break;
    }
  }

  if (currentLyricIndex < 0) currentLyricIndex = 0;

  if (currentLyricIndex !== lastLyricIndex2) {
    highlightLyric(currentLyricIndex);
  }
}

function highlightLyric(index) {
  const lyricDiv = document.getElementById('lyricScreen');
  if (!lyricDiv) return;

  lastLyricIndex2 = index;
  const lyrics = lyricDiv.querySelectorAll('p');

  lyrics.forEach((p, i) => {
    if (i === index) {
      p.classList.add('highlightedlyric');
      
      if (p.classList.contains('music-icon-line')) {
        const wave = p.querySelector('.music-wave');
        if (wave) {
          wave.className = 'music-wave animate';
          if (audioPlayer.paused) {
            wave.classList.add('paused');
          }
        }
      }

      // Smooth scroll ke tengah
      const scroller = document.querySelector('.scrollerScreen');
      if (scroller) {
        const lineTop = p.offsetTop;
        const lineHeight = p.offsetHeight;
        const scrollTo = lineTop - (scroller.offsetHeight / 2) + (lineHeight / 2);
        
        scroller.scrollTo({
          top: scrollTo,
          behavior: 'smooth'
        });
      }
    } else {
      p.classList.remove('highlightedlyric');
      if (p.classList.contains('music-icon-line')) {
        const wave = p.querySelector('.music-wave');
        if (wave && wave.classList.contains('animate')) {
          wave.className = 'music-wave static';
        }
      }
    }
  });
}

// Audio event listeners
audioPlayer.addEventListener("pause", function() {
  document.querySelectorAll('.music-wave.animate').forEach(wave => {
    wave.classList.add('paused');
  });
});

audioPlayer.addEventListener("play", function() {
  document.querySelectorAll('.music-wave.animate').forEach(wave => {
    wave.classList.remove('paused');
  });
});

function updateTimeDisplay(startTimeEl, endTimeEl) {
  if (audioPlayer) {
    audioPlayer.addEventListener('loadedmetadata', function () {
      endTimeEl.textContent = formatTime(audioPlayer.duration);
    });

    if (!isNaN(audioPlayer.duration) && audioPlayer.duration > 0) {
      endTimeEl.textContent = formatTime(audioPlayer.duration);
    }

    audioPlayer.addEventListener('timeupdate', function () {
      startTimeEl.textContent = formatTime(audioPlayer.currentTime);
    });
  }
}


function find(push = true) {
  const startTime = Date.now();

  hideAll();

  const pageSearch = document.querySelector(".page_search");
  pageSearch.style.display = "block";

  var isMobile = isTrueMobile();
  if (!isMobile) {
    $(".sticky-header").show();
  }

  const isLoaded = pageSearch.getAttribute("data-loaded") === "true";

  if (!isLoaded) {
    if (canShowLoader()) {
    $(".loader").show();
    }
    $.ajax({
      url: "/partial/search",
      method: "GET",
      success: function (html) {
        pageSearch.innerHTML = html;
        pageSearch.setAttribute("data-loaded", "true");
      },
      error: function (err) {
        console.error("Gagal mengambil halaman search:", err);
      },
      complete: function () {
        const elapsed = Date.now() - startTime;
        const remaining = Math.max(0, 600 - elapsed);
        setTimeout(() => $(".loader").hide(), remaining);
      }
    });
  } else {
    $(".loader").hide();
  }

  if (push) {
    history.pushState({ page: "search" }, "", "/search");
    pushPageToHistory({ page: "search" });
  }

  updateNavIcons();
  setActiveContent('Explore');
}


function setActiveNavButton() {
  const path = window.location.pathname;
  const buttons = document.querySelectorAll('.bottom-navbar button');
  
  // Hapus semua class active terlebih dahulu
  buttons.forEach(btn => btn.classList.remove('active'));
  
  // Jika ukuran layar >768px, paksa active ke index 0 (home)
  if (window.innerWidth > 768) {
    buttons[0].classList.add('active');
    return;
  }
  
  // Tentukan button mana yang harus aktif berdasarkan path
  if (path === '/') {
    buttons[0].classList.add('active'); // Home button
  } else if (path === '/search') {
    buttons[1].classList.add('active'); // Search button
  } else if (path === '/library') {
    buttons[2].classList.add('active'); // Library button
  }
  
  // Update posisi effect
  updateEffectPosition();
}

function library(push = true) {
  var isMobile = isTrueMobile();
  if (!isMobile) {
    showHome(false);
    if (push) {
      history.replaceState({ page: "home" }, "", "/");
    }
    return;
  }

  const startTime = Date.now();
  hideAll();

  const pageLibrary = document.querySelector(".page_library");
  pageLibrary.style.display = "block";

  document.documentElement.classList.add('loading-library');

  const isLoaded = pageLibrary.getAttribute("data-loaded") === "true";

  if (!isLoaded) {
    if (canShowLoader()) {
    $(".loader").show();
    }
    
    loadLibraryCSS().then(() => {
      $.ajax({
        url: "/partial/library",
        method: "GET",
        success: function (html) {
          pageLibrary.innerHTML = html;
          pageLibrary.setAttribute("data-loaded", "true");
          initializeLibraryAfterLoad();
        },
        error: function (err) {
          console.error("Failed to load library page:", err);
          // Fallback to home if library fails to load
          showHome(false);
          history.replaceState({ page: "home" }, "", "/");
        },
        complete: function () {
          const elapsed = Date.now() - startTime;
          const remaining = Math.max(0, 600 - elapsed);
          setTimeout(() => {
            $(".loader").hide();
            document.documentElement.classList.remove('loading-library');
          }, remaining);
        }
      });
    });
  } else {
    initializeLibraryAfterLoad();
    $(".loader").hide();
    document.documentElement.classList.remove('loading-library');
  }

  if (isMobile && push) {
    history.pushState({ page: "library" }, "", "/library");
    pushPageToHistory({ page: "library" });
  }
  setActiveContent('Collection');
}


function loadLibraryCSS() {
  return new Promise((resolve) => {
    if (document.querySelector('link[href="/css/library.css"]')) {
      resolve();
      return;
    }
    const cssLink = document.createElement('link');
    cssLink.rel = 'stylesheet';
    cssLink.href = '/css/library.css';
    cssLink.onload = resolve;
    cssLink.onerror = resolve;
  
    document.head.appendChild(cssLink);
  });
}




function initializeLibraryAfterLoad() {
  libraryState.initialized = false;
  setTimeout(() => {
    initializeLibrary();
    updateViewMode();
    if (libraryState.currentTab === 'all') {
      updateGroupView();
    }
  }, 50);
}

// Update fungsi untuk bottom navbar
function goHome() {
  const currentPath = window.location.pathname;
  
  if (currentPath === '/') {
    showHome(false);
  } else {
    showHome(true);
  }
  
  setActiveContent('Home');
}

function goSearch() {
  const currentPath = window.location.pathname;
  
  if (currentPath === '/search') {
    find(false);
  } else {
    find(true);
  }
  
  setActiveContent('Explore');
}

function goLibrary() {
  var isMobile = isTrueMobile();
  
  if (window.innerWidth > 768 && !isMobile) {
    showHome(false);
    history.replaceState({ page: "home" }, "", "/");
    return;
  }

  const currentPath = window.location.pathname;
  
  if (currentPath === '/library') {
    library(false);
  } else {
    library(true);
  }
  
  setActiveContent('Collection');
}

function goProfile(hashid) {
  if (!userId) {
        showLogin();
        return;
  }
  else{
    showProfile(hashid)
  }
}






function updateHome() {
  const lastPlayedPlaylist = localStorage.getItem("lastPlayedPlaylist");
  if (!lastPlayedPlaylist) return;

  const coverList = document.querySelectorAll(".visual-card");

  coverList.forEach((cover) => {
    const wrapper = cover.querySelector(".svg-circle-wrapper");
    const hashid = wrapper?.getAttribute("data-playlist-hashid");

    if (hashid === lastPlayedPlaylist) {
      cover.classList.add("playing");

      const icon = cover.querySelector(".playlistCover-play");
      if (icon) {
        icon.innerHTML = audioPlayer.paused ? playIcon : pauseIcon;
      }
    } else {
      cover.classList.remove("playing");
      const icon = cover.querySelector(".playlistCover-play");
      if (icon) {
        icon.innerHTML = playIcon; // Reset ke playIcon default
      }
    }
  });

  const savedMusic = localStorage.getItem("currentlyPlaying_");

  if (savedMusic) {
    const data = JSON.parse(savedMusic);

    const coverEls = document.querySelectorAll(".current-cover");
    const titleEls = document.querySelectorAll(".title");
    const artistEls = document.querySelectorAll(".artistNames");

    coverEls.forEach((el) => (el.src = data.cover));
    titleEls.forEach((el) => (el.textContent = data.title));
    artistEls.forEach((container) => {
      container.innerHTML = ""; // Kosongkan dulu

      const artists = data.artist.split(",");
      const artistHashids = data.artistHashids ? data.artistHashids.split(",") : [];

      artists.forEach((name, index) => {
        const span = document.createElement("span");
        span.className = "artist-item";
        span.textContent = name.trim();
        
        // PERBAIKAN: Gunakan artistHashids jika ada
        const artistHashid = artistHashids[index]?.trim() || "";
        span.dataset.artistHashid = artistHashid;
        span.style.cursor = "pointer";
        
        span.addEventListener("click", (e) => {
          var isMobile = isTrueMobile();
          const insideMiddleContent = span.closest(".middleContent");

          // Cegah klik di mobile jika BUKAN di dalam .middleContent
          if (isMobile && !insideMiddleContent) return;

          // PERBAIKAN: Tampilkan hashid artist dan navigasi ke halaman artist
          if (artistHashid && isMobile) {
            slideDownPlayer();
            viewArtist(`${artistHashid}`);
          } else if(!isMobile && artistHashid) {
            viewArtist(`${artistHashid}`);
          }
          else{
            showInfo("invalid Artist")
          }
        });

        container.appendChild(span);

        if (index < artists.length - 1) {
          container.appendChild(document.createTextNode(", "));
        }
      });
    });
  }
}

function viewArtist(hashid) {
  hideAll();
  saveScrollPosition();
  
  const startTime = Date.now();
  const container = document.querySelector(".main-content");
  const artistPage = container.querySelector(".page_artist");
  const header = document.querySelector(".sticky-header");

  const currentArtistId = artistPage.getAttribute("data-current-artist");

  if (currentArtistId === `artist:${hashid}`) {
    $(".loader").hide();
    artistPage.style.display = "block";
    header.style.display = "none";

    // PERBAIKAN: Update icon berdasarkan kondisi musik saat ini
    updateArtistIconState(hashid);

    const currentState = history.state;
    const currentURL = window.location.pathname;

    if (!currentState || currentState.id !== hashid || currentURL !== `/artist/${hashid}`) {
      history.pushState({ page: "artist", id: hashid }, "", `/artist/${hashid}`);
      pushPageToHistory({ page: "artist", id: hashid });
    }

    updateNavIcons();
    closePopup();
    return;
  } else {
    if (canShowLoader()) {
    $(".loader").show();
    }
  }

  $.ajax({
    url: `/artist/${hashid}`,
    method: "GET",
    success: function (response) {
      artistPage.innerHTML = response;
      artistPage.style.display = "block";
      header.style.display = "none";

      artistPage.setAttribute("data-current-artist", `artist:${hashid}`);

      const oldScript = document.querySelector('script[src="/js/playlist.js"]');
      if (oldScript) oldScript.remove();

      const script = document.createElement("script");
      script.src = "/js/playlist.js";
      script.defer = true;
      document.body.appendChild(script);

      // PERBAIKAN: Update icon berdasarkan kondisi musik saat ini
      updateArtistIconState(hashid);

      const lastPlayedMusic = localStorage.getItem("lastPlayedMusic");
      const lastPlayedPlaylist = localStorage.getItem("lastPlayedPlaylist");

      document.querySelectorAll(".listmusic").forEach(track => {
        const trackId = track.getAttribute("data-src");
        const trackPlaylist = track.getAttribute("data-playlist");
        track.classList.toggle("playing", trackId === lastPlayedMusic && trackPlaylist === lastPlayedPlaylist);
      });

      const img = document.querySelector(".artist-img");
      if (img) {
        img.crossOrigin = "anonymous";
        img.onload = () => extractColorArtist(img);
      }

      const currentState = history.state;
      const currentURL = window.location.pathname;

      if (!currentState || currentState.id !== hashid || currentURL !== `/artist/${hashid}`) {
        history.pushState({ page: "artist", id: hashid }, "", `/artist/${hashid}`);
        pushPageToHistory({ page: "artist", id: hashid });
      }
      closePopup();
      updateNavIcons();
    },
    complete: function () {
      const elapsed = Date.now() - startTime;
      const remaining = Math.max(0, 600 - elapsed);
      setTimeout(() => $(".loader").hide(), remaining);
    },
    error: function () {
      $(".loader").hide();
      alert("Gagal memuat artist.");
    }
  });
}

function showArtist(hashid) {
  var isMobile = isTrueMobile();

  if (isMobile) {
    return;
  }
  event.preventDefault();
  event.stopPropagation();

  saveScrollPosition();
  hideAll();

  const startTime = Date.now();
  const container = document.querySelector(".main-content");
  const artistPage = container.querySelector(".page_artist");
  const header = document.querySelector(".sticky-header");

  const currentArtistId = artistPage.getAttribute("data-current-artist");

  if (currentArtistId === `artist:${hashid}`) {
    $(".loader").hide();
    artistPage.style.display = "block";
    header.style.display = "none";

    // PERBAIKAN: Update icon berdasarkan kondisi musik saat ini
    updateArtistIconState(hashid);

    const currentState = history.state;
    const currentURL = window.location.pathname;

    if (!currentState || currentState.id !== hashid || currentURL !== `/artist/${hashid}`) {
      history.pushState({ page: "artist", id: hashid }, "", `/artist/${hashid}`);
      pushPageToHistory({ page: "artist", id: hashid });
    }

    updateNavIcons();
    return;
  } else {
    if (canShowLoader()) {
    $(".loader").show();
    }
  }

  $.ajax({
    url: `/artist/${hashid}`,
    method: "GET",
    success: function (response) {
      artistPage.innerHTML = response;
      artistPage.style.display = "block";
      header.style.display = "none";

      artistPage.setAttribute("data-current-artist", `artist:${hashid}`);

      const oldScript = document.querySelector('script[src="/js/playlist.js"]');
      if (oldScript) oldScript.remove();

      const script = document.createElement("script");
      script.src = "/js/playlist.js";
      script.defer = true;
      document.body.appendChild(script);

      // PERBAIKAN: Update icon berdasarkan kondisi musik saat ini
      updateArtistIconState(hashid);

      const lastPlayedMusic = localStorage.getItem("lastPlayedMusic");
      const lastPlayedPlaylist = localStorage.getItem("lastPlayedPlaylist");

      document.querySelectorAll(".listmusic").forEach(track => {
        const trackId = track.getAttribute("data-src");
        const trackPlaylist = track.getAttribute("data-playlist");
        track.classList.toggle("playing", trackId === lastPlayedMusic && trackPlaylist === lastPlayedPlaylist);
      });

      const img = document.querySelector(".artist-img");
      if (img) {
        img.crossOrigin = "anonymous";
        img.onload = () => extractColorArtist(img);
      }

      const currentState = history.state;
      const currentURL = window.location.pathname;

      if (!currentState || currentState.id !== hashid || currentURL !== `/artist/${hashid}`) {
        history.pushState({ page: "artist", id: hashid }, "", `/artist/${hashid}`);
        pushPageToHistory({ page: "artist", id: hashid });
      }

      updateNavIcons();
    },
    complete: function () {
      const elapsed = Date.now() - startTime;
      const remaining = Math.max(0, 600 - elapsed);
      setTimeout(() => $(".loader").hide(), remaining);
    },
    error: function () {
      $(".loader").hide();
      alert("Gagal memuat artist.");
    }
  });
}



// Fungsi untuk update state icon artist
function updateArtistIconState(artistId) {
  const lastPlayedPlaylist = localStorage.getItem("lastPlayedPlaylist");
  const isSameArtist = artistId === lastPlayedPlaylist;
  const isPlaying = !audioPlayer.paused;
  
  console.log('updateArtistIconState:', {
    artistId,
    lastPlayedPlaylist,
    isSameArtist,
    isPlaying
  });

  // PERBAIKAN: Update icon berdasarkan kondisi aktual
  if (isSameArtist && isPlaying) {
    document.querySelectorAll(".page_artist .svg-icon.playlist-play").forEach((icon) => {
      icon.innerHTML = pauseIcon;
    });
  } else {
    document.querySelectorAll(".page_artist .svg-icon.playlist-play").forEach((icon) => {
      icon.innerHTML = playIcon;
    });
  }
}



let popupTimeout;

function showInfo(message, type = 'info') {
  const popup = document.getElementById("popupInfo");
  
  // Reset kelas dan konten
  popup.className = 'alertInfo';
  popup.classList.add(type);
  
  // Struktur HTML yang lebih profesional
  popup.innerHTML = `
    <div class="alert-content">
      <div class="alert-message">${message}</div>
      <div class="alert-close" onclick="hideInfo()">&times;</div>
    </div>
  `;
  
  // Tampilkan dengan animasi
  popup.style.display = "block";
  
  // Trigger reflow untuk memastikan animasi berjalan
  void popup.offsetWidth;
  
  popup.classList.add("show");

  // Clear timeout sebelumnya jika ada
  if (popupTimeout) {
    clearTimeout(popupTimeout);
  }

  // Set timeout untuk auto-hide
  popupTimeout = setTimeout(hideInfo, 5000);
}

function hideInfo() {
  const popup = document.getElementById("popupInfo");
  popup.classList.remove("show");
  
  // Tunggu animasi selesai sebelum hide
  setTimeout(() => {
    popup.style.display = "none";
  }, 300);
}



let activePopup = null;

function setupMobileGestureControl(popupSelector, scrollableElement = null) {
  const popup = document.querySelector(popupSelector);
  const content = popup.querySelector('.popup-content');
  
  if (!content) return;

  // Jika tidak diberikan scrollableElement, cari berdasarkan konteks popup
  if (!scrollableElement) {
    if (popup.classList.contains('follow')) {
      // Untuk follow popup, cari follow-list yang aktif
      scrollableElement = currentTab === 'followers' 
        ? document.getElementById('followersList')
        : document.getElementById('followingList');
    } else if (popup.classList.contains('listMo')) {
      // Untuk playlist popup, cari playlist-wrapper
      scrollableElement = popup.querySelector('.playlist-wrapper');
    }
  }

  let isDragging = false;
  let startY = 0;
  let currentY = 0;
  let startTranslateY = 0;
  let isScrollingContent = false;

  // Fungsi untuk mencegah scroll pada body
  function preventBodyScroll(prevent) {
    if (prevent) {
      document.body.classList.add('popup-active');
      document.addEventListener('touchmove', preventDefault, { passive: false });
    } else {
      document.body.classList.remove('popup-active');
      document.removeEventListener('touchmove', preventDefault);
    }
  }

  function preventDefault(e) {
    e.preventDefault();
  }

  // Fungsi untuk mengecek apakah touch terjadi di area yang bisa di-scroll
  function isTouchInScrollableArea(touchY) {
    if (!scrollableElement) return false;
    const rect = scrollableElement.getBoundingClientRect();
    return touchY >= rect.top && touchY <= rect.bottom;
  }

  // Hapus event listener lama jika ada
  if (scrollableElement) {
    // Clone element untuk menghapus event listener lama
    const newScrollableElement = scrollableElement.cloneNode(true);
    scrollableElement.parentNode.replaceChild(newScrollableElement, scrollableElement);
    scrollableElement = newScrollableElement;
    
    scrollableElement.addEventListener('touchstart', (e) => {
      // Jika element bisa di-scroll, biarkan event touch diteruskan
      if (scrollableElement.scrollHeight > scrollableElement.clientHeight) {
        isScrollingContent = true;
        startY = e.touches[0].clientY;
        e.stopPropagation();
      }
    }, { passive: true });

    scrollableElement.addEventListener('touchmove', (e) => {
      if (isScrollingContent) {
        // Jika element di-scroll, hentikan propagasi
        e.stopPropagation();
        
        // Cek jika sudah mencapai batas atas/bawah
        const atTop = scrollableElement.scrollTop === 0;
        const atBottom = scrollableElement.scrollTop + scrollableElement.clientHeight >= scrollableElement.scrollHeight - 1;
        const touchY = e.touches[0].clientY;
        const touchDiff = touchY - startY;
        
        // Jika di atas dan mencoba scroll ke bawah, atau di bawah dan mencoba scroll ke atas
        // Biarkan event untuk memungkinkan drag popup
        if ((atTop && touchDiff > 0) || (atBottom && touchDiff < 0)) {
          isScrollingContent = false;
          // Mulai drag popup
          startY = touchY;
          isDragging = true;
          content.classList.add('dragging');
          preventBodyScroll(true);
          content.style.transition = 'none';
        }
      }
    }, { passive: false });

    scrollableElement.addEventListener('touchend', () => {
      if (isScrollingContent) {
        isScrollingContent = false;
        preventBodyScroll(false);
      }
    });
  }

  content.addEventListener('touchstart', (e) => {
    // Cek apakah touch dimulai di area scrollable yang sedang di-scroll
    if (isTouchInScrollableArea(e.touches[0].clientY) && 
        scrollableElement && scrollableElement.scrollHeight > scrollableElement.clientHeight) {
      isScrollingContent = true;
      startY = e.touches[0].clientY;
      return;
    }
    
    isScrollingContent = false;
    startY = e.touches[0].clientY;
    currentY = startY;
    
    // Dapatkan posisi translateY saat ini
    const transformValue = content.style.transform;
    startTranslateY = transformValue ? parseInt(transformValue.match(/translateY\(([^)]+)px\)/)[1]) : 0;
    
    isDragging = true;
    content.classList.add('dragging');
    preventBodyScroll(true); // Mencegah scroll body
    content.style.transition = 'none';
  }, { passive: false });

  content.addEventListener('touchmove', (e) => {
    if (isScrollingContent) {
      // Biarkan scroll content bekerja normal
      return;
    }
    
    if (!isDragging) return;
    currentY = e.touches[0].clientY;
    const diff = currentY - startY;
    
    // Hanya proses swipe down (nilai positif)
    if (diff > 0) {
      // Gunakan nilai yang lebih halus dengan easing
      const translateY = Math.min(diff, content.offsetHeight);
      content.style.transform = `translateY(${translateY}px)`;
      e.preventDefault();
    }
  }, { passive: false });

  content.addEventListener('touchend', () => {
    if (isScrollingContent) {
      isScrollingContent = false;
      preventBodyScroll(false);
      return;
    }
    
    if (!isDragging) return;
    isDragging = false;
    content.classList.remove('dragging');
    preventBodyScroll(false); // Izinkan scroll body kembali
    
    const diff = currentY - startY;
    const velocity = diff / 300;

    // Jika drag cukup jauh atau kecepatan cukup tinggi, close popup
    if (diff > content.offsetHeight * 0.25 || velocity > 0.5) {
      closePopup(popupSelector);
    } else {
      // Kembalikan ke posisi semula dengan animasi smooth
      content.style.transition = 'transform 0.5s cubic-bezier(0.25, 0.8, 0.25, 1)';
      content.style.transform = 'translateY(0)';
    }
  });

  // Pastikan untuk membersihkan event listener ketika popup ditutup
  popup.addEventListener('popupClose', () => {
    preventBodyScroll(false);
    // Hapus event listener
    if (scrollableElement) {
      scrollableElement.replaceWith(scrollableElement.cloneNode(true));
    }
  });
}


function showPopup(specificPopup = null) {
  let popup = specificPopup;
  
  if (!popup) {
    // Cari popup di halaman aktif terlebih dahulu
    const currentPage = getCurrentActivePage();
    popup = currentPage.querySelector('.listMo');
    
    // Jika tidak ada, cari di document
    if (!popup) {
      popup = document.querySelector('.listMo');
    }
  }

  if (!popup) {
    console.error('Popup not found');
    return;
  }

  // PERBAIKAN: Sembunyikan semua popup lainnya terlebih dahulu
  document.querySelectorAll('.listMo').forEach(otherPopup => {
    if (otherPopup !== popup) {
      otherPopup.style.display = 'none';
      otherPopup.classList.remove('active');
    }
  });

  popup.style.display = 'block';
  
  setTimeout(() => {
    popup.classList.add('active');
    const content = popup.querySelector('.popup-content');
    if (content) {
      content.style.transition = 'transform 0.4s cubic-bezier(0.25, 0.8, 0.25, 1)';
      content.style.transform = 'translateY(0)';
    }
  }, 10);

  setupMobileGestureControl('.listMo');
  activePopup = '.listMo';
  
  const overlay = popup.querySelector('.popup-overlay');
  if (overlay) {
    overlay.classList.remove("fadeOut");
    overlay.classList.add("fadeIn");
  }
}
function getCurrentActivePage() {
  const pages = [
    '.page_playlist',
    '.page_artist', 
    '.page_album',
    '.page_music',
    '.page_fav_music',
    '.page_custom_playlist'
  ];
  
  for (let selector of pages) {
    const page = document.querySelector(selector);
    if (page && page.style.display === 'block') {
      return page;
    }
  }
  
  return document.body;
}


function cusEditMobile(playlistId, hashid) {
  console.log("Opening edit popup for:", { playlistId, hashid });

  // Close any other open popups first
  const customPlaylistPopup = document.querySelector('.customPlaylist');
  if (customPlaylistPopup && customPlaylistPopup.style.display !== 'none') {
    customPlaylistPopup.classList.remove('active');
    const overlay = customPlaylistPopup.querySelector('.popup-overlay');
    if (overlay) {
      overlay.classList.remove("fadeIn");
      overlay.classList.add("fadeOut");
    }
    
    setTimeout(() => {
      customPlaylistPopup.style.display = 'none';
    }, 300);
  }

  const popup = document.querySelector('.cusEdit');
  if (!popup) {
    console.error("Popup element not found");
    return;
  }
  
  popup.style.display = 'block';

  // Set action list
  const actionList = document.querySelector(".popup-action-list");
  if (actionList) {
    actionList.innerHTML = `
      <li onclick="editCustomPlaylist('${playlistId}', '${hashid}')"><i class="fa-solid fa-file-pen"></i> Edit Playlist</li>
      <li onclick="handleDelete('${playlistId}', '${hashid}')"><i class="fa-solid fa-trash"></i> Delete Playlist</li>
      <li onclick="share()"><i class="fa-solid fa-share"></i> Share</li>
    `;
  }

  // Fetch playlist data - gunakan id_cus (bukan hashid)
  fetch(`/custom/editcustom/${playlistId}`)
    .then(res => {
      if (!res.ok) {
        throw new Error(`HTTP error! status: ${res.status}`);
      }
      return res.json();
    })
    .then(data => {
      console.log("Server response:", data);
      
      if (!data.success) {
        throw new Error(data.message || 'Failed to load playlist');
      }

      const playlist = data.playlist;
      console.log("Playlist data to display:", playlist);

      // Set judul playlist dan owner
      const customNameEl = document.getElementById('customname');
      const ownerNameEl = document.getElementById('ownername');
      
      if (customNameEl) {
        customNameEl.textContent = playlist.playlist_name || 'Untitled Playlist';
        console.log("Set playlist name:", playlist.playlist_name);
      }
      
      if (ownerNameEl) {
        ownerNameEl.textContent = playlist.name_user || 'Unknown Owner';
        console.log("Set owner name:", playlist.name_user);
      }

      const coverPreviewContainer = document.querySelector('.listcustomimage');
      if (!coverPreviewContainer) {
        console.error("Cover preview container not found");
        return;
      }
      
      coverPreviewContainer.innerHTML = ''; // Clear old content

      // Gunakan logic yang SAMA dengan template EJS utama
      const useCollage = playlist.use_collage;
      const covers = playlist.covers || [];
      
      console.log("Display options:", { useCollage, covers, trackCount: playlist.track_count });

      if (useCollage) {
        console.log("Showing collage with covers:", covers);
        // Collage style - multiple different covers
        const collageGrid = document.createElement('div');
        collageGrid.className = 'collage-grid';
        collageGrid.style.display = 'grid';
        collageGrid.style.gridTemplateColumns = 'repeat(2, 1fr)';
        collageGrid.style.gridTemplateRows = covers.length > 2 ? 'repeat(2, 1fr)' : '1fr';
        collageGrid.style.gap = '2px';
        collageGrid.style.width = '100%';
        collageGrid.style.height = '100%';
        collageGrid.style.borderRadius = '4px';
        collageGrid.style.overflow = 'hidden';

        const displayCovers = covers.slice(0, 4);
        displayCovers.forEach((cover, index) => {
          const item = document.createElement('div');
          item.className = 'collage-item';
          item.style.backgroundImage = `url('${cover}')`;
          item.style.backgroundSize = 'cover';
          item.style.backgroundPosition = 'center';
          item.style.width = '100%';
          item.style.height = '100%';
          
          // Handle 3-item layout
          if (displayCovers.length === 3 && index === 2) {
            item.style.gridColumn = 'span 2';
          }
          collageGrid.appendChild(item);
        });

        coverPreviewContainer.appendChild(collageGrid);
      } else {
        // Single cover - gunakan display_cover dari server
        const displayCover = playlist.display_cover || playlist.playlist_cover || '/uploads/undefine.jpg';
        console.log("Showing single cover:", displayCover);
        
        const img = document.createElement('img');
        img.src = displayCover;
        img.alt = 'Playlist cover';
        img.className = 'playlist-cover-image';
        img.style.width = '100%';
        img.style.height = '100%';
        img.style.objectFit = 'cover';
        img.style.borderRadius = '4px';
        img.onerror = function() {
          console.error("Image failed to load, using fallback");
          this.src = '/uploads/undefine.jpg';
        };
        coverPreviewContainer.appendChild(img);
      }
    })
    .catch(err => {
      console.error("Error fetching playlist data:", err);
      // Fallback: tampilkan data minimal
      const customNameEl = document.getElementById('customname');
      const ownerNameEl = document.getElementById('ownername');
      
      if (customNameEl) customNameEl.textContent = 'Playlist';
      if (ownerNameEl) ownerNameEl.textContent = 'Unknown';
      
      const coverPreviewContainer = document.querySelector('.listcustomimage');
      if (coverPreviewContainer) {
        coverPreviewContainer.innerHTML = `
          <img src="/uploads/undefine.jpg" alt="Playlist cover" 
               class="playlist-cover-image" 
               style="width:100%;height:100%;object-fit:cover;border-radius:4px;">
        `;
      }
    });

  // Show popup with animation
  setTimeout(() => {
    popup.classList.add('active');
    const content = popup.querySelector('.popup-content');
    if (content) {
      content.style.transform = 'translateY(0)';
    }
  }, 10);

  // Setup gesture control
  if (typeof setupMobileGestureControl === 'function') {
    setupMobileGestureControl('.cusEdit');
  }
  
  activePopup = '.cusEdit';
  const overlay = document.querySelector('.cusEdit .popup-overlay');
  if (overlay) {
    overlay.classList.remove("fadeOut");
    overlay.classList.add("fadeIn");
  }
}



function editCustomPlaylist(playlistId, hashid) {
  // Hide the cusEdit popup first
  const cusEditPopup = document.querySelector('.cusEdit');
  if (cusEditPopup) {
    cusEditPopup.classList.remove('active');
    cusEditPopup.querySelector('.popup-overlay').classList.remove("fadeIn");
    cusEditPopup.querySelector('.popup-overlay').classList.add("fadeOut");
    
    setTimeout(() => {
      cusEditPopup.style.display = 'none';
    }, 300); // Match this with your CSS transition duration
  }

  const popup = document.querySelector('.customPlaylist');
  const popupContent = popup.querySelector('.popup-content');
  var isMobile = isTrueMobile();

  // Reset error and validation
  const playlistNameInput = document.getElementById('playlistName');
  const errorElement = document.getElementById('errormess');
  playlistNameInput.classList.remove('invalid');
  errorElement.textContent = '';

  // Fetch playlist data from server
  fetch(`/custom/editcustom/${playlistId}`)
    .then(res => res.json())
    .then(data => {
      if (!data.success) throw new Error(data.message || 'Failed to load playlist');

      const playlist = data.playlist;

      // Set form values
      playlistNameInput.value = playlist.playlist_name;
      document.getElementById('nameCounter').textContent = playlist.playlist_name.length;

      const descriptionInput = document.getElementById('playlistDescription');
      descriptionInput.value = playlist.description || '';
      document.getElementById('descCounter').textContent = (playlist.description || '').length;

      // Render collage or single cover
      const coverPreviewContainer = document.querySelector('.playlist-cover-preview');
      coverPreviewContainer.innerHTML = ''; // Clear old content

      if (playlist.track_covers && playlist.track_covers.length > 0 && playlist.track_count > 1) {
        // Collage style
        const collageGrid = document.createElement('div');
        collageGrid.className = 'collage-grid';
        collageGrid.style.gridTemplateColumns = 'repeat(2, 1fr)';
        collageGrid.style.gridTemplateRows = playlist.track_covers.length > 2 ? 'repeat(2, 1fr)' : '1fr';

        const covers = playlist.track_covers.slice(0, 4);
        covers.forEach((cover, index) => {
          const item = document.createElement('div');
          item.className = 'collage-item';
          item.style.backgroundImage = `url('${cover}')`;
          if (covers.length === 3 && index === 2) {
            item.style.gridColumn = 'span 2';
          }
          collageGrid.appendChild(item);
        });

        coverPreviewContainer.appendChild(collageGrid);
      } else {
        // Single cover
        const img = document.createElement('img');
        img.src = playlist.playlist_cover || '/uploads/undefine.jpg';
        img.alt = 'Playlist cover';
        img.className = 'playlist-cover-image';
        coverPreviewContainer.appendChild(img);
      }

      // Set form to edit mode
      const form = document.getElementById('playlistForm');
      form.dataset.editMode = 'true';
      form.dataset.playlistId = playlistId;
      form.dataset.hashid = hashid;

      // Update UI
      const header = popup.querySelector('.popup-header h3');
      if (header) header.textContent = 'Edit Playlist';

      const submitBtn = popup.querySelector('.btn-primary');
      if (submitBtn) submitBtn.textContent = 'Save Changes';
    })
    .catch(err => {
      console.error("Gagal mengambil data playlist:", err);
      alert('Gagal memuat playlist: ' + err.message);
    });

  // Show popup
  if (isMobile) {
    popup.style.display = 'block';
    setTimeout(() => {
      popup.classList.add('active');
      if (popupContent) {
        popupContent.style.transform = 'translateY(0)';
      }
    }, 10);
    setupMobileGestureControl('.customPlaylist');
  } else {
    $(".customPlaylist").show();
    $(".customPlaylist").addClass("active");
    $(".customPlaylist .popup-overlay").removeClass("fadeOut").addClass("fadeIn");
  }
}

function showCustom() {
  if (userId) {
    const popup = document.querySelector('.customPlaylist');
    const popupContent = popup.querySelector('.popup-content');
    var isMobile = isTrueMobile();

    const playlistNameInput = document.getElementById('playlistName');
    const descriptionInput = document.getElementById('playlistDescription');
    const errorElement = document.getElementById('errormess');

    // Reset form
    playlistNameInput.value = '';
    descriptionInput.value = '';
    document.getElementById('nameCounter').textContent = '0';
    document.getElementById('descCounter').textContent = '0';

    playlistNameInput.classList.remove('invalid');
    errorElement.textContent = '';

    // Reset cover preview container
    const coverPreviewContainer = document.querySelector('.playlist-cover-preview');
    coverPreviewContainer.innerHTML = `
      <img id="playlistCoverPreview" src="/uploads/undefine.jpg" alt="Playlist cover" class="playlist-cover-image">
      <div class="cover-upload-overlay">
      </div>
      <input type="file" id="playlistCoverUpload" name="cover" accept="image/*" style="display: none;">
    `;

    // Reset mode
    const form = document.getElementById('playlistForm');
    delete form.dataset.editMode;
    delete form.dataset.playlistId;
    delete form.dataset.hashid;

    // Update UI
    const header = popup.querySelector('.popup-header h3');
    if (header) header.textContent = 'Create New Playlist';

    const submitBtn = popup.querySelector('.btn-primary');
    if (submitBtn) submitBtn.textContent = 'Create Playlist';

    // Fetch playlist count untuk generate nama default
    fetch('/custom-playlist/count')
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          const total = data.total;
          playlistNameInput.value = `Playlist ke-${total + 1}`;
          document.getElementById('nameCounter').textContent = playlistNameInput.value.length;
        }
      })
      .catch(err => {
        console.error("Gagal mengambil total playlist:", err);
      });

    // Show popup
    if (isMobile) {
      popup.style.display = 'block';
      setTimeout(() => {
        popup.classList.add('active');
        if (popupContent) {
          popupContent.style.transform = 'translateY(0)';
        }
      }, 10);
      setupMobileGestureControl('.customPlaylist');
    } else {
      $(".customPlaylist").show();
      $(".customPlaylist").addClass("active");
      $(".customPlaylist .popup-overlay").removeClass("fadeOut").addClass("fadeIn");
    }
  } else {
    showLogin();
  }
}



function showLogin() {
  const popup = document.querySelector('.loginuser');
  var isMobile = isTrueMobile();
  
  if (isMobile) {
  popup.style.display = 'block';
  setTimeout(() => {
    popup.classList.add('active');
    const content = popup.querySelector('.popup-content');
    if (content) {
      content.style.transform = 'translateY(0)';
    }
  }, 10);

  setupMobileGestureControl('.loginuser');
  activePopup = '.loginuser';
  document.querySelector('.loginuser .popup-overlay').classList.remove("fadeOut");
  document.querySelector('.loginuser .popup-overlay').classList.add("fadeIn");

  } else {
    $(".loginuser").show();
    $(".loginuser").addClass("active");
    $(".loginuser .popup-overlay").removeClass("fadeOut").addClass("fadeIn");
  }




}


let previousActiveContent = null;

function closePopup() {

  $(".popup").removeClass("active");
  $(".popup .popup-overlay").removeClass("fadeIn").addClass("fadeOut");

  setTimeout(function () {
    $(".popup").hide();
    
    // Kembalikan tombol yang sebelumnya aktif
    if (previousActiveContent) {
      setActiveContent(previousActiveContent);
      previousActiveContent = null;
    }
  }, 400);
}


function showProfile(hashid, push = true, forceRefresh = false) {
  saveScrollPosition();
  hideAll();

  const startTime = Date.now();
  const container = document.querySelector(".main-content");
  const profilePage = container.querySelector(".page_profile");
  const header = document.querySelector(".sticky-header");

  const currentProfileId = profilePage.getAttribute("data-current-profile");

  // Jika forceRefresh, hapus cache
  if (forceRefresh) {
    profilePage.removeAttribute("data-current-profile");
    if (canShowLoader()) {
    $(".loader").show();
    }
  } 
  // Jika sudah ada di cache dan tidak force refresh
  else if (currentProfileId && currentProfileId.startsWith(`profile:${hashid}`)) {
    $(".loader").hide();
    profilePage.style.display = "block";
    header.style.display = "none";

    // Reset header state
    const profileHeader = document.querySelector('.profile-header');
    if (profileHeader) {
      profileHeader.classList.remove('visible');
    }

   if (push) {
    history.pushState({ page: "profile", id: hashid }, "", `/profile/${hashid}`);
    pushPageToHistory({ page: "profile", id: hashid });
  }

    updateNavIcons();
    return;
  }
  else {
    if (canShowLoader()) {
    $(".loader").show();
    }
  }

  // Buat URL dengan cache busting jika force refresh
  const url = forceRefresh ? `/profile/${hashid}?refresh=${Date.now()}` : `/profile/${hashid}`;
  
  $.ajax({
    url: url,
    method: "GET",
    headers: forceRefresh ? {
      'Cache-Control': 'no-cache, no-store, must-revalidate',
      'Pragma': 'no-cache',
      'Expires': '0'
    } : {},
    success: function (response) {
      profilePage.innerHTML = response;
      profilePage.style.display = "block";
      header.style.display = "none";

      // Pastikan header dalam state hidden awal
      const profileHeader = profilePage.querySelector('.profile-header');
      if (profileHeader) {
        profileHeader.classList.remove('visible');
      }

      // Set attribute dengan timestamp jika force refresh
      const cacheId = forceRefresh ? `profile:${hashid}:${Date.now()}` : `profile:${hashid}`;
      profilePage.setAttribute("data-current-profile", cacheId);

      // Remove existing scripts
      const oldProfileScript = document.querySelector('script[src="/js/profile.js"]');
      if (oldProfileScript) oldProfileScript.remove();
      
      const oldPlaylistScript = document.querySelector('script[src="/js/playlist.js"]');
      if (oldPlaylistScript) oldPlaylistScript.remove();

      // Load profile.js script
      const profileScript = document.createElement("script");
      profileScript.src = "/js/profile.js";
      profileScript.defer = true;
      
      // Load playlist.js script
      const playlistScript = document.createElement("script");
      playlistScript.src = "/js/playlist.js";
      playlistScript.defer = true;
      
      // Append scripts to body
      document.body.appendChild(profileScript);
      document.body.appendChild(playlistScript);

      // Extract color dari profile image
      const img = profilePage.querySelector(".profile-img");
      if (img) {
        img.crossOrigin = "anonymous";
        img.onload = () => extractColorProfile(img);
      }

      if (push) {
        history.pushState({ page: "profile", id: hashid }, "", `/profile/${hashid}`);
        pushPageToHistory({ page: "profile", id: hashid });
      }
      updateNavIcons();
    },
    complete: function () {
      const elapsed = Date.now() - startTime;
      const remaining = Math.max(0, 600 - elapsed);
      setTimeout(() => $(".loader").hide(), remaining);
    },
    error: function () {
      $(".loader").hide();
      alert("Gagal memuat profil pengguna.");
    }
  });
}




function checkFavoriteStatus() {
  let musicId = localStorage.getItem("lastMusicId");

  if (!musicId || !userId) return;

  $.ajax({
    url: "/check_favorite",
    type: "POST",
    contentType: "application/json",
    data: JSON.stringify({ id_music: musicId }),
    success: function (response) {
      let heartIcons = document.querySelectorAll(".heartFoot");

      if (response.success) {
        if (response.is_favorite) {
          heartIcons.forEach((icon) => {
            icon.classList.remove("far");
            icon.classList.add("fas");
            icon.style.color = "#ffff";
          });
        } else {
          heartIcons.forEach((icon) => {
            icon.classList.remove("fas");
            icon.classList.add("far");
            icon.style.color = "";
          });
        }
      }
    },
    error: function (xhr) {
      console.error("Gagal cek status favorit:", xhr.responseText);
    },
  });
}

function toggleHeart(element) {
    if (!userId) {
        showLogin();
        return;
    }

    const clickedIcon = element.tagName === 'I' ? element : element.querySelector('i');
    if (!clickedIcon) return;

    const currentMusicId = Number(localStorage.getItem('lastMusicId'));
    if (!currentMusicId) return;

    const isFilled = clickedIcon.classList.contains("fas");

    $.ajax({
        url: "/favorite_music",
        type: "POST",
        data: {
            id_music: currentMusicId,
            action: isFilled ? "remove" : "add" // Consistent with trackHeart
        },
        dataType: "json",
        success: (response) => {
            if (response.success) {
                // Update state based on response
                const newState = response.action === "added";
                
                // Update all heart icons
                updateAllHeartIcons(currentMusicId, newState);
                
                // Special handling for playlist tracks
                updateTrackHeart(currentMusicId, newState);
                
                // Animation only when adding to favorites
                if (newState) {
                    clickedIcon.classList.add("fave");
                    const handleAnim = () => {
                        clickedIcon.classList.remove("fave");
                        clickedIcon.removeEventListener("animationend", handleAnim);
                    };
                    clickedIcon.addEventListener("animationend", handleAnim);
                }

                // Show feedback message
                const message = newState 
                    ? '<i class="fa-solid fa-heart" style="color: #ffff;"></i> Added to favorites'
                    : '<i class="fa-regular fa-heart"></i> Removed from favorites';
                showInfo(message);
            } else {
                console.error("Server error:", response.message);
            }
        },
        error: (xhr, status, error) => {
            console.error("Request failed:", error);
            showInfo("Failed to update favorite");
        }
    });
}



function share() {
  const shareUrl = window.location.href;
  const shareTitle = document.title;

  if (navigator.share) {
    // Web Share API didukung (biasanya di perangkat mobile)
    navigator.share({
      title: shareTitle,
      url: shareUrl
    })
    .then(() => {
      console.log('Berhasil dibagikan');
    })
    .catch((error) => {
      console.error('Gagal membagikan:', error);
    });
  } else {
    // Fallback: salin ke clipboard
    navigator.clipboard.writeText(shareUrl).then(() => {
      alert("Link telah disalin ke clipboard!");
    }).catch(err => {
      console.error('Gagal menyalin:', err);
      prompt("Salin link ini secara manual:", shareUrl);
    });
  }
}

function showMusicMobile(hashid) {
  saveScrollPosition();
  hideAll();

  const startTime = Date.now();
  const container = document.querySelector(".main-content");
  const musicPage = container.querySelector(".page_music");
  const header = document.querySelector(".sticky-header");

  const currentMusicId = musicPage.getAttribute("data-current-music");

  if (currentMusicId === `music:${hashid}`) {
    $(".loader").hide();
    musicPage.style.display = "block";
    header.style.display = "none";

    // PERBAIKAN: Selalu update icon saat kembali ke halaman musik tanpa reload
    const lastPlayedMusic = localStorage.getItem("lastPlayedMusic");
    const lastPlayedPlaylist = localStorage.getItem("lastPlayedPlaylist");
    const currentTrack = document.querySelector('.page_music .listmusic');
    const currentPlaylist = currentTrack?.getAttribute('data-playlist');
    
    console.log('Returning to music page - Context:', {
      hashid,
      lastPlayedMusic,
      lastPlayedPlaylist,
      currentPlaylist
    });

    // Update icon berdasarkan state aktual
    updateMusicIconState(hashid);

    // Juga update melalui context system
    updatePlayPauseIconsBasedOnContext(lastPlayedPlaylist, 'music', 'music', audioPlayer.paused);

    const currentState = history.state;
    const currentURL = window.location.pathname;

    if (!currentState || currentState.id !== hashid || currentURL !== `/music/${hashid}`) {
      history.pushState({ page: "music", id: hashid }, "", `/music/${hashid}`);
      pushPageToHistory({ page: "music", id: hashid });
    }

    updateNavIcons();
    return;
  } else {
    if (canShowLoader()) {
    $(".loader").show();
    }
  }

  $.ajax({
    url: `/music/${hashid}`,
    method: "GET",
    success: function (response) {
      musicPage.innerHTML = response;
      musicPage.style.display = "block";
      header.style.display = "none";

      musicPage.setAttribute("data-current-music", `music:${hashid}`);

      const oldScript = document.querySelector('script[src="/js/playlist.js"]');
      if (oldScript) oldScript.remove();

      const script = document.createElement("script");
      script.src = "/js/playlist.js";
      script.defer = true;
      document.body.appendChild(script);

      // PERBAIKAN: Update icon berdasarkan kondisi musik saat ini
      updateMusicIconState(hashid);

      const lastPlayedMusic = localStorage.getItem("lastPlayedMusic");
      const lastPlayedPlaylist = localStorage.getItem("lastPlayedPlaylist");

      document.querySelectorAll(".listmusic").forEach(track => {
        const trackId = track.getAttribute("data-src");
        const trackPlaylist = track.getAttribute("data-playlist");
        track.classList.toggle("playing", trackId === lastPlayedMusic && trackPlaylist === lastPlayedPlaylist);
      });

      const img = document.querySelector(".music-img");
      if (img) {
        img.crossOrigin = "anonymous";
        img.onload = () => extractColorMusic(img);
      }

      localStorage.setItem("lastPlayedPage", "music");

      const currentState = history.state;
      const currentURL = window.location.pathname;

      if (!currentState || currentState.id !== hashid || currentURL !== `/music/${hashid}`) {
        history.pushState({ page: "music", id: hashid }, "", `/music/${hashid}`);
        pushPageToHistory({ page: "music", id: hashid });
      }

      updateNavIcons();
    },
    complete: function () {
      const elapsed = Date.now() - startTime;
      const remaining = Math.max(0, 600 - elapsed);
      setTimeout(() => $(".loader").hide(), remaining);
    },
    error: function (xhr, status, error) {
      $(".loader").hide();
      console.error('Error loading music:', error);
      alert("Gagal memuat music: " + (xhr.responseText || 'Terjadi kesalahan'));
    }
  });
}

function showMusic(hashid) {
  var isMobile = isTrueMobile();

  if (isMobile) {
    return;
  }
  
  if (event) {
    event.preventDefault();
    event.stopPropagation();
  }

  saveScrollPosition();
  hideAll();

  const startTime = Date.now();
  const container = document.querySelector(".main-content");
  const musicPage = container.querySelector(".page_music");
  const header = document.querySelector(".sticky-header");

  const currentMusicId = musicPage.getAttribute("data-current-music");

  if (currentMusicId === `music:${hashid}`) {
    $(".loader").hide();
    musicPage.style.display = "block";
    header.style.display = "none";

    // PERBAIKAN: Selalu update icon saat kembali ke halaman musik tanpa reload
    const lastPlayedMusic = localStorage.getItem("lastPlayedMusic");
    const lastPlayedPlaylist = localStorage.getItem("lastPlayedPlaylist");
    const currentTrack = document.querySelector('.page_music .listmusic');
    const currentPlaylist = currentTrack?.getAttribute('data-playlist');
    
    console.log('Returning to music page - Context:', {
      hashid,
      lastPlayedMusic,
      lastPlayedPlaylist,
      currentPlaylist
    });

    // Update icon berdasarkan state aktual
    updateMusicIconState(hashid);

    // Juga update melalui context system
    updatePlayPauseIconsBasedOnContext(lastPlayedPlaylist, 'music', 'music', audioPlayer.paused);

    const currentState = history.state;
    const currentURL = window.location.pathname;

    if (!currentState || currentState.id !== hashid || currentURL !== `/music/${hashid}`) {
      history.pushState({ page: "music", id: hashid }, "", `/music/${hashid}`);
      pushPageToHistory({ page: "music", id: hashid });
    }

    updateNavIcons();
    return;
  } else {
    if (canShowLoader()) {
    $(".loader").show();
    }
  }

  $.ajax({
    url: `/music/${hashid}`,
    method: "GET",
    success: function (response) {
      musicPage.innerHTML = response;
      musicPage.style.display = "block";
      header.style.display = "none";

      musicPage.setAttribute("data-current-music", `music:${hashid}`);

      const oldScript = document.querySelector('script[src="/js/playlist.js"]');
      if (oldScript) oldScript.remove();

      const script = document.createElement("script");
      script.src = "/js/playlist.js";
      script.defer = true;
      document.body.appendChild(script);

      // PERBAIKAN: Update icon berdasarkan kondisi musik saat ini
      updateMusicIconState(hashid);

      const lastPlayedMusic = localStorage.getItem("lastPlayedMusic");
      const lastPlayedPlaylist = localStorage.getItem("lastPlayedPlaylist");

      document.querySelectorAll(".listmusic").forEach(track => {
        const trackId = track.getAttribute("data-src");
        const trackPlaylist = track.getAttribute("data-playlist");
        track.classList.toggle("playing", trackId === lastPlayedMusic && trackPlaylist === lastPlayedPlaylist);
      });

      const img = document.querySelector(".music-img");
      if (img) {
        img.crossOrigin = "anonymous";
        img.onload = () => extractColorMusic(img);
      }

      localStorage.setItem("lastPlayedPage", "music");

      const currentState = history.state;
      const currentURL = window.location.pathname;

      if (!currentState || currentState.id !== hashid || currentURL !== `/music/${hashid}`) {
        history.pushState({ page: "music", id: hashid }, "", `/music/${hashid}`);
        pushPageToHistory({ page: "music", id: hashid });
      }

      updateNavIcons();
    },
    complete: function () {
      const elapsed = Date.now() - startTime;
      const remaining = Math.max(0, 600 - elapsed);
      setTimeout(() => $(".loader").hide(), remaining);
    },
    error: function (xhr, status, error) {
      $(".loader").hide();
      console.error('Error loading music:', error);
      alert("Gagal memuat music: " + (xhr.responseText || 'Terjadi kesalahan'));
    }
  });
}



function updateMusicIconState(musicId) {
  const lastPlayedMusic = localStorage.getItem("lastPlayedMusic");
  const lastPlayedPlaylist = localStorage.getItem("lastPlayedPlaylist");
  const currentTrack = document.querySelector('.page_music .listmusic');
  const currentPlaylist = currentTrack?.getAttribute('data-playlist');
  
  // Untuk halaman music, kita bandingkan dengan playlist context
  const isSameContext = lastPlayedPlaylist === currentPlaylist;
  const isPlaying = !audioPlayer.paused;
  
  console.log('updateMusicIconState:', {
    musicId,
    lastPlayedMusic,
    lastPlayedPlaylist,
    currentPlaylist,
    isSameContext,
    isPlaying
  });

  // Update icon berdasarkan kondisi aktual
  if (isSameContext && isPlaying) {
    document.querySelectorAll(".page_music .svg-icon.playlist-play").forEach((icon) => {
      icon.innerHTML = pauseIcon;
    });
    console.log('Updated music icons to PAUSE');
  } else {
    document.querySelectorAll(".page_music .svg-icon.playlist-play").forEach((icon) => {
      icon.innerHTML = playIcon;
    });
    console.log('Updated music icons to PLAY');
  }
}

