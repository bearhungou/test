const express = require('express');
const mongoose = require('mongoose');
const session = require("express-session");
const multer = require('multer');
const ejs = require('ejs');
const app = express();
// set static assets
app.use(express.static(__dirname + '/public'));
app.set('view engine', 'ejs');
app.use(session({
  secret: 'restaurant',
  resave: false,
  saveUninitialized: true
}))

const Storage = multer.diskStorage({
  destination: function (req, file, callback) {
      callback(null, "./public");
  },
  filename: function (req, file, callback) {
      callback(null, file.fieldname + "_" + Date.now() + "_" + file.originalname);
  }
});
const upload = multer({ storage: Storage }).array("photo", 1); //Field name and max count

const bodyParser = require('body-parser');
app.use(bodyParser.json()); // support json encoded bodies
app.use(bodyParser.urlencoded({ extended: true })); // support encoded bodies

// db
const { userSchema, restaurantSchema } = require('./db');
const User = mongoose.model('User', userSchema);
const Restaurant = mongoose.model('Restaurant', restaurantSchema);
mongoose.connect('mongodb://admin:admin@localhost:27017/restaurant?authSource=admin', {
  useNewUrlParser: true, useUnifiedTopology: true
});
mongoose.connection.on("connected", async () => {
  console.log('connect mongodb success');
  // init data
  const users = await User.find();
  users.forEach(async item => {
    await User.remove({_id: item._id});
  });
  await User.create({ user_id: 'demo' });
  await User.create({ user_id: 'student' });
  console.log('init db success');
});
mongoose.connection.on("error", () => {
  console.log('connect mongodb error');
});

// views
app.get('/logout', async (req, res) => {
  req.session.user_id = undefined;
  res.render('login', { error: undefined });
});

app.get('/', async(req, res) => {
  if (!req.session.user_id || req.session.user_id === '') {
    res.render("login", { error: undefined });
  } else {
    const list = await Restaurant.find();
    res.render('index', {list: list.map(item => {
      return {
        restaurant_id: item.restaurant_id,
        name: item.name,
        borough: item.borough,
        cuisine: item.cuisine
      }
    }) || [], error: undefined});
  }
});

app.get('/login', async(req, res) => {
  res.render("login", { error: undefined });
});

app.get('/create', async(req, res) => {
  if (!req.session.user_id || req.session.user_id === '') {
    res.render("login", { error: undefined });
  } else {
    res.render("create", { error: undefined });
  }
});

app.get('/rate/:id', async (req, res) => {
  if (!req.session.user_id || req.session.user_id === '') {
    res.render("login", { error: undefined });
  } else {
    const id = req.params.id;
    res.render("rate", {id: id, error: undefined});
  }
});

app.get('/update/:id', async (req, res) => {
  if (!req.session.user_id || req.session.user_id === '') {
    res.render("login", { error: undefined });
  } else {
    const id = req.params.id;
    const result = await Restaurant.findOne({_id: id});
    res.render('update', { info: result || {}, error: undefined });
  }
});

// RESTFUL API
/**
 * login
 */
app.post('/api/login', async (req, res) => {
  const user_id = req.body.user_id;
  const password = req.body.password;
  try {
    const user = await User.findOne({ user_id });
    if (user && (user.user_id === 'demo' || user.user_id === 'student' || user.password === password)) {
      req.session.user_id = user.user_id;
      const list = await Restaurant.find();
      res.redirect('/')
    } else {
      res.render('login', {error: 'error'});
    }
  } catch (err) {
    res.render('login', {error: 'error'});
  }
});

/**
 * Search
 */
app.get('/api/restaurant/:property/:value', async (req, res) => {
  const property = req.params['property'];
  const value = req.params['value'];
  try {
    const filter = {};
    if (property && value) {
      filter[property] = value;
    }
    const list = await Restaurant.find(filter);
    res.render('index', {list: list.map(item => {
      return {
        restaurant_id: item.restaurant_id,
        name: item.name,
        borough: item.borough,
        cuisine: item.cuisine
      }
    }) || [], error: undefined});
  } catch (err) {
    res.render('login', {error: 'error'});
  }
});

/**
 * display restaurant documents
 */
app.get('/api/restaurant/:id', async (req, res) => {
  const id = req.params['id'];
  try {
    const result = await Restaurant.findOne({_id: id});
    res.render('info', { info: result || {}, error: undefined });
  } catch (err) {
    const list = await Restaurant.find();
    res.render('index', {list: list.map(item => {
      return {
        restaurant_id: item.restaurant_id,
        name: item.name,
        borough: item.borough,
        cuisine: item.cuisine
      }
    }) || [], error: undefined});
  }
});

