var audioPlayer = new Audio();
var currentPlayingItem = null;
let currentPlaylistId = null;

// Load playback state from localStorage
var currentPlayingId = localStorage.getItem("lastPlayedId") || null;
var currentPlayingPlaylist = localStorage.getItem("lastPlayedPlaylist") || null;
var storedProgress = localStorage.getItem("progress_" + currentPlayingId) || 0;

// Initialize audio player with saved state
if (currentPlayingId) {
  audioPlayer.src = currentPlayingId;
  audioPlayer.currentTime = parseFloat(storedProgress);
}

var playlistTracks = []; // semua track dari playlist
var currentTrackIndex =
  parseInt(localStorage.getItem("currentTrackIndex")) || -1;

var isRepeatMode =
  localStorage.getItem("repeatModeStatus_" + userId) === "true";
var isRandom = localStorage.getItem("randomModeStatus_" + userId) === "true";
var randomPlayHistory = {}; // Stores playback history per playlist
var remainingTracks = {}; // Stores tracks not yet played in current cycle
var playedTracksCycle = {}; // Tracks played in current cycle (to prevent duplicates)

var randomPlayOrders = {}; // Stores the complete random order for each playlist
var currentRandomIndices = {}; // Stores current position in random order
var lastPlayedInRandom = {}; // Stores last played track per playlist in random mode
window.addEventListener("DOMContentLoaded", () => {
  const savedMusic = localStorage.getItem("currentlyPlaying_");
  const activeContent = document.getElementById("active-content");
  const contentArea = document.getElementById("content-area");

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
  if (savedMusic) {
    $(".music-player").show();
    const data = JSON.parse(savedMusic);

    const coverEls = document.querySelectorAll(".current-cover");
    const titleEls = document.querySelectorAll(".title");
    const headerTitleEls = document.querySelectorAll(".appName");
    const artistEls = document.querySelectorAll(".artistNames");

    coverEls.forEach((el) => (el.src = data.cover));
    titleEls.forEach((el) => (el.textContent = data.title));
    headerTitleEls.forEach((el) => (el.textContent = data.playlist_name));

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

          // PERBAIKAN: Tampilkan hashid artist
          if (artistHashid) {
            slideDownPlayer();
            viewArtist(`${artistHashid}`);
          } 
        });

        container.appendChild(span);

        if (index < artists.length - 1) {
          container.appendChild(document.createTextNode(", "));
        }
      });
    });
    
    checkFavoriteStatus();
    loadNextPrev();

    coverEls.forEach((img) => {
      img.onload = extractColor;
    });
    activeContent.classList.add("player-visible");
    contentArea.classList.add("player-visible");
  } else {
    activeContent.classList.remove("player-visible");
    contentArea.classList.remove("player-visible");
  }

  // Update UI based on repeat mode
  const repeatBtns = document.querySelectorAll(
    "#repeatBtn i, #repeatBtnDesk i"
  );
  repeatBtns.forEach((btn) => {
    btn.style.color = isRepeatMode ? "red" : "";
  });

  // Update UI based on shuffle mode
  let shuffleIcons = document.querySelectorAll(
    "#randomBtn i, #randomBtnDesk i"
  );
  shuffleIcons.forEach((icon) => {
    icon.style.color = isRandom ? "red" : "";
  });

  // Load playlist tracks if available
  const lastPlayedPlaylist = localStorage.getItem("lastPlayedPlaylist");
  if (lastPlayedPlaylist) {
    loadPlaylistTracks(lastPlayedPlaylist);
  }

  // Restore play/pause state
  if (currentPlayingId && audioPlayer.currentTime > 0 && !audioPlayer.paused) {
    audioPlayer.play().catch((e) => console.error("Autoplay prevented:", e));
    document.querySelectorAll(".svg-icon.control-play").forEach((icon) => {
      icon.innerHTML = pauseIcon;
    });
  }
});

// Konfigurasi ukuran normalisasi
const NORMALIZED_SIZE = 20; // Ukuran tetap untuk semua gambar
const colorThief = new ColorThief();

// Fungsi untuk resize gambar ke ukuran tetap menggunakan canvas
function normalizeImageToCanvas(img) {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  
  // Set ukuran canvas tetap
  canvas.width = NORMALIZED_SIZE;
  canvas.height = NORMALIZED_SIZE;
  
  // Gambar ulang image ke canvas dengan ukuran tetap
  ctx.drawImage(img, 0, 0, NORMALIZED_SIZE, NORMALIZED_SIZE);
  
  return canvas;
}

// Fungsi utama untuk ekstrak warna
function extractColor() {
  const images = document.querySelectorAll(".current-cover");
  
  images.forEach((img) => {
    const isVisible = img.offsetParent !== null;
    const isValidSrc = img.complete && img.src && !img.src.includes("undefine.jpg");
    
    if (isVisible && isValidSrc) {
      try {
        // Normalisasi gambar ke ukuran tetap
        const normalizedCanvas = normalizeImageToCanvas(img);
        
        // Ekstrak warna dari gambar yang sudah dinormalisasi
        const [r, g, b] = colorThief.getColor(normalizedCanvas);
        const hexColor = rgbToHex(r, g, b);
        
        // Terapkan ke :root dan .music-player
        document.documentElement.style.setProperty("--color-7", hexColor);
        document.querySelectorAll(".music-player").forEach((el) => {
          el.style.backgroundColor = hexColor;
        });
        
        // Tambahan untuk .content-navigator-music-player
        const musicNav = document.getElementById("content-navigator-music-player");
        if (musicNav) {
          musicNav.style.backgroundColor = hexColor;
        }
        
        console.log('Color extracted from normalized image:', hexColor);
      } catch (error) {
        console.error("Error extracting color:", error);
      }
    }
  });
}

function extractColorUniversal(imgElement, cssVariableName) {
  if (!imgElement.complete || !imgElement.src) {
    console.log('Image not ready:', imgElement);
    return;
  }
  
  try {
    // Normalisasi gambar ke ukuran tetap
    const normalizedCanvas = normalizeImageToCanvas(imgElement);
    
    // Ekstrak warna dari gambar yang sudah dinormalisasi
    const dominantColor = colorThief.getColor(normalizedCanvas);
    const hexColor = rgbToHex(dominantColor[0], dominantColor[1], dominantColor[2]);
    
    // Set CSS variable
    document.documentElement.style.setProperty(cssVariableName, hexColor);
    
    console.log(`Color ${cssVariableName} extracted:`, hexColor);
  } catch (error) {
    console.error(`Error extracting ${cssVariableName}:`, error);
  }
}

// Fungsi khusus untuk tipe gambar yang berbeda (menggunakan fungsi universal)
function extractColorPlaylist(imgPlaylist) {
  extractColorUniversal(imgPlaylist, '--color-playlist');
}

function extractColorArtist(imgArtist) {
  extractColorUniversal(imgArtist, '--color-artist');
}

function extractColorAlbum(imgAlbum) {
  extractColorUniversal(imgAlbum, '--color-album');
}

function extractColorFav(imgFav) {
  extractColorUniversal(imgFav, '--color-fav');
}

function extractColorMusic(imgMusic) {
  extractColorUniversal(imgMusic, '--color-music');
}

function extractColorProfile(imgProfile) {
  extractColorUniversal(imgProfile, '--color-profile');
}

function extractColorTopTrack(imgtoptrack) {
  extractColorUniversal(imgtoptrack, '--color-toptrack');
}

function extractColorMostPlayed(imgmost) {
  extractColorUniversal(imgmost, '--color-mostplayed');
}




function rgbToHex(r, g, b) {
  return "#" + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1);
}

const pauseIcon = `
  <svg class="svg-icon universal" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
    <defs/>
    <path fill-rule="evenodd" d="M6 21c-.5522847 0-1-.4477153-1-1V4c0-.55228475.4477153-1 1-1h3c.5522847 0 1 .44771525 1 1v16c0 .5522847-.4477153 1-1 1H6zm9-18c-.5522847 0-1 .44771525-1 1v16c0 .5522847.4477153 1 1 1h3c.5522847 0 1-.4477153 1-1V4c0-.55228475-.4477153-1-1-1h-3z"/>
  </svg>
`;

const playIcon = `
  <svg class="svg-icon universal" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
    <defs/>
    <path fill-rule="evenodd" d="M5 21V3c0-.79116579.87524596-1.26900738 1.54075759-.84117848L20.5407576 11.1588215c.6123232.3936364.6123232 1.2887206 0 1.682357l-14.00000001 9C5.87524596 22.2690074 5 21.7911658 5 21zm2-1.8316655L18.1507426 12 7 4.8316655v14.336669z"/>
  </svg>
`;

function updatePlayPauseUI() {
  document.querySelectorAll(".svg-icon.control-play").forEach((icon) => {
    icon.innerHTML = audioPlayer.paused ? playIcon : pauseIcon;
  });
}

function playPause() {
  if (!currentPlayingId) {
    // Try to restore last played track
    const lastPlayed = localStorage.getItem("currentlyPlaying_");
    if (lastPlayed) {
      const data = JSON.parse(lastPlayed);
      const trackElement = document.querySelector(`[data-src="${data.src}"]`);
      if (trackElement) {
        trackClicked(trackElement);
        return;
      }
    }
    return;
  }

  if (audioPlayer.paused) {
    audioPlayer
      .play()
      .then(() => {
        updatePlayPauseUI();
      })
      .catch((e) => {
        console.error("Playback failed:", e);
      });
  } else {
    localStorage.setItem(
      "progress_" + currentPlayingId,
      audioPlayer.currentTime
    );
    audioPlayer.pause();
    updatePlayPauseUI();
  }
}

function repeatMode() {
  isRepeatMode = !isRepeatMode;
  var repeatBtns = document.querySelectorAll("#repeatBtn i, #repeatBtnDesk i");

  repeatBtns.forEach((btn) => {
    btn.style.color = isRepeatMode ? "red" : "";
  });

  if (isRepeatMode) {
    showInfo("Repeat mode on");
  } else {
    showInfo("Repeat mode off");
  }

  localStorage.setItem("repeatModeStatus_" + userId, isRepeatMode);
}
function randomMode() {
  isRandom = !isRandom;
  let shuffleIcons = document.querySelectorAll(
    "#randomBtn i, #randomBtnDesk i"
  );
  shuffleIcons.forEach((icon) => {
    icon.style.color = isRandom ? "red" : "";
  });

  localStorage.setItem("randomModeStatus_" + userId, isRandom);

  if (isRandom && currentPlayingPlaylist) {
    // When enabling random mode, initialize for current playlist
    initializeRandomPlaylist(currentPlayingPlaylist);
    // Store current track to avoid repeating it
    lastPlayedInRandom[currentPlayingPlaylist] = currentPlayingId;
  }
}
function initializeRandomPlaylist(playlistId) {
  if (!randomPlayOrders[playlistId]) {
    // Create a new random order for this playlist
    const tracks = Array.from(playlistTracks);
    const trackSources = tracks.map((track) => track.dataset.src);

    // Filter out the currently playing track if exists
    const currentTrack = lastPlayedInRandom[playlistId] || currentPlayingId;
    const filteredSources = trackSources.filter((src) => src !== currentTrack);

    // Shuffle the remaining tracks
    const shuffledOrder = [...filteredSources];
    for (let i = shuffledOrder.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffledOrder[i], shuffledOrder[j]] = [
        shuffledOrder[j],
        shuffledOrder[i],
      ];
    }

    // If there was a current track, add it at a random position (not first)
    if (currentTrack && trackSources.includes(currentTrack)) {
      const insertPos = Math.floor(Math.random() * shuffledOrder.length) + 1;
      shuffledOrder.splice(insertPos, 0, currentTrack);
    }

    randomPlayOrders[playlistId] = shuffledOrder;
    currentRandomIndices[playlistId] = shuffledOrder.findIndex(
      (src) => src === currentTrack
    );

    // If current track not found in the order (shouldn't happen), start at beginning
    if (currentRandomIndices[playlistId] === -1) {
      currentRandomIndices[playlistId] = 0;
    }
  }
}

function getNextRandomTrack(playlistId) {
  initializeRandomPlaylist(playlistId);

  // Move to next track in random order
  currentRandomIndices[playlistId]++;

  // If we reached the end, loop back to start
  if (currentRandomIndices[playlistId] >= randomPlayOrders[playlistId].length) {
    currentRandomIndices[playlistId] = 0;
  }

  // Get the track source
  const nextTrackSrc =
    randomPlayOrders[playlistId][currentRandomIndices[playlistId]];
  lastPlayedInRandom[playlistId] = nextTrackSrc;

  // Find and return the track element
  return Array.from(playlistTracks).find(
    (track) => track.dataset.src === nextTrackSrc
  );
}

