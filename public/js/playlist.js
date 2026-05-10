// playlist.js - Scroll Effects Only
(function() {
  let bannerImgContainer = null;
  let bannerImg = null;
  let stickyHeader = null;
  let scrollContainer = null;
  let lastScrollPosition = 0;
  let isTicking = false;
  let bannerHeight = 0;
  let maxScroll = 0;
  let currentScrollType = null;
  let resizeTimeout = null;
  let currentPageType = null;
  let initializationTimeout = null;
  let shouldScrollToTop = false;
  let hasInitialized = false;

  // Deteksi tipe halaman saat ini
  function detectPageType() {
    const mainContent = document.querySelector('.main-content');
    if (!mainContent) return 'unknown';
    
    const pages = [
      '.page_playlist',
      '.page_artist', 
      '.page_album',
      '.page_music',
      '.page_fav_music',
      '.page_profile',
      '.page_top50',
      '.page_mostplayed',
      '.page_category',
      '.page_custom_playlist'
    ];
    
    for (let selector of pages) {
      const page = mainContent.querySelector(selector);
      if (page && page.style.display === 'block') {
        return selector.replace('.page_', '');
      }
    }
    
    return 'unknown';
  }

  function updateEffects() {
    // Pastikan elemen ada
    if (!bannerImgContainer || !bannerImg || !stickyHeader) {
      return;
    }
    
    const scrollPosition = scrollContainer === window 
      ? window.pageYOffset 
      : scrollContainer.scrollTop;

    // Hanya update jika ada perubahan scroll yang signifikan
    if (Math.abs(scrollPosition - lastScrollPosition) < 1) {
      return;
    }

    const scrollProgress = Math.min(scrollPosition / maxScroll, 1);

    // Update banner scale dan opacity
    if (scrollPosition <= maxScroll) {
      const scale = 1 - scrollProgress * 0.5;
      const opacity = 1 - scrollProgress * 2;

      bannerImgContainer.style.transform = `scale(${scale})`;
      bannerImg.style.opacity = opacity.toString();
    } else {
      bannerImgContainer.style.transform = `scale(0.5)`;
      bannerImg.style.opacity = '0';
    }

    // PERBAIKAN: Animasi header yang smooth
    // Gunakan CSS class saja, jangan ubah style langsung
    const showHeaderThreshold = bannerHeight * 0.3;
    
    if (scrollPosition > showHeaderThreshold) {
      // Tambahkan class 'visible' untuk animasi show
      if (!stickyHeader.classList.contains("visible")) {
        stickyHeader.classList.add("visible");
        console.log(`Header SHOW - Scroll: ${scrollPosition.toFixed(0)}`);
      }
    } else {
      // Hapus class 'visible' untuk animasi hide
      if (stickyHeader.classList.contains("visible")) {
        stickyHeader.classList.remove("visible");
        console.log(`Header HIDE - Scroll: ${scrollPosition.toFixed(0)}`);
      }
    }

    lastScrollPosition = scrollPosition;
  }

  // Cari elemen yang diperlukan
  function findElements() {
    bannerImgContainer = document.querySelector(".banner-img-container");
    bannerImg = document.querySelector(".banner-img");
    
    // Cari header berdasarkan tipe halaman
    currentPageType = detectPageType();
    
    // Coba cari dengan prioritas:
    // 1. Header berdasarkan class spesifik
    // 2. Header generic
    const headerSelectors = [
      // Tentukan selector berdasarkan page type
      () => {
        switch(currentPageType) {
          case 'fav_music':
            return ".fav-head";
          case 'top50':
            return ".top50-head";
          case 'mostplayed':
            return ".mostplayed-head";
          case 'playlist':
            return ".playlist-head";
          case 'profile':
            return ".profile-head";
          case 'artist':
            return ".artist-head";
          case 'custom_playlist':
            return ".customplaylist-head";
          default:
            return null;
        }
      },
      // Fallback: header dengan nama class page type + "-head"
      () => `.${currentPageType}-head`,
      // Fallback: generic playlist-header
      () => ".playlist-header",
      // Fallback: cari semua kemungkinan header class
      () => ".playlist-head, .mostplayed-head, .top50-head, .profile-head, .customplaylist-head, .artist-head, .fav-head, .album-head, .music-head, .category-head",
      // Fallback terakhir: header yang pertama ditemukan
      () => "header[class*='-head'], header[class*='header']"
    ];
    
    for (let getSelector of headerSelectors) {
      const selector = getSelector();
      if (!selector) continue;
      
      stickyHeader = document.querySelector(selector);
      if (stickyHeader) {
        console.log(`Found header with selector: ${selector}`);
        break;
      }
    }
    
    // Jika masih tidak ditemukan, cari elemen dengan class yang mengandung "head"
    if (!stickyHeader) {
      const allHeaders = document.querySelectorAll('[class*="head"], [class*="header"]');
      for (const header of allHeaders) {
        if (header.classList.contains('playlist-header') || 
            header.classList.contains('fav-head') ||
            header.classList.contains('top50-head') ||
            header.classList.contains('mostplayed-head') ||
            header.classList.contains('profile-head') ||
            header.classList.contains('artist-head') ||
            header.classList.contains('customplaylist-head')) {
          stickyHeader = header;
          console.log(`Found header by class search: ${header.className}`);
          break;
        }
      }
    }
    
    // PERBAIKAN: Hanya atur CSS sekali, jangan ubah style langsung
    if (stickyHeader) {
      // Style untuk sticky positioning (tetap atur ini)
      stickyHeader.style.position = 'sticky';
      stickyHeader.style.top = '0';
      stickyHeader.style.zIndex = '100';
      
      // JANGAN atur transition di sini, biarkan CSS yang mengatur
      // stickyHeader.style.transition = 'opacity 0.3s ease, transform 0.3s ease';
      // stickyHeader.style.willChange = 'opacity, transform';
      
      // State awal: hidden
      stickyHeader.classList.remove("visible");
    }
  }

  function onScroll() {
    if (!isTicking) {
      requestAnimationFrame(function () {
        updateEffects();
        isTicking = false;
      });
      isTicking = true;
    }
  }

  function cleanupScrollListener() {
    console.log('Cleaning up scroll listener');
    
    // Hapus listener scroll
    if (scrollContainer && scrollContainer.removeEventListener) {
      scrollContainer.removeEventListener("scroll", onScroll);
    }
    
    // Hapus semua event listeners yang mungkin terpasang
    window.removeEventListener("scroll", onScroll);
    
    const activeContent = document.querySelector("#active-content");
    if (activeContent && activeContent.removeEventListener) {
      activeContent.removeEventListener("scroll", onScroll);
    }
    
    // Clear timeouts
    if (resizeTimeout) {
      clearTimeout(resizeTimeout);
      resizeTimeout = null;
    }
    
    if (initializationTimeout) {
      clearTimeout(initializationTimeout);
      initializationTimeout = null;
    }
    
    // Reset state
    isTicking = false;
    hasInitialized = false;
  }

  function initScrollListener() {
    console.log('Initializing scroll effects for page:', detectPageType());
    
    // Cleanup terlebih dahulu
    cleanupScrollListener();
    
    // Tunggu DOM siap
    initializationTimeout = setTimeout(() => {
      // Deteksi device type
      const isMobile = getComputedStyle(document.documentElement)
        .getPropertyValue("--device").trim() === "mobile";
      
      // Tentukan scroll container
      const activeContent = document.querySelector("#active-content");
      const threshold = isMobile ? 769 : 0;
      
      if (window.innerWidth >= threshold && activeContent) {
        scrollContainer = activeContent;
        currentScrollType = 'desktop';
        console.log('Using active-content as scroll container');
      } else {
        scrollContainer = window;
        currentScrollType = 'mobile';
        console.log('Using window as scroll container');
      }
      
      // Cari elemen
      findElements();
      
      // Setup banner dimensions
      const banner = document.querySelector(".banner");
      if (banner) {
        bannerHeight = banner.offsetHeight || 300;
        maxScroll = bannerHeight * 0.7;
        
        console.log(`Banner height: ${bannerHeight}, Max scroll: ${maxScroll}`);
        
        // Reset banner styles
        if (bannerImgContainer) {
          bannerImgContainer.style.transform = 'scale(1)';
          bannerImgContainer.style.transition = 'transform 0.2s ease-out';
        }
        if (bannerImg) {
          bannerImg.style.opacity = '1';
          bannerImg.style.transition = 'opacity 0.2s ease-out';
        }
      } else {
        console.warn('Banner element not found');
        bannerHeight = 300;
        maxScroll = 210;
      }
      
      // Setup header state awal
      if (stickyHeader) {
        // Reset ke state hidden
        stickyHeader.classList.remove("visible");
        console.log('Header initialized in hidden state');
      } else {
        console.warn('Header not found for page type:', currentPageType);
      }
      
      // Attach scroll listener
      if (scrollContainer && scrollContainer.addEventListener) {
        scrollContainer.addEventListener("scroll", onScroll, { 
          passive: true,
          capture: false 
        });
        console.log('Scroll listener attached to:', currentScrollType === 'desktop' ? 'active-content' : 'window');
      }
      
      // Apply initial effects berdasarkan posisi scroll saat ini
      if (scrollContainer) {
        lastScrollPosition = scrollContainer === window 
          ? window.pageYOffset 
          : scrollContainer.scrollTop;
          
        console.log(`Initial scroll position: ${lastScrollPosition}`);
        
        // Update efek berdasarkan posisi scroll saat ini
        updateEffects();
      }
      
      hasInitialized = true;
      console.log('Scroll effects initialized successfully');
    }, 50);
  }

  function resetBannerEffects() {
    console.log('Resetting banner effects (manual reset)');
    
    // Reset banner
    if (bannerImgContainer) {
      bannerImgContainer.style.transform = 'scale(1)';
    }
    if (bannerImg) {
      bannerImg.style.opacity = '1';
    }
    
    // Reset header ke state hidden
    if (stickyHeader) {
      stickyHeader.classList.remove("visible");
    }
    
    // Reset scroll position hanya jika diminta secara eksplisit
    if (shouldScrollToTop && scrollContainer) {
      if (scrollContainer === window) {
        window.scrollTo({ top: 0, behavior: 'smooth' });
      } else if (scrollContainer.scrollTo) {
        scrollContainer.scrollTo({ top: 0, behavior: 'smooth' });
      }
      shouldScrollToTop = false;
    }
    
    lastScrollPosition = 0;
  }

  // Public API untuk dipanggil dari luar
  function initializePlaylist() {
    console.log('Initializing playlist scroll effects');
    
    // Cleanup dan reset
    cleanupScrollListener();
    
    bannerImgContainer = null;
    bannerImg = null;
    stickyHeader = null;
    bannerHeight = 0;
    maxScroll = 0;
    
    // Initialize dengan delay
    setTimeout(initScrollListener, 100);
  }

  // Event Listeners
  document.addEventListener('visibilitychange', function() {
    if (!document.hidden) {
      setTimeout(() => {
        if (hasInitialized) {
          // Restore effects tanpa reset scroll
          updateEffects();
        } else {
          initializePlaylist();
        }
      }, 100);
    }
  });

  window.addEventListener('pageshow', function(event) {
    if (event.persisted) {
      setTimeout(() => {
        initializePlaylist();
      }, 150);
    }
  });

  window.addEventListener("resize", function() {
    clearTimeout(resizeTimeout);
    resizeTimeout = setTimeout(() => {
      initializePlaylist();
    }, 250);
  });
  
  window.addEventListener("orientationchange", function() {
    setTimeout(() => {
      initializePlaylist();
    }, 500);
  });

  // Listen untuk custom event page change
  document.addEventListener('pageChanged', function() {
    setTimeout(() => {
      shouldScrollToTop = true; // Izinkan scroll ke top saat ganti page
      initializePlaylist();
    }, 100);
  });

  // Ekspos fungsi yang diperlukan
  window.initializePlaylist = initializePlaylist;
  window.resetBannerEffects = resetBannerEffects;

  // Initial setup
  setTimeout(() => {
    console.log('Initial setup of playlist scroll effects');
    // Jangan scroll ke top saat initial load
    shouldScrollToTop = false;
    initializePlaylist();
  }, 500);
})();



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

function handleEllipsisClick(icon) {
  if (isMobile) {
    const track = icon.closest(".track-container");
    if (track) listMobile(track);
  } else {
    toggleDropdown(icon);
  }
}
function toggleDropdown(icon) {
  // Tutup semua dropdown yang terbuka terlebih dahulu
  const allDropdowns = document.querySelectorAll(".dropdown-content");
  allDropdowns.forEach((dropdown) => {
    dropdown.classList.remove("show");
  });

  // Buka dropdown yang sesuai dengan ikon yang diklik
  const dropdown = icon.nextElementSibling;
  dropdown.classList.toggle("show");
}

// Tutup dropdown ketika klik di luar
window.onclick = function (event) {
  if (
    !event.target.classList.contains("track-menu") &&
    !event.target.classList.contains("fa-ellipsis")
  ) {
    const dropdowns = document.querySelectorAll(".dropdown-content");
    dropdowns.forEach((dropdown) => {
      dropdown.classList.remove("show");
    });
  }
};

