import { useNavigate } from "react-router-dom";
import { useState } from "react";

export default function Home() {
  const navigate = useNavigate();
  const [joinRoomId, setJoinRoomId] = useState("");

  const createRoom = async () => {
    console.log("Creating room...");
    const roomId = crypto.randomUUID();
    console.log("Generated room ID:", roomId);
    setJoinRoomId(roomId);
    try {
      await navigator.clipboard.writeText(roomId);
      console.log("Room ID copied to clipboard");
    } catch (error) {
      console.error("Failed to copy room ID:", error);
    }
  };

  const joinRoom = () => {
    if (!joinRoomId.trim()) return alert("Please enter a room ID.");
    navigate(`/room/${joinRoomId}/premeeting`);
  };

  return (
    <div className="w-screen h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 relative overflow-hidden">

      {/* Header */}
      <header className="w-full flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 px-4 sm:px-8 py-4 sm:py-6 bg-black/20 backdrop-blur-xl shadow-lg sticky top-0 z-20 border-b border-white/10">
        <div className="flex items-center gap-4 sm:gap-6">
          <div className="w-8 h-8 sm:w-10 sm:h-10 bg-gradient-to-r from-cyan-500 to-blue-500 rounded-lg flex items-center justify-center">
            <div className="w-4 h-4 sm:w-6 sm:h-6 border-2 border-white rounded-sm"></div>
          </div>
          <h1 className="text-lg sm:text-2xl font-bold bg-gradient-to-r from-white to-gray-300 bg-clip-text text-transparent">
            VideoCallApp
          </h1>
        </div>

        <div className="w-full sm:w-auto">
          <div className="text-white text-sm sm:text-base font-medium">
            Video Call App
          </div>
        </div>
      </header>

      {/* Background elements */}
      <div className="absolute inset-0 opacity-20">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-gradient-to-r from-cyan-500/30 to-blue-500/30 rounded-full filter blur-3xl animate-pulse"></div>
        <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-gradient-to-r from-blue-500/30 to-purple-500/30 rounded-full filter blur-3xl animate-pulse animation-delay-2000"></div>
      </div>

      {/* Main Content */}
      <main className="flex flex-col items-center justify-start min-h-0 flex-1 gap-6 sm:gap-8 px-4 sm:px-8 py-4 sm:py-8 relative z-10 overflow-y-auto">

        <div className="text-center space-y-3 sm:space-y-4 max-w-4xl">
          <h2 className="text-2xl sm:text-4xl md:text-5xl font-bold bg-gradient-to-r from-white via-gray-100 to-gray-300 bg-clip-text text-transparent leading-tight">
            Video Meetings
          </h2>
          
          <p className="text-gray-300 text-sm sm:text-lg font-light leading-relaxed px-2">
            Secure video calls for teams.
          </p>
        </div>

        <div className="w-full max-w-4xl">
          <div className="bg-white/5 backdrop-blur-xl rounded-2xl p-4 sm:p-8 border border-white/10 shadow-2xl">
            
            <div className="flex flex-col gap-6">
              
              {/* Create Meeting */}
              <div className="w-full">
                <h3 className="text-base sm:text-lg font-semibold text-white mb-3 sm:mb-4">New Meeting</h3>
                <button
                  onClick={createRoom}
                  className="w-full py-3 sm:py-4 px-4 sm:px-6 rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 text-white font-semibold hover:from-cyan-700 hover:to-blue-700 shadow-lg transition-all duration-300 transform hover:scale-[1.02] text-sm sm:text-base"
                >
                  Create Meeting Room
                </button>
                
                {/* Show created room ID with copy button */}
                {joinRoomId && (
                  <div className="mt-4 p-3 bg-white/10 rounded-xl border border-white/20">
                    <p className="text-white text-sm mb-2">Room ID:</p>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={joinRoomId}
                        readOnly
                        className="flex-1 py-2 px-3 rounded-lg bg-white/5 border border-white/20 text-white text-sm"
                      />
                      <button
                        onClick={() => {
                          navigator.clipboard.writeText(joinRoomId);
                          alert('Room ID copied!');
                        }}
                        className="px-3 py-2 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 transition-all text-sm"
                      >
                        Copy
                      </button>
                    </div>
                    <button
                      onClick={() => navigate(`/room/${joinRoomId}/premeeting`)}
                      className="w-full mt-2 py-2 px-4 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-lg font-semibold hover:from-green-700 hover:to-emerald-700 transition-all text-sm"
                    >
                      Enter Room
                    </button>
                  </div>
                )}
              </div>

              {/* Divider */}
              <div className="h-px bg-white/20 my-2"></div>

              {/* Join Meeting */}
              <div className="w-full">
                <h3 className="text-base sm:text-lg font-semibold text-white mb-3 sm:mb-4">Join Meeting</h3>
                <div className="flex flex-col sm:flex-row gap-3">
                  <input
                    type="text"
                    placeholder="Enter Meeting ID"
                    value={joinRoomId}
                    onChange={(e) => setJoinRoomId(e.target.value)}
                    className="flex-1 py-3 sm:py-4 px-4 sm:px-6 rounded-xl border border-white/20 focus:outline-none focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-400 bg-white/5 backdrop-blur text-white placeholder-gray-400 transition-all duration-300 text-sm sm:text-base"
                  />
                  <button
                    onClick={joinRoom}
                    className="w-full sm:w-auto py-3 sm:py-4 px-6 sm:px-8 rounded-xl bg-gradient-to-r from-green-600 to-emerald-600 text-white font-semibold hover:from-green-700 hover:to-emerald-700 shadow-lg transition-all duration-300 transform hover:scale-[1.02] text-sm sm:text-base"
                  >
                    Join
                  </button>
                </div>
              </div>

            </div>

          </div>
        </div>

        {/* Features */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4 max-w-4xl w-full">
          <div className="text-center p-3 sm:p-4 bg-white/5 backdrop-blur rounded-xl border border-white/10">
            <div className="w-8 h-8 sm:w-10 sm:h-10 bg-gradient-to-r from-cyan-500 to-blue-500 rounded-lg flex items-center justify-center mx-auto mb-2 sm:mb-3">
              <div className="w-4 h-4 sm:w-5 sm:h-5 border-2 border-white rounded-sm"></div>
            </div>
            <h4 className="text-white font-semibold mb-1 sm:mb-2 text-xs sm:text-sm">HD Video</h4>
            <p className="text-gray-400 text-xs">Crystal clear calls</p>
          </div>
          
          <div className="text-center p-3 sm:p-4 bg-white/5 backdrop-blur rounded-xl border border-white/10">
            <div className="w-8 h-8 sm:w-10 sm:h-10 bg-gradient-to-r from-green-500 to-emerald-500 rounded-lg flex items-center justify-center mx-auto mb-2 sm:mb-3">
              <div className="w-4 h-4 sm:w-5 sm:h-5 bg-white rounded-full"></div>
            </div>
            <h4 className="text-white font-semibold mb-1 sm:mb-2 text-xs sm:text-sm">Secure</h4>
            <p className="text-gray-400 text-xs">End-to-end encryption</p>
          </div>
          
          <div className="text-center p-3 sm:p-4 bg-white/5 backdrop-blur rounded-xl border border-white/10">
            <div className="w-8 h-8 sm:w-10 sm:h-10 bg-gradient-to-r from-purple-500 to-pink-500 rounded-lg flex items-center justify-center mx-auto mb-2 sm:mb-3">
              <div className="w-4 h-4 sm:w-5 sm:h-5 border-2 border-white rounded-lg"></div>
            </div>
            <h4 className="text-white font-semibold mb-1 sm:mb-2 text-xs sm:text-sm">Screen Share</h4>
            <p className="text-gray-400 text-xs">Share and collaborate</p>
          </div>
        </div>

      </main>

    </div>
  );
}
