// search.js

let recommendedTracks = [];
let currentRecommendedIndex = 0;
let currentPlayingGenres = [];
let playbackHistory = [];
let historyIndex = -1;

// Fungsi untuk menyimpan state ke localStorage
function savePlaybackState() {
  localStorage.setItem("playbackHistory", JSON.stringify(playbackHistory));
  localStorage.setItem("historyIndex", historyIndex.toString());
  localStorage.setItem(
    "currentPlayingGenres",
    JSON.stringify(currentPlayingGenres)
  );
}

// Fungsi untuk memuat state dari localStorage
function loadPlaybackState() {
  const savedHistory = localStorage.getItem("playbackHistory");
  const savedIndex = localStorage.getItem("historyIndex");
  const savedGenres = localStorage.getItem("currentPlayingGenres");

  if (savedHistory) playbackHistory = JSON.parse(savedHistory);
  if (savedIndex) historyIndex = parseInt(savedIndex);
  if (savedGenres) currentPlayingGenres = JSON.parse(savedGenres);
}

// Panggil saat inisialisasi
loadPlaybackState();

// search.js - Perbaikan fungsi searchClicked

async function searchClicked(clickedItem) {
  $(".music-player").show();
  const idAudio = clickedItem.getAttribute("data-src");
  const genres = clickedItem.getAttribute("data-genre")?.split(", ") || [];
  const idMusic = clickedItem.getAttribute("data-id");
  const lyric = clickedItem.getAttribute("data-lyric") || "";
  const lineDurations = clickedItem.getAttribute("data-line-durations") || clickedItem.getAttribute("data-lineDurations") || "";
  const idPlaylist = "SE"; // Search playlist selalu "SE"

  // Update state dengan genre yang sedang diputar
  currentPlayingGenres = genres;
  
  console.log('Search clicked - data:', {
    musicId: idMusic,
    genres,
    hasLyric: !!lyric,
    lyricLength: lyric.length,
    hasLineDurations: !!lineDurations,
    lineDurationsLength: lineDurations.length,
    playlist: idPlaylist
  });

  // PERBAIKAN: Cek apakah track ini sudah ada di history
  const existingIndex = playbackHistory.findIndex(track => track.idAudio === idAudio);
  
  if (existingIndex >= 0) {
    // Track sudah ada di history, gunakan index yang ada
    historyIndex = existingIndex;
    console.log('Track exists in history at index:', historyIndex);
  } else {
    // Track baru, tambahkan ke history
    const newTrack = {
      idAudio,
      idMusic,
      title: clickedItem.getAttribute("data-title"),
      artist: clickedItem.getAttribute("data-artist"),
      cover: clickedItem.getAttribute("data-cover"),
      genres,
      playlist: idPlaylist,
      lyric: lyric,
      lineDurations: lineDurations
    };
    
    // PERBAIKAN: Tambahkan di posisi setelah current index
    if (historyIndex >= 0 && historyIndex < playbackHistory.length - 1) {
      playbackHistory.splice(historyIndex + 1, 0, newTrack);
      historyIndex++;
    } else {
      // Jika di akhir atau kosong, tambahkan di akhir
      playbackHistory.push(newTrack);
      historyIndex = playbackHistory.length - 1;
    }
    
    console.log('Added new track to history at index:', historyIndex);
  }

  localStorage.setItem("lastMusicId", idMusic);
  savePlaybackState();

  // PERBAIKAN: Update semua icon play di search
  updatePlayButtonForSearch(idMusic, true);

  if (idAudio === currentPlayingId) {
    // Toggle play/pause jika track yang sama diklik
    if (audioPlayer.paused) {
      audioPlayer.play();
      updatePlayButtonForSearch(idMusic, true);
      
      // Update lyric screen jika terbuka
      if (document.querySelector('.page_lyric')?.style.display === 'block') {
        updateLyricsScreen();
      }
    } else {
      audioPlayer.pause();
      updatePlayButtonForSearch(idMusic, false);
      
      // Update lyric screen jika terbuka
      if (document.querySelector('.page_lyric')?.style.display === 'block') {
        updateLyricsScreen();
      }
    }
  } else {
    // Track baru
    document.querySelectorAll(".coverImg.playing, .listmusic.playing").forEach(el => {
      el.classList.remove("playing");
    });

    audioPlayer.pause();
    audioPlayer.src = idAudio;
    audioPlayer.currentTime = 0;
    
    // Set currentPlayingItem dengan data lyric dan line_durations
    currentPlayingItem = clickedItem;
    currentPlayingId = idAudio;
    currentPlayingPlaylist = idPlaylist;
    
    // Pastikan dataset lyric dan lineDurations tersedia
    if (lyric) {
      currentPlayingItem.dataset.lyric = lyric;
    }
    if (lineDurations) {
      currentPlayingItem.dataset.lineDurations = lineDurations;
    }
    
    // PERBAIKAN: Inisialisasi playlistTracks untuk search
    if (!playlistTracks.length || playlistTracks[0]?.dataset?.playlist !== idPlaylist) {
      // Cari semua track di hasil search
      playlistTracks = Array.from(document.querySelectorAll(`li.task-list-item[data-playlist="${idPlaylist}"]`));
      console.log('Initialized playlistTracks for search:', playlistTracks.length);
    }
    
    // PERBAIKAN: Cari atau tambahkan track ke playlistTracks
    currentTrackIndex = playlistTracks.findIndex(
      (el) => el.getAttribute('data-id') === idMusic
    );
    
    if (currentTrackIndex === -1) {
      console.log('Track not found in playlistTracks, adding it...');
      currentTrackIndex = playlistTracks.length;
      playlistTracks.push(clickedItem);
    }
    
    audioPlayer.play();
    
    // PERBAIKAN: Simpan tracks data ke localStorage seperti di trackClicked
    const tracksData = {
      playlistId: idPlaylist,
      pageType: 'search',
      tracks: playlistTracks.map((track) => ({
        src: track.getAttribute('data-src') || '',
        id: track.getAttribute('data-id') || '',
        title: track.getAttribute('data-title') || '',
        artist: track.getAttribute('data-artist') || '',
        cover: track.getAttribute('data-cover') || '',
        playlist: track.getAttribute('data-playlist') || idPlaylist,
        lyric: track.getAttribute('data-lyric') || '',
        line_durations: track.getAttribute('data-line-durations') || track.getAttribute('data-lineDurations') || '',
        artist_ids: track.getAttribute('data-artist-ids') || '',
        genre: track.getAttribute('data-genre') || ''
      })),
    };
    
    localStorage.setItem(`playlistTracks_${idPlaylist}`, JSON.stringify(tracksData));
    console.log('Saved search tracks to localStorage:', tracksData.tracks.length);
    
    datamusic();
    checkFavoriteStatus();

    // PERBAIKAN: Update highlight di search results
    clearPlayingSearchClass();
    
    const listItem = document.querySelector(`li.task-list-item[data-id="${idMusic}"]`);
    if (listItem) {
      const titleElement = listItem.querySelector('.track-title');
      const artistElement = listItem.querySelector('.track-artist');
      if (titleElement) titleElement.classList.add('playingSearch');
      if (artistElement) artistElement.classList.add('playingSearch');
    }

    localStorage.setItem("lastPlayedPlaylist", idPlaylist);
    localStorage.setItem("lastMusicId", idMusic);
    localStorage.setItem("lastPlayedMusic", idAudio);
    localStorage.setItem("currentTrackIndex", currentTrackIndex);
    localStorage.setItem("wasPlaying", "true");

    // PERBAIKAN: Update play button di element yang diklik
    const playButton = clickedItem.querySelector(".playMusicResult");
    if (playButton) {
      playButton.innerHTML = pauseIcon;
    }

    const coverImg = clickedItem.closest('.coverImg');
    if (coverImg) coverImg.classList.add("playing");
    
    // PERBAIKAN: Load rekomendasi setelah track diputar
    setTimeout(async () => {
      if (playbackHistory.length < 10) {
        await loadInitialRecommendations(genres, [idMusic, ...playbackHistory.map(t => t.idMusic)]);
      }
    }, 1000);
    
    // Update lyric screen jika terbuka
    const pageLyric = document.querySelector('.page_lyric');
    if (pageLyric && pageLyric.style.display === 'block') {
      displayLyricsScreen();
    }
    
    // PERBAIKAN: Kirim recent activity untuk search
    if (userId) {
      console.log('Sending recent activity for search:', {
        id_music: idMusic,
        item_type: 'music', // Search track adalah tipe music
        item_id: idMusic // Untuk search, item_id adalah id_music
      });
      sendRecentActivity(idMusic, 'music', idMusic);
    }
  }
}
// search.js - Perbaikan fungsi clearPlayingSearchClass

