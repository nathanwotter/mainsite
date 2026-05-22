export const PORTABLE_BODY = `body[] {
  ...,
  _type == "pageImage" => {
    ...,
    displaySize,
    alignment,
    imageStyle,
    "src": image.asset->url,
    "dimensions": image.asset->metadata.dimensions
  },
  _type == "pageFile" => {
    ...,
    "fileUrl": file.asset->url,
    "filename": file.asset->originalFilename,
    "extension": file.asset->extension,
    "mimeType": file.asset->mimeType,
    "size": file.asset->size
  }
}`;
