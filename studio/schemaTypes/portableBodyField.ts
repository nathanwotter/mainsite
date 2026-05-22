import {defineField} from 'sanity'

export function portableBodyField() {
  return defineField({
    name: 'body',
    title: 'Body',
    type: 'array',
    of: [{type: 'block'}, {type: 'pageImage'}, {type: 'pageFile'}],
  })
}
