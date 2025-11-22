import {defineType, defineField} from 'sanity'

export default defineType({
  name: 'recreationFuturesPage',
  title: 'Recreation Futures Lab Page',
  type: 'document',
  fields: [
    defineField({name: 'title', title: 'Title', type: 'string'}),
    defineField({name: 'intro', title: 'Intro', type: 'text', rows: 3}),
    defineField({
      name: 'body',
      title: 'Body',
      type: 'array',
      of: [{type: 'block'}],
    }),
  ],
})