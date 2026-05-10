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

function isMobileDevice() {
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
}

// State management untuk overlay
let overlayState = {
  isVisible: false,
  isHiddenAfterAction: false
};

document.addEventListener('DOMContentLoaded', () => {
  // Setup observer untuk mendeteksi ketika popup muncul
  const observer = new MutationObserver((mutations) => {
    mutations.forEach((mutation) => {
      if (mutation.type === 'childList') {
        const userNameInput = document.getElementById('userName');
        if (userNameInput && !userNameInput.dataset.listenerAdded) {
          setupRealTimeValidation(userNameInput);
          userNameInput.dataset.listenerAdded = 'true';
        }
        
        // Setup click event untuk user-cover-preview di semua device
        const userCoverPreview = document.getElementById('userCoverPreviewContainer');
        if (userCoverPreview && !userCoverPreview.dataset.clickListenerAdded) {
          setupClickHandler(userCoverPreview);
          userCoverPreview.dataset.clickListenerAdded = 'true';
        }
      }
    });
  });

  // Mulai mengamati body
  observer.observe(document.body, {
    childList: true,
    subtree: true
  });
});

function setupRealTimeValidation(inputElement) {
  const errorElement = document.getElementById('errorusernm');
  
  inputElement.addEventListener('input', () => {
    if (inputElement.classList.contains('invalid')) {
      inputElement.classList.remove('invalid');
      if (errorElement) {
        errorElement.textContent = '';
      }
    }
  });
  
  inputElement.addEventListener('change', () => {
    if (inputElement.classList.contains('invalid')) {
      inputElement.classList.remove('invalid');
      if (errorElement) {
        errorElement.textContent = '';
      }
    }
  });
}

// Setup click handler untuk semua device
function setupClickHandler(container) {
  container.addEventListener('click', function(e) {
    // Jika bukan klik pada tombol upload/remove
    if (!e.target.closest('.upload-option')) {
      toggleOverlayVisibility();
    }
  });
}

// Function untuk toggle overlay visibility di semua device
function toggleOverlayVisibility() {
  const container = document.getElementById('userCoverPreviewContainer');
  const overlay = document.getElementById('coverUploadOverlay');
  
  if (!container || !overlay) return;
  
  if (overlayState.isHiddenAfterAction) {
    // Jika overlay sedang hidden setelah action, tampilkan kembali
    container.classList.remove('hide-overlay');
    container.classList.add('active');
    overlay.classList.add('show');
    overlayState.isVisible = true;
    overlayState.isHiddenAfterAction = false;
  } else {
    // Toggle biasa
    if (container.classList.contains('active')) {
      container.classList.remove('active');
      overlay.classList.remove('show');
      overlayState.isVisible = false;
    } else {
      container.classList.add('active');
      overlay.classList.add('show');
      overlayState.isVisible = true;
    }
  }
}

// Function untuk hide overlay setelah action di semua device
function hideOverlayAfterAction() {
  const container = document.getElementById('userCoverPreviewContainer');
  const overlay = document.getElementById('coverUploadOverlay');
  
  if (container && overlay) {
    container.classList.add('hide-overlay');
    container.classList.remove('active');
    overlay.classList.remove('show');
    overlayState.isVisible = false;
    overlayState.isHiddenAfterAction = true;
  }
}

// Function untuk close overlay (jika perlu di close manual)
function closeOverlay() {
  const container = document.getElementById('userCoverPreviewContainer');
  const overlay = document.getElementById('coverUploadOverlay');
  
  if (container && overlay) {
    container.classList.remove('active');
    overlay.classList.remove('show');
    overlayState.isVisible = false;
    // Reset state untuk action hiding
    overlayState.isHiddenAfterAction = false;
  }
}

