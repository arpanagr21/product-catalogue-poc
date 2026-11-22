import { Search } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { useNavigate, useSearchParams } from 'react-router'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

/** Searches when the button is clicked (or Enter pressed), per the acceptance criteria. */
export function SearchBar() {
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const [term, setTerm] = useState(params.get('q') ?? '')

  function onSubmit(event: FormEvent) {
    event.preventDefault()
    const q = term.trim()
    if (q) navigate(`/search?q=${encodeURIComponent(q)}`)
  }

  return (
    <form role="search" onSubmit={onSubmit} className="flex w-full max-w-md gap-2">
      <Input
        type="search"
        aria-label="Search products"
        placeholder="Search products…"
        value={term}
        maxLength={100}
        onChange={(event) => setTerm(event.target.value)}
      />
      <Button type="submit">
        <Search />
        Search
      </Button>
    </form>
  )
}
