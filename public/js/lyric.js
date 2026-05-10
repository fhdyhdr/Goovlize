import gsap from 'https://cdn.skypack.dev/gsap@3.12.0';
import ScrollTrigger from 'https://cdn.skypack.dev/gsap@3.12.0/ScrollTrigger';

const CONFIG = {
  size: 120,
  trigger: false,
  bar: true,
  range: 120,
  light: false
};

const update = () => {
  ScrollTrigger.refresh();
  document.documentElement.dataset.light = CONFIG.light;
  document.documentElement.dataset.trigger = CONFIG.trigger;
  document.documentElement.dataset.maskBar = CONFIG.bar;
  document.documentElement.style.setProperty('--mask-size', CONFIG.size);
  document.documentElement.style.setProperty('--mask-range', CONFIG.range);
};

update();

if (!CSS.supports('animation-timeline: scroll()')) {
  gsap.registerPlugin(ScrollTrigger);
  const scroller = document.querySelector('.scroller');
  const sig = document.querySelector('.sig');

  ScrollTrigger.create({
    scroller,
    scrub: true,
    start: 0,
    end: () => CONFIG.range,
    ease: 'none',
    trigger: 'article',
    onUpdate: self => {
      scroller.style.setProperty('--scroll-progress-top', CONFIG.trigger ? Math.floor(self.progress) * 100 : self.progress * 100);
    }
  });

  ScrollTrigger.create({
    scroller,
    trigger: 'article',
    scrub: true,
    ease: 'none',
    start: () => {
      return ScrollTrigger.maxScroll(scroller) - CONFIG.range * 1;
    },
    end: () => {
      return ScrollTrigger.maxScroll(scroller);
    },
    onUpdate: self => {
      scroller.style.setProperty('--scroll-progress-bottom', CONFIG.trigger ? Math.ceil(self.progress) * 100 : self.progress * 100);
    }
  });

  gsap.fromTo('.sig path', {
    '--draw': 1.025
  }, {
    '--draw': 0,
    scrollTrigger: {
      trigger: sig,
      scroller,
      toggleActions: 'play reset play reset',
      start: `top bottom-=${sig.getBoundingClientRect().height * 0.5}`
    }
  });

  const obs = new ResizeObserver(ScrollTrigger.refresh);
  obs.observe(scroller);
}