async function editProfile(hashid) {
  // Simpan hashid ke global variable untuk digunakan nanti
  window.currentProfileHashid = hashid;
  
  if (userId) {
    const popup = document.querySelector('.editProfile');
    const popupContent = popup.querySelector('.popup-content');
    var isMobile = isTrueMobile();

    const userNameInput = document.getElementById('userName');
    const errorElement = document.getElementById('errorusernm');
    userNameInput.classList.remove('invalid');
    errorElement.textContent = '';
    
    // Reset remove photo flag
    const removePhotoFlag = document.getElementById('removePhotoFlag');
    removePhotoFlag.value = '0';
    
    // Reset overlay state
    overlayState = {
      isVisible: false,
      isHiddenAfterAction: false
    };
    
    try {
      const response = await fetch(`/profile/editprofile/${userId}`);
      const result = await response.json();
      
      if (!result.success) {
        throw new Error(result.message || 'Failed to load profile data');
      }
      
      const userData = result.data;
      
      // Isi form dengan data dari API
      const profileImage = document.getElementById('userCoverPreview');
      const defaultPhoto = '/uploads/profile/default/default_pp.jpg';
      const currentPhoto = userData.profile_image || '/uploads/undefine.jpg';
      
      // Set image source dengan fallback
      profileImage.src = currentPhoto;
      
      // Hapus class removing jika ada
      profileImage.classList.remove('removing');
      
      // Reset overlay di semua device
      const container = document.getElementById('userCoverPreviewContainer');
      if (container) {
        container.classList.remove('hide-overlay', 'active');
      }
      
      // Set nama dan ID
      document.getElementById('userName').value = userData.name || '';
      document.getElementById('userId').value = userData.id;
      
      // Reset file input
      const fileInput = document.getElementById('userCoverUpload');
      fileInput.value = '';
      
      // Tampilkan/sembunyikan tombol remove photo berdasarkan kondisi
      updateRemovePhotoButton(currentPhoto, defaultPhoto);
      
      // Setup event listener untuk file upload
      setupImageUpload();
      
      if (isMobile) {
        popup.style.display = 'block';
        setTimeout(() => {
          popup.classList.add('active');
          if (popupContent) {
            popupContent.style.transform = 'translateY(0)';
          }
        }, 10);
        setupMobileGestureControl('.editProfile');
      } else {
        $(".editProfile").show();
        $(".editProfile").addClass("active");
        $(".editProfile .popup-overlay").removeClass("fadeOut").addClass("fadeIn");
      }
      
    } catch (error) {
      console.error('Error loading edit profile:', error);
      showInfo('Failed to load profile data: ' + error.message, 'error');
    }
    
  } else {
    showLogin();
  }
}

function triggerCoverUpload() {
  document.getElementById('userCoverUpload').click();
}

function handleChangePhoto() {
  triggerCoverUpload();
  
  // Hide overlay setelah action di semua device
  hideOverlayAfterAction();
}

function handleRemovePhoto() {
  const removePhotoFlag = document.getElementById('removePhotoFlag');
  const profileImage = document.getElementById('userCoverPreview');
  const fileInput = document.getElementById('userCoverUpload');
  const defaultPhoto = '/uploads/profile/default/default_pp.jpg';
  const removePhotoButton = document.querySelector('.remove-photo-option');
  
  // Set flag untuk remove photo
  removePhotoFlag.value = '1';
  
  // Clear file input (HAPUS FILE YANG SUDAH DIPILIH)
  fileInput.value = '';
  
  // Preview default photo
  profileImage.src = defaultPhoto;
  
  // Tampilkan indikator bahwa photo akan dihapus
  profileImage.classList.add('removing');
  
  // Sembunyikan tombol remove photo karena sudah dalam mode remove
  if (removePhotoButton) {
    removePhotoButton.style.display = 'none';
  }
  
  // Tampilkan info
  showInfo('Profile photo marked for removal. Click "Save Changes" to apply.', 'info');
  
  // Hide overlay setelah action di semua device
  hideOverlayAfterAction();
}

function setupImageUpload() {
  const fileInput = document.getElementById('userCoverUpload');
  const imagePreview = document.getElementById('userCoverPreview');
  const defaultPhoto = '/uploads/profile/default/default_pp.jpg';
  
  // Hapus event listener lama jika ada
  const newFileInput = fileInput.cloneNode(true);
  fileInput.parentNode.replaceChild(newFileInput, fileInput);
  
  // Tambahkan event listener baru
  newFileInput.addEventListener('change', function(e) {
    const file = e.target.files[0];
    
    if (!file) return;
    
    // Validasi sederhana untuk tipe file
    if (!file.type.startsWith('image/')) {
      showInfo('Please select an image file', 'error');
      this.value = '';
      return;
    }
    
    // Validasi ukuran file (max 5MB)
    const maxSize = 5 * 1024 * 1024; // 5MB
    if (file.size > maxSize) {
      showInfo('Image is too large (max 5MB)', 'error');
      this.value = '';
      return;
    }
    
    // Reset remove photo flag karena user memilih foto baru
    const removePhotoFlag = document.getElementById('removePhotoFlag');
    removePhotoFlag.value = '0';
    
    // Hapus class removing jika ada
    imagePreview.classList.remove('removing');
    
    // Preview gambar
    const reader = new FileReader();
    reader.onload = function(e) {
      const newImageSrc = e.target.result;
      imagePreview.src = newImageSrc;
      
      // Perbarui tombol remove photo berdasarkan gambar baru
      updateRemovePhotoButton(newImageSrc, defaultPhoto);
      
      // Hide overlay setelah upload sukses di semua device
      hideOverlayAfterAction();
    };
    reader.onerror = function() {
      showInfo('Failed to load image', 'error');
      this.value = '';
    };
    reader.readAsDataURL(file);
  });
}

