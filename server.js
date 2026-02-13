const fs = require('fs'); //node js. stuff
const path = require('path');
const express = require('express');

const app = express(); //express framework
const PORT = process.env.PORT || 8000;

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

app.use((req, _res, next) => { // gets date, method, url of request
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
  next();
});

app.use(express.static(path.join(__dirname, 'static')));

function loadPosts() {
  // Ignoring recipes.json for now, this is just a placeholder if we want to add it
  return [];
}

//parse json for food data that will be used as recipes in the add post form
app.get('/api/foods', (req, res) => {
  try {
    const foodData = fs.readFileSync(path.join(__dirname, 'recipes.json'), 'utf8'); //reads
    res.json(JSON.parse(foodData)); //sends json data
  } catch (err) {
    console.error("Error reading recipes.json:", err); //some error handling in case it fails
    res.json([]);
  }
});

app.get('/', (req, res) => { //routing for the home page
  res.render('index', {
    posts: loadPosts(),
    isSinglePostPage: false //saying its for the full home page
  });
});

app.get('/posts/:n', (req, res, next) => { //routing for individual posts
  const posts = loadPosts();
  const postIndex = Number.parseInt(req.params.n, 10); //converts string to number (base 10)

  if (Number.isNaN(postIndex) || postIndex < 0 || postIndex >= posts.length) { //some error handling again
    next();
    return;
  }

  res.render('index', { //renders ejs page for single post
    posts: [posts[postIndex]],
    isSinglePostPage: true
  });
});

app.get('/health', (_req, res) => { //saw this online and why not
  res.json({ status: 'ok' });
}); //basically if you hit this (our url/health) it should say status: ok. Did this
    // to check if server is running properly

app.use('*', (req, res) => {
  res.status(404).render('404');
});



app.listen(PORT, () => {
  console.log(`Server listening on http://localhost:${PORT}`);
});
