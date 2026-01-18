import { useParams, useNavigate } from "react-router-dom";
import { useState, useEffect, useRef } from "react";
import io from "socket.io-client";
import VideoTile from "../components/VideoTile";
import ControlButton from "../components/ControlButton";

export default function Room() {
  const { roomId } = useParams();
  const navigate = useNavigate();

  // Local media state
  const [localStream, setLocalStream] = useState(null);
  const [isCameraOn, setIsCameraOn] = useState(true);
  const [isMicOn, setIsMicOn] = useState(true);
  const localVideoRef = useRef(null);

  // WebRTC state
  const [remoteStreams, setRemoteStreams] = useState([]);
  const peerConnectionsRef = useRef({});
  const socketRef = useRef(null);

  // Chat state
  const [messages, setMessages] = useState([
    { sender: "System", text: "Welcome to the room" },
  ]);
  const [input, setInput] = useState("");
  const chatEndRef = useRef(null);

  // Get user media on component mount
  useEffect(() => {
    const getUserMedia = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: true
        });
        setLocalStream(stream);
        if (localVideoRef.current) {
          localVideoRef.current.srcObject = stream;
        }
      } catch (error) {
        console.error("Error accessing camera/microphone:", error);
        alert("Could not access camera/microphone. Please check permissions.");
      }
    };

    getUserMedia();

    return () => {
      // Cleanup: stop all tracks when component unmounts
      if (localStream) {
        localStream.getTracks().forEach(track => track.stop());
      }
    };
  }, []);

  // Update video element when stream changes
  useEffect(() => {
    if (localVideoRef.current && localStream) {
      localVideoRef.current.srcObject = localStream;
    }
  }, [localStream]);

  // Socket.IO and WebRTC setup
  useEffect(() => {
    const serverUrl = import.meta.env.VITE_SOCKET_URL || "http://localhost:5000";
    socketRef.current = io(serverUrl);

    const socket = socketRef.current;

    socket.on("connect", () => {
      console.log("Connected to signaling server");
      // For development, use a simple user ID
      const userId = `user_${socket.id}`;
      socket.emit("join_room", { room_id: roomId, token: userId });
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
      socketRef.current.emit("answer", { answer, room_id: roomId, token: `user_${socketRef.current.id}` });
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

    socket.on("error", (data) => {
      console.error("Socket error:", data.message);
      alert(data.message);
    });

    // Cleanup function
    return () => {
      socket.disconnect();
      Object.values(peerConnectionsRef.current).forEach((pc) => pc.close());
      if (localStream) {
        localStream.getTracks().forEach((track) => track.stop());
      }
    };
  }, [roomId, localStream]);

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
          room_id: roomId,
          token: `user_${socketRef.current.id}`,
        });
      }
    };

    pc.ontrack = (event) => {
      setRemoteStreams((prev) => [
        ...prev.filter((s) => s.id !== userId),
        { id: userId, stream: event.streams[0] },
      ]);
    };

    // Create offer if we're the initiator
    if (Object.keys(peerConnectionsRef.current).length === 1) {
      pc.createOffer().then((offer) => {
        pc.setLocalDescription(offer);
        socketRef.current.emit("offer", { offer, room_id: roomId, token: `user_${socketRef.current.id}` });
      });
    }

    return pc;
  };

  const toggleCamera = () => {
    if (localStream) {
      const videoTrack = localStream.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = !videoTrack.enabled;
        setIsCameraOn(videoTrack.enabled);
      }
    }
  };

  const toggleMic = () => {
    if (localStream) {
      const audioTrack = localStream.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        setIsMicOn(audioTrack.enabled);
      }
    }
  };

  const sendMessage = () => {
    if (!input.trim()) return;

    const message = { sender: "You", text: input };
    setMessages((prev) => [...prev, message]);
    socketRef.current.emit("chat_message", { ...message, room_id: roomId });
    setInput("");
  };

  // Scroll to bottom when messages update
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const allStreams = [
    { id: "local", stream: localStream, name: "You" },
    ...remoteStreams.map((rs) => ({ ...rs, name: `User ${rs.id.slice(0, 4)}` })),
  ];

  return (
    <div className="w-screen h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex flex-col relative overflow-hidden">

      {/* Background */}
      <div className="absolute inset-0 opacity-10">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-gradient-to-r from-cyan-500/20 to-blue-500/20 rounded-full filter blur-3xl animate-pulse"></div>
        <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-gradient-to-r from-blue-500/20 to-purple-500/20 rounded-full filter blur-3xl animate-pulse animation-delay-2000"></div>
      </div>

      {/* Header */}
      <header className="bg-black/30 backdrop-blur-xl shadow-lg px-3 sm:px-6 py-2 sm:py-4 border-b border-white/10 relative z-10 flex-shrink-0">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 sm:gap-4">
          <div className="flex items-center gap-2 sm:gap-4 w-full sm:w-auto">
            <div className="w-6 h-6 sm:w-8 sm:h-8 bg-gradient-to-r from-cyan-500 to-blue-500 rounded-lg flex items-center justify-center">
              <div className="w-3 h-3 sm:w-4 sm:h-4 border-2 border-white rounded-sm"></div>
            </div>
            <div className="flex-1 sm:flex-none">
              <h1 className="text-sm sm:text-lg font-bold text-white">Meeting Room</h1>
              <p className="text-xs text-gray-400">ID: {roomId}</p>
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-4 text-xs sm:text-sm">
            <div className="flex items-center gap-1 sm:gap-2 px-2 py-1 sm:px-3 sm:py-1.5 bg-white/10 backdrop-blur rounded-lg border border-white/20">
              <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
              <span className="text-white font-medium">{allStreams.length} users</span>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex flex-col lg:flex-row flex-1 overflow-hidden relative min-h-0">

        {/* Video Grid */}
        <div className="flex-1 p-2 sm:p-4 min-h-0">
          <div className={`grid gap-2 sm:gap-4 h-full ${
            allStreams.length === 1 ? 'grid-cols-1' :
            allStreams.length === 2 ? 'grid-cols-1 lg:grid-cols-2' :
            'grid-cols-1 lg:grid-cols-2 xl:grid-cols-3'
          }`}>
            {allStreams.map((tile) => (
              <VideoTile key={tile.id} stream={tile.stream} name={tile.name} />
            ))}
          </div>
        </div>

        {/* Chat Sidebar - Hidden on mobile */}
        <div className="hidden lg:flex w-80 bg-black/40 backdrop-blur-xl border-l border-white/10 flex-col shadow-xl min-h-0">

          {/* Chat Header */}
          <div className="p-4 border-b border-white/10 flex-shrink-0">
            <h3 className="text-lg font-semibold text-white">Chat</h3>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3 min-h-0">
            {messages.map((msg, i) => {
              const isYou = msg.sender === "You";
              const isSystem = msg.sender === "System";

              if (isSystem) {
                return (
                  <div key={i} className="text-center">
                    <div className="px-3 py-1.5 bg-blue-600/20 border border-blue-500/30 rounded-lg text-blue-300 text-xs">
                      {msg.text}
                    </div>
                  </div>
                );
              }

              return (
                <div key={i} className={`flex ${isYou ? "justify-end" : "justify-start"}`}>
                  <div className="max-w-[80%]">
                    {!isYou && (
                      <div className="text-xs text-gray-400 mb-1 px-1">
                        {msg.sender}
                      </div>
                    )}
                    <div
                      className={`px-3 py-2 rounded-xl text-xs shadow-lg ${
                        isYou
                          ? "bg-gradient-to-r from-cyan-600 to-blue-600 text-white rounded-br-md"
                          : "bg-white/90 text-gray-800 rounded-bl-md"
                      }`}
                    >
                      {msg.text}
                    </div>
                  </div>
                </div>
              );
            })}
            <div ref={chatEndRef}></div>
          </div>

          {/* Message Input */}
          <div className="p-4 border-t border-white/10 flex-shrink-0">
            <div className="flex gap-2">
              <input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && sendMessage()}
                placeholder="Type message..."
                className="flex-1 px-3 py-2 bg-white/10 border border-white/20 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500/50 text-white placeholder-gray-400 transition-all duration-300 text-sm"
              />
              <button
                onClick={sendMessage}
                className="px-4 py-2 bg-gradient-to-r from-cyan-600 to-blue-600 text-white rounded-lg font-semibold hover:from-cyan-700 hover:to-blue-700 transition-all duration-300 text-sm"
              >
                Send
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Controls */}
      <div className="p-2 sm:p-4 bg-black/30 backdrop-blur-xl border-t border-white/10 flex-shrink-0">
        <div className="flex justify-center gap-1 sm:gap-3">
          <ControlButton type="mute" isActive={isMicOn} onClick={toggleMic} />
          <ControlButton type="camera" isActive={isCameraOn} onClick={toggleCamera} />
          <ControlButton
            type="leave"
            onClick={() => {
              if (localStream) {
                localStream.getTracks().forEach(track => track.stop());
              }
              if (socketRef.current) {
                socketRef.current.emit("leave_room", { room_id: roomId });
              }
              navigate("/");
            }}
          />
        </div>
      </div>
    </div>
  );
}
