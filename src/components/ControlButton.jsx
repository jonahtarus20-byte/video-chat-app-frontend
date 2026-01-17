import { useState } from "react";
import {
  MicrophoneIcon,
  VideoCameraIcon,
  PhoneXMarkIcon,
} from "@heroicons/react/24/solid";

export default function ControlButton({ type, onClick, isActive = true }) {
  let icon;
  let bg = "bg-blue-600";

  // Toggle icon for mic/camera and background slightly
  if (type === "mute") {
    icon = isActive
      ? <MicrophoneIcon className="w-8 h-8 text-white" />
      : <MicrophoneIcon className="w-8 h-8 text-white" />;
    bg = isActive ? "bg-blue-600" : "bg-red-600"; // red when muted
  }

  if (type === "camera") {
    icon = isActive
      ? <VideoCameraIcon className="w-8 h-8 text-white" />
      : <VideoCameraIcon className="w-8 h-8 text-white" />;
    bg = isActive ? "bg-blue-600" : "bg-red-600"; // red when off
  }

  if (type === "leave") {
    icon = <PhoneXMarkIcon className="w-8 h-8 text-white" />;
    bg = "bg-red-600";
  }

  const handleClick = () => {
    if (onClick) onClick();
  };

  return (
    <button
      onClick={handleClick}
      className={`flex items-center justify-center p-4 rounded-full shadow-xl ${bg} hover:brightness-110 transition`}
    >
      {icon}
    </button>
  );
}