function getPrevRandomTrack(playlistId) {
  if (
    !randomPlayOrders[playlistId] ||
    currentRandomIndices[playlistId] === undefined
  ) {
    return currentPlayingItem;
  }

  // Move to previous track in random order
  currentRandomIndices[playlistId]--;

  // If we went before start, loop to end
  if (currentRandomIndices[playlistId] < 0) {
    currentRandomIndices[playlistId] = randomPlayOrders[playlistId].length - 1;
  }

  // Get the track source
  const prevTrackSrc =
    randomPlayOrders[playlistId][currentRandomIndices[playlistId]];
  lastPlayedInRandom[playlistId] = prevTrackSrc;

  // Find and return the track element
  return Array.from(playlistTracks).find(
    (track) => track.dataset.src === prevTrackSrc
  );
}

async function playNextMusic() {
  console.log('playNextMusic called:', {
    currentPlaylist: currentPlayingPlaylist,
    isSearch: currentPlayingPlaylist === "SE",
    genres: currentPlayingGenres,
    historyLength: playbackHistory.length,
    historyIndex: historyIndex
  });

  // PERBAIKAN: Cek apakah sedang memutar dari search (playlist "SE")
  if (currentPlayingPlaylist === "SE" && currentPlayingGenres.length > 0) {
    console.log('Playing next in SEARCH playlist');
    
    try {
      // PERBAIKAN: Selalu increment historyIndex untuk berpindah ke track berikutnya
      if (historyIndex < playbackHistory.length - 1) {
        // Masih ada track dalam history
        historyIndex++;
        console.log('Moving to next track in history, index:', historyIndex);
      } else {
        // Sudah di akhir history, cari track baru
        console.log('End of history reached, finding similar tracks...');
        
        const currentTrack = playbackHistory[historyIndex];
        const similarTracks = await findSimilarTracksByGenre(
          currentTrack.idMusic, 
          currentPlayingGenres
        );
        
        if (similarTracks.length > 0) {
          console.log('Found similar tracks:', similarTracks.length);
          
          // Tambahkan tracks baru ke history
          similarTracks.forEach((track) => {
            const exists = playbackHistory.some(t => t.idAudio === track.audio);
            if (!exists) {
              playbackHistory.push({
                idAudio: track.audio,
                idMusic: track.id,
                title: track.title,
                artist: track.artist,
                cover: track.image,
                genres: track.genre.split(", "),
                playlist: "SE",
              });
            }
          });
          
          // Pindah ke track pertama dari yang baru ditambahkan
          historyIndex++;
          console.log('Moving to newly added track, index:', historyIndex);
        } else {
          // PERBAIKAN: Jika tidak ada track baru, loop ke awal
          console.log('No new tracks found, looping to beginning');
          historyIndex = 0;
        }
      }
      
      // PERBAIKAN: Pastikan historyIndex valid
      historyIndex = Math.max(0, Math.min(historyIndex, playbackHistory.length - 1));
      
      console.log('Final historyIndex:', historyIndex, 'Total tracks:', playbackHistory.length);
      
      // Play track dari history
      if (playbackHistory.length > 0) {
        playFromHistory(historyIndex, "next");
      } else {
        console.log('No tracks in history to play');
      }
      
      // PERBAIKAN: Slide Swiper
      if (mySwiper) {
        mySwiper.slideNext();
      }
      
      savePlaybackState();
      
    } catch (error) {
      console.error("Error in playNextMusic for search:", error);
      // Fallback: loop ke awal jika ada error
      if (playbackHistory.length > 0) {
        historyIndex = (historyIndex + 1) % playbackHistory.length;
        playFromHistory(historyIndex, "next");
      }
    }
  } else {
    // Handle untuk playlist biasa (non-search)
    console.log('Playing next in regular playlist:', currentPlayingPlaylist);
    
    const lastPlayedPlaylist = localStorage.getItem("lastPlayedPlaylist");
    const lastPlayedPage = localStorage.getItem("lastPlayedPage");
    
    console.log('Regular playlist context:', {
      currentPlayingPlaylist,
      lastPlayedPlaylist,
      lastPlayedPage,
      playlistTracksCount: playlistTracks.length
    });

    // Jika playlistTracks kosong, coba load ulang dari playlist yang sedang diputar
    if (playlistTracks.length === 0 || !currentPlayingPlaylist) {
      console.log('No playlist tracks available, reloading from current playlist...');
      
      const targetPlaylist = currentPlayingPlaylist || lastPlayedPlaylist;
      if (targetPlaylist) {
        await reloadPlaylistTracks(targetPlaylist, lastPlayedPage);
      } else {
        console.log('No target playlist found for reload');
        return;
      }
    }

    // Pastikan kita menggunakan playlist yang benar
    const actualPlaylist = currentPlayingPlaylist || lastPlayedPlaylist;
    if (actualPlaylist && playlistTracks[0]?.dataset.playlist !== actualPlaylist) {
      console.log('Playlist mismatch, reloading tracks...');
      await reloadPlaylistTracks(actualPlaylist, lastPlayedPage);
    }

    let nextTrack;
    if (isRandom) {
      nextTrack = getNextRandomTrack(currentPlayingPlaylist);
    } else {
      currentTrackIndex = (currentTrackIndex + 1) % playlistTracks.length;
      nextTrack = playlistTracks[currentTrackIndex];
    }

    if (nextTrack) {
      console.log('Found next track:', nextTrack.dataset.title);
      
      if (nextTrack.classList.contains('virtual-track')) {
        console.log('Playing virtual track from backup');
        
        datamusic("next");
        
        audioPlayer.src = nextTrack.getAttribute('data-src');
        audioPlayer.currentTime = 0;
        audioPlayer.play();
        
        currentPlayingItem = nextTrack;
        currentPlayingId = nextTrack.getAttribute('data-src');
        
        localStorage.setItem("lastPlayedMusic", nextTrack.getAttribute('data-src'));
        localStorage.setItem("lastPlayedPlaylist", currentPlayingPlaylist);
        localStorage.setItem("currentTrackIndex", currentTrackIndex);
        localStorage.setItem("wasPlaying", "true");
        
        updatePlaybackUI(nextTrack, nextTrack.getAttribute('data-src'), currentPlayingPlaylist, nextTrack.getAttribute('data-id'), "next", lastPlayedPage);
      } else {
        simulateTrackClick(nextTrack, "next");
      }
      
      if (mySwiper) {
        mySwiper.slideNext();
      }
      changeBg();
    }
  }
}
async function playPreviousMusic() {
  console.log('playPreviousMusic called:', {
    currentPlaylist: currentPlayingPlaylist,
    isSearch: currentPlayingPlaylist === "SE",
    historyLength: playbackHistory.length,
    historyIndex: historyIndex
  });

  // PERBAIKAN: Cek apakah sedang memutar dari search (playlist "SE")
  if (currentPlayingPlaylist === "SE" && playbackHistory.length > 0) {
    console.log('Playing previous in SEARCH playlist');
    
    // PERBAIKAN: Decrement historyIndex
    if (historyIndex > 0) {
      // Masih ada track sebelumnya dalam history
      historyIndex--;
      console.log('Moving to previous track in history, index:', historyIndex);
    } else {
      // Sudah di awal history, loop ke akhir
      console.log('Beginning of history reached, looping to end');
      historyIndex = playbackHistory.length - 1;
    }
    
    // PERBAIKAN: Pastikan historyIndex valid
    historyIndex = Math.max(0, Math.min(historyIndex, playbackHistory.length - 1));
    
    console.log('Final historyIndex:', historyIndex, 'Total tracks:', playbackHistory.length);
    
    // Play track dari history
    if (playbackHistory.length > 0) {
      playFromHistory(historyIndex, "prev");
    } else {
      console.log('No tracks in history to play');
    }
    
    // PERBAIKAN: Slide Swiper
    if (mySwiper) {
      mySwiper.slidePrev();
    }
    
    savePlaybackState();
  } else {
    // Handle untuk playlist biasa (non-search)
    console.log('Playing previous in regular playlist:', currentPlayingPlaylist);
    
    const lastPlayedPlaylist = localStorage.getItem("lastPlayedPlaylist");
    const lastPlayedPage = localStorage.getItem("lastPlayedPage");
    
    console.log('Regular playlist context:', {
      currentPlayingPlaylist,
      lastPlayedPlaylist,
      lastPlayedPage,
      playlistTracksCount: playlistTracks.length
    });

    // Jika playlistTracks kosong, coba load ulang dari playlist yang sedang diputar
    if (playlistTracks.length === 0 || !currentPlayingPlaylist) {
      console.log('No playlist tracks available, reloading from current playlist...');
      
      const targetPlaylist = currentPlayingPlaylist || lastPlayedPlaylist;
      if (targetPlaylist) {
        await reloadPlaylistTracks(targetPlaylist, lastPlayedPage);
      } else {
        console.log('No target playlist found for reload');
        return;
      }
    }

    // Pastikan kita menggunakan playlist yang benar
    const actualPlaylist = currentPlayingPlaylist || lastPlayedPlaylist;
    if (actualPlaylist && playlistTracks[0]?.dataset.playlist !== actualPlaylist) {
      console.log('Playlist mismatch, reloading tracks...');
      await reloadPlaylistTracks(actualPlaylist, lastPlayedPage);
    }

    let prevTrack;
    if (isRandom) {
      prevTrack = getPrevRandomTrack(currentPlayingPlaylist);
    } else {
      currentTrackIndex =
        (currentTrackIndex - 1 + playlistTracks.length) % playlistTracks.length;
      prevTrack = playlistTracks[currentTrackIndex];
    }

    if (prevTrack) {
      console.log('Found previous track:', prevTrack.dataset.title);
      
      if (prevTrack.classList.contains('virtual-track')) {
        console.log('Playing virtual track from backup');
        
        datamusic("prev");
        
        audioPlayer.src = prevTrack.getAttribute('data-src');
        audioPlayer.currentTime = 0;
        audioPlayer.play();
        
        currentPlayingItem = prevTrack;
        currentPlayingId = prevTrack.getAttribute('data-src');
        
        localStorage.setItem("lastPlayedMusic", prevTrack.getAttribute('data-src'));
        localStorage.setItem("lastPlayedPlaylist", currentPlayingPlaylist);
        localStorage.setItem("currentTrackIndex", currentTrackIndex);
        localStorage.setItem("wasPlaying", "true");
        
        updatePlaybackUI(prevTrack, prevTrack.getAttribute('data-src'), currentPlayingPlaylist, prevTrack.getAttribute('data-id'), "prev", lastPlayedPage);
      } else {
        simulateTrackClick(prevTrack, "prev");
      }
      
      if (mySwiper) {
        mySwiper.slidePrev();
      }
      changeBg();
    }
  }
}

// Fungsi untuk mensimulasikan klik track tanpa memicu event bubbling
function simulateTrackClick(trackElement, direction = "next") {
  const idAudio = trackElement.getAttribute('data-src');
  const idMusic = trackElement.getAttribute('data-id');
  const idPlaylist = trackElement.getAttribute('data-playlist');
  
  console.log('Simulating track click:', {
    idAudio,
    idPlaylist,
    direction
  });

  // Update state langsung
  currentPlayingItem = trackElement;
  currentPlayingId = idAudio;
  currentPlayingPlaylist = idPlaylist;
  
  // Update track index
  currentTrackIndex = playlistTracks.findIndex(
    track => track.getAttribute('data-src') === idAudio && 
    track.getAttribute('data-playlist') === idPlaylist
  );

  // Update localStorage
  localStorage.setItem("lastPlayedMusic", idAudio);
  localStorage.setItem("lastPlayedPlaylist", idPlaylist);
  localStorage.setItem("currentTrackIndex", currentTrackIndex);
  localStorage.setItem("wasPlaying", "true");

  // Tentukan pageType untuk update UI yang benar
  const isArtistPage = document.querySelector('.page_artist')?.style.display === 'block';
  const isPlaylistPage = document.querySelector('.page_playlist')?.style.display === 'block';
  const isAlbumPage = document.querySelector('.page_album')?.style.display === 'block';
  const isFavMusicPage = document.querySelector('.page_fav_music')?.style.display === 'block';
  
  const pageType = isArtistPage ? 'artist' : 
                  (isPlaylistPage ? 'playlist' : 
                  (isAlbumPage ? 'album' : 
                  (isFavMusicPage ? 'fav_music' : 'unknown')));

  // PERBAIKAN: Update playback UI untuk highlight
  updatePlaybackUI(trackElement, idAudio, idPlaylist, idMusic, direction, pageType);

  // Play audio
  audioPlayer.src = idAudio;
  audioPlayer.currentTime = 0;
  audioPlayer.play().catch(e => {
    console.error("Playback failed:", e);
  });

  // Update music player UI
  datamusic(direction);
  $(".music-player").show();
}

// Fungsi untuk mencari track dengan genre serupa (untuk search)
async function findSimilarTracksByGenre(currentTrackId, currentGenres) {
  try {
    console.log('Finding similar tracks for:', {
      currentTrackId,
      currentGenres
    });

    const response = await fetch("/recommendTrack", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        genres: currentGenres,
        exclude: [currentTrackId, ...playbackHistory.map(track => track.idMusic)],
        limit: 10,
      }),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const tracks = await response.json();
    console.log('Similar tracks found:', tracks.length);
    
    // Urutkan berdasarkan kesamaan genre
    tracks.sort((a, b) => {
      const aGenres = a.genre?.split(", ") || [];
      const bGenres = b.genre?.split(", ") || [];
      
      const aMatches = countGenreMatches(aGenres, currentGenres);
      const bMatches = countGenreMatches(bGenres, currentGenres);
      
      // Jika kesamaan sama, randomize
      if (bMatches === aMatches) {
        return Math.random() - 0.5;
      }
      
      return bMatches - aMatches;
    });

    return tracks;
  } catch (error) {
    console.error("Error finding similar tracks:", error);
    return [];
  }
}

