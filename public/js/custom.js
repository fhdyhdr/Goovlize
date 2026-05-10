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
async function submitCustomPlaylist(event) {
  event.preventDefault();
  if (!customval()) return false;

  const form = document.getElementById("playlistForm");
  const isEditMode = form.dataset.editMode === "true";
  const playlistId = form.dataset.playlistId; // Ini adalah id_cus (C1, C2, dst)
  const hashid = form.dataset.hashid;
  const name = document.getElementById("playlistName").value.trim();
  const description = document
    .getElementById("playlistDescription")
    .value.trim();

  try {
    // Untuk edit mode, gunakan id_cus (C1, C2, dst) di endpoint
    const endpoint = isEditMode
      ? `/custom/updatePlaylist/${playlistId}`
      : "/custom/newPlaylist";
    const method = isEditMode ? "PUT" : "POST";

    const response = await fetch(endpoint, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, description }),
    });

    // Penanganan response untuk edit mode
    if (isEditMode) {
      if (!response.ok) {
        const msg = await response.text();
        showInfo("Gagal mengupdate playlist: " + msg);
        return false;
      }
      
      const result = await response.json();
      if (!result.success) throw new Error(result.message);
      
      closePopup();
      
      const pd = result.playlistData;
      const playlistData = {
        id_cus: pd.id_cus, // Ini akan berisi C1, C2, dst
        id_auto: pd.id_auto,
        hashid: pd.hashid,
        playlist_name: pd.playlist_name,
        playlist_cover: pd.playlist_cover,
        created_at: pd.created_at,
        track_covers: pd.track_covers || [],
        track_count: pd.track_count || 0,
        type: "custom",
        contentType: "custom-playlist",
      };

      loadSidebarCustom(playlistData);
      updateCustomPlaylistInLibrary(playlistData);
      
      // Check if topContent is expanded and reload playlists
      const topContent = document.querySelector(".topContent");
      if (topContent && topContent.classList.contains("expand")) {
        // Reload playlists
        $.ajax({
          url: "/popup_get_playlists",
          type: "POST",
          data: {
            id_user: userId,
            id_music: localStorage.getItem("lastMusicId") || 0,
          },
          dataType: "json",
          success: function (response) {
            if (!Array.isArray(response) || response.length === 0) {
              showCustom();
            } else {
              showUserPlaylists();
            }
          },
          error: function () {
            console.error("Gagal mengambil custom playlist user.");
          },
        });
      }
      
      showCustomPlaylist(pd.hashid, true, true);
      setTimeout(() => showInfo("Playlist updated successfully"), 1000);
    } 
    // Penanganan response untuk create mode
    else {
      if (!response.ok) {
        const msg = await response.text();
        showInfo("Gagal membuat playlist: " + msg);
        return false;
      }
      
      const result = await response.json();
      if (!result.success) throw new Error(result.message);
      
      closePopup();
      
      const pd = result.playlistData;
      const playlistData = {
        id_cus: pd.id_cus, // Ini akan berisi C1, C2, dst
        id_auto: pd.id_auto,
        hashid: pd.hashid,
        playlist_name: pd.playlist_name,
        playlist_cover: pd.playlist_cover,
        created_at: pd.created_at,
        track_covers: [],
        track_count: 0,
        type: "custom",
        contentType: "custom-playlist",
      };

      loadSidebarCustom(playlistData);
      updateCustomPlaylistInLibrary(playlistData);
      
      // Check if topContent is expanded and reload playlists
      const topContent = document.querySelector(".topContent");
      if (topContent && topContent.classList.contains("expand")) {
        // Reload playlists
        $.ajax({
          url: "/popup_get_playlists",
          type: "POST",
          data: {
            id_user: userId,
            id_music: localStorage.getItem("lastMusicId") || 0,
          },
          dataType: "json",
          success: function (response) {
            if (!Array.isArray(response) || response.length === 0) {
              showCustom();
            } else {
              showUserPlaylists();
            }
          },
          error: function () {
            console.error("Gagal mengambil custom playlist user.");
          },
        });
      } else {
        if (!openScreen) {
          // Expand the top content and load playlists
          const topContent = document.querySelector(".topContent");
          if (topContent) {
            topContent.classList.add("expand");
            showUserPlaylists();
            albumSize(); // Update UI sizing
          }
        }
      }

      if (!openScreen) {
        showCustomPlaylist(pd.hashid);
      }

      setTimeout(() => showInfo("Playlist created successfully"), 1000);
    }

    loadLibraryPart2();
  } catch (err) {
    console.error(err);
    showInfo("Error: " + err.message);
  }
  return false;
}

