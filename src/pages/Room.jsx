import { useParams, useNavigate } from "react-router-dom";
import { useState, useEffect, useRef } from "react";
import io from "socket.io-client";
import VideoTile from "../components/VideoTile";
import ControlButton from "../components/ControlButton";

export default function Room() {
  const { roomId } = useParams();
  const navigate = useNavigate();
  const tiles = ["You", "Alice"];

  // chat state (UI ONLY)
  const [messages, setMessages] = useState([
    { sender: "System", text: "Welcome to the room" },
  ]);
  const [input, setInput] = useState("");

  // ref for chat scroll
  const chatEndRef = useRef(null);

  // WebSocket signaling
  const socketRef = useRef(null);

  useEffect(() => {
    // Connect to signaling server
    socketRef.current = io("http://localhost:5000", {
      // Add JWT token if available (from localStorage or context)
      // auth: { token: localStorage.getItem('token') }
    });

    const socket = socketRef.current;

    socket.on("connect", () => {
      console.log("Connected to signaling server");
      // Join the room
      socket.emit("join_room", { room_id: roomId });
    });

    socket.on("disconnect", () => {
      console.log("Disconnected from signaling server");
    });

    // Signaling events (placeholders for WebRTC)
    socket.on("offer", (data) => {
      console.log("Received offer:", data);
      // TODO: Handle offer in WebRTC
    });

    socket.on("answer", (data) => {
      console.log("Received answer:", data);
      // TODO: Handle answer in WebRTC
    });

    socket.on("ice_candidate", (data) => {
      console.log("Received ICE candidate:", data);
      // TODO: Handle ICE candidate in WebRTC
    });

    socket.on("user_joined", (data) => {
      console.log("User joined:", data);
      // TODO: Update participant list
    });

    socket.on("user_left", (data) => {
      console.log("User left:", data);
      // TODO: Update participant list
    });

    return () => {
      socket.disconnect();
    };
  }, [roomId]);

  const sendMessage = () => {
    if (!input.trim()) return;

    // add new message
    setMessages((prev) => [...prev, { sender: "You", text: input }]);
    setInput("");
  };

  // scroll to bottom when messages update
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

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
          {tiles.map((name, i) => (
            <VideoTile key={i} name={name} />
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
        <ControlButton type="mute" />
        <ControlButton type="camera" />
        <ControlButton type="leave" onClick={() => {
          socketRef.current?.emit("leave_room", { room_id: roomId });
          navigate("/");
        }} />
      </div>
    </div>
  );
}