async function submitEditProfile(event) {
  event.preventDefault();
  
  // Validasi form
  if (!profileval()) return false;
  
  const form = document.getElementById('profileForm');
  const submitBtn = form.querySelector('.btn-primary');
  const errorElement = document.getElementById('errorusernm');
  const userId = document.getElementById('userId').value;
  const name = document.getElementById('userName').value;
  const fileInput = document.getElementById('userCoverUpload');
  const removePhotoFlag = document.getElementById('removePhotoFlag').value;
  
  // Reset error
  errorElement.textContent = '';
  
  try {
    // Tampilkan loading
    const originalBtnText = submitBtn.innerHTML;
    submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Saving...';
    submitBtn.disabled = true;
    
    // Buat FormData dengan manual
    const formData = new FormData();
    formData.append('userId', userId);
    formData.append('name', name);
    formData.append('removePhoto', removePhotoFlag);
    
    // LOGIKA PRIORITAS: Jika removePhotoFlag = '1', JANGAN tambahkan file baru
    if (removePhotoFlag === '1') {
      // Jangan tambahkan file apapun, hanya hapus foto yang ada
      console.log('Remove photo flag is active, ignoring any uploaded file');
    } 
    // Jika ada file baru yang diupload DAN tidak dalam mode remove
    else if (fileInput.files[0]) {
      formData.append('cover', fileInput.files[0]);
      console.log('New file uploaded:', fileInput.files[0].name);
    }
    // Jika tidak ada file dan tidak remove, tidak ada perubahan foto
    
    console.log('Sending data:', { 
      userId, 
      name, 
      removePhoto: removePhotoFlag === '1',
      hasFile: fileInput.files[0] ? true : false
    });
    
    // Kirim data ke server
    const response = await fetch('/profile/update', {
      method: 'POST',
      body: formData
    });
    
    const result = await response.json();
    
    // Reset button
    submitBtn.innerHTML = originalBtnText;
    submitBtn.disabled = false;
    
    console.log('Server response:', result);
    
    if (result.success) {
      const message = removePhotoFlag === '1' 
        ? 'Profile photo removed successfully!' 
        : 'Profile updated successfully!';
      
      showInfo(message, 'success');
      closePopup();
      
      // Update profile image di header
      updateHeaderProfileImage(result.data.profileImage, result.data.name);
      
      if (window.currentProfileHashid) {
        // Force reload dengan timestamp untuk bypass cache
        const timestamp = Date.now();
        
        // Clear cache di profile page
        const profilePage = document.querySelector(".page_profile");
        if (profilePage) {
          profilePage.removeAttribute("data-current-profile");
        }
        
        // Panggil forceShowProfile untuk reload dengan script
        forceShowProfile(window.currentProfileHashid, timestamp, false);
      }
      
    } else {
      errorElement.textContent = result.message || 'Failed to update profile';
      showInfo(result.message || 'Failed to update profile', 'error');
    }
    
  } catch (error) {
    console.error('Error submitting profile:', error);
    
    // Reset button
    const submitBtn = form.querySelector('.btn-primary');
    submitBtn.innerHTML = 'Save Changes';
    submitBtn.disabled = false;
    
    errorElement.textContent = 'An error occurred while updating profile';
    showInfo('Network error: ' + error.message, 'error');
  }
}

