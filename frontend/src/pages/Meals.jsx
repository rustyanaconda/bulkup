import { useState, useEffect, useRef } from 'react'
import { Html5Qrcode, Html5QrcodeSupportedFormats, Html5QrcodeScannerState } from 'html5-qrcode'
import { Search, Barcode, Pencil, Camera, Trash2 } from 'lucide-react'
import { useMeals }    from '../hooks/useMeals'
import { useCalories } from '../hooks/useCalories'
import CalorieBar      from '../components/calories/CalorieBar'
import { authFetch }   from '../utils/api'

// ─── constants ────────────────────────────────────────────────────────────────

const MEAL_TIMES  = ['breakfast', 'lunch', 'dinner', 'snack']
const EMPTY_FORM  = { name: '', calories: '', meal_time: 'breakfast', protein: '', carbs: '', fat: '' }
const TAG_GROUPS  = [
  { label: 'Tags',    type: 'primary'     },
  { label: 'Dietary', type: 'restriction' },
  { label: 'More',    type: 'secondary'   },
]
const MEAL_TIME_ORDER = ['breakfast', 'lunch', 'dinner', 'snack']
const TAG_CHIP = {
  primary:     'bg-[#1A2E45]/10 text-[#1A2E45]',
  restriction: 'bg-[#B07B2C]/10 text-[#B07B2C]',
}

// ─── barcode scanner component ────────────────────────────────────────────────

const BARCODE_FORMATS = [
  Html5QrcodeSupportedFormats.UPC_A,
  Html5QrcodeSupportedFormats.UPC_E,
  Html5QrcodeSupportedFormats.EAN_13,
  Html5QrcodeSupportedFormats.EAN_8,
  Html5QrcodeSupportedFormats.CODE_128,
]

const { SCANNING, PAUSED } = Html5QrcodeScannerState ?? {}

