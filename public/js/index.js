window.addEventListener("scroll", function () {
    const header = document.querySelector(".sticky-header");
    if (window.scrollY > 0) {
      header.classList.add("scrolled");
    } else {
      header.classList.remove("scrolled");
    }
  });

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
        function initializeCarousels() {
        const COMPONENT_SELECTOR = ".carousel__wrapper";
        const CONTENT_SELECTOR = ".carousel__content";

        const components = document.querySelectorAll(COMPONENT_SELECTOR);

        components.forEach((component) => {
          const content = component.querySelector(CONTENT_SELECTOR);
          const nextButtons = component.querySelectorAll(".arrow-next");
          const prevButtons = component.querySelectorAll(".arrow-prev");

          if (!content || nextButtons.length === 0 || prevButtons.length === 0)
            return;

          let x = 0;
          let mx = 0;
          const updateMaxScroll = () =>
            content.scrollWidth - content.clientWidth;

          const toggleArrows = () => {
            const currentMaxScroll = updateMaxScroll();
            prevButtons.forEach((btn) => {
              btn.classList.toggle("disabled", content.scrollLeft <= 0);
            });
            nextButtons.forEach((btn) => {
              btn.classList.toggle(
                "disabled",
                content.scrollLeft >= currentMaxScroll - 10
              );
            });
          };

          const mousemoveHandler = (e) => {
            const mx2 = e.pageX - content.offsetLeft;
            if (mx) {
              content.scrollLeft = content.sx + mx - mx2;
            }
          };

          const mousedownHandler = (e) => {
            content.sx = content.scrollLeft;
            mx = e.pageX - content.offsetLeft;
            content.classList.add("dragging");
          };

          const mouseupHandler = () => {
            mx = 0;
            content.classList.remove("dragging");
          };

          const init = () => {
            const maxScrollWidth = updateMaxScroll();
            if (maxScrollWidth > 0) {
              component.classList.add("has-arrows");
            }

            nextButtons.forEach((nextButton) => {
              nextButton.addEventListener("click", (event) => {
                event.preventDefault();
                if (nextButton.classList.contains("disabled")) return;
                content.scrollBy({
                  left: content.clientWidth / 2,
                  behavior: "smooth",
                });
              });
            });

            prevButtons.forEach((prevButton) => {
              prevButton.addEventListener("click", (event) => {
                event.preventDefault();
                if (prevButton.classList.contains("disabled")) return;
                content.scrollBy({
                  left: -content.clientWidth / 2,
                  behavior: "smooth",
                });
              });
            });

            // Add drag-to-scroll functionality
            content.addEventListener("mousemove", mousemoveHandler);
            content.addEventListener("mousedown", (e) => {
              const isInteractive = e.target.closest(
                ".svg-circle-wrapper, .visual-card"
              );
              if (isInteractive) return; // Hindari drag jika klik elemen interaktif
              mousedownHandler(e);
            });

            content.addEventListener("mouseup", mouseupHandler);
            content.addEventListener("mouseleave", mouseupHandler);
            content.addEventListener("scroll", toggleArrows);

            // Initialize arrow states
            requestAnimationFrame(() => {
              toggleArrows();
            });
          };

          // If there are images in the content, wait until all are loaded
          const images = content.querySelectorAll("img");
          let imagesLoaded = 0;

          if (images.length > 0) {
            images.forEach((img) => {
              if (img.complete) {
                imagesLoaded++;
              } else {
                img.addEventListener("load", () => {
                  imagesLoaded++;
                  if (imagesLoaded === images.length) {
                    init();
                  }
                });
                img.addEventListener("error", () => {
                  imagesLoaded++;
                  if (imagesLoaded === images.length) {
                    init();
                  }
                });
              }
            });

            if (imagesLoaded === images.length) {
              init();
            }
          } else {
            init();
          }
        });
      }