/**
 * Create new restaurant documents
 */
app.post('/api/restaurant', async (req, res) => {
  upload(req, res, async function(err) {
    if (err) {
      const list = await Restaurant.find();
      res.render('index', {list: list.map(item => {
        return {
          restaurant_id: item.restaurant_id,
          name: item.name,
          borough: item.borough,
          cuisine: item.cuisine
        }
      }) || [], error: undefined});
    } else {
      const restaurant = req.body;
      if (!restaurant.name || restaurant.name.trim() === '') {
        res.render('create', { error: 'Please Input Name' });
        return;
      }
      try {
        if (req.files && req.files.length > 0) {
          restaurant.photo = req.files[0].path;
          restaurant.photo_mimetype = req.files[0].mimetype;
        } else {
          restaurant.photo = '';
          restaurant.photo_mimetype = '';
        }
        restaurant.owner = req.session.user_id;
        await Restaurant.create(restaurant);
        res.redirect('/');
      } catch (err) {
        const list = await Restaurant.find();
        res.render('index', {list: list.map(item => {
          return {
            restaurant_id: item.restaurant_id,
            name: item.name,
            borough: item.borough,
            cuisine: item.cuisine
          }
        }) || [], error: undefined});
      }
    }
  })
});

/**
 * update restaurant by id
 */
app.post('/api/restaurant/update', async (req, res) => {
  upload(req, res, async function(err) {
    if (err) {
      const list = await Restaurant.find();
      res.render('index', {list: list.map(item => {
        return {
          restaurant_id: item.restaurant_id,
          name: item.name,
          borough: item.borough,
          cuisine: item.cuisine
        }
      }) || [], error: undefined});
    } else {
      const restaurant = req.body;
      if (restaurant.owner === req.session.user_id) {
        if (!restaurant.name || restaurant.name.trim() === '') {
          res.render('update', { info: restaurant, error: 'Please Input Name' });
          return;
        }
        try {
          if (req.files && req.files.length > 0) {
            restaurant.photo = req.files[0].path;
            restaurant.photo_mimetype = req.files[0].mimetype;
          } else {
            restaurant.photo = '';
            restaurant.photo_mimetype = '';
          }
          restaurant.owner = req.session.user_id;
          await Restaurant.updateOne(restaurant);
          res.redirect(`/api/restaurant/${restaurant._id}`);
        } catch (err) {
          console.log(err);
          const list = await Restaurant.find();
          res.render('index', {list: list.map(item => {
            return {
              restaurant_id: item.restaurant_id,
              name: item.name,
              borough: item.borough,
              cuisine: item.cuisine
            }
          }) || [], error: undefined});
        }
      } else {
        res.render('info', { info: restaurant, error: "you could not update this restaurant" });
        return;
      }
    }
  });
});

/**
 * delete restaurant by id
 */
app.delete('/api/restaurant/:id', async (req, res) => {
  const id = req.params['id'];
  try {
    const restaurant = await Restaurant.findOne({_id: id});
    if (restaurant.owner === req.session.user_id) {
      await Restaurant.deleteOne({_id: id});
      const list = await Restaurant.find();
      res.send('ok');
    } else {
      res.send('error');
    }
  } catch (err) {
    res.send('error');
  }
});

/**
 * rate restaurant by id
 */
app.post('/api/rate/:id', async (req, res) => {
  const id = req.params['id'];
  const rate = req.body['rate'];
  try {
    if (isNaN(rate) || parseInt(rate) <= 0 || parseInt(rate > 10)) {
      const result = await Restaurant.findOne({_id: id});
      res.render('rate', { id: id, error: 'score > 0 and score <= 10' });
      return;
    }
    const restaurant = await Restaurant.findById(id);
    const temp = restaurant.grades.find(el => el.user === req.session.user_id);
    if (!temp) {
      restaurant.grades.push({
        user: req.session.user_id,
        score: rate
      });
      await Restaurant.updateOne(restaurant);
      res.redirect(`/api/restaurant/${restaurant._id}`);
    } else {
      res.render('rate', { id: id, error: 'A restaurant can only be rated once by the same user' });
    }
  } catch (err) {
    const list = await Restaurant.find();
    res.render('index', {list: list.map(item => {
      return {
        restaurant_id: item.restaurant_id,
        name: item.name,
        borough: item.borough,
        cuisine: item.cuisine
      }
    }) || [], error: undefined});
  }
});

// listen port
var server = app.listen(3000, function () {
  var host = server.address().address
  var port = server.address().port
  console.log("Listen at http://%s:%s", host, port)
});
