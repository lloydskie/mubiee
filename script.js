// Custom collection of movies (only title and video manually defined)
// To add a series, use same title for multiple entries
const myMovies = [
    { title: "John Wick: Chapter 1", video: "YjfM2RkAZ0/casfWfq_clean.mkv" },
    { title: "John Wick: Chapter 2", video: "YjfM2RkAZ0/casfWfq_clean.mkv" },
    { title: "John Wick: Chapter 3", video: "YjfM2RkAZ0/casfWfq_clean.mkv" },
    { title: "John Wick: Chapter 4", video: "YjfM2RkAZ0/casfWfq_clean.mkv" },
    { title: "Transformers", video: "YjfM2RkAZ0/casfWfq_clean.mkv" },
    { title: "Transformers: Revenge of the Fallen", video: "YjfM2RkAZ0/casfWfq_clean.mkv" },
    { title: "Transformers: Dark of the Moon", video: "YjfM2RkAZ0/casfWfq_clean.mkv" },
    { title: "Transformers: Age of Extinction", video: "YjfM2RkAZ0/casfWfq_clean.mkv" },
    { title: "Transformers: The Last Knight", video: "YjfM2RkAZ0/casfWfq_clean.mkv" },
    { title: "Bumblebee", video: "YjfM2RkAZ0/casfWfq_clean.mkv" },
    { title: "Transformers: Rise of the Beasts", video: "YjfM2RkAZ0/casfWfq_clean.mkv" },
    // Example series: Fast & Furious with custom episode labels
    { title: "Fast & Furious", video: "YjfM2RkAZ0/casfWfq_clean.mkv", label: "Episode 1 Part 1" },
    { title: "Fast & Furious", video: "YjfM2RkAZ0/casfWfq_clean.mkv", label: "Episode 1 Part 2" },
    { title: "Snowden", video: "YjfM2RkAZ0/casfWfq_clean.mkv" },
    // add more movies here: { title: "Movie Title", video: "video_url.mp4", label: "Custom Label" }
];

// TMDB API key (replace with your own key)
const TMDB_API_KEY = "49787128da94b3585b21dac5c4a92fcc";

// Fetch movie info from TMDB
async function fetchMovieInfo(title) {
    const url = `https://api.themoviedb.org/3/search/movie?api_key=${TMDB_API_KEY}&query=${encodeURIComponent(title)}`;
    const res = await fetch(url);
    const data = await res.json();
    if (data.results && data.results.length > 0) {
        const movie = data.results[0];
        return {
            id: movie.id,
            title: movie.title,
            year: movie.release_date ? movie.release_date.slice(0, 4) : "",
            overview: movie.overview,
            poster: movie.poster_path ? `https://image.tmdb.org/t/p/w300${movie.poster_path}` : "",
        };
    }
    return {
        id: "",
        title,
        year: "",
        overview: "No info found.",
        poster: "",
    };
}

// Prepare movies with TMDB info
async function prepareMovies() {
    // Group by title for series support, keep label
    const grouped = {};
    for (const m of myMovies) {
        if (!grouped[m.title]) grouped[m.title] = [];
        grouped[m.title].push({ video: m.video, label: m.label });
    }
    const movies = [];
    for (const title in grouped) {
        const info = await fetchMovieInfo(title);
        movies.push({
            ...info,
            videos: grouped[title], // array of {video, label}
        });
    }
    return movies;
}

// Elements
const movieRow = document.getElementById("movieRow");
const searchInput = document.getElementById("search");

// Render all movies
function renderMovies(list) {
    movieRow.innerHTML = "";
        list.forEach(movie => {
                const card = document.createElement("div");
                card.classList.add("card", "text-white");
                card.style.width = "160px";
                card.addEventListener("click", () => openMovie(movie));
                let seriesBadge = "";
                if (movie.videos && movie.videos.length > 1) {
                        seriesBadge = `<span class='badge bg-warning text-dark' style='position:absolute;top:5px;right:5px;'>Series</span>`;
                        card.style.position = "relative";
                }
                card.innerHTML = `
            <img src="${movie.poster}" class="card-img-top" alt="${movie.title}">
            ${seriesBadge}
            <div class="card-body">
                <h6 class="card-title">${movie.title}</h6>
                <p class="card-text">${movie.year}</p>
            </div>
        `;
                movieRow.appendChild(card);
        });
}