function loadSidebarCustom(pl) {
  const id = pl.id_cus;
  const sel = `.library-item[data-id="${id}"]`;
  const cont = document.querySelectorAll(".navbar-section")[1];
  if (!cont) return;

  const exist = cont.querySelector(sel);
  
  if (exist) {
    // PERBAIKAN: Update existing element instead of removing and adding to top
    updateExistingLibraryItem(exist, pl);
  } else {
    // Jika tidak ada, buat baru dan tambahkan di atas
    const btn = createLibraryButton(pl);
    cont.insertBefore(btn, cont.firstChild);
  }
}

function updateExistingLibraryItem(existingElement, pl) {
  // Update data attributes
  existingElement.dataset.trackCount = pl.track_count || 0;
  existingElement.dataset.trackCovers = JSON.stringify(pl.track_covers || []);
  
  // Update cover
  const contentDiv = existingElement.querySelector('.navbar-item-content');
  if (contentDiv) {
    if (pl.track_count > 1 && pl.track_covers && pl.track_covers.length > 1) {
      // Collage style
      const dc = pl.track_covers
        .slice(0, 4)
        .map((c, i) => {
          const style = pl.track_covers.length === 3 && i === 2 ? "grid-column: span 2;" : "";
          return `<div class="collage-item" style="background-image:url('${c}'); ${style}"></div>`;
        })
        .join("");
      const rows = pl.track_covers.length > 2 ? "repeat(2,1fr)" : "1fr";
      contentDiv.outerHTML = `
        <div class="navbar-item-content collage-cover">
          <div class="collage-grid" style="grid-template-columns:repeat(2,1fr); grid-template-rows:${rows};">
            ${dc}
          </div>
        </div>`;
    } else {
      // Single cover
      const img = pl.track_covers?.[0] || pl.playlist_cover || "/images/default-playlist.png";
      contentDiv.outerHTML = `<div class="navbar-item-content rounded-square" style="background-image:url('${img}')"></div>`;
    }
  }
  
  // Update text
  const textSpan = existingElement.querySelector('.navbar-item-text');
  if (textSpan) {
    textSpan.textContent = pl.playlist_name;
  }
  
  // Update tooltip
  const tooltip = existingElement.querySelector('.tooltip p');
  if (tooltip) {
    tooltip.textContent = pl.playlist_name;
  }
}

function createLibraryButton(pl) {
  const btn = document.createElement("button");
  btn.className = `navbar-item ${pl.type} library-item`;
  btn.dataset.id = pl.id_cus;
  btn.dataset.type = pl.contentType;
  btn.dataset.trackCount = pl.track_count || 0;
  btn.dataset.trackCovers = JSON.stringify(pl.track_covers || []);
  btn.onclick = () => showCustomPlaylist(pl.hashid);

  let coverHTML;
  if (pl.track_count > 1 && pl.track_covers && pl.track_covers.length > 1) {
    const dc = pl.track_covers
      .slice(0, 4)
      .map((c, i) => {
        const style = pl.track_covers.length === 3 && i === 2 ? "grid-column: span 2;" : "";
        return `<div class="collage-item" style="background-image:url('${c}'); ${style}"></div>`;
      })
      .join("");
    const rows = pl.track_covers.length > 2 ? "repeat(2,1fr)" : "1fr";
    coverHTML = `
      <div class="navbar-item-content collage-cover">
        <div class="collage-grid" style="grid-template-columns:repeat(2,1fr); grid-template-rows:${rows};">
          ${dc}
        </div>
      </div>`;
  } else {
    const img = pl.track_covers?.[0] || pl.playlist_cover || "/images/default-playlist.png";
    coverHTML = `<div class="navbar-item-content rounded-square" style="background-image:url('${img}')"></div>`;
  }

  btn.innerHTML = `
    ${coverHTML}
    <span class="navbar-item-text">${pl.playlist_name}</span>
    <div class="tooltip right">
      <p>${pl.playlist_name}</p>
      <small>Added: ${new Date(pl.created_at).toLocaleDateString()}</small>
    </div>`;

  return btn;
}

