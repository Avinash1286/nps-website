import Image from "next/image";

export default function Loading() {
  return (
    <div className="grid min-h-[60vh] place-items-center px-5 py-24" role="status" aria-label="Loading page">
      <div className="flex flex-col items-center">
        <div className="relative grid h-24 w-24 place-items-center">
          <span className="anim-ring absolute inset-0 rounded-full border-2 border-sky-100 border-t-[#2e3192]" />
          <Image
            src="/media/nps-logo.png"
            alt=""
            width={60}
            height={60}
            className="anim-logo-in h-[60px] w-[60px] object-contain"
          />
        </div>
        <p className="anim-pulse-soft mt-6 text-[11px] font-extrabold tracking-[.28em] text-[#2e3192] uppercase">
          Loading
        </p>
      </div>
    </div>
  );
}