function removeMusicFromCustom(element) {
  const musicId = $(element).data("music-id");
  const playlistId = $(element).data("playlist-id");

  // Dapatkan hashid dari URL saat ini
  const currentPlaylistHash = window.location.pathname.split("/").pop();

  // Pastikan kita menghapus dari playlist yang sedang dilihat
  if (!currentPlaylistHash.startsWith("C")) {
    showInfo("Invalid playlist");
    return;
  }

  // Panggil fungsi addCusDesk dengan parameter yang benar
  addCusDesk(playlistId, musicId, currentPlaylistHash);
}

function addCusDesk(playlistId, musicId, currentPlaylistHash = null) {
  // Jika currentPlaylistHash tidak disediakan, ambil dari URL
  if (!currentPlaylistHash) {
    currentPlaylistHash = window.location.pathname.split("/").pop();
  }

  $.ajax({
    url: "/add_musicCus",
    type: "POST",
    data: {
      id_playlist: playlistId, // id_cus (C1, C2, dst)
      id_music: musicId,
      current_hash: currentPlaylistHash, // hashid dari URL (C + encoded id_auto)
    },
    dataType: "json",
    success: function (response) {
      console.log(response);
      let listItem = $(
        `.sub-addplaylist[data-playlist-id="${playlistId}"][data-music-id="${musicId}"]`
      );
      let icon = listItem.find("i.fa-circle-check");

      if (response.status === "added") {
        listItem.css({ "background-color": "", color: "" });
        icon
          .removeClass("fa-regular")
          .addClass("fa-solid")
          .css("color", "#4CAF50");
        showInfo(
          '<i class="fa-solid fa-circle-check" style="color: #28a745;"></i> Added to your playlist'
        );

        if (response.new_cover || response.track_covers) {
          updateCustomPlaylistCoverInUI(
            playlistId,
            response.new_cover,
            response.track_covers
          );
        }

        if (response.status && response.playlist_hash === currentPlaylistHash) {
          loadPlaylistTracks(response.playlist_hash);
        }
      } else if (
        response.status === "deleted" ||
        response.status === "deleted_all"
      ) {
        listItem.css({ "background-color": "", color: "" });
        icon
          .removeClass("fa-solid")
          .addClass("fa-regular")
          .css("color", "#B0B0B0");

        const message =
          response.status === "deleted_all"
            ? "All instances removed from playlist"
            : "Removed from your playlist";
        showInfo(`<i class="fa-regular fa-circle-check"></i> ${message}`);

        if (
          response.new_cover ||
          response.default_cover ||
          response.track_covers
        ) {
          updateCustomPlaylistCoverInUI(
            playlistId,
            response.new_cover || response.default_cover,
            response.track_covers
          );
        }

        // PERBAIKAN: Pastikan kita hanya menghapus dari playlist yang sedang dilihat
        if (response.playlist_hash === currentPlaylistHash) {
          removeTrackFromPlaylistUI(
            musicId,
            currentPlaylistHash,
            response.status === "deleted_all"
          );
          updatePlaylistPageCover(
            playlistId,
            response.new_cover || response.default_cover,
            response.track_covers
          );

          // PERBAIKAN: Update color thief setelah semua operasi selesai
          setTimeout(() => {
            updatePlaylistColor();
          }, 50);

          // Reload tracks untuk playlist yang sedang dilihat
          if (response.playlist_hash === currentPlaylistHash) {
            loadPlaylistTracks(response.playlist_hash);
          }
        }
      } else if (response.status === "forbidden") {
        showInfo("Forbidden: You cannot add this item");
      }
    },
    error: function (xhr, status, error) {
      console.error("Error: " + error);
      console.log(xhr.responseText);
    },
  });
}

function updateCustomPlaylistCoverInUI(
  playlistId,
  newCover,
  trackCovers = null
) {
  // Update semua elemen yang menggunakan single cover
  updateSingleCovers(playlistId, newCover);

  // Update elemen yang mungkin menggunakan collage
  updateCollageCovers(playlistId, newCover, trackCovers);
}

function updatePlaylistPageCover(playlistId, newCover, trackCovers) {
  const bannerContainer = document.querySelector(".banner-img-container");
  if (!bannerContainer) return;

  // Hitung jumlah track
  const trackElements = document.querySelectorAll(".tracks .listmusic");
  const trackCount = trackElements.length;

  // Gunakan trackCovers yang disediakan atau default empty array
  let covers = trackCovers || [];
  const uniqueCovers = [...new Set(covers)];

  // Tentukan apakah perlu menampilkan collage
  const showCollage = trackCount > 1 && uniqueCovers.length > 1;
  const displayCovers =
    trackCount > 0
      ? uniqueCovers.length > 0
        ? uniqueCovers.slice(0, 4)
        : [newCover]
      : [newCover];

  // Bersihkan container
  bannerContainer.innerHTML = "";

  // PERBAIKAN: Handle case ketika playlist kosong
  if (trackCount === 0) {
    // Force reload untuk default cover dengan cache buster
    const timestamp = new Date().getTime();
    const defaultCover = "/uploads/undefine.jpg";

    bannerContainer.innerHTML = `
      <img
        class="banner-img playlistImage color-thief-source"
        src="${defaultCover}?t=${timestamp}"
        alt="Album cover"
        data-playlist-id="${playlistId}"
        crossorigin="anonymous"
        onerror="this.src='/uploads/undefine.jpg?t=' + new Date().getTime()"
      />
    `;
  } else if (showCollage) {
    // Case: Tampilkan collage
    bannerContainer.innerHTML = `
      <img src="${
        displayCovers[0]
      }" class="banner-img color-thief-source" style="display: none;" crossorigin="anonymous" alt="Color source" />
      <div class="collage-grid" style="grid-template-columns: repeat(2, 1fr); grid-template-rows: ${
        displayCovers.length > 2 ? "repeat(2, 1fr)" : "1fr"
      }">
        ${displayCovers
          .map(
            (cover, index) => `
          <div 
            class="collage-item" 
            style="background-image: url('${cover}'); ${
              displayCovers.length === 3 && index === 2
                ? "grid-column: span 2;"
                : ""
            }"
          ></div>
        `
          )
          .join("")}
      </div>
    `;
  } else {
    // Case: Tampilkan single cover
    const effectiveCover = newCover || "/uploads/undefine.jpg";

    // Force reload dengan cache buster
    const timestamp = new Date().getTime();
    const coverWithTimestamp = effectiveCover.includes("?")
      ? effectiveCover.replace(/\?.*$/, "") + "?t=" + timestamp
      : effectiveCover + "?t=" + timestamp;

    bannerContainer.innerHTML = `
      <img
        class="banner-img playlistImage color-thief-source"
        src="${coverWithTimestamp}"
        alt="Album cover"
        data-playlist-id="${playlistId}"
        crossorigin="anonymous"
        onerror="this.src='/uploads/undefine.jpg?t=' + new Date().getTime()"
      />
    `;
  }

  // Update color thief
  setTimeout(() => {
    updatePlaylistColor();
  }, 100);
}

function updatePlaylistColor() {
  const colorSource = document.querySelector(".color-thief-source");
  if (!colorSource) {
    console.warn("Color source not found for playlist");
    return;
  }

  // Fungsi untuk mengekstrak warna setelah gambar dimuat
  const extractColorWhenReady = (img) => {
    if (img.complete) {
      extractColorPlaylist(img);
    } else {
      img.onload = function () {
        extractColorPlaylist(img);
        // Hapus event handler setelah digunakan
        img.onload = null;
      };

      // Fallback timeout jika onload tidak terpicu
      setTimeout(() => {
        if (img.complete) {
          extractColorPlaylist(img);
        }
      }, 1000);
    }
  };

  // Jika menggunakan collage, gunakan gambar tersembunyi sebagai color source
  if (colorSource.style.display === "none") {
    extractColorWhenReady(colorSource);
  }
  // Jika menggunakan single image, gunakan gambar yang terlihat
  else {
    extractColorWhenReady(colorSource);
  }
}

function updateSingleCovers(playlistId, newCover) {
  // Update single cover images
  const playlistImages = document.querySelectorAll(
    `.playlistImage[data-playlist-id="${playlistId}"]`
  );
  playlistImages.forEach((img) => {
    img.src = newCover;
  });

  // Update playlist header
  const playlistHeader = document.querySelector(".playlist-header");
  if (
    playlistHeader &&
    playlistHeader.getAttribute("data-playlist-id") === playlistId
  ) {
    const headerCover = playlistHeader.querySelector(".playlist-header-cover");
    if (headerCover) {
      headerCover.style.backgroundImage = `url('${newCover}')`;
    }
  }

  // Update modal covers
  const modalCovers = document.querySelectorAll(
    `.playlist-modal-cover[data-playlist-id="${playlistId}"]`
  );
  modalCovers.forEach((cover) => {
    cover.style.backgroundImage = `url('${newCover}')`;
  });

  // Update playlist cards
  const playlistCards = document.querySelectorAll(
    `.playlist-card[data-id="${playlistId}"] .card-cover`
  );
  playlistCards.forEach((card) => {
    card.style.backgroundImage = `url('${newCover}')`;
  });
}

function updateCollageCovers(playlistId, newCover, trackCovers) {
  // Update direct messages sidebar
  updateCollageElement(
    playlistId,
    newCover,
    trackCovers,
    `#direct-messages-items .direct-messages-item[data-id="${playlistId}"]`,
    ".user-icon",
    true
  );

  // Update library sidebar
  updateCollageElement(
    playlistId,
    newCover,
    trackCovers,
    `.library-item[data-id="${playlistId}"]`,
    ".navbar-item-content",
    false
  );
}

function updateCollageElement(
  playlistId,
  newCover,
  trackCovers,
  itemSelector,
  contentSelector,
  isDirectMessage
) {
  const items = document.querySelectorAll(itemSelector);
  if (items.length === 0) return;

  items.forEach((item) => {
    // Get current track count from data attribute or calculate from trackCovers
    let trackCount = parseInt(item.getAttribute("data-track-count")) || 0;
    const covers =
      trackCovers || JSON.parse(item.getAttribute("data-track-covers") || "[]");

    // If trackCovers is provided, use its length as track count
    if (trackCovers) {
      trackCount = trackCovers.length;
    }

    const uniqueCovers = [...new Set(covers)]; // Get unique covers

    // Determine if we should show collage (multiple tracks AND multiple unique covers)
    const showCollage = trackCount > 1 && uniqueCovers.length > 1;

    const content = item.querySelector(contentSelector);
    if (!content) return;

    // Update data attributes first
    item.setAttribute("data-track-covers", JSON.stringify(covers));
    item.setAttribute("data-track-count", trackCount);

    if (showCollage) {
      // Case: Should show collage
      const displayCovers = uniqueCovers.slice(0, 4);
      const gridRows = displayCovers.length > 2 ? "repeat(2, 1fr)" : "1fr";

      // Create new collage HTML
      const newCollageHTML = `
        <div class="collage-grid" style="grid-template-columns: repeat(2, 1fr); grid-template-rows: ${gridRows}">
          ${displayCovers
            .map(
              (cover, index) => `
            <div class="collage-item" style="background-image: url('${cover}'); ${
                displayCovers.length === 3 && index === 2
                  ? "grid-column: span 2;"
                  : ""
              }"></div>
          `
            )
            .join("")}
        </div>
      `;

      // Check if we need to convert from single to collage
      if (!content.classList.contains("collage-cover")) {
        // Convert from single to collage
        content.className = isDirectMessage
          ? "user-icon collage-cover rounded-square"
          : "navbar-item-content collage-cover rounded-square";
        content.innerHTML = newCollageHTML;
      } else {
        // Update existing collage
        const existingCollage = content.querySelector(".collage-grid");
        if (existingCollage) {
          existingCollage.outerHTML = newCollageHTML;
        } else {
          content.innerHTML = newCollageHTML;
        }
      }
    } else {
      // Case: Should show single cover
      const effectiveCover = covers.length > 0 ? covers[0] : newCover;

      // Check if we need to convert from collage to single
      if (content.classList.contains("collage-cover")) {
        // Convert from collage to single
        content.className = isDirectMessage
          ? "user-icon rounded-square"
          : "navbar-item-content rounded-square";
        content.innerHTML = "";
        content.style.backgroundImage = `url('${effectiveCover}')`;
      } else {
        // Update existing single cover
        content.style.backgroundImage = `url('${effectiveCover}')`;
      }
    }
  });
}