function forceShowProfile(hashid, timestamp = null, push = false) {
  saveScrollPosition();
  hideAll();

  const startTime = Date.now();
  const container = document.querySelector(".main-content");
  const profilePage = container.querySelector(".page_profile");
  const header = document.querySelector(".sticky-header");

  // Clear cache dengan menghapus data-current-profile
  profilePage.removeAttribute("data-current-profile");
  
  // Tampilkan loader
  $(".loader").show();

  // Buat URL dengan timestamp untuk bypass cache
  const url = timestamp ? `/profile/${hashid}?refresh=${timestamp}` : `/profile/${hashid}`;
  
  $.ajax({
    url: url,
    method: "GET",
    headers: {
      'Cache-Control': 'no-cache, no-store, must-revalidate',
      'Pragma': 'no-cache',
      'Expires': '0'
    },
    success: function (response) {
      profilePage.innerHTML = response;
      profilePage.style.display = "block";
      header.style.display = "none";

      // Pastikan header dalam state hidden awal
      const profileHeader = profilePage.querySelector('.profile-header');
      if (profileHeader) {
        profileHeader.classList.remove('visible');
      }

      // Set attribute dengan timestamp untuk mencegah cache
      const cacheId = timestamp ? `profile:${hashid}:${timestamp}` : `profile:${hashid}`;
      profilePage.setAttribute("data-current-profile", cacheId);

      // Extract profile data dari response untuk update header
      const tempDiv = document.createElement('div');
      tempDiv.innerHTML = response;
      
      // Ambil profile image baru dari banner
      const newProfileImg = tempDiv.querySelector('.banner-img.profile-img');
      const newUserName = tempDiv.querySelector('.banner-text h3');
      
      if (newProfileImg) {
        updateHeaderProfileImage(newProfileImg.src, newUserName ? newUserName.textContent : null);
      }

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

      const currentState = history.state;
      const currentURL = window.location.pathname;

      if (push && (!currentState || currentState.id !== hashid || currentURL !== `/profile/${hashid}`)) {
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

function updateHeaderProfileImage(newProfileImage, newName = null) {
  // Update profile image di header
  const headerProfileImg = document.querySelector('#profileDropdownTrigger');
  if (headerProfileImg && newProfileImage) {
    headerProfileImg.src = newProfileImage;
    
    // Tambahkan efek fade untuk transisi smooth
    headerProfileImg.style.opacity = '0.7';
    setTimeout(() => {
      headerProfileImg.style.opacity = '1';
      headerProfileImg.style.transition = 'opacity 0.3s ease';
    }, 10);
  }
  
  // Update profile image di banner profile (jika ada)
  const bannerProfileImg = document.querySelector('.banner-img.profile-img');
  if (bannerProfileImg && newProfileImage) {
    bannerProfileImg.src = newProfileImage;
    
    // Tambahkan efek fade untuk transisi smooth
    bannerProfileImg.style.opacity = '0.7';
    setTimeout(() => {
      bannerProfileImg.style.opacity = '1';
      bannerProfileImg.style.transition = 'opacity 0.3s ease';
    }, 10);
  }
  
  // Update username di header jika ada
  if (newName) {
    // Cek apakah ada username di header (contoh: jika header menampilkan nama user)
    const headerUserName = document.querySelector('.header-username');
    if (headerUserName) {
      headerUserName.textContent = newName;
    }
    
    // Update username di banner profile
    const bannerUserName = document.querySelector('.banner-text h3');
    if (bannerUserName) {
      bannerUserName.textContent = newName;
    }
    
    // Update title halaman
    document.title = `${newName} - Profile`;
  }
  
  // Juga update di editProfile popup preview (jika masih terbuka)
  const editPreviewImg = document.getElementById('userCoverPreview');
  if (editPreviewImg && newProfileImage) {
    editPreviewImg.src = newProfileImage;
  }
  
  // Update session data di client side jika ada
  if (window.userData) {
    window.userData.profileImage = newProfileImage;
    if (newName) {
      window.userData.name = newName;
    }
  }
  
  console.log('Header profile image updated to:', newProfileImage);
}

function updateRemovePhotoButton(currentPhoto, defaultPhoto) {
  const removePhotoButton = document.querySelector('.remove-photo-option');
  const removePhotoFlag = document.getElementById('removePhotoFlag');
  
  if (!removePhotoButton) return;
  
  // Cek apakah foto saat ini sudah default
  const isDefaultPhoto = currentPhoto.includes('default_pp.jpg') || 
                         currentPhoto.includes('undefine.jpg') ||
                         currentPhoto === defaultPhoto;
  
  // Jika foto sudah default, sembunyikan tombol remove
  if (isDefaultPhoto && removePhotoFlag.value !== '1') {
    removePhotoButton.style.display = 'none';
  } else {
    removePhotoButton.style.display = 'flex';
  }
}



let currentUserIdForFollow = null;
let currentTab = 'followers';
let followersData = [];
let followingData = [];
let isOwnProfilePage = false;
let isLoading = false;

async function showFollowPopup(type, userId) {
  currentTab = type;
  currentUserIdForFollow = userId;
  
  const popup = document.querySelector('.follow');
  const popupContent = popup.querySelector('.popup-content');
  const title = document.getElementById('followPopupTitle');
  
  // Set judul popup
  title.textContent = type === 'followers' ? 'Followers' : 'Following';
  
  // Reset search input
  const searchInput = document.getElementById('followSearch');
  if (searchInput) {
    searchInput.value = '';
  }
  
  // Aktifkan tab yang sesuai
  document.querySelectorAll('.follow-tab').forEach(tab => {
    tab.classList.remove('active');
  });
  
  if (type === 'followers') {
    document.querySelector('.follow-tab:first-child').classList.add('active');
    document.getElementById('followersList').style.display = 'block';
    document.getElementById('followingList').style.display = 'none';
  } else {
    document.querySelector('.follow-tab:last-child').classList.add('active');
    document.getElementById('followersList').style.display = 'none';
    document.getElementById('followingList').style.display = 'block';
  }
  
  // Tampilkan popup
  if (isMobile) {
    popup.style.display = 'block';
    setTimeout(() => {
      popup.classList.add('active');
      if (popupContent) {
        popupContent.style.transform = 'translateY(0)';
      }
    }, 10);
    
    // Setup gesture control dengan scrollable element yang benar
    const activeFollowList = type === 'followers' 
      ? document.getElementById('followersList')
      : document.getElementById('followingList');
    setupMobileGestureControl('.follow', activeFollowList);
  } else {
    $(".follow").show();
    $(".follow").addClass("active");
    $(".follow .popup-overlay").removeClass("fadeOut").addClass("fadeIn");
  }
  
  // Load data berdasarkan type - TANPA loading minimal untuk pertama kali
  await loadFollowData(type, userId, false); // false = tanpa minimal loading time
}



async function switchFollowTab(type) {
  if (isLoading) return; // Mencegah multiple clicks
  
  currentTab = type;
  
  // Reset search input
  const searchInput = document.getElementById('followSearch');
  if (searchInput) {
    searchInput.value = '';
  }
  
  // Update active tab
  document.querySelectorAll('.follow-tab').forEach(tab => {
    tab.classList.remove('active');
  });
  
  if (type === 'followers') {
    document.querySelector('.follow-tab:first-child').classList.add('active');
    document.getElementById('followersList').style.display = 'block';
    document.getElementById('followingList').style.display = 'none';
  } else {
    document.querySelector('.follow-tab:last-child').classList.add('active');
    document.getElementById('followersList').style.display = 'none';
    document.getElementById('followingList').style.display = 'block';
  }
  
  // Update title
  document.getElementById('followPopupTitle').textContent = 
    type === 'followers' ? 'Followers' : 'Following';
  
  // Setup ulang gesture control untuk tab yang aktif
  setupFollowPopupGestureControl();
  
  // Load data untuk tab yang aktif DENGAN minimal loading time
  await loadFollowData(type, currentUserIdForFollow, true); // true = dengan minimal loading time
}

function setupFollowPopupGestureControl() {
  const popup = document.querySelector('.follow');
  if (!popup) return;
  
  // Cari elemen follow-list yang sedang aktif berdasarkan currentTab
  const activeFollowList = currentTab === 'followers' 
    ? document.getElementById('followersList')
    : document.getElementById('followingList');
  
  if (!activeFollowList) return;
  
  // Setup mobile gesture control dengan scrollable element yang benar
  setupMobileGestureControl('.follow', activeFollowList);
}

// Function untuk load data followers/following dengan optional minimal loading time
async function loadFollowData(type, userId, showMinimalLoading = false) {
  const containerId = type === 'followers' ? 'followersList' : 'followingList';
  const container = document.getElementById(containerId);
  const loadingState = document.getElementById('loadingState');
  const emptyState = document.getElementById('emptyState');
  
  // Tampilkan loading state
  container.innerHTML = '';
  loadingState.style.display = 'block';
  emptyState.style.display = 'none';
  isLoading = true;
  
  // Start timer untuk minimal loading time jika diperlukan
  const startTime = Date.now();
  const minimalLoadingTime = showMinimalLoading ? 700 : 0; // 2 detik hanya untuk switch tab
  
  try {
    // Fetch data dari server
    const response = await fetch(`/profile/${type}/${userId}`);
    const result = await response.json();
    
    // Hitung waktu yang sudah berlalu
    const elapsedTime = Date.now() - startTime;
    
    // Jika data sudah selesai tapi masih kurang dari minimal loading time, tunggu
    if (elapsedTime < minimalLoadingTime) {
      const remainingTime = minimalLoadingTime - elapsedTime;
      await new Promise(resolve => setTimeout(resolve, remainingTime));
    }
    
    // Sembunyikan loading state
    loadingState.style.display = 'none';
    isLoading = false;
    
    if (result.success && result.data.length > 0) {
      // Simpan data ke variabel global
      if (type === 'followers') {
        followersData = result.data;
        isOwnProfilePage = result.is_own_profile || false;
      } else {
        followingData = result.data;
        isOwnProfilePage = result.is_own_profile || false;
      }
      
      // Render data
      renderFollowData(type);
      
    } else {
      // Tampilkan empty state
      container.innerHTML = '';
      emptyState.style.display = 'block';
      emptyState.querySelector('p').textContent = 
        type === 'followers' ? 'No followers yet' : 'Not following anyone yet';
      
      // Clear data
      if (type === 'followers') {
        followersData = [];
      } else {
        followingData = [];
      }
    }
    
  } catch (error) {
    console.error('Error loading follow data:', error);
    
    // Pastikan minimal loading time terpenuhi meskipun error
    const elapsedTime = Date.now() - startTime;
    if (elapsedTime < minimalLoadingTime) {
      const remainingTime = minimalLoadingTime - elapsedTime;
      await new Promise(resolve => setTimeout(resolve, remainingTime));
    }
    
    loadingState.style.display = 'none';
    emptyState.style.display = 'block';
    emptyState.querySelector('p').textContent = 'Failed to load data';
    isLoading = false;
  }
}

function renderFollowData(type) {
  const containerId = type === 'followers' ? 'followersList' : 'followingList';
  const container = document.getElementById(containerId);
  const emptyState = document.getElementById('emptyState');
  
  const data = type === 'followers' ? followersData : followingData;
  
  // Filter data untuk menentukan apa yang ditampilkan
  let displayData = data;
  
  // Jika di tab following, tampilkan SEMUA data (termasuk yang sudah di-unfollow)
  // Tidak perlu filter karena kita ingin tetap menampilkan user yang sudah di-unfollow
  if (type === 'following') {
    displayData = data;
  }
  
  if (displayData.length > 0) {
    // Render data
    container.innerHTML = displayData.map(user => createUserItemHTML(user, type)).join('');
    
    // Setup event listeners untuk follow buttons dan search
    setupFollowButtons();
    emptyState.style.display = 'none';
  } else {
    // Tampilkan empty state
    container.innerHTML = '';
    emptyState.style.display = 'block';
    emptyState.querySelector('p').textContent = 
      type === 'followers' ? 'No followers yet' : 'Not following anyone yet';
  }
}


function createUserItemHTML(user, tabType) {
  const currentUserId = window.userId;
  const isFollowing = user.is_following || false;
  const isCurrentUser = user.is_current_user || false;
  const viewingOwnProfile = isOwnProfilePage;
  
  // Logika tombol berdasarkan konteks:
  let buttonHTML = '';
  
  // 1. Jika user adalah diri sendiri (current user), HIDE button
  if (isCurrentUser) {
    buttonHTML = '';
  }
  // 2. Jika melihat profile sendiri
  else if (viewingOwnProfile) {
    if (tabType === 'followers') {
      // Di tab followers profile sendiri
      if (isFollowing) {
        // Sudah follow back -> tombol "Following"
        buttonHTML = `
          <button class="follow-button following" 
                  onclick="toggleFollowPopup(this, ${user.id}, '${tabType}')">
            <span class="follow-text">Following</span>
          </button>
        `;
      } else {
        // Belum follow back -> tombol "Follow Back"
        buttonHTML = `
          <button class="follow-button follow-back" 
                  onclick="toggleFollowPopup(this, ${user.id}, '${tabType}')">
            <span class="follow-text">Follow Back</span>
          </button>
        `;
      }
    } else {
      // Di tab following profile sendiri
      // Selalu tampilkan button berdasarkan status follow saat ini
      if (isFollowing) {
        buttonHTML = `
          <button class="follow-button following" 
                  onclick="toggleFollowPopup(this, ${user.id}, '${tabType}')">
            <span class="follow-text">Following</span>
          </button>
        `;
      } else {
        buttonHTML = `
          <button class="follow-button" 
                  onclick="toggleFollowPopup(this, ${user.id}, '${tabType}')">
            <span class="follow-text">Follow</span>
          </button>
        `;
      }
    }
  }
  // 3. Jika melihat profile orang lain
  else {
    // Selalu tampilkan button berdasarkan status follow saat ini
    if (isFollowing) {
      buttonHTML = `
        <button class="follow-button following" 
                onclick="toggleFollowPopup(this, ${user.id}, '${tabType}')">
          <span class="follow-text">Following</span>
        </button>
      `;
    } else {
      buttonHTML = `
        <button class="follow-button" 
                onclick="toggleFollowPopup(this, ${user.id}, '${tabType}')">
          <span class="follow-text">Follow</span>
        </button>
      `;
    }
  }
  
  // Tambahkan onclick untuk navigate ke profile
  const onclickProfile = `showProfile('${user.hashid}')`;
  
  return `
    <div class="user-item" data-user-id="${user.id}" data-is-current="${isCurrentUser}" data-following="${isFollowing}">
      <img class="userFollowImg" 
           src="${user.profile_image}" 
           alt="${user.name}"
           onerror="this.src='/uploads/profile/default/default_pp.jpg'"
           onclick="${onclickProfile}"
           style="cursor: pointer;">
      <div class="user-info" onclick="${onclickProfile}" style="cursor: pointer;">
        <span class="user-name">${user.name}</span>
        <span class="user-bio">${user.bio || 'No bio yet'}</span>
      </div>
      ${buttonHTML}
    </div>
  `;
}

// Function untuk setup follow buttons dan search
function setupFollowButtons() {
  // Setup search functionality
  const searchInput = document.getElementById('followSearch');
  if (searchInput) {
    // Hapus event listener lama jika ada
    searchInput.removeEventListener('input', handleSearch);
    
    // Tambahkan event listener baru
    searchInput.addEventListener('input', handleSearch);
  }
}

// Function untuk handle search
function handleSearch(e) {
  const searchTerm = e.target.value.toLowerCase();
  const containerId = currentTab === 'followers' ? 'followersList' : 'followingList';
  const container = document.getElementById(containerId);
  const items = container.querySelectorAll('.user-item');
  
  items.forEach(item => {
    const userName = item.querySelector('.user-name').textContent.toLowerCase();
    const userBio = item.querySelector('.user-bio').textContent.toLowerCase();
    
    if (userName.includes(searchTerm) || userBio.includes(searchTerm)) {
      item.style.display = 'flex';
    } else {
      item.style.display = 'none';
    }
  });
}

async function toggleFollowPopup(button, targetUserId, tabType) {
  const currentUserId = window.userId;
  
  if (!userId) {
    showLogin();
    return;
  }
  
  // Cek jika mencoba follow/unfollow diri sendiri
  if (parseInt(currentUserId) === parseInt(targetUserId)) {
    return;
  }
  
  const isCurrentlyFollowing = button.classList.contains('following');
  const isFollowBackButton = button.classList.contains('follow-back');
  const buttonText = button.querySelector('.follow-text');
  
  // Tampilkan loading state di button
  const originalText = buttonText.textContent;
  buttonText.textContent = '...';
  button.disabled = true;
  
  try {
    const response = await fetch('/userFollow', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        id_user_follow: targetUserId
      })
    });
    
    const result = await response.json();
    
    // Reset button state
    button.disabled = false;
    
    if (result.success) {
      // Update button state berdasarkan response
      if (result.is_follow) {
        // Berhasil follow
        button.classList.remove('follow-back');
        button.classList.add('following');
        buttonText.textContent = 'Following';
        
        // Jika ini di tab following profile sendiri, user ini sekarang ada di followers juga
        // Jadi kita perlu update data di array followers
        if (isOwnProfilePage && tabType === 'following') {
          // Tambahkan ke followersData jika belum ada
          const alreadyInFollowers = followersData.some(user => user.id === targetUserId);
          if (!alreadyInFollowers) {
            // Ambil data user untuk ditambahkan ke followers
            const userResponse = await fetch(`/profile/userinfo/${targetUserId}`);
            const userData = await userResponse.json();
            if (userData.success) {
              followersData.unshift({
                ...userData.data,
                is_following: 1, // Karena baru saja kita follow
                is_current_user: false
              });
            }
          }
        }
      } else {
        // Berhasil unfollow
        button.classList.remove('following');
        
        // Tentukan teks button berdasarkan konteks
        if (isOwnProfilePage) {
          if (tabType === 'followers') {
            // Di followers profile sendiri yang di-unfollow -> jadi "Follow Back"
            button.classList.add('follow-back');
            buttonText.textContent = 'Follow Back';
            
            // User ini tetap ada di followers (hanya status follow yang berubah)
            // Tidak perlu menghapus dari followingData karena di tab followers
          } else if (tabType === 'following') {
            // Di following profile sendiri yang di-unfollow
            // User tetap ditampilkan di following dengan button "Follow"
            buttonText.textContent = 'Follow';
            
            // Update status di array followingData (tetap ada di array)
            const followingIndex = followingData.findIndex(user => user.id === targetUserId);
            if (followingIndex !== -1) {
              followingData[followingIndex].is_following = 0;
              
              // Update UI untuk item ini
              updateFollowingItemUI(targetUserId, 'follow', 'Follow');
            }
          }
        } else {
          // Kasus profile orang lain -> jadi "Follow"
          buttonText.textContent = 'Follow';
          
          // Update status di array followingData (tetap ada di array)
          if (tabType === 'following') {
            const followingIndex = followingData.findIndex(user => user.id === targetUserId);
            if (followingIndex !== -1) {
              followingData[followingIndex].is_following = 0;
              
              // Update UI untuk item ini
              updateFollowingItemUI(targetUserId, 'follow', 'Follow');
            }
          }
        }
      }
      
      // Update data di array (tanpa menghapus item)
      updateFollowDataInArray(targetUserId, result.is_follow, tabType, false); // false = jangan hapus
      
      // Update count di profile page
      updateFollowCounts(result);
      
      // Tampilkan pesan sukses
      const action = result.is_follow ? 'followed' : 'unfollowed';
      showInfo(`Successfully ${action} user`, 'success');
      
    } else {
      buttonText.textContent = originalText;
      showInfo(result.message || 'Failed to update follow status', 'error');
    }
    
  } catch (error) {
    console.error('Error toggling follow:', error);
    button.disabled = false;
    buttonText.textContent = isCurrentlyFollowing ? 'Following' : 
                            (isFollowBackButton ? 'Follow Back' : 'Follow');
    showInfo('Network error', 'error');
  }
}

function updateFollowingItemUI(userId, className, text) {
  if (currentTab === 'following') {
    const followingItems = document.querySelectorAll('#followingList .user-item');
    followingItems.forEach(item => {
      if (parseInt(item.dataset.userId) === parseInt(userId)) {
        const button = item.querySelector('.follow-button');
        if (button) {
          // Update kelas
          button.className = 'follow-button';
          if (className !== 'follow') {
            button.classList.add(className);
          }
          
          // Update teks
          const buttonText = button.querySelector('.follow-text');
          if (buttonText) {
            buttonText.textContent = text;
          }
        }
      }
    });
  }
}



function updateFollowerButtonState(userId, className, text) {
  if (currentTab === 'followers') {
    const followerItems = document.querySelectorAll('#followersList .user-item');
    followerItems.forEach(item => {
      if (parseInt(item.dataset.userId) === parseInt(userId)) {
        const button = item.querySelector('.follow-button');
        if (button) {
          button.className = 'follow-button ' + className;
          const buttonText = button.querySelector('.follow-text');
          if (buttonText) {
            buttonText.textContent = text;
          }
        }
      }
    });
  }
}




function updateFollowCounts(result) {
  console.log('Update counts result:', result);
  
  // Dapatkan ID profile yang sedang dilihat
  const viewingProfileId = currentUserIdForFollow;
  const currentUserId = window.userId;
  
  // KONTEKS 1: Melihat profile sendiri (isOwnProfilePage = true)
  if (isOwnProfilePage) {
    // Jika melihat profile sendiri:
    // - follower_count_changed_for = user yang kita follow/unfollow (target user)
    // - following_count_changed_for = kita sendiri (current user)
    
    if (result.follower_count_changed_for && result.new_follower_count !== undefined) {
      // HANYA update follower count jika kita yang di-follow/unfollow
      // (ini terjadi ketika orang lain follow/unfollow kita, bukan ketika kita melakukan action)
      // Untuk action yang kita lakukan, follower count tidak berubah untuk kita
      
      const followerCountElement = document.getElementById('follower-count');
      if (followerCountElement) {
        // Hanya update jika follower count berubah untuk profile yang sedang dilihat (profile kita sendiri)
        if (parseInt(result.follower_count_changed_for) === parseInt(viewingProfileId)) {
          followerCountElement.textContent = result.new_follower_count;
        }
      }
    }
    
    if (result.following_count_changed_for && result.new_following_count !== undefined) {
      // Update following count jika kita yang melakukan follow/unfollow
      const followingCountElement = document.getElementById('following-count');
      if (followingCountElement) {
        // Hanya update jika following count berubah untuk profile yang sedang dilihat (profile kita sendiri)
        if (parseInt(result.following_count_changed_for) === parseInt(viewingProfileId)) {
          followingCountElement.textContent = result.new_following_count;
        }
      }
    }
  }
  
  // KONTEKS 2: Melihat profile orang lain
  else {
    // Jika melihat profile orang lain:
    // - follower_count_changed_for = profile yang di-follow/unfollow
    // - following_count_changed_for = orang yang melakukan action (bisa kita atau orang lain)
    
    if (result.follower_count_changed_for && result.new_follower_count !== undefined) {
      // Update follower count jika perubahan untuk profile yang sedang dilihat
      const followerCountElement = document.getElementById('follower-count');
      if (followerCountElement) {
        if (parseInt(result.follower_count_changed_for) === parseInt(viewingProfileId)) {
          followerCountElement.textContent = result.new_follower_count;
        }
      }
    }
    
    if (result.following_count_changed_for && result.new_following_count !== undefined) {
      // Update following count HANYA jika:
      // 1. Kita yang melakukan action, DAN
      // 2. Profile yang sedang dilihat adalah profile kita sendiri (tapi ini sudah di-handle di konteks 1)
      // Untuk profile orang lain, following count TIDAK berubah ketika kita follow/unfollow orang lain
      
      // Jadi untuk profile orang lain, JANGAN update following count dari sini
      // Following count hanya berubah untuk profile yang melakukan action
    }
  }
  
  // Logika khusus berdasarkan action dan tab
  const action = result.action; // 'follow' atau 'unfollow'
  const targetUserId = result.follower_count_changed_for;
  
  // Jika kita unfollow seseorang di tab following:
  if (action === 'unfollow' && currentTab === 'following') {
    // Hanya following count yang berkurang, follower count TIDAK
    const followingCountElement = document.getElementById('following-count');
    if (followingCountElement && result.new_following_count !== undefined) {
      // Pastikan ini adalah action yang kita lakukan
      if (parseInt(result.following_count_changed_for) === parseInt(currentUserId)) {
        followingCountElement.textContent = result.new_following_count;
      }
    }
    
    // Jangan update follower count untuk unfollow di tab following
    // karena follower count tidak berubah dalam kasus ini
  }
  
  // Jika kita follow seseorang di tab followers:
  else if (action === 'follow' && currentTab === 'followers') {
    // Hanya follower count yang bertambah, following count TIDAK
    const followerCountElement = document.getElementById('follower-count');
    if (followerCountElement && result.new_follower_count !== undefined) {
      // Pastikan follower count berubah untuk profile yang sedang dilihat
      if (parseInt(result.follower_count_changed_for) === parseInt(viewingProfileId)) {
        followerCountElement.textContent = result.new_follower_count;
      }
    }
    
    // Jangan update following count untuk follow di tab followers
    // karena following count berubah untuk current user, bukan profile yang dilihat
  }
}

function updateFollowDataInArray(userId, isFollowing, tabType, shouldRemove = false) {
  if (tabType === 'followers') {
    followersData = followersData.map(user => {
      if (user.id === userId) {
        return { 
          ...user, 
          is_following: isFollowing ? 1 : 0 
        };
      }
      return user;
    });
  }
  
  if (tabType === 'following') {
    // Update status following tanpa menghapus item
    followingData = followingData.map(user => {
      if (user.id === userId) {
        return { 
          ...user, 
          is_following: isFollowing ? 1 : 0 
        };
      }
      return user;
    });
    
    // Hanya hapus dari followingData jika parameter shouldRemove = true
    // (khusus untuk kasus tertentu seperti remove follower)
    if (!isFollowing && shouldRemove) {
      followingData = followingData.filter(user => user.id !== userId);
    }
  }
}