// Inisialisasi button events
const effect = document.querySelector(".effect");
document.addEventListener('DOMContentLoaded', setActiveNavButton);
window.addEventListener('load', setActiveNavButton);
window.addEventListener('popstate', setActiveNavButton);

// Fungsi untuk mengupdate posisi efek
function updateEffectPosition() {
  const activeButton = document.querySelector(".bottom-navbar button.active");
  const effect = document.querySelector(".effect");
  
  if (activeButton && effect) {
    const x = activeButton.offsetLeft;
    anime({
      targets: effect,
      left: `${x}px`,
      opacity: "1",
      duration: 500,
      easing: "easeOutQuart",
    });
  }
}

// Event listener untuk resize window
window.addEventListener("resize", () => {
  setTimeout(updateEffectPosition, 300);
});

// Inisialisasi button events
const buttons = document.querySelectorAll(".bottom-navbar button");
buttons.forEach((button) => {
  button.addEventListener("click", (e) => {
    buttons.forEach(btn => btn.classList.remove("active"));
    e.currentTarget.classList.add("active");
    updateEffectPosition();
  });
});






// MUSIC PLAYER


const topContent = document.querySelector(".topContent");
const bottomContent = document.querySelector(".bottomContent");
const albumBg = document.querySelector(".albumBg");
const wrapper = document.querySelector(".wrapper");

function expandBottomToggle(el) {
  // Cegah fungsi jika tombol disable
  if (el.hasAttribute("disabled")) return;

  bottomContent.classList.toggle("expand");

  // Toggle rotasi ikon
  el.classList.toggle("rotate-up");

  albumSize();
}

wrapper.style.height = window.innerHeight + "px";
function expandTop(el) {
    if (!userId) {
    showLogin();
    return;
  }
  
  const topContent = document.querySelector(".topContent");
  const downbottom = document.querySelector(".downbottom");
  const expandBottomToggle = document.querySelector(".expand-bottom-toggle");
  const bottomContent = document.querySelector(".bottomContent");
  const isBottomExpanded = bottomContent?.classList.contains("expand");

  topContent.style.transition = "all 0.4s 0.2s ease";

  if (topContent.classList.contains("expand")) {
    topContent.classList.remove("expand");
    if (isBottomExpanded) {
      downbottom?.classList.remove("hidden");
      expandBottomToggle?.removeAttribute("disabled");
      downbottom?.classList.add("rotate-up");
    }
  } else {
  


    showUserPlaylists();

    if (isBottomExpanded) {
      downbottom?.classList.add("hidden");
      expandBottomToggle?.setAttribute("disabled", "disabled");
      bottomContent?.classList.add("expand");
    }
  }

  if (!isBottomExpanded) {
    bottomContent?.classList.add("expand");
    downbottom?.classList.add("hidden");
  }

  setTimeout(() => {
    topContent.style.transition = "none";
  }, 500);

  albumSize();
}

// Fungsi untuk resize albumContent saat expand
function albumSize() {
  const albumContent = document.querySelectorAll(".albumContent");
  const bottomContent = document.querySelector(".bottomContent");

  if (
    topContent.classList.contains("expand") &&
    bottomContent.classList.contains("expand")
  ) {
    albumContent.forEach(function (el) {
      el.classList.add("small");
    });
  } else {
    albumContent.forEach(function (el) {
      el.classList.remove("small");
    });
  }
}

