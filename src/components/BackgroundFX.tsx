export default function BackgroundFX() {
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 -z-10">
      {/* Glows menores e sempre dentro da área visível */}
      <div className="absolute top-[4%] left-[12%] h-[28rem] w-[28rem] rounded-full bg-emerald-200/40 blur-[90px]" />
      <div className="absolute bottom-[6%] right-[10%] h-[26rem] w-[26rem] rounded-full bg-lime-200/35 blur-[100px]" />
    </div>
  );
}
