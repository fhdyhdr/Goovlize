document.addEventListener('DOMContentLoaded', function() {

    updateCurrentDate();
    initializeSidebar();
    
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

  var isMobile = isTrueMobile();
  var root = document.documentElement;
  
  if (isMobile) {
    root.style.setProperty("--device", "mobile");
  } else {
    root.style.setProperty("--device", "desktop");
  }

function updateCurrentDate() {
    const dateElement = document.getElementById('currentDate');
    const now = new Date();
    const options = { 
        weekday: 'long', 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
    };
    dateElement.textContent = now.toLocaleDateString('en-US', options);
}

function initializeSidebar() {
    const sidebar = document.getElementById('musicSidebar');
    const sidebarToggleBtn = document.getElementById('sidebarToggleBtn');
    const sidebarCloseBtn = document.getElementById('sidebarCloseBtn');
    
    sidebarToggleBtn.addEventListener('click', function() {
        sidebar.classList.add('active');
        document.body.style.overflow = 'hidden';
    });
    
    sidebarCloseBtn.addEventListener('click', function() {
        sidebar.classList.remove('active');
        document.body.style.overflow = 'auto';
    });
    
    // Close sidebar when clicking outside on mobile
    document.addEventListener('click', function(event) {
        if (window.innerWidth <= 992) {
            if (!sidebar.contains(event.target) && 
                !sidebarToggleBtn.contains(event.target) && 
                sidebar.classList.contains('active')) {
                sidebar.classList.remove('active');
                document.body.style.overflow = 'auto';
            }
        }
    });
    
    // Handle window resize
    window.addEventListener('resize', function() {
        if (window.innerWidth > 992) {
            sidebar.classList.remove('active');
            document.body.style.overflow = 'auto';
        }
    });
}


function addMusic() {
    const popup = document.querySelector('.addMusicPopup');
    const popupContent = popup.querySelector('.popup-content');
    var isMobile = isTrueMobile();

    // Reset form dan data sebelum memuat
    resetForm();
    
    // Load data artist dan album via AJAX
    loadArtistAndAlbumData();

    if (isMobile) {
      popup.style.display = 'block';
      setTimeout(() => {
        popup.classList.add('active');
        if (popupContent) {
          popupContent.style.transform = 'translateY(0)';
        }
      }, 10);
    } else {
      $(".addMusicPopup").show();
      $(".addMusicPopup").addClass("active");
      $(".addMusicPopup .popup-overlay").removeClass("fadeOut").addClass("fadeIn");
    }
}

// Fungsi untuk memuat data artist dan album dari server
async function loadArtistAndAlbumData() {
    try {
        // Kirim request ke server
        const response = await fetch('/admin/music/get-artists-albums', {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
            }
        });
        
        if (!response.ok) {
            throw new Error('Failed to load data');
        }
        
        const data = await response.json();
        
        // Update data artist
        window.artistsData = data.artists || [];
        window.albumsData = data.albums || [];
        
        // Update dropdown options
        populateArtistOptions();
        populateAlbumOptions();
        
    } catch (error) {
        console.error('Error loading artist/album data:', error);
        // Tampilkan option default jika gagal
        const artistOptions = document.getElementById('artistOptions');
        const albumOptions = document.getElementById('albumOptions');
        
        artistOptions.innerHTML = `
            <div class="select-option error-option">
                <i class="fas fa-exclamation-circle"></i> Failed to load artists
            </div>
        `;
        
        albumOptions.innerHTML = `
            <div class="select-option error-option">
                <i class="fas fa-exclamation-circle"></i> Failed to load albums
            </div>
        `;
    }
}

// Fungsi untuk reset form
function resetForm() {
    // Reset selected data
    selectedArtists = [];
    selectedAlbum = null;
    activeDropdown = null;
    
    // Reset UI
    document.getElementById('artistTags').innerHTML = '';
    document.getElementById('albumTag').innerHTML = '';
    document.getElementById('artistSearch').value = '';
    document.getElementById('albumSearch').value = '';
    document.getElementById('audioFileInfo').style.display = 'none';
    document.getElementById('audioUploadArea').style.display = 'block';
    
    // Reset form fields
    document.getElementById('musicTitle').value = '';
    document.getElementById('musicLyrics').value = '';
    document.getElementById('titleCounter').textContent = '0';
    document.getElementById('lyricsCounter').textContent = '0';
    document.getElementById('titleError').textContent = '';
    document.getElementById('audioError').textContent = '';
    document.getElementById('playlistCoverUpload').value = '';
    document.getElementById('musicCoverPreview').src = '/uploads/undefine.jpg';
    
    // Hide add new option inputs
    document.getElementById('addNewArtist').style.display = 'none';
    document.getElementById('addNewAlbum').style.display = 'none';
    document.getElementById('newArtistName').value = '';
    document.getElementById('newAlbumName').value = '';
    
    // Close all dropdowns
    closeAllDropdowns();
}