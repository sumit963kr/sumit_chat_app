const express = require('express');//engine of the project
const http = require('http');
const path = require('path');
const socketio = require('socket.io') //node_packet_manager(npm) 
const Filter = require('bad-words')
const app = express();
const server = http.createServer(app);
const io = socketio(server);
const { generateMessage, generateLocationMessage } = require('./utils/messages');
const { addUser, removeUser, getUser, getUsersInRoom } = require('./utils/users')

const port = process.env.PORT || 3000

const publicDirectoryPath = path.join(__dirname, '../public')

app.use(express.static(publicDirectoryPath));

app.route("/health").get((req, res)=>{
  return res.status(200).json({
    message: "chat app is live"
  })
})

io.on('connection', (socket) => {
  console.log('New Websocket connection');


  socket.on('join', ({ username, room }, callback) => {

    const { error, user } = addUser({ id: socket.id, username, room })

    if (error) {
      return callback(error)
    }

    socket.join(user.room)

    socket.emit('message', generateMessage('Admin', 'Welcome'))
    socket.broadcast.to(user.room).emit('message', generateMessage('Admin', `${user.username} has joined!`))
    // socket.broadcast.emit('message', generateMessage('A new user has joined'))
    io.to(user.room).emit('roomData', {
      room: user.room,
      users: getUsersInRoom(user.room)
    })

    callback()

  });

  socket.on('sendMessage', (message, callback) => {

    const user = getUser(socket.id)


    const filter = new Filter()

    if (filter.isProfane(message)) {
      return callback('Profanity is not allowed');
    }

    io.to(user.room).emit('message', generateMessage(user.username, message))
    //io.emit('message', generateMessage(message))
    callback()
  })


  socket.on('sendLocation', (coords, callback) => {    // any object name


    const user = getUser(socket.id)

    //io.emit('message', `Location: ${coords.latitude},${coords.longitude}`)    
    io.to(user.room).emit('locationMessage', generateLocationMessage(user.username, `https://google.com/maps?q=${coords.latitude},${coords.longitude}`))
    callback()

  })

  socket.on('disconnect', () => {

    const user = removeUser(socket.id)

    if (user) {
      //io.emit('message', generateMessage('A user has left!'))
      io.to(user.room).emit('message', generateMessage(`${user.username}  has left!`))
      io.to(user.room).emit('roomData', {
        room: user.room,
        users: getUsersInRoom(user.room)
      });
    }

  })

});



server.listen(port, () => {
  console.log('server is up on port ' + port);
});