'use strict';

const User = require('./models/user');

module.exports = function(io, session)
{
  io.use((socket, next) =>
  {
    session(socket.request, socket.request.res, next);
  });

  io.on('connection', async (socket) => 
  {
    let user = socket.request.session.user;

    socket.on('disconnect', async () => 
    {
      await User.unlinkFromSocket(user);
      io.emit('user disconnected', Object.keys(io.sockets.sockets).length);
    });
    
    if(!user)
    {
      socket.disconnect();
      return;
    }

    await User.linkToSocket(user, socket.id);

    io.emit('user connected', Object.keys(io.sockets.sockets).length);

    socket.on('general chat message', (username, tag, message) => 
    {
      socket.broadcast.emit('general chat message', username, tag, message);
    });

    socket.on('search game', (tag) => 
    {
      console.log(tag);
    });
  });
}