function removeTrackFromPlaylistUI(musicId, playlistHash, removeAll = false) {
  const currentPlaylistHash = window.location.pathname.split("/").pop();

  // Pastikan kita hanya menghapus dari playlist yang sedang dilihat
  if (playlistHash && playlistHash !== currentPlaylistHash) {
    return;
  }

  if (removeAll) {
    // Remove all instances of this track dari playlist yang sedang dilihat
    const trackElements = document.querySelectorAll(
      `.listmusic[data-id="${musicId}"][data-playlist="${currentPlaylistHash}"]`
    );
    trackElements.forEach((element) => {
      element.remove();
    });
  } else {
    // Remove just one instance (yang pertama ditemukan)
    const trackElement = document.querySelector(
      `.listmusic[data-id="${musicId}"][data-playlist="${currentPlaylistHash}"]`
    );
    if (trackElement) {
      trackElement.remove();
    }
  }

  // Hitung track yang tersisa
  const remainingTracks = document.querySelectorAll(
    `.tracks .listmusic[data-playlist="${currentPlaylistHash}"]`
  ).length;

  // Update color thief
  setTimeout(() => {
    updatePlaylistColor();
  }, 50);

  if (remainingTracks === 0) {
    showInfo("Playlist is now empty");

    // Hapus play button jika tidak ada lagu
    const playButton = document.querySelector(
      '.stat-item[onclick="buttonPlaylist()"]'
    );
    if (playButton) {
      playButton.remove();
    }

    // PERBAIKAN: Dapatkan playlistId yang benar
    const playlistId = getPlaylistIdFromHash(currentPlaylistHash);

    // PERBAIKAN: Panggil updatePlaylistPageCover dengan parameter yang benar
    setTimeout(() => {
      updatePlaylistPageCover(playlistId, "/uploads/undefine.jpg", []);
    }, 50);
  }
}

// Tambahkan function helper jika belum ada
function getPlaylistIdFromHash(hash) {
  if (hash.startsWith("C")) {
    try {
      return hashids.decode(hash.replace("C", ""))[0];
    } catch (e) {
      console.error("Error decoding playlist hash:", e);
      return null;
    }
  }
  return hash;
}

function getPlaylistIdFromHash(hashid) {
  // Ekstrak id_cus dari hashid
  // Hashid format: C + encoded(id_auto)
  // Kita perlu mendapatkan id_cus yang sesuai
  if (!hashid.startsWith("C")) return null;

  const numericHash = hashid.substring(1);
  const id_auto = hashids.decode(numericHash)[0];

  // Di sini kita perlu mapping id_auto ke id_cus
  // Ini mungkin memerlukan AJAX call atau data yang sudah tersimpan
  return hashid; // Untuk sementara, return hashid sebagai fallback
}

function trackHeart(element) {
  if (!userId) {
    showLogin();
    return;
  }

  const heartIcon = element;
  const isFilled = heartIcon.classList.contains("fas");
  const track = heartIcon.closest(".listmusic");
  const musicId = track.getAttribute("data-id");
  const favDropdownIcon = track.querySelector(".favDropdown i");
  const currentMusicId = localStorage.getItem("lastMusicId");

  if (!musicId) return;

  $.ajax({
    url: "/favorite_music",
    type: "POST",
    data: {
      id_music: musicId,
      action: isFilled ? "remove" : "add", // Gunakan parameter yang lebih eksplisit
    },
    dataType: "json",
    success: function (response) {
      if (response.success) {
        // Update icon state
        const newState = response.action === "added";
        heartIcon.classList.toggle("far", !newState);
        heartIcon.classList.toggle("fas", newState);
        heartIcon.style.color = newState ? "#ffff" : "";

        if (favDropdownIcon) {
          favDropdownIcon.classList.toggle("far", !newState);
          favDropdownIcon.classList.toggle("fas", newState);
          favDropdownIcon.style.color = newState ? "#ffff" : "";
        }

        // Update footer if current track
        if (musicId === currentMusicId) {
          updateFooterHeart(newState);
        }

        // Show appropriate message
        const message = newState
          ? '<i class="fa-solid fa-heart" style="color: #ffff;"></i> Added to favorites'
          : '<i class="fa-regular fa-heart"></i> Removed from favorites';
        showInfo(message);
      } else {
        console.error("Server error:", response.message);
      }
    },
    error: function (xhr, status, error) {
      console.error("Request failed:", error);
      showInfo("Failed to update favorite");
    },
  });
}

function updateFooterHeart(isFavorite) {
  // Ambil semua ikon yang punya class 'heartFoot'
  const heartIcons = document.querySelectorAll(".heartFoot");

  heartIcons.forEach((icon) => {
    icon.classList.remove("far", "fas"); // reset dulu
    icon.classList.add(isFavorite ? "fas" : "far");
    icon.style.color = isFavorite ? "#ffff" : "";
  });
}

function trackHeartDropdown(element) {
  if (!userId) {
    showLogin();
    return;
  }

  const heartIcon = element.querySelector("i") || element; // jika langsung dari <i>
  const isFilled = heartIcon.classList.contains("fas");
  const track = element.closest(".listmusic");
  const musicId = track?.getAttribute("data-id");
  const currentMusicId = localStorage.getItem("lastMusicId");

  if (!musicId) return;

  $.ajax({
    url: "/favorite_music",
    type: "POST",
    data: {
      id_music: musicId,
      action: !isFilled ? "add" : "remove",
    },
    dataType: "json",
    success: function (response) {
      if (response.success) {
        const newState = response.action === "added";

        heartIcon.classList.toggle("far", !newState);
        heartIcon.classList.toggle("fas", newState);
        heartIcon.style.color = newState ? "#ffff" : "";

        if (musicId === currentMusicId) {
          updateFooterHeart(newState);
        }

        updateTrackHeart(musicId, newState);

        const message = newState
          ? '<i class="fa-solid fa-heart" style="color: #ffff;"></i> Added to favorites'
          : '<i class="fa-regular fa-heart"></i> Removed from favorites';
        showInfo(message);
      }
    },
    error: function (xhr, status, error) {
      console.error("Error: " + error);
      showInfo("Failed to update favorite");
    },
  });
}

function refreshLibrary() {
  fetch("/partial/library")
    .then((response) => response.text())
    .then((html) => {
      // Replace partial content
      const wrapper = document.createElement("div");
      wrapper.innerHTML = html;

      const newContent = wrapper.querySelector("#all-content");
      const newPlaylist = wrapper.querySelector("#playlists-content");
      const newArtists = wrapper.querySelector("#artists-content");
      const newAlbums = wrapper.querySelector("#albums-content");

      if (newContent) {
        document.getElementById("all-content").innerHTML = newContent.innerHTML;
      }
      if (newPlaylist) {
        document.getElementById("playlists-content").innerHTML =
          newPlaylist.innerHTML;
      }
      if (newArtists) {
        document.getElementById("artists-content").innerHTML =
          newArtists.innerHTML;
      }
      if (newAlbums) {
        document.getElementById("albums-content").innerHTML =
          newAlbums.innerHTML;
      }

      // Kumpulkan ulang semua item
      collectLibraryItems();

      // Jika sedang mode recent, render ulang recent view
      if (!libraryState.isGroupedView && libraryState.currentTab === "all") {
        renderRecentView();
      }

      updateViewMode();
    })
    .catch((err) => console.error("Failed to refresh library:", err));
}

function buttonPlaylist() {
  var playlistId = document
    .querySelector(".listmusic")
    .getAttribute("data-playlist");
  var tracks = document.querySelectorAll(
    '.listmusic[data-playlist="' + playlistId + '"]'
  );
  if (tracks.length === 0) return;

  var lastPlayedMusic = localStorage.getItem("lastPlayedMusic");
  var lastPlayedPlaylist = localStorage.getItem("lastPlayedPlaylist");

  if (lastPlayedPlaylist === playlistId && lastPlayedMusic) {
    if (audioPlayer.paused) {
      audioPlayer.play();
    } else {
      localStorage.setItem(
        "progress_" + lastPlayedMusic + "_" + playlistId,
        audioPlayer.currentTime
      );
      audioPlayer.pause();
    }
  } else {
    var firstTrack = tracks[0];
    var firstMusicId = firstTrack.getAttribute("data-id");

    audioPlayer.src = firstTrack.getAttribute("data-src");
    audioPlayer.currentTime = 0;
    audioPlayer.play();
    currentPlayingItem = firstTrack;
    currentPlayingId = firstMusicId;
    currentPlayingPlaylist = playlistId;

    localStorage.setItem("lastPlayedMusic", firstMusicId);
    localStorage.setItem("lastPlayedPlaylist", playlistId);
    localStorage.setItem("playlistOpacity", playlistId);

    trackClicked(firstTrack);
    datamusic();
  }

  document.querySelectorAll(".playlistCover-play").forEach((icon) => {
    const wrapper = icon.closest(".svg-circle-wrapper");
    const iconHashId = wrapper?.getAttribute("data-playlist-hashid");
    if (iconHashId === playlistId) {
      icon.innerHTML = audioPlayer.paused ? playIcon : pauseIcon;
    } else {
      icon.innerHTML = playIcon;
    }
  });

  // Hapus semua highlight cover yang sedang main
  document.querySelectorAll(".coverImg.playing").forEach((el) => {
    el.classList.remove("playing");
  });

  // Tambahkan highlight ke cover dari current playlist
  document.querySelectorAll(`.coverImg`).forEach((cover) => {
    const wrapper = cover.querySelector(".svg-circle-wrapper");
    const hash = wrapper?.getAttribute("data-playlist-hashid");
    if (hash === playlistId) {
      cover.classList.add("playing");
    }
  });
}

function buttonFavMusic() {
  var tracks = document.querySelectorAll('.page_fav_music .listmusic');
  if (tracks.length === 0) return;

  var lastPlayedMusic = localStorage.getItem("lastPlayedMusic");
  var lastPlayedPlaylist = localStorage.getItem("lastPlayedPlaylist");
  
  // Untuk favorite music, gunakan hashid dari track pertama sebagai playlist identifier
  const favMusicContext = tracks[0].getAttribute("data-playlist");

  console.log('buttonFavMusic called:', {
    tracksCount: tracks.length,
    favMusicContext: favMusicContext,
    lastPlayedPlaylist: lastPlayedPlaylist,
    lastPlayedMusic: lastPlayedMusic
  });

  if (lastPlayedPlaylist === favMusicContext && lastPlayedMusic) {
    // Jika musik yang sama sedang diputar, toggle play/pause
    if (audioPlayer.paused) {
      audioPlayer.play();
      console.log('Resuming playback for favorite music');
    } else {
      localStorage.setItem(
        "progress_" + lastPlayedMusic + "_" + favMusicContext,
        audioPlayer.currentTime
      );
      audioPlayer.pause();
      console.log('Pausing playback for favorite music');
    }
  } else {
    // Mulai memutar dari track pertama
    var firstTrack = tracks[0];
    var firstMusicId = firstTrack.getAttribute("data-id");

    console.log('Starting playback from first track:', {
      firstTrackTitle: firstTrack.getAttribute('data-title'),
      firstMusicId: firstMusicId,
      favMusicContext: favMusicContext
    });

    audioPlayer.src = firstTrack.getAttribute("data-src");
    audioPlayer.currentTime = 0;
    audioPlayer.play().then(() => {
      currentPlayingItem = firstTrack;
      currentPlayingId = firstMusicId;
      currentPlayingPlaylist = favMusicContext;

      localStorage.setItem("lastPlayedMusic", firstMusicId);
      localStorage.setItem("lastPlayedPlaylist", favMusicContext);
      localStorage.setItem("lastPlayedPage", 'fav_music');

      // Initialize playlist tracks
      playlistTracks = Array.from(tracks);
      currentTrackIndex = 0;

      trackClicked(firstTrack);
      datamusic();
      
      console.log('Favorite music playback started successfully');
    }).catch((error) => {
      console.error('Error starting favorite music playback:', error);
    });
  }

  // Update play/pause icon
  document.querySelectorAll(".page_fav_music .svg-icon.playlist-play").forEach((icon) => {
    icon.innerHTML = audioPlayer.paused ? playIcon : pauseIcon;
  });
}


function buttonAlbum() {
  var tracks = document.querySelectorAll('.page_album .listmusic');
  if (tracks.length === 0) return;

  var lastPlayedMusic = localStorage.getItem("lastPlayedMusic");
  var lastPlayedPlaylist = localStorage.getItem("lastPlayedPlaylist");
  
  // Untuk album, gunakan hashid dari track pertama sebagai playlist identifier
  const albumContext = tracks[0].getAttribute("data-playlist");

  if (lastPlayedPlaylist === albumContext && lastPlayedMusic) {
    if (audioPlayer.paused) {
      audioPlayer.play();
    } else {
      localStorage.setItem(
        "progress_" + lastPlayedMusic + "_" + albumContext,
        audioPlayer.currentTime
      );
      audioPlayer.pause();
    }
  } else {
    var firstTrack = tracks[0];
    var firstMusicId = firstTrack.getAttribute("data-id");

    audioPlayer.src = firstTrack.getAttribute("data-src");
    audioPlayer.currentTime = 0;
    audioPlayer.play();
    currentPlayingItem = firstTrack;
    currentPlayingId = firstMusicId;
    currentPlayingPlaylist = albumContext;

    localStorage.setItem("lastPlayedMusic", firstMusicId);
    localStorage.setItem("lastPlayedPlaylist", albumContext);
    localStorage.setItem("lastPlayedPage", 'album');

    trackClicked(firstTrack);
    datamusic();
  }

  document.querySelectorAll(".page_album .svg-icon.playlist-play").forEach((icon) => {
    icon.innerHTML = audioPlayer.paused ? playIcon : pauseIcon;
  });
}

