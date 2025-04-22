import React, { useState, useRef, useEffect } from "react"
import { Globe, Phone, Share2 } from "lucide-react"
import { SearchResult } from "@/types/souk"
import { supabase } from "@/lib/supabase"
import { useAuth } from "@/context/AuthContext"
import { useRouter } from "next/navigation"
import Placeholder from "./Placeholder"
import LikeButton from "./LikeButton"
import SoukDetails from "./SoukDetails"
import Ornament from "./Ornament"
import ActionBar from './ActionBar'
import { Heart, MapPin, Clock, Star } from 'lucide-react'
import { cn } from '@/lib/utils'

interface SoukCardProps {
  souk: SearchResult | null
  className?: string
}

const SoukCard: React.FC<SoukCardProps> = ({
  souk,
  className = '',
}) => {
  const [isLiked, setIsLiked] = useState(false)
  const [hasHiddenTags, setHasHiddenTags] = useState(false)
  const [categoryName, setCategoryName] = useState<string>("")
  const tagsContainerRef = useRef<HTMLDivElement>(null)
  const tagsRef = useRef<HTMLDivElement>(null)
  const { user } = useAuth()
  const router = useRouter()
  const [isDetailsOpen, setIsDetailsOpen] = useState(false)
  const [ownerName, setOwnerName] = useState<string>("")

  useEffect(() => {
    if (tagsContainerRef.current && tagsRef.current) {
      const containerWidth = tagsContainerRef.current.offsetWidth
      const tagsWidth = tagsRef.current.scrollWidth
      setHasHiddenTags(tagsWidth > containerWidth)
    }
  }, [souk])

  useEffect(() => {
    const fetchCategoryName = async () => {
      if (souk?.category_id) {
        const { data, error } = await supabase
          .from('categories')
          .select('name_de')
          .eq('category_id', souk.category_id)
          .single()

        if (error) {
          console.error('Error fetching category:', error)
          setCategoryName("Alle")
          return
        }

        if (data && data.name_de) {
          setCategoryName(data.name_de)
        } else {
          setCategoryName("Kategorie")
        }
      } else {
        setCategoryName("Kategorie")
      }
    }

    const checkBookmarkStatus = async () => {
      if (user && souk?.souk_id) {
        const { data, error } = await supabase
          .from('bookmarks')
          .select('*')
          .eq('user_id', user.id)
          .eq('souk_id', souk.souk_id)
          .single()

        if (!error && data) {
          setIsLiked(true)
        }
      }
    }

    const fetchOwnerName = async () => {
      if (souk?.souk_owner_id) {
        const { data, error } = await supabase
          .from('profiles')
          .select('full_name')
          .eq('id', souk.souk_owner_id)
          .single();

        if (!error && data) {
          setOwnerName(data.full_name || 'Unknown');
        }
      }
    };

    fetchCategoryName()
    checkBookmarkStatus()
    fetchOwnerName()
  }, [souk?.category_id, souk?.souk_id, user, souk?.souk_owner_id])

  const handleBookmark = async () => {
    if (!user) {
      router.push('/auth/login')
      return
    }

    if (!souk?.souk_id) return

    try {
      if (isLiked) {
        // Remove bookmark
        const { error } = await supabase
          .from('bookmarks')
          .delete()
          .eq('user_id', user.id)
          .eq('souk_id', souk.souk_id)

        if (!error) {
          setIsLiked(false)
        }
      } else {
        // Add bookmark
        const { error } = await supabase
          .from('bookmarks')
          .insert([
            {
              user_id: user.id,
              souk_id: souk.souk_id
            }
          ])

        if (!error) {
          setIsLiked(true)
        }
      }
    } catch (error) {
      console.error('Error toggling bookmark:', error)
    }
  }

  if (!souk) {
    return (
      <div className="w-[296px] h-[397.75px] flex flex-col">
        <div className="w-[296px] h-[254.38px] relative">
          <Placeholder />
        </div>
        <div className="w-[296px] h-[143.38px] bg-white border border-[#D4D4D4] rounded-b-[22.2px] p-[14.8px]">
          <div className="w-[266.4px] h-[110.07px] flex flex-col justify-between">
            <div className="w-[266.4px] h-[78.58px] flex flex-col gap-[14.8px]">
              <div className="w-[266.4px] h-[43.78px] flex flex-col gap-[2.78px]">
                <h3 className="font-['Inter_Tight'] text-[20px] font-semibold leading-[24px] text-[#232323]">
                  Loading...
                </h3>
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <>
      <div
        onClick={() => setIsDetailsOpen(true)}
        className="w-[296px] h-[397.75px] flex flex-col group cursor-pointer"
      >
        {/* Image Section */}
        <div className="w-[296px] h-[254.38px] relative group">
          {/* Background Image */}
          <div className="w-full h-full relative">
            {souk.souk_images ? (
              <img
                src={JSON.parse(souk.souk_images).urls[0]}
                alt={souk.souk_name}
                className="w-full h-full object-cover rounded-t-[22.2px] border border-white"
                onError={(e) => {
                  const target = e.target as HTMLImageElement;
                  target.src = "https://pmbatjlosstytdmmqkky.supabase.co/storage/v1/object/public/images//Islamic%20New%20Year%20Background.jpg";
                }}
              />
            ) : souk.souk_logo ? (
              <img
                src={souk.souk_logo}
                alt={souk.souk_name}
                className="w-full h-full object-cover rounded-t-[22.2px] border border-white"
                onError={(e) => {
                  const target = e.target as HTMLImageElement;
                  target.src = "https://pmbatjlosstytdmmqkky.supabase.co/storage/v1/object/public/images//Islamic%20New%20Year%20Background.jpg";
                }}
              />
            ) : (
              <img
                src="https://pmbatjlosstytdmmqkky.supabase.co/storage/v1/object/public/images//Islamic%20New%20Year%20Background.jpg"
                alt="Islamic New Year Background"
                className="w-full h-full object-cover rounded-t-[22.2px] border border-white"
              />
            )}
            
            {/* CategoryFrame - Between image and overlay */}
            <div className="absolute bottom-0 left-0 right-0 flex flex-col justify-end items-start p-[11.1px] gap-[9.25px] w-[296px] h-[46.2px] z-[2]">
              {/* Category Badge */}
              <div className="flex flex-row justify-center items-center px-2 py-1 w-fit max-w-[273.8px] h-[24px] bg-[rgba(238,238,238,0.7)] backdrop-blur-[1.67183px] rounded-[7.4px]">
                <span className="font-['Inter_Tight'] text-[14px] font-medium leading-[16px] text-[#232323]">
                  {categoryName}
                </span>
              </div>
            </div>
            
            {/* Hover Overlay with blur - Covers both image and category button */}
            <div className="absolute inset-0 bg-black/70 backdrop-blur-[2px] rounded-t-[22.2px] opacity-0 group-hover:opacity-100 transition-opacity duration-200 z-[3]" />
          </div>
          
          {/* Masha'Allah Button - On top of everything */}
          <div 
            className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200 z-[4]"
            onClick={(e) => {
              e.stopPropagation();
              handleBookmark();
            }}
          >
            <LikeButton />
          </div>
        </div>

        {/* Content Section */}
        <div 
          className="w-[296px] h-[114.6px] bg-white border-[0.835915px] border-[#D4D4D4] rounded-b-[22.2px] p-[14.8px]"
          onClick={() => setIsDetailsOpen(true)}
        >
          <div className="w-[266.4px] h-[85px] flex flex-col gap-[8px]">
            <div className="w-[266.4px] h-[41px] flex flex-col gap-[12px]">
              <h3 className="font-sans text-[20px] font-semibold leading-[24px] text-[#232323]">
                {souk.souk_name}
              </h3>
              <p className="font-sans text-[14px] font-normal leading-[17px] text-[#232323]">
                {ownerName}
              </p>
            </div>

            <div className="w-[266.4px] h-[1px] bg-[#EEEEEE] transform -rotate-180" />

            {/* Tags */}
            <div ref={tagsContainerRef} className="flex flex-row items-start gap-[7.4px] w-[203.2px] h-[20px]">
              <div ref={tagsRef} className="flex flex-row items-start gap-[7.4px]">
                {souk.address_city && (
                  <div className="flex flex-row justify-center items-center px-1 py-0.5 gap-[9.25px] h-[20px] border-[0.925px] border-[#CDCDCD] rounded-[3.7px]">
                    <span className="font-sans text-[12px] font-medium leading-[16px] tracking-[-0.02em] text-[#232323]">
                      {souk.address_city}
                    </span>
                  </div>
                )}
                {souk.review_feedback === 'halal' && (
                  <div className="flex flex-row justify-center items-center px-1 py-0.5 gap-[9.25px] h-[20px] border-[0.925px] border-[#CDCDCD] rounded-[3.7px]">
                    <span className="font-sans text-[12px] font-medium leading-[16px] tracking-[-0.02em] text-[#232323]">
                      Quran
                    </span>
                  </div>
                )}
                {souk.is_verified && (
                  <div className="flex flex-row justify-center items-center px-1 py-0.5 gap-[9.25px] h-[20px] border-[0.925px] border-[#CDCDCD] rounded-[3.7px]">
                    <span className="font-sans text-[12px] font-medium leading-[16px] tracking-[-0.02em] text-[#232323]">
                      Juma
                    </span>
                  </div>
                )}
              </div>
              {hasHiddenTags && (
                <div className="flex flex-row justify-center items-center px-[3.7px] py-[2px] gap-[9.25px] w-[20px] h-[20px] border-[0.925px] border-[#CDCDCD] rounded-[3.7px]">
                  <span className="font-sans text-[14px] font-medium leading-[16px] text-[#232323]">
                    +
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Detail popup */}
      {isDetailsOpen && souk && (
        <SoukDetails
          souk={souk}
          onClose={() => setIsDetailsOpen(false)}
          onBookmark={handleBookmark}
          isBookmarked={isLiked}
        />
      )}
    </>
  )
}

export default SoukCard 