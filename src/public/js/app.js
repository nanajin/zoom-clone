const socket = io();

const myFace = document.getElementById("myFace");
const muteBtn = document.getElementById("mute");
const cameraBtn = document.getElementById("camera");
const camerasSelect = document.getElementById("cameras");

const welcome = document.getElementById("welcome");
const call = document.getElementById("call");

call.hidden = true;

let myStream;
let muted = false;
let cameraOff = false;
let myPeerConnection;
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
  if(myPeerConnection){
    const videoTrack = myStream.getVideoTracks()[0];
    const videoSender = myPeerConnection.getSenders().find(sender=>{
      sender.track.kind === "video";
    })
    videoSender.replaceTrack(videoTrack);
  }
}

muteBtn.addEventListener("click", handleMuteClick);
cameraBtn.addEventListener("click", handleCameraClick);
camerasSelect.addEventListener("input", handleCameraChange);

const welcomeForm = welcome.querySelector("form");

async function initCall(){
  welcome.hidden = true;
  call.hidden = false;
  await getMedia();
  makeConnection();
}

// function handleWelcomeSubmit(event){
//   event.preventDefault();
//   const input = welcomeForm.querySelector("input");
//   console.log(input.value);
// }

// welcomeForm.addEventListener("submit", handleWelcomeSubmit);

function handleIce(data){
  socket.emit("ice", data.candidate, roomName);
  console.log("sent the icecandidate");
  console.log(data);
}
//RTC Code
function makeConnection(){
  myPeerConnection = new RTCPeerConnection();
  myPeerConnection.addEventListener("icecandidate", handleIce);
  myPeerConnection.addEventListener("addstream", handleAddStream);
  myStream.getTracks().forEach(track=> myPeerConnection.addTrack(track, myStream));
}

function handleAddStream(data){
  const peersFace = document.getElementById("peersFace");
  peersFace.srcObject = data.stream;
  console.log("got an event from my peer");
  console.log("Peer's Stream", data.stream);
  console.log("My Stream", myStream);
}

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

async function handleRoomSubmit(event){
  event.preventDefault();
  const input = form.querySelector("input");
  await initCall();
  socket.emit("enter_room", input.value);
  roomName = input.value;
  input.value = ""
}

form.addEventListener("submit", handleRoomSubmit);

socket.on("welcome", async (user, newCount)=>{
  const offer = await myPeerConnection.createOffer();
  myPeerConnection.setLocalDescription(offer);
  socket.emit("offer", offer, roomName);
  console.log("Sent the offer");

  const h3 = room.querySelector("h3");
  h3.innerText = `Room ${roomName} (${newCount})`;
  addMessage(`${user} joined`);
});

socket.on("offer", async(offer) =>{
  console.log("Received the offer");

  myPeerConnection.setRemoteDescription(offer);
  const answer = await myPeerConnection.createAnswer();
  myPeerConnection.setLocalDescription(answer);
  socket.emit("answer", answer, roomName);
  console.log("sent the answer");
});
socket.on("answer", answer =>{
  console.log("received the answer");
  myPeerConnection.setRemoteDescription(answer);
});
socket.on("ice", ice=>{
  console.log("received candidate");
  myPeerConnection.addIceCandidate(ice);
})
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
//Stun 서버