// Fungsi untuk menghitung kesamaan genre (salin dari search.js)
function countGenreMatches(trackGenres, targetGenres) {
  if (!trackGenres || !targetGenres) return 0;
  
  const trackGenreSet = new Set(trackGenres.map(g => g.toLowerCase().trim()));
  const targetGenreSet = new Set(targetGenres.map(g => g.toLowerCase().trim()));
  
  let matches = 0;
  for (const genre of trackGenreSet) {
    if (targetGenreSet.has(genre)) {
      matches++;
    }
  }
  
  return matches;
}


function trackClicked(clickedItem, direction = "next", forcePlay = false) {
  const idAudio = clickedItem.dataset.src;
  const idMusic = clickedItem.dataset.id;
  let idPlaylist = clickedItem.dataset.playlist;
  let idPlaylistOriginal = clickedItem.dataset.playlistOriginal; 
  let itemType = clickedItem.dataset.item; // Ini bisa "music" dari data-item
  const storageKey = `progress_${idAudio}`;
  const playlistStorageKey = `lastPlaylist_${idAudio}`;

    if (clickedItem.dataset.playlist === "SE") {
    const genres = clickedItem.dataset.genre?.split(", ") || [];
    currentPlayingGenres = genres;
  }

  const isArtistPage = document.querySelector('.page_artist')?.style.display === 'block';
  const isPlaylistPage = document.querySelector('.page_playlist')?.style.display === 'block';
  const isAlbumPage = document.querySelector('.page_album')?.style.display === 'block';
  const isMusicPage = document.querySelector('.page_music')?.style.display === 'block';
  const isFavMusicPage = document.querySelector('.page_fav_music')?.style.display === 'block';
  const isHomePage = document.querySelector('.page_home')?.style.display === 'block';
  const isTop50Page = document.querySelector('.page_top50')?.style.display === 'block'; // TAMBAHKAN
  const isMostPlayedPage = document.querySelector('.page_mostplayed')?.style.display === 'block'; // TAMBAHKAN
  
  const pageType = isArtistPage ? 'artist' : 
                  (isPlaylistPage ? 'playlist' : 
                  (isAlbumPage ? 'album' : 
                  (isMusicPage ? 'music' :
                  (isFavMusicPage ? 'fav_music' : 
                  (isHomePage ? 'home' : 
                  (isTop50Page ? 'top50' : // TAMBAHKAN
                  (isMostPlayedPage ? 'mostplayed' : 'unknown'))))))); // TAMBAHKAN

  console.log('Page type detected:', pageType, 'Playlist ID:', idPlaylist);

  // PERBAIKAN: Tentukan parameter untuk recent activity
  let recentActivityItemType = itemType;
  let recentActivityItemId = idPlaylistOriginal || idPlaylist;
  
  // PERBAIKAN KHUSUS untuk halaman music
  if (isMusicPage) {
    // Untuk halaman music, item_type adalah 'music' dan item_id adalah id_music
    recentActivityItemType = 'music';
    recentActivityItemId = idMusic; // Gunakan id_music sebagai item_id
  }
  
  // Jika itemType masih undefined, coba tentukan dari halaman
  if (!recentActivityItemType || recentActivityItemType === 'undefined') {
    if (isArtistPage) recentActivityItemType = 'artist';
    else if (isPlaylistPage) recentActivityItemType = idPlaylist.startsWith('C') ? 'custom_playlist' : 'playlist';
    else if (isAlbumPage) recentActivityItemType = 'album';
    else if (isMusicPage) recentActivityItemType = 'music';
    else if (isFavMusicPage) recentActivityItemType = 'playlist'; // FAV_MUSIC sebagai playlist khusus
    else if (isTop50Page) recentActivityItemType = 'playlist'; // TAMBAHKAN: Top 50 sebagai playlist
    else if (isMostPlayedPage) recentActivityItemType = 'playlist'; // TAMBAHKAN: Most Played sebagai playlist
  }
  
  console.log('Recent activity parameters:', {
    item_type: recentActivityItemType,
    item_id: recentActivityItemId,
    id_music: idMusic,
    isFavMusicPage: isFavMusicPage,
    isTop50Page: isTop50Page,
    isMostPlayedPage: isMostPlayedPage,
    playlistId: idPlaylist
  });

  // PERBAIKAN: Skip tracking untuk FAV_MUSIC
  const isFavMusicPlaylist = idPlaylist === 'FAV_MUSIC' || idPlaylist === 'FAV999999' || 
                             recentActivityItemId === 'FAV_MUSIC' || recentActivityItemId === 'FAV999999';
  
  // PERBAIKAN: Juga skip tracking untuk Top 50 dan Most Played jika perlu
  const isSpecialPlaylist = isFavMusicPage || isFavMusicPlaylist || 
                           isTop50Page || isMostPlayedPage ||
                           idPlaylist === 'top50' || idPlaylist === 'mostplayed';
  
  if (isSpecialPlaylist) {
    console.log('Skipping recent activity tracking for special playlist:', {
      playlistId: idPlaylist,
      pageType: pageType
    });
  }

  // Load or initialize playlist tracks
  if (!playlistTracks.length || playlistTracks[0].dataset.playlist !== idPlaylist) {
    let selector = `.listmusic[data-playlist="${idPlaylist}"]`;
    playlistTracks = Array.from(document.querySelectorAll(selector));

    // PERBAIKAN: Handle legacy FAV_MUSIC dalam selector
    if (!playlistTracks.length && idPlaylist === 'FAV999999') {
      selector = `.listmusic[data-playlist="FAV_MUSIC"]`;
      playlistTracks = Array.from(document.querySelectorAll(selector));
      playlistTracks.forEach(track => {
        track.setAttribute('data-playlist', 'FAV999999');
      });
      console.log('Found legacy FAV_MUSIC tracks, converted to FAV999999:', playlistTracks.length);
    }

    // PERBAIKAN: Handle Top 50 dan Most Played
    if (!playlistTracks.length && (idPlaylist === 'top50' || idPlaylist === 'mostplayed')) {
      // Untuk Top 50 dan Most Played, cari tracks di halaman yang sesuai
      const pageClass = idPlaylist === 'top50' ? '.page_top50' : '.page_mostplayed';
      playlistTracks = Array.from(document.querySelectorAll(`${pageClass} .listmusic`));
      console.log(`Found ${playlistTracks.length} tracks for ${idPlaylist} in ${pageClass}`);
    }

    // Jika tidak ada tracks di DOM, coba load dari localStorage
    if (!playlistTracks.length) {
      const savedTracks = localStorage.getItem(`playlistTracks_${idPlaylist}`);
      if (savedTracks) {
        try {
          const parsed = JSON.parse(savedTracks);
          playlistTracks = parsed.tracks.map((track) => createVirtualTrack(track));
          console.log('Loaded virtual tracks from localStorage:', playlistTracks.length);
        } catch (e) {
          console.error('Error parsing localStorage tracks:', e);
          playlistTracks = [];
        }
      } else {
        console.log('No tracks found in localStorage for:', idPlaylist);
      }
    } else {
      console.log('Found tracks in DOM:', playlistTracks.length);
    }
  }

  const lastPlayedMusic = localStorage.getItem("lastPlayedMusic");
  const lastPlayedPlaylist = localStorage.getItem("lastPlayedPlaylist");
  const isDifferentTrack =
    idAudio !== currentPlayingId || idPlaylist !== currentPlayingPlaylist;

  if (isDifferentTrack || forcePlay) {
    audioPlayer.pause();
    audioPlayer.src = idAudio;

    const isSameAsLastPlayed =
      idAudio === lastPlayedMusic && idPlaylist === lastPlayedPlaylist;
    const storedProgress = localStorage.getItem(storageKey);

    audioPlayer.currentTime =
      isSameAsLastPlayed && storedProgress ? parseFloat(storedProgress) : 0;

    // Play the audio and update state
    audioPlayer
      .play()
      .then(() => {
        // Update playback state
        currentPlayingItem = clickedItem;
        currentPlayingId = idAudio;
        currentPlayingPlaylist = idPlaylist;
        currentTrackIndex = playlistTracks.findIndex(
          (el) =>
            el.dataset.src === idAudio && el.dataset.playlist === idPlaylist
        );

        // Jika track tidak ditemukan di playlistTracks, tambahkan
        if (currentTrackIndex === -1) {
          console.log('Track not found in playlistTracks, adding it...');
          currentTrackIndex = playlistTracks.length;
          playlistTracks.push(clickedItem);
        }

        console.log('Playback state updated:', {
          currentTrackIndex,
          totalTracks: playlistTracks.length,
          pageType,
          playlistId: idPlaylist
        });

        // Save to localStorage
        localStorage.setItem("lastPlayedMusic", idAudio);
        localStorage.setItem("lastPlayedId", idAudio);
        localStorage.setItem("lastPlayedPlaylist", idPlaylist);
        localStorage.setItem("lastMusicId", idMusic);
        localStorage.setItem("currentTrackIndex", currentTrackIndex);
        localStorage.setItem(playlistStorageKey, idPlaylist);
        localStorage.setItem("wasPlaying", "true");
        localStorage.setItem("lastPlayedPage", pageType);

        // Update UI
        updatePlaybackUI(clickedItem, idAudio, idPlaylist, idMusic, direction, pageType);
        const tracksData = {
          playlistId: idPlaylist,
          pageType: pageType,
          tracks: playlistTracks.map((track) => ({
            src: track.dataset.src || '',
            id: track.dataset.id || '',
            title: track.dataset.title || '',
            artist: track.dataset.artist || '',
            cover: track.dataset.cover || '',
            playlist: track.dataset.playlist || idPlaylist,
            playlist_original: track.dataset.playlistOriginal || idPlaylistOriginal,
            lyric: track.dataset.lyric || '',
            line_durations: track.dataset.lineDurations || track.dataset['line-durations'] || '',
            artist_ids: track.dataset.artistIds || track.dataset['artist-ids'] || '',
            artist_hashids: track.dataset.artistHashids || track.dataset['artist-hashids'] || '',
            album_id: track.dataset.albumId || track.dataset['album-id'] || '',
            playlist_name: track.dataset.playlistName || track.dataset['playlist_name'] || ''
          })),
        };
        

        localStorage.setItem(`playlistTracks_${idPlaylist}`, JSON.stringify(tracksData));
        console.log('Saved tracks to localStorage:', tracksData.tracks.length);

        checkFavoriteStatus();

        // PERBAIKAN: Kirim data recent activity dengan parameter yang benar
        // Jangan kirim untuk special playlists atau jika tidak ada user
        if (userId && !isSpecialPlaylist) {
          console.log('Sending recent activity:', {
            id_music: idMusic,
            item_type: recentActivityItemType,
            item_id: recentActivityItemId
          });
          sendRecentActivity(idMusic, recentActivityItemType, recentActivityItemId);
        } else {
          console.log('Skipping recent activity tracking:', {
            reason: !userId ? 'No user ID' : 'Special playlist',
            userId: userId,
            playlistId: idPlaylist,
            pageType: pageType,
            isSpecialPlaylist: isSpecialPlaylist
          });
        }

      })
      .catch((e) => {
        console.error("Playback failed:", e);
        document.querySelectorAll(".svg-icon.control-play").forEach((icon) => {
          icon.innerHTML = playIcon;
        });
      });
  } else {
    // Toggle play/pause
    if (audioPlayer.paused) {
      audioPlayer.play().then(() => {
        localStorage.setItem("wasPlaying", "true");
        updatePlayPauseUI();
      });
    } else {
      localStorage.setItem(storageKey, audioPlayer.currentTime);
      localStorage.setItem("wasPlaying", "false");
      audioPlayer.pause();
      updatePlayPauseUI();
    }
  }

  $(".music-player").show();

  const activeContentDesk = document.querySelector(
    ':root[style*="--device: desktop"] #active-content'
  );
  const activeContentMo = document.querySelector(
    ':root[style*="--device: mobile"] #active-content'
  );

  const userControl = document.getElementById("current-user-control");
  const navbarBottomControls = document.querySelector(
    ':root[style*="--device: desktop"] #navbar-bottom-controls'
  );
  const navbar = document.querySelector(
    ':root[style*="--device: desktop"] #navbar'
  );
  const librarytoggle = document.querySelector(
    ':root[style*="--device: desktop"] .library-toggle'
  );

  if (window.innerWidth <= 768) {
    if (activeContentMo) {
      activeContentMo.style.paddingBottom = "120px";
    }
  } 
  
  if (activeContentDesk) {
    activeContentDesk.style.height = "calc(100vh - 60px)";
  }
  
  if (userControl) userControl.style.bottom = "80px";
  if (navbarBottomControls) navbarBottomControls.style.bottom = "80px";
  if (navbar) navbar.style.height = "calc(100% - 230px)";
  if (librarytoggle) librarytoggle.style.marginBottom = "40px";
}



