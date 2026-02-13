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
    const file = document.getElementById("recipeFile").files[0];
    
    if (!file) {
        alert("Please select a .txt file to upload."); // IH#8
        return;
    }

    const text = await file.text();
    // Logic: Assume text file has Name on line 1, Price on line 2, then Ingredients
    const lines = text.split('\n');
    
    const newRecipe = {
        name: lines[0] || "Unnamed Recipe",
        price: lines[1] || "0.00",
        rating: 0,
        isFavorite: false,
        ingredients: lines.slice(2, 5),
        steps: lines.slice(5),
        photo: "https://cdn-icons-png.flaticon.com/512/706/706164.png"
    };

    addRecipeToFeed(newRecipe);
    uploadForm.reset();
    alert("Recipe added! Scroll down to view. (IH#6)"); 
});

// 3. DISPLAY LOGIC (User Story 2 / IH#3)
function addRecipeToFeed(recipe) {
    const card = document.createElement("article");
    card.className = "post";
    card.innerHTML = `
        <img src="${recipe.photo}" class="post-image">
        <h3>${recipe.name} ${recipe.isFavorite ? '⭐' : ''}</h3>
        <p><strong>Total Price:</strong> $${recipe.price}</p>
        <p><strong>User Rating:</strong> ${recipe.rating}/5</p>
        <p><strong>Ingredients:</strong> ${recipe.ingredients.join(', ')}</p>
        <button class="delete-btn">Remove Recipe</button> `;
    
    card.querySelector(".delete-btn").onclick = () => {
        if(confirm("Are you sure? This cannot be undone.")) card.remove(); // IH#8
    };

    feed.prepend(card);
}