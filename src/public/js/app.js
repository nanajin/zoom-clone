const socket = io();

const myFace = document.getElementById("myFace");
const muteBtn = document.getElementById("mute");
const cameraBtn = document.getElementById("camera");
const camerasSelect = document.getElementById("cameras");

let myStream;
let muted = false;
let cameraOff = false;

async function getCameras(){
  try{
    const devices = await navigator.mediaDevices.enumerateDevices();
    const cameras = devices.filter(device => device.kind === "videoinput");
    const currentCamera = myStream.getVideoTracks()[0];
    cameras.forEach(camera =>{
      const option = document.createElement("option");
      option.value = camera.deviceId;
      option.innerText = camera.label;
      if(currentCamera.label === camera.label){
        option.selected = true;
      }
      camerasSelect.appendChild(option);
    })
  }catch(e){
    console.log(e);
  }
}

async function getMedia(deviceId){
  const initialConstraints = {
    audio: true,
    video: {facingMode: "user"},
  };
  const cameraConstraints = {
    audio: true,
    video: {deviceId: {exact: deviceId}},
  };
  try{
    myStream = await navigator.mediaDevices.getUserMedia(
      deviceId ? cameraConstraints: initialConstraints
    );
    myFace.srcObject = myStream;
    if(!deviceId){
      await getCameras();
    }
  }catch(e){
    console.log(e);
  }
}
getMedia();

function handleMuteClick(){
 myStream.getAudioTracks().forEach(track=> track.enabled = ! track.enabled);
  if(!muted){
    muteBtn.innerText = "Unmute"
    muted = true;
  }
  else{
    muteBtn.innerText = "Mute"
    muted = false;
  }
}
function handleCameraClick(){
  myStream.getVideoTracks().forEach(track=> track.enabled = ! track.enabled);
  if(cameraOff){
    cameraBtn.innerText = "Turn Camera Off";
    cameraOff = false;
  }
  else{
    cameraBtn.innerText = "Turn Camera On";
    cameraOff = true;
  }
}

async function handleCameraChange(){
  await getMedia(camerasSelect.value);
}

muteBtn.addEventListener("click", handleMuteClick);
cameraBtn.addEventListener("click", handleCameraClick);
camerasSelect.addEventListener("input", handleCameraChange);

const welcome = document.getElementById("welcome");
const form = document.querySelector("form");
const room = document.getElementById("room");

room.hidden = true;
let roomName;


function addMessage(message){
  const ul = room.querySelector("ul");
  const li = document.createElement("li");
  li.innerText = message; 
  ul.appendChild(li);
}

function handleMessageSubmit(event){
  event.preventDefault();
  const input = room.querySelector("#msg input");
  const value = input.value;
  socket.emit("new_message", input.value, roomName, ()=>{
    addMessage(`You: ${value}`);
  });
  input.value = "";
}

function handleNicknameSubmit(event){
  event.preventDefault();
  const input = room.querySelector("#name input");
  const value = input.value;
  socket.emit("nickname", input.value);
}

function showRoom(){
  welcome.hidden = true;
  room.hidden = false;
  const h3 = room.querySelector("h3");
  h3.innerText = `Room ${roomName}`;
  const msgForm = room.querySelector("#msg");
  const nameForm = room.querySelector("#name");

  nameForm.addEventListener("submit", handleNicknameSubmit);
  msgForm.addEventListener("submit", handleMessageSubmit);
}

function handleRoomSubmit(event){
  event.preventDefault();
  const input = form.querySelector("input");
  socket.emit("enter_room", input.value, showRoom);
  roomName = input.value;
  input.value = ""
}

form.addEventListener("submit", handleRoomSubmit);

socket.on("welcome", (user, newCount)=>{
  const h3 = room.querySelector("h3");
  h3.innerText = `Room ${roomName} (${newCount})`;
  addMessage(`${user} joined`);
});
socket.on("bye", (left, newCount)=>{
  const h3 = room.querySelector("h3");
  h3.innerText = `Room ${roomName} (${newCount})`;
  addMessage(`${left} left`);
});
socket.on("new_message", addMessage);

socket.on("room_change", (rooms)=>{
  if(rooms.length === 0){
    roomList.innerHTML = "";
    return;
  }
  const roomList = welcome.querySelector("ul");
  rooms.forEach(room=>{
    const li = document.createElement("li");
    li.innerText = room;
    roomList.append(li);
  });
});