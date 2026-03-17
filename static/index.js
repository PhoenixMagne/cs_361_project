// Global Variables
let presets = [];
const resultsList = document.getElementById("searchResults");
const feed = document.getElementById("feed");
const uploadForm = document.getElementById("uploadForm");
const recipeSearch = document.getElementById("recipeSearch");



// --- PERSISTENCE: Check for active timer on load ---
window.addEventListener('load', () => {
    const savedId = localStorage.getItem('activeTimerId');
    if (savedId) {
        console.log("Found existing timer:", savedId);
        // Resume UI and polling
        createTimerUI(savedId, 0, 0, true);
    }
});

// 1. INITIALIZATION LOGIC
document.addEventListener("DOMContentLoaded", () => {
    // Check if we have data in memory. If not, load the defaults once.
    if (!localStorage.getItem('myUploadedRecipes')) {
        const defaultRecipes = [
            {
                id: 101,
                name: "Classic Apple Pie",
                price: "15.00",
                ingredients: ["Apples", "Cinnamon", "Sugar", "Flour", "Butter"],
                steps: ["Preheat oven to 400F", "Mix apples with sugar", "Bake for 45 mins"],
                photo: "https://t4.ftcdn.net/jpg/00/59/96/75/360_F_59967553_9g2bvhTZf18zCmEVWcKigEoevGzFqXzq.jpg",
                rating: 5,
                isFavorite: true
            },
            {
                id: 102,
                name: "Chocolate Chip Cookies",
                price: "8.00",
                ingredients: ["Chocolate Chips", "Flour", "Eggs", "Sugar"],
                steps: ["Mix ingredients", "Scoop onto pan", "Bake at 350F for 10 mins"],
                photo: "https://t4.ftcdn.net/jpg/00/50/92/77/360_F_50927710_elmSp0YX0pbB8c72wi2bFXbTOu7U0dTU.jpg",
                rating: 4,
                isFavorite: false
            }
        ];
        localStorage.setItem('myUploadedRecipes', JSON.stringify(defaultRecipes));
    }

    // Load presets (for search suggestions)
    fetch('/api/foods')
        .then(res => res.json())
        .then(data => {
            presets = data;
            if (feed) renderFullCollection();
        });

    if (uploadForm) setupUploadHandler();
});

// 2. RENDERING LOGIC
function renderFullCollection() {
    feed.innerHTML = ""; 
    const savedRecipes = JSON.parse(localStorage.getItem('myUploadedRecipes') || "[]");
    
    if (savedRecipes.length === 0) {
        feed.innerHTML = "<p style='grid-column: 1/4; text-align: center; color: #888;'>Your collection is empty. Add a recipe to get started!</p>";
        return;
    }

    savedRecipes.forEach(recipe => addRecipeToFeed(recipe));
}

// 3. SEARCH LOGIC (US#1 / IH#4 / IH#7)
if (recipeSearch) {
    recipeSearch.addEventListener("input", async (e) => {
        const query = e.target.value.toLowerCase();
        resultsList.innerHTML = "";
        
        if (query.length < 1) {
            resultsList.classList.add("hidden");
            renderFullCollection(); 
            return;
        }

        const currentStoredRecipes = JSON.parse(localStorage.getItem('myUploadedRecipes') || "[]");

        try {
            const response = await fetch('/api/search-recipes', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ query, recipes: currentStoredRecipes })
            });
            const data = await response.json();
            const matches = data.results;

            matches.forEach(match => {
                const li = document.createElement("li");
                li.innerHTML = `<span>${match.name}</span> <span class="meta">$${match.price}</span>`;
                
                li.onclick = () => {
                    feed.innerHTML = "";
                    addRecipeToFeed(match);
                    resultsList.classList.add("hidden");
                    recipeSearch.value = match.name;
                };
                resultsList.appendChild(li);
            });

            if (matches.length > 0) resultsList.classList.remove("hidden");
        } catch (err) {
            console.error("Search microservice failed", err);
        }
    });

    recipeSearch.addEventListener("keypress", (e) => {
        if (e.key === "Enter") {
            resultsList.classList.add("hidden");
            // The input listener already filtered the feed
        }
    });
}