function sendRecentActivity(id_music, item_type, item_id) {

  if (!id_music || !item_type || !item_id) {
    console.error('Invalid parameters for recent activity:', { id_music, item_type, item_id });
    return;
  }
  
  if (!userId) {
    console.error('No user ID available for recent activity');
    return;
  }

  // Buat data yang akan dikirim
  const activityData = {
    id_music: id_music,
    item_type: item_type,
    item_id: item_id
  };

  // Kirim menggunakan AJAX
  $.ajax({
    url: '/recent_activity',
    type: 'POST',
    contentType: 'application/json',
    data: JSON.stringify(activityData),
    success: function(response) {
      console.log('Recent activity tracked successfully:', response);
      
      // PERBAIKAN: Refresh recent activity di home page jika ada
      if (response.success) {
        // Cek jika sedang di home page dan ada partial home
        const homePage = document.querySelector('.page_home');
        if (homePage && homePage.style.display === 'block') {
          console.log('Refreshing home page recent activity...');
          // Anda bisa memanggil fungsi refresh untuk update recent activity
          refreshRecentActivity();
        }
      }
    },
    error: function(xhr, status, error) {
      console.error('Error tracking recent activity:', {
        status: xhr.status,
        statusText: xhr.statusText,
        responseText: xhr.responseText,
        error: error
      });
      
      // Tampilkan detail error jika ada
      if (xhr.responseText) {
        try {
          const errorResponse = JSON.parse(xhr.responseText);
          console.error('Server error response:', errorResponse);
        } catch (e) {
          console.error('Raw server response:', xhr.responseText);
        }
      }
    }
  });
}


// Function untuk membuat virtual track element
// Helper function untuk membuat virtual track dari data
function createVirtualTrack(trackData) {
  const div = document.createElement('div');
  div.className = 'track-container listmusic virtual-track';
  div.setAttribute('data-id', trackData.id || '');
  div.setAttribute('data-src', trackData.src || '');
  div.setAttribute('data-lyric', trackData.lyric || '');
  div.setAttribute('data-line-durations', trackData.line_durations || '');
  div.setAttribute('data-cover', trackData.cover || '');
  div.setAttribute('data-title', trackData.title || '');
  div.setAttribute('data-artist', trackData.artist || '');
  div.setAttribute('data-playlist', trackData.playlist || '');
  div.setAttribute('data-playlist-original', trackData.playlist_original || '');
  div.setAttribute('data-artist-ids', trackData.artist_ids || '');
  div.setAttribute('data-artist-hashids', trackData.artist_hashids || '');
  div.setAttribute('data-album-id', trackData.album_id || '');
  div.setAttribute('data-playlist_name', trackData.playlist_name || '');
  div.setAttribute('data-item', trackData.item_type || 'custom_playlist');
  return div;
}

// Helper function untuk mendapatkan user ID saat ini
function getCurrentUserId() {
  // Sesuaikan dengan cara Anda menyimpan/mendapatkan user ID di client side
  const userDataElement = document.querySelector('[data-user-id]');
  if (userDataElement) {
    return userDataElement.getAttribute('data-user-id');
  }
  
  const savedUserId = localStorage.getItem('userId');
  if (savedUserId) {
    return savedUserId;
  }
  
  return null;
}


function updatePlaybackUI(clickedItem, idAudio, idPlaylist, idMusic, direction, pageType = 'playlist') {
  console.log('Updating playback UI for:', { idAudio, idPlaylist, pageType });
  
  const actualTrackElement =
    document.querySelector(
      `.listmusic[data-src="${idAudio}"][data-playlist="${idPlaylist}"]`
    ) || clickedItem;

  clearPlayingSearchClass();

  datamusic(direction);

  // PERBAIKAN: Dapatkan konteks halaman yang sedang dibuka
  const currentPage = getCurrentPageType();
  const currentPagePlaylistId = getCurrentPagePlaylistId();
  
  console.log('Playback UI Context:', {
    playingPlaylist: idPlaylist,
    playingPage: pageType,
    currentPage: currentPage,
    currentPagePlaylistId: currentPagePlaylistId,
    shouldUpdateIcons: (idPlaylist === currentPagePlaylistId && pageType === currentPage)
  });

  // PERBAIKAN: Update play/pause icons hanya jika memang halaman yang terbuka adalah musik yang terputar
  if (idPlaylist === currentPagePlaylistId && pageType === currentPage) {
    console.log('Context matches - updating icons for:', currentPage);
    
    if (pageType === 'artist') {
      document.querySelectorAll(".page_artist .playlist-play").forEach((icon) => {
        icon.innerHTML = pauseIcon;
      });
    } else if (pageType === 'playlist') {
      document.querySelectorAll(".page_playlist .playlist-play").forEach((icon) => {
        icon.innerHTML = pauseIcon;
      });
    } else if (pageType === 'album') {
      document.querySelectorAll(".page_album .playlist-play").forEach((icon) => {
        icon.innerHTML = pauseIcon;
      });
    } else if (pageType === 'fav_music') {
      document.querySelectorAll(".page_fav_music .playlist-play").forEach((icon) => {
        icon.innerHTML = pauseIcon;
      });
    } else if (pageType === 'music') {
      document.querySelectorAll(".page_music .playlist-play").forEach((icon) => {
        icon.innerHTML = pauseIcon;
      });
    } else if (pageType === 'top50') {
      document.querySelectorAll(".page_top50 .playlist-play").forEach((icon) => {
        icon.innerHTML = pauseIcon;
      });
    } else if (pageType === 'mostplayed') {
      document.querySelectorAll(".page_mostplayed .playlist-play").forEach((icon) => {
        icon.innerHTML = pauseIcon;
      });
    }
    console.log(`Updated ${pageType} icons to pause (context matches)`);
  } else {
    // PERBAIKAN: Reset icon jika konteks tidak sesuai
    resetAllPlayIcons();
    console.log('Skipped icon update - context mismatch', {
      idPlaylist,
      currentPagePlaylistId,
      pageType,
      currentPage
    });
  }

  // Remove all .playing classes
  document
    .querySelectorAll(".listmusic.playing, .visual-card.playing")
    .forEach((el) => {
      el.classList.remove("playing");
    });

  // Highlight currently playing element
  if (actualTrackElement) {
    actualTrackElement.classList.add("playing");
    console.log('Added playing class to track:', actualTrackElement.getAttribute('data-title'));
  } else {
    console.warn('Could not find track element to add playing class');
  }

  // Update visual cards (hanya untuk playlist)
  // PERBAIKAN: Juga periksa konteks untuk visual cards
  if (pageType === 'playlist' && idPlaylist === currentPagePlaylistId) {
    document.querySelectorAll(".visual-card").forEach((card) => {
      const wrapper = card.querySelector(".svg-circle-wrapper");
      const icon = card.querySelector(".playlistCover-play");
      const coverPlaylistId = wrapper?.dataset.playlistHashid;
      const isCurrentPlaylist = coverPlaylistId === idPlaylist;

      if (isCurrentPlaylist) {
        card.classList.add("playing");
        if (icon) icon.innerHTML = pauseIcon;
      } else {
        if (icon) icon.innerHTML = playIcon;
      }
    });
  } else {
    // Reset visual cards jika konteks tidak sesuai
    document.querySelectorAll(".visual-card").forEach((card) => {
      const icon = card.querySelector(".playlistCover-play");
      if (icon) icon.innerHTML = playIcon;
      card.classList.remove("playing");
    });
  }

  if (idPlaylist !== "SE") {
    localStorage.removeItem("currentPlayingFromSearch");
    localStorage.removeItem("currentPlayingGenres");
    currentPlayingGenres = [];
  }

  if (topContent && topContent.classList.contains("expand")) {
    updateMusicExistenceStatus(idMusic);
  }

  const matchingSearchItem = document.querySelector(
    `li.task-list-item[data-src="${idAudio}"]`
  );
  if (matchingSearchItem) {
    const title = matchingSearchItem.querySelector(".track-title");
    const artist = matchingSearchItem.querySelector(".track-artist");
    if (title) title.classList.add("playingSearch");
    if (artist) artist.classList.add("playingSearch");
  }
}



function loadNextPrev() {
  const savedPlaylistId = localStorage.getItem("lastPlayedPlaylist");
  const savedIndex = parseInt(localStorage.getItem("currentTrackIndex"), 10);
  const lastPlayedPage = localStorage.getItem("lastPlayedPage") || 'playlist';

  console.log('loadNextPrev called:', { savedPlaylistId, savedIndex, lastPlayedPage });

  // PERBAIKAN: Handle case ketika savedPlaylistId adalah FAV_MUSIC (legacy)
  let actualPlaylistId = savedPlaylistId;
  if (savedPlaylistId === 'FAV_MUSIC') {
    // Convert FAV_MUSIC ke hashid yang valid
    actualPlaylistId = 'FAV999999';
    console.log('Converting FAV_MUSIC to:', actualPlaylistId);
  }

  const fromSearch = localStorage.getItem("currentPlayingFromSearch") === "true";
  if (fromSearch) {
    const savedGenres = localStorage.getItem("currentPlayingGenres");
    if (savedGenres) {
      currentPlayingGenres = JSON.parse(savedGenres);
    }
  }

  if (actualPlaylistId && !isNaN(savedIndex)) {
    let url;
    
    // Tentukan URL berdasarkan halaman terakhir
    if (lastPlayedPage === 'artist') {
      url = `/artist/${actualPlaylistId}`;
    } else if (lastPlayedPage === 'album') {
      url = `/album/${actualPlaylistId}`;
    } else if (lastPlayedPage === 'fav_music') {
      // Untuk favorite music, gunakan endpoint yang benar
      url = `/favoritemusic`;
    } else if (actualPlaylistId.startsWith('C')) {
      url = `/custom/${actualPlaylistId}`;
    } else {
      url = `/playlist/${actualPlaylistId}`;
    }

    console.log('Fetching from:', url);

    fetch(url, {
      headers: { "X-Requested-With": "XMLHttpRequest" },
    })
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
        return res.text();
      })
      .then((html) => {
        console.log('Response received, length:', html.length);
        
        const container = document.createElement("div");
        container.innerHTML = html;
        container.style.display = "none";
        document.body.appendChild(container);

        let savedTracks;
        let selector;
        
        // Cari tracks berdasarkan halaman
        if (lastPlayedPage === 'artist') {
          selector = `.listmusic[data-playlist="${actualPlaylistId}"]`;
          savedTracks = Array.from(container.querySelectorAll(selector));
          console.log('Artist tracks found:', savedTracks.length, 'with selector:', selector);
        } else if (lastPlayedPage === 'album') {
          selector = `.listmusic[data-playlist="${actualPlaylistId}"]`;
          savedTracks = Array.from(container.querySelectorAll(selector));
          console.log('Album tracks found:', savedTracks.length, 'with selector:', selector);
        } else if (lastPlayedPage === 'fav_music') {
          // Untuk favorite music, cari semua tracks dengan data-playlist yang sesuai
          const firstTrack = container.querySelector('.listmusic');
          const favPlaylistId = firstTrack ? firstTrack.getAttribute('data-playlist') : 'FAV999999';
          selector = `.listmusic[data-playlist="${favPlaylistId}"]`;
          savedTracks = Array.from(container.querySelectorAll(selector));
          console.log('Favorite music tracks found:', savedTracks.length, 'with selector:', selector);
          
          // PERBAIKAN: Update actualPlaylistId dengan yang benar dari DOM
          if (savedTracks.length > 0) {
            actualPlaylistId = favPlaylistId;
          }
        } else if (actualPlaylistId.startsWith('C')) {
          selector = `.listmusic[data-playlist="${actualPlaylistId}"]`;
          savedTracks = Array.from(container.querySelectorAll(selector));
          console.log('Custom playlist tracks found:', savedTracks.length, 'with selector:', selector);
        } else {
          selector = `.listmusic[data-playlist="${actualPlaylistId}"]`;
          savedTracks = Array.from(container.querySelectorAll(selector));
          console.log('Playlist tracks found:', savedTracks.length, 'with selector:', selector);
        }

        // Debug: Tampilkan semua tracks yang ditemukan
        savedTracks.forEach((track, idx) => {
          console.log(`Track ${idx}:`, {
            src: track.getAttribute('data-src'),
            playlist: track.getAttribute('data-playlist'),
            id: track.getAttribute('data-id')
          });
        });

        if (savedTracks.length > 0) {
          if (savedTracks[savedIndex]) {
            playlistTracks = savedTracks;
            currentPlaylistId = actualPlaylistId; // Gunakan actualPlaylistId
            currentTrackIndex = savedIndex;
            currentPlayingItem = savedTracks[savedIndex];
            
            console.log('Successfully loaded track:', {
              currentTrackIndex,
              trackSrc: currentPlayingItem.getAttribute('data-src'),
              trackPlaylist: currentPlayingItem.getAttribute('data-playlist'),
              pageType: lastPlayedPage
            });

            // Update playing class
            updatePlayPauseUI();
          } else {
            console.warn('Saved index out of bounds:', savedIndex, 'Total tracks:', savedTracks.length);
            currentTrackIndex = 0;
            currentPlayingItem = savedTracks[0];
          }
        } else {
          console.error('No tracks found with selector:', selector);
          loadTracksFromLocalStorageBackup(actualPlaylistId, savedIndex);
        }

        // Cleanup
        document.body.removeChild(container);
      })
      .catch((err) => {
        console.error("Gagal load ulang playlist/artist terakhir:", err);
        loadTracksFromLocalStorageBackup(actualPlaylistId, savedIndex);
      });
  } else {
    console.log('No saved playlist data found');
  }
}




