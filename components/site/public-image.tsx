import NextImage, { type ImageProps } from "next/image";

/** Image wrapper for administrator-configured or Convex storage URLs. */
export default function PublicImage(props: ImageProps) {
  return <NextImage {...props} />;
}