function showUserPlaylists() {
  const musicGroups = document.querySelector(".musicGroups");
  const topContent = document.querySelector(".topContent");
  const id_music = localStorage.getItem("lastMusicId") || 0;

  $.ajax({
    url: "/popup_get_playlists",
    type: "POST",
    data: { id_user: userId, id_music: id_music },
    dataType: "json",
    success: function (response) {
      if (!Array.isArray(response) || response.length === 0) {
        showCustom();
        return;
      }

      topContent.classList.add("expand");
      albumSize();
      
      if (!topContent || !topContent.classList.contains("expand")) {
        return;
      }

      // Clear existing content
      musicGroups.innerHTML = '';
      
      const wrapper = document.createElement("div");
      wrapper.className = "swiper-container slider-two";

      const inner = document.createElement("div");
      inner.className = "swiper-wrapper slider-two";

      response.forEach((item) => {
        let html = "";

        if (item.track_covers && item.track_covers.length > 1) {
          const covers = item.track_covers.slice(0, 4);
          const rows = item.track_covers.length > 2 ? "repeat(2,1fr)" : "1fr";
          const cols = "repeat(2,1fr)";
          const collageItems = covers.map((c, i) => {
            const span2 = covers.length === 3 && i === 2 ? "grid-column: span 2;" : "";
            return `<div class="topcollage-item" style="background-image:url('${c}'); ${span2}"></div>`;
          }).join("");
          html += `
            <div class="topplaylist-icon">
              <div class="topcollage-grid" style="display:grid; grid-template-columns:${cols}; grid-template-rows:${rows}; width:100%; height:100%; border-radius:4px; overflow:hidden;">
                ${collageItems}
              </div>
            </div>
          `;
        } else {
          const cover = (item.track_covers && item.track_covers[0]) || item.playlist_cover || '/uploads/undefine.jpg';
          html += `<img src="${cover}" alt="cover" class="playlist-icon" style="width:100%; height:100%; object-fit:cover; border-radius:4px;">`;
        }

        const iconClass = item.exists ? "fa-solid fa-circle-check" : "fa-regular fa-circle-check";
        const iconColor = item.exists ? "#4caf50" : "#b0b0b0";

        const slide = document.createElement("div");
        slide.className = "swiper-slide group";
        slide.dataset.id = item.id_cus;
        slide.innerHTML = `
        <figure>${html}</figure>
        <div class="titleGroup">
          <i class="${iconClass}" style="color:${iconColor}; margin-right:5px;"></i>
          <span class="titleText">${item.playlist_name}</span>
        </div>
      `;

        inner.appendChild(slide);
      });

      wrapper.appendChild(inner);
      musicGroups.appendChild(wrapper);

      // Force reflow before initializing Swiper
      wrapper.style.display = 'none';
      wrapper.offsetHeight;
      wrapper.style.display = '';

      // Initialize Swiper with proper configuration
      playlistSwiper = new Swiper(".swiper-container.slider-two", {
        direction: "horizontal",
        slidesPerView: "auto",
        spaceBetween: 10,
        freeMode: true,
        observer: true,
        observeParents: true,
        observeSlideChildren: true,
        on: {
          init: function() {
            this.update();
          }
        }
      });

      // Add click event listeners
document.querySelectorAll(".musicGroups .group").forEach((el) => {
  el.addEventListener("click", function() {
    const playlistId = this.dataset.id;
    const musicId = localStorage.getItem("lastMusicId") || 0;

    let numericPlaylistId = playlistId;
    if (playlistId.startsWith('C')) {
      try {
        numericPlaylistId = hashids.decode(playlistId.replace('C', ''))[0];
      } catch (e) {
        console.error('Error decoding playlist ID:', e);
      }
    }

    $.ajax({
      url: '/add_musicCus',
      type: 'POST',
      data: { id_playlist: playlistId, id_music: musicId },
      dataType: 'json',
      success: function(response) {
        const icon = el.querySelector("i");

        if (response.status === "added") {
          if (icon) {
            icon.classList.remove("fa-regular");
            icon.classList.add("fa-solid");
            icon.style.color = "#4caf50";
          }

          showInfo('<i class="fa-solid fa-circle-check" style="color: #28a745;"></i> Added to your playlist');

          // PERBAIKAN: Tambahkan track baru ke UI jika sedang melihat playlist yang sama
          if (response.status && response.playlist_hash === window.location.pathname.split('/').pop()) {
            addNewTrackToPlaylistUI(response.new_track, response.playlist_hash);
            updateMobilePlaylistPageCover(playlistId, 
              response.new_cover || response.default_cover, 
              response.track_covers);
          }

        } else if (response.status === "deleted" || response.status === "deleted_all") {
          if (icon) {
            icon.classList.remove("fa-solid");
            icon.classList.add("fa-regular");
            icon.style.color = "#b0b0b0";
          }

          const msg = response.status === "deleted_all"
            ? "All instances removed from playlist"
            : "Removed from your playlist";

          showInfo(`<i class="fa-regular fa-circle-check"></i> ${msg}`);

          if (response.status && response.playlist_hash === window.location.pathname.split('/').pop()) {
            if (response.status === "deleted" || response.status === "deleted_all") {
              removeTrackFromPlaylistUI(musicId, response.playlist_hash, response.status === "deleted_all");
            }
            updateMobilePlaylistPageCover(playlistId, 
              response.new_cover || response.default_cover, 
              response.track_covers);
          }
        }

        if (document.querySelector(".topContent.expand")) {
          refreshCustomPlaylistCoversOnly();
        }

        // Update cover playlist popup
        updatePlaylistPopupIcon(playlistId, response.track_covers || []);

        updateMobilePlaylistCover(
          numericPlaylistId,
          response.new_cover || response.default_cover,
          response.track_covers || []
        );

      },
      error: function() {
        showInfo("Failed to update playlist.");
      }
    });
  });
});
    },
    error: function () {
      console.error("Gagal mengambil custom playlist user.");
    }
  });
}