function loadTracksFromLocalStorageBackup(playlistId, trackIndex) {
  console.log('Trying localStorage backup for:', playlistId);
  
  const savedTracksData = localStorage.getItem(`playlistTracks_${playlistId}`);
  if (savedTracksData) {
    try {
      const parsedData = JSON.parse(savedTracksData);
      console.log('Found backup tracks in localStorage:', parsedData.tracks.length);
      
      // Create virtual tracks dari data localStorage
      playlistTracks = parsedData.tracks.map(trackData => createVirtualTrack(trackData));
      
      if (playlistTracks.length > 0) {
        currentPlaylistId = playlistId;
        currentTrackIndex = trackIndex >= playlistTracks.length ? 0 : trackIndex;
        currentPlayingItem = playlistTracks[currentTrackIndex];
        
        console.log('Successfully loaded from localStorage backup:', {
          currentTrackIndex,
          trackSrc: currentPlayingItem.getAttribute('data-src')
        });
      }
    } catch (e) {
      console.error('Error parsing localStorage backup:', e);
    }
  } else {
    console.error('No backup tracks found in localStorage for:', playlistId);
  }
}








function animateContent(elements, newContent, direction) {
  const outClass = direction === "next" ? "fade-out-left" : "fade-out-right";

  elements.forEach((el) => {
    el.classList.remove(
      "fade-in",
      "fade-out-left",
      "fade-out-right",
      "animate-left",
      "animate-right"
    );
    el.classList.add(outClass);

    el.addEventListener("animationend", function handler() {
      el.removeEventListener("animationend", handler);

      const isImage = el.tagName === "IMG";

      // Cek jika konten baru berbeda
      const isDifferent = isImage
        ? el.src !== newContent
        : el.textContent !== newContent;

      if (isDifferent) {
        if (isImage) {
          // Set extractColor hanya saat ganti gambar
          el.onload = extractColor;
          el.src = newContent;
        } else {
          el.textContent = newContent;
        }
      }

      el.classList.remove("fade-out-left", "fade-out-right");
      el.classList.add("fade-in");

      el.addEventListener("animationend", function removeFade() {
        el.removeEventListener("animationend", removeFade);
        el.classList.remove("fade-in");
      });
    });
  });
}


function datamusic(direction = "next") {
  if (!currentPlayingItem) return;

  const {
    src,
    id,
    playlist,
    playlist_name,
    title,
    cover,
    artist,
    artistIds,
    artistHashids, // PERBAIKAN: Tambahkan artistHashids
    lyric,
    line_durations,
  } = currentPlayingItem.dataset;

  animateContent(document.querySelectorAll(".current-cover"), cover, direction);
  animateContent(document.querySelectorAll(".title"), title, direction);

  // Gunakan playlist_name jika ada, jika tidak gunakan title
  const displayName = playlist_name || title;
  document
    .querySelectorAll(".appName")
    .forEach((el) => (el.textContent = displayName));

  // PERBAIKAN: Panggil updateArtistNames dengan artistHashids
  updateArtistNames(artist, artistIds, artistHashids, direction);

  const pageLyric = document.querySelector(".page_lyric");
  if (pageLyric && pageLyric.style.display === "block") {
    displayLyricsScreen();
  }

  // Tanpa animasi:
  document
    .querySelectorAll(".artistid")
    .forEach((el) => (el.textContent = artistIds));

  localStorage.setItem(
    "currentlyPlaying_",
    JSON.stringify({
      src,
      id,
      playlist,
      playlist_name: displayName,
      title,
      cover,
      artist,
      artistIds,
      artistHashids, // PERBAIKAN: Simpan artistHashids
      lyric,
      line_durations,
    })
  );

  currentPlayingId = src;
  currentPlayingPlaylist = playlist;

  checkOrientation();
}

function updateArtistNames(artist, artistIds, artistHashids, direction = "next") {
  const artists = artist.split(",");
  const artistIdArr = artistIds.split(",");
  const artistHashidArr = artistHashids ? artistHashids.split(",") : [];

  document.querySelectorAll(".artistNames").forEach((container) => {
    const outClass = direction === "next" ? "fade-out-left" : "fade-out-right";
    container.classList.remove("fade-in", "fade-out-left", "fade-out-right");
    container.classList.add(outClass);

    container.addEventListener("animationend", function handler() {
      container.removeEventListener("animationend", handler);

      container.innerHTML = "";

      artists.forEach((name, index) => {
        const span = document.createElement("span");
        span.className = "artist-item";
        span.textContent = name.trim();
        
        // PERBAIKAN: Simpan hashid artist, bukan id biasa
        const artistHashid = artistHashidArr[index]?.trim() || "";
        span.dataset.artistHashid = artistHashid;
        span.style.cursor = "pointer";

        span.addEventListener("click", (e) => {
          var isMobile = isTrueMobile();
          const insideMiddleContent = span.closest(".middleContent");
          
          // Cegah klik di mobile jika BUKAN di dalam .middleContent
          if (isMobile && !insideMiddleContent) return;

          // PERBAIKAN: Jika ada hashid, tampilkan hashid, jika tidak tampilkan pesan
          if (artistHashid) {
            slideDownPlayer();
            viewArtist(`${artistHashid}`);
          } 
        });

        container.appendChild(span);
        if (index < artists.length - 1) {
          container.appendChild(document.createTextNode(", "));
        }
      });

      container.classList.remove("fade-out-left", "fade-out-right");
      container.classList.add("fade-in");

      container.addEventListener("animationend", function removeFade() {
        container.removeEventListener("animationend", removeFade);
        container.classList.remove("fade-in");
      });
    });
  });
}



if (currentPlayingId) {
  audioPlayer.src = currentPlayingId;
  audioPlayer.currentTime = parseFloat(storedProgress);
}

// Simpan progress saat lagu berjalan
audioPlayer.addEventListener("timeupdate", function () {
  if (!audioPlayer.paused && currentPlayingId) {
    localStorage.setItem(
      "progress_" + currentPlayingId,
      audioPlayer.currentTime
    );
  }
});

// Simpan data lagu terakhir sebelum halaman di-refresh
audioPlayer.addEventListener("ended", function () {
  localStorage.setItem("progress_" + currentPlayingId, 0); // Reset progress setelah lagu selesai
});

window.addEventListener("beforeunload", function () {
  if (currentPlayingId) {
    localStorage.setItem("lastPlayedId", currentPlayingId);
    // localStorage.setItem('lastPlayedPlaylist', currentPlayingPlaylist);
  }
});

audioPlayer.addEventListener("timeupdate", function () {
  if (currentPlayingItem) {
    var idAudio = currentPlayingItem.getAttribute("data-src");
    var idPlaylist = currentPlayingItem.getAttribute("data-playlist");
    var storageKey = "progress_" + idAudio;
    var lastPlaylistKey = "lastPlaylist_" + idAudio;

    // Pastikan hanya menyimpan progress jika playlist saat ini adalah playlist terakhir
    if (localStorage.getItem(lastPlaylistKey) === idPlaylist) {
      localStorage.setItem(storageKey, audioPlayer.currentTime);
    }
  }
});

function formatTime(seconds) {
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = Math.floor(seconds % 60);
  return `${minutes}:${remainingSeconds < 10 ? "0" : ""}${remainingSeconds}`;
}

document.addEventListener("DOMContentLoaded", function () {
  updateProgressBar(); // Update progress bar saat halaman dimuat
  attachProgressBarEvents();

  if (audioPlayer) {
    audioPlayer.addEventListener("timeupdate", updateProgressBar);
  }

  const startTimeEls = document.querySelectorAll(".start-time");
  const endTimeEls = document.querySelectorAll(".end-time");

  if (audioPlayer) {
    audioPlayer.addEventListener("loadedmetadata", function () {
      endTimeEls.forEach((el) => {
        el.textContent = formatTime(audioPlayer.duration);
        el.style.display = "inline-block";
      });
    });

    audioPlayer.addEventListener("timeupdate", function () {
      startTimeEls.forEach((el) => {
        el.textContent = formatTime(audioPlayer.currentTime);
        el.style.display = "inline-block";
      });
    });
  }

  displayLyricsScreen();
});

function updateProgressBar() {
  const progressBars = document.querySelectorAll(".progressBar");
  if (audioPlayer && progressBars.length > 0) {
    let targetWidth = (audioPlayer.currentTime / audioPlayer.duration) * 100;
    progressBars.forEach((progressBar) => {
      progressBar.style.width = targetWidth + "%";
    });
  }
  updateLyricsScreen();
}

function attachProgressBarEvents() {
  const progressBarContainers = document.querySelectorAll(
    ".player-progressbar"
  );
  let isDragging = false;

  function skipTo(event, progressBarContainer) {
    let clickPosition =
      event.pageX - progressBarContainer.getBoundingClientRect().left;
    let totalWidth = progressBarContainer.clientWidth;
    let newTime = (clickPosition / totalWidth) * audioPlayer.duration;

    audioPlayer.currentTime = newTime;
    if (audioPlayer.paused) audioPlayer.play();

    updateProgressBar();
  }

  function startDragging(event) {
    isDragging = true;
    audioPlayer.pause();
    updateProgressWhileDragging(event);
  }

  function stopDragging() {
    if (isDragging) {
      isDragging = false;
      audioPlayer.play();
    }
  }

  function updateProgressWhileDragging(event) {
    if (!isDragging) return;

    const progressBarContainer = event.target.closest(".player-progressbar");
    if (!progressBarContainer) return;

    let positionX = event.type.includes("touch")
      ? event.touches[0].pageX
      : event.pageX;
    let clickPosition =
      positionX - progressBarContainer.getBoundingClientRect().left;
    let totalWidth = progressBarContainer.clientWidth;
    let targetWidth = (clickPosition / totalWidth) * 100;

    if (targetWidth >= 0 && targetWidth <= 100) {
      const progressBars =
        progressBarContainer.querySelectorAll(".progressBar");
      progressBars.forEach((progressBar) => {
        progressBar.style.width = targetWidth + "%";
      });

      audioPlayer.currentTime =
        (clickPosition / totalWidth) * audioPlayer.duration;
    }
  }

  // Tambahkan event listener ke semua progress bar yang ada
  progressBarContainers.forEach((progressBarContainer) => {
    progressBarContainer.addEventListener("click", (event) =>
      skipTo(event, progressBarContainer)
    );
    progressBarContainer.addEventListener("mousedown", startDragging);
    document.addEventListener("mousemove", updateProgressWhileDragging);
    document.addEventListener("mouseup", stopDragging);
    progressBarContainer.addEventListener("touchstart", startDragging);
    document.addEventListener("touchmove", updateProgressWhileDragging);
    document.addEventListener("touchend", stopDragging);
  });
}

var volumeBar = document.querySelector(".volume-bar-container");
var volumeFill = document.getElementById("volume-fill");
var isDrag = false;
var volumeValue = 80; // Default volume
var lastUpdateFrame = null;
var lastVolume = 80; // Menyimpan volume terakhir sebelum mute
var volumeIcons = {
  high: document.getElementById("volume-high"),
  low: document.getElementById("volume-low"),
  mute: document.getElementById("volume-mute"),
};

var defaultVolume = parseFloat(localStorage.getItem("volume_")) || 80;
var storedVolume = localStorage.getItem("volume_");
var lastVolume = localStorage.getItem("last_volume_");

// Gunakan volume terakhir jika ada
if (storedVolume !== null) {
  defaultVolume = parseFloat(storedVolume);
}

// Jika lastVolume ada, gunakan untuk progress bar
if (lastVolume !== null) {
  lastVolume = parseFloat(lastVolume);
} else {
  lastVolume = 80; // Default jika tidak ada data
}

// Set progress awal
updateVolumeBar(defaultVolume);
audioPlayer.volume = normalizeVolume(defaultVolume);

// Normalisasi volume
function normalizeVolume(value) {
  return Math.pow(value, 2) / 10000;
}

// Update UI progress bar
function updateVolumeBar(volumeValue) {
  volumeFill.style.width = volumeValue + "%";
  updateVolumeIcon(volumeValue);
}
// Update ikon volume
function updateVolumeIcon(volumeValue) {
  Object.values(volumeIcons).forEach((icon) => (icon.style.display = "none"));

  if (volumeValue == 0) {
    volumeIcons.mute.style.display = "block";
  } else if (volumeValue <= 50) {
    volumeIcons.low.style.display = "block";
  } else {
    volumeIcons.high.style.display = "block";
  }
}

