const express = require('express');
const http = require('http');
const path = require('path');
const socketio = require('socket.io')

const app = express();
const server = http.createServer(app);
const io = socketio(server);

const port = process.env.PORT || 3000

const publicDirectoryPath = path.join(__dirname, '../public')

app.use(express.static(publicDirectoryPath));


let count = 0;

io.on('connection', (socket) => {
  console.log('New Websocket connection');

  socket.emit('countUpdated', count)

  socket.on('increment', () => {
    count++
    // socket.emit('countUpdated', count) // to single  connection
    io.emit('countUpdated', count)   // to all connection
  })
});



server.listen(port, () => {
  console.log('server is up on port ' + port);
})

/*------------------------------------------------------------------------------------------*/
// Chat.js

const socket = io()

socket.on('countUpdated', (count) => {  // argument can be any name
  console.log('The  count has  been updated!', count);
});

const button = document.querySelector('#increment');

button.addEventListener('click', () => {
  console.log('clicked');
  socket.emit('increment');
})