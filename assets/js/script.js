// Theme toggle
const themeToggle = document.getElementById("theme-toggle");
const html = document.documentElement;

// Check for saved user preference or use system preference
if (
  localStorage.getItem("theme") === "dark" ||
  (!localStorage.getItem("theme") &&
    window.matchMedia("(prefers-color-scheme: dark)").matches)
) {
  html.classList.add("dark");
} else {
  html.classList.remove("dark");
}

// Toggle theme
themeToggle.addEventListener("click", () => {
  html.classList.toggle("dark");
  localStorage.setItem(
    "theme",
    html.classList.contains("dark") ? "dark" : "light",
  );
});

// Mobile menu toggle
const mobileMenuButton = document.getElementById("mobile-menu-button");
const mobileMenu = document.getElementById("mobile-menu");

mobileMenuButton.addEventListener("click", () => {
  mobileMenu.classList.toggle("hidden");
});

// Animate stats counting
function animateValue(id, start, end, duration) {
  const obj = document.getElementById(id);
  let startTimestamp = null;
  const step = (timestamp) => {
    if (!startTimestamp) startTimestamp = timestamp;
    const progress = Math.min((timestamp - startTimestamp) / duration, 1);
    obj.innerHTML = Math.floor(progress * (end - start) + start);
    if (progress < 1) {
      window.requestAnimationFrame(step);
    }
  };
  window.requestAnimationFrame(step);
}

// YouTube Subscriber Count
async function fetchYouTubeSubscribers() {
  try {
    const response = await fetch(
      "https://api.socialcounts.org/youtube-live-subscriber-count/UCXWyPfi0iwSE0UxgI6bthrQ",
    );
    const data = await response.json();
    return {
      subs: data.est_sub,
      channelViews:
        data.table.find((item) => item.name === "Channel Views")?.count || 0,
    };
  } catch (error) {
    console.error("Error fetching subscribers:", error);
    return {
      subs: 12500, // Fallback
      channelViews: 20000, // Fallback
    };
  }
}

// Blog Post Count from Hugo
async function fetchBlogPostCount() {
  try {
    const response = await fetch("https://blog.zynji.my.id/index.json");
    const data = await response.json();

    // Filter posts
    const validPosts = data.filter(
      (item) =>
        item.type === "posts" &&
        item.permalink &&
        !item.permalink.endsWith("/posts/"),
    );

    return validPosts.length; // Return count untuk digunakan di tempat lain
  } catch (error) {
    console.error("Gagal memuat post count:", error);
    return 0; // Return fallback value
  }
}

// Start animations when stats section is in view
const intersectionObserver = new IntersectionObserver(
  (entries) => {
    entries.forEach(async (entry) => {
      if (entry.isIntersecting) {
        // Mulai semua animasi kecuali projects-count
        const [yt, postCount] = await Promise.all([
          fetchYouTubeSubscribers(),
          fetchBlogPostCount(), // Sekarang return value bisa digunakan
        ]);
        animateValue("subscribers-count", 0, yt.subs, 2000);
        animateValue("posts-count", 0, postCount, 1500);
        animateValue("views-count", 0, yt.channelViews, 2500);

        // Set up mutation observer untuk projects count
        const projectsCountElement = document.getElementById("projects-count");
        const mutationObserver = new MutationObserver(() => {
          const count = parseInt(projectsCountElement.textContent);
          if (count > 0) {
            animateValue("projects-count", 0, count, 1000);
            mutationObserver.disconnect();
          }
        });

        mutationObserver.observe(projectsCountElement, {
          childList: true,
          subtree: true,
          characterData: true,
        });

        // Mulai memuat proyek
        fetchProjects();

        // Gunakan intersectionObserver untuk unobserve
        intersectionObserver.unobserve(entry.target);
      }
    });
  },
  { threshold: 0.5 },
);

// Panggil observer
const statsSection = document.querySelector(".bg-gray-100");
if (statsSection) {
  intersectionObserver.observe(statsSection);
}

function createProjectCard(project) {
  const categories = project.categories || [];
  const tags = project.tags || [];

  const card = document.createElement("div");
  card.className =
    "project-card bg-white dark:bg-gray-700 rounded-lg overflow-hidden shadow-sm hover:shadow-md transition-shadow";
  card.dataset.filters = [...categories, ...tags]
    .map((f) => f.toLowerCase())
    .join(" ");

  card.innerHTML = `
        <a href="https://blog.zynji.my.id${project.permalink || "#"}" target="_blank" rel="noopener noreferrer">
          <div class="h-48 bg-gray-200 dark:bg-gray-600 overflow-hidden">
            <img src="${project.image || "https://blog.zynji.my.id/thumb1.png"}"
                 alt="${project.title || "Project image"}"
                 class="w-full h-full object-cover"
                 loading="lazy">
          </div>
          <div class="p-6">
            <h3 class="text-xl font-semibold mb-2">${project.title || "Untitled Project"}</h3>
            <p class="text-gray-600 dark:text-gray-300 mb-4 line-clamp-2">
              ${project.description || "No description available"}
            </p>
            <div class="flex flex-wrap gap-2 mb-4">
              ${categories
                .map(
                  (cat) => `
                <span class="px-2 py-1 text-xs rounded-full bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">
                  ${cat}
                </span>
              `,
                )
                .join("")}
            </div>
            <div class="flex justify-between items-center text-sm text-gray-500 dark:text-gray-400">
              <span>${project.date}</span>
              <span class="flex items-center gap-1">
                <i class="far ${project.icon || "fa-file-alt"}"></i>
                ${project.readingTime || "3 min"}
              </span>
            </div>
          </div>
        </a>
      `;

  return card;
}