function addNewTrackToPlaylistUI(trackData, playlistHash) {
  const tracksContainer = document.querySelector('.tracks');
  if (!tracksContainer) return;

  // Format artist names untuk display
  const artistNames = trackData.artist_names.split(',').map(name => name.trim());
  const artistIds = trackData.artist_ids.split(',').map(id => id.trim());
  
  const artistsHtml = artistNames.map((name, index) => {
    const id = artistIds[index];
    return `<span class="clickable-artist" onclick="handleArtistClick('${id}')">${name}</span>${index < artistNames.length - 1 ? ', ' : ''}`;
  }).join('');

  // Format albums untuk display
  const albumsHtml = trackData.albums && trackData.albums.length > 0 
    ? trackData.albums.map(album => `<span class="track-album">${album.album_name}</span>`).join('')
    : `<span class="track-album">${trackData.title_music}</span>`;

  // Buat HTML untuk track baru
  const trackHtml = `
    <div class="track-container listmusic"
      onclick="trackClicked(this)"
      data-id="${trackData.id_music}"
      data-src="${trackData.audio_file}"
      data-lyric="${trackData.lyric || ''}"
      data-line-durations="${trackData.line_durations || ''}"
      data-cover="${trackData.cover_music}"
      data-title="${trackData.title_music}"
      data-artist-ids="${trackData.artist_ids}"
      data-artist="${trackData.artist_names}"
      data-playlist="${playlistHash}"
      data-album-id="${trackData.albums && trackData.albums.length > 0 ? trackData.albums[0].id_al : ''}"
      data-playlist_name="${document.querySelector('.playlist-name')?.textContent || ''}">

      <div class="track-info">
        <img src="${trackData.cover_music}" class="track-image" />
        <div class="track-details">
          <p class="track-title">${trackData.title_music}</p>
          <p class="track-artist">${artistsHtml}</p>
        </div>
      </div>

      ${albumsHtml}

      <span class="track-time">${trackData.duration}</span>
      <div class="track-actions">
        <i onclick="event.stopPropagation(); event.preventDefault(); trackHeart(this)" 
           class="far fa-heart fav_playlist"></i>

        <div class="dropdown-container" onclick="event.stopPropagation();">
          <i class="fa-solid fa-ellipsis track-menu" onclick="handleEllipsisClick(this)"></i>
          <div class="dropdown-content">
            <!-- Dropdown content akan diisi oleh JavaScript -->
          </div>
        </div>
      </div>
    </div>
  `;

  // Tambahkan track ke akhir daftar
  tracksContainer.insertAdjacentHTML('beforeend', trackHtml);

  // Update playlist tracks array
  const newTrackElement = tracksContainer.lastElementChild;
  playlistTracks.push(newTrackElement);

  // Update total tracks count
  const trackCount = tracksContainer.querySelectorAll('.listmusic').length;
  const trackCountElement = document.querySelector('.track-count');
  if (trackCountElement) {
    trackCountElement.textContent = `${trackCount} songs`;
  }

  // Attach event listeners ke element baru
  attachTrackEventListeners(newTrackElement);
}

