(function () {
  var script = document.currentScript;
  if (!script) return;

  var tenant = script.getAttribute("data-tenant") || "reset";
  var theme = script.getAttribute("data-theme") || "reset";
  var hideBook = script.getAttribute("data-hide-book") === "true";
  var targetId = script.getAttribute("data-target");
  var apiBase = (script.getAttribute("data-api-base") || "").replace(/\/$/, "");

  if (!apiBase) {
    var src = script.getAttribute("src") || "";
    var match = src.match(/^(https?:\/\/[^/]+)/);
    apiBase = match ? match[1] : window.location.origin;
  }

  var mount =
    (targetId && document.getElementById(targetId)) ||
    script.previousElementSibling;

  if (!mount) {
    mount = document.createElement("div");
    script.parentNode.insertBefore(mount, script);
  }

  mount.innerHTML = "<p style=\"font-family:sans-serif;color:#666\">Loading schedule…</p>";

  fetch(apiBase + "/api/public/" + encodeURIComponent(tenant) + "/schedule")
    .then(function (response) {
      return response.json().then(function (data) {
        if (!response.ok) {
          throw new Error(data.error || "Could not load schedule");
        }
        return data;
      });
    })
    .then(function (data) {
      var days = data.days || [];
      var dayOrder = [
        "Monday",
        "Tuesday",
        "Wednesday",
        "Thursday",
        "Friday",
        "Saturday",
        "Sunday",
      ];
      var jsDay = new Date().getDay();
      var activeDay =
        dayOrder[jsDay === 0 ? 6 : jsDay - 1] || (days[0] && days[0].day) || "Monday";

      function classesForDay(dayName) {
        var entry = days.find(function (d) {
          return d.day === dayName;
        });
        return entry ? entry.classes : [];
      }

      function formatTime(iso) {
        return new Date(iso).toLocaleTimeString(undefined, {
          hour: "numeric",
          minute: "2-digit",
        });
      }

      var styles =
        ".gs-schedule{font-family:ui-sans-serif,system-ui,sans-serif;background:#f3efe6;color:#111;padding:1rem}" +
        ".gs-tabs{display:flex;flex-wrap:wrap;gap:.5rem;margin:0 0 1rem}" +
        ".gs-tab{border:1px solid #ddd6c8;background:#fff;padding:.5rem .75rem;font-size:.75rem;font-weight:700;letter-spacing:.06em;text-transform:uppercase;cursor:pointer}" +
        ".gs-tab.is-active{background:#111;color:#fff;border-color:#111}" +
        ".gs-panel{background:#fff;border:1px solid #ddd6c8;padding:1rem}" +
        ".gs-item{display:flex;justify-content:space-between;gap:1rem;padding:.875rem 0;border-top:1px solid #ddd6c8}" +
        ".gs-item:first-child{border-top:none;padding-top:0}" +
        ".gs-class{font-weight:700;text-transform:uppercase;font-size:.875rem}" +
        ".gs-time{color:#5c5c5c;font-size:.8125rem;white-space:nowrap}" +
        ".gs-book{display:inline-block;margin-top:1rem;background:#111;color:#fff;text-decoration:none;padding:.75rem 1.25rem;font-size:.75rem;font-weight:700;letter-spacing:.08em;text-transform:uppercase}";

      var root = document.createElement("div");
      root.className = "gs-schedule";
      if (theme === "dark") {
        root.style.background = "#111";
        root.style.color = "#f5f5f5";
      }

      var styleEl = document.createElement("style");
      styleEl.textContent = styles;
      root.appendChild(styleEl);

      var tabs = document.createElement("div");
      tabs.className = "gs-tabs";

      var panel = document.createElement("div");
      panel.className = "gs-panel";

      function renderPanel(dayName) {
        var items = classesForDay(dayName);
        panel.innerHTML =
          "<p style=\"margin:0 0 .25rem;font-weight:700;letter-spacing:.05em;text-transform:uppercase\">" +
          dayName +
          "</p>" +
          "<p style=\"margin:0 0 1rem;color:#5c5c5c;font-size:.8125rem;text-transform:uppercase\">" +
          items.length +
          " class" +
          (items.length === 1 ? "" : "es") +
          "</p>";

        if (items.length === 0) {
          panel.innerHTML += "<p style=\"color:#5c5c5c\">No classes scheduled.</p>";
          return;
        }

        var list = document.createElement("div");
        items.forEach(function (item) {
          var row = document.createElement("div");
          row.className = "gs-item";
          row.innerHTML =
            "<span class=\"gs-class\">" +
            item.classTitle +
            "</span><span class=\"gs-time\">" +
            formatTime(item.startTime) +
            " – " +
            formatTime(item.endTime) +
            " · " +
            item.durationMinutes +
            " mins</span>";
          list.appendChild(row);
        });
        panel.appendChild(list);
      }

      dayOrder.forEach(function (dayName) {
        var count = classesForDay(dayName).length;
        var tab = document.createElement("button");
        tab.type = "button";
        tab.className = "gs-tab" + (dayName === activeDay ? " is-active" : "");
        tab.textContent = dayName.slice(0, 3);
        tab.disabled = count === 0;
        tab.addEventListener("click", function () {
          activeDay = dayName;
          Array.prototype.forEach.call(tabs.children, function (child) {
            child.classList.toggle("is-active", child === tab);
          });
          panel.innerHTML = "";
          renderPanel(dayName);
        });
        tabs.appendChild(tab);
      });

      root.appendChild(tabs);
      root.appendChild(panel);
      renderPanel(activeDay);

      if (!hideBook && data.bookUrl) {
        var book = document.createElement("a");
        book.className = "gs-book";
        book.href = data.bookUrl;
        book.target = "_top";
        book.rel = "noopener noreferrer";
        book.textContent = "Book a Session";
        root.appendChild(book);
      }

      mount.innerHTML = "";
      mount.appendChild(root);
    })
    .catch(function (error) {
      mount.innerHTML =
        "<p style=\"font-family:sans-serif;color:#b00020\">" +
        (error && error.message ? error.message : "Schedule unavailable") +
        "</p>";
    });
})();
