import express from "express";
import http from "http";
import SocketIO from "socket.io";
const app = express();

app.set("view engine", "pug");
app.set("views", __dirname + "/views");
app.use("/public", express.static(__dirname + "/public"));
app.get("/", (req, res)=> res.render("home"));

const handleListen = () => console.log(`Listening on http://localhost:3000`);

const server = http.createServer(app);
const io = SocketIO(server);
io.on("connection", (socket)=>{
  socket.onAny((event)=>{
    console.log(`Socket Event: ${event}`);
  });
  socket.on("enter_room", (roomName, done)=> 
  { 
    socket.join(roomName); 
    // console.log(socket.rooms); //어느 방에 있나요 = socket.id
    done();
    socket.to(roomName).emit("welcome");
  });
  socket.on("disconnecting", ()=>{
    socket.rooms.forEach(room => socket.to(room).emit("bye"));
  })
  socket.on("new_message", (msg, room, done)=>{
    socket.to(room).emit("new_message", msg);
    done();
  })
});



// const wss = new WebSocket.Server({server}); //http 서버 위에 웹소켓 서버 만듦

// const sockets = [];

// wss.on("connection", (socket)=>{
//   sockets.push(socket);
//   socket["nickname"] = "Anon";
//   console.log("Connected to browser");
//   socket.on("message",(roomName)=>{
//     const message = JSON.parse(roomName);
//     switch(message.type){
//       case "new_message":
//         sockets.forEach(aSocket => aSocket.send(`${socket.nickname}: ${message.payload}`));
//       case "nickname":
//         socket["nickname"] = message.payload;
//     }
//   });
//   socket.on("close",()=>{
//     console.log("Disconnected");
//   })
// });

server.listen(3000, handleListen);