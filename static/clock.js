// Live clock — any element with class 'live-clock' and a data-tz IANA timezone
// (e.g. "Asia/Kolkata") gets its text updated every second with the current
// local time at that timezone.
(function () {
  var nodes = document.querySelectorAll('.live-clock[data-tz]');
  if (!nodes.length) return;

  function render() {
    nodes.forEach(function (el) {
      var tz = el.getAttribute('data-tz');
      try {
        var fmt = new Intl.DateTimeFormat('en-GB', {
          hour: '2-digit', minute: '2-digit',
          weekday: 'short', day: '2-digit', month: 'short',
          hour12: false, timeZone: tz
        });
        el.textContent = fmt.format(new Date());
      } catch (e) {
        el.textContent = '';
      }
    });
  }

  render();
  // Tick every 15 seconds — accurate enough for a time display and
  // doesn't thrash the layout.
  setInterval(render, 15000);
})();
