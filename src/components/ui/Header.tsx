"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"
import { Button } from "./button"
import { useAuth } from "@/context/AuthContext"
import { Menu, Heart, X, ChevronDown, Search as SearchIcon } from "lucide-react"
import Logo from "./Logo"
import { getAllCategories, Category } from "@/lib/search"
import { supabase } from "@/lib/supabase"

const locations = ["Deutschland", "Österreich", "Schweiz"]

export default function Header() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const [isCategoriesOpen, setIsCategoriesOpen] = useState(false)
  const [isSearchCategoryOpen, setIsSearchCategoryOpen] = useState(false)
  const [isLocationOpen, setIsLocationOpen] = useState(false)
  const { user, isLoading } = useAuth()
  const [visible, setVisible] = useState(true)
  const [lastScrollY, setLastScrollY] = useState(0)
  const [searchTerm, setSearchTerm] = useState(searchParams.get('search') || "")
  const [selectedCategory, setSelectedCategory] = useState(searchParams.get('category') || "Alle")
  const [selectedLocation, setSelectedLocation] = useState("Deutschland")
  const [categories, setCategories] = useState<Category[]>([])

  useEffect(() => {
    const fetchCategoriesWithSouks = async () => {
      // Get all categories that have associated souks
      const { data: soukCategories, error } = await supabase
        .from('souks')
        .select('category_id')

      if (error) {
        console.error('Error fetching souk categories:', error)
        return
      }

      // Get unique category IDs
      const uniqueCategoryIds = [...new Set(soukCategories.map((sc: { category_id: string }) => sc.category_id))]

      // Get the category details for these IDs
      const { data: categoryData, error: categoryError } = await supabase
        .from('categories')
        .select('*')
        .in('category_id', uniqueCategoryIds)

      if (categoryError) {
        console.error('Error fetching categories:', categoryError)
        return
      }

      setCategories(categoryData || [])
    }

    fetchCategoriesWithSouks()
  }, [])

  useEffect(() => {
    const handleScroll = () => {
      const currentScrollY = window.scrollY
      
      if (currentScrollY < lastScrollY || currentScrollY < 90) {
        setVisible(true)
      } else if (currentScrollY > lastScrollY) {
        setVisible(false)
      }
      
      setLastScrollY(currentScrollY)
    }

    window.addEventListener("scroll", handleScroll, { passive: true })
    return () => window.removeEventListener("scroll", handleScroll)
  }, [lastScrollY])

  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value)
  }

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const params = new URLSearchParams()
    if (searchTerm) params.set('search', searchTerm)
    if (selectedCategory !== "Alle") params.set('category', selectedCategory)
    router.push(`/souk?${params.toString()}`)
  }

  const handleClearSearch = () => {
    setSearchTerm("")
    const params = new URLSearchParams()
    if (selectedCategory !== "Alle") params.set('category', selectedCategory)
    router.push(`/souk?${params.toString()}`)
  }

  const handleCategorySelect = (category: Category) => {
    setSelectedCategory(category.name_de)
    setIsSearchCategoryOpen(false)
    const params = new URLSearchParams()
    if (searchTerm) params.set('search', searchTerm)
    if (category.category_id !== "Alle") params.set('category', category.category_id)
    router.push(`/souk?${params.toString()}`)
  }

  const handleLocationSelect = (location: string) => {
    setSelectedLocation(location)
    setIsLocationOpen(false)
  }

  return (
    <header className={`fixed top-0 left-0 right-0 w-full z-50 transition-transform duration-300 ${
      visible ? "translate-y-0" : "-translate-y-full"
    }`}>
      <nav className="flex items-center justify-between h-[88px] px-20 bg-blur-sm backdrop-blur-sm">
        <div className="flex items-center">
          <Link href="/" className="flex items-center">
            <Logo width={48} height={48} />
          </Link>
          <Button
            variant="unframed"
            size="default"
            className="flex items-center text-[16px] font-regular ml-12"
            asChild
          >
            <Link href="#about">Über Uns</Link>
          </Button>
          <div className="relative ml-6">
            {isCategoriesOpen && (
              <div className="absolute top-full left-0 mt-2 w-48 bg-white rounded-md shadow-lg py-1 z-10">
                {categories.map((category) => (
                  <Button
                    key={category.category_id}
                    variant="unframed"
                    size="default"
                    className="w-full flex items-center px-4 text-[16px] text-gray-dark hover:text-primary"
                    asChild
                  >
                    <Link href={`/categories/${category.category_id}`}>
                      {category.name_de}
                    </Link>
                  </Button>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="flex items-center">
          <div className="relative flex items-center gap-3">
            <form onSubmit={handleSearchSubmit} className="w-[720px] h-[40px] flex flex-row items-center justify-between px-2 bg-white rounded-[12px]">
              <div className="flex items-center gap-4 flex-1">
                <SearchIcon className="w-6 h-6 text-[#232323] min-w-6" />
                <input 
                  type="text"
                  value={searchTerm}
                  onChange={handleSearch}
                  placeholder="In Stuttgart suchen"
                  className="w-full font-['Inter_Tight'] text-[16px] leading-[19px] text-[#232323] placeholder:text-[#7C7C7C] bg-transparent outline-none"
                />
                {searchTerm && (
                  <button
                    type="button"
                    onClick={handleClearSearch}
                    className="flex items-center justify-center w-6 h-6 text-[#7C7C7C] hover:text-[#232323] transition-colors"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>

              <div className="flex items-center">
                <div className="w-[1px] h-[24px] bg-[#232323] mx-4" />
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setIsSearchCategoryOpen(!isSearchCategoryOpen)}
                    className="flex items-center gap-0 hover:text-primary"
                  >
                    <span className="font-['Inter_Tight'] text-[16px] leading-[19px] text-[#232323]">
                      {selectedCategory}
                    </span>
                    <ChevronDown className={`w-6 h-6 text-[#232323] transition-transform duration-200 ${
                      isSearchCategoryOpen ? "rotate-180" : ""
                    }`} />
                  </button>
                  
                  {isSearchCategoryOpen && (
                    <div className="absolute top-full left-0 mt-3 w-48 bg-white rounded-md shadow-lg py-1 z-10">
                      <button
                        type="button"
                        onClick={() => handleCategorySelect({ category_id: "Alle", name_de: "Alle" } as Category)}
                        className={`w-full text-left px-4 py-2 text-[16px] hover:bg-gray-50 ${
                          "Alle" === selectedCategory ? "text-primary" : "text-[#232323]"
                        }`}
                      >
                        Alle
                      </button>
                      {categories.map((category) => (
                        <button
                          key={category.category_id}
                          type="button"
                          onClick={() => handleCategorySelect(category)}
                          className={`w-full text-left px-4 py-2 text-[16px] hover:bg-gray-50 ${
                            category.name_de === selectedCategory ? "text-primary" : "text-[#232323]"
                          }`}
                        >
                          {category.name_de}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                <div className="w-[1px] h-[24px] bg-[#232323] mx-4" />

                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setIsLocationOpen(!isLocationOpen)}
                    className="flex items-center gap-0 hover:text-primary"
                  >
                    <span className="font-['Inter_Tight'] text-[16px] leading-[19px] text-[#232323]">
                      {selectedLocation}
                    </span>
                    <ChevronDown className={`w-6 h-6 text-[#232323] transition-transform duration-200 ${
                      isLocationOpen ? "rotate-180" : ""
                    }`} />
                  </button>
                  
                  {isLocationOpen && (
                    <div className="absolute top-full left-0 mt-3 w-48 bg-white rounded-md shadow-lg py-1 z-10">
                      {locations.map((location) => (
                        <button
                          key={location}
                          type="button"
                          onClick={() => handleLocationSelect(location)}
                          className={`w-full text-left px-4 py-2 text-[16px] hover:bg-gray-50 ${
                            location === selectedLocation ? "text-primary" : "text-[#232323]"
                          }`}
                        >
                          {location}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </form>
          </div>
        </div>

        <div className="flex items-center">
          {!isLoading && !user ? (
            <>
              <Button variant="framed" size="default" asChild>
                <Link href="/auth/login">Anmelden</Link>
              </Button>
              <Button variant="highlight" size="default" className="ml-6" asChild>
                <Link href="/auth/signup">Registrieren</Link>
              </Button>
            </>
          ) : (
            <div className="flex items-center gap-6">
              <button className="hover:text-primary transition-colors">
                <Heart className="w-8 h-8" />
              </button>
              <button className="w-8 h-8 rounded-full bg-[#232323] flex items-center justify-center text-white hover:bg-primary transition-colors">
                <span className="text-[16px] font-medium">
                  {user?.email?.[0].toUpperCase() || 'U'}
                </span>
              </button>
            </div>
          )}
        </div>

        <div className="md:hidden">
          <Button
            variant="unframed"
            size="default"
            onClick={() => setIsMenuOpen(!isMenuOpen)}
          >
            {isMenuOpen ? (
              <X className="h-4 w-4" />
            ) : (
              <Menu className="h-4 w-4" />
            )}
          </Button>
        </div>
      </nav>

      {isMenuOpen && (
        <div className="md:hidden">
          <div className="px-2 pt-2 pb-3 space-y-1 sm:px-3">
            <Button
              variant="unframed"
              size="default"
              className="w-full text-left"
              asChild
            >
              <Link href="#about">Über Uns</Link>
            </Button>
            <Button 
              variant="unframed"
              size="default"
              className="w-full text-left"
              onClick={() => setIsCategoriesOpen(!isCategoriesOpen)}
            >
              Kategorien
            </Button>
            {isCategoriesOpen && (
              <div className="pl-4 space-y-1">
                {categories.map((category) => (
                  <Button
                    key={category.category_id}
                    variant="unframed"
                    size="default"
                    className="w-full text-left"
                    asChild
                  >
                    <Link href={`/categories/${category.category_id}`}>
                      {category.name_de}
                    </Link>
                  </Button>
                ))}
              </div>
            )}
            {!isLoading && !user ? (
              <>
                <Button variant="framed" size="default" className="w-full" asChild>
                  <Link href="/auth/login">Anmelden</Link>
                </Button>
                <Button
                  variant="highlight"
                  size="default"
                  className="w-full mt-2"
                  asChild
                >
                  <Link href="/auth/signup">Registrieren</Link>
                </Button>
              </>
            ) : (
              <Button variant="action" size="action" className="w-full" asChild>
                <Link href="/dashboard">Dashboard</Link>
              </Button>
            )}
          </div>
        </div>
      )}
    </header>
  )
} 