// 4. ADD RECIPE LOGIC
function setupUploadHandler() {
    uploadForm.addEventListener("submit", async (e) => {
        e.preventDefault();
        const recipeFile = document.getElementById("recipeFile").files[0];
        const imageFile = document.getElementById("recipeImage").files[0];
        
        if (!recipeFile) return alert("Please select a .txt file.");

        try {
            // 1. Read raw text from the file locally
            const rawText = await recipeFile.text();

            // 2. Send text to our Node backend (talks to Parser Microservice on Port 5556)
            const response = await fetch('/api/parse-recipe', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ text: rawText })
            });
            
            const parsedData = await response.json();
            if (parsedData.status === "error") throw new Error(parsedData.message);

            // 3. Image Logic: User Upload OR Microservice Search
            let imageDataUrl = "https://cdn-icons-png.flaticon.com/512/706/706164.png"; // Default fallback
            
            if (imageFile) {
                // User provided an image: Process as Base64
                imageDataUrl = await new Promise((resolve) => {
                    const reader = new FileReader();
                    reader.onloadend = () => resolve(reader.result);
                    reader.readAsDataURL(imageFile);
                });
            } else {
                // No image provided: Call Image Download Microservice (Port 5557)
                console.log("Searching for image for:", parsedData.name);
                try {
                    const imageRes = await fetch('/api/get-recipe-image', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ query: parsedData.name }) 
                    });
                    
                    const imageData = await imageRes.json();
                    
                    if (imageData.imagePath) {
                        // This removes 'public/' from the start of the string
                        // e.g. "public/downloads/000001.jpg" becomes "/downloads/000001.jpg"
                        let cleanPath = imageData.imagePath.replace(/^public\//, '');
                        
                        // Add a leading slash if it's missing
                        if (!cleanPath.startsWith('/')) {
                            cleanPath = '/' + cleanPath;
                        }
                        
                        imageDataUrl = cleanPath;
                        console.log("Image path being saved to recipe:", imageDataUrl);
                    }
                } catch (imgErr) {
                    console.error("Auto-image failed, using default icon.", imgErr);
                }
            }

            // 4. Create the final recipe object
            const newRecipe = {
                id: Date.now(),
                name: parsedData.name || "New Recipe",
                price: parsedData.price || "0.00",
                ingredients: parsedData.ingredients || [],
                steps: parsedData.steps || [],
                photo: imageDataUrl,
                isFavorite: false
            };

            // 5. Store in LocalStorage
            const current = JSON.parse(localStorage.getItem('myUploadedRecipes') || "[]");
            current.push(newRecipe);
            localStorage.setItem('myUploadedRecipes', JSON.stringify(current));

            alert("Success! Recipe parsed and image found.");
            window.location.href = "/"; 

        } catch (err) {
            console.error(err);
            alert("Error: " + err.message);
        }
    });
}
// 5. DISPLAY & INTERACTION LOGIC
function addRecipeToFeed(recipe) {
    const card = document.createElement("article");
    card.className = "post";
    const starClass = recipe.isFavorite ? 'active' : 'inactive';
    const starIcon = recipe.isFavorite ? '★' : '☆';

    card.innerHTML = `
        <div class="favorite-star ${starClass}" title="Toggle Favorite">${starIcon}</div>
        <img src="${recipe.photo}" class="post-image">
        <h3>${recipe.name}</h3> 
        <div class="recipe-info">
            <p><strong>Price:</strong> $${recipe.price}</p>
            <p><strong>Ingredients:</strong> ${(recipe.ingredients || []).join(', ')}</p>
        </div>
        <div class="recipe-steps" style="display:none; font-size: 0.85rem; margin-top: 10px;">
            <strong>Steps:</strong>
            <ol>${recipe.steps.map(step => `<li>${step}</li>`).join('')}</ol>
        </div>
        <button class="view-steps-btn">View Steps</button>
        <button class="delete-btn">Remove</button>
    `;
    
    const stepsDiv = card.querySelector(".recipe-steps");
    card.querySelector(".view-steps-btn").onclick = (e) => {
        const isHidden = stepsDiv.style.display === "none";
        stepsDiv.style.display = isHidden ? "block" : "none";
        e.target.textContent = isHidden ? "Hide Steps" : "View Steps";
    };

    const starBtn = card.querySelector(".favorite-star");
    starBtn.onclick = () => {
        recipe.isFavorite = !recipe.isFavorite;
        const saved = JSON.parse(localStorage.getItem('myUploadedRecipes') || "[]");
        const index = saved.findIndex(r => r.id === recipe.id);
        if (index !== -1) {
            saved[index].isFavorite = recipe.isFavorite;
            localStorage.setItem('myUploadedRecipes', JSON.stringify(saved));
        }
        starBtn.classList.toggle("active");
        starBtn.classList.toggle("inactive");
        starBtn.textContent = recipe.isFavorite ? '★' : '☆';
    };

    card.querySelector(".delete-btn").onclick = () => {
        if(confirm("Permanently delete this recipe? (IH#8)")) {
            const saved = JSON.parse(localStorage.getItem('myUploadedRecipes') || "[]");
            const filtered = saved.filter(r => r.id !== recipe.id);
            localStorage.setItem('myUploadedRecipes', JSON.stringify(filtered));
            card.remove();
        }
    };

    if (feed) feed.prepend(card);
}

