(function () {
  var script = document.currentScript;
  if (!script) return;

  var tenant = script.getAttribute("data-tenant") || "reset";
  var theme = script.getAttribute("data-theme") || "reset";
  var hideBook = script.getAttribute("data-hide-book") === "true";
  var bookUrlOverride = script.getAttribute("data-book-url") || "";
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

  mount.innerHTML =
    '<p style="font-family:sans-serif;color:#666">Loading schedule…</p>';

  function contrastTextColor(hexColor) {
    var hex = (hexColor || "").replace("#", "");
    if (hex.length !== 6) {
      return "#ffffff";
    }

    var red = parseInt(hex.slice(0, 2), 16);
    var green = parseInt(hex.slice(2, 4), 16);
    var blue = parseInt(hex.slice(4, 6), 16);
    var luminance = (0.299 * red + 0.587 * green + 0.114 * blue) / 255;

    return luminance > 0.55 ? "#111111" : "#ffffff";
  }

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
      var tenantInfo = data.tenant || {};
      var accent = tenantInfo.primaryColor || "#111111";
      var accentText = contrastTextColor(accent);
      var bookUrl = bookUrlOverride || data.bookUrl;
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
        dayOrder[jsDay === 0 ? 6 : jsDay - 1] ||
        (days[0] && days[0].day) ||
        "Monday";

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

      var bg = theme === "dark" ? "#111111" : "#f3efe6";
      var text = theme === "dark" ? "#f5f5f5" : "#111111";
      var muted = theme === "dark" ? "#aaaaaa" : "#5c5c5c";
      var border = theme === "dark" ? "#333333" : "#ddd6c8";
      var surface = theme === "dark" ? "#1a1a1a" : "#ffffff";

      var styles =
        ".gs-schedule{font-family:Montserrat,ui-sans-serif,system-ui,sans-serif;padding:1rem;box-sizing:border-box}" +
        ".gs-tabs{display:flex;flex-wrap:wrap;gap:.5rem;margin:0 0 1rem}" +
        ".gs-tab{border:1px solid " +
        border +
        ";background:" +
        surface +
        ";color:" +
        text +
        ";padding:.5rem .75rem;font-size:.75rem;font-weight:700;letter-spacing:.06em;text-transform:uppercase;cursor:pointer}" +
        ".gs-tab.is-active{background:" +
        accent +
        ";color:" +
        accentText +
        ";border-color:" +
        accent +
        "}" +
        ".gs-panel{background:" +
        surface +
        ";border:1px solid " +
        border +
        ";padding:1rem}" +
        ".gs-item{display:flex;justify-content:space-between;gap:1rem;padding:.875rem 0;border-top:1px solid " +
        border +
        "}" +
        ".gs-item:first-child{border-top:none;padding-top:0}" +
        ".gs-class{font-weight:700;text-transform:uppercase;font-size:.875rem}" +
        ".gs-time{color:" +
        muted +
        ";font-size:.8125rem;white-space:nowrap}" +
        ".gs-book{display:inline-block;margin-top:1rem;background:" +
        accent +
        ";color:" +
        accentText +
        ";text-decoration:none;padding:.75rem 1.25rem;font-size:.75rem;font-weight:700;letter-spacing:.08em;text-transform:uppercase}" +
        ".gs-powered{margin-top:1.25rem;padding-top:.75rem;border-top:1px solid " +
        border +
        ";font-size:.6875rem;color:" +
        muted +
        ";text-align:center}" +
        ".gs-powered a{color:" +
        muted +
        ";font-weight:600;text-decoration:none}";

      var root = document.createElement("div");
      root.className = "gs-schedule";
      root.style.background = bg;
      root.style.color = text;

      var styleEl = document.createElement("style");
      styleEl.textContent = styles;
      root.appendChild(styleEl);

      if (tenantInfo.logoUrl) {
        var logoWrap = document.createElement("div");
        logoWrap.style.marginBottom = "0.75rem";
        var logo = document.createElement("img");
        logo.src = tenantInfo.logoUrl;
        logo.alt = tenantInfo.name || tenant;
        logo.style.height = "2rem";
        logo.style.maxWidth = "8rem";
        logo.style.objectFit = "contain";
        logoWrap.appendChild(logo);
        root.appendChild(logoWrap);
      }

      var heading = document.createElement("p");
      heading.style.margin = "0 0 .25rem";
      heading.style.fontWeight = "700";
      heading.style.letterSpacing = "0.04em";
      heading.style.textTransform = "uppercase";
      heading.textContent = "Weekly Class Schedule";
      root.appendChild(heading);

      var subtitle = document.createElement("p");
      subtitle.style.margin = "0 0 1rem";
      subtitle.style.color = muted;
      subtitle.style.fontSize = ".875rem";
      subtitle.textContent = tenantInfo.name
        ? "Live timetable for " + tenantInfo.name + "."
        : "Live from GymSynk.";
      root.appendChild(subtitle);

      var tabs = document.createElement("div");
      tabs.className = "gs-tabs";

      var panel = document.createElement("div");
      panel.className = "gs-panel";

      function renderPanel(dayName) {
        var items = classesForDay(dayName);
        panel.innerHTML =
          '<p style="margin:0 0 .25rem;font-weight:700;letter-spacing:.05em;text-transform:uppercase">' +
          dayName +
          "</p>" +
          '<p style="margin:0 0 1rem;color:' +
          muted +
          ';font-size:.8125rem;text-transform:uppercase">' +
          items.length +
          " class" +
          (items.length === 1 ? "" : "es") +
          "</p>";

        if (items.length === 0) {
          panel.innerHTML +=
            '<p style="color:' + muted + '">No classes scheduled.</p>';
          return;
        }

        var list = document.createElement("div");
        items.forEach(function (item) {
          var row = document.createElement("div");
          row.className = "gs-item";
          row.innerHTML =
            '<span class="gs-class">' +
            item.classTitle +
            '</span><span class="gs-time">' +
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

      if (!hideBook && bookUrl) {
        var book = document.createElement("a");
        book.className = "gs-book";
        book.href = bookUrl;
        book.target = "_top";
        book.rel = "noopener noreferrer";
        book.textContent = "Book a Session";
        root.appendChild(book);
      }

      var powered = document.createElement("p");
      powered.className = "gs-powered";
      powered.innerHTML =
        'Powered by <a href="https://gymsynk.net" target="_blank" rel="noopener noreferrer">GymSynk</a>';
      root.appendChild(powered);

      mount.innerHTML = "";
      mount.appendChild(root);
    })
    .catch(function (error) {
      mount.innerHTML =
        '<p style="font-family:sans-serif;color:#b00020">' +
        (error && error.message ? error.message : "Schedule unavailable") +
        "</p>";
    });
})();
