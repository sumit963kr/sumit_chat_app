const users = []

// addUser , removeUser , getUser , getUsersInRoom

const addUser = ({ id, username, room }) => {

  // clean the data
  username = username.trim().toLowerCase()
  room = room.trim().toLowerCase()

  // Validate the data
  if (!username || !room) {
    return {
      error: 'Username and room are required!'
    }
  }

  // Check for existing user
  const existingUser = users.find((user) => {
    return user.room === room && user.username === username
  })


  // Validate username
  if (existingUser) {
    return {
      error: 'Username is in use!'
    }
  }

  // Store user
  const user = { id, username, room }
  users.push(user)
  return { user: user }

}

const removeUser = (id) => {
  const index = users.findIndex((user) => {  // give index
    return user.id === id
  })

  if (index !== -1) {
    return users.splice(index, 1)[0]    // splice ==> remove by index
  }

}

const getUser = (id) => {
  const user = users.find((user) => user.id === id)
  return user
}


const getUsersInRoom = (room) => {

  return users.filter((user) => {
    return (user.room === room)
  });

}





module.exports = {
  addUser,
  removeUser,
  getUser,
  getUsersInRoom
}




////////////////////////////////////////////////////////////////////////


const socket = io()

const $messageForm = document.querySelector('#message-form');
const $messageFormInput = $messageForm.querySelector('input');
const $messageFormButton = $messageForm.querySelector('button');
const $sendLocationButton = document.querySelector('#send-location');
const $messages = document.querySelector('#messages');


// Templates 
const messageTemplate = document.querySelector('#message-template').innerHTML;
const locationMessageTemplate = document.querySelector('#location-message-template').innerHTML;
const sidebarTemplate = document.querySelector('#sidebar-template').innerHTML;

// Options
const { username, room } = Qs.parse(location.search, { ignoreQueryPrefix: true })

socket.on('message', (message) => {  // argument can be any name

  console.log(message);
  const html = Mustache.render(messageTemplate, {
    username: message.username,
    message: message.text,
    createdAt: moment(message.createdAt).format('h:mm a')
  });
  $messages.insertAdjacentHTML('beforeend', html)

});


socket.on('locationMessage', (url) => {
  console.log(url);
  const html = Mustache.render(locationMessageTemplate, {
    username: url.username,
    url: url.url,
    createdAt: moment(url.createdAt).format('h:mm a')
  });
  $messages.insertAdjacentHTML('beforeend', html)
});


socket.on('roomData', ({ room, users }) => {

  const html = Mustache.render(sidebarTemplate, {
    room,
    users
  })

  document.querySelector('#sidebar').innerHTML = html
})



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


socket.emit('join', { username, room }, (error) => {

  if (error) {
    alert(error)
    location.href = '/'
  }

})


//////////////////////////////////////////////////////////////////////////

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


  socket.on('join', ({ username, room }, callback) => {

    const { error, user } = addUser({ id: socket.id, username, room })

    if (error) {
      return callback(error)
    }

    socket.join(user.room)

    socket.emit('message', generateMessage('Admin', 'Welcome'))
    socket.broadcast.to(room).emit('message', generateMessage('Admin', `${user.username} has joined!`))
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


//////////////////////////////////////////////////////////////////////////
const users = []

// addUser , removeUser , getUser , getUsersInRoom

const addUser = ({ id, username, room }) => {

  // clean the data
  username = username.trim().toLowerCase()
  room = room.trim().toLowerCase()

  // Validate the data
  if (!username || !room) {
    return {
      error: 'Username and room are required!'
    }
  }

  // Check for existing user
  const existingUser = users.find((user) => {
    return user.room === room && user.username === username
  })


  // Validate username
  if (existingUser) {
    return {
      error: 'Username is in use!'
    }
  }

  // Store user
  const user = { id, username, room }
  users.push(user)
  return { user: user }

}

const removeUser = (id) => {
  const index = users.findIndex((user) => {  // give index
    return user.id === id
  })

  if (index !== -1) {
    return users.splice(index, 1)[0]    // splice ==> remove by index
  }

}

const getUser = (id) => {
  const user = users.find((user) => user.id === id)
  return user
}


const getUsersInRoom = (room) => {

  return users.filter((user) => {
    return (user.room === room)
  });

}





module.exports = {
  addUser,
  removeUser,
  getUser,
  getUsersInRoom
}

///////////////////////////////////////////////////////////////////////////


const generateMessage = (username, text) => {
  return {
    username,
    text,
    createdAt: new Date().getTime()
  }
}

const generateLocationMessage = (username, url) => {

  return {
    username,
    url,
    createdAt: new Date().getTime()
  }
}

module.exports = {
  generateMessage,
  generateLocationMessage
}