function attachTrackEventListeners(trackElement) {
  // Attach event listeners untuk track baru
  trackElement.addEventListener('click', function() {
    trackClicked(this);
  });

  const heartIcon = trackElement.querySelector('.fav_playlist');
  if (heartIcon) {
    heartIcon.addEventListener('click', function(e) {
      e.stopPropagation();
      e.preventDefault();
      trackHeart(this);
    });
  }

  const ellipsisIcon = trackElement.querySelector('.track-menu');
  if (ellipsisIcon) {
    ellipsisIcon.addEventListener('click', function(e) {
      e.stopPropagation();
      handleEllipsisClick(this);
    });
  }

  const artistLinks = trackElement.querySelectorAll('.clickable-artist');
  artistLinks.forEach(link => {
    link.addEventListener('click', function(e) {
      e.stopPropagation();
      const artistId = this.getAttribute('onclick').match(/'([^']+)'/)[1];
      handleArtistClick(artistId);
    });
  });
}


function refreshCustomPlaylistCoversOnly() {
  const slides = document.querySelectorAll(".musicGroups .swiper-slide.group");
  if (!slides.length) return;

  const id_music = localStorage.getItem("lastMusicId") || 0;

  $.ajax({
    url: "/popup_get_playlists",
    type: "POST",
    data: { id_user: userId, id_music: id_music },
    dataType: "json",
    success: function (response) {
      if (!Array.isArray(response)) return;

      response.forEach((item) => {
        const slide = [...slides].find(s => s.dataset.id === item.id_cus?.toString());
        if (!slide) return;

        const figure = slide.querySelector("figure");
        const icon = slide.querySelector("i");

        // Perbarui icon status (added / not)
        if (icon) {
          if (item.exists) {
            icon.className = "fa-solid fa-circle-check";
            icon.style.color = "#4caf50";
          } else {
            icon.className = "fa-regular fa-circle-check";
            icon.style.color = "#b0b0b0";
          }
        }

        // Perbarui cover collage atau cover tunggal
        let html = "";
        if (item.track_covers && item.track_covers.length > 1) {
          const covers = item.track_covers.slice(0, 4);
          const rows = item.track_covers.length > 2 ? "repeat(2,1fr)" : "1fr";
          const cols = "repeat(2,1fr)";
          const collageItems = covers.map((c, i) => {
            const span2 = covers.length === 3 && i === 2 ? "grid-column: span 2;" : "";
            return `<div class="topcollage-item" style="background-image:url('${c}'); ${span2}"></div>`;
          }).join("");
          html = `
            <div class="topplaylist-icon">
              <div class="topcollage-grid" style="display:grid; grid-template-columns:${cols}; grid-template-rows:${rows}; width:100%; height:100%; border-radius:4px; overflow:hidden;">
                ${collageItems}
              </div>
            </div>
          `;
        } else {
          const cover = (item.track_covers && item.track_covers[0]) || item.playlist_cover || '/uploads/undefine.jpg';
          html = `<img src="${cover}" alt="cover" class="playlist-icon" style="width:100%; height:100%; object-fit:cover; border-radius:4px;">`;
        }

        if (figure) {
          figure.innerHTML = html;
        }
      });
    },
    error: function () {
      console.error("Gagal memperbarui cover custom playlist.");
    }
  });
}

