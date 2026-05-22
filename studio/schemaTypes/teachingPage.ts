// studio/schemaTypes/teachingPage.ts
import {defineType, defineField} from 'sanity'
import {shortTitleField} from './shortTitleField'
import {portableBodyField} from './portableBodyField'

export default defineType({
  name: 'teachingPage',
  title: 'Teaching Page',
  type: 'document',
  fields: [
    defineField({
      name: 'title',
      title: 'Title',
      type: 'string',
    }),
    shortTitleField(),
    defineField({
      name: 'intro',
      title: 'Intro',
      type: 'text',
      rows: 3,
    }),
    portableBodyField(),
  ],
})
