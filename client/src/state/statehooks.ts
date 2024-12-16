import { useAtomValue, useSetAtom } from 'jotai'
import { selectAtom } from 'jotai/utils'
import { useCallback } from 'react'
import { WritableAtom } from 'jotai'

export function createAtomHooks<T, Update, Result>(atom: WritableAtom<T, Update[], Result>, selectorMap: Record<string, any>) {
  function useAtomGetter<Selected>(
    selector: (state: T) => Selected,
    ...additionalInputs: any[]
  ) {
    const selectorKey = [
      selector.toString(),
      ...additionalInputs.map(input => String(input))
    ].join('::')

    if (!(selectorKey in selectorMap)) {
      selectorMap[selectorKey] = selectAtom(atom, selector)
    }

    return useAtomValue(selectorMap[selectorKey]) as Selected
  }

  function useSetAtomValue() {
    const setState = useSetAtom(atom)
    
    return useCallback((update: Update) => {
      setState(update)
    }, [setState])
  }

  return {
    useAtomGetter,
    useSetAtomValue
  }
}