function loadPlaylistTracks(hashid) {
  const playlistContainer = document.querySelector(".page_playlist");
  if (!playlistContainer) return;

  // Simpan track yang sedang diputar sebelum memperbarui
  const currentPlayingTrack = currentPlayingId ? 
    playlistTracks.find(track => track.dataset.src === currentPlayingId) : null;

  fetch(`/custom/${hashid}/tracks`)
    .then(res => res.json())
    .then(data => {
      // Update tracks table
      const tbody = playlistContainer.querySelector('tbody');
      if (tbody) {
        tbody.innerHTML = data.tracksHTML;
        
        // PERBAIKAN: Re-attach event listeners ke semua track
        setTimeout(() => {
          const allTracks = tbody.querySelectorAll('.listmusic');
          allTracks.forEach(track => {
            attachTrackEventListeners(track);
          });
        }, 100);
      }
      
      // Update playlist info
      const playlistInfo = playlistContainer.querySelector('.playlist-info');
      if (playlistInfo) {
        playlistInfo.innerHTML = data.playlistInfoHTML;
      }

      // Update play button
      const playButtonContainer = playlistContainer.querySelector('.play-button-container');
      if (playButtonContainer) {
        playButtonContainer.innerHTML = data.totalTracks > 0 ? data.playButtonHTML : '';
      }

      // Perbarui playlistTracks hanya jika track yang sedang diputar berasal dari playlist ini
      if (!currentPlayingTrack || currentPlayingTrack.dataset.playlist === hashid) {
        playlistTracks = Array.from(
          document.querySelectorAll(`.listmusic[data-playlist="${hashid}"]`)
        );
        
        // Perbarui currentTrackIndex jika track masih ada dalam playlist
        if (currentPlayingId) {
          currentTrackIndex = playlistTracks.findIndex(
            (el) => el.dataset.src === currentPlayingId
          );
        }
      }
    })
    .catch(err => console.error("Failed to reload playlist:", err));
}




let mySwiper;
let openScreen = false;
const alertInfo = document.getElementById('popupInfo');

function playerScreen() {
  var isMobile = isTrueMobile();
  const isSmallScreen = window.innerWidth < 975;

  if (isMobile && isSmallScreen) {
    expandPlayer();
  }
}

function expandPlayer() {
  $(".show-player-btn").hide();

  $(".wrapper").show().css({
    animation: "slideUpSmooth 0.5s ease-out",
  });

  // Inisialisasi Swiper
  mySwiper = new Swiper(".swiper-container.slider-one", {
    direction: "horizontal",
    loop: true,
    centeredSlides: true,
    slidesPerView: 1,
    spaceBetween: 20,
    speed: 600,
    allowTouchMove: false,
    effect: "coverflow",
    coverflowEffect: {
      rotate: 40,
      slideShadows: false,
    },
  });
  if (!history.state || history.state.page !== "playerScreen") {
    history.pushState({ page: "playerScreen" }, "", "");
  }
  openScreen = true;


  alertInfo.style.bottom = '175px';


}

function slideDownPlayer() {
  const wrapper = $(".wrapper");
  wrapper.css({
    animation: "slideDownSmooth 0.6s ease-out forwards",
  });

  // Tunggu sampai animasi selesai sebelum .hide()
  setTimeout(() => {
    wrapper.hide();
    $(".show-player-btn").show();
  }, 600); // Sama seperti durasi animasi
  history.back();

  alertInfo.style.bottom = '';
}

function changeBg() {
  albumBg.classList.add("animeBg");
  setTimeout(() => {
    albumBg.classList.remove("animeBg");
  }, 700);
}

function slideDown() {
  const wrapper = $(".wrapper");
  wrapper.css({
    animation: "slideDownSmooth 0.6s ease-out forwards",
  });

  // Tunggu sampai animasi selesai sebelum .hide()
  setTimeout(() => {
    wrapper.hide();
    $(".show-player-btn").show();
  }, 600); // Sama seperti durasi animasi

  alertInfo.style.bottom = '';
}