function updateCustomPlaylistInLibrary(pl) {
  const container = document.getElementById("direct-messages-items");
  if (!container) return;

  const sel = `.direct-messages-item[data-id="${pl.id_cus}"]`;
  const exist = container.querySelector(sel);
  
  if (exist) {
    // PERBAIKAN: Update existing element instead of removing and adding to top
    updateExistingDirectMessageItem(exist, pl);
  } else {
    // Jika tidak ada, buat baru dan tambahkan di atas
    const div = createDirectMessageItem(pl);
    container.insertBefore(div, container.firstChild);
  }

  // Update filter visibility
  const currentFilter = localStorage.getItem("libraryFilterState") || "all";
  const items = container.querySelectorAll('.direct-messages-item');
  items.forEach(item => {
    const itemType = item.dataset.type;
    const shouldShow = 
      currentFilter === "all" || 
      (currentFilter === "music" && (itemType === 'playlist' || itemType === 'fav_playlist')) ||
      (currentFilter === "artist" && itemType === 'artist') ||
      (currentFilter === "album" && itemType === 'album');
    item.style.display = shouldShow ? "flex" : "none";
  });
}

function updateExistingDirectMessageItem(existingElement, pl) {
  // Update data attributes
  existingElement.dataset.trackCount = pl.track_count || 0;
  existingElement.dataset.trackCovers = JSON.stringify(pl.track_covers || []);
  
  // Update icon
  const iconDiv = existingElement.querySelector('.user-icon');
  if (iconDiv) {
    if (pl.track_count > 1 && pl.track_covers && pl.track_covers.length > 1) {
      // Collage style
      const dc = pl.track_covers
        .slice(0, 4)
        .map((c, i) => {
          const style = pl.track_covers.length === 3 && i === 2 ? "grid-column: span 2;" : "";
          return `<div class="collage-item" style="background-image:url('${c}'); ${style}"></div>`;
        })
        .join("");
      const rows = pl.track_covers.length > 2 ? "repeat(2,1fr)" : "1fr";
      iconDiv.outerHTML = `
        <div class="user-icon collage-cover rounded-square">
          <div class="collage-grid" style="grid-template-columns:repeat(2,1fr); grid-template-rows:${rows};">
            ${dc}
          </div>
        </div>`;
    } else {
      // Single cover
      const img = pl.track_covers?.[0] || pl.playlist_cover || "/images/default-playlist.png";
      iconDiv.outerHTML = `<div class="user-icon rounded-square" style="background-image:url('${img}')"></div>`;
    }
  }
  
  // Update text
  const username = existingElement.querySelector('.direct-messages-item-username');
  if (username) {
    username.textContent = pl.playlist_name;
  }
}

