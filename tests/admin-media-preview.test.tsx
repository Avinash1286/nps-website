import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { createElement, type ImgHTMLAttributes } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("next/image", () => ({
  default: ({
    fill: _fill,
    unoptimized: _unoptimized,
    ...props
  }: ImgHTMLAttributes<HTMLImageElement> & {
    fill?: boolean;
    unoptimized?: boolean;
  }) => createElement("img", props),
}));

import { mediaFallbackUrl } from "@/components/admin/content-manager";
import { MediaCard } from "@/components/admin/media-manager";

describe("admin media previews", () => {
  afterEach(cleanup);

  it("renders an uploaded image thumbnail and keeps its original-file link", () => {
    render(
      <MediaCard
        item={{
          _id: "media-1",
          fileName: "students.jpg",
          mimeType: "image/jpeg",
          size: 2048,
          alt: "Students in class",
          url: "https://example.test/students.jpg",
          createdAt: Date.now(),
        }}
        onDelete={vi.fn()}
      />,
    );

    expect(screen.getByRole("img", { name: "Students in class" })).toHaveAttribute(
      "src",
      "https://example.test/students.jpg",
    );
    expect(screen.getByRole("link", { name: "Open students.jpg" })).toHaveAttribute(
      "href",
      "https://example.test/students.jpg",
    );
  });

  it("shows an accessible fallback when an image preview cannot load", () => {
    render(
      <MediaCard
        item={{
          _id: "media-2",
          fileName: "broken.jpg",
          mimeType: "image/jpeg",
          size: 1024,
          url: "https://example.test/broken.jpg",
        }}
        onDelete={vi.fn()}
      />,
    );

    fireEvent.error(screen.getByRole("img", { name: "broken.jpg" }));
    expect(screen.getByRole("img", { name: "Image preview unavailable" })).toBeInTheDocument();
  });

  it("maps URL-backed CMS images to the media control preview", () => {
    const values = {
      imageUrl: "/media/nps-campus-building.png",
      secondaryImageUrl: "/media/nps-hero-gate.png",
    };

    expect(mediaFallbackUrl(values, "imageId")).toBe("/media/nps-campus-building.png");
    expect(mediaFallbackUrl(values, "secondaryImageId")).toBe("/media/nps-hero-gate.png");
    expect(mediaFallbackUrl(values, "photoId")).toBe("");
  });
});
