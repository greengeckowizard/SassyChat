const http = require('http');
const express = require('express')
const app = express();
const path = require('path')
const {v4: uuidV4} = require('uuid')
const bodyParser = require('body-parser'); // middleware
app.use(bodyParser.urlencoded({ extended: true }));
var session = require('express-session');
var multer = require('multer');
var upload = multer(); 
var cookieParser = require('cookie-parser');
app.use(upload.array());
app.use(cookieParser());
var port = 8080;
app.use(session({secret: "Your secret key"}));
const fs = require('fs');



const socketio = require('socket.io')
const formatMessage = require('./views/messages');
const {
  userJoin,
  getCurrentUser,
  userLeave,
  getRoomUsers
} = require('./views/users');

const server = http.createServer(app);

const io = socketio(server);

var Users = [];
var Newdata = fs.readFileSync('users.json');
var newData = JSON.stringify(Newdata);



app.use(express.json())


app.set('view engine', 'ejs');

app.set("views", path.join(__dirname, "views"))

app.set('views', './views'); // specify the views directory
-// Static Files
app.use(express.static('views'))
app.use('/css', express.static(__dirname + 'views/css'))
app.use('/js', express.static(__dirname + 'views/js'))
app.use('/img', express.static(__dirname + 'views/img'))

app.get('/', (req, res) => {
  res.render("home")  
})

app.get('/home', (req, res) => {
  res.render("home")  
})

app.get('/contact', (req, res) => {
  res.render("contact")  
})

app.get('/about', (req, res) => {
  res.render("about")  
})

app.get('/login', (req, res) => {
  res.render("login")  
})

app.get('/gecko', (req, res) => {
  res.render("gecko")  
})

app.get('/signup', (req, res) => {
  res.render("signup")  
})

app.get('/dashboard', (req, res) =>{
res.render("dashboard")
})

/// set it to here this chat file when you it logs in
app.get('/chat', (req, res) =>{
 res.render("whenloggedin")
})

app.get('/chatlogged', (req, res) =>{
  res.render("chatlogged")
 })


 
app.post("/login", (req, res) => {
  let form = req.body;
  let username = req.body["username"];
  let password = req.body["password"];
 //more cool cookiestuff 
 console.log(Users);
 if(!req.body.username || !req.body.password){
    res.render('login', {message: "Please enter both username and password"});
 } else {
    Users.filter(function(user){
       if(user.username === req.body.username && user.password === req.body.password){
          req.session.user = user;
          res.redirect('/protected_page');
       }
    });
    res.render('login', {message: "Invalid credentials!"});
 }
 
 app.get('/logout', function(req, res){
  req.session.destroy(function(){
     console.log("user logged out.")
  });
  res.redirect('/login');
});



  //chack user login
 //res.send(` Username:${username} Password:${password}`)
 

  console.log(`\x1b[42mNEW LOGIN REQUEST\x1b[0m: (${username} | ${password})`)
})


function checkSignIn(req, res,next){
  if(req.session.user){
     next();     //If session exists, proceed to page
  } else {
     var err = new Error("Not logged in!");
     console.log(req.session.user);
     next(err);  //Error, trying to access unauthorized page!
  }
}




app.post("/signup", (req, res) => {
  let form = req.body;
  let username = req.body["username"];
  let password = req.body["password"];
  let email = req.body["email"];
  //chack user signup
  console.log(`\x1b[42mNEW SIGN UP REQUEST\x1b[0m: (${username} | ${password} | ${email})`)
///add signup cool cookie stuff
if(!req.body.username || !req.body.password){
  res.status("400");
  res.send("Invalid details!");
} else {
  Users.filter(function(user){
     if(user.username === req.body.username){
        res.render('signup', {
           message: "User Already Exists! Login or choose another user id"});
     }
  });
  let newUser = {username: req.body.username, password: req.body.password};
   Users.push(newUser, Newdata);
 
  req.session.user = newUser;
  res.redirect('/protected_page');
  fs.writeFile  = ("users.json");
}
});


app.get('/protected_page', checkSignIn, function(req, res){
  res.render('protected_page', {username: req.session.user.username})
});

////app.use(function (req,res,next){
////	res.status(404).render("404");
///});

const botName = 'Chat Bot';

// Run when client connects
io.on('connection', socket => {
  socket.on('joinRoom', ({ username, room }) => {
    const user = userJoin(socket.id, username, room);

    socket.join(user.room);

    // Welcome current user
    socket.emit('message', formatMessage(botName, 'Welcome to the Chat!'));

    // Broadcast when a user connects
    socket.broadcast
      .to(user.room)
      .emit(
        'message',
        formatMessage(botName, `${user.username} has joined the chat`)
      );

    // Send users and room info
    io.to(user.room).emit('roomUsers', {
      room: user.room,
      users: getRoomUsers(user.room)
    });
  });

  // Listen for chatMessage
  socket.on('chatMessage', msg => {
    const user = getCurrentUser(socket.id);

    io.to(user.room).emit('message', formatMessage(user.username, msg));
  });

  // Runs when client disconnects
  socket.on('disconnect', () => {
    const user = userLeave(socket.id);

    if (user) {
      io.to(user.room).emit(
        'message',
        formatMessage(botName, `${user.username} has left the chat`)
      );

      // Send users and room info
      io.to(user.room).emit('roomUsers', {
        room: user.room,
        users: getRoomUsers(user.room)
      });
    }
  });
});






//video chatting merge


// If they join the link, generate a random UUID and send them to a new room with said UUID
app.get('/videochat', (req, res) => {
  res.redirect(`/${uuidV4()}`)
})
// If they join a specific room, then render that room
app.get('/:room', (req, res) => {
  res.render('room', {roomId: req.params.room})
})
// When someone connects to the server
io.on('connection', socket => {
  // When someone attempts to join the room
  socket.on('join-room', (roomId, userId) => {
      socket.join(roomId)  // Join the room
      socket.broadcast.emit('user-connected', userId) // Tell everyone else in the room that we joined
      
      // Communicate the disconnection
      socket.on('disconnect', () => {
          socket.broadcast.emit('user-disconnected', userId)
      })
  })
})


///add this is the login and signup features still experimental!@







const PORT = process.env.PORT || 8080

server.listen(PORT, () => console.log(`Server running on port ${PORT}`));

