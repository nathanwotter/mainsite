import {defineConfig} from 'sanity'
import {structureTool} from 'sanity/structure'
import {visionTool} from '@sanity/vision'
import {muxInput} from 'sanity-plugin-mux-input'
import {schemaTypes} from './schemaTypes'
import {markdownSchema} from 'sanity-plugin-markdown'
import {singletonTypes, structure} from './structure'

export default defineConfig({
  name: 'default',
  title: 'Otter Adventures',

  projectId: (process.env.SANITY_STUDIO_PROJECT_ID ?? process.env.SANITY_PROJECT_ID) as string,
  dataset: (process.env.SANITY_STUDIO_DATASET ?? process.env.SANITY_DATASET) as string,

  plugins: [structureTool({structure}), visionTool(), markdownSchema(), muxInput()],

  schema: {
    types: schemaTypes,
    templates: (templates) => templates.filter(({schemaType}) => !singletonTypes.has(schemaType)),
  },

  document: {
    actions: (actions, {schemaType}) =>
      singletonTypes.has(schemaType)
        ? actions.filter(({action}) => action !== 'delete' && action !== 'duplicate')
        : actions,
  },
})
