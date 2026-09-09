import { useState, useRef, useEffect, useMemo, type KeyboardEvent } from 'react'
import { ChevronDown, Search, X, Check } from 'lucide-react'

export interface SearchableSelectOption {
  value: string | number
  label: string
  aliases?: string[]
}

export interface SearchableSelectProps {
  id?: string
  value: string | number
  onChange: (value: string) => void
  options: SearchableSelectOption[]
  placeholder?: string
  searchPlaceholder?: string
  disabled?: boolean
  className?: string
  accentColor?: 's1' | 's2'
  clearable?: boolean
  defaultValue?: string | number
}

export default function SearchableSelect({
  id,
  value,
  onChange,
  options,
  placeholder = 'เลือก...',
  searchPlaceholder = 'พิมพ์ค้นหา...',
  disabled = false,
  className = '',
  accentColor = 's1',
  clearable = true,
  defaultValue = '',
}: SearchableSelectProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [highlightedIndex, setHighlightedIndex] = useState<number>(-1)

  const containerRef = useRef<HTMLDivElement>(null)
  const searchInputRef = useRef<HTMLInputElement>(null)
  const listRef = useRef<HTMLUListElement>(null)

  // Find currently selected option
  const selectedOption = useMemo(() => {
    return options.find((opt) => String(opt.value) === String(value))
  }, [options, value])

  // Filter options based on search query
  const filteredOptions = useMemo(() => {
    const q = searchQuery.trim().toLowerCase()
    if (!q) return options

    const qNoSpace = q.replace(/\s+/g, '')

    return options.filter((opt) => {
      const labelLower = opt.label.toLowerCase()
      const labelNoSpace = labelLower.replace(/\s+/g, '')

      // Direct match
      if (labelLower.includes(q) || labelNoSpace.includes(qNoSpace)) return true

      // Value match
      if (String(opt.value).toLowerCase().includes(q)) return true

      // Aliases match (e.g. กทม -> กรุงเทพมหานคร)
      if (opt.aliases && opt.aliases.length > 0) {
        return opt.aliases.some((alias) => {
          const aLower = alias.toLowerCase()
          return aLower.includes(q) || q.includes(aLower)
        })
      }

      return false
    })
  }, [options, searchQuery])

  // Auto-focus search input when opening
  useEffect(() => {
    if (isOpen) {
      setSearchQuery('')
      // Set initial highlighted index to the currently selected option
      const currentIndex = filteredOptions.findIndex((opt) => String(opt.value) === String(value))
      setHighlightedIndex(currentIndex >= 0 ? currentIndex : 0)

      const timer = setTimeout(() => {
        searchInputRef.current?.focus()
      }, 50)
      return () => clearTimeout(timer)
    }
  }, [isOpen])

  // Scroll highlighted item into view
  useEffect(() => {
    if (isOpen && highlightedIndex >= 0 && listRef.current) {
      const activeEl = listRef.current.children[highlightedIndex] as HTMLElement | undefined
      if (activeEl) {
        activeEl.scrollIntoView({ block: 'nearest' })
      }
    }
  }, [highlightedIndex, isOpen])

  // Close on click outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent | TouchEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
      document.addEventListener('touchstart', handleClickOutside)
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      document.removeEventListener('touchstart', handleClickOutside)
    }
  }, [isOpen])

  function handleSelect(val: string | number) {
    onChange(String(val))
    setIsOpen(false)
  }

  function handleClear(e: React.MouseEvent) {
    e.stopPropagation()
    onChange(String(defaultValue))
  }

  function handleTriggerKeyDown(e: KeyboardEvent<HTMLButtonElement>) {
    if (disabled) return
    if (e.key === 'ArrowDown' || e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      setIsOpen(true)
    }
  }

  function handleSearchKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setHighlightedIndex((prev) => (prev < filteredOptions.length - 1 ? prev + 1 : 0))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setHighlightedIndex((prev) => (prev > 0 ? prev - 1 : filteredOptions.length - 1))
    } else if (e.key === 'Enter') {
      e.preventDefault()
      if (filteredOptions.length > 0 && highlightedIndex >= 0 && highlightedIndex < filteredOptions.length) {
        handleSelect(filteredOptions[highlightedIndex].value)
      }
    } else if (e.key === 'Escape') {
      e.preventDefault()
      setIsOpen(false)
    } else if (e.key === 'Tab') {
      setIsOpen(false)
    }
  }

  const ringColor = accentColor === 's2' ? 'focus:ring-s2-300 focus:border-s2-400' : 'focus:ring-s1-300 focus:border-s1-400'
  const activeBg = accentColor === 's2' ? 'bg-s2-50 text-s2-700' : 'bg-s1-50 text-s1-700'
  const activeIconColor = accentColor === 's2' ? 'text-s2-600' : 'text-s1-600'

  const isNonDefault = String(value) !== String(defaultValue) && value !== ''

  return (
    <div ref={containerRef} className={`relative w-full ${className}`}>
      {/* Trigger Button */}
      <button
        type="button"
        id={id}
        disabled={disabled}
        onClick={() => !disabled && setIsOpen((prev) => !prev)}
        onKeyDown={handleTriggerKeyDown}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        className={`w-full flex items-center justify-between rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-body text-slate-700 hover:border-slate-300 focus:outline-none focus:ring-2 ${ringColor} transition-all text-left shadow-sm ${
          disabled ? 'opacity-50 cursor-not-allowed bg-slate-50' : 'cursor-pointer'
        }`}
      >
        <span className={`truncate mr-2 ${!selectedOption ? 'text-slate-400' : ''}`}>
          {selectedOption ? selectedOption.label : placeholder}
        </span>
        <div className="flex items-center gap-1.5 shrink-0 text-slate-400">
          {clearable && isNonDefault && !disabled && (
            <span
              role="button"
              tabIndex={0}
              aria-label="ล้างการเลือก"
              onClick={handleClear}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.stopPropagation()
                  onChange(String(defaultValue))
                }
              }}
              className="p-0.5 rounded-full hover:bg-slate-100 hover:text-slate-600 transition-colors cursor-pointer"
            >
              <X size={14} />
            </span>
          )}
          <ChevronDown
            size={16}
            className={`transition-transform duration-200 ${isOpen ? 'rotate-180 text-slate-600' : ''}`}
          />
        </div>
      </button>

      {/* Dropdown Popover */}
      {isOpen && (
        <div
          role="listbox"
          className="absolute left-0 top-full mt-1.5 w-full min-w-[220px] max-w-sm bg-white rounded-xl shadow-xl border border-slate-200 py-1.5 z-50 animate-in fade-in zoom-in-95 duration-100"
        >
          {/* Search Input Bar */}
          <div className="px-2 pb-2 pt-1 border-b border-slate-100">
            <div className="relative flex items-center">
              <Search size={15} className="absolute left-2.5 text-slate-400 pointer-events-none" />
              <input
                ref={searchInputRef}
                type="text"
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value)
                  setHighlightedIndex(0)
                }}
                onKeyDown={handleSearchKeyDown}
                placeholder={searchPlaceholder}
                className={`w-full pl-8 pr-7 py-1.5 text-sm bg-slate-50 border border-slate-200 rounded-lg text-slate-800 placeholder-slate-400 focus:bg-white focus:outline-none focus:ring-2 ${ringColor} transition-all`}
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => {
                    setSearchQuery('')
                    searchInputRef.current?.focus()
                  }}
                  className="absolute right-2 text-slate-400 hover:text-slate-600 p-0.5 rounded-full"
                >
                  <X size={13} />
                </button>
              )}
            </div>
          </div>

          {/* Options List */}
          <ul
            ref={listRef}
            className="max-h-60 overflow-y-auto px-1.5 py-1 space-y-0.5 scrollbar-thin scrollbar-thumb-slate-200"
          >
            {filteredOptions.length > 0 ? (
              filteredOptions.map((opt, idx) => {
                const isSelected = String(opt.value) === String(value)
                const isHighlighted = idx === highlightedIndex

                return (
                  <li
                    key={String(opt.value)}
                    role="option"
                    aria-selected={isSelected}
                    onClick={() => handleSelect(opt.value)}
                    onMouseEnter={() => setHighlightedIndex(idx)}
                    className={`px-3 py-2 text-sm rounded-lg cursor-pointer flex items-center justify-between transition-colors ${
                      isSelected
                        ? activeBg
                        : isHighlighted
                          ? 'bg-slate-100 text-slate-900'
                          : 'text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    <span className={`truncate ${isSelected ? 'font-medium' : ''}`}>
                      {opt.label}
                    </span>
                    {isSelected && (
                      <Check size={16} className={`shrink-0 ml-2 ${activeIconColor}`} />
                    )}
                  </li>
                )
              })
            ) : (
              <li className="py-6 px-3 text-center text-sm text-slate-400">
                ไม่พบผลการค้นหา "{searchQuery}"
              </li>
            )}
          </ul>
        </div>
      )}
    </div>
  )
}