// Function untuk artist
function buttonArtist() {
  var tracks = document.querySelectorAll('.page_artist .listmusic');
  if (tracks.length === 0) return;

  var lastPlayedMusic = localStorage.getItem("lastPlayedMusic");
  var lastPlayedPlaylist = localStorage.getItem("lastPlayedPlaylist");
  
  // Untuk artist, gunakan hashid dari track pertama sebagai playlist identifier
  const artistContext = tracks[0].getAttribute("data-playlist");

  if (lastPlayedPlaylist === artistContext && lastPlayedMusic) {
    if (audioPlayer.paused) {
      audioPlayer.play();
    } else {
      localStorage.setItem(
        "progress_" + lastPlayedMusic + "_" + artistContext,
        audioPlayer.currentTime
      );
      audioPlayer.pause();
    }
  } else {
    var firstTrack = tracks[0];
    var firstMusicId = firstTrack.getAttribute("data-id");

    audioPlayer.src = firstTrack.getAttribute("data-src");
    audioPlayer.currentTime = 0;
    audioPlayer.play();
    currentPlayingItem = firstTrack;
    currentPlayingId = firstMusicId;
    currentPlayingPlaylist = artistContext;

    localStorage.setItem("lastPlayedMusic", firstMusicId);
    localStorage.setItem("lastPlayedPlaylist", artistContext);
    localStorage.setItem("lastPlayedPage", 'artist');

    trackClicked(firstTrack);
    datamusic();
  }

  document.querySelectorAll(".page_artist .svg-icon.playlist-play").forEach((icon) => {
    icon.innerHTML = audioPlayer.paused ? playIcon : pauseIcon;
  });
}

function buttonMusicInfo() {
  var tracks = document.querySelectorAll('.page_music .listmusic');
  if (tracks.length === 0) return;

  var lastPlayedMusic = localStorage.getItem("lastPlayedMusic");
  var lastPlayedPlaylist = localStorage.getItem("lastPlayedPlaylist");
  
  // Untuk music page, gunakan hashid dari track sebagai playlist identifier
  const musicContext = tracks[0].getAttribute("data-playlist");
  const currentMusicId = document.querySelector('.page_music')?.getAttribute("data-current-music")?.replace('music:', '');

  console.log('buttonMusicInfo:', {
    musicContext,
    lastPlayedPlaylist,
    lastPlayedMusic,
    currentMusicId
  });

  if (lastPlayedPlaylist === musicContext && lastPlayedMusic) {
    if (audioPlayer.paused) {
      audioPlayer.play();
      // PERBAIKAN: Langsung update icon
      updateMusicIconState(currentMusicId);
    } else {
      localStorage.setItem(
        "progress_" + lastPlayedMusic + "_" + musicContext,
        audioPlayer.currentTime
      );
      audioPlayer.pause();
      // PERBAIKAN: Langsung update icon
      updateMusicIconState(currentMusicId);
    }
  } else {
    var firstTrack = tracks[0];
    var firstMusicId = firstTrack.getAttribute("data-id");

    audioPlayer.src = firstTrack.getAttribute("data-src");
    audioPlayer.currentTime = 0;
    audioPlayer.play();
    currentPlayingItem = firstTrack;
    currentPlayingId = firstMusicId;
    currentPlayingPlaylist = musicContext;

    localStorage.setItem("lastPlayedMusic", firstMusicId);
    localStorage.setItem("lastPlayedPlaylist", musicContext);
    localStorage.setItem("lastPlayedPage", 'music');

    trackClicked(firstTrack, "next", true);
    datamusic();
    
    // PERBAIKAN: Langsung update icon
    updateMusicIconState(currentMusicId);
  }

  // Juga update semua halaman visible
  updateAllVisiblePages();
}

function playlistFav(element) {
  if (userId) {
    const favPlaylist = element.querySelector(".fa-bookmark");
    const isCurrentlyFavorite = favPlaylist.classList.contains("fas");
    const id_playlist = element.dataset.id;
    
    // PERBAIKAN: Ambil playlistType dari data attribute
    const playlistType = element.dataset.type;
    const isCustomPlaylist = playlistType === 'custom';
    
    $.ajax({
      url: "/playlistFav",
      type: "POST",
      contentType: "application/json",
      data: JSON.stringify({
        is_favorite: !isCurrentlyFavorite,
        id_playlist: id_playlist,
        is_custom: isCustomPlaylist
      }),
      success: function (response) {
        if (response.success) {
          if (response.is_favorite) {
            favPlaylist.classList.remove("far");
            favPlaylist.classList.add("fas");
            favPlaylist.style.color = "#ffff";

            // Tambah ke sidebar dan mobile library
            if (response.playlistData) {
              addToLibrarySidebar(response.playlistData);
            }

            showInfo('<i class="fa-solid fa-bookmark"></i> Add from library');
          } else {
            favPlaylist.classList.remove("fas");
            favPlaylist.classList.add("far");
            favPlaylist.style.color = "";

            // PERBAIKAN: Tambahkan parameter untuk custom playlist
            removeFromLibrarySidebar(id_playlist, isCustomPlaylist);

            showInfo(
              '<i class="fa-regular fa-bookmark"></i> Removed from library'
            );
          }
        } else {
          console.warn("Gagal update status favorit:", response.message);
          showInfo(response.message || 'Gagal menyimpan playlist');
        }

        refreshLibrary();
      },
      error: function (xhr) {
        console.error("Gagal", xhr.responseText);
        showInfo('Terjadi kesalahan');
      },
    });
  } else {
    showLogin();
  }
}


function addToLibrarySidebar(playlist) {
  const existingSidebar = document.querySelector(
    `.library-item[data-id="${playlist.id}"]`
  );
  const existingMessages = document.querySelector(
    `#direct-messages-items .direct-messages-item[data-id="${playlist.id}"]`
  );

  // Hapus jika sudah ada, supaya bisa di-insert ulang
  if (existingSidebar) existingSidebar.remove();
  if (existingMessages) existingMessages.remove();

  // PERBAIKAN: Tentukan apakah perlu menampilkan collage
  const hasTrackCovers = playlist.track_covers && Array.isArray(playlist.track_covers) && playlist.track_covers.length > 0;
  const multipleCovers = hasTrackCovers && playlist.track_covers.length > 1;
  const hasMultipleTracks = playlist.track_count > 1;
  const showCollage = playlist.playlist_type === 'custom' && hasMultipleTracks && multipleCovers;

  // === Tambah ke navbar section ===
  const container = document.querySelectorAll(".navbar-section")[1];
  if (container) {
    const button = document.createElement("button");
    button.className = "navbar-item custom library-item";
    button.setAttribute("data-id", playlist.id);
    button.setAttribute("data-type", playlist.contentType || "fav-playlist");
    button.setAttribute("data-track-count", playlist.track_count || 0);
    button.setAttribute("data-track-covers", JSON.stringify(playlist.track_covers || []));

    if (playlist.hashid) {
      button.setAttribute("onclick", 
        playlist.contentType === 'custom-playlist' ? 
        `showCustomPlaylist('${playlist.hashid}')` : 
        `showplaylist('${playlist.hashid}')`
      );
    } else {
      button.setAttribute("onclick", "setActiveContentByData(this)");
    }

    let coverHTML = '';
    if (showCollage) {
      // Collage cover untuk playlist dengan banyak lagu DAN cover berbeda
      const displayCovers = playlist.track_covers.slice(0, 4);
      coverHTML = `
        <div class="navbar-item-content collage-cover">
          <div class="collage-grid" style="grid-template-columns: repeat(2, 1fr); grid-template-rows: ${displayCovers.length > 2 ? 'repeat(2, 1fr)' : '1fr'};">
            ${displayCovers.map((cover, index) => `
              <div 
                class="collage-item" 
                style="background-image: url('${cover}'); ${displayCovers.length === 3 && index === 2 ? 'grid-column: span 2;' : ''}"
              ></div>
            `).join('')}
          </div>
        </div>
      `;
    } else {
      // Cover normal untuk single track atau playlist dengan cover sama
      const coverUrl = (playlist.track_covers && playlist.track_covers.length > 0) ? 
        playlist.track_covers[0] : 
        playlist.cover || '/images/default-playlist.png';
      
      coverHTML = `
        <div class="navbar-item-content rounded-square" style="background-image: url('${coverUrl}');"></div>
      `;
    }

    button.innerHTML = `
      ${coverHTML}
      <span class="navbar-item-text">${playlist.name}</span>
      <div class="tooltip right">
        <p>${playlist.name}</p>
        <small>Added: ${new Date(playlist.created_at).toLocaleDateString()}</small>
      </div>
    `;

    container.insertBefore(button, container.firstChild);
  }

  // === Tambah ke direct-messages ===
  const messagesContainer = document.getElementById("direct-messages-items");
  if (messagesContainer) {
    const item = document.createElement("div");
    
    // PERBAIKAN: Atur class berdasarkan view mode saat ini
    const isGridView = messagesContainer.classList.contains("grid-view");
    const isCompactView = messagesContainer.classList.contains("compact-view");
    
    item.className = "direct-messages-item content-navigator-button";
    item.setAttribute("data-id", playlist.id);
    item.setAttribute("data-type", "fav_playlist");
    item.setAttribute("data-filter-type", "music");
    item.setAttribute("data-track-count", playlist.track_count || 0);
    item.setAttribute("data-track-covers", JSON.stringify(playlist.track_covers || []));

    if (playlist.hashid) {
      item.setAttribute("onclick", 
        playlist.contentType === 'custom-playlist' ? 
        `showCustomPlaylist('${playlist.hashid}')` : 
        `showplaylist('${playlist.hashid}')`
      );
    }

    let coverHTML = '';
    if (showCollage) {
      // Collage cover untuk direct messages
      const displayCovers = playlist.track_covers.slice(0, 4);
      coverHTML = `
        <div class="user-icon collage-cover rounded-square">
          <div class="collage-grid" style="grid-template-columns: repeat(2, 1fr); grid-template-rows: ${displayCovers.length > 2 ? 'repeat(2, 1fr)' : '1fr'};">
            ${displayCovers.map((cover, index) => `
              <div 
                class="collage-item" 
                style="background-image: url('${cover}'); ${displayCovers.length === 3 && index === 2 ? 'grid-column: span 2;' : ''}"
              ></div>
            `).join('')}
          </div>
        </div>
      `;
    } else {
      // Cover tunggal untuk direct messages
      const coverUrl = (playlist.track_covers && playlist.track_covers.length > 0) ? 
        playlist.track_covers[0] : 
        playlist.cover || '/images/default-playlist.png';
      
      coverHTML = `
        <div class="user-icon rounded-square" style="background-image: url('${coverUrl}')"></div>
      `;
    }

    // SELALU buat user-info
    item.innerHTML = `
      ${coverHTML}
      <div class="direct-messages-item-user-info">
        <p class="direct-messages-item-username">${playlist.name}</p>
        <p class="direct-messages-item-user-activity">
          ${playlist.contentType === 'custom-playlist' ? 'Playlist' : 'Favorite Playlist'}
        </p>
      </div>
    `;

    messagesContainer.insertBefore(item, messagesContainer.firstChild);

    // PERBAIKAN: Setelah menambahkan, reset semua style dan biarkan CSS yang menanganinya
    // Jangan atur style inline karena akan menimpa CSS
    item.style = ''; // Reset semua inline style
    
    // PERBAIKAN: Jika dalam compact view, sembunyikan user-info
    if (isCompactView) {
      const userInfo = item.querySelector(".direct-messages-item-user-info");
      if (userInfo) {
        userInfo.style.display = "none";
      }
    }

    // Cek filter
    const currentFilter = localStorage.getItem("libraryFilterState") || "all";
    const filterType = "music";
    if (!(currentFilter === "all" || currentFilter === filterType)) {
      item.style.display = "none";
    }
  }

  $(".empty-library-section").hide();
  $(".empty-library-container").hide();

  ensureToggleButtonExists();
  
}

