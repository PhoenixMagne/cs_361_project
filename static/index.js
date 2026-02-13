const uploadForm = document.getElementById("uploadForm");
const recipeSearch = document.getElementById("recipeSearch");
const resultsList = document.getElementById("searchResults");
const feed = document.getElementById("feed");

let presets = [];

// Load presets from server
fetch('/api/foods') // Update server.js to point to your new json
    .then(res => res.json())
    .then(data => presets = data);

// 1. SEARCH LOGIC (User Story 1 / IH#4 / IH#7)
recipeSearch.addEventListener("input", (e) => {
    const query = e.target.value.toLowerCase();
    resultsList.innerHTML = "";
    if (query.length < 1) return resultsList.classList.add("hidden");

    const matches = presets.filter(r => r.name.toLowerCase().includes(query));
    matches.forEach(match => {
        const li = document.createElement("li");
        li.textContent = match.name;
        li.onclick = () => addRecipeToFeed(match);
        resultsList.appendChild(li);
    });
    resultsList.classList.remove("hidden");
});

// 2. UPLOAD LOGIC (User Story 3 - No Text Inputs)
uploadForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const fileInput = document.getElementById("recipeFile");
    const imageInput = document.getElementById("recipeImage");
    const file = fileInput.files[0];
    
    if (!file) {
        alert("Error: Please select a .txt file.");
        return;
    }

    try {
        const text = await file.text();
        
        // Split by newlines, carriage returns, OR if the file is one giant line, 
        // look for common delimiters like "1." or "$"
        let lines = text.split(/\r\n|\r|\n/).map(l => l.trim()).filter(l => l.length > 0);

        // Fallback: If it's still 1 line, try splitting by specific patterns
        if (lines.length === 1) {
            // Attempt to split by numbered lists (e.g., "1. ")
            lines = text.split(/(?=\d\.\s)/); 
        }

        if (lines.length < 2) {
            alert("File format error: Ensure your name, price, and ingredients are on different lines.");
            return;
        }

        // Mapping logic with safety checks
        const name = lines[0];
        const price = lines[1] ? lines[1].replace(/[^0-9.]/g, '') : "0.00"; // Extracts just the number
        const ingredients = lines[2] ? lines[2].split(',').map(i => i.trim()) : ["See steps"];
        const steps = lines.slice(3);

        const newRecipe = {
            name: name,
            price: price,
            ingredients: ingredients,
            steps: steps.length > 0 ? steps : ["No steps provided."],
            photo: imageInput.files[0] ? URL.createObjectURL(imageInput.files[0]) : "https://cdn-icons-png.flaticon.com/512/706/706164.png",
            rating: 5,
            isFavorite: false
        };

        addRecipeToFeed(newRecipe);
        uploadForm.reset();
        alert("Recipe processed successfully! (IH#6)");

    } catch (err) {
        console.error("Parsing error:", err);
        alert("Error reading file.");
    }
});

// 3. DISPLAY LOGIC (User Story 2 / IH#3)
function addRecipeToFeed(recipe) {
    const card = document.createElement("article");
    card.className = "post";
    
    const starClass = recipe.isFavorite ? 'active' : 'inactive';
    const starIcon = recipe.isFavorite ? '★' : '☆';

    // Separate HTML elements for each piece of data
    card.innerHTML = `
        <div class="favorite-star ${starClass}" title="Toggle Favorite">${starIcon}</div>
        <img src="${recipe.photo}" class="post-image">
        
        <h3>${recipe.name}</h3> 
        
        <div class="recipe-info">
            <p class="price"><strong>Price:</strong> $${recipe.price}</p>
            <p class="ingredients"><strong>Ingredients:</strong> ${recipe.ingredients.join(', ')}</p>
        </div>

        <div class="recipe-steps" style="display:none; font-size: 0.85rem; margin-top: 10px; text-align: left;">
            <strong>Steps:</strong>
            <ol>${recipe.steps.map(step => `<li>${step}</li>`).join('')}</ol>
        </div>
        
        <button class="view-steps-btn">View Steps</button>
        <button class="delete-btn">Remove</button>
    `;
    
    // Toggle Steps Visibility
    const stepsDiv = card.querySelector(".recipe-steps");
    card.querySelector(".view-steps-btn").onclick = (e) => {
        const isHidden = stepsDiv.style.display === "none";
        stepsDiv.style.display = isHidden ? "block" : "none";
        e.target.textContent = isHidden ? "Hide Steps" : "View Steps";
    };

    // Favorite Logic
    const starBtn = card.querySelector(".favorite-star");
    starBtn.onclick = () => {
        recipe.isFavorite = !recipe.isFavorite;
        starBtn.classList.toggle("active");
        starBtn.classList.toggle("inactive");
        starBtn.textContent = recipe.isFavorite ? '★' : '☆';
    };

    // Delete Logic
    card.querySelector(".delete-btn").onclick = () => {
        if(confirm("Permanently delete this recipe? (IH#8)")) card.remove();
    };

    feed.prepend(card);
}