// Event: Klik progress bar untuk set volume
volumeBar.addEventListener("click", function (event) {
  var rect = volumeBar.getBoundingClientRect();
  var clickPosition = event.clientX - rect.left;
  var volumeValue = Math.round((clickPosition / rect.width) * 100);

  // Simpan volume ke localStorage
  localStorage.setItem("volume_", volumeValue);
  localStorage.setItem("last_volume_", volumeValue);
  localStorage.setItem("isMuted_", "false"); // Reset status mute

  audioPlayer.volume = normalizeVolume(volumeValue);
  updateVolumeBar(volumeValue);
});

// Set ikon saat halaman dimuat
updateVolumeIcon(defaultVolume);

// Ambil status mute dari localStorage
var isMuted = localStorage.getItem("isMuted_") === "true";

if (isMuted) {
  audioPlayer.volume = 0;
  updateVolumeBar(0);
}

document.getElementById("volume-icon").addEventListener("click", function () {
  if (audioPlayer.volume > 0) {
    // Simpan volume terakhir sebelum mute dalam bentuk aslinya
    lastVolume = volumeValue;
    localStorage.setItem("last_volume_", lastVolume);

    // Mute audio
    audioPlayer.volume = 0;
    updateVolumeBar(0);
    localStorage.setItem("isMuted_", "true");
  } else {
    // Ambil volume terakhir sebelum mute dari localStorage
    lastVolume = parseFloat(localStorage.getItem("last_volume_")) || 80;

    // Set volume kembali ke nilai terakhir sebelum mute
    audioPlayer.volume = normalizeVolume(lastVolume);
    updateVolumeBar(lastVolume);
    localStorage.setItem("isMuted_", "false");
  }
});

// Mulai drag
function startDragging(event) {
  isDrag = true;
  updateVolume(event);
}

// Dragging event
function dragVolume(event) {
  if (!isDrag) return;

  // Batasi update hanya saat frame berikutnya
  if (lastUpdateFrame) {
    cancelAnimationFrame(lastUpdateFrame);
  }

  lastUpdateFrame = requestAnimationFrame(() => {
    updateVolume(event);
  });
}

// Stop drag
function stopDragging() {
  isDrag = false;
}

// Event listener untuk mouse dan touch
volumeBar.addEventListener("mousedown", startDragging);
volumeBar.addEventListener("touchstart", startDragging, { passive: true });

document.addEventListener("mousemove", dragVolume);
document.addEventListener("touchmove", dragVolume, { passive: true });
document.addEventListener("mouseup", stopDragging);
document.addEventListener("touchend", stopDragging);

// Fungsi update volume dengan animasi halus
function updateVolume(event) {
  var rect = volumeBar.getBoundingClientRect();
  var clientX = event.touches ? event.touches[0].clientX : event.clientX;
  var clickPosition = Math.min(Math.max(clientX - rect.left, 0), rect.width);

  // Perhitungan volume baru
  volumeValue = Math.round((clickPosition / rect.width) * 100);

  // Simpan ke localStorage
  localStorage.setItem("volume_", volumeValue);
  localStorage.setItem("last_volume_", volumeValue);
  localStorage.setItem("isMuted_", "false");

  // Update audio & UI dengan transisi lebih halus
  audioPlayer.volume = normalizeVolume(volumeValue);
  volumeFill.style.transition = "width 0.1s ease-out"; // Tambah animasi transisi
  volumeFill.style.width = volumeValue + "%";

  updateVolumeIcon(volumeValue);
}

audioPlayer.addEventListener("play", function () {
  const lastPlayedPlaylist = localStorage.getItem("lastPlayedPlaylist");
  const lastPlayedPage = localStorage.getItem("lastPlayedPage");
  const currentPage = getCurrentPageType();
  
  console.log('Audio play - Context:', {
    lastPlayedPlaylist,
    lastPlayedPage,
    currentPage
  });

  // PERBAIKAN: Update icon hanya jika playlist yang diputar sesuai dengan halaman yang dibuka
  updatePlayPauseIconsBasedOnContext(lastPlayedPlaylist, lastPlayedPage, currentPage, false);

  // PERBAIKAN: Update state untuk semua halaman yang terbuka
  document.querySelectorAll('.page_playlist').forEach(playlistPage => {
    if (playlistPage.style.display === 'block') {
      const playlistId = playlistPage.querySelector('.listmusic')?.getAttribute('data-playlist');
      if (playlistId) {
        updatePlaylistIconState(playlistId);
      }
    }
  });

  // PERBAIKAN: Update state untuk halaman music yang terbuka
  document.querySelectorAll('.page_music').forEach(musicPage => {
    if (musicPage.style.display === 'block') {
      const musicId = musicPage.getAttribute("data-current-music")?.replace('music:', '');
      if (musicId) {
        updateMusicIconState(musicId);
      }
    }
  });

  // Update control play button (selalu)
  document.querySelectorAll(".svg-icon.control-play").forEach((icon) => {
    icon.innerHTML = pauseIcon;
  });

  // PERBAIKAN: Update cover playlist icons - HANYA yang sedang diputar
  document.querySelectorAll(".visual-card").forEach((cover) => {
    const wrapper = cover.querySelector(".svg-circle-wrapper");
    const icon = cover.querySelector(".playlistCover-play");
    const coverPlaylistId = wrapper?.dataset.playlistHashid;

    // Hanya update icon jika ini adalah playlist yang sedang diputar
    if (coverPlaylistId === lastPlayedPlaylist) {
      cover.classList.add("playing");
      if (icon) icon.innerHTML = pauseIcon;
    } else {
      // Untuk playlist lain, pastikan icon play dan hilangkan class playing
      cover.classList.remove("playing");
      if (icon) icon.innerHTML = playIcon;
    }
  });

  iconsTopResult();

  document.querySelectorAll(".music-wave.animate").forEach((wave) => {
    wave.classList.remove("paused");
  });
});

audioPlayer.addEventListener("pause", function () {
  const lastPlayedPlaylist = localStorage.getItem("lastPlayedPlaylist");
  const lastPlayedPage = localStorage.getItem("lastPlayedPage");
  const currentPage = getCurrentPageType();
  
  console.log('Audio pause - Context:', {
    lastPlayedPlaylist,
    lastPlayedPage,
    currentPage
  });

  // PERBAIKAN: Update icon hanya jika playlist yang diputar sesuai dengan halaman yang dibuka
  updatePlayPauseIconsBasedOnContext(lastPlayedPlaylist, lastPlayedPage, currentPage, true);

  // PERBAIKAN: Update state untuk semua halaman yang terbuka
  document.querySelectorAll('.page_playlist').forEach(playlistPage => {
    if (playlistPage.style.display === 'block') {
      const playlistId = playlistPage.querySelector('.listmusic')?.getAttribute('data-playlist');
      if (playlistId) {
        updatePlaylistIconState(playlistId);
      }
    }
  });

  // PERBAIKAN: Update state untuk halaman music yang terbuka
  document.querySelectorAll('.page_music').forEach(musicPage => {
    if (musicPage.style.display === 'block') {
      const musicId = musicPage.getAttribute("data-current-music")?.replace('music:', '');
      if (musicId) {
        updateMusicIconState(musicId);
      }
    }
  });

  // Update control play button (selalu)
  document.querySelectorAll(".svg-icon.control-play").forEach((icon) => {
    icon.innerHTML = playIcon;
  });

  // PERBAIKAN: Update cover playlist icons - HANYA yang sedang diputar
  document.querySelectorAll(".visual-card").forEach((cover) => {
    const wrapper = cover.querySelector(".svg-circle-wrapper");
    const icon = cover.querySelector(".playlistCover-play");
    const coverPlaylistId = wrapper?.dataset.playlistHashid;

    // Hanya update icon jika ini adalah playlist yang sedang diputar
    if (coverPlaylistId === lastPlayedPlaylist) {
      // Tetap pertahankan class playing, tapi ubah icon ke play
      cover.classList.add("playing");
      if (icon) icon.innerHTML = playIcon;
    } else {
      // Untuk playlist lain, pastikan icon play dan hilangkan class playing
      cover.classList.remove("playing");
      if (icon) icon.innerHTML = playIcon;
    }
  });

  iconsTopResult();

  document.querySelectorAll(".music-wave.animate").forEach((wave) => {
    wave.classList.add("paused");
  });
});




function playPlaylist(hashid, element) {
  const lastPlayedPlaylist = localStorage.getItem("lastPlayedPlaylist");
  const isSamePlaylist = hashid === lastPlayedPlaylist;
  const iconEl = element.querySelector(".playlistCover-play");

    var isMobile = isTrueMobile();

  // Cegah autoplay pada device mobile jika playlist berbeda
  if (isMobile && !isSamePlaylist) return;

  // Cegah propagasi jika dipakai dalam elemen onclick parent
  if (event) {
    event.stopPropagation();
    event.preventDefault();
  }

  // PERBAIKAN: Set lastPlayedPage ke 'home' karena diputar dari halaman home
  localStorage.setItem("lastPlayedPage", "home");

  if (isSamePlaylist) {
    if (audioPlayer.paused) {
      audioPlayer.play();
      iconEl.innerHTML = pauseIcon;
      // PERBAIKAN: Update semua icon yang sesuai
      updatePlayPauseIconsBasedOnContext(hashid, "home", "home", false);
    } else {
      const idAudio = currentPlayingId;
      const storageKey = `progress_${idAudio}_${hashid}`;
      localStorage.setItem(storageKey, audioPlayer.currentTime);
      audioPlayer.pause();
      iconEl.innerHTML = playIcon;
      // PERBAIKAN: Update semua icon yang sesuai
      updatePlayPauseIconsBasedOnContext(hashid, "home", "home", true);
    }
    const coverImg = element.closest(".coverImg");
    if (coverImg) coverImg.classList.add("playing");
    return;
  }

  // Playlist berbeda → fetch playlist & mainkan track pertama
  fetch(`/playlist/${hashid}`, {
    headers: { "X-Requested-With": "XMLHttpRequest" },
  })
    .then((response) => response.text())
    .then((html) => {
      const tempDiv = document.createElement("div");
      tempDiv.innerHTML = html;

      const tracks = Array.from(
        tempDiv.querySelectorAll(`.listmusic[data-playlist="${hashid}"]`)
      );
      if (!tracks.length) return;

      const trackToPlay = tracks[0];

      // Simpan playlist ke variabel global
      playlistTracks = tracks;
      currentTrackIndex = 0;
      currentPlayingPlaylist = hashid;

      // PERBAIKAN: Simpan ke localStorage dengan konteks yang benar
      localStorage.setItem("lastPlayedPlaylist", hashid);
      localStorage.setItem("currentTrackIndex", currentTrackIndex);
      localStorage.setItem("lastPlayedMusic", trackToPlay.dataset.src);
      localStorage.setItem("lastPlayedPage", "home"); // PERBAIKAN: Set ke 'home'

      localStorage.setItem(
        `playlistTracks_${hashid}`,
        JSON.stringify({
          playlistId: hashid,
          pageType: "home", // PERBAIKAN: Tambahkan pageType
          tracks: tracks.map((track) => ({
            src: track.dataset.src,
            id: track.dataset.id,
            title: track.dataset.title,
            artist: track.dataset.artist,
            cover: track.dataset.cover,
            playlist: track.dataset.playlist,
          })),
        })
      );

      // Set audio ke lagu pertama dan reset ke waktu 0
      const newSrc = trackToPlay.dataset.src;
      if (audioPlayer.src !== newSrc) {
        audioPlayer.src = newSrc;
      }

      // Wajib reset time ke 0
      audioPlayer.currentTime = 0;

      // Play setelah audio siap
      audioPlayer.addEventListener("loadedmetadata", function handleLoaded() {
        audioPlayer.currentTime = 0; // ulangi untuk jaga-jaga
        audioPlayer.play()
          .then(() => {
            iconEl.innerHTML = pauseIcon;
            
            // PERBAIKAN: Update state dan UI dengan benar
            currentPlayingItem = trackToPlay;
            currentPlayingId = trackToPlay.dataset.src;
            
            // PERBAIKAN: Panggil updatePlaybackUI untuk update semua icon
            updatePlaybackUI(trackToPlay, trackToPlay.dataset.src, hashid, trackToPlay.dataset.id, "next", "home");
            
            // PERBAIKAN: Update semua icon yang sesuai
            updatePlayPauseIconsBasedOnContext(hashid, "home", "home", false);
          })
          .catch((err) => console.error("Gagal play:", err));
        
        audioPlayer.removeEventListener("loadedmetadata", handleLoaded);
      });

      // Tetap jalankan trackClicked untuk update UI jika diperlukan
      trackClicked(trackToPlay, "next", true);

      // Render ulang playlist__container jika ada
      const playlistContainer = document.querySelector(".playlist__container");
      const newContainer = tempDiv.querySelector(".playlist__container");
      if (playlistContainer && newContainer) {
        playlistContainer.innerHTML = newContainer.innerHTML;
      }

      // Highlight cover yang sedang dimainkan
      document.querySelectorAll(".coverImg.playing").forEach((el) => {
        el.classList.remove("playing");
      });
      const coverImg = element.closest(".coverImg");
      if (coverImg) coverImg.classList.add("playing");

      // PERBAIKAN: Update semua visual cards
      document.querySelectorAll(".visual-card").forEach((card) => {
        const wrapper = card.querySelector(".svg-circle-wrapper");
        const icon = card.querySelector(".playlistCover-play");
        const coverPlaylistId = wrapper?.dataset.playlistHashid;

        if (coverPlaylistId === hashid) {
          card.classList.add("playing");
          if (icon) icon.innerHTML = pauseIcon;
        } else {
          card.classList.remove("playing");
          if (icon) icon.innerHTML = playIcon;
        }
      });

    })
    .catch((error) => {
      console.error("Gagal load playlist:", error);
    });
}

