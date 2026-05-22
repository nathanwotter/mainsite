import {defineField, defineType} from 'sanity'

export default defineType({
  name: 'pageFile',
  title: 'Downloadable file',
  type: 'object',
  fields: [
    defineField({
      name: 'file',
      title: 'File',
      type: 'file',
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'title',
      title: 'Title',
      description: 'Visible link text for the download.',
      type: 'string',
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'caption',
      title: 'Caption',
      type: 'string',
    }),
  ],
  preview: {
    select: {
      title: 'title',
      filename: 'file.asset.originalFilename',
    },
    prepare({title, filename}) {
      return {
        title: title || filename || 'Downloadable file',
        subtitle: filename,
      }
    },
  },
})
