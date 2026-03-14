import {defineArrayMember, defineField, defineType} from 'sanity'

export default defineType({
  name: 'navigationItem',
  title: 'Navigation Item',
  type: 'object',
  groups: [
    {
      name: 'content',
      title: 'Content',
      default: true,
    },
  ],
  fields: [
    defineField({
      name: 'label',
      title: 'Label',
      type: 'string',
      validation: (Rule) => Rule.required(),
      group: 'content',
    }),
    defineField({
      name: 'url',
      title: 'URL',
      type: 'string',
      group: 'content',
    }),
    defineField({
      name: 'ariaLabel',
      title: 'ARIA Label',
      description:
        "(Optional) Provide additional information about the element's purpose and functionality to assistive technologies, such as screen readers",
      type: 'string',
      group: 'content',
    }),
    defineField({
      name: 'children',
      title: 'Child Navigation Items',
      description: 'Optional dropdown links shown under this navigation item.',
      type: 'array',
      of: [defineArrayMember({type: 'actionLink', title: 'Navigation Item'})],
      group: 'content',
    }),
  ],
  preview: {
    select: {
      label: 'label',
      children: 'children',
    },
    prepare(selection) {
      const childCount = Array.isArray(selection.children) ? selection.children.length : 0

      return {
        title: selection.label,
        subtitle: childCount ? `${childCount} child link${childCount === 1 ? '' : 's'}` : 'Navigation Item',
      }
    },
  },
})
