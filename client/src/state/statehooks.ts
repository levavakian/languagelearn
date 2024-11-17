import { useAtomValue, useSetAtom } from 'jotai'
import { selectAtom } from 'jotai/utils'
import { useMemo, useCallback } from 'react'
import { WritableAtom } from 'jotai'

export function createAtomHooks<T, Update, Result>(atom: WritableAtom<T, Update[], Result>) {
  function useAtomGetter<Selected>(
    selector: (state: T) => Selected
  ) {
    const selectorAtom = useMemo(
        () => selectAtom(atom, selector),
        [selector]
    )
    return useAtomValue(selectorAtom)
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