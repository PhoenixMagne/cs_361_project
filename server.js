const fs = require('fs'); //node js. stuff
const path = require('path');
const express = require('express');




const app = express(); //express framework
const PORT = process.env.PORT || 8000;



app.use(express.static('public'));

app.use(express.json());

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

const zmq = require("zeromq");

//function to handle recipe parsing from txt files
app.post('/api/parse-recipe', async (req, res) => {
  const sock = new zmq.Request();
  sock.connect("tcp://localhost:5556");

  try {
      // Send the raw text to the Python service
      await sock.send(req.body.text);

      // Wait for the parsed JSON response
      const [result] = await sock.receive();
      res.json(JSON.parse(result.toString()));
  } catch (err) {
      console.error("Parser Service Error:", err);
      res.status(500).json({ error: "Parser microservice unreachable" });
  } finally {
      sock.close();
  }
});

// Function to talk to the C timer service using ZeroMQ
async function startTimer(seconds, id) {
  const sock = new zmq.Request();
  sock.connect("tcp://localhost:5555"); // The port that the timer service is listening on

  await sock.send(JSON.stringify({
    action: "start",
    timer_id: id,
    duration_seconds: seconds
  }));

  const [result] = await sock.receive();
  return JSON.parse(result.toString());
}

// Adds a new route to start a timer for a given number of seconds
app.get('/api/start-timer/:secs', async (req, res) => {
  try {
    const seconds = parseInt(req.params.secs);
    const timerId = `recipe_${Date.now()}`; 
    const response = await startTimer(seconds, timerId);
    
    // Send the response AND the ID back to the browser
    res.json({ ...response, timer_id: timerId }); 
  } catch (err) {
    res.status(500).json({ error: "Could not connect to C timer service" });
  }
});

app.get('/api/timer-status/:id', async (req, res) => {
  try {
    const timerId = req.params.id;
    const sock = new zmq.Request();
    sock.connect("tcp://localhost:5555");

    await sock.send(JSON.stringify({
      action: "status",
      timer_id: timerId
    }));

    const [result] = await sock.receive();
    res.json(JSON.parse(result.toString()));
  } catch (err) {
    console.error("ZMQ Status Error:", err);
    res.status(500).json({ error: "Service unavailable" });
  }
});

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

// Home Page (Main viewer and search)
app.get('/', (req, res) => {
  res.render('index'); // This will now point to your new collection view
});

// Add Recipes Page (The upload interface)
app.get('/add-recipe', (req, res) => {
  res.render('add_recipe'); // This points to the upload form page
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






// New endpoint to trigger the image download microservice
app.post('/api/get-recipe-image', async (req, res) => {
    const { query } = req.body;
    const sock = new zmq.Request();
    sock.connect("tcp://127.0.0.1:5557");

    try {
        // Send search request to Python Image Service
        await sock.send(JSON.stringify({
            query: query,
            limit: 1,           // We only need one good photo
            dest_dir: "public/downloads" // Save in public so frontend can see it
        }));

        const [result] = await sock.receive();
        const data = JSON.parse(result.toString());

        // Return the path of the first image found
        if (data.results && data.results.length > 0) {
            res.json({ imagePath: data.results[0] });
        } else {
            res.status(404).json({ error: "No images found" });
        }
    } catch (err) {
        console.error("Image Service Error:", err);
        res.status(500).json({ error: "Image service unreachable" });
    } finally {
        sock.close();
    }
});

app.post('/api/search-recipes', async (req, res) => {
  const { query, recipes } = req.body;
  const sock = new zmq.Request();
  sock.connect("tcp://127.0.0.1:5558");

  try {
      await sock.send(JSON.stringify({ query, recipes }));
      const [result] = await sock.receive();
      res.json(JSON.parse(result.toString()));
  } catch (err) {
      res.status(500).json({ error: "Search service unreachable" });
  } finally {
      sock.close();
  }
});



app.use('*', (req, res) => {
  res.status(404).render('404');
});

app.listen(PORT, () => {
  console.log(`Server listening on http://localhost:${PORT}`);
});
