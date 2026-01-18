import { useParams, useNavigate } from "react-router-dom";
import { useState, useEffect, useRef } from "react";
import io from "socket.io-client";
import VideoTile from "../components/VideoTile";
import ControlButton from "../components/ControlButton";

export default function Room() {
  const { roomId } = useParams();
  const navigate = useNavigate();

  // WebRTC state
  const [localStream, setLocalStream] = useState(null);
  const [remoteStreams, setRemoteStreams] = useState([]);
  const [isMuted, setIsMuted] = useState(false);
  const [isCameraOff, setIsCameraOff] = useState(false);
  const peerConnectionsRef = useRef({});
  const socketRef = useRef(null);

  // chat state
  const [messages, setMessages] = useState([
    { sender: "System", text: "Welcome to the room" },
  ]);
  const [input, setInput] = useState("");

  // ref for chat scroll
  const chatEndRef = useRef(null);

  useEffect(() => {
    // Get user media
    navigator.mediaDevices
      .getUserMedia({ video: true, audio: true })
      .then((stream) => {
        setLocalStream(stream);
      })
      .catch((err) => console.error("Error accessing media devices:", err));

    // Connect to signaling server
    socketRef.current = io("http://localhost:5000");

    const socket = socketRef.current;

    socket.on("connect", () => {
      console.log("Connected to signaling server");
      socket.emit("join_room", { room_id: roomId });
    });

    socket.on("disconnect", () => {
      console.log("Disconnected from signaling server");
    });

    // WebRTC signaling
    socket.on("offer", async (data) => {
      const { offer, from } = data;
      const pc = createPeerConnection(from);
      await pc.setRemoteDescription(new RTCSessionDescription(offer));
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);
      socket.emit("answer", { answer, to: from, room_id: roomId });
    });

    socket.on("answer", async (data) => {
      const { answer, from } = data;
      const pc = peerConnectionsRef.current[from];
      if (pc) {
        await pc.setRemoteDescription(new RTCSessionDescription(answer));
      }
    });

    socket.on("ice_candidate", (data) => {
      const { candidate, from } = data;
      const pc = peerConnectionsRef.current[from];
      if (pc) {
        pc.addIceCandidate(new RTCIceCandidate(candidate));
      }
    });

    socket.on("user_joined", (data) => {
      const { user_id } = data;
      if (user_id !== socket.id) {
        createPeerConnection(user_id);
      }
    });

    socket.on("user_left", (data) => {
      const { user_id } = data;
      if (peerConnectionsRef.current[user_id]) {
        peerConnectionsRef.current[user_id].close();
        delete peerConnectionsRef.current[user_id];
        setRemoteStreams((prev) => prev.filter((s) => s.id !== user_id));
      }
    });

    socket.on("chat_message", (data) => {
      setMessages((prev) => [...prev, data]);
    });

    return () => {
      socket.disconnect();
      Object.values(peerConnectionsRef.current).forEach((pc) => pc.close());
      if (localStream) {
        localStream.getTracks().forEach((track) => track.stop());
      }
    };
  }, [roomId]);

  const createPeerConnection = (userId) => {
    const pc = new RTCPeerConnection({
      iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
    });

    peerConnectionsRef.current[userId] = pc;

    // Add local stream
    if (localStream) {
      localStream.getTracks().forEach((track) => pc.addTrack(track, localStream));
    }

    pc.onicecandidate = (event) => {
      if (event.candidate) {
        socketRef.current.emit("ice_candidate", {
          candidate: event.candidate,
          to: userId,
          room_id: roomId,
        });
      }
    };

    pc.ontrack = (event) => {
      setRemoteStreams((prev) => [
        ...prev.filter((s) => s.id !== userId),
        { id: userId, stream: event.streams[0] },
      ]);
    };

    return pc;
  };

  const toggleMute = () => {
    if (localStream) {
      localStream.getAudioTracks().forEach((track) => {
        track.enabled = isMuted;
      });
      setIsMuted(!isMuted);
    }
  };

  const toggleCamera = () => {
    if (localStream) {
      localStream.getVideoTracks().forEach((track) => {
        track.enabled = isCameraOff;
      });
      setIsCameraOff(!isCameraOff);
    }
  };

  const sendMessage = () => {
    if (!input.trim()) return;

    const message = { sender: "You", text: input };
    setMessages((prev) => [...prev, message]);
    socketRef.current.emit("chat_message", { ...message, room_id: roomId });
    setInput("");
  };

  // scroll to bottom when messages update
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const allStreams = [
    { id: "local", stream: localStream, name: "You" },
    ...remoteStreams.map((rs) => ({ ...rs, name: `User ${rs.id.slice(0, 4)}` })),
  ];

  return (
    <div className="w-screen h-screen bg-blue-50 flex flex-col relative">
      {/* Header */}
      <header className="bg-white shadow px-6 py-4">
        <h1 className="text-lg font-bold text-blue-600">Room: {roomId}</h1>
      </header>

      {/* Main content */}
      <div className="flex flex-1 overflow-hidden">
        {/* Video area */}
        <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-2 p-2">
          {allStreams.map((tile) => (
            <VideoTile key={tile.id} stream={tile.stream} name={tile.name} />
          ))}
        </div>

        {/* Chat panel */}
        <div className="w-full md:w-80 bg-white border-l flex flex-col h-full">
          {/* Header */}
          <div className="p-4 font-semibold text-blue-600 border-b">Chat</div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-3 space-y-2">
            {messages.map((msg, i) => {
              const isYou = msg.sender === "You";
              return (
                <div
                  key={i}
                  className={`flex ${isYou ? "justify-end" : "justify-start"}`}
                >
                  <div
                    className={`px-3 py-2 rounded-xl max-w-[80%] text-sm ${
                      isYou
                        ? "bg-blue-600 text-white rounded-br-none"
                        : "bg-gray-200 text-gray-800 rounded-bl-none"
                    }`}
                  >
                    {!isYou && (
                      <div className="font-semibold text-blue-600 mb-1">
                        {msg.sender}
                      </div>
                    )}
                    {msg.text}
                  </div>
                </div>
              );
            })}
            {/* Scroll target */}
            <div ref={chatEndRef}></div>
          </div>

          {/* Input */}
          <div className="p-3 border-t flex gap-2">
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && sendMessage()}
              placeholder="Type a message..."
              className="flex-1 px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400"
            />
            <button
              onClick={sendMessage}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition"
            >
              Send
            </button>
          </div>
        </div>
      </div>

      {/* Controls */}
      <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex gap-6">
        <ControlButton type="mute" isActive={!isMuted} onClick={toggleMute} />
        <ControlButton type="camera" isActive={!isCameraOff} onClick={toggleCamera} />
        <ControlButton
          type="leave"
          onClick={() => {
            socketRef.current?.emit("leave_room", { room_id: roomId });
            navigate("/");
          }}
        />
      </div>
    </div>
  );
}
