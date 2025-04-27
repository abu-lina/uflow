import Link from 'next/link';

import { ChevronDown, Search, MapPin } from 'lucide-react';

export default function Navbar() {
  return (
    <nav className="relative flex h-[42px] w-[1280px] items-center justify-between gap-[78px] px-0">
      {/* Logo */}
      <Link className="relative h-8 w-8 flex-shrink-0 rounded-full bg-[#589D96]" href="/">
        <div className="absolute left-1/2 top-[8.77px] h-[14.53px] w-[16.7px] -translate-x-1/2">
          <div className="absolute left-[7.49px] top-[9.89px] h-[4.37px] w-[6.14px] bg-[#DBF7F4] shadow-[inset_0px_0.256px_0.192px_rgba(0,0,0,0.4)]" />
          <div className="absolute left-[7.49px] top-0 h-[9.49px] w-[11.67px] rounded-[8.6432px] bg-white shadow-[inset_0px_0.256px_0.256px_rgba(0,0,0,0.25)]" />
          <div className="absolute left-0 top-[14.22px] h-[9.18px] w-[14.23px] -rotate-90 rounded-[8.6432px] bg-gradient-to-r from-[#F1F2F2] to-[#DBF7F4] shadow-[inset_0px_0.256px_0.256px_rgba(0,0,0,0.25)]" />
          <div className="absolute left-[7.49px] top-[5.46px] h-[9.07px] w-[9.22px] rounded-[8.6432px] bg-transparent shadow-[inset_0px_0.256px_0.256px_rgba(0,0,0,0.25)]" />
        </div>
      </Link>

      {/* Navigation Links and Search */}
      <div className="flex h-[42px] w-[1170px] flex-row items-center gap-[133px]">
        {/* Links */}
        <div className="flex h-[28px] w-[192px] flex-row items-center justify-between gap-[33px]">
          <Link
            className="flex h-[28px] w-[74px] flex-row items-center rounded-lg px-2 hover:bg-gray-100"
            href="/about"
          >
            <span className="font-[Inter Tight] text-sm font-medium text-[#232323]">Über Uns</span>
          </Link>
          <div className="flex h-[28px] w-[99px] cursor-pointer flex-row items-center rounded-lg px-2 hover:bg-gray-100">
            <span className="font-[Inter Tight] text-sm font-medium text-[#232323]">
              Kategorien
            </span>
            <ChevronDown className="h-[15px] w-[15px] -rotate-90 text-[#272727]" />
          </div>
        </div>

        {/* Search Section */}
        <div className="flex h-[42px] w-[410px] flex-row items-center gap-4">
          <div className="flex h-[42px] w-[352px] flex-row items-center gap-[15px] rounded-[15px] bg-white px-[10px] py-[5px]">
            <div className="flex h-6 w-[148px] flex-row items-center gap-[15px]">
              <Search className="h-6 w-6 scale-x-[-1] transform text-[#232323]" />
              <span className="font-inter text-xs text-[#7C7C7C]">In Stuttgart suchen</span>
            </div>
          </div>
          <div className="relative h-[42px] w-[42px] flex-shrink-0 rounded-[15px] bg-white">
            <MapPin className="absolute left-[9px] top-[9px] h-6 w-6 stroke-[1.5px] text-[#232323]" />
          </div>
        </div>

        {/* Auth Buttons */}
        <div className="flex h-[42px] w-[302px] flex-row items-center gap-3">
          <Link
            className="flex h-[42px] w-[145px] items-center justify-center rounded-lg bg-white px-2 hover:bg-gray-50"
            href="/auth/login"
          >
            <span className="font-[Inter Tight] text-sm font-medium text-[#232323]">Anmelden</span>
          </Link>
          <Link
            className="flex h-[42px] w-[145px] items-center justify-center gap-2 rounded-lg bg-white px-2 hover:bg-gray-50"
            href="/auth/signup"
          >
            <span className="font-[Inter Tight] text-sm font-medium text-[#232323]">
              Registrieren
            </span>
          </Link>
        </div>
      </div>
    </nav>
  );
}