// Open modal with video
function openMovie(movie) {
    const modalTitle = document.getElementById("movieTitle");
    const modalInfo = document.getElementById("movieInfo");
    modalTitle.textContent = movie.title;
    modalInfo.textContent = movie.overview;

    // Remove previous player instance
    document.getElementById("player").innerHTML = "";

    // If series, show episode selector and Play All button
    if (movie.videos && movie.videos.length > 1) {
        const playerDiv = document.getElementById("player");
        // Play All button
        const playAllBtn = document.createElement("button");
        playAllBtn.className = "btn btn-success mb-2";
        playAllBtn.textContent = "Play All";
        playAllBtn.style.display = "block";
        playAllBtn.style.margin = "0 auto 10px auto";
        playerDiv.appendChild(playAllBtn);

        // Create episode selector
        const selector = document.createElement("select");
        selector.className = "form-select mb-2";
        selector.style.maxWidth = "300px";
        selector.style.margin = "0 auto";
        movie.videos.forEach((ep, idx) => {
            const opt = document.createElement("option");
            opt.value = ep.video;
            opt.textContent = ep.label ? ep.label : `Episode ${idx + 1}`;
            selector.appendChild(opt);
        });
        playerDiv.appendChild(selector);
        // Player container
        const playerContainer = document.createElement("div");
        playerContainer.id = "playerjs-series";
        playerDiv.appendChild(playerContainer);

        // Track play all state
        let playAllActive = false;
        let currentIdx = 0;

        // Listen for Playerjs events globally (must be set before player init)
        window.onPlayerjsEvent = function(event, data) {
            if (event === "ended" && playAllActive) {
                if (currentIdx < movie.videos.length - 1) {
                    currentIdx++;
                    selector.selectedIndex = currentIdx;
                    playEpisodeByIndex(currentIdx, true);
                } else {
                    playAllActive = false;
                }
            }
        };

        // Play episode by index
        function playEpisodeByIndex(idx, autoNext = false) {
            playerContainer.innerHTML = "";
            currentIdx = idx;
            playAllActive = autoNext;
            // Playerjs will call window.onPlayerjsEvent automatically
            const player = new Playerjs({
                id: "playerjs-series",
                file: movie.videos[idx].video,
                poster: movie.poster,
                title: movie.title,
                autoplay: autoNext ? 1 : 0
            });
            window.playerjs_series_instance = player;
        }

        // Play first episode by default
        playEpisodeByIndex(0);

        selector.addEventListener("change", e => {
            playEpisodeByIndex(selector.selectedIndex);
        });

        playAllBtn.addEventListener("click", () => {
            playEpisodeByIndex(0, true);
        });
    } else {
        // Single movie
        new Playerjs({
            id: "player",
            file: movie.videos ? movie.videos[0].video : movie.video,
            poster: movie.poster,
            title: movie.title,
            autoplay: 0
        });
    }

    const movieModal = new bootstrap.Modal(document.getElementById("movieModal"));
    movieModal.show();
}

let loadedMovies = [];

let fuse;

// Initial render: fetch TMDB info and render
prepareMovies().then(movies => {
    loadedMovies = movies;
    // Initialize Fuse.js for fuzzy search
    fuse = new Fuse(loadedMovies, {
        keys: ["title"],
        threshold: 0.4
    });
    renderMovies(loadedMovies);
    // Hide preloader
    const preloader = document.getElementById("preloader");
    if (preloader) preloader.style.display = "none";
});

// Search functionality with Fuse.js
searchInput.addEventListener("keyup", e => {
    const query = e.target.value.trim();
    if (!query) {
        renderMovies(loadedMovies);
        return;
    }
    // Use Fuse.js for fuzzy search
    const results = fuse.search(query);
    // Fuse.js returns array of {item, ...}
    renderMovies(results.map(r => r.item));
});

// Stop video player when modal is closed
document.getElementById("movieModal").addEventListener("hidden.bs.modal", function () {
    document.getElementById("player").innerHTML = "";
});