function ensureToggleButtonExists() {
  const header = document.getElementById("direct-messages-header");
  if (!header) return;
  
  let toggleButton = document.getElementById("direct-messages-add-button");
  
  // Jika button belum ada, cek apakah ada placeholder
  if (!toggleButton) {
    // Cari placeholder div
    const placeholder = header.querySelector('div[style*="width: 40px"]');
    
    if (placeholder) {
      // Ganti placeholder dengan button
      toggleButton = document.createElement("button");
      toggleButton.id = "direct-messages-add-button";
      toggleButton.onclick = toggle;
      
      // Set icon berdasarkan viewMode saat ini
      const currentViewMode = viewMode || 0;
      if (currentViewMode === 0) {
        toggleButton.innerHTML = '<i class="fa-solid fa-list"></i><div class="tooltip top"><p>Grid View</p></div>';
      } else if (currentViewMode === 1) {
        toggleButton.innerHTML = '<i class="fa-solid fa-border-all"></i><div class="tooltip top"><p>Compact View</p></div>';
      } else if (currentViewMode === 2) {
        toggleButton.innerHTML = '<i class="fa-solid fa-grip"></i><div class="tooltip top"><p>List View</p></div>';
      }
      
      // Ganti placeholder dengan button
      placeholder.parentNode.replaceChild(toggleButton, placeholder);
    } else {
      // Jika tidak ada placeholder, coba buat button setelah title
      toggleButton = document.createElement("button");
      toggleButton.id = "direct-messages-add-button";
      toggleButton.onclick = toggle;
      
      // Set icon berdasarkan viewMode saat ini
      const currentViewMode = viewMode || 0;
      if (currentViewMode === 0) {
        toggleButton.innerHTML = '<i class="fa-solid fa-list"></i><div class="tooltip top"><p>Grid View</p></div>';
      } else if (currentViewMode === 1) {
        toggleButton.innerHTML = '<i class="fa-solid fa-border-all"></i><div class="tooltip top"><p>Compact View</p></div>';
      } else if (currentViewMode === 2) {
        toggleButton.innerHTML = '<i class="fa-solid fa-grip"></i><div class="tooltip top"><p>List View</p></div>';
      }
      
      // Tambahkan ke header (setelah title)
      const title = document.getElementById("direct-messages-title");
      if (title && title.parentNode === header) {
        header.insertBefore(toggleButton, title.nextSibling);
      } else {
        header.appendChild(toggleButton);
      }
    }
  }
  
  // Tampilkan button dengan style yang benar
  toggleButton.style.display = "flex";
  toggleButton.style.alignItems = "center";
  toggleButton.style.justifyContent = "center";
}


function addArtistToSidebar(artistData) {
  // Hapus dulu jika sudah ada (untuk menghindari duplikat)
  removeArtistFromSidebarComprehensive(artistData);

  // 1. Tambah ke navbar section dengan SEMUA identifier
  const navbarContainer = document.querySelectorAll(".navbar-section")[1];
  if (navbarContainer) {
    const button = document.createElement("button");
    button.className = "navbar-item artist library-item";
    
    // SET SEMUA IDENTIFIER
    button.setAttribute("data-id", artistData.id); // id_artist biasa
    button.setAttribute("data-artist-id", artistData.id_artist_auto); // id_artist_auto
    button.setAttribute("data-hashid", artistData.hashid); // hashid
    button.setAttribute("data-type", "artist");
    button.setAttribute("data-content-type", "artist");
    
    if (artistData.hashid) {
      button.setAttribute("onclick", `showArtist('${artistData.hashid}')`);
    }

    button.innerHTML = `
      <div class="navbar-item-content rounded-circle" 
           style="background-image: url('${artistData.cover}');"></div>
      <span class="navbar-item-text">${artistData.name}</span>
      <div class="tooltip right">
        <p>${artistData.name}</p>
        <small>Artist</small>
      </div>
    `;

    // Tambahkan di awal section
    navbarContainer.insertBefore(button, navbarContainer.firstChild);
  }

  // 2. Tambah ke direct-messages dengan SEMUA identifier
  const messagesContainer = document.getElementById("direct-messages-items");
  if (messagesContainer) {
    const item = document.createElement("div");
    item.className = "direct-messages-item content-navigator-button";
    
    // SET SEMUA IDENTIFIER
    item.setAttribute("data-id", artistData.id); // id_artist biasa
    item.setAttribute("data-artist-id", artistData.id_artist_auto); // id_artist_auto
    item.setAttribute("data-hashid", artistData.hashid); // hashid
    item.setAttribute("data-type", "artist");
    item.setAttribute("data-filter-type", "artist");
    
    if (artistData.hashid) {
      item.setAttribute("onclick", `showArtist('${artistData.hashid}')`);
    }

    // PERBAIKAN: SELALU buat user-info (jangan conditional rendering)
    item.innerHTML = `
      <div class="user-icon rounded-circle" 
           style="background-image: url('${artistData.cover}')"></div>
      <div class="direct-messages-item-user-info">
        <p class="direct-messages-item-username">${artistData.name}</p>
        <p class="direct-messages-item-user-activity">Artist</p>
      </div>
    `;

    // Tambahkan di awal container
    messagesContainer.insertBefore(item, messagesContainer.firstChild);

    // PERBAIKAN: Setelah menambahkan, reset semua style inline
    item.style = ''; // Reset semua inline style
    
    // PERBAIKAN: Cek view mode saat ini dan sesuaikan
    const isGridView = messagesContainer.classList.contains("grid-view");
    const isCompactView = messagesContainer.classList.contains("compact-view");
    
    if (isCompactView) {
      // Jika compact view, sembunyikan user-info
      const userInfo = item.querySelector(".direct-messages-item-user-info");
      if (userInfo) {
        userInfo.style.display = "none";
      }
    }
    
    // Apply filter jika ada
    const currentFilter = localStorage.getItem("libraryFilterState") || "all";
    const filterType = "artist";
    if (!(currentFilter === "all" || currentFilter === filterType)) {
      item.style.display = "none";
    }
  }

  $(".empty-library-section").hide();
  $(".empty-library-container").hide();
   ensureToggleButtonExists();
}

function addAlbumToSidebar(albumData) {
  // Hapus dulu jika sudah ada (untuk menghindari duplikat)
  removeAlbumFromSidebarComprehensive(albumData);

  // 1. Tambah ke navbar section dengan SEMUA identifier
  const navbarContainer = document.querySelectorAll(".navbar-section")[1];
  if (navbarContainer) {
    const button = document.createElement("button");
    button.className = "navbar-item album library-item";
    
    // SET SEMUA IDENTIFIER
    button.setAttribute("data-id", albumData.id); // id_al biasa
    button.setAttribute("data-album-id", albumData.id_album_auto); // id_album_auto
    button.setAttribute("data-hashid", albumData.hashid); // hashid
    button.setAttribute("data-type", "album");
    button.setAttribute("data-content-type", "album");
    button.setAttribute("data-track-count", albumData.track_count || 0);
    
    if (albumData.hashid) {
      button.setAttribute("onclick", `showAlbum('${albumData.hashid}')`);
    }

    button.innerHTML = `
      <div class="navbar-item-content rounded-square" 
           style="background-image: url('${albumData.cover}');"></div>
      <span class="navbar-item-text">${albumData.name}</span>
      <div class="tooltip right">
        <p>${albumData.name}</p>
        <small>Album • ${albumData.track_count || 0} tracks</small>
      </div>
    `;

    // Tambahkan di awal section
    navbarContainer.insertBefore(button, navbarContainer.firstChild);
  }

  // 2. Tambah ke direct-messages dengan SEMUA identifier
  const messagesContainer = document.getElementById("direct-messages-items");
  if (messagesContainer) {
    const item = document.createElement("div");
    item.className = "direct-messages-item content-navigator-button";
    
    // SET SEMUA IDENTIFIER
    item.setAttribute("data-id", albumData.id); // id_al biasa
    item.setAttribute("data-album-id", albumData.id_album_auto); // id_album_auto
    item.setAttribute("data-hashid", albumData.hashid); // hashid
    item.setAttribute("data-type", "album");
    item.setAttribute("data-filter-type", "album");
    item.setAttribute("data-track-count", albumData.track_count || 0);
    
    if (albumData.hashid) {
      item.setAttribute("onclick", `showAlbum('${albumData.hashid}')`);
    }

    // PERBAIKAN: SELALU buat user-info (jangan conditional rendering)
    item.innerHTML = `
      <div class="user-icon rounded-square" 
           style="background-image: url('${albumData.cover}')"></div>
      <div class="direct-messages-item-user-info">
        <p class="direct-messages-item-username">${albumData.name}</p>
        <p class="direct-messages-item-user-activity">Album • ${albumData.track_count || 0} tracks</p>
      </div>
    `;

    // Tambahkan di awal container
    messagesContainer.insertBefore(item, messagesContainer.firstChild);

    // PERBAIKAN: Setelah menambahkan, reset semua style inline
    item.style = ''; // Reset semua inline style
    
    // PERBAIKAN: Cek view mode saat ini dan sesuaikan
    const isGridView = messagesContainer.classList.contains("grid-view");
    const isCompactView = messagesContainer.classList.contains("compact-view");
    
    if (isCompactView) {
      // Jika compact view, sembunyikan user-info
      const userInfo = item.querySelector(".direct-messages-item-user-info");
      if (userInfo) {
        userInfo.style.display = "none";
      }
    }
    
    // Apply filter jika ada
    const currentFilter = localStorage.getItem("libraryFilterState") || "all";
    const filterType = "album";
    if (!(currentFilter === "all" || currentFilter === filterType)) {
      item.style.display = "none";
    }
  }

  $(".empty-library-section").hide();
  $(".empty-library-container").hide();
   ensureToggleButtonExists();
}



function removeFromLibrarySidebar(id_playlist) {
  // 1. Hapus dari sidebar
  const elSidebar = document.querySelector(
    `.library-item[data-id="${id_playlist}"]`
  );
  if (elSidebar) elSidebar.remove();

  // 2. Hapus dari direct-messages-items
  const elMessages = document.querySelector(
    `#direct-messages-items .direct-messages-item[data-id="${id_playlist}"]`
  );
  if (elMessages) elMessages.remove();
}

function setActiveContentByData(element) {
  const id = element.getAttribute("data-id");
  const type = element.getAttribute("data-type");
  setActiveContentLibrary(`${type}-${id}`);
}

function setActiveContentLibrary(contentId) {
  activeContent = contentId;
  saveState();
  updateActiveLibItems();
}

function updateActiveLibItems() {
  document.querySelectorAll(".navbar-item").forEach((item) => {
    item.classList.remove("active");
    const currentId = item.getAttribute("data-id");
    const currentType = item.getAttribute("data-type");

    if (activeContent === `${currentType}-${currentId}`) {
      item.classList.add("active");
    }
  });
}

function listMobile(element) {
  const tr = element.closest(".track-container");
  const cover = tr.getAttribute("data-cover");
  const title = tr.getAttribute("data-title");
  const artist = tr.getAttribute("data-artist");
  const musicId = tr.getAttribute("data-id");
  const trackHashid = tr.getAttribute("data-track-hashid");
  const artistHashids = tr.getAttribute("data-artist-hashids");

  console.log('listMobile called for track:', title, 'artistHashids:', artistHashids);

  // PERBAIKAN: Gunakan selector yang lebih spesifik untuk halaman album
  const currentPage = getCurrentActivePage();
  let popup = currentPage.querySelector('.listMo');
  
  if (!popup) {
    popup = document.querySelector('.listMo');
  }

  if (!popup) {
    console.error('Popup not found');
    return;
  }

  // PERBAIKAN: Reset state popup setiap kali dipanggil
  resetPopupState(popup);

  const popupImage = popup.querySelector("#popupimage");
  const popupTitle = popup.querySelector("#popuptitle");
  const popupArtist = popup.querySelector("#popupartist");
  const favoriteItem = popup.querySelector('.grid-item[onclick*="popupHeartt"]');
  const albumButton = popup.querySelector("#albumMobileButton");
  const artistButton = popup.querySelector('.grid-item[onclick*="toggleContent(\'artist\')"]');
  const playlistButton = popup.querySelector('.grid-item[onclick*="toggleContent(\'playlist\')"]');

  if (popupImage) popupImage.src = cover;
  if (popupTitle) popupTitle.textContent = title;
  if (popupArtist) popupArtist.textContent = artist;
  if (favoriteItem) favoriteItem.setAttribute("data-id", musicId);

  // PERBAIKAN: Simpan data track di popup untuk digunakan nanti
  popup.setAttribute('data-current-music-id', musicId);
  popup.setAttribute('data-current-artist-hashids', artistHashids);

  // PERBAIKAN: Setup album button
  let albumHashid = '';
  if (tr.hasAttribute('data-album-hashid')) {
    albumHashid = tr.getAttribute('data-album-hashid');
  } else {
    const albumElement = tr.querySelector('.track-album.clickable');
    if (albumElement && albumElement.onclick) {
      const onclickText = albumElement.getAttribute('onclick') || '';
      const match = onclickText.match(/showAlbum\('([^']+)'\)/);
      if (match && match[1]) {
        albumHashid = match[1];
      }
    }
  }
  
  if (albumButton) {
    albumButton.setAttribute("data-hashid", albumHashid);
    
    if (albumHashid && albumHashid !== 'AL0') {
      albumButton.onclick = function() {
        showAlbumMobile(albumHashid);
        closePopup();
      };
      albumButton.querySelector('span').textContent = 'Album';
    } else {
      albumButton.onclick = function() {
        if (trackHashid) {
          showMusicMobile(trackHashid);
          closePopup();
        }
      };
      albumButton.querySelector('span').textContent = 'Music';
    }
  }

  // PERBAIKAN: Setup artist button dengan event listener yang fresh
  if (artistButton) {
    // Hapus event listener lama dan tambahkan yang baru
    const newArtistButton = artistButton.cloneNode(true);
    artistButton.parentNode.replaceChild(newArtistButton, artistButton);
    
    newArtistButton.addEventListener('click', function() {
      toggleContent('artist', popup);
    });
  }

  // PERBAIKAN: Setup playlist button dengan event listener yang fresh
  if (playlistButton) {
    const newPlaylistButton = playlistButton.cloneNode(true);
    playlistButton.parentNode.replaceChild(newPlaylistButton, playlistButton);
    
    newPlaylistButton.addEventListener('click', function() {
      toggleContent('playlist', popup);
    });
  }

  closePlaylist();
  
  if (userId) {
    $.ajax({
      url: "/checkPopupFav",
      type: "POST",
      contentType: "application/json",
      data: JSON.stringify({ id_music: musicId }),
      success: function (response) {
        const icon = popup.querySelector("#popupfavorite");
        const text = popup.querySelector("#popupfavorite-text");

        if (icon && text) {
          if (response.favorite) {
            icon.classList.remove("far");
            icon.classList.add("fas");
            icon.style.color = "#ffff";
            text.textContent = "Favorited";
          } else {
            icon.classList.remove("fas");
            icon.classList.add("far");
            icon.style.color = "";
            text.textContent = "Favorite";
          }
        }
      },
      error: function (xhr) {
        console.error("Gagal", xhr.responseText);
      },
    });
  }
  
  showPopup(popup);
}