function BarcodeScannerView({ onScan, onError }) {
  const instanceRef = useRef(null)
  const elementId   = useRef(`bsv-${Math.random().toString(36).slice(2)}`)

  // Safe stop: only calls stop() if the scanner is actually running,
  // and swallows every possible error so unmount can never crash the app.
  function safeStop(scanner) {
    try {
      const state = scanner?.getState?.()
      if (state === SCANNING || state === PAUSED) {
        scanner.stop().catch(() => {})
      }
    } catch {
      // getState() or stop() threw synchronously — ignore
    }
  }

  useEffect(() => {
    let scanner
    try {
      scanner = new Html5Qrcode(elementId.current)
      instanceRef.current = scanner
    } catch {
      onError(null)
      return
    }

    scanner
      .start(
        {
          facingMode: 'environment',
          width:      { ideal: 1920 },
          height:     { ideal: 1080 },
        },
        {
          fps:              10,
          qrbox:            (vw, vh) => {
            const m = Math.min(vw, vh)
            const w = Math.floor(m * 0.8)
            return { width: w, height: Math.floor(w * 0.6) }
          },
          formatsToSupport: BARCODE_FORMATS,
        },
        (code) => {
          // Successful decode — safe-stop then hand off the code
          safeStop(scanner)
          onScan(code)
        },
        () => {}, // per-frame decode failures are normal; ignore
      )
      .catch((err) => {
        const msg = String(err?.message ?? err).toLowerCase()
        onError(
          msg.includes('permission') || msg.includes('denied') || msg.includes('notallowed')
            ? 'Camera access denied — enter the barcode manually below.'
            : null, // no camera / other start error: hide scanner silently
        )
      })

    return () => {
      // Cleanup on every teardown path: unmount, mode switch, modal close
      safeStop(instanceRef.current)
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="rounded-xl overflow-hidden bg-[#1A2E45]/5 border border-[#E3DBC9]">
      <div id={elementId.current} className="w-full" />
    </div>
  )
}

// ─── tier 1: compact rows (earlier today) ─────────────────────────────────────

function CompactMealRow({ meal, onStateChange, onDelete }) {
  const [open,          setOpen]          = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)

  const dot = {
    done:    'bg-[#2A5A3E]',
    skipped: 'bg-[#A32D2D]',
    missed:  'bg-[#D4CDB9]',
  }[meal.state] ?? 'bg-[#D4CDB9]'

  const nameClass = meal.state === 'skipped'
    ? 'line-through text-[#A89F88]'
    : 'text-[#6B7B8C]'

  function close() { setOpen(false); setConfirmDelete(false) }

  return (
    <div className="mb-1">
      <div
        onClick={() => { setOpen(o => !o); setConfirmDelete(false) }}
        className="flex items-center gap-2.5 px-3 py-2 rounded-xl cursor-pointer
                   hover:bg-[#EFE8D8] transition-colors"
      >
        <div className={`w-2 h-2 rounded-full flex-shrink-0 ${dot}`} />
        <span className={`text-sm flex-1 truncate ${nameClass}`}>{meal.name}</span>
        <span className="text-xs text-[#A89F88]">{meal.calories} kcal</span>
      </div>

      {open && (
        <div className="flex items-center gap-2 px-3 pb-1">
          {confirmDelete ? (
            <>
              <span className="text-xs text-[#A32D2D] flex-1">Delete this meal?</span>
              <button
                onClick={() => { onDelete(meal.id); close() }}
                className="text-xs px-3 py-1 rounded-lg bg-[#A32D2D]/10 text-[#A32D2D]
                           hover:bg-[#A32D2D]/20 font-semibold transition-colors"
              >
                Delete
              </button>
              <button
                onClick={() => setConfirmDelete(false)}
                className="text-xs px-3 py-1 rounded-lg text-[#A89F88] hover:text-[#6B7B8C] transition-colors"
              >
                Cancel
              </button>
            </>
          ) : (
            <>
              <button
                onClick={() => { onStateChange(meal.id, 'upcoming'); close() }}
                className="text-xs px-3 py-1 rounded-lg border border-[#E3DBC9]
                           text-[#6B7B8C] hover:bg-[#EFE8D8] transition-colors"
              >
                ↩ Undo
              </button>
              <button
                onClick={() => setConfirmDelete(true)}
                className="text-xs px-3 py-1 rounded-lg text-[#A32D2D]/50
                           hover:text-[#A32D2D] transition-colors flex items-center gap-1"
              >
                <Trash2 size={11} strokeWidth={1.75} /> Delete
              </button>
              <button
                onClick={close}
                className="text-xs px-3 py-1 rounded-lg text-[#A89F88] hover:text-[#6B7B8C] transition-colors"
              >
                Cancel
              </button>
            </>
          )}
        </div>
      )}
    </div>
  )
}

// ─── tier 2: hero card (up next) ──────────────────────────────────────────────

function HeroMealCard({ meal, onStateChange, onDelete }) {
  const [confirmDelete, setConfirmDelete] = useState(false)
  const visibleTags = (meal.tags ?? []).filter(
    t => t.tag_type === 'primary' || t.tag_type === 'restriction'
  )

  return (
    <div className="bg-white rounded-2xl border border-[#E3DBC9] overflow-hidden">
      {/* Gradient image placeholder */}
      <div className="h-36 bg-gradient-to-br from-[#1A2E45] to-[#D4CDB9]
                      relative flex items-end p-3">
        <span className="text-[10px] font-bold text-white/70 uppercase tracking-wider
                         bg-white/15 px-2 py-0.5 rounded-full">
          Up next
        </span>
        <span className="ml-auto text-[10px] text-white/60 capitalize font-medium">
          {meal.meal_time}
        </span>
      </div>

      {/* Content */}
      <div className="p-4">
        <h3 className="text-lg font-bold text-[#1A2E45] leading-snug mb-0.5">
          {meal.name}
        </h3>
        <p className="text-sm text-[#6B7B8C] mb-3">{meal.calories} kcal</p>

        {visibleTags.length > 0 && (
          <div className="flex flex-wrap gap-1 mb-4">
            {visibleTags.map(tag => (
              <span
                key={tag.id}
                className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${TAG_CHIP[tag.tag_type]}`}
              >
                {tag.name}
              </span>
            ))}
          </div>
        )}

        <div className="flex gap-2">
          <button
            onClick={() => onStateChange(meal.id, 'done')}
            className="flex-1 py-2.5 rounded-xl bg-[#1A2E45] hover:bg-[#152639]
                       text-white text-sm font-semibold transition-colors"
          >
            Mark as eaten
          </button>
          <button
            onClick={() => onStateChange(meal.id, 'skipped')}
            className="flex-1 py-2.5 rounded-xl border border-[#E3DBC9]
                       text-[#6B7B8C] text-sm font-semibold transition-colors
                       hover:border-[#D4CDB9] hover:bg-[#EFE8D8]"
          >
            Skip
          </button>
        </div>

        {confirmDelete ? (
          <div className="flex items-center gap-2 mt-2">
            <span className="text-xs text-[#A32D2D] flex-1">Delete this meal?</span>
            <button
              onClick={() => onDelete(meal.id)}
              className="text-xs px-3 py-1 rounded-lg bg-[#A32D2D]/10 text-[#A32D2D]
                         hover:bg-[#A32D2D]/20 font-semibold transition-colors"
            >
              Delete
            </button>
            <button
              onClick={() => setConfirmDelete(false)}
              className="text-xs px-3 py-1 rounded-lg text-[#A89F88] hover:text-[#6B7B8C] transition-colors"
            >
              Cancel
            </button>
          </div>
        ) : (
          <button
            onClick={() => setConfirmDelete(true)}
            className="mt-2 flex items-center gap-1 text-xs text-[#A89F88]/60
                       hover:text-[#A32D2D]/60 transition-colors"
          >
            <Trash2 size={12} strokeWidth={1.75} /> Delete meal
          </button>
        )}
      </div>
    </div>
  )
}

// ─── tier 3: medium cards (later) ─────────────────────────────────────────────

function LaterMealCard({ meal, onStateChange, onDelete }) {
  const [open,          setOpen]          = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)

  function close() { setOpen(false); setConfirmDelete(false) }

  const visibleTags = (meal.tags ?? []).filter(
    t => t.tag_type === 'primary' || t.tag_type === 'restriction'
  )

  return (
    <div className="mb-2">
      <div
        onClick={() => setOpen(o => !o)}
        className="flex items-center gap-3 p-3 rounded-2xl border border-[#E3DBC9]
                   bg-white hover:border-[#D4CDB9] cursor-pointer transition-colors"
      >
        {/* Small gradient thumbnail */}
        <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-[#1A2E45] to-[#D4CDB9]
                        flex-shrink-0" />

        <div className="flex-1 min-w-0">
          <div className="text-sm font-semibold text-[#1A2E45] truncate">{meal.name}</div>
          <div className="text-xs text-[#A89F88] capitalize mt-0.5">{meal.meal_time}</div>
          {visibleTags.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-1.5">
              {visibleTags.map(tag => (
                <span
                  key={tag.id}
                  className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${TAG_CHIP[tag.tag_type]}`}
                >
                  {tag.name}
                </span>
              ))}
            </div>
          )}
        </div>

        <div className="text-xs text-[#6B7B8C] font-medium flex-shrink-0">
          {meal.calories} kcal
        </div>
      </div>

      {open && (
        <div className="mt-1 bg-[#F5EFE0] rounded-xl border border-[#E3DBC9] overflow-hidden">
          {confirmDelete ? (
            <div className="flex items-center gap-3 px-4 py-3">
              <span className="text-sm text-[#A32D2D] flex-1">Delete this meal?</span>
              <button
                onClick={() => { onDelete(meal.id); close() }}
                className="text-sm font-semibold text-[#A32D2D] px-3 py-1 rounded-lg
                           bg-[#A32D2D]/10 hover:bg-[#A32D2D]/20 transition-colors"
              >
                Delete
              </button>
              <button
                onClick={() => setConfirmDelete(false)}
                className="text-sm text-[#6B7B8C] hover:text-[#1A2E45] transition-colors"
              >
                Cancel
              </button>
            </div>
          ) : (
            <>
              <ActionRow
                icon="✓" iconColor="text-[#2A5A3E]"
                label="Mark as eaten" sub="Log it as done"
                onClick={() => { onStateChange(meal.id, 'done'); close() }}
              />
              <ActionRow
                icon="✕" iconColor="text-[#A32D2D]"
                label="Skip" sub={`${meal.calories} kcal redistributed`}
                onClick={() => { onStateChange(meal.id, 'skipped'); close() }}
              />
              <ActionRow
                icon={<Trash2 size={14} strokeWidth={1.75} />} iconColor="text-[#A89F88]"
                label="Delete" sub=""
                onClick={() => setConfirmDelete(true)}
              />
              <ActionRow
                icon="✕" iconColor="text-[#A89F88]"
                label="Cancel" sub=""
                onClick={close}
              />
            </>
          )}
        </div>
      )}
    </div>
  )
}

function ActionRow({ icon, iconColor, label, sub, onClick }) {
  return (
    <button
      onClick={onClick}
      className="w-full flex items-center gap-3 px-4 py-3 text-left
                 hover:bg-[#EFE8D8] transition-colors border-b border-[#E3DBC9]
                 last:border-b-0"
    >
      <span className={`text-base w-5 text-center ${iconColor}`}>{icon}</span>
      <div>
        <div className="text-sm font-semibold text-[#1A2E45]">{label}</div>
        {sub && <div className="text-xs text-[#6B7B8C]">{sub}</div>}
      </div>
    </button>
  )
}

function SectionLabel({ children }) {
  return (
    <p className="text-xs text-[#A89F88] uppercase tracking-wide font-semibold mb-2">
      {children}
    </p>
  )
}

// ─── shared tag picker ────────────────────────────────────────────────────────

function TagPicker({ allTags, selectedIds, onToggle }) {
  if (allTags.length === 0) return null
  return (
    <div className="space-y-3 pt-1 pb-1">
      {TAG_GROUPS.map(({ label, type }) => {
        const group = allTags.filter(t => t.tag_type === type)
        if (group.length === 0) return null
        return (
          <div key={type}>
            <p className="text-xs text-[#A89F88] uppercase tracking-wide font-semibold mb-1.5">
              {label}
            </p>
            <div className="flex flex-wrap gap-1.5">
              {group.map(tag => {
                const sel = selectedIds.has(tag.id)
                return (
                  <button
                    key={tag.id}
                    type="button"
                    onClick={() => onToggle(tag.id)}
                    className={`text-xs px-2.5 py-1 rounded-full font-medium transition-colors
                                ${sel
                                  ? 'bg-[#1A2E45] text-white'
                                  : 'border border-[#E3DBC9] text-[#6B7B8C] hover:border-[#D4CDB9] bg-transparent'}`}
                  >
                    {tag.name}
                  </button>
                )
              })}
            </div>
          </div>
        )
      })}
    </div>
  )
}

// ─── add-meal modal ───────────────────────────────────────────────────────────

function AddMealModal({ onClose, onAddMeal, onAddFromIngredients }) {
  // ── shared ────────────────────────────────────────────────────────────────
  const [mode,        setMode]        = useState('ingredients')
  const [saving,      setSaving]      = useState(false)
  const [error,       setError]       = useState(null)
  const [allTags,     setAllTags]     = useState([])
  const [selectedIds, setSelectedIds] = useState(new Set())

  // ── manual mode ───────────────────────────────────────────────────────────
  const [qForm,      setQForm]      = useState(EMPTY_FORM)
  const [calManual,  setCalManual]  = useState(false)  // true when user overrides auto-calc

  // ── ingredients mode ──────────────────────────────────────────────────────
  const [ingName,        setIngName]        = useState('')
  const [ingMealTime,    setIngMealTime]    = useState('breakfast')
  const [searchQuery,    setSearchQuery]    = useState('')
  const [searchResults,  setSearchResults]  = useState([])
  const [isSearching,    setIsSearching]    = useState(false)
  const [pendingFood,          setPendingFood]          = useState(null)
  const [pendingQty,           setPendingQty]           = useState('1')
  const [pendingPortion,       setPendingPortion]       = useState(0)
  const [ingredients,          setIngredients]          = useState([])
  const [showIngredientSearch, setShowIngredientSearch] = useState(false)

  // ── barcode mode ──────────────────────────────────────────────────────────
  const [barcodeInput,   setBarcodeInput]   = useState('')
  const [barcodeLoading, setBarcodeLoading] = useState(false)
  const [barcodeError,   setBarcodeError]   = useState(null)
  const [scannerActive,  setScannerActive]  = useState(false)
  const [cameraError,    setCameraError]    = useState(null)

  useEffect(() => {
    authFetch('/meals/tags')
      .then(r => r.json())
      .then(tags => setAllTags(tags))
      .catch(() => {})
  }, [])

  // debounced curated food search — only fires when there's no pendingFood
  useEffect(() => {
    const q = searchQuery.trim()
    if (!q || pendingFood) return
    const timer = setTimeout(() => {
      setIsSearching(true)
      authFetch(`/foods/curated/search?query=${encodeURIComponent(q)}`)
        .then(r => r.json())
        .then(data => setSearchResults(Array.isArray(data) ? data : []))
        .catch(() => setSearchResults([]))
        .finally(() => setIsSearching(false))
    }, 350)
    return () => clearTimeout(timer)
  }, [searchQuery, pendingFood])

  function toggleTag(id) {
    setSelectedIds(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  // ── ingredient search helpers ─────────────────────────────────────────────

  function selectSearchResult(food) {
    setSearchResults([])
    setSearchQuery(food.name)
    // Curated results include portions inline — no separate fetch needed
    const defaultIdx = food.portions.findIndex(p => p.is_default)
    setPendingFood(food)
    setPendingQty('1')
    setPendingPortion(defaultIdx >= 0 ? defaultIdx : 0)
  }

  function closeSearch() {
    setShowIngredientSearch(false)
    setPendingFood(null)
    setSearchQuery('')
    setSearchResults([])
  }

  async function lookupBarcode(codeOverride) {
    const code = (codeOverride !== undefined ? codeOverride : barcodeInput).trim()
    if (!code) return
    setBarcodeLoading(true)
    setBarcodeError(null)
    setPendingFood(null)
    try {
      const res = await authFetch(`/foods/barcode/${encodeURIComponent(code)}`)
      if (res.status === 404) {
        setBarcodeError('No product found for that barcode.')
        return
      }
      if (!res.ok) {
        setBarcodeError('Something went wrong. Please try again.')
        return
      }
      const food = await res.json()
      const defaultIdx = (food.portions ?? []).findIndex(p => p.is_default)
      setPendingFood(food)
      setPendingQty('1')
      setPendingPortion(defaultIdx >= 0 ? defaultIdx : 0)
    } catch {
      setBarcodeError('Could not reach the server.')
    } finally {
      setBarcodeLoading(false)
    }
  }

  function confirmAddIngredient() {
    if (!pendingFood) return
    const portion = pendingFood.portions[pendingPortion]
    setIngredients(prev => [...prev, {
      fdc_id:      pendingFood.fdc_id ?? null,
      food_id:     pendingFood.id     ?? null,
      description: pendingFood.name ?? pendingFood.description,
      per_100g: {
        calories:  pendingFood.calories,
        protein_g: pendingFood.protein_g,
        carbs_g:   pendingFood.carbs_g,
        fat_g:     pendingFood.fat_g,
      },
      quantity:    parseFloat(pendingQty) || 1,
      unit:        portion.label,
      gram_weight: portion.grams,
    }])
    setPendingFood(null)
    setPendingQty('1')
    setPendingPortion(0)
    if (mode === 'ingredients') {
      setShowIngredientSearch(false)
      setSearchQuery('')
      setSearchResults([])
    } else if (mode === 'barcode') {
      setBarcodeInput('')
      setBarcodeError(null)
    }
  }

  function removeIngredient(idx) {
    setIngredients(prev => prev.filter((_, i) => i !== idx))
  }

  function calcIngCals(ing) {
    if (!ing.per_100g?.calories) return 0
    return Math.round(ing.per_100g.calories * (ing.quantity * ing.gram_weight) / 100)
  }

  const totalCals    = Math.round(ingredients.reduce((s, i) => s + (i.per_100g?.calories  ?? 0) * (i.quantity * i.gram_weight) / 100, 0))
  const totalProtein = Math.round(ingredients.reduce((s, i) => s + (i.per_100g?.protein_g ?? 0) * (i.quantity * i.gram_weight) / 100, 0) * 10) / 10
  const totalCarbs   = Math.round(ingredients.reduce((s, i) => s + (i.per_100g?.carbs_g   ?? 0) * (i.quantity * i.gram_weight) / 100, 0) * 10) / 10
  const totalFat     = Math.round(ingredients.reduce((s, i) => s + (i.per_100g?.fat_g     ?? 0) * (i.quantity * i.gram_weight) / 100, 0) * 10) / 10

  // ── submit handlers ───────────────────────────────────────────────────────

  async function handleManualSubmit(e) {
    e.preventDefault()
    setError(null)
    setSaving(true)
    try {
      await onAddMeal({
        name:      qForm.name.trim(),
        calories:  parseInt(qForm.calories, 10) || 0,
        meal_time: qForm.meal_time,
        tag_ids:   [...selectedIds],
        protein_g: qForm.protein !== '' ? parseFloat(qForm.protein) : null,
        carbs_g:   qForm.carbs   !== '' ? parseFloat(qForm.carbs)   : null,
        fat_g:     qForm.fat     !== '' ? parseFloat(qForm.fat)     : null,
      })
      onClose()
    } catch (err) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  async function handleIngredientsSubmit(e) {
    e.preventDefault()
    if (ingredients.length === 0) { setError('Add at least one ingredient'); return }
    setError(null)
    setSaving(true)
    try {
      await onAddFromIngredients({
        name:        ingName.trim(),
        meal_time:   ingMealTime,
        tag_ids:     [...selectedIds],
        ingredients: ingredients.map(ing => ({
          fdc_id:      ing.fdc_id,
          description: ing.description,
          per_100g:    ing.per_100g,
          quantity:    ing.quantity,
          unit:        ing.unit,
          gram_weight: ing.gram_weight,
        })),
      })
      onClose()
    } catch (err) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  const canSubmit = mode === 'manual'
    ? (!!qForm.name.trim() && !!qForm.calories)
    : (!!ingName.trim() && ingredients.length > 0)

  const inputClass = `w-full bg-[#F5EFE0] border border-[#E3DBC9] rounded-xl px-3 py-2.5
                      text-sm text-[#1A2E45] placeholder-[#A89F88] focus:outline-none
                      focus:border-[#1A2E45]`

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center pb-16"
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className="absolute inset-0 bg-[#1A2E45]/30" />

      <div className="relative w-full max-w-md bg-white rounded-t-3xl
                      shadow-xl border-t border-[#E3DBC9]
                      flex flex-col max-h-[85vh]">

        {/* Fixed header */}
        <div className="flex items-center justify-between px-6 pt-6 pb-3 flex-shrink-0">
          <h2 className="text-base font-bold text-[#1A2E45]">Add meal</h2>
          <button
            onClick={onClose}
            className="w-7 h-7 flex items-center justify-center rounded-full
                       bg-[#EFE8D8] text-[#6B7B8C] hover:bg-[#E3DBC9] transition-colors
                       text-sm font-semibold"
          >
            ✕
          </button>
        </div>

        {/* Mode toggle */}
        <div className="px-6 pb-3 flex-shrink-0">
          <div className="flex bg-[#F5EFE0] rounded-xl p-0.5">
            {[
              { mode: 'ingredients', label: 'Search', Icon: Search  },
              { mode: 'barcode',     label: 'Scan',   Icon: Barcode },
              { mode: 'manual',      label: 'Custom', Icon: Pencil  },
            ].map(({ mode: m, label, Icon }) => (
              <button
                key={m}
                type="button"
                onClick={() => {
                  setMode(m)
                  setError(null)
                  setPendingFood(null)
                  setBarcodeInput('')
                  setBarcodeError(null)
                  setScannerActive(false)
                  setCameraError(null)
                  setCalManual(false)
                }}
                className={`flex-1 py-1.5 rounded-[10px] transition-colors flex flex-col items-center gap-0.5
                            ${mode === m
                              ? 'bg-white text-[#1A2E45] shadow-sm'
                              : 'text-[#A89F88] hover:text-[#6B7B8C]'}`}
              >
                <Icon size={20} strokeWidth={1.75} />
                <span className="text-[11px] font-semibold">{label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* ── Barcode mode body ── */}
        {mode === 'barcode' && (
          <form
            id="meal-form"
            onSubmit={handleIngredientsSubmit}
            className="flex-1 overflow-y-auto px-6 space-y-4 pb-2"
          >
            {/* Meal name + time (shared with ingredients mode) */}
            <div className="flex gap-3">
              <div className="flex-[2]">
                <label className="block text-xs text-[#6B7B8C] uppercase tracking-wide font-semibold mb-1.5">
                  Meal name
                </label>
                <input
                  type="text"
                  required
                  value={ingName}
                  onChange={e => setIngName(e.target.value)}
                  placeholder="e.g. Protein bar + coffee"
                  className={inputClass}
                />
              </div>
              <div className="flex-1">
                <label className="block text-xs text-[#6B7B8C] uppercase tracking-wide font-semibold mb-1.5">
                  Time
                </label>
                <select
                  value={ingMealTime}
                  onChange={e => setIngMealTime(e.target.value)}
                  className={`${inputClass} capitalize`}
                >
                  {MEAL_TIMES.map(t => (
                    <option key={t} value={t} className="capitalize">{t}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Ingredient list — shared with ingredients mode */}
            {ingredients.length > 0 && (
              <div className="space-y-1.5">
                {ingredients.map((ing, idx) => (
                  <div
                    key={idx}
                    className="flex items-center gap-2 bg-[#F5EFE0] rounded-xl
                               px-3 py-2.5 border border-[#E3DBC9]"
                  >
                    <span className="text-sm text-[#1A2E45] flex-1 truncate">
                      {ing.quantity} {ing.unit} · {ing.description}
                    </span>
                    <span className="text-xs text-[#6B7B8C] font-medium flex-shrink-0">
                      {calcIngCals(ing)} cal
                    </span>
                    <button
                      type="button"
                      onClick={() => removeIngredient(idx)}
                      className="w-5 h-5 flex items-center justify-center rounded-full
                                 bg-[#E3DBC9] text-[#A89F88] hover:bg-[#D4CDB9]
                                 text-[10px] font-bold flex-shrink-0 transition-colors"
                    >
                      ✕
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Running totals */}
            {ingredients.length > 0 && (
              <div className="bg-[#1A2E45]/5 rounded-xl px-3 py-2.5 -mt-1">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-[#1A2E45]">Total</span>
                  <span className="text-sm font-bold text-[#1A2E45]">{totalCals} kcal</span>
                </div>
                <p className="text-xs text-[#6B7B8C] mt-0.5">
                  {totalProtein}g protein · {totalCarbs}g carbs · {totalFat}g fat
                </p>
              </div>
            )}

            {/* Barcode lookup OR portion picker */}
            {!pendingFood ? (
              <div className="space-y-3">
                {/* Camera scanner */}
                {scannerActive ? (
                  <>
                    <BarcodeScannerView
                      onScan={(code) => {
                        setScannerActive(false)
                        setBarcodeInput(code)
                        lookupBarcode(code)
                      }}
                      onError={(msg) => {
                        setScannerActive(false)
                        if (msg) setCameraError(msg)
                      }}
                    />
                    <button
                      type="button"
                      onClick={() => setScannerActive(false)}
                      className="text-xs text-[#6B7B8C] hover:text-[#1A2E45] transition-colors"
                    >
                      Stop camera
                    </button>
                  </>
                ) : (
                  <button
                    type="button"
                    onClick={() => { setScannerActive(true); setCameraError(null); setBarcodeError(null) }}
                    className="w-full py-2.5 rounded-xl border border-[#1A2E45]/30 text-[#1A2E45]
                               text-sm font-semibold flex items-center justify-center gap-2
                               hover:border-[#1A2E45]/60 hover:bg-[#1A2E45]/5 transition-colors"
                  >
                    <Camera size={17} strokeWidth={1.75} /> Scan barcode
                  </button>
                )}

                {cameraError && (
                  <p className="text-xs text-[#B07B2C]">{cameraError}</p>
                )}

                {/* Manual input — always visible as fallback */}
                <div>
                  <p className="text-xs text-[#A89F88] mb-1.5">
                    {scannerActive ? 'Or enter the barcode manually' : 'Or enter the barcode manually'}
                  </p>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={barcodeInput}
                      onChange={e => { setBarcodeInput(e.target.value); setBarcodeError(null) }}
                      onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); lookupBarcode() } }}
                      placeholder="e.g. 012345678905"
                      className={`${inputClass} flex-1`}
                    />
                    <button
                      type="button"
                      onClick={() => lookupBarcode()}
                      disabled={!barcodeInput.trim() || barcodeLoading}
                      className="px-4 py-2.5 rounded-xl bg-[#1A2E45] hover:bg-[#152639]
                                 disabled:opacity-40 text-white text-sm font-semibold
                                 transition-colors flex-shrink-0"
                    >
                      {barcodeLoading ? '…' : 'Look up'}
                    </button>
                  </div>
                </div>

                {barcodeError && (
                  <p className="text-sm text-[#A32D2D] bg-[#A32D2D]/10 rounded-xl px-3 py-2">
                    {barcodeError}
                  </p>
                )}
              </div>
            ) : (
              <div className="bg-[#F5EFE0] rounded-2xl border border-[#E3DBC9] p-4 space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-[10px] text-[#A89F88] font-semibold uppercase tracking-wide">
                      Adding
                    </p>
                    <p className="text-sm font-semibold text-[#1A2E45] mt-0.5 leading-snug">
                      {pendingFood.name ?? pendingFood.description}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => { setPendingFood(null); setBarcodeInput('') }}
                    className="text-[#A89F88] hover:text-[#6B7B8C] text-xs flex-shrink-0 mt-0.5"
                  >
                    ✕
                  </button>
                </div>

                <div className="flex gap-2">
                  <div className="w-20 flex-shrink-0">
                    <label className="block text-xs text-[#6B7B8C] font-semibold mb-1">Qty</label>
                    <input
                      type="number"
                      min="0.1"
                      step="0.1"
                      value={pendingQty}
                      onChange={e => setPendingQty(e.target.value)}
                      className={inputClass}
                    />
                  </div>
                  <div className="flex-1">
                    <label className="block text-xs text-[#6B7B8C] font-semibold mb-1">Portion</label>
                    <select
                      value={pendingPortion}
                      onChange={e => setPendingPortion(Number(e.target.value))}
                      className={inputClass}
                    >
                      {(pendingFood.portions ?? []).map((p, i) => (
                        <option key={i} value={i}>{p.label}</option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Live calorie preview */}
                {(() => {
                  const portion = (pendingFood.portions ?? [])[pendingPortion]
                  if (!portion) return null
                  const grams = (parseFloat(pendingQty) || 0) * portion.grams
                  const cals  = pendingFood.calories != null
                    ? Math.round(pendingFood.calories * grams / 100) : null
                  return cals != null ? (
                    <p className="text-xs text-[#6B7B8C]">≈ {Math.round(grams)}g · {cals} kcal</p>
                  ) : null
                })()}

                <button
                  type="button"
                  onClick={confirmAddIngredient}
                  className="w-full py-2 rounded-xl bg-[#1A2E45] hover:bg-[#152639]
                             text-white text-sm font-semibold transition-colors"
                >
                  + Add ingredient
                </button>
              </div>
            )}

            <TagPicker allTags={allTags} selectedIds={selectedIds} onToggle={toggleTag} />

            {error && (
              <p className="text-sm text-[#A32D2D] bg-[#A32D2D]/10 rounded-xl px-3 py-2">
                {error}
              </p>
            )}
          </form>
        )}

        {/* ── Manual mode body ── */}
        {mode === 'manual' && (
          <form
            id="meal-form"
            onSubmit={handleManualSubmit}
            className="flex-1 overflow-y-auto px-6 space-y-4 pb-2"
          >
            <div>
              <label className="block text-xs text-[#6B7B8C] uppercase tracking-wide font-semibold mb-1.5">
                Meal name
              </label>
              <input
                type="text"
                required
                autoFocus
                value={qForm.name}
                onChange={e => setQForm(p => ({ ...p, name: e.target.value }))}
                placeholder="e.g. Chipotle burrito bowl"
                className={inputClass}
              />
            </div>

            {/* Macro inputs */}
            <div className="flex gap-2">
              {[
                { label: 'Protein (g)', key: 'protein', ph: '40' },
                { label: 'Carbs (g)',   key: 'carbs',   ph: '60' },
                { label: 'Fat (g)',     key: 'fat',     ph: '20' },
              ].map(({ label, key, ph }) => (
                <div key={key} className="flex-1">
                  <label className="block text-xs text-[#6B7B8C] uppercase tracking-wide font-semibold mb-1.5">
                    {label}
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="0.1"
                    value={qForm[key]}
                    onChange={e => {
                      const next = { ...qForm, [key]: e.target.value }
                      if (!calManual) {
                        const p = parseFloat(key === 'protein' ? e.target.value : qForm.protein) || 0
                        const c = parseFloat(key === 'carbs'   ? e.target.value : qForm.carbs)   || 0
                        const f = parseFloat(key === 'fat'     ? e.target.value : qForm.fat)     || 0
                        const auto = Math.round(p * 4 + c * 4 + f * 9)
                        next.calories = auto > 0 ? String(auto) : ''
                      }
                      setQForm(next)
                    }}
                    placeholder={ph}
                    className={inputClass}
                  />
                </div>
              ))}
            </div>

            {/* Calories (auto-calc, overridable) + meal time */}
            <div className="flex gap-3">
              <div className="flex-1">
                <label className="block text-xs text-[#6B7B8C] uppercase tracking-wide font-semibold mb-1.5">
                  Calories (kcal)
                </label>
                <input
                  type="number"
                  required
                  min="0"
                  value={qForm.calories}
                  onChange={e => {
                    setCalManual(true)
                    setQForm(p => ({ ...p, calories: e.target.value }))
                  }}
                  placeholder="auto"
                  className={inputClass}
                />
              </div>
              <div className="flex-1">
                <label className="block text-xs text-[#6B7B8C] uppercase tracking-wide font-semibold mb-1.5">
                  Meal time
                </label>
                <select
                  value={qForm.meal_time}
                  onChange={e => setQForm(p => ({ ...p, meal_time: e.target.value }))}
                  className={`${inputClass} capitalize`}
                >
                  {MEAL_TIMES.map(t => (
                    <option key={t} value={t} className="capitalize">{t}</option>
                  ))}
                </select>
              </div>
            </div>

            <TagPicker allTags={allTags} selectedIds={selectedIds} onToggle={toggleTag} />

            {error && (
              <p className="text-sm text-[#A32D2D] bg-[#A32D2D]/10 rounded-xl px-3 py-2">
                {error}
              </p>
            )}
          </form>
        )}

        {/* ── Ingredients mode body ── */}
        {mode === 'ingredients' && (
          <form
            id="meal-form"
            onSubmit={handleIngredientsSubmit}
            className="flex-1 overflow-y-auto px-6 space-y-4 pb-2"
          >
            {/* Meal name + time */}
            <div className="flex gap-3">
              <div className="flex-[2]">
                <label className="block text-xs text-[#6B7B8C] uppercase tracking-wide font-semibold mb-1.5">
                  Meal name
                </label>
                <input
                  type="text"
                  required
                  value={ingName}
                  onChange={e => setIngName(e.target.value)}
                  placeholder="e.g. Scrambled eggs"
                  className={inputClass}
                />
              </div>
              <div className="flex-1">
                <label className="block text-xs text-[#6B7B8C] uppercase tracking-wide font-semibold mb-1.5">
                  Time
                </label>
                <select
                  value={ingMealTime}
                  onChange={e => setIngMealTime(e.target.value)}
                  className={`${inputClass} capitalize`}
                >
                  {MEAL_TIMES.map(t => (
                    <option key={t} value={t} className="capitalize">{t}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Ingredient list — compact single-line rows */}
            {ingredients.length > 0 && (
              <div className="space-y-1.5">
                {ingredients.map((ing, idx) => (
                  <div
                    key={idx}
                    className="flex items-center gap-2 bg-[#F5EFE0] rounded-xl
                               px-3 py-2.5 border border-[#E3DBC9]"
                  >
                    <span className="text-sm text-[#1A2E45] flex-1 truncate">
                      {ing.quantity} {ing.unit} · {ing.description}
                    </span>
                    <span className="text-xs text-[#6B7B8C] font-medium flex-shrink-0">
                      {calcIngCals(ing)} cal
                    </span>
                    <button
                      type="button"
                      onClick={() => removeIngredient(idx)}
                      className="w-5 h-5 flex items-center justify-center rounded-full
                                 bg-[#E3DBC9] text-[#A89F88] hover:bg-[#D4CDB9]
                                 text-[10px] font-bold flex-shrink-0 transition-colors"
                    >
                      ✕
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Running totals — shown once there's at least one ingredient */}
            {ingredients.length > 0 && (
              <div className="bg-[#1A2E45]/5 rounded-xl px-3 py-2.5 -mt-1">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-[#1A2E45]">Total</span>
                  <span className="text-sm font-bold text-[#1A2E45]">{totalCals} kcal</span>
                </div>
                <p className="text-xs text-[#6B7B8C] mt-0.5">
                  {totalProtein}g protein · {totalCarbs}g carbs · {totalFat}g fat
                </p>
              </div>
            )}

            {/* Dashed add-ingredient button — collapsed state */}
            {!showIngredientSearch && (
              <button
                type="button"
                onClick={() => setShowIngredientSearch(true)}
                className="w-full py-2.5 rounded-xl border-2 border-dashed border-[#1A2E45]/30
                           text-[#1A2E45] text-sm font-semibold flex items-center justify-center
                           gap-1.5 hover:border-[#1A2E45]/60 hover:bg-[#1A2E45]/5 transition-colors"
              >
                <span className="text-base leading-none">+</span>
                {ingredients.length === 0 ? 'Add an ingredient' : 'Add another ingredient'}
              </button>
            )}

            {/* Search panel — expanded when showIngredientSearch is true */}
            {showIngredientSearch && (
              <div className="space-y-3">
                {/* Panel header */}
                <div className="flex items-center justify-between">
                  <p className="text-xs text-[#6B7B8C] uppercase tracking-wide font-semibold">
                    Search ingredient
                  </p>
                  <button
                    type="button"
                    onClick={closeSearch}
                    className="text-xs text-[#A89F88] hover:text-[#6B7B8C] transition-colors"
                  >
                    Cancel
                  </button>
                </div>

                {/* Search input */}
                <div className="relative">
                  <input
                    type="text"
                    autoFocus
                    value={searchQuery}
                    onChange={e => {
                      setSearchQuery(e.target.value)
                      if (pendingFood) { setPendingFood(null); setSearchResults([]) }
                    }}
                    placeholder="e.g. eggs, chicken breast…"
                    className={inputClass}
                  />
                  {isSearching && (
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[#A89F88] text-xs">
                      …
                    </span>
                  )}
                </div>

                {/* Search results */}
                {searchResults.length > 0 && !pendingFood && (
                  <div className="bg-[#F5EFE0] rounded-xl border border-[#E3DBC9]
                                  overflow-hidden max-h-44 overflow-y-auto">
                    {searchResults.map(food => (
                      <button
                        key={food.id}
                        type="button"
                        onClick={() => selectSearchResult(food)}
                        className="w-full flex items-center justify-between px-3 py-2.5
                                   text-left hover:bg-[#EFE8D8] transition-colors
                                   border-b border-[#E3DBC9] last:border-b-0"
                      >
                        <span className="text-sm text-[#1A2E45] truncate pr-2 flex-1">
                          {food.name}
                        </span>
                        <span className="text-xs text-[#A89F88] flex-shrink-0">
                          {food.calories != null ? `${Math.round(food.calories)} kcal` : '—'}
                        </span>
                      </button>
                    ))}
                  </div>
                )}

                {/* Portion picker */}
                {pendingFood && (
                  <div className="bg-[#F5EFE0] rounded-2xl border border-[#E3DBC9] p-4 space-y-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="text-[10px] text-[#A89F88] font-semibold uppercase tracking-wide">
                          Adding
                        </p>
                        <p className="text-sm font-semibold text-[#1A2E45] mt-0.5 leading-snug">
                          {pendingFood.name}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => { setPendingFood(null); setSearchQuery(''); setSearchResults([]) }}
                        className="text-[#A89F88] hover:text-[#6B7B8C] text-xs flex-shrink-0 mt-0.5"
                      >
                        ✕
                      </button>
                    </div>

                    <div className="flex gap-2">
                      <div className="w-20 flex-shrink-0">
                        <label className="block text-xs text-[#6B7B8C] font-semibold mb-1">Qty</label>
                        <input
                          type="number"
                          min="0.1"
                          step="0.1"
                          value={pendingQty}
                          onChange={e => setPendingQty(e.target.value)}
                          className={inputClass}
                        />
                      </div>
                      <div className="flex-1">
                        <label className="block text-xs text-[#6B7B8C] font-semibold mb-1">Portion</label>
                        <select
                          value={pendingPortion}
                          onChange={e => setPendingPortion(Number(e.target.value))}
                          className={inputClass}
                        >
                          {pendingFood.portions.map((p, i) => (
                            <option key={i} value={i}>{p.label}</option>
                          ))}
                        </select>
                      </div>
                    </div>

                    {/* Live calorie preview */}
                    {(() => {
                      const portion = pendingFood.portions[pendingPortion]
                      const grams   = (parseFloat(pendingQty) || 0) * portion.grams
                      const cals    = pendingFood.calories != null
                        ? Math.round(pendingFood.calories * grams / 100) : null
                      return cals != null ? (
                        <p className="text-xs text-[#6B7B8C]">
                          ≈ {Math.round(grams)}g · {cals} kcal
                        </p>
                      ) : null
                    })()}

                    <button
                      type="button"
                      onClick={confirmAddIngredient}
                      className="w-full py-2 rounded-xl bg-[#1A2E45] hover:bg-[#152639]
                                 text-white text-sm font-semibold transition-colors"
                    >
                      + Add ingredient
                    </button>
                  </div>
                )}
              </div>
            )}

            <TagPicker allTags={allTags} selectedIds={selectedIds} onToggle={toggleTag} />

            {error && (
              <p className="text-sm text-[#A32D2D] bg-[#A32D2D]/10 rounded-xl px-3 py-2">
                {error}
              </p>
            )}
          </form>
        )}

        {/* Fixed footer */}
        <div className="px-6 pt-3 pb-6 flex-shrink-0 border-t border-[#E3DBC9]">
          <button
            type="submit"
            form="meal-form"
            disabled={saving || !canSubmit}
            className="w-full py-3 rounded-xl bg-[#1A2E45] hover:bg-[#152639]
                       disabled:opacity-40 text-white text-sm font-semibold transition-colors"
          >
            {saving ? 'Adding…' : 'Add meal'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── main page ────────────────────────────────────────────────────────────────

export default function Meals() {
  const { meals, loading, error, updateMealState, deleteMeal, addMeal, addMealFromIngredients, eaten, planned } = useMeals()
  const { target, loading: calLoading } = useCalories()
  const [showModal, setShowModal] = useState(false)

  if (loading) return (
    <div className="p-4 pb-24 text-[#6B7B8C] text-sm">Loading meals...</div>
  )

  if (error) return (
    <div className="p-4 pb-24 text-[#A32D2D] text-sm">
      Couldn't load meals: {error}
    </div>
  )

  // Partition into tiers
  const earlierMeals = meals.filter(m => m.state !== 'upcoming')
  const upcomingMeals = meals
    .filter(m => m.state === 'upcoming')
    .slice()
    .sort((a, b) => MEAL_TIME_ORDER.indexOf(a.meal_time) - MEAL_TIME_ORDER.indexOf(b.meal_time))
  const heroMeal   = upcomingMeals[0] ?? null
  const laterMeals = upcomingMeals.slice(1)

  const hasAnyMeals = meals.length > 0

  return (
    <div className="p-4 pb-24">
      <div className="mb-4">
        <h1 className="text-xl font-bold text-[#1A2E45]">Today's Meals</h1>
        <p className="text-xs text-[#6B7B8C] mt-0.5">
          Tap a meal to mark done or skip
        </p>
      </div>

      <div className="mb-4">
        {calLoading
          ? <CalorieBar eaten={0} target={null} />
          : <CalorieBar eaten={eaten ?? 0} planned={planned} target={target} />
        }
      </div>

      {!hasAnyMeals ? (
        <div className="bg-white rounded-2xl p-6 border border-[#E3DBC9] text-center mb-4">
          <p className="text-[#6B7B8C] text-sm">No meals planned for today.</p>
          <p className="text-[#A89F88] text-xs mt-1">
            Tap the button below to add your first meal.
          </p>
        </div>
      ) : (
        <>
          {/* Tier 1 — Earlier today */}
          {earlierMeals.length > 0 && (
            <div className="mb-5">
              <SectionLabel>Earlier today</SectionLabel>
              {earlierMeals.map(meal => (
                <CompactMealRow key={meal.id} meal={meal} onStateChange={updateMealState} onDelete={deleteMeal} />
              ))}
            </div>
          )}

          {/* Tier 2 — Up next (hero) */}
          {heroMeal && (
            <div className="mb-5">
              <SectionLabel>Up next</SectionLabel>
              <HeroMealCard meal={heroMeal} onStateChange={updateMealState} onDelete={deleteMeal} />
            </div>
          )}

          {/* Tier 3 — Later */}
          {laterMeals.length > 0 && (
            <div className="mb-5">
              <SectionLabel>Later</SectionLabel>
              {laterMeals.map(meal => (
                <LaterMealCard key={meal.id} meal={meal} onStateChange={updateMealState} onDelete={deleteMeal} />
              ))}
            </div>
          )}
        </>
      )}

      <button
        onClick={() => setShowModal(true)}
        className="w-full py-3 rounded-2xl bg-[#1A2E45] hover:bg-[#152639]
                   text-white text-sm font-semibold transition-colors
                   flex items-center justify-center gap-2"
      >
        <span className="text-lg leading-none">+</span>
        Add meal
      </button>

      {showModal && (
        <AddMealModal
          onClose={() => setShowModal(false)}
          onAddMeal={addMeal}
          onAddFromIngredients={addMealFromIngredients}
        />
      )}
    </div>
  )
}
