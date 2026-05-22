import {defineField, defineType} from 'sanity'
import {shortTitleField} from './shortTitleField'
import {portableBodyField} from './portableBodyField'

export default defineType({
  name: 'aboutNathanSubpage',
  title: 'About Nathan Subpage',
  type: 'document',
  fields: [
    defineField({
      name: 'title',
      title: 'Title',
      type: 'string',
      validation: (Rule) => Rule.required(),
    }),
    shortTitleField(),
    defineField({
      name: 'slug',
      title: 'Slug',
      type: 'slug',
      options: {
        source: 'title',
        maxLength: 96,
      },
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'menuTitle',
      title: 'Menu Title',
      type: 'string',
    }),
    defineField({
      name: 'intro',
      title: 'Intro',
      type: 'text',
      rows: 3,
    }),
    portableBodyField(),
    defineField({
      name: 'order',
      title: 'Order',
      type: 'number',
    }),
  ],
})
