import {defineField} from 'sanity'

export function shortTitleField(options: {group?: string} = {}) {
  return defineField({
    name: 'shortTitle',
    title: 'Short title',
    description: 'Optional shorter label used in navigation. Falls back to title when empty.',
    type: 'string',
    ...options,
  })
}
