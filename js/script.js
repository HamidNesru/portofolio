"use strict";

/* ---------------------------------------------------------------
   Edit your project details here. Each key matches a
   data-project="..." attribute on a project button in index.html.
   --------------------------------------------------------------- */
const PROJECTS = {
  tanker: {
    title: "Amharic tanker calculator",
    summary: "A mobile-friendly tool that turns a dipstick reading into liters for a fuel tanker, with the interface in Amharic.",
    built: "The calculator reads a tank's dip chart and uses linear interpolation to estimate the volume between two chart readings, so the result is accurate even when the dip falls between listed values.",
    stack: "JavaScript, Linear interpolation, Amharic interface",
    links: [
      // { label: "Live demo", href: "https://..." },
      // { label: "Source code", href: "https://github.com/your-username/tanker-calculator" },
    ],
  },
  keno: {
    title: "Keno demo platform",
    summary: "A demo game platform used to practice building a full front end: a redesigned game screen, a countdown between rounds, phone-number login and an admin dashboard.",
    built: "I built the game interface, the countdown timer, the login flow and the admin dashboard as a single-page app. It is a demo for learning and showcasing the front end, not a live gambling service.",
    stack: "React, Vite, TypeScript",
    links: [
      // { label: "Live demo", href: "https://..." },
      // { label: "Source code", href: "https://github.com/your-username/keno-demo" },
    ],
  },
  portfolio: {
    title: "This portfolio",
    summary: "The site you are on now, built to show my work and make it easy to contact me.",
    built: "A mobile-first layout with CSS Grid and Flexbox, a light and dark theme that remembers your choice, smooth-scrolling navigation, a hamburger menu and accessible project dialogs. There is no framework or build step.",
    stack: "HTML5, CSS3, JavaScript (ES6+)",
    links: [
      // { label: "Source code", href: "https://github.com/your-username/portfolio" },
    ],
  },
};

/* ---------------- Theme toggle ---------------- */
(function themeToggle() {
  const root = document.documentElement;
  const btn = document.getElementById("theme-toggle");

  function sync() {
    const dark = root.getAttribute("data-theme") === "dark";
    btn.setAttribute("aria-label", dark ? "Switch to light theme" : "Switch to dark theme");
  }
  sync();

  btn.addEventListener("click", () => {
    const next = root.getAttribute("data-theme") === "dark" ? "light" : "dark";
    root.setAttribute("data-theme", next);
    try { localStorage.setItem("theme", next); } catch (e) { /* storage unavailable */ }
    sync();
  });
})();

/* ---------------- Mobile menu ---------------- */
(function mobileMenu() {
  const toggle = document.getElementById("menu-toggle");
  const nav = document.getElementById("site-nav");

  function setOpen(open) {
    nav.classList.toggle("is-open", open);
    toggle.setAttribute("aria-expanded", String(open));
    toggle.setAttribute("aria-label", open ? "Close menu" : "Open menu");
  }

  toggle.addEventListener("click", () => {
    setOpen(toggle.getAttribute("aria-expanded") !== "true");
  });

  // Close after choosing a link
  nav.addEventListener("click", (e) => {
    if (e.target.closest("a")) setOpen(false);
  });

  // Close with Escape and return focus to the button
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && toggle.getAttribute("aria-expanded") === "true") {
      setOpen(false);
      toggle.focus();
    }
  });

  // Reset when growing to the desktop layout
  window.matchMedia("(min-width: 860px)").addEventListener("change", (mq) => {
    if (mq.matches) setOpen(false);
  });
})();

/* ---------------- Highlight current section in nav ---------------- */
(function activeNav() {
  const links = Array.from(document.querySelectorAll('.site-nav a[href^="#"]'));
  const sections = links
    .map((a) => document.querySelector(a.getAttribute("href")))
    .filter(Boolean);
  if (!("IntersectionObserver" in window) || !sections.length) return;

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        links.forEach((a) => {
          const match = a.getAttribute("href") === "#" + entry.target.id;
          if (match) a.setAttribute("aria-current", "true");
          else a.removeAttribute("aria-current");
        });
      });
    },
    { rootMargin: "-45% 0px -50% 0px" }
  );

  sections.forEach((s) => observer.observe(s));
})();

/* ---------------- Project modal ---------------- */
(function projectModal() {
  const modal = document.getElementById("project-modal");
  const closeBtn = document.getElementById("modal-close");
  const title = document.getElementById("modal-title");
  const summary = document.getElementById("modal-summary");
  const built = document.getElementById("modal-built");
  const stack = document.getElementById("modal-stack");
  const links = document.getElementById("modal-links");
  let opener = null;

  function open(key, trigger) {
    const p = PROJECTS[key];
    if (!p) return;

    title.textContent = p.title;
    summary.textContent = p.summary;
    built.textContent = p.built;
    stack.textContent = p.stack;

    links.textContent = "";
    p.links.forEach((l, i) => {
      const a = document.createElement("a");
      a.href = l.href;
      a.target = "_blank";
      a.rel = "noopener";
      a.className = "btn " + (i === 0 ? "btn-primary" : "btn-ghost");
      a.textContent = l.label;
      links.appendChild(a);
    });

    opener = trigger;
    if (typeof modal.showModal === "function") {
      modal.showModal();
    } else {
      modal.setAttribute("open", "");
    }
  }

  document.querySelectorAll("[data-project]").forEach((btn) => {
    btn.addEventListener("click", () => open(btn.dataset.project, btn));
  });

  closeBtn.addEventListener("click", () => modal.close());

  // Click on the dimmed backdrop closes the dialog
  modal.addEventListener("click", (e) => {
    if (e.target === modal) modal.close();
  });

  // Return focus to the project that opened it
  modal.addEventListener("close", () => {
    if (opener) opener.focus();
  });
})();

/* ---------------- Resume print ---------------- */
document.getElementById("print-resume").addEventListener("click", () => window.print());

/* ---------------- Footer year ---------------- */
document.getElementById("year").textContent = new Date().getFullYear();
