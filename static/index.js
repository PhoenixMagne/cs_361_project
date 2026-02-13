// Global Variables
let presets = [];
const resultsList = document.getElementById("searchResults");
const feed = document.getElementById("feed");
const uploadForm = document.getElementById("uploadForm");
const recipeSearch = document.getElementById("recipeSearch");

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
            // IF ON HOME PAGE: Render the memory
            if (feed) {
                renderFullCollection();
            }
        });

    if (uploadForm) {
        setupUploadHandler();
    }
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

// 1. SEARCH LOGIC (US#1 / IH#4 / IH#7)
if (recipeSearch) {
    recipeSearch.addEventListener("input", (e) => {
        const query = e.target.value.toLowerCase();
        resultsList.innerHTML = "";
        
        // IH#4: Familiar behavior - hide list if empty
        if (query.length < 1) {
            resultsList.classList.add("hidden");
            renderFullCollection(); // Show all recipes if search is cleared
            return;
        }

        // Get the most current collection from local memory
        const currentStoredRecipes = JSON.parse(localStorage.getItem('myUploadedRecipes') || "[]");
        
        // Filter through all fields (Name and Ingredients) for better usability
        const matches = currentStoredRecipes.filter(r => 
            r.name.toLowerCase().includes(query) || 
            r.ingredients.some(ing => ing.toLowerCase().includes(query))
        );

        matches.forEach(match => {
            const li = document.createElement("li");
            li.innerHTML = `<span>${match.name}</span> <span class="meta">$${match.price}</span>`;
            
            li.onclick = () => {
                // IH#6 Clear next steps: Show the specific result
                feed.innerHTML = "";
                addRecipeToFeed(match);
                resultsList.classList.add("hidden");
                recipeSearch.value = match.name;
            };
            resultsList.appendChild(li);
        });

        resultsList.classList.remove("hidden");
    });

    // IH#7: Multiple ways - Allow pressing "Enter" to filter the main feed
    recipeSearch.addEventListener("keypress", (e) => {
        if (e.key === "Enter") {
            const query = e.target.value.toLowerCase();
            const currentStoredRecipes = JSON.parse(localStorage.getItem('myUploadedRecipes') || "[]");
            const matches = currentStoredRecipes.filter(r => r.name.toLowerCase().includes(query));
            
            feed.innerHTML = "";
            matches.forEach(m => addRecipeToFeed(m));
            resultsList.classList.add("hidden");
        }
    });
}

// 4. ADD RECIPE LOGIC
function setupUploadHandler() {
    uploadForm.addEventListener("submit", async (e) => {
        e.preventDefault();
        const fileInput = document.getElementById("recipeFile");
        const imageInput = document.getElementById("recipeImage");
        const recipeFile = fileInput.files[0];
        const imageFile = imageInput.files[0];
        
        if (!recipeFile) return alert("Please select a .txt file.");

        try {
            const text = await recipeFile.text();
            let lines = text.split(/\r\n|\r|\n/).map(l => l.trim()).filter(l => l.length > 0);

            // HELPER: Convert image to Base64 string so it can be saved in memory
            let imageDataUrl = "https://cdn-icons-png.flaticon.com/512/706/706164.png"; // Default
            
            if (imageFile) {
                imageDataUrl = await new Promise((resolve) => {
                    const reader = new FileReader();
                    reader.onloadend = () => resolve(reader.result);
                    reader.readAsDataURL(imageFile);
                });
            }

            const newRecipe = {
                id: Date.now(),
                name: lines[0] || "New Recipe",
                price: lines[1] || "0.00",
                ingredients: lines[2] ? lines[2].split(',') : [],
                steps: lines.slice(3),
                photo: imageDataUrl, // This is now a permanent data string
                isFavorite: false
            };

            const current = JSON.parse(localStorage.getItem('myUploadedRecipes') || "[]");
            current.push(newRecipe);
            localStorage.setItem('myUploadedRecipes', JSON.stringify(current));

            alert("Success! Image and Recipe saved. (IH#6)");
            window.location.href = "/"; 

        } catch (err) {
            console.error(err);
            alert("Error reading files.");
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
            <p><strong>Ingredients:</strong> ${recipe.ingredients.join(', ')}</p>
        </div>
        <div class="recipe-steps" style="display:none; font-size: 0.85rem; margin-top: 10px;">
            <strong>Steps:</strong>
            <ol>${recipe.steps.map(step => `<li>${step}</li>`).join('')}</ol>
        </div>
        <button class="view-steps-btn">View Steps</button>
        <button class="delete-btn">Remove</button>
    `;
    
    // Toggle Steps
    const stepsDiv = card.querySelector(".recipe-steps");
    card.querySelector(".view-steps-btn").onclick = (e) => {
        const isHidden = stepsDiv.style.display === "none";
        stepsDiv.style.display = isHidden ? "block" : "none";
        e.target.textContent = isHidden ? "Hide Steps" : "View Steps";
    };

    // PERSISTENT FAVORITE LOGIC
    const starBtn = card.querySelector(".favorite-star");
    starBtn.onclick = () => {
        recipe.isFavorite = !recipe.isFavorite;
        
        // Update Local Storage
        const saved = JSON.parse(localStorage.getItem('myUploadedRecipes') || "[]");
        const index = saved.findIndex(r => r.id === recipe.id);
        if (index !== -1) {
            saved[index].isFavorite = recipe.isFavorite;
            localStorage.setItem('myUploadedRecipes', JSON.stringify(saved));
        }

        // Update UI
        starBtn.classList.toggle("active");
        starBtn.classList.toggle("inactive");
        starBtn.textContent = recipe.isFavorite ? '★' : '☆';
    };

    // PERSISTENT DELETE LOGIC
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