function popupHeartt(element) {
  if (!userId) {
    showLogin();
    return;
  }

  const heartIcon = element.querySelector("i");
  const musicId = element.getAttribute("data-id");
  const isFilled = heartIcon.classList.contains("fas");
  const currentMusicId = localStorage.getItem("lastMusicId");

  if (!musicId) return;

  $.ajax({
    url: "/favorite_music",
    type: "POST",
    data: {
      id_music: musicId,
      action: isFilled ? "remove" : "add", // Consistent parameter naming
    },
    dataType: "json",
    success: function (response) {
      if (response.success) {
        // Update icon state based on server response
        const newState = response.action === "added";
        heartIcon.classList.toggle("far", !newState);
        heartIcon.classList.toggle("fas", newState);
        heartIcon.style.color = newState ? "#ffff" : "";

        // Update popup text
        const textEl = document.getElementById("popupfavorite-text");
        textEl.textContent = newState ? "Favorited" : "Favorite";

        if (musicId === currentMusicId) {
          updateFooterHeart(newState);
        }

        // Update track heart in other parts of UI
        updateTrackHeart(musicId, newState);
        closePopup();

        const message = newState
          ? '<i class="fa-solid fa-heart" style="color: #ffff;"></i> Added to favorites'
          : '<i class="fa-regular fa-heart"></i> Removed from favorites';
        showInfo(message);
      } else {
        console.error("Server error:", response.message);
        showInfo("Failed to update favorite");
      }
    },
    error: function (xhr, status, error) {
      console.error("Request failed:", error);
      showInfo("Failed to update favorite");
    },
  });
}

function resetPopupState(popup) {
  if (!popup) return;
  
  // Reset playlist wrapper
  const playlistWrapper = popup.querySelector(".playlist-wrapper");
  if (playlistWrapper) {
    playlistWrapper.innerHTML = "";
    playlistWrapper.removeAttribute("data-type");
  }
  
  // Reset playlistCus
  const playlistCus = popup.querySelector(".playlistCus");
  if (playlistCus) {
    playlistCus.classList.remove("active");
  }
  
  // Reset loading state buttons
  const buttons = popup.querySelectorAll('.grid-item.loading');
  buttons.forEach(button => {
    button.classList.remove('loading');
  });
}

