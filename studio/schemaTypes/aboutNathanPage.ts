import {defineType, defineField} from 'sanity'
import {shortTitleField} from './shortTitleField'
import {portableBodyField} from './portableBodyField'

export default defineType({
  name: 'aboutNathanPage',
  title: 'About Nathan Page',
  type: 'document',
  fields: [
    defineField({name: 'title', title: 'Title', type: 'string'}),
    shortTitleField(),
    defineField({name: 'intro', title: 'Intro', type: 'text', rows: 3}),
    defineField({
      name: 'secondaryNavItems',
      title: 'Secondary Navigation Items',
      description: 'Optional links shown in the section subnavigation bar.',
      type: 'array',
      of: [{type: 'actionLink'}],
    }),
    portableBodyField(),
  ],
})