// Fetch projects from Hugo CMS with type: "project" filter
async function fetchProjects() {
  try {
    const projectsContainer = document.getElementById("projects-container");
    const loadingSkeleton = document.getElementById("loading-skeleton");
    const noProjectsMessage = document.getElementById("no-projects-message");

    // Show loading state
    projectsContainer.classList.add("hidden");
    loadingSkeleton.classList.remove("hidden");
    noProjectsMessage.classList.add("hidden");

    const response = await fetch("https://blog.zynji.my.id/en/index.json");
    const data = await response.json();

    // Filter for projects with type: "project" in front matter
    const projects = data.filter((item) => {
      return item.note && item.note.toLowerCase() === "project";
    });

    // Update the projects count immediately
    updateProjectsCount(projects.length);

    // Hide loading skeleton
    loadingSkeleton.classList.add("hidden");

    // Clear previous projects
    projectsContainer.innerHTML = "";

    if (projects.length === 0) {
      noProjectsMessage.classList.remove("hidden");
      return;
    }

    // Display filtered projects
    projects.forEach((project) => {
      const projectCard = createProjectCard(project);
      projectsContainer.appendChild(projectCard);
    });

    // Show projects container
    projectsContainer.classList.remove("hidden");

    // Initialize filter functionality
    initProjectFilters(projectsContainer.querySelectorAll(".project-card"));
  } catch (error) {
    console.error("Error fetching projects:", error);
    updateProjectsCount(0);
    loadingSkeleton.classList.add("hidden");
    projectsContainer.innerHTML = `
                <div class="col-span-full text-center py-12">
                    <i class="fas fa-exclamation-triangle text-4xl text-yellow-500 mb-4"></i>
                    <p class="text-gray-600 dark:text-gray-300">Failed to load projects. Please try again later.</p>
                </div>
            `;
    projectsContainer.classList.remove("hidden");
  }
}

// Helper function outside fetchProjects
function updateProjectsCount(count) {
  const countElement = document.getElementById("projects-count");
  countElement.textContent = count;

  // Also update the stats section counter if it exists
  const statsCountElement = document.querySelector(
    '#stats-section [id="projects-count"]',
  );
  if (statsCountElement) {
    statsCountElement.textContent = count;
  }
}

// Initialize project filtering with parameter
function initProjectFilters(projectCards) {
  const filterButtons = document.querySelectorAll(".project-filter");

  filterButtons.forEach((button) => {
    button.addEventListener("click", () => {
      // Update active button styling
      filterButtons.forEach((btn) => {
        btn.classList.remove("bg-blue-600", "text-white", "dark:bg-blue-700");
        btn.classList.add(
          "bg-gray-200",
          "text-gray-800",
          "hover:bg-gray-300",
          "dark:bg-gray-700",
          "dark:text-white",
          "dark:hover:bg-gray-600",
        );
      });

      button.classList.add("bg-blue-600", "text-white", "dark:bg-blue-700");
      button.classList.remove(
        "bg-gray-200",
        "text-gray-800",
        "hover:bg-gray-300",
        "dark:bg-gray-700",
        "dark:text-white",
        "dark:hover:bg-gray-600",
      );

      const filterValue = button.dataset.filter;
      let visibleCount = 0;

      // Filter projects
      projectCards.forEach((card) => {
        if (
          filterValue === "all" ||
          card.dataset.filters.includes(filterValue)
        ) {
          card.classList.remove("hidden");
          visibleCount++;
        } else {
          card.classList.add("hidden");
        }
      });

      // Update count after filtering
      updateProjectsCount(visibleCount);

      // Show/hide no projects message
      const noProjectsMessage = document.getElementById("no-projects-message");
      if (visibleCount === 0) {
        noProjectsMessage.classList.remove("hidden");
      } else {
        noProjectsMessage.classList.add("hidden");
      }
    });
  });
}

// Add IntersectionObserver for projects section
const projectsObserver = new IntersectionObserver(
  (entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        fetchProjects();
        projectsObserver.unobserve(entry.target);
      }
    });
  },
  { threshold: 0.1 },
);

const projectsSection = document.getElementById("projects");
if (projectsSection) {
  projectsObserver.observe(projectsSection);
}