function showPopup(specificPopup = null) {
  let popup = specificPopup;
  
  if (!popup) {
    const currentPage = getCurrentActivePage();
    popup = currentPage.querySelector('.listMo');
    
    if (!popup) {
      popup = document.querySelector('.listMo');
    }
  }

  if (!popup) {
    console.error('Popup not found');
    return;
  }

  // PERBAIKAN: Sembunyikan semua popup lainnya
  document.querySelectorAll('.listMo').forEach(otherPopup => {
    if (otherPopup !== popup) {
      otherPopup.style.display = 'none';
      otherPopup.classList.remove('active');
      resetPopupState(otherPopup); // Reset state popup lainnya
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

// PERBAIKAN: Tambahkan parameter popup ke toggleContent
function toggleContent(type, specificPopup = null) {
  let popup = specificPopup;
  if (!popup) {
    popup = document.querySelector('.listMo.active') || document.querySelector('.listMo');
  }

  if (!popup) {
    console.error('Popup not found in toggleContent');
    return;
  }

  const playlistCus = popup.querySelector(".playlistCus");
  const playlistWrapper = popup.querySelector(".playlist-wrapper");
  const button = popup.querySelector(
    `.grid-item[onclick*="toggleContent('${type}')"]`
  );

  if (!button) {
    console.error('Button not found for type:', type);
    return;
  }

  if (type === "playlist" && !userId) {
    showLogin();
    button.classList.remove("loading");
    return;
  }

  // Tambahkan loading animation ke button
  button.classList.add("loading");

  // Jika yang diklik sudah aktif, tutup dengan animasi
  if (
    playlistCus.classList.contains("active") &&
    playlistWrapper.getAttribute("data-type") === type
  ) {
    closePlaylist(() => button.classList.remove("loading"), popup);
    return;
  }

  // Jika sedang menampilkan tipe lain, tutup dulu baru ganti konten
  if (
    playlistWrapper.getAttribute("data-type") &&
    playlistWrapper.getAttribute("data-type") !== type
  ) {
    closeAndSwitch(() => updateContent(type, button, popup), popup);
  } else {
    updateContent(type, button, popup);
  }
}

// PERBAIKAN: Tambahkan parameter popup ke updateContent
function updateContent(type, button, popup) {
  const wrapper = popup.querySelector(".playlist-wrapper");
  wrapper.setAttribute("data-type", type);

  // PERBAIKAN: Ambil musicId dari popup attribute, bukan dari DOM global
  const musicId = popup.getAttribute('data-current-music-id');
  if (!musicId) {
    console.error('Music ID not found in popup');
    button.classList.remove("loading");
    return;
  }

  const url = type === "playlist" ? "/popup_get_playlists" : "/popup_get_artists";
  const data = type === "playlist" 
    ? { id_user: userId, id_music: musicId }
    : { id_music: musicId };

  console.log('Fetching data for type:', type, 'musicId:', musicId);

  $.ajax({
    url,
    type: "POST",
    data,
    dataType: "json",
    success: function (response) {
      wrapper.innerHTML = "";

      if (type === "playlist") {
        if (response.length === 0) {
          showCustom(popup);
          return;
        }

        response.forEach((item) => {
          let html = "";
          if (item.track_covers && item.track_covers.length > 1) {
            const covers = item.track_covers.slice(0, 4);
            const rows = item.track_covers.length > 2 ? "repeat(2,1fr)" : "1fr";
            const cols = "repeat(2,1fr)";
            const collageItems = covers
              .map((c, i) => {
                const span2 = covers.length === 3 && i === 2 ? "grid-column: span 2;" : "";
                return `<div class="collage-item" style="background-image:url('${c}'); ${span2}"></div>`;
              })
              .join("");
            html += `<div class="playlist-icon collage-cover">
              <div class="collage-grid" style="display:grid; grid-template-columns:${cols}; grid-template-rows:${rows}; width:54px; height:57px; border-radius:4px; overflow:hidden;">
                ${collageItems}
              </div>
            </div>`;
          } else {
            const cover = (item.track_covers && item.track_covers[0]) || item.playlist_cover || "/uploads/undefine.jpg";
            html += `<img src="${cover}" alt="cover" class="playlist-icon" style="width:54px;height:57px;border-radius:4px;">`;
          }

          const bg = item.exists ? "#66785f89" : "";
          const iconClass = item.exists
            ? "fa-solid fa-square-check check-icon"
            : "fa-regular fa-square-check check-icon";
          const action = `addToPlaylist('${item.id_cus}', ${musicId})`;

          wrapper.insertAdjacentHTML(
            "beforeend",
            `
            <div class="grid-item" data-id="${item.id_cus}" onclick="${action}" style="background:${bg}; display:flex; align-items:center; gap:8px; padding:6px;">
              ${html}
              <span class="playlist-name">${item.playlist_name}</span>
              <i class="${iconClass}"></i>
            </div>
          `
          );
        });
      } else {
        // PERBAIKAN: Untuk artist, gunakan data dari popup atau dari response
        if (response.length === 1) {
          const artist = response[0];
          viewArtist(artist.hashid);
          closePopup();
          return;
        } else if (response.length > 1) {
          // Jika multiple artists, tampilkan semua dalam grid-item
          response.forEach((artist) => {
            wrapper.insertAdjacentHTML(
              "beforeend",
              `
              <div class="grid-item" onclick="viewArtist('${artist.hashid}'); closePopup();">
                <i class="fa-solid fa-user"></i> ${artist.artist_name}
              </div>
            `
            );
          });
        } else {
          // PERBAIKAN: Fallback ke artist hashids dari track data
          const artistHashids = popup.getAttribute('data-current-artist-hashids');
          if (artistHashids) {
            const hashidArray = artistHashids.split(',');
            hashidArray.forEach((hashid, index) => {
              if (hashid && hashid.trim() !== '') {
                wrapper.insertAdjacentHTML(
                  "beforeend",
                  `
                  <div class="grid-item" onclick="viewArtist('${hashid.trim()}'); closePopup();">
                    <i class="fa-solid fa-user"></i> Artist ${index + 1}
                  </div>
                `
                );
              }
            });
          } else {
            wrapper.insertAdjacentHTML(
              "beforeend",
              `<div class="grid-item">No artists found</div>`
            );
          }
        }
      }
      openWithAnimation(popup);
    },
    error: function (xhr, status, error) {
      console.error("Gagal mengambil data " + type + ":", error);
      // PERBAIKAN: Fallback untuk artist
      if (type === 'artist') {
        const artistHashids = popup.getAttribute('data-current-artist-hashids');
        if (artistHashids) {
          wrapper.innerHTML = "";
          const hashidArray = artistHashids.split(',');
          hashidArray.forEach((hashid, index) => {
            if (hashid && hashid.trim() !== '') {
              wrapper.insertAdjacentHTML(
                "beforeend",
                `
                <div class="grid-item" onclick="viewArtist('${hashid.trim()}'); closePopup();">
                  <i class="fa-solid fa-user"></i> Artist ${index + 1}
                </div>
              `
              );
            }
          });
          openWithAnimation(popup);
        }
      }
    },
    complete: function () {
      button.classList.remove("loading");
    },
  });
}

// Fungsi untuk menutup daftar dengan animasi naik
function closePlaylist(callback) {
  const playlistCus = document.querySelector(".playlistCus");
  const playlistWrapper = document.querySelector(".playlist-wrapper");

  playlistWrapper.style.maxHeight = "0px"; // Slide up (menutup ke atas)
  playlistWrapper.style.opacity = "0";
  playlistWrapper.style.visibility = "hidden";

  playlistCus.classList.remove("active");
  if (callback) callback();
}

// Fungsi untuk mengganti daftar setelah menutup
function closeAndSwitch(callback) {
  const playlistWrapper = document.querySelector(".playlist-wrapper");

  playlistWrapper.style.maxHeight = "0px"; // Slide up (menutup ke atas)
  playlistWrapper.style.opacity = "0";
  playlistWrapper.style.visibility = "hidden";

  setTimeout(() => {
    callback(); // Ganti konten setelah animasi selesai
  }, 400);
}

// Fungsi untuk menampilkan daftar dengan animasi turun
function openWithAnimation() {
  const playlistCus = document.querySelector(".playlistCus");
  const playlistWrapper = document.querySelector(".playlist-wrapper");

  playlistCus.classList.add("active");

  setTimeout(() => {
    playlistWrapper.style.maxHeight = "280px"; // Slide down (turun)
    playlistWrapper.style.opacity = "1";
    playlistWrapper.style.visibility = "visible";
  }, 10);
}


function addToPlaylist(playlistId, musicId) {
  const currentPlaylistHash = window.location.pathname.split("/").pop();

  $.ajax({
    url: "/add_musicCus",
    type: "POST",
    data: {
      id_playlist: playlistId,
      id_music: musicId,
      current_hash: currentPlaylistHash,
    },
    dataType: "json",
    success: function (response) {
      const $targetItem = $(".grid-item").filter(function () {
        return (
          $(this).attr("onclick") ===
          `addToPlaylist('${playlistId}', ${musicId})`
        );
      });

      if (response.status === "added") {
        if (
          response.status &&
          response.playlist_hash === window.location.pathname.split("/").pop()
        ) {
          loadPlaylistTracks(response.playlist_hash);

          updateMobilePlaylistPageCover(
            playlistId,
            response.new_cover || response.default_cover,
            response.track_covers
          );
        }

        $targetItem.css("background-color", "#66785f89");
        $targetItem
          .find(".check-icon")
          .removeClass("fa-regular")
          .addClass("fa-solid");

        showInfo(
          '<i class="fa-solid fa-circle-check" style="color: #28a745;"></i> Added to your playlist'
        );
        updatePlaylistPopupIcon(playlistId, response.track_covers || []);

        if (document.querySelector(".topContent.expand")) {
          setTimeout(() => {
            refreshCustomPlaylistCoversOnly();
          }, 10);
        }

        if (response.new_cover || response.track_covers) {
          updateCustomPlaylistCoverInUI(
            playlistId,
            response.new_cover,
            response.track_covers
          );
        }

        updateMobilePlaylistCover(
          playlistId,
          response.new_cover || response.track_covers?.[0],
          response.track_covers || []
        );


          if (response.status && response.playlist_hash === window.location.pathname.split('/').pop()) {
            addNewTrackToPlaylistUI(response.new_track, response.playlist_hash);
            updateMobilePlaylistPageCover(playlistId, 
              response.new_cover || response.default_cover, 
              response.track_covers);
          }


      } else if (
        response.status === "deleted" ||
        response.status === "deleted_all"
      ) {
        $targetItem.css("background-color", "");
        $targetItem
          .find(".check-icon")
          .removeClass("fa-solid")
          .addClass("fa-regular");

        const message =
          response.status === "deleted_all"
            ? "All instances removed from playlist"
            : "Removed from your playlist";
        showInfo(`<i class="fa-regular fa-circle-check"></i> ${message}`);

        // Enhanced cover update with proper data

        updatePlaylistPopupIcon(playlistId, response.track_covers || []);

        if (response.playlist_hash === currentPlaylistHash) {
          removeTrackFromPlaylistUI(
            musicId,
            currentPlaylistHash,
            response.status === "deleted_all"
          );

          // PERBAIKAN: Pastikan parameter benar
          updateMobilePlaylistPageCover(
            playlistId, // Gunakan playlistId asli, bukan hash
            response.new_cover || response.default_cover,
            response.track_covers || [] // Pastikan array
          );

          loadPlaylistTracks(response.playlist_hash);
        }
        if (document.querySelector(".topContent.expand")) {
          setTimeout(() => {
            refreshCustomPlaylistCoversOnly();
          }, 10);
        }

        if (
          response.new_cover ||
          response.default_cover ||
          response.track_covers
        ) {
          updateCustomPlaylistCoverInUI(
            playlistId,
            response.new_cover || response.default_cover,
            response.track_covers
          );
        }

        updateMobilePlaylistCover(
          playlistId,
          response.new_cover ||
            response.default_cover ||
            response.track_covers?.[0],
          response.track_covers || []
        );
      } else if (response.status === "forbidden") {
        showInfo(response.message);
      }

      refreshLibrary();
    },
    error: function () {
      console.error("Failed to add/remove song from playlist");
      showInfo("Failed to update playlist");
    },
  });
}


function getPlaylistIdFromHash(hash) {
  if (!hash) return null;

  // Jika hash sudah berupa ID numerik
  if (typeof hash === "number" || /^\d+$/.test(hash)) {
    return parseInt(hash);
  }

  // Jika hash berupa format C123
  if (hash.startsWith("C")) {
    try {
      return hashids.decode(hash.replace("C", ""))[0];
    } catch (e) {
      console.error("Error decoding playlist hash:", e);
      return null;
    }
  }

  // Coba decode langsung
  try {
    const decoded = hashids.decode(hash);
    return decoded.length > 0 ? decoded[0] : null;
  } catch (e) {
    console.error("Error decoding hash:", e);
    return null;
  }
}
function updateMobilePlaylistCover(playlistId, newCover, trackCovers = null) {
  console.log(
    "Updating mobile playlist cover for ID:",
    playlistId,
    "Covers:",
    trackCovers
  );

  // Pastikan playlistId adalah numeric
  let targetId = playlistId;
  if (typeof playlistId === "string" && /^\d+$/.test(playlistId)) {
    targetId = parseInt(playlistId);
  }

  if (!targetId) {
    console.error("Invalid playlist ID:", playlistId);
    return;
  }

  // Update data attributes pada semua matching items
  const playlistItems = document.querySelectorAll(`
    .mobile-library-item[data-id="${targetId}"],
    [data-id="${targetId}"].mobile-library-search-item,
    [data-id="${targetId}"].recent-library-item
  `);

  console.log("Found items to update:", playlistItems.length);

  playlistItems.forEach((item) => {
    // Update data attributes
    if (trackCovers) {
      item.setAttribute("data-track-covers", JSON.stringify(trackCovers));
      item.setAttribute("data-track-count", trackCovers.length);
    }

    // Dapatkan covers untuk ditampilkan
    const covers = trackCovers && trackCovers.length > 0 ? trackCovers : [];
    const trackCount = covers.length;
    const shouldShowCollage = trackCount > 1 && covers.length > 1;

    let coverElement = item.querySelector(".mobile-library-item-cover");
    if (!coverElement) {
      console.log("No cover element found, creating new one");
      coverElement = document.createElement("div");
      coverElement.className = "mobile-library-item-cover";
      item.insertBefore(coverElement, item.firstChild);
    }

    // Update cover element
    updateMobileLibraryItemCover(item, covers, trackCount);
  });
}

function updateMobileLibraryItemCover(item, trackCovers, trackCount) {
  const coverElement = item.querySelector(".mobile-library-item-cover");
  if (!coverElement) return;

  const shouldShowCollage = trackCount > 1 && trackCovers.length > 1;
  const displayCovers = trackCovers.slice(0, 4);

  // Bersihkan element
  coverElement.innerHTML = "";
  coverElement.style.backgroundImage = "";
  coverElement.className = "mobile-library-item-cover";

  if (shouldShowCollage) {
    // Tampilkan collage
    coverElement.classList.add("collage-cover");

    const collageGrid = document.createElement("div");
    collageGrid.className = "collage-grid";
    collageGrid.style.gridTemplateColumns = "repeat(2, 1fr)";
    collageGrid.style.gridTemplateRows =
      displayCovers.length > 2 ? "repeat(2, 1fr)" : "1fr";

    displayCovers.forEach((cover, index) => {
      const collageItem = document.createElement("div");
      collageItem.className = "collage-item";

      // Gunakan cache buster
      const cacheBuster = `?t=${new Date().getTime()}`;
      collageItem.style.backgroundImage = `url('${cover}${cacheBuster}')`;
      collageItem.style.backgroundSize = "cover";
      collageItem.style.backgroundPosition = "center";

      if (displayCovers.length === 3 && index === 2) {
        collageItem.style.gridColumn = "span 2";
      }

      collageGrid.appendChild(collageItem);
    });

    coverElement.appendChild(collageGrid);
  } else {
    // Tampilkan single cover
    const effectiveCover =
      trackCovers.length > 0 ? trackCovers[0] : "/uploads/undefine.jpg";
    const cacheBuster = `?t=${new Date().getTime()}`;

    coverElement.style.backgroundImage = `url('${effectiveCover}${cacheBuster}')`;
    coverElement.style.backgroundSize = "cover";
    coverElement.style.backgroundPosition = "center";
  }
}

function updateMobilePlaylistPageCover(playlistId, newCover, trackCovers) {
  const playlistPageCover = document.querySelector(".banner-img-container");
  if (!playlistPageCover) return;

  // Hitung jumlah track dan unique covers
  const trackCount = trackCovers
    ? trackCovers.length
    : parseInt(playlistPageCover.getAttribute("data-track-count")) || 0;
  const covers =
    trackCovers ||
    JSON.parse(playlistPageCover.getAttribute("data-track-covers") || "[]");
  const uniqueCovers = [...new Set(covers)];

  // Tentukan apakah perlu menampilkan collage
  const showCollage = trackCount > 1 && uniqueCovers.length > 1;
  const displayCovers = uniqueCovers.slice(0, 4);

  // Update data attributes
  playlistPageCover.setAttribute("data-track-count", trackCount);
  playlistPageCover.setAttribute("data-track-covers", JSON.stringify(covers));

  if (showCollage) {
    // Case: tampilkan collage
    let collageGrid = playlistPageCover.querySelector(".collage-grid");

    if (!collageGrid) {
      // Jika belum ada collage, buat baru
      playlistPageCover.innerHTML = `
        <img src="${displayCovers[0]}" 
             class="banner-img color-thief-source" 
             style="display: none;" 
             crossorigin="anonymous" 
             alt="Color source" />
        <div class="collage-grid" 
             style="grid-template-columns: repeat(2, 1fr); grid-template-rows: ${
               displayCovers.length > 2 ? "repeat(2, 1fr)" : "1fr"
             }">
          ${displayCovers
            .map(
              (cover, index) => `
            <div class="collage-item" 
                 style="background-image: url('${cover}'); ${
                displayCovers.length === 3 && index === 2
                  ? "grid-column: span 2;"
                  : ""
              }">
            </div>`
            )
            .join("")}
        </div>
      `;
    } else {
      // Update collage yang sudah ada
      const colorThiefImg = playlistPageCover.querySelector(
        ".banner-img.color-thief-source"
      );
      if (colorThiefImg) {
        colorThiefImg.src = displayCovers[0];
      }

      collageGrid.style.gridTemplateRows =
        displayCovers.length > 2 ? "repeat(2, 1fr)" : "1fr";

      collageGrid.innerHTML = displayCovers
        .map(
          (cover, index) => `
        <div class="collage-item" 
             style="background-image: url('${cover}'); ${
            displayCovers.length === 3 && index === 2
              ? "grid-column: span 2;"
              : ""
          }">
        </div>`
        )
        .join("");
    }
  } else {
    // Case: tampilkan single cover
    const effectiveCover = covers.length > 0 ? covers[0] : newCover;

    // Ganti collage menjadi single cover
    playlistPageCover.innerHTML = `
      <img
        class="banner-img playlistImage color-thief-source"
        src="${effectiveCover}"
        alt="Album cover"
        data-playlist-id="${playlistId}"
        crossorigin="anonymous"
      />
    `;
  }

  // Update color thief
  updatePlaylistColor();
}
function updatePlaylistPopupIcon(playlistId, trackCovers) {
  const gridItems = document.querySelectorAll(".grid-item");

  gridItems.forEach((item) => {
    const itemId = item.getAttribute("data-id") || "";
    if (itemId === playlistId) {
      const oldTrackCovers = JSON.parse(
        item.getAttribute("data-track-covers") || "[]"
      );

      // PERBAIKAN: Jangan skip update jika cover menjadi default
      const shouldSkip = JSON.stringify(trackCovers) === JSON.stringify(oldTrackCovers) && 
                        !(trackCovers && trackCovers.length === 0 && oldTrackCovers.length === 0);
      
      if (shouldSkip) {
        return;
      }

      item.setAttribute("data-track-covers", JSON.stringify(trackCovers || []));

      const shouldShowCollage = trackCovers && trackCovers.length > 1;
      const coverElement = item.querySelector(".playlist-icon");

      if (!coverElement) return;

      const newCoverElement = document.createElement("div");
      newCoverElement.className = "playlist-icon";

      if (shouldShowCollage) {
        const covers = trackCovers.slice(0, 4);
        const rows = covers.length > 2 ? "repeat(2, 1fr)" : "1fr";

        newCoverElement.innerHTML = `
          <div class="collage-cover" style="display:grid; grid-template-columns:repeat(2,1fr); grid-template-rows:${rows}; width:54px; height:57px; border-radius:4px; overflow:hidden;">
            ${covers
              .map((c, i) => {
                const span2 =
                  covers.length === 3 && i === 2 ? "grid-column: span 2;" : "";
                // TAMBAHKAN: Cache buster hanya untuk default image
                const src = c === '/uploads/undefine.jpg' ? `${c}?t=${new Date().getTime()}` : c;
                return `<div style="background-image:url('${src}'); background-size:cover; background-position:center; ${span2}"></div>`;
              })
              .join("")}
          </div>
        `;
      } else {
        const cover =
          trackCovers && trackCovers.length > 0
            ? trackCovers[0]
            : "/uploads/undefine.jpg";

        // PERBAIKAN: Gunakan cache buster hanya untuk default image
        const src = cover === '/uploads/undefine.jpg' ? `${cover}?t=${new Date().getTime()}` : cover;

        newCoverElement.innerHTML = `
          <img 
            src="${src}" 
            alt="cover" 
            style="width:54px;height:57px;border-radius:4px;object-fit:cover;"
            onerror="this.src='/uploads/undefine.jpg?t=' + new Date().getTime()"
          >
        `;
      }

      coverElement.parentNode.replaceChild(newCoverElement, coverElement);
    }
  });
}

async function toggleFollowArtist(element, id_artist) {
  if (!userId) {
    showLogin();
    return;
  }

  // Versi 1: Button lawas (mengandung child elements)
  const noticeContent = element.querySelector('.notice-content');
  const labelMessage = element.querySelector('.lable-message');
  
  // Versi 2: Button baru (langsung button)
  const isCurrentlyFollowing = 
    noticeContent ? noticeContent.classList.contains('following') : 
    element.classList.contains('following');
  
  try {
    const response = await fetch('/artistFollow', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        id_artist: id_artist,
        is_follow: !isCurrentlyFollowing
      })
    });

    const result = await response.json();
    
    if (result.success) {
      if (result.is_follow) {
        // Berhasil follow
        // Handle untuk button lawas
        if (noticeContent) {
          noticeContent.classList.add('following');
        }
        if (labelMessage) {
          labelMessage.textContent = 'Following';
        }
        
        // Handle untuk button baru
        element.classList.add('following');
        if (!noticeContent && !labelMessage) {
          element.textContent = 'Following';
        }
        
        // Tambahkan artist ke sidebar tanpa refresh
        addArtistToSidebar(result.artistData);
        
        showInfo('<i class="fa-solid fa-user-check"></i> Artist added to library');
      } else {
        // Berhasil unfollow
        // Handle untuk button lawas
        if (noticeContent) {
          noticeContent.classList.remove('following');
        }
        if (labelMessage) {
          labelMessage.textContent = 'Follow';
        }
        
        // Handle untuk button baru
        element.classList.remove('following');
        if (!noticeContent && !labelMessage) {
          element.textContent = 'Follow';
        }
        
        // Hapus artist dari sidebar menggunakan SEMUA identifier
        removeArtistFromSidebarComprehensive(result.artistData);
        
        showInfo('<i class="fa-regular fa-user"></i> Artist removed from library');
      }
      
      // Refresh library untuk update data terbaru
      refreshLibrary();
    } else {
      console.warn("Gagal update status follow:", result.message);
      showInfo(result.message, 'error');
    }
  } catch (error) {
    console.error('Error toggling follow:', error);
    showInfo('Failed to update follow status', 'error');
  }
}