document.addEventListener('DOMContentLoaded', () => {
  const playlistname = document.getElementById('playlistName');
  const errorElement = document.getElementById('errormess');

  playlistname.addEventListener('input', () => {
    // Hapus error secara real-time saat user mulai mengetik
    if (playlistname.classList.contains('invalid')) {
      playlistname.classList.remove('invalid');
      errorElement.textContent = '';
    }
  });

});


function customval() {
  const playlistname = document.getElementById('playlistName');
  const errorElement = document.getElementById('errormess');

  playlistname.classList.remove('invalid');
  errorElement.textContent = '';

  // Validasi input kosong
  if (playlistname.value.trim() === '') {
      playlistname.classList.add('invalid');
      errorElement.textContent = 'Playlist name cannot be empty!';
      return false;
  }

  // Validasi untuk karakter XSS
  const xssPattern = /<script|<\/script|javascript:|onerror=|onload=|eval\(|alert\(/i;
  if (xssPattern.test(playlistname.value)) {
      playlistname.classList.add('invalid');
      errorElement.textContent = 'Invalid characters detected!';
      return false;
  }

  return true;
}



function profileval() {
  const nameInput = document.getElementById('userName');
  const errorElement = document.getElementById('errorusernm');
  let isValid = true;
  
  // Validasi nama
  const nameValue = nameInput.value.trim();
  
  if (!nameValue) {
    errorElement.textContent = 'Username is required';
    nameInput.classList.add('invalid');
    isValid = false;
  } else if (nameValue.length > 50) {
    errorElement.textContent = 'Username must be less than 50 characters';
    nameInput.classList.add('invalid');
    isValid = false;
  } else {
    errorElement.textContent = '';
    nameInput.classList.remove('invalid');
  }
  
  return isValid;
}



function handleEdit(id_playlist) {
  if (!userId) {
    showLogin();
    return;
  }

  const popup = document.querySelector('.customPlaylist');
  const popupContent = popup.querySelector('.popup-content');
  const playlistNameInput = document.getElementById('playlistName');
  const playlistDescriptionInput = document.getElementById('playlistDescription');
  const playlistCoverPreview = document.getElementById('playlistCoverPreview');
  const errorElement = document.getElementById('errormess');
  const nameCounter = document.getElementById('nameCounter');
  const descCounter = document.getElementById('descCounter');

  // Reset error
  playlistNameInput.classList.remove('invalid');
  errorElement.textContent = '';

  // Fetch playlist by ID
  fetch(`/custom-playlist/${id_playlist}`)
    .then(res => res.json())
    .then(data => {
      if (data.success) {
        const playlist = data.playlist;

        // Set value ke input
        playlistNameInput.value = playlist.playlist_name || '';
        playlistDescriptionInput.value = playlist.description || '';
        playlistCoverPreview.src = playlist.playlist_cover || '/uploads/undefine.jpg';
        nameCounter.textContent = playlistNameInput.value.length;
        descCounter.textContent = playlistDescriptionInput.value.length;

        // Simpan ID playlist yang sedang diedit
        playlistNameInput.dataset.editingId = id_playlist;

        // Tampilkan popup (mirip showCustom)
        var isMobile = isTrueMobile();
        if (isMobile) {
          popup.style.display = 'block';
          setTimeout(() => {
            popup.classList.add('active');
            if (popupContent) popupContent.style.transform = 'translateY(0)';
          }, 10);
          setupMobileGestureControl('.customPlaylist');
        } else {
          $(".customPlaylist").show().addClass("active");
          $(".customPlaylist .popup-overlay").removeClass("fadeOut").addClass("fadeIn");
        }
      } else {
        console.error("Playlist tidak ditemukan");
      }
    })
    .catch(err => {
      console.error("Gagal mengambil data playlist:", err);
    });
}