function clearPlayingSearchClass() {
  // Hapus playing class dari semua search items
  document.querySelectorAll("li.task-list-item .track-title.playingSearch, li.task-list-item .track-artist.playingSearch").forEach(el => {
    el.classList.remove("playingSearch");
  });
  
  // PERBAIKAN: Juga reset semua play icons ke play state
  document.querySelectorAll('.playMusicResult, .play-topResult').forEach(icon => {
    const parent = icon.closest('.task-list-item, .top-result');
    const musicId = parent?.getAttribute('data-id') || 
                   parent?.querySelector('[data-music-id]')?.getAttribute('data-music-id');
    
    if (musicId !== localStorage.getItem('lastMusicId')) {
      icon.innerHTML = playIcon;
    }
  });
}

async function loadInitialRecommendations(genres, exclude = []) {
  try {
    console.log('Loading recommendations for genres:', genres, 'excluding:', exclude);
    
    const response = await fetch("/recommendTrack", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        genres,
        exclude,
        limit: 10,
      }),
    });

    const tracks = await response.json();
    console.log('Recommended tracks received:', tracks.length);

    if (tracks.length === 0) {
      console.log('No recommendations found');
      return playbackHistory;
    }

    // Filter out tracks already in history
    const existingAudioIds = playbackHistory.map(track => track.idAudio);
    const newTracks = tracks.filter(track => !existingAudioIds.includes(track.audio));
    
    console.log('New tracks to add:', newTracks.length);
    
    // PERBAIKAN: Tambahkan di posisi setelah current track
    const insertIndex = historyIndex + 1;
    
    newTracks.forEach((track, index) => {
      const trackData = {
        idAudio: track.audio,
        idMusic: track.id,
        title: track.title,
        artist: track.artist,
        cover: track.image,
        genres: track.genre.split(", "),
        playlist: "SE",
      };
      
      // Insert setelah current track
      playbackHistory.splice(insertIndex + index, 0, trackData);
    });

    // PERBAIKAN: Tidak perlu sort ulang, biarkan dalam urutan yang direkomendasikan
    
    savePlaybackState();
    
    console.log('Updated history length:', playbackHistory.length);
    
    return playbackHistory;
  } catch (error) {
    console.error("Error loading initial recommendations:", error);
    return playbackHistory;
  }
}