function playCustomPlaylist(hashid, element, event = null) {
  const lastPlayedPlaylist = localStorage.getItem("lastPlayedPlaylist");
  const isSamePlaylist = hashid === lastPlayedPlaylist;
  const iconEl = element ? element.querySelector(".playlistCover-play") : null;
  var isMobile = isTrueMobile();

  // Cegah autoplay pada device mobile jika playlist berbeda
  if (isMobile && !isSamePlaylist) return;

  // Cegah propagasi jika dipakai dalam elemen onclick parent
  if (event) {
    event.stopPropagation();
    event.preventDefault();
  }

  // PERBAIKAN: Set lastPlayedPage ke 'home' karena diputar dari halaman home
  localStorage.setItem("lastPlayedPage", "home");

  if (isSamePlaylist) {
    if (audioPlayer.paused) {
      audioPlayer.play();
      if (iconEl) iconEl.innerHTML = pauseIcon;
      // PERBAIKAN: Update semua icon yang sesuai
      updatePlayPauseIconsBasedOnContext(hashid, "home", "home", false);
    } else {
      const idAudio = currentPlayingId;
      const storageKey = `progress_${idAudio}_${hashid}`;
      localStorage.setItem(storageKey, audioPlayer.currentTime);
      audioPlayer.pause();
      if (iconEl) iconEl.innerHTML = playIcon;
      // PERBAIKAN: Update semua icon yang sesuai
      updatePlayPauseIconsBasedOnContext(hashid, "home", "home", true);
    }
    const coverImg = element ? element.closest(".coverImg") : null;
    if (coverImg) coverImg.classList.add("playing");
    return;
  }

  // Playlist berbeda → fetch playlist & mainkan track pertama
  fetch(`/custom/${hashid}`, {
    headers: { "X-Requested-With": "XMLHttpRequest" },
  })
    .then((response) => response.text())
    .then((html) => {
      const tempDiv = document.createElement("div");
      tempDiv.innerHTML = html;

      const tracks = Array.from(
        tempDiv.querySelectorAll(`.listmusic[data-playlist="${hashid}"]`)
      );
      
      // PERBAIKAN: Coba alternatif selector untuk custom playlist
      if (!tracks.length) {
        const altTracks = Array.from(
          tempDiv.querySelectorAll(`.listmusic`)
        );
        // Filter tracks yang memiliki data-item="custom_playlist" atau playlist yang sesuai
        const filteredTracks = altTracks.filter(track => 
          track.dataset.item === 'custom_playlist' || 
          (track.dataset.playlist && track.dataset.playlist === hashid)
        );
        
        if (filteredTracks.length) {
          console.log(`Found ${filteredTracks.length} tracks using alternative selector`);
          tracks.push(...filteredTracks);
        }
      }

      if (!tracks.length) {
        console.error('No tracks found for custom playlist:', hashid);
        return;
      }

      const trackToPlay = tracks[0];

      // Simpan playlist ke variabel global
      playlistTracks = tracks;
      currentTrackIndex = 0;
      currentPlayingPlaylist = hashid;

      // PERBAIKAN: Simpan ke localStorage dengan konteks yang benar
      localStorage.setItem("lastPlayedPlaylist", hashid);
      localStorage.setItem("currentTrackIndex", currentTrackIndex);
      localStorage.setItem("lastPlayedMusic", trackToPlay.dataset.src);
      localStorage.setItem("lastPlayedPage", "home"); // PERBAIKAN: Set ke 'home'

      // Simpan data track untuk digunakan nanti
      localStorage.setItem(
        `playlistTracks_${hashid}`,
        JSON.stringify({
          playlistId: hashid,
          pageType: "home", // PERBAIKAN: Tambahkan pageType seperti di playPlaylist
          playlistType: "custom", // PERBAIKAN: Tambahkan playlistType untuk custom
          tracks: tracks.map((track) => ({
            src: track.dataset.src,
            id: track.dataset.id,
            title: track.dataset.title,
            artist: track.dataset.artist,
            cover: track.dataset.cover,
            playlist: track.dataset.playlist || hashid,
            playlist_original: track.dataset.playlistOriginal,
            lyric: track.dataset.lyric,
            line_durations: track.dataset.lineDurations || track.dataset['line-durations'],
            artist_ids: track.dataset.artistIds || track.dataset['artist-ids'],
            artist_hashids: track.dataset.artistHashids || track.dataset['artist-hashids'],
            album_id: track.dataset.albumId || track.dataset['album-id'],
            playlist_name: track.dataset.playlistName || track.dataset['playlist_name'],
            item_type: track.dataset.item || 'custom_playlist'
          })),
        })
      );

      // Set audio ke lagu pertama dan reset ke waktu 0
      const newSrc = trackToPlay.dataset.src;
      if (audioPlayer.src !== newSrc) {
        audioPlayer.src = newSrc;
      }

      // Wajib reset time ke 0
      audioPlayer.currentTime = 0;

      // Play setelah audio siap
      audioPlayer.addEventListener("loadedmetadata", function handleLoaded() {
        audioPlayer.currentTime = 0; // ulangi untuk jaga-jaga
        audioPlayer.play()
          .then(() => {
            if (iconEl) iconEl.innerHTML = pauseIcon;
            
            // PERBAIKAN: Update state dan UI dengan benar
            currentPlayingItem = trackToPlay;
            currentPlayingId = trackToPlay.dataset.src;
            
            // PERBAIKAN: Panggil updatePlaybackUI untuk update semua icon (seperti di playPlaylist)
            updatePlaybackUI(trackToPlay, trackToPlay.dataset.src, hashid, trackToPlay.dataset.id, "next", "home");
            
            // PERBAIKAN: Update semua icon yang sesuai
            updatePlayPauseIconsBasedOnContext(hashid, "home", "home", false);
            
            // Update recent activity jika user login
            const userId = getCurrentUserId();
            if (userId) {
              // Untuk custom playlist, gunakan item_type = 'custom_playlist' dan item_id = hashid (tanpa prefix C)
              const itemId = hashid.startsWith('C') ? hashid.substring(1) : hashid;
              sendRecentActivity(trackToPlay.dataset.id, 'custom_playlist', itemId);
            }
          })
          .catch((err) => {
            console.error("Gagal play custom playlist:", err);
            // Fallback: coba trackClicked langsung
            if (trackToPlay) {
              trackClicked(trackToPlay, "next", true);
            }
          });
        
        audioPlayer.removeEventListener("loadedmetadata", handleLoaded);
      }, { once: true }); // PERBAIKAN: Tambahkan { once: true } seperti di playPlaylist

      // Tetap jalankan trackClicked untuk update UI jika diperlukan
      if (trackToPlay) {
        trackClicked(trackToPlay, "next", true);
      }

      // Render ulang playlist__container jika ada
      const playlistContainer = document.querySelector(".playlist__container");
      const newContainer = tempDiv.querySelector(".playlist__container");
      if (playlistContainer && newContainer) {
        playlistContainer.innerHTML = newContainer.innerHTML;
      }

      // Highlight cover yang sedang dimainkan
      document.querySelectorAll(".coverImg.playing").forEach((el) => {
        el.classList.remove("playing");
      });
      const coverImg = element ? element.closest(".coverImg") : null;
      if (coverImg) coverImg.classList.add("playing");

      // PERBAIKAN: Update semua visual cards (sesuai dengan playPlaylist)
      document.querySelectorAll(".visual-card").forEach((card) => {
        const wrapper = card.querySelector(".svg-circle-wrapper");
        const icon = card.querySelector(".playlistCover-play");
        const coverPlaylistId = wrapper?.dataset.playlistHashid;

        if (coverPlaylistId === hashid) {
          card.classList.add("playing");
          if (icon) icon.innerHTML = pauseIcon;
        } else {
          card.classList.remove("playing");
          if (icon) icon.innerHTML = playIcon;
        }
      });

    })
    .catch((error) => {
      console.error("Gagal load custom playlist:", error);
      
      // Fallback: Coba langsung play track pertama dari localStorage jika tersedia
      const savedTracks = localStorage.getItem(`playlistTracks_${hashid}`);
      if (savedTracks) {
        try {
          const parsed = JSON.parse(savedTracks);
          if (parsed.tracks && parsed.tracks.length > 0) {
            const firstTrack = parsed.tracks[0];
            // Buat virtual track element
            const virtualTrack = createVirtualTrack(firstTrack);
            if (virtualTrack) {
              trackClicked(virtualTrack, "next", true);
              if (iconEl) iconEl.innerHTML = pauseIcon;
              console.log("Using fallback from localStorage");
            }
          }
        } catch (e) {
          console.error("Error parsing saved tracks:", e);
        }
      }
    });
}

function buttonTop50() {
  const lastPlayedPlaylist = localStorage.getItem("lastPlayedPlaylist");
  const top50PlaylistId = "top50";
  const isSamePlaylist = top50PlaylistId === lastPlayedPlaylist;
  const lastPlayedMusic = localStorage.getItem("lastPlayedMusic");
  
  // Cari semua tracks di halaman Top 50
  const tracks = document.querySelectorAll('.page_top50 .listmusic');
  if (tracks.length === 0) {
    console.log('No tracks found on Top 50 page');
    return;
  }
  
  // Cari icon playlist play button
  const iconEl = document.querySelector('.page_top50 .playlist-play');
  
  if (isSamePlaylist && lastPlayedMusic) {
    // Jika playlist sama DAN ada musik yang sedang diputar
    if (audioPlayer.paused) {
      // Resume musik yang sedang diputar (tidak mulai dari awal)
      audioPlayer.play();
      if (iconEl) iconEl.innerHTML = pauseIcon;
      console.log('Resuming playback for Top 50');
    } else {
      // Pause musik yang sedang diputar
      const idAudio = currentPlayingId;
      const storageKey = `progress_${idAudio}_${top50PlaylistId}`;
      localStorage.setItem(storageKey, audioPlayer.currentTime);
      audioPlayer.pause();
      if (iconEl) iconEl.innerHTML = playIcon;
      console.log('Pausing playback for Top 50');
    }
    
    // Update semua play/pause icons
    updatePlayPauseIconsBasedOnContext(top50PlaylistId, "top50", "top50", audioPlayer.paused);
    return;
  }
  
  // Playlist berbeda → cari track yang sesuai
  let targetTrack;
  
  if (lastPlayedMusic && isSamePlaylist) {
    // Cari track yang sedang diputar (jika ada di halaman ini)
    targetTrack = Array.from(tracks).find(track => 
      track.getAttribute("data-src") === lastPlayedMusic
    );
  }
  
  // Jika tidak ditemukan, gunakan track pertama
  if (!targetTrack) {
    targetTrack = tracks[0];
    console.log('Starting Top 50 from first track:', targetTrack.getAttribute('data-title'));
  } else {
    console.log('Resuming Top 50 from existing track:', targetTrack.getAttribute('data-title'));
  }
  
  // Set atribut data yang diperlukan
  targetTrack.setAttribute('data-playlist', top50PlaylistId);
  targetTrack.setAttribute('data-playlist-original', top50PlaylistId);
  targetTrack.setAttribute('data-item', 'music');
  
  // Simpan playlist ke variabel global
  playlistTracks = Array.from(tracks);
  
  // Cari index track yang akan diputar
  currentTrackIndex = Array.from(tracks).findIndex(track => 
    track.getAttribute("data-src") === targetTrack.getAttribute("data-src")
  );
  
  if (currentTrackIndex === -1) currentTrackIndex = 0;
  
  currentPlayingPlaylist = top50PlaylistId;
  
  // Simpan ke localStorage
  localStorage.setItem("lastPlayedPlaylist", top50PlaylistId);
  localStorage.setItem("currentTrackIndex", currentTrackIndex);
  localStorage.setItem("lastPlayedMusic", targetTrack.dataset.src);
  localStorage.setItem("lastPlayedPage", "top50");
  
  // Simpan tracks ke localStorage untuk konsistensi
  localStorage.setItem(
    `playlistTracks_${top50PlaylistId}`,
    JSON.stringify({
      playlistId: top50PlaylistId,
      pageType: "top50",
      tracks: playlistTracks.map((track) => ({
        src: track.dataset.src,
        id: track.dataset.id,
        title: track.dataset.title,
        artist: track.dataset.artist,
        cover: track.dataset.cover,
        playlist: track.dataset.playlist || top50PlaylistId,
        playlist_original: track.dataset.playlistOriginal || top50PlaylistId,
      })),
    })
  );
  
  // Update icon sebelum play
  if (iconEl) iconEl.innerHTML = pauseIcon;
  
  // Panggil trackClicked dengan parameter yang tepat
  // forcePlay = true jika playlist berbeda atau ingin mulai dari awal
  const shouldForcePlay = !isSamePlaylist || (isSamePlaylist && !lastPlayedMusic);
  trackClicked(targetTrack, "next", shouldForcePlay);
  
  console.log('Top 50 playback started with forcePlay:', shouldForcePlay);
}

