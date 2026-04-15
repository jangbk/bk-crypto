export default function LoginLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="relative min-h-screen overflow-hidden bg-[#030712]">
      {/* Video Background (hero only) */}
      <video
        autoPlay
        muted
        loop
        playsInline
        preload="none"
        poster="https://assets.mixkit.co/videos/12262/12262-thumb-720-0.jpg"
        className="absolute inset-0 w-full h-[100vh] object-cover opacity-60"
      >
        <source
          src="https://assets.mixkit.co/videos/12262/12262-720.mp4"
          type="video/mp4"
        />
      </video>

      {/* Dark Overlay */}
      <div className="absolute inset-0 h-[100vh] bg-black/50 backdrop-blur-[1px]" />

      {/* Content */}
      <div className="relative z-10 w-full">
        {children}
      </div>
    </div>
  );
}
