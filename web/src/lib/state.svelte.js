// App state that persists in localStorage, and the spell itself.
import { load, save } from './storage.js'
import { itemsById, byIntention } from './data.js'

/** A $state value saved under `key` whenever it changes. `clean` filters what was stored. */
export function persisted(key, fallback, clean = (v) => v) {
  let value = $state(clean(load(key, fallback)))
  return {
    get value() {
      return value
    },
    set value(next) {
      value = next
      save(key, next)
    },
  }
}

const without = (list, x) => list.filter((y) => y !== x)
const withAdded = (list, x) => (list.includes(x) ? list : [...list, x])

/** The spell: a name, its intentions, and its component item ids. */
class Spell {
  #ids = persisted('spellweb.spell', [], (ids) => ids.filter((id) => itemsById.has(id)))
  #intentions = persisted('spellweb.spellIntentions', [], (list) => list.filter((i) => byIntention.has(i)))
  #name = persisted('spellweb.spellName', '')

  get ids() {
    return this.#ids.value
  }
  get items() {
    return this.#ids.value.map((id) => itemsById.get(id))
  }
  get intentions() {
    return this.#intentions.value
  }
  get name() {
    return this.#name.value
  }
  set name(v) {
    this.#name.value = v
  }

  has = (id) => this.#ids.value.includes(id)
  add = (id) => (this.#ids.value = withAdded(this.#ids.value, id))
  remove = (id) => (this.#ids.value = without(this.#ids.value, id))
  toggle = (id) => (this.has(id) ? this.remove(id) : this.add(id))
  clear = () => (this.#ids.value = [])
  addIntention = (name) => (this.#intentions.value = withAdded(this.#intentions.value, name))
  removeIntention = (name) => (this.#intentions.value = without(this.#intentions.value, name))
}

export const spell = new Spell()
