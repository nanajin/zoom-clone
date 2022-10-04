import express from "express";
import http from "http";
import WebSocket from "ws";

const app = express();

app.set("view engine", "pug");
app.set("views", __dirname + "/views");
app.use("/public", express.static(__dirname + "/public"));
app.get("/", (req, res)=> res.render("home"));

const handleListen = () => console.log(`Listening on http://localhost:3000`);

const server = http.createServer(app);

const wss = new WebSocket.Server({server}); //http 서버 위에 웹소켓 서버 만듦

const sockets = [];

wss.on("connection", (socket)=>{
  sockets.push(socket);
  socket["nickname"] = "Anon";
  console.log("Connected to browser");
  socket.on("message",(msg)=>{
    const message = JSON.parse(msg);
    switch(message.type){
      case "new_message":
        sockets.forEach(aSocket => aSocket.send(`${socket.nickname}: ${message.payload}`));
      case "nickname":
        socket["nickname"] = message.payload;
    }
  });
  socket.on("close",()=>{
    console.log("Disconnected");
  })
});

server.listen(3000, handleListen);