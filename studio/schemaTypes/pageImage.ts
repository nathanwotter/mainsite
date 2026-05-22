import {defineField, defineType} from 'sanity'

export default defineType({
  name: 'pageImage',
  title: 'Image',
  type: 'object',
  fields: [
    defineField({
      name: 'image',
      title: 'Image',
      type: 'image',
      options: {
        hotspot: true,
      },
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'alt',
      title: 'Alt text',
      description: 'Describe the image for visitors using screen readers.',
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
      title: 'caption',
      alt: 'alt',
      media: 'image',
    },
    prepare({title, alt, media}) {
      return {
        title: title || alt || 'Image',
        subtitle: 'Page image',
        media,
      }
    },
  },
})
