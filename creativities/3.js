const express = require('express');
const http = require('http');
const path = require('path');
const socketio = require('socket.io')
const Filter = require('bad-words')
const app = express();
const server = http.createServer(app);
const io = socketio(server);
const { generateMessage, generateLocationMessage } = require('./utils/messages');
const { addUser, removeUser, getUser, getUsersInRoom } = require('./utils/users')

const port = process.env.PORT || 3000

const publicDirectoryPath = path.join(__dirname, '../public')

app.use(express.static(publicDirectoryPath));



io.on('connection', (socket) => {
  console.log('New Websocket connection');


  socket.on('join', ({ username, room }) => {

    socket.join(room)

    socket.emit('message', generateMessage('Welcome'))
    socket.broadcast.to(room).emit('message', generateMessage(`${username} has joined!`))
    // socket.broadcast.emit('message', generateMessage('A new user has joined'))

  });

  socket.on('sendMessage', (message, callback) => {

    const filter = new Filter()

    if (filter.isProfane(message)) {
      return callback('Profanity is not allowed');
    }

    io.to('South philly').emit('message', generateMessage(message))
    //io.emit('message', generateMessage(message))
    callback()
  })


  socket.on('sendLocation', (coords, callback) => {    // any object name


    //io.emit('message', `Location: ${coords.latitude},${coords.longitude}`)    
    io.emit('locationMessage', generateLocationMessage(`https://google.com/maps?q=${coords.latitude},${coords.longitude}`))
    callback()

  })

  socket.on('disconnect', () => {
    io.emit('message', generateMessage('A user has left!'))
  })

});



server.listen(port, () => {
  console.log('server is up on port ' + port);
});

//--------------------------------------------------------------------------------------------//

const socket = io()

const $messageForm = document.querySelector('#message-form');
const $messageFormInput = $messageForm.querySelector('input');
const $messageFormButton = $messageForm.querySelector('button');
const $sendLocationButton = document.querySelector('#send-location');
const $messages = document.querySelector('#messages');


// Templates 
const messageTemplate = document.querySelector('#message-template').innerHTML;
const locationMessageTemplate = document.querySelector('#location-message-template').innerHTML;

// Options
const { username, room } = Qs.parse(location.search, { ignoreQueryPrefix: true })

socket.on('message', (message) => {  // argument can be any name

  console.log(message);
  const html = Mustache.render(messageTemplate, {
    message: message.text,
    createdAt: moment(message.createdAt).format('h:mm a')
  });
  $messages.insertAdjacentHTML('beforeend', html)

});


socket.on('locationMessage', (url) => {
  console.log(url);
  const html = Mustache.render(locationMessageTemplate, {
    url: url.url,
    createdAt: moment(url.createdAt).format('h:mm a')
  });
  $messages.insertAdjacentHTML('beforeend', html)
});



//const msg = document.getElementById('msg');

$messageForm.addEventListener('submit', (e) => {
  e.preventDefault();

  //disable
  $messageFormButton.setAttribute('disabled', 'disabled')

  const message = e.target.elements.message.value;

  //const message = document.querySelector('input').value;
  //const message = msg.value;
  socket.emit('sendMessage', message, (error) => {

    //enable 
    $messageFormButton.removeAttribute('disabled')
    $messageFormInput.value = ''
    $messageFormInput.focus()

    if (error) {
      return console.log(error)
    }

    console.log('Message delivered')

  })

})




$sendLocationButton.addEventListener('click', () => {



  if (!navigator.geolocation) {
    return alert('Geolocation is not supported by your browser.')
  }

  $messageFormButton.setAttribute('disabled', 'disabled')

  navigator.geolocation.getCurrentPosition((position) => {



    socket.emit('sendLocation', {
      latitude: position.coords.latitude,
      longitude: position.coords.longitude
    }, () => {

      $sendLocationButton.removeAttribute('disabled')
      console.log('Location shared!')
    })

  }, undefined, { enableHighAccuracy: true })

})


socket.emit('join', { username, room })
