$(document).ready(function () {
  const bannerImgContainer = document.querySelector('.banner-img-container');
  const bannerImg = document.querySelector('.banner-img');
  const stickyHeader = document.querySelector('.playlist-header');

  let scrollContainer = null;
  let lastScrollPosition = 0;
  let isTicking = false;
  let bannerHeight = document.querySelector('.banner').offsetHeight;
  let maxScroll = bannerHeight * 0.7;

  function updateEffects() {
    const scrollPosition = scrollContainer === window
      ? window.pageYOffset
      : scrollContainer.scrollTop;

    const scrollProgress = Math.min(scrollPosition / maxScroll, 1);

    if (scrollPosition <= maxScroll) {
      const scale = 1 - (scrollProgress * 0.5);
      const opacity = 1 - (scrollProgress * 2);

      bannerImgContainer.style.transform = `scale(${scale})`;
      bannerImg.style.opacity = opacity;
    }

    if (scrollPosition > bannerHeight * 0.4) {
      stickyHeader.classList.add('visible');
    } else {
      stickyHeader.classList.remove('visible');
    }

    lastScrollPosition = scrollPosition;
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

  function initScrollListener() {
    // Hapus listener lama
    if (scrollContainer) {
      scrollContainer.removeEventListener('scroll', onScroll);
    }

    // Tentukan container baru
    scrollContainer = window.innerWidth >= 769
      ? document.querySelector('#active-content')
      : window;

    // Hitung ulang ukuran banner
    bannerHeight = document.querySelector('.banner').offsetHeight;
    maxScroll = bannerHeight * 0.7;

    // Pasang listener baru
    scrollContainer.addEventListener('scroll', onScroll);

    // Jalankan efek awal
    updateEffects();
  }

  // Inisialisasi pertama
  initScrollListener();

  // Saat resize / rotate, re-inisialisasi
  window.addEventListener('resize', initScrollListener);
  window.addEventListener('orientationchange', initScrollListener);
});
