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
    defineField({
      name: 'displaySize',
      title: 'Display size',
      type: 'string',
      options: {
        list: [
          {title: 'Full width', value: 'full'},
          {title: 'Large', value: 'large'},
          {title: 'Medium', value: 'medium'},
          {title: 'Small', value: 'small'},
        ],
      },
      initialValue: 'full',
    }),
    defineField({
      name: 'alignment',
      title: 'Alignment',
      type: 'string',
      options: {
        list: [
          {title: 'Left', value: 'left'},
          {title: 'Center', value: 'center'},
          {title: 'Right', value: 'right'},
        ],
      },
      initialValue: 'center',
    }),
    defineField({
      name: 'imageStyle',
      title: 'Image style',
      type: 'string',
      options: {
        list: [
          {title: 'Standard', value: 'standard'},
          {title: 'Rounded card', value: 'card'},
          {title: 'Circle / avatar', value: 'circle'},
        ],
      },
      initialValue: 'standard',
    }),
    defineField({
      name: 'textWrap',
      title: 'Text wrapping',
      description: 'Controls whether following text wraps around this image.',
      type: 'string',
      options: {
        list: [
          {title: 'No wrapping', value: 'none'},
          {title: 'Wrap text', value: 'wrap'},
        ],
      },
      initialValue: 'none',
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
