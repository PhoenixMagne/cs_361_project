// Daily Goal & Progress
let dailyGoal = 0;
let caloriesConsumed = 0;

const progressCircle = document.getElementById("progressCircle");
const progressText = document.getElementById("progressText");

function updateProgress() {
    if (dailyGoal <= 0) {
        progressText.textContent = "0%";
        progressCircle.className = "progress-circle";
        return;
    }

    const percent = Math.round((caloriesConsumed / dailyGoal) * 100);
    progressText.textContent = percent + "%";

    // reset classes
    progressCircle.className = "progress-circle";

    // under 50% → red
    if (percent < 50) {
        progressCircle.classList.add("red");
    }
    // 50% – 89% → yellow
    else if (percent < 90) {
        progressCircle.classList.add("yellow");
    }
    // 90% – 99% → green
    else if (percent < 100) {
        progressCircle.classList.add("green");
    }
    // exactly 100% → full glow green
    else if (percent === 100) {
        progressCircle.classList.add("green", "full");
    }
    // above 100% → danger red pulse
    else if (percent > 100) {
        progressCircle.classList.add("over");
    }
}

document.getElementById("goalForm").addEventListener("submit", (e) => {
    e.preventDefault();
    dailyGoal = parseInt(document.getElementById("dailyGoal").value);
    updateProgress();
});

//clear preset image if user uploads a file manually
document.getElementById("foodImage").addEventListener("change", () => {
    document.getElementById("presetImage").value = "";
});



//Adding Posts (Client Side Only)
const newPostForm = document.getElementById("newPostForm");
const feed = document.getElementById("feed");

newPostForm.addEventListener("submit", (e) => {
    e.preventDefault();

    const name = document.getElementById("foodName").value;
    const calories = parseInt(document.getElementById("calories").value);
    const description = document.getElementById("description").value;
    const fileInput = document.getElementById("foodImage");
    const presetInput = document.getElementById("presetImage");

    if (fileInput.files.length === 0 && !presetInput.value) {
        alert("Please upload an image or select a preset.");
        return;
    }

    caloriesConsumed += calories;
    updateProgress();

    const post = document.createElement("article");
    post.classList.add("post");

    let imgTag = "";
    const file = fileInput.files[0];

    if (file) {
        const url = URL.createObjectURL(file);
        imgTag = `<img src="${url}" class="post-image">`;
    } else if (presetInput.value) {
        imgTag = `<img src="${presetInput.value}" class="post-image">`;
    }

    post.innerHTML = `
        ${imgTag}
        <h3>${name}</h3>
        <p class="calories">Calories: <strong>${calories}</strong></p>
        <p class="description">${description}</p>
    `;

    feed.prepend(post);
    newPostForm.reset();
    presetInput.value = "";
});

// Add Post Button Scroll
document.getElementById("addPostBtn").addEventListener("click", () => {
    newPostForm.scrollIntoView({ behavior: "smooth" });
});

// Food item preset searching and handling
const foodSearchInput = document.getElementById("foodSearch");
const resultsList = document.getElementById("searchResults");

let foodData = [];

fetch('/api/foods')
    .then(res => res.json())
    .then(data => {
        foodData = data;
    })
    .catch(err => console.error("Could not load food data", err));

foodSearchInput.addEventListener("input", (e) => {
    const query = e.target.value.toLowerCase();
    resultsList.innerHTML = "";

    if (query.length < 1) {
        resultsList.classList.add("hidden");
        return;
    }

    const matches = foodData.filter(item =>
        item.name.toLowerCase().includes(query)
    );

    if (matches.length > 0) {
        matches.forEach(item => {
            const li = document.createElement("li");
            li.innerHTML = `
                <span>${item.name}</span>
                <span class="meta">${item.calories_per_100g} cal/100g</span>
            `;

            li.addEventListener("click", () => {
                selectFood(item);
            });

            resultsList.appendChild(li);
        });
        resultsList.classList.remove("hidden");
    } else {
        resultsList.classList.add("hidden");
    }
});

foodSearchInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
        e.preventDefault();
        const firstResult = resultsList.querySelector("li");
        if (firstResult) firstResult.click();
    }
});

document.addEventListener("click", (e) => {
    if (!foodSearchInput.contains(e.target) &&
        !resultsList.contains(e.target)) {
        resultsList.classList.add("hidden");
    }
});

function selectFood(item) {
    document.getElementById("foodName").value = item.name;
    document.getElementById("calories").value = item.calories_per_100g;
    document.getElementById("description").value = `A serving of ${item.type}`;

    const fileInput = document.getElementById("foodImage");
    const presetInput = document.getElementById("presetImage");

    fileInput.value = "";

    let finalUrl = "";
    if (item.photo) finalUrl = item.photo;
    else finalUrl = "https://cdn-icons-png.flaticon.com/512/706/706164.png";

    presetInput.value = finalUrl;
    imageStatus.innerHTML = "Preset selected - upload image to override preset image";

    foodSearchInput.value = "";
    resultsList.classList.add("hidden");
}

const imageStatus = document.getElementById("imageStatus");

document.getElementById("foodImage").addEventListener("change", () => {
    document.getElementById("presetImage").value = "";
    imageStatus.innerHTML = "";
});