function createDirectMessageItem(pl) {
  const div = document.createElement("div");
  div.className = "direct-messages-item content-navigator-button";
  div.dataset.id = pl.id_cus;
  div.dataset.type = "playlist";
  div.dataset.filterType = "music";
  div.dataset.trackCount = pl.track_count || 0;
  div.dataset.trackCovers = JSON.stringify(pl.track_covers || []);
  div.onclick = () => showCustomPlaylist(pl.hashid);

  let iconHTML;
  if (pl.track_count > 1 && pl.track_covers && pl.track_covers.length > 1) {
    const dc = pl.track_covers
      .slice(0, 4)
      .map((c, i) => {
        const style = pl.track_covers.length === 3 && i === 2 ? "grid-column: span 2;" : "";
        return `<div class="collage-item" style="background-image:url('${c}'); ${style}"></div>`;
      })
      .join("");
    const rows = pl.track_covers.length > 2 ? "repeat(2,1fr)" : "1fr";
    iconHTML = `
      <div class="user-icon collage-cover rounded-square">
        <div class="collage-grid" style="grid-template-columns:repeat(2,1fr); grid-template-rows:${rows};">
          ${dc}
        </div>
      </div>`;
  } else {
    const img = pl.track_covers?.[0] || pl.playlist_cover || "/images/default-playlist.png";
    iconHTML = `<div class="user-icon rounded-square" style="background-image:url('${img}')"></div>`;
  }

  div.innerHTML = `
    ${iconHTML}
    <div class="direct-messages-item-user-info">
      <p class="direct-messages-item-username">${pl.playlist_name}</p>
      <p class="direct-messages-item-user-activity">Playlist</p>
    </div>`;

  return div;
}



function loadLibraryPart2(previousState = null) {
  // Jika ada previousState, gunakan itu untuk mempertahankan view
  const restoreState = previousState || {
    isGroupedView: libraryState.isGroupedView,
    isListView: libraryState.isListView,
    currentTab: libraryState.currentTab,
  };

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

      // Restore previous view state
      libraryState.isGroupedView = restoreState.isGroupedView;
      libraryState.isListView = restoreState.isListView;
      libraryState.currentTab = restoreState.currentTab;

      // Update UI berdasarkan state yang di-restore
      updateGroupView();
      updateViewMode();
      updateViewToggleButton();
      updateGroupToggleButton();

      // Jika sedang mode recent, render ulang recent view
      if (!libraryState.isGroupedView && libraryState.currentTab === "all") {
        renderRecentView();
      }
    })
    .catch((err) => console.error("Failed to refresh library:", err));
}

async function deletePlaylist(playlistId) {
  try {
    const response = await fetch(`/custom/deletePlaylist/${playlistId}`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
    });

    if (!response.ok) {
      throw new Error(await response.text());
    }

    const result = await response.json();

    if (result.success) {
      // Remove playlist from sidebar
      const playlistElement = document.querySelector(
        `.library-item[data-id="${playlistId}"]`
      );
      if (playlistElement) {
        playlistElement.remove();
      }

      closePopup();
      history.back();
    } else {
      throw new Error(result.message || "Failed to delete playlist");
    }
  } catch (err) {
    console.error("Error deleting playlist:", err);
    closePopup();
  }
}

function listCustom(button) {
  const playlistId = button.getAttribute("data-id");
  const hashid = button.getAttribute("data-hashid");

  var isMobile = isTrueMobile();
  if (isMobile) {
    cusEditMobile(playlistId, hashid);
  } else {
    toggleCustomDropdown(button);
  }
}

