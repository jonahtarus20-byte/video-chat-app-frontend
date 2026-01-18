import {
  MicrophoneIcon,
  VideoCameraIcon,
  PhoneXMarkIcon,
  StopIcon,
  PlayIcon,
  ComputerDesktopIcon,
} from "@heroicons/react/24/solid";

export default function ControlButton({ type, onClick, isActive = true }) {
  let icon;
  let bg = "bg-blue-600";

  // Toggle icon for mic/camera and background slightly
  if (type === "mute") {
    icon = <MicrophoneIcon className="w-5 h-5 sm:w-8 sm:h-8 text-white" />;
    bg = isActive ? "bg-blue-600" : "bg-red-600"; // red when muted
  }

  if (type === "camera") {
    icon = <VideoCameraIcon className="w-5 h-5 sm:w-8 sm:h-8 text-white" />;
    bg = isActive ? "bg-blue-600" : "bg-red-600"; // red when off
  }

  if (type === "record") {
    icon = isActive ? <StopIcon className="w-5 h-5 sm:w-8 sm:h-8 text-white" /> : <PlayIcon className="w-5 h-5 sm:w-8 sm:h-8 text-white" />;
    bg = isActive ? "bg-red-600" : "bg-green-600"; // red when recording, green when stopped
  }

  if (type === "screen") {
    icon = <ComputerDesktopIcon className="w-5 h-5 sm:w-8 sm:h-8 text-white" />;
    bg = isActive ? "bg-orange-600" : "bg-blue-600"; // orange when sharing
  }

  if (type === "leave") {
    icon = <PhoneXMarkIcon className="w-5 h-5 sm:w-8 sm:h-8 text-white" />;
    bg = "bg-red-600";
  }

  return (
    <button
      onClick={onClick}
      className={`flex items-center justify-center p-2 sm:p-4 rounded-full shadow-xl ${bg} hover:brightness-110 transition relative`}
    >
      {icon}
      {/* Muted line indicator */}
      {type === "mute" && !isActive && (
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="w-8 h-0.5 bg-white rotate-45 absolute"></div>
        </div>
      )}
    </button>
  );
}
