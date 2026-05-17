export function MusicView() {
  return (
    <div className="hush-panel-transition flex min-h-0 flex-col overflow-hidden">
      <div className="mb-2 flex h-[60px] min-h-[60px] items-center rounded-xl border border-[#3f3f46]/45 bg-[#111111]/78 px-2.5 py-2 shadow-[0_14px_45px_rgba(0,0,0,0.28)] backdrop-blur-md sm:rounded-2xl sm:px-4">
        <h2 className="text-base font-medium text-[#f4f4f5]">Музыка</h2>
      </div>

      <div className="grid min-h-0 flex-1 place-items-center rounded-xl border border-[#3f3f46]/45 bg-[#050505]/82 p-5 text-center shadow-[0_20px_60px_rgba(0,0,0,0.35)] backdrop-blur-md sm:rounded-2xl">
        <p className="text-base font-medium text-[#f4f4f5]">В разработке...</p>
      </div>
    </div>
  );
}
