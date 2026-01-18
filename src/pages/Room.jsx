import { useParams, useNavigate } from "react-router-dom";
import { useState, useEffect, useRef } from "react";
import io from "socket.io-client";
import VideoTile from "../components/VideoTile";
import ControlButton from "../components/ControlButton";

export default function Room() {
  const { roomId } = useParams();
  const navigate = useNavigate();
  const [localStream, setLocalStream] = useState(null);
  const [isCameraOn, setIsCameraOn] = useState(true);
  const [isMicOn, setIsMicOn] = useState(true);
  const [isRecording, setIsRecording] = useState(false);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [zoomLevel, setZoomLevel] = useState(1);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [focusedVideo, setFocusedVideo] = useState(null); // null, 'local', 'remote'
  const localVideoRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const recordedChunksRef = useRef([]);

  // chat state (UI ONLY)
  const [messages, setMessages] = useState([
    { sender: "System", text: "Welcome to the room" },
  ]);
  const [input, setInput] = useState("");

  // ref for chat scroll
  const chatEndRef = useRef(null);

  // WebSocket signaling
  const socketRef = useRef(null);

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

  const toggleRecording = () => {
    if (!localStream) return;

    if (!isRecording) {
      // Start recording
      recordedChunksRef.current = [];
      const mediaRecorder = new MediaRecorder(localStream);
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          recordedChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        const blob = new Blob(recordedChunksRef.current, { type: 'video/webm' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `video-call-${roomId}-${Date.now()}.webm`;
        a.click();
        URL.revokeObjectURL(url);
      };

      mediaRecorder.start();
      setIsRecording(true);
    } else {
      // Stop recording
      if (mediaRecorderRef.current) {
        mediaRecorderRef.current.stop();
      }
      setIsRecording(false);
    }
  };

  const toggleScreenShare = async () => {
    try {
      if (!isScreenSharing) {
        const screenStream = await navigator.mediaDevices.getDisplayMedia({
          video: true,
          audio: true
        });
        setLocalStream(screenStream);
        setIsScreenSharing(true);
        
        screenStream.getVideoTracks()[0].onended = () => {
          // User stopped sharing, go back to camera
          getUserMedia();
          setIsScreenSharing(false);
        };
      } else {
        // Stop screen sharing, go back to camera
        localStream.getTracks().forEach(track => track.stop());
        await getUserMedia();
        setIsScreenSharing(false);
      }
    } catch (error) {
      console.error('Error sharing screen:', error);
    }
  };

  const getUserMedia = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: true
      });
      setLocalStream(stream);
    } catch (error) {
      console.error('Error accessing camera:', error);
    }
  };

  const copyRoomId = async () => {
    try {
      await navigator.clipboard.writeText(roomId);
      alert('Room ID copied to clipboard!');
    } catch (error) {
      console.error('Failed to copy room ID:', error);
    }
  };

  const zoomIn = () => {
    setZoomLevel(prev => Math.min(prev + 0.2, 3));
  };

  const zoomOut = () => {
    setZoomLevel(prev => Math.max(prev - 0.2, 0.5));
  };

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen();
      setIsFullscreen(true);
    } else {
      document.exitFullscreen();
      setIsFullscreen(false);
    }
  };

  // Listen for fullscreen changes
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  const toggleVideoFocus = (videoType) => {
    if (focusedVideo === videoType) {
      setFocusedVideo(null); // Return to normal view
    } else {
      setFocusedVideo(videoType); // Focus on this video
    }
    
    // Ensure video stream is properly connected after focus change
    setTimeout(() => {
      if (localVideoRef.current && localStream) {
        localVideoRef.current.srcObject = localStream;
      }
    }, 100);
  };

  useEffect(() => {
    // TODO: Enable when backend is ready
    // Connect to signaling server
    // const serverUrl = import.meta.env.VITE_SOCKET_URL || "http://localhost:5000";
    // socketRef.current = io(serverUrl);
    
    console.log("Socket connection disabled - backend not ready");
    
    // Cleanup function
    return () => {
      if (socketRef.current) {
        socketRef.current.disconnect();
      }
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
            <button
              onClick={copyRoomId}
              className="px-2 py-1 sm:px-3 sm:py-1.5 bg-white/10 border border-white/20 text-white rounded-lg font-medium hover:bg-white/20 transition-all duration-300 text-xs"
            >
              Copy
            </button>
          </div>
          
          <div className="flex items-center gap-2 sm:gap-4 text-xs sm:text-sm">
            <div className="flex items-center gap-1 sm:gap-2 px-2 py-1 sm:px-3 sm:py-1.5 bg-white/10 backdrop-blur rounded-lg border border-white/20">
              <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
              <span className="text-white font-medium">2 users</span>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex flex-col lg:flex-row flex-1 overflow-hidden relative min-h-0">
        
        {/* Video Grid */}
        <div className="flex-1 p-2 sm:p-4 min-h-0">
          {focusedVideo ? (
            // Focused video view
            <div className="h-full">
              {focusedVideo === 'local' ? (
                // Focused local video
                <div className="relative bg-gradient-to-br from-slate-800 to-slate-900 rounded-lg sm:rounded-xl overflow-hidden border border-white/10 shadow-xl h-full">
                  <video
                    ref={localVideoRef}
                    autoPlay
                    muted
                    playsInline
                    className="w-full h-full object-cover"
                    style={{ transform: `scale(${zoomLevel})` }}
                  />
                  
                  {/* Video Controls Overlay */}
                  <div className="absolute top-2 left-2 flex gap-1">
                    <div className="px-2 py-1 bg-black/60 backdrop-blur rounded-full text-white text-sm font-medium">
                      {isScreenSharing ? "Screen" : "You"} (Focused)
                    </div>
                    {!isCameraOn && (
                      <div className="px-2 py-1 bg-red-600/80 backdrop-blur rounded-full text-white text-sm font-medium">
                        Off
                      </div>
                    )}
                  </div>
                  
                  {/* Controls */}
                  <div className="absolute top-2 right-2 flex gap-1">
                    <button
                      onClick={zoomOut}
                      className="w-6 h-6 bg-black/60 backdrop-blur rounded-lg flex items-center justify-center text-white hover:bg-black/80 transition-all font-bold text-xs"
                    >
                      −
                    </button>
                    <button
                      onClick={zoomIn}
                      className="w-6 h-6 bg-black/60 backdrop-blur rounded-lg flex items-center justify-center text-white hover:bg-black/80 transition-all font-bold text-xs"
                    >
                      +
                    </button>
                    <button
                      onClick={() => toggleVideoFocus('local')}
                      className="w-6 h-6 bg-black/60 backdrop-blur rounded-lg flex items-center justify-center text-white hover:bg-black/80 transition-all text-xs"
                    >
                      ⛶
                    </button>
                  </div>
                  
                  {/* Camera Off Overlay */}
                  {!isCameraOn && (
                    <div className="absolute inset-0 bg-black/80 flex items-center justify-center">
                      <div className="text-center">
                        <div className="w-16 h-16 bg-gradient-to-r from-cyan-500 to-blue-500 rounded-full flex items-center justify-center text-xl font-bold mb-2 mx-auto text-white">
                          {isScreenSharing ? "S" : "Y"}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                // Focused remote video (placeholder)
                <div className="relative bg-gradient-to-br from-slate-800 to-slate-900 rounded-lg sm:rounded-xl overflow-hidden border border-white/10 shadow-xl h-full flex items-center justify-center">
                  <div className="text-center">
                    <div className="w-20 h-20 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full flex items-center justify-center text-2xl font-bold mb-4 mx-auto text-white">
                      A
                    </div>
                    <p className="text-white text-lg">Alice (Focused)</p>
                  </div>
                  <button
                    onClick={() => toggleVideoFocus('remote')}
                    className="absolute top-2 right-2 w-6 h-6 bg-black/60 backdrop-blur rounded-lg flex items-center justify-center text-white hover:bg-black/80 transition-all text-xs"
                  >
                    ⛶
                  </button>
                </div>
              )}
            </div>
          ) : (
            // Normal grid view
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-2 sm:gap-4 h-full">
              
              {/* Local Video */}
              <div className="relative bg-gradient-to-br from-slate-800 to-slate-900 rounded-lg sm:rounded-xl overflow-hidden border border-white/10 shadow-xl min-h-[150px] sm:min-h-[250px]">
                <video
                  ref={localVideoRef}
                  autoPlay
                  muted
                  playsInline
                  className="w-full h-full object-cover"
                  style={{ transform: `scale(${zoomLevel})` }}
                />
                
                {/* Video Controls Overlay */}
                <div className="absolute top-1 sm:top-2 left-1 sm:left-2 flex gap-1">
                  <div className="px-1.5 py-0.5 sm:px-2 sm:py-1 bg-black/60 backdrop-blur rounded-full text-white text-xs font-medium">
                    {isScreenSharing ? "Screen" : "You"}
                  </div>
                  {!isCameraOn && (
                    <div className="px-1.5 py-0.5 sm:px-2 sm:py-1 bg-red-600/80 backdrop-blur rounded-full text-white text-xs font-medium">
                      Off
                    </div>
                  )}
                </div>
                
                {/* Zoom Controls */}
                <div className="absolute top-1 sm:top-2 right-1 sm:right-2 flex gap-1">
                  <button
                    onClick={zoomOut}
                    className="w-5 h-5 sm:w-6 sm:h-6 bg-black/60 backdrop-blur rounded-lg flex items-center justify-center text-white hover:bg-black/80 transition-all font-bold text-xs"
                  >
                    −
                  </button>
                  <button
                    onClick={zoomIn}
                    className="w-5 h-5 sm:w-6 sm:h-6 bg-black/60 backdrop-blur rounded-lg flex items-center justify-center text-white hover:bg-black/80 transition-all font-bold text-xs"
                  >
                    +
                  </button>
                  <button
                    onClick={() => toggleVideoFocus('local')}
                    className="w-5 h-5 sm:w-6 sm:h-6 bg-black/60 backdrop-blur rounded-lg flex items-center justify-center text-white hover:bg-black/80 transition-all text-xs"
                  >
                    ⛶
                  </button>
                </div>
                
                {/* Camera Off Overlay */}
                {!isCameraOn && (
                  <div className="absolute inset-0 bg-black/80 flex items-center justify-center">
                    <div className="text-center">
                      <div className="w-8 h-8 sm:w-16 sm:h-16 bg-gradient-to-r from-cyan-500 to-blue-500 rounded-full flex items-center justify-center text-sm sm:text-xl font-bold mb-1 sm:mb-2 mx-auto text-white">
                        {isScreenSharing ? "S" : "Y"}
                      </div>
                    </div>
                  </div>
                )}
              </div>
              
              {/* Remote Video Placeholder */}
              <div className="relative min-h-[150px] sm:min-h-[250px] bg-gradient-to-br from-slate-800 to-slate-900 rounded-lg sm:rounded-xl overflow-hidden border border-white/10 shadow-xl flex items-center justify-center">
                <div className="text-center">
                  <div className="w-12 h-12 sm:w-20 sm:h-20 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full flex items-center justify-center text-lg sm:text-2xl font-bold mb-2 sm:mb-4 mx-auto text-white">
                    A
                  </div>
                  <p className="text-white/80 text-sm sm:text-base">Waiting...</p>
                </div>
                <button
                  onClick={() => toggleVideoFocus('remote')}
                  className="absolute top-1 sm:top-2 right-1 sm:right-2 w-5 h-5 sm:w-6 sm:h-6 bg-black/60 backdrop-blur rounded-lg flex items-center justify-center text-white hover:bg-black/80 transition-all text-xs"
                >
                  ⛶
                </button>
              </div>
              
            </div>
          )}
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
          <ControlButton type="screen" isActive={isScreenSharing} onClick={toggleScreenShare} />
          <ControlButton type="record" isActive={isRecording} onClick={toggleRecording} />
          <ControlButton type="leave" onClick={() => {
            if (localStream) {
              localStream.getTracks().forEach(track => track.stop());
            }
            if (mediaRecorderRef.current && isRecording) {
              mediaRecorderRef.current.stop();
            }
            navigate("/");
          }} />
        </div>
      </div>
    </div>
  );
}
