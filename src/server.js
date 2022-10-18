import express from "express";
import http from "http";
import {Server} from "socket.io";
import { instrument } from "@socket.io/admin-ui";

const app = express();

app.set("view engine", "pug");
app.set("views", __dirname + "/views");
app.use("/public", express.static(__dirname + "/public"));
app.get("/", (req, res)=> res.render("home"));

const handleListen = () => console.log(`Listening on http://localhost:3000`);

const server = http.createServer(app);
const io = new Server(server,{
  cors:{
    origin: ["https://admin.socket.io"],
    credentials: true,
  }
});
instrument(io, {
  auth: false,
});

function publicRooms(){
  const sids = io.sockets.adapter.sids;
  const rooms = io.sockets.adapter.rooms;
  const publicRooms = [];
  rooms.forEach((_, key)=>{
    if(sids.get(key) === undefined){
      publicRooms.push(key);
    }
  });
  return publicRooms;
}

function countRoom(roomName){
  return io.sockets.adapter.rooms.get(roomName)?.size;
}
io.on("connection", (socket)=>{
  socket["nickname"] = "Anon";
  socket.onAny((event)=>{
    console.log(`Socket Event: ${event}`);
  });
  socket.on("enter_room", (roomName, done)=> 
  { 
    socket.join(roomName); 
    // console.log(socket.rooms); //어느 방에 있나요 = socket.id
    // done();
    socket.to(roomName).emit("welcome", socket.nickname, countRoom(roomName));
    io.sockets.emit("room_change", publicRooms());
  });
  socket.on("disconnecting", ()=>{
    socket.rooms.forEach((room) => 
      socket.to(room).emit("bye", socket.nickname, countRoom(room)-1));
  });
  socket.on("disconnect", () => {
    io.sockets.emit("room_change", publicRooms());
  });
  socket.on("new_message", (msg, room, done)=>{
    socket.to(room).emit("new_message", `${socket.nickname}: ${msg}`);
    done();
  });
  socket.on("nickname", (nickname) => {
    socket["nickname"] = nickname
  });
  socket.on("offer", (offer, roomName) => {
    socket.to(roomName).emit("offer", offer);
  });
  socket.on("answer", (answer, roomName)=>{
    socket.to(roomName).emit("answer", answer);
  });
  socket.on("ice", (ice, roomName)=>{
    socket.to(roomName).emit("ice", ice);
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