// Fungsi untuk menghitung kesamaan genre
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


function playFromHistory(index, direction) {
  // PERBAIKAN: Pastikan index dalam range
  if (playbackHistory.length === 0) {
    console.log('No tracks in history');
    return;
  }
  
  index = (index + playbackHistory.length) % playbackHistory.length;
  
  const track = playbackHistory[index];
  console.log('Playing from history:', {
    index,
    direction,
    track: track.title,
    historyLength: playbackHistory.length
  });

  currentPlayingGenres = track.genres;
  historyIndex = index; // Update history index

  // Cari elemen yang sesuai di DOM
  const existingTrack = document.querySelector(
    `.listmusic[data-src="${track.idAudio}"][data-playlist="SE"]`
  );

  if (existingTrack) {
    console.log('Found existing track in DOM');
    // PERBAIKAN: Gunakan simulateTrackClick untuk konsistensi
    simulateTrackClickFromHistory(existingTrack, direction);
  } else {
    console.log('Creating virtual track');
    // Buat elemen virtual
    const virtualTrack = document.createElement("div");
    virtualTrack.className = "album-page__track listmusic";
    virtualTrack.dataset.src = track.idAudio;
    virtualTrack.dataset.id = track.idMusic;
    virtualTrack.dataset.cover = track.cover;
    virtualTrack.dataset.title = track.title;
    virtualTrack.dataset.artist = track.artist;
    virtualTrack.dataset.artistIds = track.artistIds || "";
    virtualTrack.dataset.genre = track.genres.join(", ");
    virtualTrack.dataset.playlist = "SE";
    virtualTrack.classList.add("virtual-track");

    simulateTrackClickFromHistory(virtualTrack, direction);
  }

  // Update Swiper jika ada
  if (mySwiper) {
    if (direction === "next") {
      mySwiper.slideNext();
    } else {
      mySwiper.slidePrev();
    }
  }
  
  changeBg();
  savePlaybackState();
}
function simulateTrackClickFromHistory(trackElement, direction = "next") {
  const idAudio = trackElement.getAttribute('data-src');
  const idMusic = trackElement.getAttribute('data-id');
  
  console.log('Simulating track click from history:', {
    idAudio,
    direction
  });

  // Update state
  currentPlayingItem = trackElement;
  currentPlayingId = idAudio;
  currentPlayingPlaylist = "SE";
  
  // Update localStorage
  localStorage.setItem("lastPlayedMusic", idAudio);
  localStorage.setItem("lastPlayedPlaylist", "SE");
  localStorage.setItem("lastMusicId", idMusic);
  localStorage.setItem("wasPlaying", "true");

  // Play audio
  audioPlayer.src = idAudio;
  audioPlayer.currentTime = 0;
  audioPlayer.play().catch(e => {
    console.error("Playback failed:", e);
  });

  // Update music player UI
  datamusic(direction);
  
  // PERBAIKAN: Update play button icon
  updatePlayButtonForSearch(idMusic, true);
  
  // Show player
  $(".music-player").show();
}

