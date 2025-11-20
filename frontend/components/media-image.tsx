"use client"

import Image, { type ImageProps, type ImageLoader } from "next/image"

const mediaLoader: ImageLoader = ({ src }) => {
  return src
}

type MediaImageProps = Omit<ImageProps, "loader"> & {
  src: string
}

export function MediaImage(props: MediaImageProps) {
  return <Image {...props} loader={mediaLoader} />
}