function toggleCustomDropdown(el) {
  document.querySelectorAll('.dropdown-content').forEach(dd => {
    dd.classList.remove('show');
  });

  // Cari dropdown di dalam elemen yang diklik
  const dropdown = el.querySelector('.dropdown-content');
  if (dropdown) {
    dropdown.classList.toggle('show');
  }
}
window.addEventListener('click', function (e) {
  if (!e.target.closest('.stat-item')) {
    document.querySelectorAll('.dropdown-content').forEach(dd => {
      dd.classList.remove('show');
    });
  }
});
function handleDelete(playlistId, hashid) {
  const cusEditPopup = document.querySelector(".cusEdit");
  if (cusEditPopup && cusEditPopup.style.display !== "none") {
    cusEditPopup.classList.remove("active");
    cusEditPopup.querySelector(".popup-overlay").classList.remove("fadeIn");
    cusEditPopup.querySelector(".popup-overlay").classList.add("fadeOut");

    setTimeout(() => {
      cusEditPopup.style.display = "none";
    }, 300);
  }

  const popup = document.querySelector(".confirmDeletePlaylist");
  const popupContent = popup.querySelector(".popup-content");
  var isMobile = isTrueMobile();

  // Simpan state view sebelum menghapus
  const previousViewState = {
    isGroupedView: libraryState.isGroupedView,
    isListView: libraryState.isListView,
    currentTab: libraryState.currentTab,
  };

  // Set up confirmation button
  const confirmBtn = document.getElementById("confirmDeleteBtn");
  confirmBtn.onclick = async () => {
    try {
      const response = await fetch(`/custom/deletePlaylist/${playlistId}`, {
        method: "DELETE",
      });

      if (!response.ok) throw new Error(await response.text());

      const result = await response.json();
      if (result.success) {
        // Remove from sidebar
        removeFromLibrarySidebar(playlistId);

        // Load library dengan mempertahankan state sebelumnya
        loadLibraryPart2(previousViewState);

        document
          .querySelector(`.library-item[data-id="${playlistId}"]`)
          ?.remove();

        // Check if we're currently viewing the deleted playlist
        const playlistPage = document.querySelector(".page_playlist");
        const currentPlaylistId = playlistPage?.getAttribute(
          "data-current-playlist"
        );

        if (currentPlaylistId === `custom:${hashid}`) {
          history.back();
        }

        // Check if topContent is expanded
        const topContent = document.querySelector(".topContent");
        if (topContent && topContent.classList.contains("expand")) {
          // Reload playlists
          $.ajax({
            url: "/popup_get_playlists",
            type: "POST",
            data: {
              id_user: userId,
              id_music: localStorage.getItem("lastMusicId") || 0,
            },
            dataType: "json",
            success: function (response) {
              if (!Array.isArray(response) || response.length === 0) {
                // If no playlists left, collapse the top content and show custom view
                topContent.classList.remove("expand");
                albumSize(); // Update UI sizing
              } else {
                // Otherwise just reload the playlists
                showUserPlaylists();
              }
            },
            error: function () {
              console.error("Gagal mengambil custom playlist user.");
              topContent.classList.remove("expand");
              showCustom();
            },
          });
        }

        setTimeout(() => {
          showInfo("Playlist deleted successfully");
        }, 150);
      } else {
        throw new Error(result.message);
      }
    } catch (err) {
      showInfo("Delete failed");
    } finally {
      closePopup();
    }
  };

  // Show popup
  if (isMobile) {
    popup.style.display = "block";
    setTimeout(() => {
      popup.classList.add("active");
      popupContent.style.transform = "translateY(0)";
    }, 10);
    setupMobileGestureControl(".confirmDeletePlaylist");
  } else {
    $(".confirmDeletePlaylist").show().addClass("active");
    $(".confirmDeletePlaylist .popup-overlay")
      .removeClass("fadeOut")
      .addClass("fadeIn");
  }
}

function updateMusicExistenceStatus(idMusic = null) {
  const id_music = idMusic || localStorage.getItem("lastMusicId");
  if (!id_music) return;

  $.ajax({
    url: "/check_music_in_playlists",
    type: "POST",
    data: { id_music },
    dataType: "json",
    success: function (response) {
      if (!Array.isArray(response)) return;

      response.forEach((item) => {
        const group = document.querySelector(
          `.musicGroups .group[data-id="${item.id_cus}"]`
        );
        if (!group) return;

        const icon = group.querySelector("i");

        if (icon) {
          if (item.exists) {
            icon.className = "fa-solid fa-circle-check";
            icon.style.color = "#4caf50";
          } else {
            icon.className = "fa-regular fa-circle-check";
            icon.style.color = "#b0b0b0";
          }
        }
      });
    },
    error: function () {
      console.error("Gagal cek status lagu pada playlist.");
    },
  });
}