// Fungsi untuk update play button di search results
function updatePlayButtonForSearch(musicId, isPlaying) {
  // Update semua play button di search results
  document.querySelectorAll('.play-topResult').forEach(icon => {
    const button = icon.closest('button');
    const buttonMusicId = button?.getAttribute('data-id');
    
    if (buttonMusicId === musicId) {
      icon.innerHTML = isPlaying ? pauseIcon : playIcon;
    } else {
      icon.innerHTML = playIcon;
    }
  });
  
  // Update juga di list items
  document.querySelectorAll('.task-list-item .playMusicResult').forEach(icon => {
    const item = icon.closest('.task-list-item');
    const itemMusicId = item?.getAttribute('data-id');
    
    if (itemMusicId === musicId) {
      icon.innerHTML = isPlaying ? pauseIcon : playIcon;
    } else {
      icon.innerHTML = playIcon;
    }
  });
}
// Fungsi untuk memainkan track rekomendasi
function playRecommendedTrack(trackData, direction) {
  const tempTrack = document.createElement("div");
  tempTrack.className = "album-page__track listmusic";
  tempTrack.dataset.src = trackData.audio;
  tempTrack.dataset.id = trackData.id;
  tempTrack.dataset.cover = trackData.image;
  tempTrack.dataset.title = trackData.title;
  tempTrack.dataset.artist = trackData.artist;
  tempTrack.dataset.artistIds = trackData.artist_ids;
  tempTrack.dataset.genre = trackData.genre;
  tempTrack.dataset.playlist = "SE";
  tempTrack.classList.add("virtual-track");

  trackClicked(tempTrack, direction, true);
  if (direction === "next") {
    mySwiper.slideNext();
  } else {
    mySwiper.slidePrev();
  }
  changeBg();
}

