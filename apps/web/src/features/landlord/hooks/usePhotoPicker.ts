import { useState } from "react";
import type { ChangeEvent } from "react";
import { mergePhotos, movePhotoToFront } from "../lib/listingFormModel";

/**
 * The new photos of the listing form: picks add to the earlier ones, skipped files are
 * explained in `photoNotices`, and the first photo is the cover once uploaded.
 * `existingCount` is how many photos the listing already has (edit mode).
 */
export function usePhotoPicker(existingCount: number) {
  const [newFiles, setNewFiles] = useState<File[]>([]);
  const [photoNotices, setPhotoNotices] = useState<string[]>([]);

  /** Returns whether at least one photo was added. */
  function pickFiles(files: File[]): boolean {
    const result = mergePhotos(existingCount, newFiles, files);
    setPhotoNotices(result.notices);
    setNewFiles(result.files);
    return result.added > 0;
  }

  /** The input is cleared every time so choosing the same file again fires `change`. */
  function handleFilePick(e: ChangeEvent<HTMLInputElement>): void {
    pickFiles(Array.from(e.target.files || []));
    e.target.value = "";
  }

  function removeNewFile(index: number): void {
    setPhotoNotices([]);
    setNewFiles((files) => files.filter((_, i) => i !== index));
  }

  function makeCover(index: number): void {
    setNewFiles((files) => movePhotoToFront(files, index));
  }

  return { newFiles, photoNotices, pickFiles, handleFilePick, removeNewFile, makeCover };
}
