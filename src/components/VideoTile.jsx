// src/components/VideoTile.jsx
import { useRef, useEffect } from "react";

export default function VideoTile({ stream, name }) {
  const videoRef = useRef(null);

  useEffect(() => {
    if (videoRef.current && stream) {
      videoRef.current.srcObject = stream;
    }
  }, [stream]);

  return (
    <div className="w-full h-full bg-blue-100 rounded-xl flex items-center justify-center text-blue-600 font-bold text-lg shadow-md relative overflow-hidden">
      {stream ? (
        <video
          ref={videoRef}
          autoPlay
          muted
          className="w-full h-full object-cover rounded-xl scale-x-[-1]"
        />
      ) : (
        <div className="flex items-center justify-center w-full h-full">
          {name}
        </div>
      )}
    </div>
  );
}