function buttonMostPlayed() {
  const lastPlayedPlaylist = localStorage.getItem("lastPlayedPlaylist");
  const mostPlayedPlaylistId = "mostplayed";
  const isSamePlaylist = mostPlayedPlaylistId === lastPlayedPlaylist;
  const lastPlayedMusic = localStorage.getItem("lastPlayedMusic");
  
  // Cari semua tracks di halaman Most Played
  const tracks = document.querySelectorAll('.page_mostplayed .listmusic');
  if (tracks.length === 0) {
    console.log('No tracks found on Most Played page');
    return;
  }
  
  // Cari icon playlist play button
  const iconEl = document.querySelector('.page_mostplayed .playlist-play');
  
  if (isSamePlaylist && lastPlayedMusic) {
    // Jika playlist sama DAN ada musik yang sedang diputar
    if (audioPlayer.paused) {
      // Resume musik yang sedang diputar
      audioPlayer.play();
      if (iconEl) iconEl.innerHTML = pauseIcon;
      console.log('Resuming playback for Most Played');
    } else {
      // Pause musik yang sedang diputar
      const idAudio = currentPlayingId;
      const storageKey = `progress_${idAudio}_${mostPlayedPlaylistId}`;
      localStorage.setItem(storageKey, audioPlayer.currentTime);
      audioPlayer.pause();
      if (iconEl) iconEl.innerHTML = playIcon;
      console.log('Pausing playback for Most Played');
    }
    
    // Update semua play/pause icons
    updatePlayPauseIconsBasedOnContext(mostPlayedPlaylistId, "mostplayed", "mostplayed", audioPlayer.paused);
    return;
  }
  
  // Playlist berbeda → cari track yang sesuai
  let targetTrack;
  
  if (lastPlayedMusic && isSamePlaylist) {
    // Cari track yang sedang diputar (jika ada di halaman ini)
    targetTrack = Array.from(tracks).find(track => 
      track.getAttribute("data-src") === lastPlayedMusic
    );
  }
  
  // Jika tidak ditemukan, gunakan track pertama
  if (!targetTrack) {
    targetTrack = tracks[0];
    console.log('Starting Most Played from first track:', targetTrack.getAttribute('data-title'));
  } else {
    console.log('Resuming Most Played from existing track:', targetTrack.getAttribute('data-title'));
  }
  
  // Set atribut data yang diperlukan
  targetTrack.setAttribute('data-playlist', mostPlayedPlaylistId);
  targetTrack.setAttribute('data-playlist-original', mostPlayedPlaylistId);
  targetTrack.setAttribute('data-item', 'music');
  
  // Simpan playlist ke variabel global
  playlistTracks = Array.from(tracks);
  
  // Cari index track yang akan diputar
  currentTrackIndex = Array.from(tracks).findIndex(track => 
    track.getAttribute("data-src") === targetTrack.getAttribute("data-src")
  );
  
  if (currentTrackIndex === -1) currentTrackIndex = 0;
  
  currentPlayingPlaylist = mostPlayedPlaylistId;
  
  // Simpan ke localStorage
  localStorage.setItem("lastPlayedPlaylist", mostPlayedPlaylistId);
  localStorage.setItem("currentTrackIndex", currentTrackIndex);
  localStorage.setItem("lastPlayedMusic", targetTrack.dataset.src);
  localStorage.setItem("lastPlayedPage", "mostplayed");
  
  // Simpan tracks ke localStorage untuk konsistensi
  localStorage.setItem(
    `playlistTracks_${mostPlayedPlaylistId}`,
    JSON.stringify({
      playlistId: mostPlayedPlaylistId,
      pageType: "mostplayed",
      tracks: playlistTracks.map((track) => ({
        src: track.dataset.src,
        id: track.dataset.id,
        title: track.dataset.title,
        artist: track.dataset.artist,
        cover: track.dataset.cover,
        playlist: track.dataset.playlist || mostPlayedPlaylistId,
        playlist_original: track.dataset.playlistOriginal || mostPlayedPlaylistId,
      })),
    })
  );
  
  // Update icon sebelum play
  if (iconEl) iconEl.innerHTML = pauseIcon;
  
  // Panggil trackClicked dengan parameter yang tepat
  // forcePlay = true jika playlist berbeda atau ingin mulai dari awal
  const shouldForcePlay = !isSamePlaylist || (isSamePlaylist && !lastPlayedMusic);
  trackClicked(targetTrack, "next", shouldForcePlay);
  
  console.log('Most Played playback started with forcePlay:', shouldForcePlay);
}



function loadPlaylistTracks(playlistId) {
  // Coba dari localStorage dulu
  const savedData = localStorage.getItem(`playlistTracks_${playlistId}`);
  if (savedData) {
    const data = JSON.parse(savedData);
    if (data.playlistId === playlistId) {
      playlistTracks = data.tracks.map((trackData) => {
        // Cari elemen yang sesuai di DOM
        const existingTrack = document.querySelector(
          `.listmusic[data-src="${trackData.src}"][data-playlist="${playlistId}"]`
        );

        if (existingTrack) return existingTrack;

        // Buat elemen virtual jika tidak ditemukan
        const virtualTrack = document.createElement("div");
        virtualTrack.className = "listmusic virtual-track";
        virtualTrack.dataset.src = trackData.src;
        virtualTrack.dataset.id = trackData.id;
        virtualTrack.dataset.playlist = playlistId;
        virtualTrack.dataset.title = trackData.title;
        virtualTrack.dataset.artist = trackData.artist;
        virtualTrack.dataset.cover = trackData.cover;
        return virtualTrack;
      });

      return;
    }
  }

  // Jika tidak ada di localStorage, fetch dari server
  fetch(`/playlist/${playlistId}`, {
    headers: { "X-Requested-With": "XMLHttpRequest" },
  })
    .then((response) => response.text())
    .then((html) => {
      const tempDiv = document.createElement("div");
      tempDiv.innerHTML = html;

      playlistTracks = Array.from(
        tempDiv.querySelectorAll(`.listmusic[data-playlist="${playlistId}"]`)
      );
      currentTrackIndex = 0;

      // Simpan ke localStorage
      localStorage.setItem(
        `playlistTracks_${playlistId}`,
        JSON.stringify({
          playlistId: playlistId,
          tracks: playlistTracks.map((track) => ({
            src: track.dataset.src,
            id: track.dataset.id,
            title: track.dataset.title,
            artist: track.dataset.artist,
            cover: track.dataset.cover,
          })),
        })
      );
    })
    .catch((error) => {
      console.error("Gagal load playlist:", error);
    });
}

function getCurrentPageType() {
  if (document.querySelector('.page_playlist')?.style.display === 'block') {
    return 'playlist';
  } else if (document.querySelector('.page_artist')?.style.display === 'block') {
    return 'artist';
  } else if (document.querySelector('.page_album')?.style.display === 'block') {
    return 'album';
  } else if (document.querySelector('.page_music')?.style.display === 'block') {
    return 'music';
  } else if (document.querySelector('.page_fav_music')?.style.display === 'block') {
    return 'fav_music';
  } else if (document.querySelector('.page_home')?.style.display === 'block') {
    return 'home';
  } else if (document.querySelector('.page_top50')?.style.display === 'block') { // TAMBAHKAN
    return 'top50';
  } else if (document.querySelector('.page_mostplayed')?.style.display === 'block') {
    return 'mostplayed';
  }
  return null;
}


function getCurrentPagePlaylistId() {
  const currentPage = getCurrentPageType();
  let playlistId = null;
  
  switch (currentPage) {
    case 'playlist':
      playlistId = document.querySelector('.page_playlist .listmusic')?.getAttribute('data-playlist');
      break;
    case 'artist':
      playlistId = document.querySelector('.page_artist .listmusic')?.getAttribute('data-playlist');
      break;
    case 'album':
      playlistId = document.querySelector('.page_album .listmusic')?.getAttribute('data-playlist');
      break;
    case 'music':
      // PERBAIKAN: Untuk halaman music, ambil dari track yang ada
      playlistId = document.querySelector('.page_music .listmusic')?.getAttribute('data-playlist');
      break;
    case 'fav_music':
      playlistId = document.querySelector('.page_fav_music .listmusic')?.getAttribute('data-playlist');
      break;
    case 'top50': // TAMBAHKAN
      playlistId = document.querySelector('.page_top50 .listmusic')?.getAttribute('data-playlist') || 'top50';
      break;
    case 'mostplayed':
      playlistId = document.querySelector('.page_mostplayed .listmusic')?.getAttribute('data-playlist') || 'mostplayed';
      break;
  }
  
  console.log('getCurrentPagePlaylistId:', { currentPage, playlistId });
  return playlistId;
}



function resetAllPlayIcons() {
  // Reset semua icon di semua halaman ke play
  document.querySelectorAll(".page_playlist .svg-icon.playlist-play").forEach((icon) => {
    icon.innerHTML = playIcon;
  });
  document.querySelectorAll(".page_artist .svg-icon.playlist-play").forEach((icon) => {
    icon.innerHTML = playIcon;
  });
  document.querySelectorAll(".page_album .svg-icon.playlist-play").forEach((icon) => {
    icon.innerHTML = playIcon;
  });
  document.querySelectorAll(".page_music .svg-icon.playlist-play").forEach((icon) => {
    icon.innerHTML = playIcon;
  });
  document.querySelectorAll(".page_fav_music .svg-icon.playlist-play").forEach((icon) => {
    icon.innerHTML = playIcon;
  });
  document.querySelectorAll(".page_top50 .svg-icon.playlist-play").forEach((icon) => {
    icon.innerHTML = playIcon;
  });
  document.querySelectorAll(".page_mostplayed .svg-icon.playlist-play").forEach((icon) => {
    icon.innerHTML = playIcon;
  });
}



function updatePlayPauseIconsBasedOnContext(playingPlaylist, playingPage, currentPage, isPaused) {
  const currentPagePlaylistId = getCurrentPagePlaylistId();
  
  console.log('updatePlayPauseIconsBasedOnContext:', {
    playingPlaylist,
    playingPage,
    currentPage,
    currentPagePlaylistId,
    isPaused
  });

  resetAllPlayIcons();

  const iconHTML = isPaused ? playIcon : pauseIcon;

  // PERBAIKAN: Handle khusus untuk halaman home
  if (currentPage === 'home') {
    document.querySelectorAll(".visual-card").forEach((card) => {
      const wrapper = card.querySelector(".svg-circle-wrapper");
      const icon = card.querySelector(".playlistCover-play");
      const coverPlaylistId = wrapper?.dataset.playlistHashid;

      if (coverPlaylistId === playingPlaylist) {
        card.classList.toggle("playing", !isPaused);
        if (icon) icon.innerHTML = iconHTML;
      } else {
        card.classList.remove("playing");
        if (icon) icon.innerHTML = playIcon;
      }
    });
  }

  // Update icon di halaman lainnya hanya jika konteks sesuai
  if (playingPlaylist && currentPagePlaylistId && 
      playingPlaylist === currentPagePlaylistId && 
      playingPage === currentPage) {
    
    switch (currentPage) {
      case 'playlist':
        document.querySelectorAll(".page_playlist .svg-icon.playlist-play").forEach((icon) => {
          icon.innerHTML = iconHTML;
        });
        break;
      case 'artist':
        document.querySelectorAll(".page_artist .svg-icon.playlist-play").forEach((icon) => {
          icon.innerHTML = iconHTML;
        });
        break;
      case 'album':
        document.querySelectorAll(".page_album .svg-icon.playlist-play").forEach((icon) => {
          icon.innerHTML = iconHTML;
        });
        break;
      case 'music':
        document.querySelectorAll(".page_music .svg-icon.playlist-play").forEach((icon) => {
          icon.innerHTML = iconHTML;
        });
        break;
      case 'fav_music':
        document.querySelectorAll(".page_fav_music .svg-icon.playlist-play").forEach((icon) => {
          icon.innerHTML = iconHTML;
        });
        break;
      case 'top50': // TAMBAHKAN
        document.querySelectorAll(".page_top50 .svg-icon.playlist-play").forEach((icon) => {
          icon.innerHTML = iconHTML;
        });
        break;
    }
    
    console.log(`Updated ${currentPage} icons to: ${isPaused ? 'play' : 'pause'}`);
  } else {
    console.log('Skipped icon update - context mismatch', {
      playingPlaylist,
      currentPagePlaylistId,
      playingPage,
      currentPage
    });
  }
}