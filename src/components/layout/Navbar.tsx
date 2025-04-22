import Link from 'next/link';
import { ChevronDown, Search, MapPin } from 'lucide-react';

export default function Navbar() {
  return (
    <nav className="w-[1280px] h-[42px] flex justify-between items-center px-0 gap-[78px] relative">
      {/* Logo */}
      <Link href="/" className="w-8 h-8 bg-[#589D96] rounded-full relative flex-shrink-0">
        <div className="absolute w-[16.7px] h-[14.53px] left-1/2 top-[8.77px] -translate-x-1/2">
          <div className="absolute w-[6.14px] h-[4.37px] left-[7.49px] top-[9.89px] bg-[#DBF7F4] shadow-[inset_0px_0.256px_0.192px_rgba(0,0,0,0.4)]" />
          <div className="absolute w-[11.67px] h-[9.49px] left-[7.49px] top-0 bg-white shadow-[inset_0px_0.256px_0.256px_rgba(0,0,0,0.25)] rounded-[8.6432px]" />
          <div className="absolute w-[14.23px] h-[9.18px] left-0 top-[14.22px] bg-gradient-to-r from-[#F1F2F2] to-[#DBF7F4] shadow-[inset_0px_0.256px_0.256px_rgba(0,0,0,0.25)] rounded-[8.6432px] -rotate-90" />
          <div className="absolute w-[9.22px] h-[9.07px] left-[7.49px] top-[5.46px] bg-transparent shadow-[inset_0px_0.256px_0.256px_rgba(0,0,0,0.25)] rounded-[8.6432px]" />
        </div>
      </Link>

      {/* Navigation Links and Search */}
      <div className="flex flex-row items-center gap-[133px] w-[1170px] h-[42px]">
        {/* Links */}
        <div className="flex flex-row justify-between items-center gap-[33px] w-[192px] h-[28px]">
          <Link 
            href="/about"
            className="flex flex-row items-center px-2 w-[74px] h-[28px] rounded-lg hover:bg-gray-100"
          >
            <span className="font-sans text-sm font-medium text-[#232323]">Über Uns</span>
          </Link>
          <div className="flex flex-row items-center px-2 w-[99px] h-[28px] rounded-lg hover:bg-gray-100 cursor-pointer">
            <span className="font-sans text-sm font-medium text-[#232323]">Kategorien</span>
            <ChevronDown className="w-[15px] h-[15px] -rotate-90 text-[#272727]" />
          </div>
        </div>

        {/* Search Section */}
        <div className="flex flex-row items-center gap-4 w-[410px] h-[42px]">
          <div className="flex flex-row items-center px-[10px] py-[5px] gap-[15px] w-[352px] h-[42px] bg-white rounded-[15px]">
            <div className="flex flex-row items-center gap-[15px] w-[148px] h-6">
              <Search className="w-6 h-6 text-[#232323] transform scale-x-[-1]" />
              <span className="font-sans text-xs text-[#7C7C7C]">In Stuttgart suchen</span>
            </div>
          </div>
          <div className="w-[42px] h-[42px] bg-white rounded-[15px] relative flex-shrink-0">
            <MapPin className="absolute w-6 h-6 left-[9px] top-[9px] stroke-[1.5px] text-[#232323]" />
          </div>
        </div>

        {/* Auth Buttons */}
        <div className="flex flex-row items-center gap-3 w-[302px] h-[42px]">
          <Link
            href="/auth/login"
            className="flex justify-center items-center px-2 w-[145px] h-[42px] bg-white rounded-lg hover:bg-gray-50"
          >
            <span className="font-sans text-sm font-medium text-[#232323]">Anmelden</span>
          </Link>
          <Link
            href="/auth/signup"
            className="flex justify-center items-center px-2 gap-2 w-[145px] h-[42px] bg-white rounded-lg hover:bg-gray-50"
          >
            <span className="font-sans text-sm font-medium text-[#232323]">Registrieren</span>
          </Link>
        </div>
      </div>
    </nav>
  );
} 