// Fungsi untuk mencari rekomendasi berdasarkan kesamaan genre
async function findSimilarTracksByGenre(currentTrackId, currentGenres) {
  try {
    const response = await fetch("/recommendTrack", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        genres: currentGenres,
        exclude: [currentTrackId, ...playbackHistory.map(track => track.idMusic)],
        limit: 10,
      }),
    });

    const tracks = await response.json();
    
    // Urutkan berdasarkan kesamaan genre
    tracks.sort((a, b) => {
      const aGenres = a.genre?.split(", ") || [];
      const bGenres = b.genre?.split(", ") || [];
      
      const aMatches = countGenreMatches(aGenres, currentGenres);
      const bMatches = countGenreMatches(bGenres, currentGenres);
      
      return bMatches - aMatches;
    });

    return tracks;
  } catch (error) {
    console.error("Error finding similar tracks:", error);
    return [];
  }
}

function favTopResult(button, musicId) {
  if (!userId) {
    showLogin();
    return;
  }

  const heartIcon = button.querySelector(".heart-icon");
  if (!heartIcon) return;

  const isFilled = heartIcon.classList.contains("fa-solid");
  const musicIdNum = Number(musicId);

  // Simpan ke localStorage jika ingin sinkron
  localStorage.setItem("lastMusicId", musicIdNum);

  $.ajax({
    url: "/favorite_music",
    type: "POST",
    data: {
      id_music: musicIdNum,
      action: isFilled ? "remove" : "add"
    },
    dataType: "json",
    success: (response) => {
      if (response.success) {
        const newState = response.action === "added";

        // Update icon class
        heartIcon.classList.toggle("fa-solid", newState);
        heartIcon.classList.toggle("fa-regular", !newState);
        heartIcon.style.color = newState ? "#ffff" : "white";

        // Update all related heart icons
        updateAllHeartIcons(musicIdNum, newState);

        // Add animation when favorited
        if (newState) {
          heartIcon.classList.add("fave");
          const handleAnim = () => {
            heartIcon.classList.remove("fave");
            heartIcon.removeEventListener("animationend", handleAnim);
          };
          heartIcon.addEventListener("animationend", handleAnim);
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
      console.error("Favorite request failed:", error);
      showInfo("Failed to update favorite");
    }
  });
}

function updateAllHeartIcons(musicId, isFavorite) {
  // Update top result hearts
  document.querySelectorAll(`[data-music-id="${musicId}"] .heart-icon`).forEach(icon => {
      icon.classList.toggle('fa-regular', !isFavorite);
      icon.classList.toggle('fa-solid', isFavorite);
      icon.style.color = isFavorite ? "#ffff" : "white";
  });
  
  // Update footer hearts if it's the current playing track
  if (musicId == localStorage.getItem('lastMusicId')) {
      document.querySelectorAll('.heartFoot').forEach(icon => {
          icon.classList.toggle('far', !isFavorite);
          icon.classList.toggle('fas', isFavorite);
          icon.style.color = isFavorite ? "#ffff" : "white";
      });
  }
}

function updateTrackHeart(musicId, isFavorite) {
  // Update playlist track hearts
  document.querySelectorAll('.fav_playlist').forEach(heart => {
      const trackElement = heart.closest('.listmusic');
      if (trackElement && trackElement.getAttribute('data-id') == musicId) {
          heart.classList.toggle('far', !isFavorite);
          heart.classList.toggle('fas', isFavorite);
          heart.style.color = isFavorite ? "#ffff" : "";
      }
  });
}

function iconsTopResult() {
  const lastMusicId = localStorage.getItem('lastMusicId');
  const isPlaying = !audioPlayer.paused;
  
  // Update all play buttons
  document.querySelectorAll('.play-topResult').forEach(icon => {
      const button = icon.closest('button');
      const buttonMusicId = button.getAttribute('data-id');
      
      // Only update if this button is for the currently playing track
      if (buttonMusicId === lastMusicId) {
          icon.innerHTML = isPlaying ? pauseIcon : playIcon;
      } else {
          icon.innerHTML = playIcon; // Reset to play icon for other tracks
      }
  });
}