// --- TIMER WINDOW TOGGLE LOGIC ---
const timerMenuBtn = document.getElementById('timerMenuBtn');
const timerDropdown = document.getElementById('timerDropdown');

if (timerMenuBtn && timerDropdown) {
    timerMenuBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        timerDropdown.classList.toggle('hidden');
    });

    window.addEventListener('click', (e) => {
        if (!timerDropdown.contains(e.target) && !timerMenuBtn.contains(e.target)) {
            timerDropdown.classList.add('hidden');
        }
    });
}

// --- TIMER CONTROL LOGIC ---
const startTimerBtn = document.getElementById('startTimerBtn');
const activeTimersContainer = document.getElementById('activeTimers');

if (startTimerBtn) {
    startTimerBtn.addEventListener('click', () => {
        const mins = parseInt(document.getElementById('timerMins').value) || 0;
        const secs = parseInt(document.getElementById('timerSecs').value) || 0;
        const totalDuration = (mins * 60) + secs;

        if (totalDuration <= 0) {
            alert("Please enter a valid time!");
            return;
        }

        fetch(`/api/start-timer/${totalDuration}`)
            .then(res => res.json())
            .then(data => {
                if (data.status === 'success') {
                    // PERSISTENCE: Save the ID
                    localStorage.setItem('activeTimerId', data.timer_id);
                    createTimerUI(data.timer_id, mins, secs);
                    document.getElementById('timerMins').value = '';
                    document.getElementById('timerSecs').value = '';
                }
            });
    });
}

// --- UI AND POLLING LOGIC ---
function createTimerUI(timerId, m, s, isResume = false) {
    const container = document.getElementById('activeTimers');
    const emptyMsg = container.querySelector('.empty-msg');
    if (emptyMsg) emptyMsg.remove();

    const timerCard = document.createElement('div');
    timerCard.className = 'timer-card';
    
    // Initial display logic
    let initialM = m + Math.floor(s / 60);
    let initialS = s % 60;
    const initialText = isResume ? "--:--" : `${initialM}:${initialS < 10 ? '0' : ''}${initialS}`;

    timerCard.innerHTML = `
        <div class="timer-info">
            <span class="timer-label">Baking...</span>
            <span id="display-${timerId}" class="time-display">${initialText}</span>
        </div>
    `;
    container.appendChild(timerCard);

    const displaySpan = document.getElementById(`display-${timerId}`);

    const interval = setInterval(() => {
        fetch(`/api/timer-status/${timerId}`)
            .then(res => res.json())
            .then(data => {
                if (data.status === 'FINISHED') {
                    displaySpan.innerText = "DONE!";
                    displaySpan.style.color = "#d9534f"; 
                    localStorage.removeItem('activeTimerId'); // Cleanup persistence
                    
                    const alertSound = new Audio('/alert.mp3');
                    alertSound.play().catch(e => console.log("Sound blocked."));
                    
                    setTimeout(() => {
                        alert("Timer Finished! Your recipe is ready.");
                    }, 100);

                    clearInterval(interval);
                    setTimeout(() => timerCard.remove(), 10000);
                } else if (data.status === 'not_found') {
                    localStorage.removeItem('activeTimerId');
                    clearInterval(interval);
                    timerCard.remove();
                } else if (data.remaining_ms !== undefined) {
                    const totalSecs = Math.max(0, Math.round(data.remaining_ms / 1000));
                    const mRem = Math.floor(totalSecs / 60);
                    const sRem = totalSecs % 60;
                    displaySpan.innerText = `${mRem}:${sRem < 10 ? '0' : ''}${sRem}`;
                }
            })
            .catch(err => {
                console.error("Polling error:", err);
                clearInterval(interval);
            });
    }, 1000);
}