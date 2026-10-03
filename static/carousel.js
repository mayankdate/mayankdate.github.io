// Lightweight dot indicator for the business-card carousel on mobile.
// The carousel itself is CSS scroll-snap; this just syncs the dots.
(function () {
  var carousel = document.querySelector('[data-carousel]');
  if (!carousel) return;
  var track = carousel.querySelector('[data-carousel-track]');
  var dots  = Array.prototype.slice.call(carousel.querySelectorAll('.carousel-dots .dot'));
  var cards = Array.prototype.slice.call(track.querySelectorAll('.bcard'));
  if (!dots.length || !cards.length) return;

  function setActive(i) {
    dots.forEach(function (d, idx) {
      d.classList.toggle('active', idx === i);
    });
  }

  var observer = new IntersectionObserver(function (entries) {
    entries.forEach(function (e) {
      if (e.isIntersecting && e.intersectionRatio > 0.6) {
        var idx = cards.indexOf(e.target);
        if (idx >= 0) setActive(idx);
      }
    });
  }, { root: track, threshold: [0.6] });

  cards.forEach(function (c) { observer.observe(c); });
})();