async function toggleFollowUser(buttonOrUserId, id_user_follow = null) {
  if (!userId) {
    showLogin();
    return;
  }

  // **PERBAIKAN: Handle kedua format parameter**
  let button;
  let userIdToFollow;
  
  if (typeof buttonOrUserId === 'string' || typeof buttonOrUserId === 'number') {
    // Format 1: toggleFollowUser(userId)
    userIdToFollow = buttonOrUserId;
    // Cari tombol yang relevan
    button = document.getElementById('btn-follow-user') || 
             event?.target?.closest('.user-follow-btn') || 
             event?.target?.closest('.button-profile');
  } else {
    // Format 2: toggleFollowUser(buttonElement, userId)
    button = buttonOrUserId;
    userIdToFollow = id_user_follow;
  }
  
  // Pastikan kita punya userId yang valid
  if (!userIdToFollow) {
    console.error('User ID to follow is missing');
    return;
  }
  
  console.log('Toggle follow - Button:', button, 'User ID:', userIdToFollow);
  
  // **PERBAIKAN: Ambil state dari button langsung**
  // Cari elemen yang menunjukkan status following
  const noticeContent = button.querySelector('.notice-content');
  const labelButton = button.querySelector('.lable-button');
  
  // Tentukan status saat ini
  const isCurrentlyFollowing = noticeContent ? 
    noticeContent.classList.contains('following') : 
    button.classList.contains('following');
  
  console.log('Current following status:', isCurrentlyFollowing);
  
  // **PERBAIKAN: Update UI optimistically dengan cara yang benar**
  if (noticeContent) {
    noticeContent.classList.toggle('following');
  }
  button.classList.toggle('following');
  
  // Update text content
  if (labelButton) {
    labelButton.textContent = isCurrentlyFollowing ? 'Follow' : 'Following';
    labelButton.classList.toggle('following', !isCurrentlyFollowing);
  } else {
    button.textContent = isCurrentlyFollowing ? 'Follow' : 'Following';
  }
  
  button.disabled = true;

  try {
    const response = await fetch('/userFollow', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        id_user_follow: userIdToFollow
      })
    });

    const result = await response.json();
    
    console.log('Server response:', result);
    
    if (result.success) {
      // Update follower count
      const followerCountElement = document.getElementById('follower-count');
      if (followerCountElement && result.new_follower_count !== undefined) {
        followerCountElement.textContent = result.new_follower_count;
      }
      
      showInfo('<i class="fa-solid fa-user-check"></i> ' + result.message);
    } else {
      // **PERBAIKAN: Revert UI changes dengan benar**
      if (noticeContent) {
        noticeContent.classList.toggle('following');
      }
      button.classList.toggle('following');
      
      if (labelButton) {
        labelButton.textContent = isCurrentlyFollowing ? 'Following' : 'Follow';
        labelButton.classList.toggle('following', isCurrentlyFollowing);
      } else {
        button.textContent = isCurrentlyFollowing ? 'Following' : 'Follow';
      }
      
      showInfo(result.message, 'error');
    }
  } catch (error) {
    // **PERBAIKAN: Revert UI changes jika error**
    if (noticeContent) {
      noticeContent.classList.toggle('following');
    }
    button.classList.toggle('following');
    
    if (labelButton) {
      labelButton.textContent = isCurrentlyFollowing ? 'Following' : 'Follow';
      labelButton.classList.toggle('following', isCurrentlyFollowing);
    } else {
      button.textContent = isCurrentlyFollowing ? 'Following' : 'Follow';
    }
    
    console.error('Error toggling user follow:', error);
    showInfo('Failed to update follow status', 'error');
  } finally {
    button.disabled = false;
  }
}



// Fungsi komprehensif untuk menghapus artist dari sidebar
function removeArtistFromSidebarComprehensive(artistData) {
  console.log('Removing artist with all identifiers:', artistData);
  
  // SEMUA kemungkinan selector untuk navbar
  const navbarSelectors = [
    `.navbar-item.artist[data-id="${artistData.id}"]`, // id_artist biasa (sebelum refresh)
    `.navbar-item.artist[data-artist-id="${artistData.id_artist_auto}"]`, // id_artist_auto (setelah refresh)
    `.navbar-item.artist[data-hashid="${artistData.hashid}"]`, // hashid
    `.navbar-item.artist[onclick*="${artistData.hashid}"]` // onclick dengan hashid
  ];

  // SEMUA kemungkinan selector untuk direct-messages
  const messagesSelectors = [
    `#direct-messages-items .direct-messages-item[data-id="${artistData.id}"]`,
    `#direct-messages-items .direct-messages-item[data-artist-id="${artistData.id_artist_auto}"]`,
    `#direct-messages-items .direct-messages-item[data-hashid="${artistData.hashid}"]`,
    `#direct-messages-items .direct-messages-item[onclick*="${artistData.hashid}"]`
  ];

  // Hapus dari navbar
  navbarSelectors.forEach(selector => {
    try {
      const element = document.querySelector(selector);
      if (element) {
        console.log('Removing navbar item:', selector);
        element.remove();
      }
    } catch (e) {
      console.warn('Error removing navbar item with selector:', selector, e);
    }
  });

  // Hapus dari direct-messages
  messagesSelectors.forEach(selector => {
    try {
      const element = document.querySelector(selector);
      if (element) {
        console.log('Removing messages item:', selector);
        element.remove();
      }
    } catch (e) {
      console.warn('Error removing messages item with selector:', selector, e);
    }
  });

  // FALLBACK: Hapus berdasarkan nama artist (text content)
  if (artistData.name) {
    removeArtistByTextContent(artistData.name);
  }
}

// Fallback function: hapus berdasarkan text content
function removeArtistByTextContent(artistName) {
  // Cari di navbar
  const navbarItems = document.querySelectorAll('.navbar-item.artist .navbar-item-text');
  navbarItems.forEach(item => {
    if (item.textContent.trim() === artistName) {
      const parent = item.closest('.navbar-item.artist');
      if (parent) {
        console.log('Removing navbar item by text content:', artistName);
        parent.remove();
      }
    }
  });

  // Cari di direct-messages
  const messageItems = document.querySelectorAll('#direct-messages-items .direct-messages-item-username');
  messageItems.forEach(item => {
    if (item.textContent.trim() === artistName) {
      const parent = item.closest('.direct-messages-item');
      if (parent) {
        console.log('Removing messages item by text content:', artistName);
        parent.remove();
      }
    }
  });
}


async function albumFav(element) {
  console.log('albumFav called, userId:', userId);
  
  if (!userId) {
    showLogin();
    return;
  }

  // Cari ikon favorit dengan berbagai kemungkinan
  let favIcon = element.querySelector('.fa-bookmark');
  if (!favIcon) {
    favIcon = element.querySelector('.bookmark-icon');
  }
  if (!favIcon && element.parentElement) {
    favIcon = element.parentElement.querySelector('.fa-bookmark') || 
              element.parentElement.querySelector('.bookmark-icon');
  }
  
  console.log('favIcon found:', favIcon);
  
  // Ambil album ID dari berbagai kemungkinan
  let id_al = element.dataset.id;
  
  // Jika tidak ada di dataset, coba dari parent atau dari fav-album-button
  if (!id_al) {
    const favButton = element.closest('.fav-album-button');
    if (favButton && favButton.dataset.albumId) {
      id_al = favButton.dataset.albumId;
    }
  }
  
  // Jika masih tidak ada, coba dari data-album-id
  if (!id_al && element.dataset.albumId) {
    id_al = element.dataset.albumId;
  }
  
  console.log('Album ID found:', id_al);
  
  if (!id_al) {
    console.error('Album ID not found!');
    showInfo('Album not found', 'error');
    return;
  }

  const isCurrentlyFavorite = favIcon ? 
    favIcon.classList.contains('fas') || favIcon.classList.contains('fa-solid') : 
    false;
  

  try {
    const response = await fetch('/albumFav', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        id_al: id_al,
        is_favorite: !isCurrentlyFavorite
      })
    });

    const result = await response.json();
    
    if (result.success) {
      if (result.is_favorite) {
        // Berhasil favorite
        if (favIcon) {
          favIcon.classList.remove('far', 'fa-regular');
          favIcon.classList.add('fas', 'fa-solid');
          favIcon.style.color = '#fff';
        }
        
        if (result.albumData) {
          addAlbumToSidebar(result.albumData);
        }
        
        showInfo('<i class="fa-solid fa-bookmark"></i> Album added to library');
      } else {
        // Berhasil unfavorite
        if (favIcon) {
          favIcon.classList.remove('fas', 'fa-solid');
          favIcon.classList.add('far', 'fa-regular');
          favIcon.style.color = '';
        }
        
        if (result.albumData) {
          removeAlbumFromSidebarComprehensive(result.albumData);
        }
        
        showInfo('<i class="fa-regular fa-bookmark"></i> Album removed from library');
      }
      
      refreshLibrary();
    } else {
      console.warn("Failed to update favorite:", result.message);
      showInfo(result.message, 'error');
    }
  } catch (error) {
    console.error('Error toggling album favorite:', error);
    showInfo('Failed to update favorite status', 'error');
  }
}


// Fungsi komprehensif untuk menghapus album dari sidebar
function removeAlbumFromSidebarComprehensive(albumData) {
  console.log('Removing album with all identifiers:', albumData);
  
  // SEMUA kemungkinan selector untuk navbar
  const navbarSelectors = [
    `.navbar-item.album[data-id="${albumData.id}"]`, // id_al biasa (sebelum refresh)
    `.navbar-item.album[data-album-id="${albumData.id_album_auto}"]`, // id_album_auto (setelah refresh)
    `.navbar-item.album[data-hashid="${albumData.hashid}"]`, // hashid
    `.navbar-item.album[onclick*="${albumData.hashid}"]` // onclick dengan hashid
  ];

  // SEMUA kemungkinan selector untuk direct-messages
  const messagesSelectors = [
    `#direct-messages-items .direct-messages-item[data-id="${albumData.id}"]`,
    `#direct-messages-items .direct-messages-item[data-album-id="${albumData.id_album_auto}"]`,
    `#direct-messages-items .direct-messages-item[data-hashid="${albumData.hashid}"]`,
    `#direct-messages-items .direct-messages-item[onclick*="${albumData.hashid}"]`
  ];

  // Hapus dari navbar
  navbarSelectors.forEach(selector => {
    try {
      const element = document.querySelector(selector);
      if (element) {
        console.log('Removing navbar album:', selector);
        element.remove();
      }
    } catch (e) {
      console.warn('Error removing navbar album with selector:', selector, e);
    }
  });

  // Hapus dari direct-messages
  messagesSelectors.forEach(selector => {
    try {
      const element = document.querySelector(selector);
      if (element) {
        console.log('Removing messages album:', selector);
        element.remove();
      }
    } catch (e) {
      console.warn('Error removing messages album with selector:', selector, e);
    }
  });

  // FALLBACK: Hapus berdasarkan nama album (text content)
  if (albumData.name) {
    removeAlbumByTextContent(albumData.name);
  }
}

// Fallback function: hapus berdasarkan text content
function removeAlbumByTextContent(albumName) {
  // Cari di navbar
  const navbarItems = document.querySelectorAll('.navbar-item.album .navbar-item-text');
  navbarItems.forEach(item => {
    if (item.textContent.trim() === albumName) {
      const parent = item.closest('.navbar-item.album');
      if (parent) {
        console.log('Removing navbar album by text content:', albumName);
        parent.remove();
      }
    }
  });

  // Cari di direct-messages
  const messageItems = document.querySelectorAll('#direct-messages-items .direct-messages-item-username');
  messageItems.forEach(item => {
    if (item.textContent.trim() === albumName) {
      const parent = item.closest('.direct-messages-item');
      if (parent) {
        console.log('Removing messages album by text content:', albumName);
        parent.remove();
      }
    }
  });
}